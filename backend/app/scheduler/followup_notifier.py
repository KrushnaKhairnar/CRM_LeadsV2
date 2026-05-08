from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.repositories.notifications import NotificationsRepository
from app.repositories.leads import LeadsRepository
from app.websockets.manager import ws_manager
# from app.services.email_service import send_email

import asyncio

# Scheduler scans every minute, finds leads with next_followup_at within next 5 mins
# and creates notifications for assigned sales + manager (assigned_by / if null then managers are all? We'll notify assigned_by if present)
# To prevent duplicates: store in notifications with a deterministic key in message and check an extra collection or embed meta.
# We'll store in db.scheduled_notifications a doc per lead_id+next_followup_at+user_id.


import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import os

load_dotenv()

async def send_email(to: str, subject: str, body: str):
    """
    Sends an email using SMTP settings from environment variables.
    """
    smtp_host = os.getenv("SMTP_HOST")
    print(f"SMTP_HOST: {smtp_host}")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    print(f"SMTP_PORT: {smtp_port}")
    smtp_user = os.getenv("SMTP_USER")
    print(f"SMTP_USER: {smtp_user}")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    email_from = os.getenv("EMAIL_FROM")
    print(f"EMAIL_FROM: {email_from}")

    if not all([smtp_host, smtp_port, smtp_user, smtp_password, email_from]):
        print("Email service is not configured. Please set SMTP environment variables.")
        return

    msg = MIMEMultipart()
    msg['From'] = email_from
    msg['To'] = to
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
            print(f"Email sent to {to}")
    except Exception as e:
        print(f"Failed to send email to {to}: {e}")
    
async def scan_and_notify(db):
    print("Scanning for upcoming follow-ups...")
    """
    Scans for upcoming follow-ups and sends notifications.
    """
    leads_repo = LeadsRepository(db)
    print("leads_repo", leads_repo)
    notif_repo = NotificationsRepository(db)
    print("notif_repo", notif_repo)

    now = datetime.now(timezone.utc)
    window_start = now
    window_end = now + timedelta(minutes=5)

    q = {"next_followup_at": {"$gte": window_start, "$lte": window_end}}
    print("Querying leads with next_followup_at between", window_start, "and", window_end)
    cur = db.leads.find(q, {"lead_id": 1, "next_followup_at": 1, "name": 1, "assigned_to": 1, "assigned_by": 1})
    print("cursor", cur)
    async for lead in cur:
        lead_id = lead["lead_id"]
        print("lead_id", lead_id)
        nfa = lead.get("next_followup_at")
        print("next_followup_at", nfa)
        if not nfa:
            continue

        recipients = set()
        if lead.get("assigned_to"):
            print("assigned_to", lead["assigned_to"])
            recipients.add(lead["assigned_to"])
        if lead.get("assigned_by"):
            print("assigned_by", lead["assigned_by"])
            recipients.add(lead["assigned_by"])

        for uid in recipients:
            key = f"{lead_id}:{nfa.isoformat()}:{uid}"
            exists = await db.scheduled_notifications.find_one({"key": key})
            if exists:
                continue
            await db.scheduled_notifications.insert_one({"_id": key, "key": key, "lead_id": lead_id, "user_id": uid, "next_followup_at": nfa, "created_at": now})

            user = await db.users.find_one({"user_id": uid})
            if not user:
                continue

            title = "Follow-up Reminder"
            message = f"Lead '{lead.get('name','')}' follow-up due at {nfa.isoformat()}"
            link = f"/leads/{lead_id}"
            
            # Send email notification
            if user.get("email"):
                print("user", user.get("email"))
                print(f"Sending email to {user['email']} for lead {lead_id} follow-up reminder.")
                await send_email(
                    to=user["email"],
                    subject=title,
                    body=message
                )

            notif_id = await notif_repo.create({"user_id": uid, "title": title, "message": message, "link": link, "read": False})


            await ws_manager.send_json(uid, {"type": "notification", "data": {"notification_id": notif_id, "title": title, "message": message, "link": link, "read": False, "created_at": now.isoformat()}})

def create_scheduler(db):
    sched = AsyncIOScheduler()
    sched.add_job(scan_and_notify, IntervalTrigger(minutes=1), args=[db], max_instances=1, coalesce=True)
    return sched
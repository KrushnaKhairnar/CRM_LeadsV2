from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.repositories.notifications import NotificationsRepository
from app.repositories.leads import LeadsRepository
from app.websockets.manager import ws_manager

# Scheduler scans every minute, finds leads with next_followup_at within next 5 mins
# and creates notifications for assigned sales + manager (assigned_by / if null then managers are all? We'll notify assigned_by if present)
# To prevent duplicates: store in notifications with a deterministic key in message and check an extra collection or embed meta.
# We'll store in db.scheduled_notifications a doc per lead_id+next_followup_at+user_id.

async def scan_and_notify(db):
    leads_repo = LeadsRepository(db)
    notif_repo = NotificationsRepository(db)

    now = datetime.now(timezone.utc)
    window_start = now
    window_end = now + timedelta(minutes=5)

    q = {"next_followup_at": {"$gte": window_start, "$lte": window_end}}
    cur = db.leads.find(q, {"next_followup_at": 1, "name": 1, "assigned_to": 1, "assigned_by": 1})
    async for lead in cur:
        lead_id = lead["lead_id"]
        nfa = lead.get("next_followup_at")
        if not nfa:
            continue
        # recipients: assigned sales + assigned_by (manager) if exists
        recipients = set()
        if lead.get("assigned_to"):
            recipients.add(lead["assigned_to"])
        if lead.get("assigned_by"):
            recipients.add(lead["assigned_by"])

        for uid in recipients:
            key = f"{lead_id}:{nfa.isoformat()}:{uid}"
            exists = await db.scheduled_notifications.find_one({"key": key})
            if exists:
                continue
            await db.scheduled_notifications.insert_one({"_id": key, "key": key, "lead_id": lead_id, "user_id": uid, "next_followup_at": nfa, "created_at": now})

            title = "Follow-up Reminder"
            message = f"Lead '{lead.get('name','')}' follow-up due at {nfa.isoformat()}"
            link = f"/leads/{lead_id}"
            notif_id = await notif_repo.create({"user_id": uid, "title": title, "message": message, "link": link, "read": False})

            await ws_manager.send_json(uid, {"type": "notification", "data": {"notification_id": notif_id, "title": title, "message": message, "link": link, "read": False, "created_at": now.isoformat()}})

def create_scheduler(db):
    sched = AsyncIOScheduler()
    sched.add_job(scan_and_notify, IntervalTrigger(minutes=1), args=[db], max_instances=1, coalesce=True)
    return sched

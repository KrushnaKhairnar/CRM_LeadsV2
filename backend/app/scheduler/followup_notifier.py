from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.repositories.notifications import NotificationsRepository
from app.repositories.leads import LeadsRepository
from app.websockets.manager import ws_manager
from datetime import datetime, timezone, timedelta
from app.services.email_service import send_email




# Scheduler scans every minute, finds leads with next_followup_at within next 5 mins
# and creates notifications for assigned sales + manager (assigned_by / if null then managers are all? We'll notify assigned_by if present)
# To prevent duplicates: store in notifications with a deterministic key in message and check an extra collection or embed meta.
# We'll store in db.scheduled_notifications a doc per lead_id+next_followup_at+user_id.

  
async def scan_and_notify(db):
    print("Scanning for upcoming follow-ups...")

    notif_repo = NotificationsRepository(db)

    now = datetime.now(timezone.utc)

    window_start = now
    window_end = now + timedelta(minutes=5)

    print("WINDOW START:", window_start)
    print("WINDOW END:", window_end)

    q = {
        "next_followup_at": {
            "$gte": window_start,
            "$lte": window_end,
        }
    }

    cur = db.leads.find(
        q,
        {
            "lead_id": 1,
            "next_followup_at": 1,
            "name": 1,
            "assigned_to": 1,
            "assigned_by": 1,
        },
    )

    async for lead in cur:

        try:
            print("\nFOUND LEAD:", lead)

            lead_id = lead["lead_id"]

            nfa = lead.get("next_followup_at")

            print("NFA:", nfa)
            print("TYPE:", type(nfa))
            print("TZINFO:", nfa.tzinfo if nfa else None)

            if not nfa:
                continue

            # Ensure timezone aware
            if nfa.tzinfo is None:
                nfa = nfa.replace(tzinfo=timezone.utc)

            recipients = set()

            if lead.get("assigned_to"):
                recipients.add(lead["assigned_to"])

            if lead.get("assigned_by"):
                recipients.add(lead["assigned_by"])

            for uid in recipients:

                key = f"{lead_id}:{nfa.isoformat()}:{uid}"

                exists = await db.scheduled_notifications.find_one({
                    "key": key
                })

                if exists:
                    print("Already notified:", key)
                    continue

                await db.scheduled_notifications.insert_one({
                    "_id": key,
                    "key": key,
                    "lead_id": lead_id,
                    "user_id": uid,
                    "next_followup_at": nfa,
                    "created_at": now,
                })

                user = await db.users.find_one({
                    "user_id": uid
                })

                if not user:
                    print("User not found:", uid)
                    continue

                # Convert UTC -> IST safely
                IST = timezone(
                    timedelta(hours=5, minutes=30)
                )

                ist_time = nfa.astimezone(IST)

                formatted_time = ist_time.strftime(
                    "%d %b %Y, %I:%M %p"
                )

                title = "Follow-up Reminder"

                message = (
                    f"Lead '{lead.get('name', '')}' "
                    f"follow-up due at {formatted_time}"
                )

                link = f"/leads/{lead_id}"

                print("MESSAGE:", message)

                # Email
                if user.get("email"):

                    print(
                        f"Sending email to "
                        f"{user['email']}"
                    )

                    send_email(
                        recipient=user["email"],
                        subject=title,
                        template_name="follow_up_email.html",
                        context={
                            "followup_time": formatted_time,
                            "lead_name": lead.get("username", ""),
                            "lead_link": f"http://localhost:5173/leads/{lead_id}",
                        }
                    )

                # DB notification
                notif_id = await notif_repo.create({
                    "user_id": uid,
                    "title": title,
                    "message": message,
                    "link": link,
                    "read": False,
                })

                print("NOTIFICATION CREATED:", notif_id)

                # Websocket
                await ws_manager.send_json(
                    uid,
                    {
                        "type": "notification",
                        "data": {
                            "notification_id": notif_id,
                            "title": title,
                            "message": message,
                            "link": link,
                            "read": False,
                            "created_at": now.isoformat(),
                        },
                    },
                )

                print("WEBSOCKET SENT")

        except Exception as e:
            print("SCAN ERROR:", str(e))

async def compute_overdue(db):
    """
    If:
    - next_followup_at time is passed
    - 45 minutes completed after that
    - status is NOT closed
    - next_followup_at was not updated
    Then:
    - mark lead as overdue
    - send email to assigned user
    """

    print("Checking overdue leads...")

    now = datetime.now(timezone.utc)

    # Get all leads having next_followup_at
    leads = await db.leads.find({
        "next_followup_at": {"$ne": None}
    }).to_list(length=None)

    for lead in leads:

        lead_id = lead.get("lead_id")
        nfa = lead.get("next_followup_at")
        status = str(lead.get("status", "")).lower()

        print("\n----------------------------")
        print("LEAD ID:", lead_id)
        print("NEXT FOLLOWUP:", nfa)
        print("STATUS:", status)

        if not nfa:
            continue

        # Convert to timezone aware
        if nfa.tzinfo is None:
            nfa = nfa.replace(tzinfo=timezone.utc)

        # Skip closed leads
        if status == "closed":
            print("Lead is closed. Skipping...")
            continue

        # Check 45 mins completed or not
        overdue_time = nfa + timedelta(minutes=1)

        print("OVERDUE TIME:", overdue_time)
        print("CURRENT TIME:", now)

        # If still within 45 mins skip
        if now <= overdue_time:
            print("45 minutes not completed yet.")
            continue

        # Mark overdue
        is_overdue = True

        # Update lead overdue field
        await db.leads.update_one(
            {"lead_id": lead_id},
            {
                "$set": {
                    "is_overdue": is_overdue
                }
            }
        )

        print("Lead marked overdue.")

        # Get assigned user id
        assigned_to = lead.get("assigned_to")

        if not assigned_to:
            print("No assigned user.")
            continue

        # Find user from users table
        user = await db.users.find_one({
            "user_id": assigned_to
        })

        if not user:
            print("Assigned user not found.")
            continue

        user_email = user.get("email")

        if not user_email:
            print("User email not found.")
            continue

        # Prevent duplicate email sending
        key = f"overdue:{lead_id}:{nfa.isoformat()}:{assigned_to}"

        already_sent = await db.scheduled_notifications.find_one({
            "key": key
        })

        if already_sent:
            print("Overdue email already sent.")
            continue

        # Convert follow-up time to IST
        IST = timezone(timedelta(hours=5, minutes=30))
        ist_time = nfa.astimezone(IST)

        formatted_time = ist_time.strftime("%d %b %Y, %I:%M %p")

        print(f"Sending overdue email to {user_email}")

        # Send email
        send_email(
            recipient=user_email,
            subject="Overdue Follow-up Reminder",
            template_name="follow_up_email.html",
            context={
                "lead_name": lead.get("name", ""),
                "followup_time": formatted_time,
                "lead_link": f"http://localhost:5173/leads/{lead_id}",
            }
        )

        # Save notification record
        await db.scheduled_notifications.insert_one({
            "_id": key,
            "key": key,
            "lead_id": lead_id,
            "user_id": assigned_to,
            "next_followup_at": nfa,
            "created_at": now,
            "type": "overdue"
        })

        print("Overdue email sent successfully.")

    print("\nOverdue checking completed.")

def create_scheduler(db):
    sched = AsyncIOScheduler()
    sched.add_job(scan_and_notify, IntervalTrigger(minutes=1), args=[db], max_instances=1, coalesce=True)
    sched.add_job(compute_overdue, IntervalTrigger(minutes=1), args=[db], max_instances=1, coalesce=True)
    return sched
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
  

    notif_repo = NotificationsRepository(db)

    now = datetime.now(timezone.utc)

    window_start = now
    window_end = now + timedelta(minutes=5)
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
         

            lead_id = lead["lead_id"]

            nfa = lead.get("next_followup_at")

       

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

                

                # Email
                if user.get("email"):

                  

                    await send_email(
                        recipient=user["email"],
                        subject=title,
                        template_name="follow_up_email.html",
                        context={
                            "followup_time": formatted_time,
                            "lead_name": lead.get("name", ""),
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

  

    now = datetime.now(timezone.utc)

    cutoff = now - timedelta(minutes=45)

    leads = db.leads.find({
        "next_followup_at": {
            "$lte": cutoff
        },
        "status": {
            "$ne": "closed"
        }
    })

    async for lead in leads:

        lead_id = lead.get("lead_id")
        nfa = lead.get("next_followup_at")
        status = str(lead.get("status", "")).lower()

    

        if not nfa:
            continue

        # Convert to timezone aware
        if nfa.tzinfo is None:
            nfa = nfa.replace(tzinfo=timezone.utc)

        # Skip closed leads
        if status == "closed":
            continue

        # Check 45 mins completed or not
        overdue_time = nfa + timedelta(minutes=45)


        if now <= overdue_time:

            await db.leads.update_one(
                {"lead_id": lead_id},
                {
                    "$set": {
                        "is_overdue": False
                    }
                }
            )

            continue

        fresh_lead = await db.leads.find_one({
            "lead_id": lead_id
        })

        if not fresh_lead:
            continue

        latest_nfa = fresh_lead.get("next_followup_at")

        if latest_nfa and latest_nfa.tzinfo is None:
            latest_nfa = latest_nfa.replace(
                tzinfo=timezone.utc
            )

        if latest_nfa != nfa:
          
            continue

        # Mark overdue only once
        if not lead.get("is_overdue"):

            await db.leads.update_one(
                {"lead_id": lead_id},
                {
                    "$set": {
                        "is_overdue": True
                    }
                }
            )


        # Get assigned user id
        assigned_to = lead.get("assigned_to")

        if not assigned_to:
            continue

        # Find user from users table
        user = await db.users.find_one({
            "user_id": assigned_to
        })

        if not user:
            continue

        user_email = user.get("email")

        if not user_email:
            continue

        # Prevent duplicate email sending
        key = f"overdue:{lead_id}:{nfa.isoformat()}:{assigned_to}"

        already_sent = await db.scheduled_notifications.find_one({
            "key": key
        })

        if already_sent:
            continue

        # Convert follow-up time to IST
        IST = timezone(timedelta(hours=5, minutes=30))
        ist_time = nfa.astimezone(IST)

        formatted_time = ist_time.strftime("%d %b %Y, %I:%M %p")


        # Send email
        await send_email(
            recipient=user_email,
            subject="Overdue Follow-up Reminder",
            template_name="overdue_email.html",
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

def create_scheduler(db):
    sched = AsyncIOScheduler()
    sched.add_job(scan_and_notify, IntervalTrigger(minutes=1), args=[db], max_instances=1, coalesce=True)
    sched.add_job(compute_overdue, IntervalTrigger(minutes=1), args=[db], max_instances=1, coalesce=True)
    return sched
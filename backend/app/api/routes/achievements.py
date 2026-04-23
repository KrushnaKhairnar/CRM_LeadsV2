from fastapi import APIRouter, Depends, HTTPException
from app.db.mongo import get_db
from app.core.deps import get_current_user, Roles, require_roles
from app.models.achievements import AchievementCreate
from app.repositories.achievements import AchievementsRepository
from datetime import datetime, timezone

router = APIRouter()

def ensure_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

async def _auto_achievements(db, user_id: str):
    now = datetime.now(timezone.utc)
    # Counts based on leads assigned_to or created_by
    q = {"$or": [{"assigned_to": user_id}, {"created_by": user_id}]}
    leads = [l async for l in db.leads.find(q)]
    created = sum(1 for l in leads if l.get("created_by") == user_id)
    won = sum(1 for l in leads if l.get("status") == "CLOSED" or l.get("pipeline_stage") == "WON")
    hot = sum(1 for l in leads if l.get("temperature") == "HOT")
    overdue_cleared = 0
    for l in leads:
        nfa = ensure_utc(l.get("next_followup_at"))
        if nfa and nfa > now:
            overdue_cleared += 1
    badges = []
    if created >= 5:
        badges.append({"badge_key": "creator_5", "title": "Created 5 Leads", "mode": "auto"})
    if created >= 20:
        badges.append({"badge_key": "creator_20", "title": "Created 20 Leads", "mode": "auto"})
    if won >= 5:
        badges.append({"badge_key": "closer_5", "title": "Closed/Won 5 Deals", "mode": "auto"})
    if hot >= 10:
        badges.append({"badge_key": "hot_hunter", "title": "10 HOT Leads", "mode": "auto"})
    if overdue_cleared >= 10:
        badges.append({"badge_key": "followup_master", "title": "On-time Followups", "mode": "auto"})
    # add created_at to now for display
    for b in badges:
        b.update({"user_id": user_id, "created_at": now})
    return badges

@router.get("/me", response_model=list[dict])
async def my_achievements(db=Depends(get_db), user=Depends(require_roles([Roles.SALES]))):
    repo = AchievementsRepository(db)
    manual = await repo.list_by_user(user["user_id"])
    for m in manual:
        m.setdefault("mode", "manual")
    auto = await _auto_achievements(db, user["user_id"])
    # merge keys by badge_key to avoid duplicates favoring manual
    seen = set([m.get("badge_key") for m in manual])
    # give autos synthetic ids
    for a in auto:
        a["achievement_id"] = f"auto-{a['badge_key']}"
        a.setdefault("title", a["badge_key"])
        a.setdefault("description", None)
        a.setdefault("mode", "auto")
    merged = manual + [a for a in auto if a["badge_key"] not in seen]
    return merged

@router.post("", response_model=dict)
async def award(payload: AchievementCreate, db=Depends(get_db), user=Depends(require_roles([Roles.MANAGER]))):
    repo = AchievementsRepository(db)
    doc = payload.model_dump()
    doc["awarded_by"] = user["user_id"]
    doc["mode"] = "manual"
    aid = await repo.award(doc)
    rec = await db.achievements.find_one({"achievement_id": aid})
    return rec

from http.client import HTTPException

from fastapi import APIRouter, Depends, Query
from datetime import datetime, timedelta, timezone
from collections import Counter
from app.db.mongo import get_db
from app.core.deps import get_current_user
from app.services.access import ensure_manager
from datetime import timedelta

router = APIRouter()


def ensure_utc(dt: datetime | None) -> datetime | None:
    """
    Mongo / drivers may return naive datetimes. Normalize everything to aware UTC.
    - If dt is naive: assume it's UTC and attach tzinfo=UTC
    - If dt is aware: convert to UTC
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _range(days: int) -> tuple[datetime, datetime]:
    """
    Returns aware UTC (start, end).
    We'll also use naive UTC equivalents for Mongo queries (best compatibility).
    """
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    return start, now


@router.get("/manager", response_model=dict)
async def manager_analytics(
    db=Depends(get_db),
    user=Depends(get_current_user),
    days: int = Query(30, ge=1, le=365),
):
    ensure_manager(user)

    start_aware, end_aware = _range(days)

    # Mongo naive UTC
    start = start_aware.replace(tzinfo=None)
    end = end_aware.replace(tzinfo=None)

    # ✅ Get this manager + his sales team ids
    team_ids = [user["user_id"]]

    sales_users = await db.users.find(
        {"manager_id": user["user_id"]}
    ).to_list(None)

    team_ids.extend([u["user_id"] for u in sales_users])

    # ✅ Show only this manager team leads
    q = {
        "created_at": {"$gte": start, "$lte": end},
        "$or": [
            {"created_by": {"$in": team_ids}},
            {"assigned_to": {"$in": team_ids}},
            {"assigned_by": user["user_id"]},
        ]
    }

    leads = [l async for l in db.leads.find(q)]

    total = len(leads)

    by_status = Counter([l.get("status", "OPEN") for l in leads])
    by_temp = Counter([l.get("temperature", "COLD") for l in leads])
    by_sales = Counter([l.get("assigned_to") or "UNASSIGNED" for l in leads])

    conversions = Counter(
        [
            l.get("pipeline_stage")
            for l in leads
            if l.get("pipeline_stage") in ("WON", "LOST")
        ]
    )

    overdue = 0
    today_followups = 0
    today_closed = 0

    now = datetime.now(timezone.utc)
    day_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    for l in leads:
        nfa = ensure_utc(l.get("next_followup_at"))
        updated_at = ensure_utc(l.get("updated_at"))

        if nfa and nfa < now:
            overdue += 1

        if nfa and day_start <= nfa < day_end:
            today_followups += 1

        if (
            updated_at
            and day_start <= updated_at < day_end
            and l.get("status") in ("CLOSED", "LOST")
        ):
            today_closed += 1

    # Aging
    aging_buckets = {
        "0-7": 0,
        "8-30": 0,
        "31-90": 0,
        "91+": 0
    }

    for l in leads:
        ca = ensure_utc(l.get("created_at"))
        if not ca:
            continue

        age_days = max(0, int((now - ca).days))

        if age_days <= 7:
            aging_buckets["0-7"] += 1
        elif age_days <= 30:
            aging_buckets["8-30"] += 1
        elif age_days <= 90:
            aging_buckets["31-90"] += 1
        else:
            aging_buckets["91+"] += 1

    # Funnel
    STAGES = [
        "NEW",
        "CONTACTED",
        "DEMO",
        "PROPOSAL",
        "NEGOTIATION",
        "WON",
        "LOST",
    ]

    stage_counts = {s: 0 for s in STAGES}

    for l in leads:
        s = l.get("pipeline_stage") or "NEW"
        if s in stage_counts:
            stage_counts[s] += 1

    won_count = stage_counts["WON"]
    lost_count = stage_counts["LOST"]

    win_rate = won_count / max(1, won_count + lost_count)

    return {
        "range_days": days,
        "total_leads": total,
        "by_status": dict(by_status),
        "by_temperature": dict(by_temp),
        "by_sales_person": dict(by_sales),
        "conversions": dict(conversions),
        "overdue_followups": overdue,
        "today_followups": today_followups,
        "today_closed": today_closed,
        "aging": aging_buckets,
        "funnel": {
            "stages": stage_counts,
            "won": won_count,
            "lost": lost_count,
            "win_rate": win_rate,
        },
    }

@router.get("/revenue/manager", response_model=dict)
async def revenue_manager(
    db=Depends(get_db),
    user=Depends(get_current_user),
    days: int = Query(30, ge=1, le=365),
    sales_user_id: str | None = None,
    status: str | None = None,
    currency: str | None = None,
):
    ensure_manager(user)
   
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    start_naive = start.replace(tzinfo=None)
    # Get this manager + his sales team ids
    team_ids = [user["user_id"]]
    sales_users = await db.users.find(
        {"manager_id": user["user_id"]}
    ).to_list(None)
    team_ids.extend([u["user_id"] for u in sales_users])

    # Base filter (all-time dims)
    q_base = {"sales_user_id": {"$in": team_ids}}
    if sales_user_id:
        q_base["sales_user_id"] = sales_user_id
    if status:
        q_base["status"] = status
    if currency:
        q_base["currency"] = currency
    invs_all = [i async for i in db.invoices.find(q_base)]
    total_all = sum(float(i.get("total", 0)) for i in invs_all)
    # Period filter by created_at or issue_date
    def in_period(inv):
        ca = inv.get("created_at")
        ia = inv.get("issue_date")
        ca = ca and ca >= start_naive
        ia = ia and ia >= start_naive
        return bool(ca or ia)
    invs = [i for i in invs_all if in_period(i)]
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc).replace(tzinfo=None)
    today_total = sum(float(i.get("total", 0)) for i in invs if i.get("created_at") and i["created_at"] >= today_start)
    # last 15 days timeseries
    buckets = {}
    for i in range(15):
        d = (now - timedelta(days=i))
        key = datetime(d.year, d.month, d.day).strftime("%Y-%m-%d")
        buckets[key] = 0.0
    for inv in invs:
        ca = inv.get("created_at")
        if not ca:
            continue
        key = datetime(ca.year, ca.month, ca.day).strftime("%Y-%m-%d")
        if key in buckets:
            buckets[key] += float(inv.get("total", 0))
    by_sales = {}
    for inv in invs_all:
        s = inv.get("sales_user_id") or "UNKNOWN"
        by_sales[s] = by_sales.get(s, 0.0) + float(inv.get("total", 0))
    # Lead-based revenue (fallback/augment):
    # - won_from_leads: sum of expected_value for WON or CLOSED leads updated in period
    # - pipeline_open: sum of expected_value for OPEN/WIP leads (pipeline) created or updated in period
    lead_q: dict = {
        "$or": [{"updated_at": {"$gte": start_naive}}, {"created_at": {"$gte": start_naive}}],
        "assigned_to": {"$in": team_ids}
    }
    if sales_user_id:
        lead_q["$or"] = lead_q.get("$or", []) + [{"assigned_to": sales_user_id}, {"created_by": sales_user_id}]
    leads = [l async for l in db.leads.find(lead_q)]
    def ev(x): 
        try: 
            return float(x or 0) 
        except: 
            return 0.0
    won_from_leads = sum(ev(l.get("expected_value")) for l in leads if (l.get("pipeline_stage")=="WON" or l.get("status")=="CLOSED"))
    pipeline_open = sum(ev(l.get("expected_value")) for l in leads if l.get("status") in ("OPEN","WIP"))
    series = [{"date": k, "total": round(v,2)} for k,v in sorted(buckets.items())]
    return {
        "total_all": round(total_all,2),
        "total_period": round(sum(float(i.get('total',0)) for i in invs),2),
        "today": round(today_total,2),
        "last15": series,
        "by_sales": by_sales,
        "won_from_leads": round(won_from_leads,2),
        "pipeline_open": round(pipeline_open,2),
    }


@router.get("/team", response_model=dict)
async def team_performance(
    db=Depends(get_db),
    user=Depends(get_current_user),
    days: int = Query(30, ge=1, le=365),
    sales_user_id: str | None = None,
):
    ensure_manager(user)

    start, now = _range(days)
    start_naive = start.replace(tzinfo=None)

    # Fetch sales users created by this manager
    sales_users = await db.users.find(
        {"created_by": user["user_id"], "role": "SALES"}
    ).to_list(None)

    sales_ids = [u["user_id"] for u in sales_users]
    team_ids = [user["user_id"]] + sales_ids

    # Build name map
    user_name_map = {u["user_id"]: u.get("username", u["user_id"]) for u in sales_users}
    user_name_map[user["user_id"]] = user.get("username", user["user_id"])

    # ✅ CORE FIX: use manager_id to scope all leads to THIS manager's team only
    lead_q = {
        "created_at": {"$gte": start_naive},
        "manager_id": user["user_id"],  # only leads under this manager
    }

    if sales_user_id:
        if sales_user_id not in team_ids:
            raise HTTPException(status_code=403, detail="User not in your team")
        lead_q["created_by"] = sales_user_id  # filter to specific sales person

    leads = [l async for l in db.leads.find(lead_q)]

    won = [
        l for l in leads
        if l.get("pipeline_stage") == "WON"
        or l.get("status") == "CLOSED"
    ]

    inv_q = {
        "created_at": {"$gte": start_naive},
        "sales_user_id": {"$in": [sales_user_id] if sales_user_id else team_ids},
    }

    invs = [i async for i in db.invoices.find(inv_q)]

    def daykey(dt):
        dt = ensure_utc(dt)
        return f"{dt.year:04d}-{dt.month:02d}-{dt.day:02d}"

    series_map = {}

    for l in leads:
        k = daykey(l.get("created_at"))
        series_map.setdefault(k, {"date": k, "leads_created": 0, "won": 0, "revenue": 0.0})
        series_map[k]["leads_created"] += 1

    for l in won:
        k = daykey(l.get("updated_at") or l.get("created_at"))
        series_map.setdefault(k, {"date": k, "leads_created": 0, "won": 0, "revenue": 0.0})
        series_map[k]["won"] += 1

    for i in invs:
        k = daykey(i.get("created_at"))
        series_map.setdefault(k, {"date": k, "leads_created": 0, "won": 0, "revenue": 0.0})
        series_map[k]["revenue"] += float(i.get("total", 0))

    series = [series_map[k] for k in sorted(series_map.keys())]

    by_person = {}

    if not sales_user_id:
        for l in leads:
            s = l.get("created_by")
            if not s or s not in team_ids:
                continue
            agg = by_person.setdefault(s, {"username": user_name_map.get(s, s), "leads": 0, "won": 0, "revenue": 0.0})
            agg["leads"] += 1

        for l in won:
            s = l.get("created_by")
            if not s or s not in team_ids:
                continue
            agg = by_person.setdefault(s, {"username": user_name_map.get(s, s), "leads": 0, "won": 0, "revenue": 0.0})
            agg["won"] += 1

        for i in invs:
            s = i.get("sales_user_id")
            if not s or s not in team_ids:
                continue
            agg = by_person.setdefault(s, {"username": user_name_map.get(s, s), "leads": 0, "won": 0, "revenue": 0.0})
            agg["revenue"] += float(i.get("total", 0))

    return {
        "series": series,
        "summary": {
            "leads": len(leads),
            "won": len(won),
            "revenue": round(sum(float(i.get("total", 0)) for i in invs), 2),
        },
        "by_person": by_person,
    }



@router.get("/sales/me", response_model=dict)
async def sales_me(
    db=Depends(get_db),
    user=Depends(get_current_user),
    days: int = Query(30, ge=1, le=365),
):
    uid = user["user_id"]
    start_aware, end_aware = _range(days)

    # ✅ Use naive UTC for Mongo query bounds (avoids driver tz mismatches)
    start = start_aware.replace(tzinfo=None)
    end = end_aware.replace(tzinfo=None)

    q = {
        "$or": [{"assigned_to": uid}, {"created_by": uid}],
        "created_at": {"$gte": start, "$lte": end},
    }
    leads = [l async for l in db.leads.find(q)]

    by_stage = Counter([l.get("pipeline_stage") or "NONE" for l in leads])
    won = sum(1 for l in leads if l.get("pipeline_stage") == "WON" or l.get("status") == "CLOSED")
    lost = sum(1 for l in leads if l.get("pipeline_stage") == "LOST" or l.get("status") == "LOST")

    now = datetime.now(timezone.utc)

    # ✅ Normalize next_followup_at before comparing
    overdue = 0
    for l in leads:
        nfa = ensure_utc(l.get("next_followup_at"))
        if nfa and nfa < now:
            overdue += 1

    # Aging buckets
    aging_buckets = {"0-7": 0, "8-30": 0, "31-90": 0, "91+": 0}
    for l in leads:
        ca = ensure_utc(l.get("created_at"))
        if not ca:
            continue
        days = max(0, int((datetime.now(timezone.utc) - ca).days))
        if days <= 7:
            aging_buckets["0-7"] += 1
        elif days <= 30:
            aging_buckets["8-30"] += 1
        elif days <= 90:
            aging_buckets["31-90"] += 1
        else:
            aging_buckets["91+"] += 1

    STAGES = ["NEW","CONTACTED","DEMO","PROPOSAL","NEGOTIATION","WON","LOST"]
    stage_counts = {s: 0 for s in STAGES}
    for l in leads:
        s = l.get("pipeline_stage") or "NEW"
        if s in stage_counts:
            stage_counts[s] += 1

    return {
        "range_days": days,
        "total": len(leads),
        "won": won,
        "lost": lost,
        "by_stage": dict(by_stage),
        "overdue": overdue,
        "aging": aging_buckets,
        "funnel": {"stages": stage_counts, "won": won, "lost": lost, "win_rate": (won / max(1, (won + lost)))},
    }
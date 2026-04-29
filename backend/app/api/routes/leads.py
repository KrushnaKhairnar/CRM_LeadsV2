from fastapi import APIRouter, Depends, HTTPException, Query, Response, File, UploadFile,Form
from typing import Optional
from datetime import datetime
import csv, io

from app.db.mongo import get_db
from app.core.deps import get_current_user, Roles
from app.services.access import ensure_can_view, ensure_manager
from app.services.leads_service import LeadsService
from app.services.followups_service import FollowupsService
from app.models.leads import LeadCreate, LeadOut, LeadPatch, AssignRequest, BulkAssignRequest, BulkStatusRequest, BulkTemperatureRequest, BulkStageRequest, NoteCreate
from app.models.followups import FollowupCreate
from app.repositories.audit import AuditRepository

router = APIRouter()

def _filters(status: Optional[str], temperature: Optional[str], pipeline_stage: Optional[str], assigned_to: Optional[str], q: Optional[str]):
    f = {}
    if status: f["status"] = status
    if temperature: f["temperature"] = temperature
    if pipeline_stage: f["pipeline_stage"] = pipeline_stage
    if assigned_to:
        if assigned_to == "UNASSIGNED":
            f["$or"] = (f.get("$or") or []) + [{"assigned_to": None}, {"assigned_to": {"$exists": False}}]
        else:
            f["assigned_to"] = assigned_to
    if q:
        # basic global search on name/phone/company (case-insensitive regex)
        import re
        rx = {"$regex": re.escape(q), "$options": "i"}
        f["$or"] = [{"name": rx}, {"phone": rx}, {"company": rx}]
    return f

# @router.post("", response_model=LeadOut)
# async def create_lead(payload: LeadCreate, db=Depends(get_db), user=Depends(get_current_user)):
#     svc = LeadsService(db)
#     lead = await svc.create_lead(payload.model_dump(), user)
#     return lead

@router.post("", response_model=LeadOut)
async def create_lead(
    payload: LeadCreate,
    db=Depends(get_db),
    user=Depends(get_current_user)
):
    # ✅ Project mandatory
    if not payload.project_id or not str(payload.project_id).strip():
        raise HTTPException(
            status_code=400,
            detail="Project is required"
        )

    # ✅ Check project exists
    project = await db.products.find_one({
        "project_id": payload.project_id
    })

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Selected project not found"
        )

    svc = LeadsService(db)
    lead = await svc.create_lead(payload.model_dump(), user)

    return lead



@router.get("", response_model=dict)
async def list_leads(
    db=Depends(get_db),
    user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=100),
    sort_by: str = Query("updated_at"),
    sort_dir: int = Query(-1),
    status: Optional[str] = None,
    temperature: Optional[str] = None,
    pipeline_stage: Optional[str] = None,
    assigned_to: Optional[str] = None,
    q: Optional[str] = None,
):
    svc = LeadsService(db)

    filters = _filters(status, temperature, pipeline_stage, assigned_to, q)

    user_id = str(user["user_id"])
    role = user.get("role", "").upper()

    # Role based filter
    if role == "ADMIN":
        role_filter = {}   # all leads

    elif role == "MANAGER":
        role_filter = {
            "$or": [
                {"created_by": user_id},
                {"manager_id": user_id}
            ]
        }

    else:   # SALES
        role_filter = {
            "$or": [
                {"created_by": user_id},
                {"assigned_to": user_id}
            ]
        }

    # Merge filters
    if filters and role_filter:
        final_filter = {"$and": [role_filter, filters]}
    elif filters:
        final_filter = filters
    else:
        final_filter = role_filter

    items, total = await svc.list_for_user(
        user,
        final_filter,
        page,
        page_size,
        (sort_by, sort_dir)
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/export.csv")
async def export_csv(
    db=Depends(get_db),
    user=Depends(get_current_user),
    status: Optional[str] = None,
    temperature: Optional[str] = None,
    pipeline_stage: Optional[str] = None,
    assigned_to: Optional[str] = None,
    q: Optional[str] = None,
):
    # manager only
    ensure_manager(user)
    svc = LeadsService(db)
    filters = _filters(status, temperature, pipeline_stage, assigned_to, q)
    items, _ = await svc.list_for_user(user, filters, page=1, page_size=5000, sort=("updated_at",-1))

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["lead_id","name","phone","email","company","source","status","temperature","pipeline_stage","assigned_to","assigned_by","assigned_at","created_by","created_at","updated_at","next_followup_at","is_overdue","expected_value","tags"])
    for l in items:
        writer.writerow([
            l.get("lead_id"), l.get("name",""), l.get("phone",""), l.get("email",""), l.get("company",""),
            l.get("source",""), l.get("status",""), l.get("temperature",""), l.get("pipeline_stage",""),
            l.get("assigned_to",""), l.get("assigned_by",""), l.get("assigned_at",""),
            l.get("created_by",""), l.get("created_at",""), l.get("updated_at",""),
            l.get("next_followup_at",""), l.get("is_overdue",False), l.get("expected_value",0),
            "|".join(l.get("tags",[])),
        ])
    return Response(content=output.getvalue(), media_type="text/csv")



@router.post("/bulk/assign", response_model=dict)
async def bulk_assign(payload: BulkAssignRequest, db=Depends(get_db), user=Depends(get_current_user)):
    ensure_manager(user)
    svc = LeadsService(db)
    modified = await svc.bulk_assign(payload.lead_ids, payload.assigned_to, user)
    return {"modified": modified}

@router.get("/{lead_id}", response_model=LeadOut)
async def get_lead(
    lead_id: str,
    db=Depends(get_db),
    user=Depends(get_current_user)
):
    # Get lead
    lead = await db.leads.find_one({"lead_id": lead_id})
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    ensure_can_view(user, lead)

    # Get project name using project_id
    if lead.get("project_id"):
        project = await db.products.find_one(
            {"project_id": lead["project_id"]},
            {"_id": 0, "name": 1}
        )

        lead["project_name"] = project["name"] if project else None
    else:
        lead["project_name"] = None

    return lead

@router.patch("/{lead_id}", response_model=LeadOut)
async def patch_lead(lead_id: str, payload: LeadPatch, db=Depends(get_db), user=Depends(get_current_user)):
    svc = LeadsService(db)
    updated = await svc.patch_lead(lead_id, {k:v for k,v in payload.model_dump().items() if v is not None}, user, actor_is_manager=(user["role"]==Roles.MANAGER))
    return updated



@router.post("/{lead_id}/assign", response_model=LeadOut)
async def assign_lead(lead_id: str, payload: AssignRequest, db=Depends(get_db), user=Depends(get_current_user)):
    ensure_manager(user)
    svc = LeadsService(db)
    updated = await svc.assign(lead_id, payload.assigned_to, user)
    return updated



@router.patch("/bulk/status", response_model=dict)
async def bulk_status(payload: BulkStatusRequest, db=Depends(get_db), user=Depends(get_current_user)):
    ensure_manager(user)
    svc = LeadsService(db)
    modified = await svc.bulk_status(payload.lead_ids, payload.status, user)
    return {"modified": modified}

@router.patch("/bulk/temperature", response_model=dict)
async def bulk_temperature(payload: BulkTemperatureRequest, db=Depends(get_db), user=Depends(get_current_user)):
    ensure_manager(user)
    svc = LeadsService(db)
    modified = await svc.bulk_temperature(payload.lead_ids, payload.temperature, user)
    return {"modified": modified}

@router.patch("/bulk/stage", response_model=dict)
async def bulk_stage(payload: BulkStageRequest, db=Depends(get_db), user=Depends(get_current_user)):
    ensure_manager(user)
    svc = LeadsService(db)
    modified = await svc.bulk_stage(payload.lead_ids, payload.pipeline_stage, user)
    return {"modified": modified}

@router.post("/{lead_id}/followups", response_model=dict)
async def add_followup(lead_id: str, payload: FollowupCreate, db=Depends(get_db), user=Depends(get_current_user)):
    # sales can add followups only if they can see the lead
    lead = await db.leads.find_one({"lead_id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_can_view(user, lead)

    svc = FollowupsService(db)
    f = await svc.add_followup(lead_id, payload.model_dump(), user)
    # return lead highlight hint
    return {"followup": f, "badge": "Followup Updated"}

@router.get("/{lead_id}/followups", response_model=list)
async def list_followups(
    lead_id: str,
    db=Depends(get_db),
    user=Depends(get_current_user),
    product_id: Optional[str] = None
):
    lead = await db.leads.find_one({"lead_id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_can_view(user, lead)
    svc = FollowupsService(db)
    items = await svc.list_followups(lead_id, product_id)
    return items

@router.get("/{lead_id}/audit", response_model=list)
async def list_audit(lead_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    lead = await db.leads.find_one({"lead_id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_can_view(user, lead)
    repo = AuditRepository(db)
    items = await repo.list_by_lead(lead_id)
    return items

@router.post("/{lead_id}/notes", response_model=LeadOut)
async def add_note(lead_id: str, payload: NoteCreate, db=Depends(get_db), user=Depends(get_current_user)):
    lead = await db.leads.find_one({"lead_id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_can_view(user, lead)
    svc = LeadsService(db)
    updated = await svc.add_note(lead_id, payload.text, user)
    return updated

@router.post("/bulk/csv", response_model=dict)
async def bulk_csv_upload(
    file: UploadFile = File(...),
    project_id: Optional[str] =Form(None),
    db=Depends(get_db),
    user=Depends(get_current_user)
):
    ensure_manager(user)
    svc = LeadsService(db)
    
    if not file.content_type == "text/csv":
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV file.")

    contents = await file.read()
    file_like_object = io.StringIO(contents.decode("utf-8"))
    reader = csv.DictReader(file_like_object)
    
    leads_to_create = []
    for row in reader:
        # Skip empty rows or rows without a name
        if not row or not row.get('name'):
            continue
        try:
            # leads_to_create.append(LeadCreate(**row, project_id=project_id).model_dump())
            if project_id:
                row["project_id"] = project_id
            leads_to_create.append(LeadCreate(**row).model_dump())
        except Exception as e:
            print(f"Skipping row due to validation error: {row} - {e}")
            continue

    if not leads_to_create:
        raise HTTPException(status_code=400, detail="CSV file is empty or contains no valid leads.")

    created_count = await svc.create_bulk_leads(leads_to_create, user)
    
    return {"created_count": created_count}
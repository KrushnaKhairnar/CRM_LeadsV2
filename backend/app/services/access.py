from fastapi import HTTPException, status
from app.core.deps import Roles

def can_view_lead(user: dict, lead: dict) -> bool:
    if user["role"] == Roles.ADMIN:
        return True
    if user["role"] == Roles.MANAGER:
        return True
    # Sales: assigned_to = me OR created_by = me (even if unassigned)
    uid = user["user_id"]
    return (lead.get("assigned_to") == uid) or (lead.get("created_by") == uid)

def ensure_can_view(user: dict, lead: dict):
    if not can_view_lead(user, lead):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

def ensure_can_update_lead(user: dict, lead: dict):
    # Manager can update any; sales can update only if can_view and not changing assignment fields
    ensure_can_view(user, lead)

def ensure_manager(user: dict):
    if user["role"] not in (Roles.MANAGER, Roles.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager only")

def ensure_admin(user: dict):
    if user["role"] != Roles.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

from fastapi import APIRouter, Depends, Query, HTTPException
from app.db.mongo import get_db
from app.core.deps import get_current_user
from app.repositories.notifications import NotificationsRepository
from app.models.notifications import NotificationRead

router = APIRouter()

@router.get("", response_model=dict)
async def list_notifications(
    db=Depends(get_db),
    user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=100),
):
    repo = NotificationsRepository(db)
    items, total = await repo.list(user["user_id"], page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.patch("/{notification_id}/read", response_model=dict)
async def mark_read(notification_id: str, payload: NotificationRead, db=Depends(get_db), user=Depends(get_current_user)):
    repo = NotificationsRepository(db)
    n = await repo.mark_read(notification_id, user["user_id"], read=payload.read)
    if not n:
        raise HTTPException(status_code=404, detail="Not found")
    return n

@router.patch("/read-all", response_model=dict)
async def mark_all_read(db=Depends(get_db), user=Depends(get_current_user)):
    repo = NotificationsRepository(db)
    count = await repo.mark_all_read(user["user_id"])
    return {"modified": count}

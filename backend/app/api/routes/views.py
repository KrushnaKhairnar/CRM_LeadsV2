from fastapi import APIRouter, Depends, HTTPException
from app.db.mongo import get_db
from app.core.deps import get_current_user
from app.repositories.views import ViewsRepository
from app.models.views import SavedViewCreate, SavedViewOut

router = APIRouter()

@router.get("", response_model=list[SavedViewOut])
async def list_views(db=Depends(get_db), user=Depends(get_current_user)):
    repo = ViewsRepository(db)
    items = await repo.list(user["user_id"])
    return items

@router.post("", response_model=SavedViewOut)
async def create_view(payload: SavedViewCreate, db=Depends(get_db), user=Depends(get_current_user)):
    repo = ViewsRepository(db)
    vid = await repo.create(user["user_id"], payload.name, payload.params)
    doc = await db.saved_views.find_one({"view_id": vid})
    return doc

@router.delete("/{view_id}", response_model=dict)
async def delete_view(view_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    repo = ViewsRepository(db)
    ok = await repo.delete(view_id, user["user_id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": True}

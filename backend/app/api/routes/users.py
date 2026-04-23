from fastapi import APIRouter, Depends
from app.core.deps import Roles, require_roles, get_current_user
from app.db.mongo import get_db
from app.repositories.users import UsersRepository
from app.models.users import UserProfileUpdate

router = APIRouter()

@router.get("", response_model=list)
async def list_sales_users(db=Depends(get_db), user=Depends(require_roles([Roles.MANAGER]))):
    repo = UsersRepository(db)
    users = await repo.list_sales()
    return [
        {
            "user_id": u.get("user_id"),
            "username": u.get("username"),
            "role": u.get("role"),
        }
        for u in users
    ]

@router.get("/me", response_model=dict)
async def get_profile(db=Depends(get_db), user=Depends(get_current_user)):
    repo = UsersRepository(db)
    u = await repo.get_by_id(user["user_id"])
    return {
        "user_id": u.get("user_id"),
        "username": u.get("username"),
        "role": u.get("role"),
        "full_name": u.get("full_name"),
        "email": u.get("email"),
        "phone": u.get("phone"),
    }

@router.patch("/me", response_model=dict)
async def update_profile(payload: UserProfileUpdate, db=Depends(get_db), user=Depends(get_current_user)):
    repo = UsersRepository(db)
    u = await repo.update_profile(user["user_id"], payload.model_dump(exclude_unset=True))
    return {
        "user_id": u.get("user_id"),
        "username": u.get("username"),
        "role": u.get("role"),
        "full_name": u.get("full_name"),
        "email": u.get("email"),
        "phone": u.get("phone"),
    }

@router.get("/lookup", response_model=list[dict])
async def lookup_users(ids: str, db=Depends(get_db), user=Depends(get_current_user)):
    id_list = [i for i in ids.split(",") if i]
    users = []
    if id_list:
        cur = db.users.find({"user_id": {"$in": id_list}})
        users = [d async for d in cur]
    for u in users:
        u.pop("password_hash", None)
    return [{"user_id": u["user_id"], "username": u.get("username"), "role": u.get("role")} for u in users]

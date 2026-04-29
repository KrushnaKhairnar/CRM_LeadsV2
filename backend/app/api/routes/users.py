import threading
from genericpath import exists
from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import Roles, require_roles, get_current_user
from app.db.mongo import get_db
from app.repositories.users import UsersRepository
from app.models.users import UserProfileUpdate, UserUpdateByManager, ManagerUpdate


router = APIRouter()

@router.get("/managers", response_model=list)
async def list_managers(db=Depends(get_db), user=Depends(require_roles([Roles.ADMIN]))):
    """Admin-only: list all manager accounts."""
    repo = UsersRepository(db)
    managers = await repo.list_managers()
    return [
        {
            "user_id": u.get("user_id"),
            "username": u.get("username"),
            "role": u.get("role"),
            "is_active":u.get("is_active",True),
            "created_by": u.get("created_by"),
            "created_at": u.get("created_at"),
        }
        for u in managers
    ]


# -------------- Admin can update managers---------------------

@router.patch("/managers/{user_id}", response_model=dict)
async def update_manager(
    user_id: str,
    payload: ManagerUpdate,
    db=Depends(get_db),
    user=Depends(require_roles([Roles.ADMIN]))
):
    manager = await db.users.find_one({
        "user_id": user_id,
        "role": "MANAGER"
    })

    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")  
    
    #while updating manager check if username is already exists
    if payload.username and payload.username != manager["username"]:
        existing_user = await db.users.find_one({"username": payload.username})
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")

 
    update_data = payload.model_dump(exclude_unset=True)

    await db.users.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )

    updated = await db.users.find_one({"user_id": user_id})

    return {
        "user_id": updated["user_id"],
        "username": updated["username"],
        "email": updated.get("email"),
        "is_active": updated.get("is_active", True)
    }


@router.get("/my-team", response_model=list)
async def list_my_team(db=Depends(get_db), user=Depends(require_roles([Roles.MANAGER]))):
    """Manager-only: list sales users created by the current manager."""
    repo = UsersRepository(db)
    users = await repo.list_sales_for_manager(user["user_id"])
    return [
        {
            "user_id": u.get("user_id"),
            "username": u.get("username"),
            "role": u.get("role"),
            "is_active": u.get("is_active",True),
            "created_by": u.get("created_by"),
            "created_at": u.get("created_at"),
        }
        for u in users
    ]


@router.patch("/managers/{user_id}", response_model=dict)
async def update_manager(
    user_id: str,
    payload: dict,
    db=Depends(get_db),
    user=Depends(require_roles([Roles.ADMIN]))
):
    manager = await db.users.find_one({
        "user_id": user_id,
        "role": "MANAGER"
    })

    if not manager:
        raise HTTPException(
            status_code=404,
            detail="Manager not found"
        )

    # safe username read
    new_username = payload.get("username")

    if new_username is not None:
        new_username = new_username.strip()

        # only check duplicate if changed
        if new_username != manager.get("username", "").strip():

            existing = await db.users.find_one({
                "username": new_username,
                "user_id": {"$ne": user_id}
            })

            if existing:
                raise HTTPException(
                    status_code=409,
                    detail="Username already exists"
                )

    await db.users.update_one(
        {"user_id": user_id},
        {"$set": payload}
    )

    updated = await db.users.find_one({"user_id": user_id})

    return {
        "user_id": updated["user_id"],
        "username": updated["username"],
        "email": updated.get("email"),
        "is_active": updated.get("is_active", True)
    }


@router.get("/me", response_model=dict)
async def get_profile(db= Depends(get_db), user=Depends(get_current_user)):
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
        "is_active": u.get("is_active",True)
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

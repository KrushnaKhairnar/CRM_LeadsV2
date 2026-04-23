from fastapi import APIRouter, Depends
from app.core.deps import Roles, require_roles
from app.utils.seed import seed

router = APIRouter()

@router.post("/seed", response_model=dict)
async def seed_demo(user=Depends(require_roles([Roles.ADMIN]))):
    await seed()
    return {"ok": True}

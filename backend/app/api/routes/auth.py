from fastapi import APIRouter, Depends, HTTPException, status
from app.models.users import LoginRequest, TokenResponse, MeResponse, UserCreate
from app.repositories.users import UsersRepository
from app.core.security import verify_password, create_access_token
from app.db.mongo import get_db
from app.core.deps import get_current_user, Roles, require_roles

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db=Depends(get_db)):
    repo = UsersRepository(db)
    user = await repo.get_by_username(payload.username)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user["user_id"], extra={"role": user["role"], "username": user["username"]})
    return TokenResponse(access_token=token)

@router.get("/me", response_model=MeResponse)
async def me(user=Depends(get_current_user)):
    return user

@router.post("/register", response_model=dict)
async def register(payload: UserCreate, db=Depends(get_db), user=Depends(require_roles([Roles.ADMIN, Roles.MANAGER]))):
    actor_role = user["role"]
    # Hierarchy rules:
    # - ADMIN can create MANAGER only
    # - MANAGER can create SALES only
    if actor_role == Roles.ADMIN and payload.role != Roles.MANAGER:
        raise HTTPException(status_code=403, detail="Admin can create only manager accounts")
    if actor_role == Roles.MANAGER and payload.role != Roles.SALES:
        raise HTTPException(status_code=403, detail="Manager can create only sales accounts")

    repo = UsersRepository(db)
    existing = await repo.get_by_username(payload.username)
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")
    uid = await repo.create(payload.username, payload.password, payload.role)
    return {"id": uid}

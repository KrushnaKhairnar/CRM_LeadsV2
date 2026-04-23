from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import List
from app.core.security import decode_token
from app.repositories.users import UsersRepository
from app.db.mongo import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

class Roles:
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    SALES = "SALES"

async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    repo = UsersRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def require_roles(allowed: List[str]):
    async def _guard(user=Depends(get_current_user)):
        if user["role"] not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user
    return _guard
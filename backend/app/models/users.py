from pydantic import BaseModel, Field
from typing import Literal, Optional
from app.models.common import now_utc
from datetime import datetime

Role = Literal["ADMIN", "MANAGER", "SALES"]

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=4, max_length=128)
    role: Role
    is_active: bool = True

class UserPublic(BaseModel):
    user_id: str
    username: str
    role: Role
    created_by: Optional[str] = None
    created_at: datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class MeResponse(BaseModel):
    user_id: str
    username: str
    role: Role
    created_by: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class UserUpdateByManager(BaseModel):
    is_active: Optional[bool] = None

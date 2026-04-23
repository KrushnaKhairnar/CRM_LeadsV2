from typing import Optional, List
from app.core.security import hash_password
from app.models.common import now_utc
from uuid import uuid4

class UsersRepository:
    def __init__(self, db):
        self.db = db

    async def create(self, username: str, password: str, role: str) -> str:
        uid = str(uuid4())
        doc = {"_id": uid, "user_id": uid, "username": username, "password_hash": hash_password(password), "role": role, "created_at": now_utc()}
        await self.db.users.insert_one(doc)
        return doc["user_id"]

    async def get_by_username(self, username: str) -> Optional[dict]:
        return await self.db.users.find_one({"username": username})

    async def get_by_id(self, user_id: str) -> Optional[dict]:
        return await self.db.users.find_one({"user_id": user_id})

    async def list_sales(self) -> List[dict]:
        cur = self.db.users.find({"role": "SALES"}, {"password_hash": 0}).sort("username", 1)
        return [doc async for doc in cur]

    async def update_profile(self, user_id: str, patch: dict) -> Optional[dict]:
        allowed = {k: v for k, v in patch.items() if k in {"full_name", "email", "phone"}}
        if not allowed:
            return await self.get_by_id(user_id)
        await self.db.users.update_one({"user_id": user_id}, {"$set": allowed})
        return await self.get_by_id(user_id)

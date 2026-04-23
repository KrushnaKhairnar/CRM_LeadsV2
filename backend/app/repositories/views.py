from typing import List, Tuple, Dict, Any, Optional
from app.models.common import now_utc
from uuid import uuid4

class ViewsRepository:
    def __init__(self, db):
        self.db = db

    async def create(self, user_id: str, name: str, params: Dict[str, Any]) -> str:
        doc = {"view_id": str(uuid4()), "user_id": user_id, "name": name, "params": params, "created_at": now_utc()}
        doc["_id"] = doc["view_id"]
        await self.db.saved_views.insert_one(doc)
        return doc["view_id"]

    async def list(self, user_id: str) -> List[dict]:
        cur = self.db.saved_views.find({"user_id": user_id}).sort("created_at", -1)
        return [d async for d in cur]

    async def delete(self, view_id: str, user_id: str) -> bool:
        res = await self.db.saved_views.delete_one({"view_id": view_id, "user_id": user_id})
        return res.deleted_count > 0

from typing import List, Dict, Any, Tuple
from app.models.common import now_utc
from uuid import uuid4

class NotificationsRepository:
    def __init__(self, db):
        self.db = db

    async def create(self, doc: Dict[str, Any]) -> str:
        doc["created_at"] = now_utc()
        doc.setdefault("read", False)
        doc.setdefault("notification_id", str(uuid4()))
        doc.setdefault("_id", doc["notification_id"])
        await self.db.notifications.insert_one(doc)
        return doc["notification_id"]

    async def list(self, user_id: str, page: int, page_size: int) -> Tuple[List[dict], int]:
        q = {"user_id": user_id}
        total = await self.db.notifications.count_documents(q)
        cur = (self.db.notifications.find(q).sort("created_at", -1)
               .skip((page-1)*page_size).limit(page_size))
        return [d async for d in cur], total

    async def mark_read(self, notification_id: str, user_id: str, read: bool=True):
        await self.db.notifications.update_one(
            {"notification_id": notification_id, "user_id": user_id},
            {"$set": {"read": read}}
        )
        return await self.db.notifications.find_one({"notification_id": notification_id, "user_id": user_id})

    async def mark_all_read(self, user_id: str) -> int:
        res = await self.db.notifications.update_many(
            {"user_id": user_id, "read": False},
            {"$set": {"read": True}}
        )
        return getattr(res, "modified_count", 0)

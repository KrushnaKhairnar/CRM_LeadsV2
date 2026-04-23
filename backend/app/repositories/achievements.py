from typing import List, Dict, Any
from app.models.common import now_utc
from uuid import uuid4

class AchievementsRepository:
    def __init__(self, db):
        self.db = db

    async def award(self, doc: Dict[str, Any]) -> str:
        doc["created_at"] = now_utc()
        doc.setdefault("achievement_id", str(uuid4()))
        doc.setdefault("_id", doc["achievement_id"])
        await self.db.achievements.insert_one(doc)
        return doc["achievement_id"]

    async def list_by_user(self, user_id: str) -> List[dict]:
        cur = self.db.achievements.find({"user_id": user_id}).sort("created_at", -1)
        return [d async for d in cur]

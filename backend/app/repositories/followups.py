from typing import List, Dict, Any, Optional
from app.models.common import now_utc
from uuid import uuid4

class FollowupsRepository:
    def __init__(self, db):
        self.db = db

    async def create(self, doc: Dict[str, Any]) -> str:
        doc["created_at"] = now_utc()
        doc.setdefault("followup_id", str(uuid4()))
        doc.setdefault("_id", doc["followup_id"])
        await self.db.followups.insert_one(doc)
        return doc["followup_id"]

    async def list_by_lead(self, lead_id: str, product_id: Optional[str] = None) -> List[dict]:
        query = {"lead_id": lead_id}
        if product_id is not None:
            query["product_id"] = product_id
        cur = self.db.followups.find(query).sort("done_at", -1)
        return [d async for d in cur]

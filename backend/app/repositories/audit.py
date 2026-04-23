from typing import Dict, Any, List
from app.models.common import now_utc
from uuid import uuid4

class AuditRepository:
    def __init__(self, db):
        self.db = db

    async def log(self, lead_id: str, actor_id: str, action: str, before=None, after=None):
        doc = {
            "audit_id": str(uuid4()),
            "lead_id": lead_id,
            "actor_id": actor_id,
            "action": action,
            "before": before,
            "after": after,
            "created_at": now_utc(),
            "updated_at": now_utc()
        }
        doc["_id"] = doc["audit_id"]
        await self.db.audit_logs.insert_one(doc)

    async def list_by_lead(self, lead_id: str) -> List[dict]:
        cur = self.db.audit_logs.find({"lead_id": lead_id}).sort("created_at", -1).limit(100)
        return [d async for d in cur]

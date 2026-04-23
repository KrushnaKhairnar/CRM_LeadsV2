from typing import Dict, Any, List, Optional
from datetime import timezone, datetime
from fastapi import HTTPException
from app.repositories.followups import FollowupsRepository
from app.repositories.leads import LeadsRepository
from app.repositories.audit import AuditRepository

class FollowupsService:
    def __init__(self, db):
        self.db = db
        self.repo = FollowupsRepository(db)
        self.leads = LeadsRepository(db)
        self.audit = AuditRepository(db)

    async def add_followup(self, lead_id: str, data: Dict[str, Any], actor: dict) -> Dict[str, Any]:
        lead = await self.leads.get_by_id(lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        doc = dict(data)
        doc["lead_id"] = lead_id
        if data.get("product_id") is not None:
            doc["product_id"] = data.get("product_id")
        doc["created_by"] = actor["user_id"]
        fid = await self.repo.create(doc)

        # update lead last_followup_at and optional next_followup_at
        patch = {"last_followup_at": data.get("done_at")}
        if data.get("next_followup_at") is not None:
            patch["next_followup_at"] = data.get("next_followup_at")
        await self.leads.update(lead_id, patch)

        await self.audit.log(lead_id, actor["user_id"], "FOLLOWUP_ADDED", before=None, after=doc)
        return await self.db.followups.find_one({"followup_id": fid})

    async def list_followups(self, lead_id: str, product_id: Optional[str] = None) -> List[dict]:
        return await self.repo.list_by_lead(lead_id, product_id)

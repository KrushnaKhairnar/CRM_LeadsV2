from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import HTTPException, status
from app.repositories.leads import LeadsRepository
from app.repositories.audit import AuditRepository
from app.models.common import now_utc

ALLOWED_SALES_FIELDS = {
    "name","phone","email","company","source","purpose","status","temperature","tags",
    "expected_value","pipeline_stage","next_followup_at","next_actions","win_probability","notes"
}

class LeadsService:
    def __init__(self, db):
        self.db = db
        self.repo = LeadsRepository(db)
        self.audit = AuditRepository(db)

    def _compute_overdue(self, lead: Dict[str, Any]) -> Dict[str, Any]:
        nfa = lead.get("next_followup_at")
        if nfa:
            now = datetime.now(timezone.utc)
            lead["is_overdue"] = (nfa.replace(tzinfo=timezone.utc) if nfa.tzinfo is None else nfa) < now
        else:
            lead["is_overdue"] = False
        return lead

    async def create_lead(self, data: Dict[str, Any], actor: dict) -> Dict[str, Any]:
        # Duplicate check (warn, not block): return duplicates in response via header? We'll block if exact match exists
        dups = await self.repo.find_duplicates(data.get("phone"), data.get("email"))
        if dups:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"message":"Possible duplicate lead", "duplicates":[{"lead_id": d.get("lead_id"), "name": d.get("name"), "phone": d.get("phone"), "email": d.get("email"), "company": d.get("company")} for d in dups]})
        doc = dict(data)
        doc["created_by"] = actor["user_id"]
        # Set manager_id based on user role
        role = actor.get("role", "").upper()
        if role == "MANAGER":
            doc["manager_id"] = actor["user_id"]
        elif role == "SALES":
            doc["manager_id"] = actor.get("created_by")
        else:
            doc["manager_id"] = None
        doc["assigned_to"] = None
        doc["assigned_by"] = None
        doc["assigned_at"] = None
        lead_id = await self.repo.create(doc)
        await self.audit.log(lead_id, actor["user_id"], "LEAD_CREATED", before=None, after=doc)
        lead = await self.repo.get_by_id(lead_id)
        return self._compute_overdue(lead)

    async def patch_lead(self, lead_id: str, patch: Dict[str, Any], actor: dict, actor_is_manager: bool) -> Dict[str, Any]:
        lead = await self.repo.get_by_id(lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        before = {k: lead.get(k) for k in patch.keys()}

        if not actor_is_manager:
            # restrict sales fields
            for k in list(patch.keys()):
                if k not in ALLOWED_SALES_FIELDS:
                    patch.pop(k, None)

        updated = await self.repo.update(lead_id, patch)
        await self.audit.log(lead_id, actor["user_id"], "LEAD_UPDATED", before=before, after={k: updated.get(k) for k in before.keys()})
        return self._compute_overdue(updated)

    async def assign(self, lead_id: str, assigned_to: Optional[str], manager: dict) -> Dict[str, Any]:
        lead = await self.repo.get_by_id(lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        before = {"assigned_to": lead.get("assigned_to"), "assigned_by": lead.get("assigned_by"), "assigned_at": lead.get("assigned_at")}

        patch = {"assigned_to": assigned_to, "assigned_by": manager["user_id"], "assigned_at": datetime.now(timezone.utc)}
        updated = await self.repo.update(lead_id, patch)
        await self.audit.log(lead_id, manager["user_id"], "LEAD_ASSIGNED", before=before, after=patch)
        return self._compute_overdue(updated)

    async def bulk_assign(self, lead_ids: List[str], assigned_to: Optional[str], manager: dict) -> int:
        count = 0
        for lid in lead_ids:
            try:
                await self.assign(lid, assigned_to, manager)
                count += 1
            except Exception:
             
                continue
        return count


# async def bulk_assign(self, lead_ids: List[str], assigned_to: Optional[str], manager: dict) -> int:
#     count = 0

#     for lid in lead_ids:
#         try:
#             await self.assign(lid, assigned_to, manager)
#             count += 1
#         except Exception as e:
#             print("Bulk assign failed:", lid, str(e))

#     return count

    async def bulk_status(self, lead_ids: List[str], status: str, manager: dict) -> int:
        count = 0
        for lid in lead_ids:
            try:
                await self.patch_lead(lid, {"status": status}, actor=manager, actor_is_manager=True)
                count += 1
            except Exception:
                continue
        return count

    async def bulk_temperature(self, lead_ids: List[str], temperature: str, manager: dict) -> int:
        count = 0
        for lid in lead_ids:
            try:
                await self.patch_lead(lid, {"temperature": temperature}, actor=manager, actor_is_manager=True)
                count += 1
            except Exception:
                continue
        return count

    async def bulk_stage(self, lead_ids: List[str], stage: str, manager: dict) -> int:
        count = 0
        for lid in lead_ids:
            try:
                await self.patch_lead(lid, {"pipeline_stage": stage}, actor=manager, actor_is_manager=True)
                count += 1
            except Exception:
                continue
        return count

    async def list_for_user(self, user, filters, page, page_size, sort):
        role = user["role"]
        uid = user["user_id"]

        if role in ("MANAGER", "ADMIN"):
            q = filters if filters else {}
        else:
            access_scope = {"$or": [{"assigned_to": uid}, {"created_by": uid}]}
            q = access_scope
            if filters:
                q = {"$and": [access_scope, filters]}

        items, total = await self.repo.list(q, page, page_size, sort)
        items = [self._compute_overdue(i) for i in items]
        return items, total

    async def add_note(self, lead_id: str, text: str, actor: dict) -> Dict[str, Any]:
        note = {"text": text, "author_id": actor["user_id"], "created_at": datetime.now(timezone.utc)}
        await self.db.leads.update_one({"lead_id": lead_id}, {"$push": {"notes": note}, "$set": {"updated_at": datetime.now(timezone.utc)}})
        lead = await self.repo.get_by_id(lead_id)
        return self._compute_overdue(lead)

    async def create_bulk_leads(self, leads_data: List[Dict[str, Any]], actor: dict) -> int:
        count = 0
        for lead_data in leads_data:
            try:
                doc = dict(lead_data)
                doc["created_by"] = actor["user_id"]
                doc["manager_id"] = actor.get("created_by") 
                doc["assigned_to"] = None
                doc["assigned_by"] = None
                doc["assigned_at"] = None
                
                lead_id = await self.repo.create(doc)
                await self.audit.log(lead_id, actor["user_id"], "LEAD_CREATED", before=None, after=doc)
                count += 1
            except Exception as e:
                # Log or handle exceptions for individual lead creation failures
                print(f"Failed to create lead: {e}")
                continue
        return count

    async def add_product(self, lead_id: str, product_data: Dict[str, Any], actor: dict) -> Dict[str, Any]:
        lead = await self.repo.get_by_id(lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        product = dict(product_data)
        product.setdefault("id", str(uuid4()))
        product.setdefault("created_at", now_utc())

        saved_product = await self.repo.add_product(lead_id, product)
        await self.audit.log(lead_id, actor["user_id"], "PRODUCT_ADDED", before=None, after=product)
        return saved_product

    async def get_product(self, lead_id: str, product_id: str) -> Dict[str, Any]:
        product = await self.repo.get_product(lead_id, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product

    async def list_products(self, lead_id: str) -> List[Dict[str, Any]]:
        lead = await self.repo.get_by_id(lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        return lead.get("products", [])

    async def delete_product(self, lead_id: str, product_id: str, actor: dict) -> bool:
        lead = await self.repo.get_by_id(lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        product = next((p for p in lead.get("products", []) if p.get("id") == product_id), None)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        deleted = await self.repo.delete_product(lead_id, product_id)
        if not deleted:
            raise HTTPException(status_code=500, detail="Failed to delete product")

        await self.audit.log(lead_id, actor["user_id"], "PRODUCT_DELETED", before=product, after=None)
        return True
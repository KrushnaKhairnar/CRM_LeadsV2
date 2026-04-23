from typing import Optional, Dict, Any, List, Tuple
from app.models.common import now_utc
from uuid import uuid4

class LeadsRepository:
    def __init__(self, db):
        self.db = db

    async def create(self, doc: Dict[str, Any]) -> str:
        doc["created_at"] = now_utc()
        doc["updated_at"] = now_utc()
        doc.setdefault("lead_id", str(uuid4()))
        doc.setdefault("_id", doc["lead_id"])
        await self.db.leads.insert_one(doc)
        return doc["lead_id"]

    async def get_by_id(self, lead_id: str) -> Optional[dict]:
        return await self.db.leads.find_one({"lead_id": lead_id})

    async def find_duplicates(self, phone: Optional[str], email: Optional[str]) -> List[dict]:
        q = {"$or": []}
        if phone:
            q["$or"].append({"phone": phone})
        if email:
            q["$or"].append({"email": email})
        if not q["$or"]:
            return []
        cur = self.db.leads.find(q, {"lead_id": 1, "name": 1, "phone": 1, "email": 1, "company": 1}).limit(5)
        return [d async for d in cur]

    async def update(self, lead_id: str, patch: Dict[str, Any]) -> Optional[dict]:
        patch["updated_at"] = now_utc()
        await self.db.leads.update_one({"lead_id": lead_id}, {"$set": patch})
        return await self.get_by_id(lead_id)

    async def list(self, query: Dict[str, Any], page: int, page_size: int, sort: Tuple[str, int]) -> Tuple[List[dict], int]:
        total = await self.db.leads.count_documents(query)
        # Exclude Mongo ObjectId from API payloads to keep responses JSON-serializable.
        cur = (self.db.leads.find(query, {"_id": 0})
               .sort([sort])
               .skip((page-1)*page_size)
               .limit(page_size))
        items = [d async for d in cur]
        return items, total

    async def add_product(self, lead_id: str, product: Dict[str, Any]) -> Optional[dict]:
        await self.db.leads.update_one(
            {"lead_id": lead_id},
            {"$push": {"products": product}, "$set": {"updated_at": now_utc()}}
        )
        lead = await self.get_by_id(lead_id)
        return next((p for p in lead.get("products", []) if p.get("id") == product.get("id")), None)

    async def delete_product(self, lead_id: str, product_id: str) -> bool:
        result = await self.db.leads.update_one(
            {"lead_id": lead_id},
            {"$pull": {"products": {"id": product_id}}, "$set": {"updated_at": now_utc()}}
        )
        return result.modified_count > 0

    async def get_product(self, lead_id: str, product_id: str) -> Optional[dict]:
        lead = await self.get_by_id(lead_id)
        if not lead:
            return None
        return next((p for p in lead.get("products", []) if p.get("id") == product_id), None)

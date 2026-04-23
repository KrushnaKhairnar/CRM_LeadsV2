from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from app.models.common import now_utc
from uuid import uuid4

class InvoicesRepository:
    def __init__(self, db):
        self.db = db

    def _compute_totals(self, items: List[Dict[str, Any]]) -> Dict[str, float]:
        subtotal = sum((i.get("quantity", 1) * float(i.get("unit_price", 0))) for i in items)
        tax = round(subtotal * 0.18, 2)  # 18% GST default
        total = round(subtotal + tax, 2)
        return {"subtotal": round(subtotal, 2), "tax": tax, "total": total}

    async def _next_invoice_no(self) -> str:
        # naive sequence based on count + timestamp
        ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        c = await self.db.invoices.count_documents({})
        return f"PRO-{ts}-{c+1:04d}"

    async def create(self, payload: Dict[str, Any], sales_user_id: str) -> Dict[str, Any]:
        items = payload.get("items", [])
        totals = self._compute_totals(items)
        doc = {
            "invoice_id": str(uuid4()),
            "invoice_no": await self._next_invoice_no(),
            "sales_user_id": sales_user_id,
            "client_name": payload["client_name"],
            "client_company": payload.get("client_company"),
            "client_address": payload.get("client_address"),
            "currency": payload.get("currency", "INR"),
            "items": items,
            "notes": payload.get("notes"),
            "issue_date": payload.get("issue_date") or now_utc(),
            "due_date": payload.get("due_date"),
            "status": "DRAFT",
            **totals,
            "created_at": now_utc(),
            "updated_at": now_utc(),
        }
        doc["_id"] = doc["invoice_id"]
        await self.db.invoices.insert_one(doc)
        return doc

    async def get(self, invoice_id: str) -> Optional[Dict[str, Any]]:
        return await self.db.invoices.find_one({"invoice_id": invoice_id})

    async def list(self, q: Dict[str, Any], page: int, page_size: int) -> Tuple[List[Dict[str, Any]], int]:
        total = await self.db.invoices.count_documents(q)
        cur = self.db.invoices.find(q).sort("created_at", -1).skip((page-1)*page_size).limit(page_size)
        items = [d async for d in cur]
        return items, total

    async def patch(self, invoice_id: str, patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        patch["updated_at"] = now_utc()
        await self.db.invoices.update_one({"invoice_id": invoice_id}, {"$set": patch})
        return await self.get(invoice_id)

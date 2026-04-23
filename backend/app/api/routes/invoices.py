from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from app.db.mongo import get_db
from app.core.deps import get_current_user
from app.services.access import ensure_manager
from app.models.invoices import InvoiceCreate, InvoiceOut, InvoicePatch
from app.repositories.invoices import InvoicesRepository

router = APIRouter()

@router.post("", response_model=InvoiceOut)
async def create_invoice(payload: InvoiceCreate, db=Depends(get_db), user=Depends(get_current_user)):
    repo = InvoicesRepository(db)
    doc = await repo.create(payload.model_dump(), user["user_id"])
    return doc

@router.get("", response_model=dict)
async def list_invoices(
    db=Depends(get_db),
    user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=100),
    sales_user_id: Optional[str] = None,
    status: Optional[str] = None,
):
    repo = InvoicesRepository(db)
    q = {}
    if user["role"] != "MANAGER":
        q["sales_user_id"] = user["user_id"]
    elif sales_user_id:
        q["sales_user_id"] = sales_user_id
    if status:
        q["status"] = status
    items, total = await repo.list(q, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.get("/{invoice_id}", response_model=InvoiceOut)
async def get_invoice(invoice_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    repo = InvoicesRepository(db)
    doc = await repo.get(invoice_id)
    if not doc or (user["role"] != "MANAGER" and doc.get("sales_user_id") != user["user_id"]):
        raise HTTPException(status_code=404, detail="Not found")
    return doc

@router.patch("/{invoice_id}", response_model=InvoiceOut)
async def patch_invoice(invoice_id: str, payload: InvoicePatch, db=Depends(get_db), user=Depends(get_current_user)):
    repo = InvoicesRepository(db)
    doc = await repo.get(invoice_id)
    if not doc or (user["role"] != "MANAGER" and doc.get("sales_user_id") != user["user_id"]):
        raise HTTPException(status_code=404, detail="Not found")
    updated = await repo.patch(invoice_id, payload.model_dump(exclude_unset=True))
    return updated

@router.post("/{invoice_id}/send", response_model=InvoiceOut)
async def send_invoice(invoice_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    repo = InvoicesRepository(db)
    doc = await repo.get(invoice_id)
    if not doc or (user["role"] != "MANAGER" and doc.get("sales_user_id") != user["user_id"]):
        raise HTTPException(status_code=404, detail="Not found")
    updated = await repo.patch(invoice_id, {"status": "SENT"})
    return updated

@router.post("/{invoice_id}/mark-paid", response_model=InvoiceOut)
async def mark_invoice_paid(invoice_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    repo = InvoicesRepository(db)
    doc = await repo.get(invoice_id)
    if not doc or (user["role"] != "MANAGER" and doc.get("sales_user_id") != user["user_id"]):
        raise HTTPException(status_code=404, detail="Not found")
    updated = await repo.patch(invoice_id, {"status": "PAID"})
    return updated

@router.get("/{invoice_id}/email.html", response_model=str)
async def invoice_email_html(invoice_id: str, db=Depends(get_db), user=Depends(get_current_user)):
    repo = InvoicesRepository(db)
    doc = await repo.get(invoice_id)
    if not doc or (user["role"] != "MANAGER" and doc.get("sales_user_id") != user["user_id"]):
        raise HTTPException(status_code=404, detail="Not found")
    # simple brand-styled HTML
    html = f"""
    <div style="font-family:ui-sans-serif;max-width:640px;margin:auto;padding:16px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-weight:700;font-size:20px">Digikore Studio Limited</div>
          <div style="color:#64748b;font-size:12px">Proforma Invoice #{doc.get('invoice_no')}</div>
        </div>
        <div style="width:40px;height:40px;border-radius:12px;background:#4f46e5"></div>
      </div>
      <p style="margin-top:16px">Dear {doc.get('client_name')},</p>
      <p>Please find the proforma invoice attached. Total: <strong>{doc.get('currency')} {doc.get('total')}</strong>.</p>
      <p style="color:#64748b;font-size:12px">GSTIN: 27ABCDE1234F1Z5</p>
      <hr style="margin:16px 0;border:none;border-top:1px solid #e2e8f0" />
      <p style="font-size:12px;color:#64748b">This is an automated email.</p>
    </div>
    """
    return html

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

InvoiceStatus = Literal["DRAFT", "SENT", "PAID", "OVERDUE"]

class InvoiceItem(BaseModel):
    product: str
    quantity: int = Field(ge=1, default=1)
    unit_price: float = Field(ge=0)

class InvoiceCreate(BaseModel):
    client_name: str
    client_company: Optional[str] = None
    client_address: Optional[str] = None
    currency: str = "INR"
    items: List[InvoiceItem]
    notes: Optional[str] = None
    issue_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

class InvoicePatch(BaseModel):
    status: Optional[InvoiceStatus] = None
    notes: Optional[str] = None

class InvoiceOut(BaseModel):
    invoice_id: str
    invoice_no: str
    sales_user_id: str
    client_name: str
    client_company: Optional[str] = None
    client_address: Optional[str] = None
    currency: str
    items: List[InvoiceItem]
    notes: Optional[str] = None
    issue_date: datetime
    due_date: Optional[datetime] = None
    status: InvoiceStatus
    subtotal: float
    tax: float
    total: float
    created_at: datetime
    updated_at: datetime

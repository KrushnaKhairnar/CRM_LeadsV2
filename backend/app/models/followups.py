from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

class FollowupCreate(BaseModel):
    done_at: datetime
    note: str = Field(min_length=1, max_length=3000)
    outcome: Optional[str] = Field(default=None, max_length=200)
    next_followup_at: Optional[datetime] = None
    product_id: Optional[str] = None

class FollowupOut(BaseModel):
    followup_id: str
    lead_id: str
    product_id: Optional[str] = None
    done_at: datetime
    note: str
    outcome: Optional[str] = None
    next_followup_at: datetime = datetime.now(timezone.utc)
    created_by: str
    created_at: datetime

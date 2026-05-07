from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, timezone, date

class FollowupCreate(BaseModel):
    done_at: datetime
    note: str = Field(min_length=1, max_length=3000)
    outcome: Optional[str] = Field(default=None, max_length=200)
    next_followup_at: Optional[datetime] = None
    product_id: Optional[str] = None


@field_validator("done_at", "next_followup_at", mode="before")
@classmethod
def parse_flexible_date(cls, value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        # Try ISO first (BEST)
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            pass

        # fallback formats (date only → convert to datetime)
        for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue

    raise ValueError(f"Invalid datetime: {value}")

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

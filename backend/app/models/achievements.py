from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class AchievementCreate(BaseModel):
    user_id: str
    badge_key: str
    title: Optional[str] = None
    description: Optional[str] = None

class AchievementOut(BaseModel):
    achievement_id: str
    user_id: str
    badge_key: str
    title: str
    description: Optional[str] = None
    awarded_by: Optional[str] = None
    mode: str  # "manual" | "auto"
    created_at: datetime

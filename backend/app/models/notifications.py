from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class NotificationOut(BaseModel):
    notification_id: str
    user_id: str
    title: str
    message: str
    link: str
    read: bool
    created_at: datetime = Field(default_factory=datetime.utcnow)

class NotificationRead(BaseModel):
    read: bool = True

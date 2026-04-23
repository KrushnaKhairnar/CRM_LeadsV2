from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class SavedViewCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    params: Dict[str, Any] = Field(default_factory=dict)

class SavedViewOut(BaseModel):
    view_id: str
    user_id: str
    name: str
    params: Dict[str, Any]
    created_at: datetime

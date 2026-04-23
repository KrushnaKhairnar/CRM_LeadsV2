from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, Any, Dict, List

class Page(BaseModel):
    items: list
    total: int
    page: int
    page_size: int

class PyUUID(str):
    pass


  

def now_utc():
    return datetime.now(timezone.utc)
    

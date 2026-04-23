
from fastapi import FastAPI, HTTPException
from typing import List, Optional
from uuid import uuid4
from datetime import datetime

from pydantic import BaseModel, Field

app = FastAPI()



class ProductCreate(BaseModel):
    project_id: Optional[str] = None
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    is_active: bool = False
    price: float = Field(ge=0)
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)



class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    is_active: Optional[bool] = None
    price: Optional[float] = Field(default=None, ge=0)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ProductOut(BaseModel):
    project_id: str   
    name: str
    description: Optional[str] = None
    is_active: bool
    price: float
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ProductDelete(BaseModel):
    project_id: str
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime

Status = Literal["OPEN","WIP","CLOSED","LOST"]
Temperature = Literal["COLD","WARM","HOT"]
Stage = Literal["NEW","CONTACTED","DEMO","PROPOSAL","NEGOTIATION","WON","LOST"]



class LeadBase(BaseModel):
    
    name: str = Field(min_length=1, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=50)
    email: Optional[str] = Field(default=None, max_length=200)
    company: Optional[str] = Field(default=None, max_length=200)
    source: Optional[str] = Field(default=None, max_length=100)
    project_id: str = Field(..., min_length=1)
    purpose: Optional[str] = Field(default=None, max_length=2000)
    status: Status = "OPEN"
    temperature: Temperature = "COLD"
    tags: List[str] = Field(default_factory=list)
    expected_value: float = 0.0
    pipeline_stage: Optional[Stage] = None
    next_followup_at: Optional[datetime] = None
    last_followup_at: Optional[datetime] = None
    next_actions: List[dict] = Field(default_factory=list)
    notes: List[dict] = Field(default_factory=list)
    win_probability: int = 0
    

class LeadCreate(LeadBase):
    pass

class LeadPatch(BaseModel):
    
    name: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=50)
    email: Optional[str] = Field(default=None, max_length=200)
    company: Optional[str] = Field(default=None, max_length=200)
    source: Optional[str] = Field(default=None, max_length=100)
    purpose: Optional[str] = Field(default=None, max_length=2000)
    status: Optional[Status] = None
    temperature: Optional[Temperature] = None
    tags: Optional[List[str]] = None
    expected_value: Optional[float] = None
    pipeline_stage: Optional[Stage] = None
    next_followup_at: Optional[datetime] = None
    next_actions: Optional[List[dict]] = None
    win_probability: Optional[int] = None
    notes: Optional[List[dict]] = None
    products: Optional[List[dict]] = None

class NoteCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)

class AssignRequest(BaseModel):
    assigned_to: Optional[str] = None  # sales user id or null

class BulkAssignRequest(BaseModel):
    lead_ids: List[str]
    assigned_to: Optional[str] = None

class BulkStatusRequest(BaseModel):
    lead_ids: List[str]
    status: Status

class BulkTemperatureRequest(BaseModel):
    lead_ids: List[str]
    temperature: Temperature

class BulkStageRequest(BaseModel):
    lead_ids: List[str]
    pipeline_stage: Stage

class LeadOut(LeadBase):
    lead_id: str
    project_name: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_by: Optional[str] = None
    assigned_at: Optional[datetime] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
    is_overdue: bool = False

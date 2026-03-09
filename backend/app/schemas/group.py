
# C:\proof\rosca\backend\app\schemas\group.py

from pydantic import BaseModel, UUID4, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class GroupStatus(str, Enum):
    active = "active"
    completed = "completed"
    paused = "paused"

class Frequency(str, Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"

class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    contribution_amount: float = Field(..., gt=0)
    contribution_frequency: Frequency
    member_count: int = Field(..., gt=1, le=50)
    currency: str = "USD"
    country_code: Optional[str] = None

class GroupCreate(GroupBase):
    pass

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[GroupStatus] = None

class GroupResponse(GroupBase):
    id: UUID4
    current_cycle: int
    status: GroupStatus
    created_at: datetime
    created_by: UUID4
    
    class Config:
        from_attributes = True
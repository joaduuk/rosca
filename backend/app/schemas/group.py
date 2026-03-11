
# C:\proof\rosca\backend\app\schemas\group.py

from pydantic import BaseModel, UUID4, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class RoscaType(str, Enum):
    random = "random"
    fixed = "fixed"
    auction = "auction"

class ContributionPeriod(str, Enum):
    daily = "daily"
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"

class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    contribution_amount: float = Field(..., gt=0)
    contribution_period: ContributionPeriod
    member_count: int = Field(..., ge=2, le=50)
    rosca_type: RoscaType
    currency: str  # REQUIRED - admin must choose this at creation

class GroupCreate(GroupBase):
    pass  # Inherits all fields as required

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    contribution_amount: Optional[float] = Field(None, gt=0)
    contribution_period: Optional[ContributionPeriod] = None
    member_count: Optional[int] = Field(None, ge=2, le=50)
    rosca_type: Optional[RoscaType] = None
    currency: Optional[str] = None  # Optional for updates
    is_active: Optional[bool] = None

class GroupResponse(GroupBase):
    id: UUID4
    created_by: UUID4
    created_at: datetime
    updated_at: Optional[datetime] = None
    current_cycle: int = 0
    total_cycles_completed: int = 0
    next_payout_date: Optional[datetime] = None
    total_collected: float = 0
    total_paid_out: float = 0
    is_active: bool = True
    
    class Config:
        from_attributes = True
# C:\proof\rosca\backend\app\schemas\contribution.py

from pydantic import BaseModel, UUID4, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class PaymentStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    late = "late"

class ContributionBase(BaseModel):
    membership_id: UUID4
    amount: float = Field(..., gt=0)
    currency: str = "USD"
    due_date: datetime
    status: PaymentStatus = PaymentStatus.pending
    payment_method: Optional[str] = None
    notes: Optional[str] = None

class ContributionCreate(ContributionBase):
    pass

class ContributionUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    status: Optional[PaymentStatus] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None

class ContributionResponse(ContributionBase):
    id: UUID4
    group_id: UUID4
    paid_date: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
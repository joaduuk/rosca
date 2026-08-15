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
    cycle_number: int = Field(..., ge=1, description="Which cycle this contribution belongs to")
    amount: float = Field(..., gt=0)
    currency: str = "USD"
    due_date: datetime
    status: PaymentStatus = PaymentStatus.pending
    payment_method: Optional[str] = None
    notes: Optional[str] = None

class ContributionCreate(ContributionBase):
    transaction_reference: Optional[str] = None  # accepted but ignored (model doesn't have it)

class ContributionUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    status: Optional[PaymentStatus] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    paid_date: Optional[datetime] = None

class ContributionResponse(ContributionBase):
    id: UUID4
    group_id: UUID4
    round_number: int = 1
    paid_date: Optional[datetime] = None
    created_at: datetime
    exchange_rate: Optional[float] = None
    base_currency_amount: Optional[float] = None
    # enrichment fields (set dynamically by router)
    member_name: Optional[str] = None
    member_email: Optional[str] = None

    class Config:
        from_attributes = True

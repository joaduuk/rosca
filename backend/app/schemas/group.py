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


class GroupStatus(str, Enum):
    active = "active"
    pending_decision = "pending_decision"
    paused = "paused"
    ended = "ended"


class CycleDecision(str, Enum):
    continue_ = "continue"
    pause = "pause"
    end = "end"


class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    contribution_amount: float = Field(..., gt=0)
    contribution_period: ContributionPeriod
    member_count: int = Field(..., ge=2, le=50)
    rosca_type: RoscaType
    currency: str


class GroupCreate(GroupBase):
    pass


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    contribution_amount: Optional[float] = Field(None, gt=0)
    contribution_period: Optional[ContributionPeriod] = None
    member_count: Optional[int] = Field(None, ge=2, le=50)
    rosca_type: Optional[RoscaType] = None
    currency: Optional[str] = None
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
    group_status: str = "active"
    cycle_decision: Optional[str] = None
    cycle_decision_note: Optional[str] = None
    is_locked: bool = False
    round_number: int = 1
    round_size: Optional[int] = None
    is_archived: bool = False

    class Config:
        from_attributes = True


# ── Cycle decision ────────────────────────────────────────────────────────
class CycleDecisionRequest(BaseModel):
    decision: CycleDecision
    note: Optional[str] = None


# ── Exit request ──────────────────────────────────────────────────────────
class ExitRequest(BaseModel):
    reason: Optional[str] = None


class ExitRequestResponse(BaseModel):
    membership_id: UUID4
    user_id: UUID4
    user_name: str
    user_email: str
    exit_requested_at: Optional[datetime]
    exit_reason: Optional[str]
    exit_approved: Optional[bool]

    class Config:
        from_attributes = True


class ExitDecision(BaseModel):
    approved: bool
    note: Optional[str] = None


# ── Waitlist ──────────────────────────────────────────────────────────────
class WaitlistResponse(BaseModel):
    membership_id: UUID4
    user_id: UUID4
    user_name: str
    user_email: str
    waitlist_requested_at: Optional[datetime]
    waitlist_note: Optional[str]
    waitlist_approved: Optional[bool]

    class Config:
        from_attributes = True


class WaitlistDecision(BaseModel):
    approved: bool

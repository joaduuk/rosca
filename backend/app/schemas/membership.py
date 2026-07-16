from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime

class MembershipBase(BaseModel):
    group_id: UUID4
    is_admin: bool = False
    payout_order: Optional[int] = None
    guarantor_id: Optional[UUID4] = None

class MembershipCreate(MembershipBase):
    user_id: UUID4

class OfflineMemberCreate(BaseModel):
    """Add a member who is not registered on the app yet. Admin manages
    their contributions directly; there is no expectation they ever claim
    the account — that's an optional bonus, not the point."""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None

class MembershipUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    payout_order: Optional[int] = None
    guarantor_id: Optional[UUID4] = None

class MembershipResponse(MembershipBase):
    id: UUID4
    user_id: Optional[UUID4] = None
    joined_at: datetime
    is_active: bool
    member_status: str = "registered"
    # User info fields populated by the router.
    # For offline members these fall back to display_name/contact_*.
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    guarantor_email: Optional[str] = None
    guarantor_name: Optional[str] = None

    class Config:
        from_attributes = True
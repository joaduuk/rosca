# C:\proof\rosca\backend\app\schemas\membership.py

from pydantic import BaseModel, UUID4, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class MembershipBase(BaseModel):
    user_id: UUID4
    group_id: UUID4
    is_admin: bool = False
    guarantor_id: Optional[UUID4] = None

class MembershipCreate(MembershipBase):
    pass

class MembershipUpdate(BaseModel):
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    guarantor_id: Optional[UUID4] = None
    payout_order: Optional[int] = None

class MembershipResponse(MembershipBase):
    id: UUID4
    joined_at: datetime
    is_active: bool
    payout_order: Optional[int] = None
    
    # Include user details for convenience
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    guarantor_email: Optional[str] = None
    guarantor_name: Optional[str] = None
    
    class Config:
        from_attributes = True
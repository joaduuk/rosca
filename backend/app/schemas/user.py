# app/schemas/user.py
from pydantic import BaseModel, UUID4, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"      # Platform owner/staff
    GROUP_ADMIN = "group_admin"       # Group creators/managers
    GROUP_MEMBER = "group_member"     # Regular members

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    """Schema for updating user information"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None

class UserResponse(UserBase):
    id: UUID4
    is_active: bool
    role: UserRole  # Changed from str to UserRole enum
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    """Schema for JWT token response"""
    access_token: str
    token_type: str = "bearer"
    user_id: UUID4  # Made required, not Optional
    email: str      # Made required, not Optional
    full_name: str  # ADD THIS - missing but needed for frontend
    role: UserRole  # Changed from Optional[str] to UserRole (required)
    
    class Config:
        from_attributes = True
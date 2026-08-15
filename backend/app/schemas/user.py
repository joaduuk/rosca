# app/schemas/user.py
from pydantic import BaseModel, UUID4, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    """Platform-level roles only"""
    SUPER_ADMIN = "super_admin"      # Platform owner/staff
    USER = "user"                     # Base user (can belong to groups)

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
    role: UserRole
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
    user_id: UUID4
    email: str
    full_name: str
    role: UserRole
    
    class Config:
        from_attributes = True
    
class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
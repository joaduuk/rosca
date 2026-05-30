# app/models/user.py
from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from app.core.database import Base
import enum

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"      # Platform owner/staff
    GROUP_ADMIN = "group_admin"       # Group creators/managers
    GROUP_MEMBER = "group_member"     # Regular members

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    preferred_language = Column(String(2), default="en")
    preferred_currency = Column(String(3), default="USD")
    timezone = Column(String, default="UTC")
    role = Column(Enum(UserRole), default=UserRole.GROUP_MEMBER)  # Updated
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
# app/models/user.py
from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    # Add to User model
    preferred_language = Column(String(2), default="en")
    preferred_currency = Column(String(3), default="USD")
    timezone = Column(String, default="UTC")
    role = Column(Enum("admin", "member", name="user_roles"), default="member")
    created_at = Column(DateTime, default=datetime.utcnow)
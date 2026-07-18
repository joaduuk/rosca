# app/models/user.py
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import Enum as SqlEnum
import uuid
from datetime import datetime
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    USER = "user"


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
    avatar_url = Column(String, nullable=True)
    invite_code = Column(String(20), unique=True, nullable=False)

    role = Column(
        SqlEnum(
            UserRole,
            name="userrole",
            values_callable=lambda enum: [e.value for e in enum]
        ),
        default=UserRole.USER.value,
        nullable=False
    )

    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)

    # Email verification (double opt-in)
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String, nullable=True, index=True)
    verification_token_expires = Column(DateTime, nullable=True)
    verification_sent_at = Column(DateTime, nullable=True)

    # Bounce suppression — set False when an address is known-bad; all sends must check this first
    email_valid = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    memberships = relationship(
        "Membership",
        back_populates="user",
        foreign_keys="Membership.user_id"
    )
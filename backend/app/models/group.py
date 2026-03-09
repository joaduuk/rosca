# backend/app/models/group.py
from sqlalchemy import Column, String, Integer, Numeric, ForeignKey, DateTime, Enum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base


class Group(Base):
    __tablename__ = "groups"
    __table_args__ = (
        UniqueConstraint('name', 'created_by', name='unique_group_per_user'),
    )
   
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    #name = Column(String, nullable=False)
    description = Column(String)
    contribution_amount = Column(Numeric(10, 2), nullable=False)
    contribution_frequency = Column(Enum("daily", "weekly", "monthly", name="frequency"), nullable=False)
    member_count = Column(Integer, nullable=False)
    start_date = Column(DateTime, default=datetime.utcnow)
    current_cycle = Column(Integer, default=1)
    status = Column(Enum("active", "completed", "paused", name="group_status"), default="active")
    country_code = Column(String(2))  # For global customization
    currency = Column(String(3), default="USD")
    # In the Group class, make sure you have:
    # currency = Column(String(3), default="USD")  # ISO currency code
    country_code = Column(String(2))  # For regional settings
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    # Add these fields for better international support
    date_format = Column(String, default="YYYY-MM-DD")  # User preference
    language = Column(String(2), default="en")  # ISO language code
    timezone = Column(String, default="UTC")  # IANA timezone
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    memberships = relationship("Membership", back_populates="group")
    contributions = relationship("Contribution", back_populates="group")
    payout_schedules = relationship("PayoutSchedule", back_populates="group")
    from sqlalchemy import UniqueConstraint


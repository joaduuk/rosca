from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Boolean  # Add Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base

class Group(Base):
    __tablename__ = "groups"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    contribution_amount = Column(Float, nullable=False)
    contribution_period = Column(String, nullable=False)  # daily, weekly, monthly
    member_count = Column(Integer, nullable=False)
    rosca_type = Column(String, nullable=False)  # random, fixed, auction
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    currency = Column(String, nullable=False, default="USD")
    
    # Add these new fields for cycle tracking
    current_cycle = Column(Integer, default=0)
    total_cycles_completed = Column(Integer, default=0)
    start_date = Column(DateTime, default=datetime.utcnow)
    next_payout_date = Column(DateTime, nullable=True)
    total_collected = Column(Float, default=0)
    total_paid_out = Column(Float, default=0)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    memberships = relationship("Membership", back_populates="group", cascade="all, delete-orphan")
    contributions = relationship("Contribution", back_populates="group", cascade="all, delete-orphan")
    payout_schedules = relationship("PayoutSchedule", back_populates="group", cascade="all, delete-orphan")
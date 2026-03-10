# backend/app/models/payout_schedule.py
from sqlalchemy import Column, Numeric, DateTime, ForeignKey, Enum, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base

class PayoutSchedule(Base):
    __tablename__ = "payout_schedules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"))
    member_id = Column(UUID(as_uuid=True), ForeignKey("memberships.id"))
    payout_date = Column(DateTime, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    cycle_number = Column(Integer, nullable=False)
    status = Column(Enum("scheduled", "paid", "missed", name="payout_status"), default="scheduled")
    paid_date = Column(DateTime, nullable=True)
    
    # Relationships
    group = relationship("Group", back_populates="payout_schedules")
    member = relationship("Membership")
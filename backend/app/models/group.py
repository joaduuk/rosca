from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Boolean
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
    contribution_period = Column(String, nullable=False)
    member_count = Column(Integer, nullable=False)
    rosca_type = Column(String, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    currency = Column(String, nullable=False, default="USD")

    # Cycle tracking
    current_cycle = Column(Integer, default=0)
    total_cycles_completed = Column(Integer, default=0)
    #start_date = Column(DateTime, default=datetime.utcnow)
    start_date = Column(DateTime, nullable=True)  # set when Round 1 actually locks, not at creation
    next_payout_date = Column(DateTime, nullable=True)
    total_collected = Column(Float, default=0)
    total_paid_out = Column(Float, default=0)
    is_active = Column(Boolean, default=True)
    is_locked = Column(Boolean, default=False, nullable=False)
    round_number = Column(Integer, default=1, nullable=False)
    round_size = Column(Integer, nullable=True)

    # ── NEW: Cycle lifecycle ──────────────────────────────────────────────
    # Status: active | pending_decision | paused | ended
    group_status = Column(String, default="active", nullable=False)
    # Set by admin at end of cycle: continue | pause | end
    cycle_decision = Column(String, nullable=True)
    # When the decision was made
    cycle_decision_at = Column(DateTime, nullable=True)
    # Free-text reason admin can add when pausing/ending
    cycle_decision_note = Column(String, nullable=True)
    is_archived = Column(Boolean, default=False, nullable=False)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    memberships = relationship("Membership", back_populates="group", cascade="all, delete-orphan")
    contributions = relationship("Contribution", back_populates="group", cascade="all, delete-orphan")
    payout_schedules = relationship("PayoutSchedule", back_populates="group", cascade="all, delete-orphan")

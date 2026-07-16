from sqlalchemy import Column, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base


class Membership(Base):
    __tablename__ = "memberships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"))
    joined_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    payout_order = Column(Integer)
    guarantor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # ── NEW: Offline member fields ──────────────────────────────────────────
    # A membership row no longer requires a registered user_id. An "offline"
    # member is a record-keeping-only entry the admin manages directly —
    # this is a permanent, first-class state, not a pending one.
    # member_status: registered | offline
    member_status = Column(String, default="registered", nullable=False)
    display_name = Column(String, nullable=True)   # used when user_id is NULL
    contact_phone = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)

    # ── NEW: Lifecycle fields ─────────────────────────────────────────────
    # membership_status: active | waitlist | exit_requested | exited
    membership_status = Column(String, default="active", nullable=False)
    # Exit request
    #exit_requested = Column(Boolean, default=False)
    exit_requested = Column(Boolean, default=False, nullable=False)
    exit_requested_at = Column(DateTime, nullable=True)
    exit_reason = Column(String, nullable=True)
    exit_approved = Column(Boolean, nullable=True)   # None=pending, True=approved, False=rejected
    exit_approved_at = Column(DateTime, nullable=True)
    # Waitlist (new members waiting to join next cycle)
    waitlist_requested_at = Column(DateTime, nullable=True)
    waitlist_approved = Column(Boolean, nullable=True)  # None=pending, True=approved, False=rejected
    waitlist_approved_at = Column(DateTime, nullable=True)
    waitlist_note = Column(String, nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    group = relationship("Group", back_populates="memberships")
    guarantor = relationship("User", foreign_keys=[guarantor_id])
    contributions = relationship("Contribution", back_populates="member")

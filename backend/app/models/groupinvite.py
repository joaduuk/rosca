# app/models/groupinvite.py

from sqlalchemy import Column, String, ForeignKey, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.core.database import Base

class GroupInvitation(Base):
    __tablename__ = "group_invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)

    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)

    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    accepted = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
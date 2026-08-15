from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.core.database import Base


class GroupRound(Base):
    __tablename__ = "group_rounds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    round_size = Column(Integer, nullable=False)
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    total_collected = Column(Float, default=0)
    total_paid_out = Column(Float, default=0)
from sqlalchemy import Column, Numeric, DateTime, ForeignKey, Enum, String, Integer  # Add Integer here
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base

class Contribution(Base):
    __tablename__ = "contributions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    membership_id = Column(UUID(as_uuid=True), ForeignKey("memberships.id"))
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"))
    cycle_number = Column(Integer, nullable=False, default=1)  # ADD THIS LINE
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    due_date = Column(DateTime, nullable=False)
    paid_date = Column(DateTime, nullable=True)
    status = Column(Enum("pending", "paid", "late", name="payment_status"), default="pending")
    payment_method = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    exchange_rate = Column(Numeric(10, 4), nullable=True)
    base_currency_amount = Column(Numeric(10, 2), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    member = relationship("Membership", back_populates="contributions")
    group = relationship("Group", back_populates="contributions")
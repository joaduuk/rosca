#C:\proof\rosca\backend\app\routers\contributions.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.membership import Membership
from app.models.contribution import Contribution
from app.models.group import Group
from app.schemas.contribution import ContributionCreate, ContributionResponse, ContributionUpdate

router = APIRouter(prefix="/contributions", tags=["Contributions"])

@router.post("/", response_model=ContributionResponse)
def record_contribution(
    contribution_data: ContributionCreate,  # Use a Pydantic schema instead of individual params
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record a member's contribution"""
    # Verify membership exists and user has permission
    membership = db.query(Membership).filter(
        Membership.id == contribution_data.membership_id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    # Check if user is the member or group admin
    if membership.user_id != current_user.id and not membership.is_admin:
        # Also check if user is group admin
        group_admin = db.query(Membership).filter(
            Membership.group_id == membership.group_id,
            Membership.user_id == current_user.id,
            Membership.is_admin == True
        ).first()
        if not group_admin:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create contribution record
    new_contribution = Contribution(
        membership_id=contribution_data.membership_id,
        group_id=membership.group_id,
        amount=contribution_data.amount,
        currency=contribution_data.currency,
        due_date=contribution_data.due_date,
        paid_date=datetime.utcnow() if contribution_data.status == "paid" else None,
        status=contribution_data.status,
        payment_method=contribution_data.payment_method,
        notes=contribution_data.notes
    )
    
    db.add(new_contribution)
    db.commit()
    db.refresh(new_contribution)
    
    # TODO: Check if all contributions for this cycle are complete
    # If yes, trigger payout
    
    return new_contribution

@router.get("/group/{group_id}", response_model=List[ContributionResponse])
def get_group_contributions(
    group_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all contributions for a group"""
    # Check if user is in group
    membership = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    contributions = db.query(Contribution).filter(
        Contribution.group_id == group_id
    ).offset(skip).limit(limit).all()
    
    return contributions

@router.get("/member/{membership_id}", response_model=List[ContributionResponse])
def get_member_contributions(
    membership_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all contributions for a specific member"""
    membership = db.query(Membership).filter(
        Membership.id == membership_id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    # Check permission
    if membership.user_id != current_user.id:
        # Check if requester is group admin
        admin = db.query(Membership).filter(
            Membership.group_id == membership.group_id,
            Membership.user_id == current_user.id,
            Membership.is_admin == True
        ).first()
        if not admin:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    contributions = db.query(Contribution).filter(
        Contribution.membership_id == membership_id
    ).all()
    
    return contributions

@router.put("/{contribution_id}", response_model=ContributionResponse)
def update_contribution(
    contribution_id: UUID,
    update_data: ContributionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a contribution (mark as paid, change notes, etc.)"""
    contribution = db.query(Contribution).filter(
        Contribution.id == contribution_id
    ).first()
    
    if not contribution:
        raise HTTPException(status_code=404, detail="Contribution not found")
    
    # Check permission (member themselves or group admin)
    membership = db.query(Membership).filter(
        Membership.id == contribution.membership_id
    ).first()
    
    if membership.user_id != current_user.id:
        admin = db.query(Membership).filter(
            Membership.group_id == contribution.group_id,
            Membership.user_id == current_user.id,
            Membership.is_admin == True
        ).first()
        if not admin:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update fields
    for key, value in update_data.dict(exclude_unset=True).items():
        setattr(contribution, key, value)
    
    # If marking as paid, set paid_date
    if update_data.status == "paid" and not contribution.paid_date:
        contribution.paid_date = datetime.utcnow()
    
    db.commit()
    db.refresh(contribution)
    
    return contribution
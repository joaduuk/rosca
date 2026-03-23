# C:\proof\rosca\backend\app\routers\contributions.py

from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
import json

from app.core.database import get_db
from app.core.security import get_current_user
from app.api.dependencies.auth import require_any_user, require_group_admin, check_group_member, check_group_admin_or_super_admin
from app.models.user import User, UserRole
from app.models.group import Group
from app.models.membership import Membership
from app.models.contribution import Contribution
from app.models.payout import PayoutSchedule
from app.schemas.contribution import ContributionCreate, ContributionResponse, ContributionUpdate, PaymentStatus

router = APIRouter(prefix="/groups/{group_id}", tags=["Contributions"])

# ✅ CORRECT WAY: Define a dependency function that takes group_id
# def verify_group_member(
#     group_id: UUID = Path(...),
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Dependency to verify user is a member of the group"""
#     return check_group_member(group_id, current_user, db)

# def verify_group_admin(
#     group_id: UUID = Path(...),
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Dependency to verify user is a group admin or super admin"""
#     return check_group_admin_or_super_admin(group_id, current_user, db)
def verify_group_member(
    group_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return check_group_member(group_id, current_user, db)

def verify_group_admin(
    group_id: UUID = Path(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return check_group_admin_or_super_admin(group_id, current_user, db)

@router.post("/contributions", response_model=ContributionResponse)
def record_contribution(
    group_id: UUID,
    contribution_data: ContributionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_user),
    # ✅ FIX: Use the custom dependency function
    _: bool = Depends(verify_group_admin)
):
    """Record a member's contribution - Only group admins or super admin"""
    
    # Check if group exists
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Verify the member exists
    member = db.query(Membership).filter(
        Membership.id == contribution_data.membership_id,
        Membership.group_id == group_id,
        Membership.is_active == True
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Determine current cycle (use provided or next available)
    current_cycle = contribution_data.cycle_number or (group.current_cycle + 1)
    
    # Check if already contributed this cycle
    existing = db.query(Contribution).filter(
        Contribution.group_id == group_id,
        Contribution.membership_id == contribution_data.membership_id,
        Contribution.cycle_number == current_cycle,
        Contribution.status == "paid"
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Member already contributed for cycle {current_cycle}"
        )
    
    # Create contribution
    contribution = Contribution(
        group_id=group_id,
        membership_id=contribution_data.membership_id,
        cycle_number=current_cycle,
        amount=contribution_data.amount,
        currency=contribution_data.currency,
        due_date=contribution_data.due_date,
        paid_date=datetime.utcnow(),
        status="paid",
        payment_method=contribution_data.payment_method,
        notes=contribution_data.notes
    )
    
    db.add(contribution)
    db.commit()
    db.refresh(contribution)
    
    # Check if all members have paid for this cycle
    total_members = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.is_active == True
    ).count()
    
    paid_this_cycle = db.query(Contribution).filter(
        Contribution.group_id == group_id,
        Contribution.cycle_number == current_cycle,
        Contribution.status == "paid"
    ).count()
    
    # If all paid, process the payout and advance the cycle
    if paid_this_cycle == total_members:
        # Get all active members ordered by payout order
        members = db.query(Membership).filter(
            Membership.group_id == group_id,
            Membership.is_active == True
        ).order_by(Membership.payout_order).all()
        
        # Determine recipient based on ROSCA type
        if group.rosca_type == "fixed":
            # Fixed order - cycle determines who gets paid
            recipient_index = (current_cycle - 1) % len(members)
            recipient = members[recipient_index]
        else:
            # Random or auction - use round-robin based on payout order
            recipient_index = current_cycle % len(members)
            recipient = members[recipient_index]
        
        # Calculate total pool
        total_pool = float(group.contribution_amount * total_members)
        
        # Find or create payout schedule
        payout = db.query(PayoutSchedule).filter(
            PayoutSchedule.group_id == group_id,
            PayoutSchedule.cycle_number == current_cycle
        ).first()
        
        if payout:
            # Update existing payout
            payout.status = "paid"
            payout.paid_date = datetime.utcnow()
            payout.member_id = recipient.id
        else:
            # Create new payout
            payout = PayoutSchedule(
                group_id=group_id,
                member_id=recipient.id,
                cycle_number=current_cycle,
                amount=total_pool,
                payout_date=datetime.utcnow(),
                status="paid",
                paid_date=datetime.utcnow()
            )
            db.add(payout)
        
        # Update group stats
        group.current_cycle = current_cycle
        group.total_cycles_completed = (group.total_cycles_completed or 0) + 1
        group.total_paid_out = (group.total_paid_out or 0) + total_pool
        
        # Calculate next payout date based on contribution period
        if group.contribution_period == "daily":
            group.next_payout_date = datetime.utcnow() + timedelta(days=1)
        elif group.contribution_period == "weekly":
            group.next_payout_date = datetime.utcnow() + timedelta(weeks=1)
        elif group.contribution_period == "monthly":
            group.next_payout_date = datetime.utcnow() + timedelta(days=30)
        else:
            group.next_payout_date = datetime.utcnow() + timedelta(days=7)
        
        db.commit()
        
        # Add payout info to response (for logging/debugging)
        setattr(contribution, 'payout_processed', True)
        setattr(contribution, 'payout_recipient_id', recipient.id)
        setattr(contribution, 'payout_amount', total_pool)
    
    return contribution

@router.get("/contributions", response_model=List[ContributionResponse])
def list_contributions(
    group_id: UUID,
    cycle_number: Optional[int] = None,
    member_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    # ✅ FIX: Use the custom dependency function
    _: bool = Depends(verify_group_member)
):
    """List contributions for a group - Any group member can view"""
    
    query = db.query(Contribution).filter(Contribution.group_id == group_id)
    
    if cycle_number:
        query = query.filter(Contribution.cycle_number == cycle_number)
    if member_id:
        query = query.filter(Contribution.membership_id == member_id)
    
    contributions = query.order_by(
        Contribution.cycle_number.desc(),
        Contribution.due_date
    ).all()
    
    # Enrich with member names
    result = []
    for c in contributions:
        member = db.query(Membership).filter(Membership.id == c.membership_id).first()
        user = db.query(User).filter(User.id == member.user_id).first() if member else None
        
        # Set additional attributes for the response
        c.member_name = user.full_name if user else None
        c.member_email = user.email if user else None
        result.append(c)
    
    return result

@router.get("/cycle-status")
def get_cycle_status(
    group_id: UUID,
    cycle_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    # ✅ FIX: Use the custom dependency function
    _: bool = Depends(verify_group_member)
):
    """Get payment status for a specific cycle - Any group member can view"""
    
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get all members
    members = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.is_active == True
    ).order_by(Membership.payout_order).all()
    
    # Get contributions for this cycle
    contributions = db.query(Contribution).filter(
        Contribution.group_id == group_id,
        Contribution.cycle_number == cycle_number
    ).all()
    
    # Get payout for this cycle
    payout = db.query(PayoutSchedule).filter(
        PayoutSchedule.group_id == group_id,
        PayoutSchedule.cycle_number == cycle_number
    ).first()
    
    # Build status for each member
    member_status = []
    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        contribution = next((c for c in contributions if c.membership_id == member.id), None)
        
        member_status.append({
            "member_id": member.id,
            "user_id": member.user_id,
            "name": user.full_name if user else None,
            "email": user.email if user else None,
            "payout_order": member.payout_order,
            "has_paid": contribution is not None and contribution.status == "paid",
            "paid_date": contribution.paid_date if contribution else None,
            "amount": float(contribution.amount) if contribution else None,
            "currency": contribution.currency if contribution else None,
            "payment_method": contribution.payment_method if contribution else None
        })
    
    # Calculate totals
    total_paid = sum(float(c.amount) for c in contributions if c.status == "paid")
    expected_total = float(group.contribution_amount * len(members))
    paid_count = len([c for c in contributions if c.status == "paid"])
    
    # Determine next payout recipient if cycle is complete
    next_recipient = None
    if paid_count == len(members):
        # Find who should receive this cycle's payout
        if group.rosca_type == "fixed":
            recipient_index = (cycle_number - 1) % len(members)
            next_recipient_member = members[recipient_index]
            recipient_user = db.query(User).filter(User.id == next_recipient_member.user_id).first()
            next_recipient = {
                "member_id": next_recipient_member.id,
                "name": recipient_user.full_name if recipient_user else None,
                "email": recipient_user.email if recipient_user else None
            }
    
    return {
        "group_id": group_id,
        "group_name": group.name,
        "cycle_number": cycle_number,
        "total_members": len(members),
        "paid_count": paid_count,
        "pending_count": len(members) - paid_count,
        "total_paid": float(total_paid),
        "expected_total": float(expected_total),
        "remaining_amount": float(expected_total - total_paid),
        "completion_percentage": (paid_count / len(members)) * 100 if members else 0,
        "payout_status": payout.status if payout else "not_scheduled",
        "payout_date": payout.payout_date if payout else None,
        "next_recipient": next_recipient,
        "members": member_status
    }

@router.get("/payout-schedule")
def get_payout_schedule(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    # ✅ FIX: Use the custom dependency function
    _: bool = Depends(verify_group_member)
):
    """Get all payout schedules for a group - Any group member can view"""
    
    schedules = db.query(PayoutSchedule).filter(
        PayoutSchedule.group_id == group_id
    ).order_by(PayoutSchedule.cycle_number).all()
    
    result = []
    for s in schedules:
        member = db.query(Membership).filter(Membership.id == s.member_id).first()
        user = db.query(User).filter(User.id == member.user_id).first() if member else None
        
        # Get contributions for this cycle
        contributions = db.query(Contribution).filter(
            Contribution.group_id == group_id,
            Contribution.cycle_number == s.cycle_number
        ).all()
        
        result.append({
            "id": s.id,
            "cycle_number": s.cycle_number,
            "payout_date": s.payout_date,
            "amount": float(s.amount),
            "status": s.status,
            "paid_date": s.paid_date,
            "recipient_id": s.member_id,
            "recipient_name": user.full_name if user else None,
            "recipient_email": user.email if user else None,
            "contributions_count": len(contributions),
            "paid_count": len([c for c in contributions if c.status == "paid"]),
            "all_paid": all(c.status == "paid" for c in contributions)
        })
    
    return result

@router.get("/summary")
def get_contribution_summary(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    # ✅ FIX: Use the custom dependency function
    _: bool = Depends(verify_group_member)
):
    """Get contribution summary statistics - Any group member can view"""
    
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get all members
    members = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.is_active == True
    ).all()
    
    # Get all contributions
    all_contributions = db.query(Contribution).filter(
        Contribution.group_id == group_id,
        Contribution.status == "paid"
    ).all()
    
    # Calculate total collected
    total_collected = sum(float(c.amount) for c in all_contributions)
    
    # Get payouts
    payouts = db.query(PayoutSchedule).filter(
        PayoutSchedule.group_id == group_id,
        PayoutSchedule.status == "paid"
    ).all()
    total_paid_out = sum(float(p.amount) for p in payouts)
    
    # Calculate current cycle
    current_cycle = group.current_cycle or 0
    
    # Get current cycle status
    current_cycle_contributions = [c for c in all_contributions if c.cycle_number == current_cycle + 1]
    current_cycle_paid = len(current_cycle_contributions)
    
    # Group by currency
    contributions_by_currency = {}
    for c in all_contributions:
        if c.currency not in contributions_by_currency:
            contributions_by_currency[c.currency] = 0
        contributions_by_currency[c.currency] += float(c.amount)
    
    return {
        "group_id": group_id,
        "group_name": group.name,
        "total_members": len(members),
        "total_cycles_completed": group.total_cycles_completed or 0,
        "current_cycle": current_cycle + 1,
        "current_cycle_paid": current_cycle_paid,
        "current_cycle_pending": len(members) - current_cycle_paid,
        "total_collected": float(total_collected),
        "total_paid_out": float(total_paid_out),
        "balance": float(total_collected - total_paid_out),
        "contributions_by_currency": contributions_by_currency,
        "next_payout_date": group.next_payout_date
    }

@router.post("/process-payout/{cycle_number}")
def process_payout(
    group_id: UUID,
    cycle_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_user),
    # ✅ FIX: Use the custom dependency function
    _: bool = Depends(verify_group_admin)
):
    """Manually process payout for a cycle - Only group admins or super admin"""
    
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get all active members
    members = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.is_active == True
    ).order_by(Membership.payout_order).all()
    
    if not members:
        raise HTTPException(status_code=404, detail="No members in group")
    
    # Determine recipient
    if group.rosca_type == "fixed":
        recipient_index = (cycle_number - 1) % len(members)
    else:
        recipient_index = cycle_number % len(members)
    
    recipient = members[recipient_index]
    recipient_user = db.query(User).filter(User.id == recipient.user_id).first()
    
    # Calculate total pool
    total_pool = float(group.contribution_amount * len(members))
    
    # Create or update payout
    payout = db.query(PayoutSchedule).filter(
        PayoutSchedule.group_id == group_id,
        PayoutSchedule.cycle_number == cycle_number
    ).first()
    
    if payout:
        payout.status = "paid"
        payout.paid_date = datetime.utcnow()
        payout.member_id = recipient.id
    else:
        payout = PayoutSchedule(
            group_id=group_id,
            member_id=recipient.id,
            cycle_number=cycle_number,
            amount=total_pool,
            payout_date=datetime.utcnow(),
            status="paid",
            paid_date=datetime.utcnow()
        )
        db.add(payout)
    
    # Update group stats
    group.current_cycle = cycle_number
    group.total_cycles_completed = (group.total_cycles_completed or 0) + 1
    group.total_paid_out = (group.total_paid_out or 0) + total_pool
    
    db.commit()
    
    return {
        "message": f"Payout for cycle {cycle_number} processed successfully",
        "recipient": recipient_user.full_name if recipient_user else "Unknown",
        "amount": total_pool,
        "recipient_id": recipient.id,
        "cycle": cycle_number
    }
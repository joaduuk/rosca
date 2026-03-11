# code C:\proof\rosca\backend\app\routers\admin.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.group import Group
from app.models.membership import Membership
from app.models.contribution import Contribution
from app.models.payout import PayoutSchedule
from app.schemas.user import UserResponse
from app.schemas.group import GroupResponse

router = APIRouter(prefix="/admin", tags=["Admin"])

# Dependency to check if user is platform admin
def is_platform_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required"
        )
    return current_user

@router.get("/stats")
def get_platform_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(is_platform_admin)
):
    """Get platform-wide statistics for admin dashboard"""
    
    # Basic counts
    total_users = db.query(User).count()
    total_groups = db.query(Group).count()
    total_memberships = db.query(Membership).count()
    
    # Contribution stats
    total_contributions = db.query(func.sum(Contribution.amount)).scalar() or 0
    total_paid_out = db.query(func.sum(PayoutSchedule.amount)).filter(
        PayoutSchedule.status == "paid"
    ).scalar() or 0
    
    # Active today
    today = datetime.utcnow().date()
    tomorrow = today + timedelta(days=1)
    
    active_groups_today = db.query(Group).filter(
        Group.updated_at >= today,
        Group.updated_at < tomorrow
    ).count()
    
    active_users_today = db.query(User).filter(
        User.updated_at >= today,
        User.updated_at < tomorrow
    ).count()
    
    # Recent activity
    recent_contributions = db.query(Contribution).filter(
        Contribution.created_at >= datetime.utcnow() - timedelta(days=7)
    ).count()
    
    return {
        "total_users": total_users,
        "total_groups": total_groups,
        "total_memberships": total_memberships,
        "total_contributions": float(total_contributions),
        "total_paid_out": float(total_paid_out),
        "platform_balance": float(total_contributions - total_paid_out),
        "active_groups_today": active_groups_today,
        "active_users_today": active_users_today,
        "recent_contributions_7d": recent_contributions,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/users", response_model=List[UserResponse])
def list_all_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(is_platform_admin)
):
    """List all users with filtering options"""
    
    query = db.query(User)
    
    if search:
        query = query.filter(
            (User.email.contains(search)) | 
            (User.full_name.contains(search)) |
            (User.phone.contains(search))
        )
    
    if role:
        query = query.filter(User.role == role)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    users = query.offset(skip).limit(limit).all()
    return users

@router.get("/users/{user_id}", response_model=UserResponse)
def get_user_detail(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(is_platform_admin)
):
    """Get detailed information about a specific user"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's groups
    groups = db.query(Group).join(
        Membership, Group.id == Membership.group_id
    ).filter(
        Membership.user_id == user_id,
        Membership.is_active == True
    ).all()
    
    # Get user's contributions
    contributions = db.query(Contribution).join(
        Membership, Contribution.membership_id == Membership.id
    ).filter(
        Membership.user_id == user_id,
        Contribution.status == "paid"
    ).all()
    
    total_contributed = sum(float(c.amount) for c in contributions)
    
    # Enhance response with additional data
    user_dict = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "groups_count": len(groups),
        "total_contributed": float(total_contributed),
        "groups": [{"id": g.id, "name": g.name} for g in groups]
    }
    
    return user_dict

@router.put("/users/{user_id}/suspend")
def suspend_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(is_platform_admin)
):
    """Suspend a user account"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot suspend yourself")
    
    user.is_active = False
    db.commit()
    
    return {"message": f"User {user.email} has been suspended"}

@router.put("/users/{user_id}/activate")
def activate_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(is_platform_admin)
):
    """Activate a suspended user account"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = True
    db.commit()
    
    return {"message": f"User {user.email} has been activated"}

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: UUID,
    role: str,
    db: Session = Depends(get_db),
    admin: User = Depends(is_platform_admin)
):
    """Update a user's role (member, group_admin, admin)"""
    
    if role not in ["member", "group_admin", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'member', 'group_admin', or 'admin'")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == admin.id and role != "admin":
        raise HTTPException(status_code=400, detail="Cannot change your own admin role")
    
    user.role = role
    db.commit()
    
    return {"message": f"User {user.email} role updated to {role}"}

@router.get("/groups", response_model=List[GroupResponse])
def list_all_groups(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(is_platform_admin)
):
    """List all groups with filtering options"""
    
    query = db.query(Group)
    
    if search:
        query = query.filter(
            (Group.name.contains(search)) | 
            (Group.description.contains(search))
        )
    
    if is_active is not None:
        query = query.filter(Group.is_active == is_active)
    
    groups = query.offset(skip).limit(limit).all()
    
    # Enhance with member counts
    result = []
    for group in groups:
        member_count = db.query(Membership).filter(
            Membership.group_id == group.id,
            Membership.is_active == True
        ).count()
        
        group_dict = {
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "contribution_amount": float(group.contribution_amount),
            "contribution_period": group.contribution_period,
            "member_count": group.member_count,
            "current_members": member_count,
            "rosca_type": group.rosca_type,
            "currency": group.currency,
            "created_by": group.created_by,
            "created_at": group.created_at,
            "is_active": group.is_active,
            "current_cycle": group.current_cycle,
            "total_cycles_completed": group.total_cycles_completed
        }
        result.append(group_dict)
    
    return result

@router.get("/groups/{group_id}", response_model=GroupResponse)
def get_group_detail_admin(
    group_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(is_platform_admin)
):
    """Get detailed information about a specific group (admin view)"""
    
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get member details
    members = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.is_active == True
    ).all()
    
    member_details = []
    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        member_details.append({
            "membership_id": member.id,
            "user_id": member.user_id,
            "name": user.full_name if user else None,
            "email": user.email if user else None,
            "is_admin": member.is_admin,
            "payout_order": member.payout_order,
            "joined_at": member.joined_at
        })
    
    # Get contribution summary
    total_collected = db.query(func.sum(Contribution.amount)).filter(
        Contribution.group_id == group_id,
        Contribution.status == "paid"
    ).scalar() or 0
    
    group_dict = {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "contribution_amount": float(group.contribution_amount),
        "contribution_period": group.contribution_period,
        "member_count": group.member_count,
        "rosca_type": group.rosca_type,
        "currency": group.currency,
        "created_by": group.created_by,
        "created_at": group.created_at,
        "updated_at": group.updated_at,
        "is_active": group.is_active,
        "current_cycle": group.current_cycle,
        "total_cycles_completed": group.total_cycles_completed,
        "total_collected": float(total_collected),
        "members": member_details
    }
    
    return group_dict

@router.get("/recent-activity")
def get_recent_activity(
    days: int = 7,
    db: Session = Depends(get_db),
    admin: User = Depends(is_platform_admin)
):
    """Get recent platform activity"""
    
    since_date = datetime.utcnow() - timedelta(days=days)
    
    # New users
    new_users = db.query(User).filter(
        User.created_at >= since_date
    ).count()
    
    # New groups
    new_groups = db.query(Group).filter(
        Group.created_at >= since_date
    ).count()
    
    # Recent contributions
    recent_contributions = db.query(Contribution).filter(
        Contribution.created_at >= since_date
    ).all()
    
    contribution_total = sum(float(c.amount) for c in recent_contributions)
    contribution_count = len(recent_contributions)
    
    # Recent payouts
    recent_payouts = db.query(PayoutSchedule).filter(
        PayoutSchedule.created_at >= since_date
    ).all()
    
    payout_total = sum(float(p.amount) for p in recent_payouts)
    payout_count = len(recent_payouts)
    
    return {
        "period_days": days,
        "since": since_date.isoformat(),
        "new_users": new_users,
        "new_groups": new_groups,
        "contributions": {
            "count": contribution_count,
            "total": float(contribution_total)
        },
        "payouts": {
            "count": payout_count,
            "total": float(payout_total)
        }
    }
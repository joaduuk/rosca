# C:\proof\rosca\backend\app\routers\groups.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.group import Group
from app.schemas.group import GroupCreate, GroupResponse, GroupUpdate

router = APIRouter(prefix="/groups", tags=["Groups"])

@router.post("/", response_model=GroupResponse)
def create_group(
    group_data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new ROSCA group"""
    new_group = Group(
        **group_data.dict(),
        created_by=current_user.id
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    return new_group

@router.get("/", response_model=List[GroupResponse])
def list_groups(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all groups (admin only in production)"""
    groups = db.query(Group).offset(skip).limit(limit).all()
    return groups

@router.get("/{group_id}", response_model=GroupResponse)
def get_group(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get group details by ID"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

@router.put("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: UUID,
    group_data: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update group information"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is group creator or admin
    if group.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for key, value in group_data.dict(exclude_unset=True).items():
        setattr(group, key, value)
    
    db.commit()
    db.refresh(group)
    return group
# Add these to groups.py router

@router.post("/{group_id}/members/{user_id}")
def add_member_to_group(
    group_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a member to a ROSCA group"""
    # Check if group exists and user is admin
    # Create membership record
    # Generate payout order
    pass

@router.get("/{group_id}/members")
def list_group_members(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all members in a group"""
    pass
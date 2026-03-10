from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.group import Group
from app.models.membership import Membership
from app.schemas.group import GroupCreate, GroupResponse, GroupUpdate

router = APIRouter(prefix="/groups", tags=["Groups"])

@router.post("/", response_model=GroupResponse)
def create_group(
    group_data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new ROSCA group and auto-add creator as admin member"""

    # Check for duplicate group name created by the same user
    existing_group = db.query(Group).filter(
        Group.name == group_data.name,
        Group.created_by == current_user.id
    ).first()

    if existing_group:
        raise HTTPException(
            status_code=400,
            detail="You already created a group with this name"
        )

    # Create the group
    new_group = Group(
        **group_data.dict(),
        created_by=current_user.id
    )
    db.add(new_group)
    db.flush()  # Get the group ID without committing

    # Auto-add creator as a member with admin privileges
    creator_membership = Membership(
        user_id=current_user.id,
        group_id=new_group.id,
        is_admin=True,  # Creator is admin
        is_active=True,
        payout_order=1  # First member gets position 1
    )
    db.add(creator_membership)

    # Commit everything
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
    """List all groups where the current user is a member"""
    
    # Get all groups where the user is a member
    groups = db.query(Group).join(
        Membership, Group.id == Membership.group_id
    ).filter(
        Membership.user_id == current_user.id,
        Membership.is_active == True
    ).offset(skip).limit(limit).all()
    
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
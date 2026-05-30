# app/routers/groups.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.api.dependencies.auth import (
    require_authenticated_user,
    check_group_admin_or_super_admin,
    check_group_member,
)
from app.models.user import User
from app.models.group import Group
from app.models.membership import Membership
from app.schemas.group import GroupCreate, GroupResponse, GroupUpdate

router = APIRouter(prefix="/groups", tags=["Groups"])


def group_member_dependency(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return check_group_member(group_id, current_user, db)


def group_admin_dependency(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return check_group_admin_or_super_admin(group_id, current_user, db)


@router.post("/", response_model=GroupResponse)
def create_group(
    group_data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new group and add creator as admin member"""
    existing_group = db.query(Group).filter(
        Group.name == group_data.name,
        Group.created_by == current_user.id
    ).first()
    if existing_group:
        raise HTTPException(status_code=400, detail="You already created a group with this name")

    new_group = Group(**group_data.dict(), created_by=current_user.id)
    db.add(new_group)
    db.flush()

    creator_membership = Membership(
        user_id=current_user.id,
        group_id=new_group.id,
        is_admin=True,
        is_active=True,
        payout_order=1
    )
    db.add(creator_membership)
    db.commit()
    db.refresh(new_group)
    return new_group


@router.get("/", response_model=List[GroupResponse])
def list_groups(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_authenticated_user)
):
    """List all groups where the current user is a member"""
    groups = db.query(Group).join(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.is_active == True
    ).offset(skip).limit(limit).all()
    return groups


@router.get("/{group_id}", response_model=GroupResponse)
def get_group(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(group_member_dependency)
):
    """Get group details by ID - Only members can view"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


@router.put("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: UUID,
    group_data: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(group_admin_dependency)
):
    """Update group information - Only admins or super admin"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    for key, value in group_data.dict(exclude_unset=True).items():
        setattr(group, key, value)

    db.commit()
    db.refresh(group)
    return group


@router.delete("/{group_id}")
def delete_group(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(group_admin_dependency)
):
    """Soft delete a group - Only admins or super admin"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    group.is_active = False
    db.commit()
    return {"message": "Group deactivated successfully"}

# C:\proof\rosca\backend\app\routers\groups.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.group import Group
from app.models.membership import Membership
from app.schemas.group import GroupCreate, GroupResponse, GroupUpdate
from app.api.dependencies.auth import (
    require_group_admin,
    require_any_user,
    check_group_admin_or_super_admin,
    check_group_member,
)

router = APIRouter(prefix="/groups", tags=["Groups"])


# --------------------
# Helper dependencies
# --------------------
def require_group_admin_or_super_admin(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ensure the user is group admin or super admin for a specific group"""
    return check_group_admin_or_super_admin(group_id=group_id, current_user=current_user, db=db)


def require_group_member_dependency(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ensure the user is a member of the group"""
    return check_group_member(group_id=group_id, current_user=current_user, db=db)


# --------------------
# Group CRUD
# --------------------
@router.post("/", response_model=GroupResponse)
def create_group(
    group_data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_group_admin),  # GROUP_ADMIN or SUPER_ADMIN
):
    """Create a new ROSCA group and auto-add creator as admin member"""
    existing_group = db.query(Group).filter(
        Group.name == group_data.name,
        Group.created_by == current_user.id
    ).first()
    if existing_group:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already created a group with this name",
        )

    new_group = Group(**group_data.dict(), created_by=current_user.id)
    db.add(new_group)
    db.flush()  # Get ID without committing

    # Add creator as admin member
    creator_membership = Membership(
        user_id=current_user.id,
        group_id=new_group.id,
        is_admin=True,
        is_active=True,
        payout_order=1,
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
    current_user: User = Depends(require_any_user),  # Any authenticated user
):
    """List all groups where the current user is a member"""
    groups = (
        db.query(Group)
        .join(Membership, Group.id == Membership.group_id)
        .filter(Membership.user_id == current_user.id, Membership.is_active == True)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return groups


@router.get("/{group_id}", response_model=GroupResponse)
def get_group(
    group_id: UUID,
    _: bool = Depends(require_group_member_dependency),  # Must be a member
    db: Session = Depends(get_db),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return group


@router.put("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: UUID,
    group_data: GroupUpdate,
    _: bool = Depends(require_group_admin_or_super_admin),  # Must be admin/super admin
    db: Session = Depends(get_db),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    for key, value in group_data.dict(exclude_unset=True).items():
        setattr(group, key, value)
    db.commit()
    db.refresh(group)
    return group


@router.delete("/{group_id}")
def delete_group(
    group_id: UUID,
    _: bool = Depends(require_group_admin_or_super_admin),  # Must be admin/super admin
    db: Session = Depends(get_db),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    group.is_active = False  # Soft delete
    db.commit()
    return {"message": "Group deactivated successfully"}


# --------------------
# Member Management
# --------------------
@router.post("/{group_id}/members/{user_id}")
def add_member_to_group(
    group_id: UUID,
    user_id: UUID,
    is_admin: bool = False,
    _: bool = Depends(require_group_admin_or_super_admin),  # Only admin/super admin
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == user_id
    ).first()

    if existing:
        if existing.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a member")
        else:
            existing.is_active = True
            existing.is_admin = is_admin
            db.commit()
            return {"message": "Member reactivated successfully"}

    max_order = db.query(Membership).filter(Membership.group_id == group_id).count()
    membership = Membership(
        user_id=user_id,
        group_id=group_id,
        is_admin=is_admin,
        is_active=True,
        payout_order=max_order + 1,
    )
    db.add(membership)
    db.commit()
    return {"message": "Member added successfully"}


@router.delete("/{group_id}/members/{user_id}")
def remove_member_from_group(
    group_id: UUID,
    user_id: UUID,
    _: bool = Depends(require_group_admin_or_super_admin),  # Only admin/super admin
    db: Session = Depends(get_db),
):
    membership = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == user_id,
        Membership.is_active == True
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")

    if membership.is_admin:
        admin_count = db.query(Membership).filter(
            Membership.group_id == group_id,
            Membership.is_admin == True,
            Membership.is_active == True
        ).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last admin. Promote another member first."
            )

    membership.is_active = False
    db.commit()
    return {"message": "Member removed successfully"}


@router.put("/{group_id}/members/{user_id}/toggle-admin")
def toggle_member_admin(
    group_id: UUID,
    user_id: UUID,
    _: bool = Depends(require_group_admin_or_super_admin),  # Only admin/super admin
    db: Session = Depends(get_db),
):
    membership = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == user_id,
        Membership.is_active == True
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")

    membership.is_admin = not membership.is_admin
    db.commit()
    status_text = "granted" if membership.is_admin else "revoked"
    return {"message": f"Admin privileges {status_text} successfully"}
# backend/app/routers/members.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.models.user import User
from app.models.group import Group
from app.models.membership import Membership
from app.schemas.membership import MembershipCreate, MembershipResponse, MembershipUpdate
from app.core.notifications import notify_member_joined

router = APIRouter(prefix="/groups", tags=["Members"])


@router.post(
    "/{group_id}/members/{user_id}",
    response_model=MembershipResponse,
    operation_id="add_member_to_group"
)
def add_member_to_group(
    group_id: UUID,
    user_id: UUID,
    is_admin: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a member to a ROSCA group"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    is_creator = str(group.created_by) == str(current_user.id)
    is_group_admin = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
        Membership.is_admin == True
    ).first()

    if not (is_creator or is_group_admin or current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to add members")

    existing = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == user_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this group")

    current_members = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.is_active == True
    ).count()

    if current_members >= group.member_count:
        raise HTTPException(status_code=400, detail="Group has reached maximum member count")

    new_member = Membership(
        user_id=user_id,
        group_id=group_id,
        is_admin=is_admin,
        payout_order=current_members + 1
    )

    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    # Notify all group members
    try:
        notify_member_joined(
            db=db,
            group_id=group_id,
            group_name=group.name,
            new_member_name=user.full_name,
            new_member_user_id=str(user_id),
        )
    except Exception as e:
        print(f"[NOTIFY] member_joined failed: {e}")

    return new_member


@router.get(
    "/{group_id}/members",
    response_model=List[MembershipResponse],
    operation_id="list_group_members"
)
def list_group_members(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all members in a group with their details"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    is_member = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id
    ).first()

    if not is_member and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not a member of this group")

    members = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.is_active == True
    ).order_by(Membership.payout_order).all()

    result = []
    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        guarantor = None
        if member.guarantor_id:
            guarantor = db.query(User).filter(User.id == member.guarantor_id).first()

        member_dict = {
            "id": member.id,
            "user_id": member.user_id,
            "group_id": member.group_id,
            "joined_at": member.joined_at,
            "is_active": member.is_active,
            "is_admin": member.is_admin,
            "payout_order": member.payout_order,
            "guarantor_id": member.guarantor_id,
            "user_email": user.email if user else None,
            "user_name": user.full_name if user else None,
            "guarantor_email": guarantor.email if guarantor else None,
            "guarantor_name": guarantor.full_name if guarantor else None
        }
        result.append(MembershipResponse(**member_dict))

    return result


@router.delete(
    "/{group_id}/members/{user_id}",
    operation_id="remove_member_from_group"
)
def remove_member_from_group(
    group_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a member from a group (soft delete)"""
    membership = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == user_id,
        Membership.is_active == True
    ).first()

    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    is_creator = db.query(Group).filter(
        Group.id == group_id,
        Group.created_by == current_user.id
    ).first()

    is_group_admin = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
        Membership.is_admin == True
    ).first()

    if not (is_creator or is_group_admin or current_user.role == "admin" or str(current_user.id) == str(user_id)):
        raise HTTPException(status_code=403, detail="Not authorized to remove members")

    membership.is_active = False
    db.commit()

    return {"message": "Member removed successfully"}


@router.put(
    "/{group_id}/members/{user_id}/reorder",
    operation_id="reorder_member_payout"
)
def reorder_member_payout(
    group_id: UUID,
    user_id: UUID,
    direction: str,  # "up" or "down"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Move a member up or down in payout order - Only group admins"""
    is_group_admin = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
        Membership.is_admin == True
    ).first()

    if not is_group_admin and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to reorder members")

    # Get all active members sorted by current payout_order
    members = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.is_active == True
    ).order_by(Membership.payout_order).all()

    target = next((m for m in members if str(m.user_id) == str(user_id)), None)
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    current_index = members.index(target)

    if direction == "up":
        if current_index == 0:
            raise HTTPException(status_code=400, detail="Member is already first")
        swap_with = members[current_index - 1]
    elif direction == "down":
        if current_index == len(members) - 1:
            raise HTTPException(status_code=400, detail="Member is already last")
        swap_with = members[current_index + 1]
    else:
        raise HTTPException(status_code=400, detail="Direction must be 'up' or 'down'")

    # Swap the payout orders
    target.payout_order, swap_with.payout_order = swap_with.payout_order, target.payout_order
    db.commit()

    return {"message": f"Member moved {direction} successfully"}


@router.put(
    "/members/{membership_id}/guarantor",
    response_model=MembershipResponse,
    operation_id="set_guarantor_for_member"
)
def set_guarantor(
    membership_id: UUID,
    guarantor_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Set a guarantor for a member"""
    membership = db.query(Membership).filter(
        Membership.id == membership_id,
        Membership.is_active == True
    ).first()

    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    guarantor = db.query(Membership).filter(
        Membership.user_id == guarantor_id,
        Membership.group_id == membership.group_id,
        Membership.is_active == True
    ).first()

    if not guarantor:
        raise HTTPException(status_code=404, detail="Guarantor not found in this group")

    if membership.user_id != current_user.id:
        is_admin = db.query(Membership).filter(
            Membership.group_id == membership.group_id,
            Membership.user_id == current_user.id,
            Membership.is_admin == True
        ).first()

        if not is_admin and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")

    membership.guarantor_id = guarantor_id
    db.commit()
    db.refresh(membership)

    return membership

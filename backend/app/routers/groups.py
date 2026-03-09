from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
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

# ================ MEMBER MANAGEMENT ENDPOINTS ================

@router.post("/{group_id}/members/{user_id}")
def add_member_to_group(
    group_id: UUID,
    user_id: UUID,
    is_admin: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a member to a ROSCA group"""
    
    # Check if group exists
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check permission (only group admins can add members)
    is_group_admin = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
        Membership.is_admin == True,
        Membership.is_active == True
    ).first()
    
    if not is_group_admin and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only group admins can add members")
    
    # Check if user is already a member
    existing = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == user_id,
        Membership.is_active == True
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User is already an active member")
    
    # Check group capacity
    current_members = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.is_active == True
    ).count()
    
    if current_members >= group.member_count:
        raise HTTPException(status_code=400, detail="Group has reached maximum capacity")
    
    # Create membership
    new_member = Membership(
        user_id=user_id,
        group_id=group_id,
        is_admin=is_admin,
        is_active=True,
        payout_order=current_members + 1  # Simple sequential order
    )
    
    db.add(new_member)
    db.commit()
    
    return {
        "message": "Member added successfully",
        "membership_id": new_member.id,
        "user_email": user.email,
        "user_name": user.full_name,
        "payout_order": new_member.payout_order
    }

@router.get("/{group_id}/members")
def list_group_members(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all members in a group with their details"""
    
    # Check if group exists
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is a member (for privacy)
    is_member = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
        Membership.is_active == True
    ).first()
    
    if not is_member and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Get all members with user details
    members = db.query(
        Membership, User.email, User.full_name, User.phone
    ).join(
        User, User.id == Membership.user_id
    ).filter(
        Membership.group_id == group_id,
        Membership.is_active == True
    ).order_by(Membership.payout_order).all()
    
    result = []
    for membership, email, full_name, phone in members:
        # Get guarantor info if exists
        guarantor_info = None
        if membership.guarantor_id:
            guarantor = db.query(User).filter(
                User.id == membership.guarantor_id
            ).first()
            if guarantor:
                guarantor_info = {
                    "id": str(guarantor.id),
                    "name": guarantor.full_name,
                    "email": guarantor.email
                }
        
        result.append({
            "membership_id": str(membership.id),
            "user_id": str(membership.user_id),
            "email": email,
            "name": full_name,
            "phone": phone,
            "is_admin": membership.is_admin,
            "joined_at": membership.joined_at.isoformat() if membership.joined_at else None,
            "payout_order": membership.payout_order,
            "guarantor": guarantor_info
        })
    
    return result

@router.delete("/{group_id}/members/{user_id}")
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
        raise HTTPException(status_code=404, detail="Active membership not found")
    
    # Check permission
    is_group_admin = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
        Membership.is_admin == True,
        Membership.is_active == True
    ).first()
    
    # Users can remove themselves, admins can remove anyone
    if not (is_group_admin or str(current_user.id) == str(user_id) or current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to remove members")
    
    # Don't allow removing the last admin
    if membership.is_admin and str(current_user.id) != str(user_id):
        # Count other admins
        other_admins = db.query(Membership).filter(
            Membership.group_id == group_id,
            Membership.user_id != user_id,
            Membership.is_admin == True,
            Membership.is_active == True
        ).count()
        
        if other_admins == 0:
            raise HTTPException(status_code=400, detail="Cannot remove the last admin")
    
    # Soft delete
    membership.is_active = False
    db.commit()
    
    return {"message": "Member removed successfully"}

@router.put("/members/{membership_id}/guarantor")
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
    
    # Check if guarantor exists and is in the same group
    guarantor = db.query(Membership).filter(
        Membership.user_id == guarantor_id,
        Membership.group_id == membership.group_id,
        Membership.is_active == True
    ).first()
    
    if not guarantor:
        raise HTTPException(status_code=404, detail="Guarantor not found in this group")
    
    # Check permission (member themselves or admin)
    is_group_admin = db.query(Membership).filter(
        Membership.group_id == membership.group_id,
        Membership.user_id == current_user.id,
        Membership.is_admin == True,
        Membership.is_active == True
    ).first()
    
    if not (is_group_admin or str(membership.user_id) == str(current_user.id) or current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    membership.guarantor_id = guarantor_id
    db.commit()
    
    return {"message": "Guarantor set successfully"}

@router.post("/{group_id}/invite")
def invite_member(
    group_id: UUID,
    email: str = None,
    phone: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Invite a user to join a group via email or phone"""

    if not email and not phone:
        raise HTTPException(status_code=400, detail="Email or phone required")

    # Check admin permission
    admin = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
        Membership.is_admin == True,
        Membership.is_active == True
    ).first()

    if not admin:
        raise HTTPException(status_code=403, detail="Only admins can invite members")

    invitation = GroupInvitation(
        group_id=group_id,
        email=email,
        phone=phone,
        invited_by=current_user.id
    )

    db.add(invitation)
    db.commit()

    return {"message": "Invitation sent"}

@router.post("/invitations/{invite_id}/accept")
def accept_invite(
    invite_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invite = db.query(GroupInvitation).filter(
        GroupInvitation.id == invite_id
    ).first()

    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invite.accepted:
        raise HTTPException(status_code=400, detail="Invitation already accepted")

    membership = Membership(
        user_id=current_user.id,
        group_id=invite.group_id,
        is_admin=False,
        is_active=True
    )

    invite.accepted = True

    db.add(membership)
    db.commit()

    return {"message": "Joined group successfully"}
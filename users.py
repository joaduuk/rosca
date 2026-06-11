# backend/app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import os, shutil, uuid

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.api.dependencies.auth import get_current_user
from app.models.user import User
from app.models.membership import Membership
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])

UPLOAD_DIR = "uploads/avatars"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/me", response_model=dict)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's full profile including groups and introducer info."""
    memberships = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.is_active == True
    ).all()

    groups_info = []
    for m in memberships:
        from app.models.group import Group
        group = db.query(Group).filter(Group.id == m.group_id).first()
        guarantor = db.query(User).filter(User.id == m.guarantor_id).first() if m.guarantor_id else None
        groups_info.append({
            "group_id": str(m.group_id),
            "group_name": group.name if group else None,
            "payout_order": m.payout_order,
            "is_admin": m.is_admin,
            "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            "guarantor_id": str(m.guarantor_id) if m.guarantor_id else None,
            "guarantor_name": guarantor.full_name if guarantor else None,
            "guarantor_email": guarantor.email if guarantor else None,
        })

    # People this user is guaranteeing
    guaranteeing = db.query(Membership).filter(
        Membership.guarantor_id == current_user.id,
        Membership.is_active == True
    ).all()
    guaranteeing_info = []
    for m in guaranteeing:
        member = db.query(User).filter(User.id == m.user_id).first()
        group = db.query(Group).filter(Group.id == m.group_id).first() if m.group_id else None
        guaranteeing_info.append({
            "membership_id": str(m.id),
            "member_name": member.full_name if member else None,
            "member_email": member.email if member else None,
            "group_name": group.name if group else None,
            "group_id": str(m.group_id) if m.group_id else None,
        })

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "avatar_url": current_user.avatar_url if hasattr(current_user, 'avatar_url') else None,
        "invite_code": current_user.invite_code if hasattr(current_user, 'invite_code') else None,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "groups": groups_info,
        "guaranteeing": guaranteeing_info,
    }


@router.put("/me", response_model=dict)
def update_my_profile(
    full_name: Optional[str] = None,
    phone: Optional[str] = None,
    current_password: Optional[str] = None,
    new_password: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile."""
    if full_name:
        current_user.full_name = full_name
    if phone:
        current_user.phone = phone

    if new_password:
        if not current_password:
            raise HTTPException(status_code=400, detail="Current password required to set new password")
        if not verify_password(current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        if len(new_password) < 8:
            raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
        current_user.hashed_password = get_password_hash(new_password)

    db.commit()
    db.refresh(current_user)
    return {"message": "Profile updated successfully"}


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a profile photo."""
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WEBP or GIF images allowed")

    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large — max 5MB")

    ext = file.filename.split(".")[-1].lower()
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Delete old avatar
    if hasattr(current_user, 'avatar_url') and current_user.avatar_url:
        old_path = current_user.avatar_url.lstrip("/")
        if os.path.exists(old_path):
            os.remove(old_path)

    avatar_url = f"/uploads/avatars/{filename}"
    if hasattr(current_user, 'avatar_url'):
        current_user.avatar_url = avatar_url
    db.commit()

    return {"avatar_url": avatar_url, "message": "Avatar uploaded successfully"}


@router.get("/", response_model=List[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(User)
    if search:
        query = query.filter(
            (User.email.contains(search)) |
            (User.full_name.contains(search))
        )
    return query.offset(skip).limit(limit).all()


@router.get("/lookup")
def lookup_user_by_invite_code(
    invite_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Look up a user by their invite code. Returns only safe public info — no email exposed."""
    user = db.query(User).filter(
        User.invite_code == invite_code.upper().strip(),
        User.is_active == True
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user found with that invite code")
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "avatar_url": user.avatar_url if hasattr(user, 'avatar_url') else None,
    }


@router.get("/search")
def search_users_by_email(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Kept for internal/admin use only — not exposed in UI
    users = db.query(User).filter(User.email.ilike(f"%{email}%")).limit(10).all()
    return [{"id": str(u.id), "full_name": u.full_name} for u in users]  # email removed from response

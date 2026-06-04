# backend/app/routers/members.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user
from app.models.user import User
from app.models.group import Group
from app.models.membership import Membership
from app.schemas.membership import MembershipResponse
from app.core.notifications import notify_member_joined
from app.core.email import _send_email
import os

router = APIRouter(prefix="/groups", tags=["Members"])
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
APP_NAME = os.getenv("APP_NAME", "ROSCA")


def _notify_guarantor_assigned(guarantor: User, member: User, group_name: str):
    """Email the guarantor informing them they are now guaranteeing this member."""
    subject = f"{APP_NAME} — You are now a Guarantor"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:24px;border-radius:10px 10px 0 0;text-align:center">
        <h1 style="color:white;margin:0">🔄 {APP_NAME}</h1>
      </div>
      <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 10px 10px">
        <h2 style="color:#1f2937">You have been assigned as a Guarantor</h2>
        <p style="color:#4b5563">Hi <strong>{guarantor.full_name}</strong>,</p>
        <p style="color:#4b5563">
          You have been assigned as the <strong>guarantor/introducer</strong> for
          <strong>{member.full_name}</strong> ({member.email}) in the group <strong>{group_name}</strong>.
        </p>
        <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0;color:#854d0e;font-weight:600">⚠️ What this means:</p>
          <ul style="color:#92400e;margin:8px 0">
            <li>You are vouching for this member's participation and reliability</li>
            <li>You are responsible for encouraging them to meet their contribution obligations</li>
            <li>Your role as guarantor is recorded and visible to group admins</li>
          </ul>
        </div>
        <p style="color:#4b5563">
          If you have concerns about this assignment, please contact your group admin or
          log in to request a review.
        </p>
        <a href="{FRONTEND_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">
          View Dashboard
        </a>
      </div>
    </div>"""
    try:
        _send_email(guarantor.email, subject, html)
    except Exception as e:
        print(f"[EMAIL] Guarantor notification failed: {e}")


@router.post("/{group_id}/members/{user_id}", response_model=MembershipResponse, operation_id="add_member_to_group")
def add_member_to_group(
    group_id: UUID,
    user_id: UUID,
    guarantor_user_id: UUID,          # Required — must be an existing group member
    is_admin: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a member to a group. A guarantor (existing member) is required."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check admin permission
    is_group_admin = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
        Membership.is_admin == True
    ).first()
    if not (is_group_admin or current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to add members")

    # Check guarantor is an active member of this group
    guarantor_membership = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == guarantor_user_id,
        Membership.is_active == True
    ).first()
    if not guarantor_membership:
        raise HTTPException(status_code=400, detail="Guarantor must be an existing active member of this group")

    guarantor_user = db.query(User).filter(User.id == guarantor_user_id).first()
    if not guarantor_user:
        raise HTTPException(status_code=404, detail="Guarantor user not found")

    # Check not already a member
    existing = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this group")

    # Check capacity
    current_count = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.is_active == True
    ).count()
    if current_count >= group.member_count:
        raise HTTPException(status_code=400, detail="Group has reached maximum member count")

    new_member = Membership(
        user_id=user_id,
        group_id=group_id,
        is_admin=is_admin,
        payout_order=current_count + 1,
        guarantor_id=guarantor_user_id
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    # Notify all group members
    try:
        notify_member_joined(db=db, group_id=group_id, group_name=group.name,
                             new_member_name=user.full_name, new_member_user_id=str(user_id))
    except Exception as e:
        print(f"[NOTIFY] member_joined failed: {e}")

    # Notify the guarantor via email
    _notify_guarantor_assigned(guarantor_user, user, group.name)

    # Enrich response
    new_member.user_email = user.email
    new_member.user_name = user.full_name
    new_member.guarantor_email = guarantor_user.email
    new_member.guarantor_name = guarantor_user.full_name
    return new_member


@router.get("/{group_id}/members", response_model=List[MembershipResponse], operation_id="list_group_members")
def list_group_members(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        guarantor = db.query(User).filter(User.id == m.guarantor_id).first() if m.guarantor_id else None
        result.append(MembershipResponse(
            id=m.id, user_id=m.user_id, group_id=m.group_id,
            joined_at=m.joined_at, is_active=m.is_active, is_admin=m.is_admin,
            payout_order=m.payout_order, guarantor_id=m.guarantor_id,
            user_email=user.email if user else None,
            user_name=user.full_name if user else None,
            guarantor_email=guarantor.email if guarantor else None,
            guarantor_name=guarantor.full_name if guarantor else None,
        ))
    return result


@router.delete("/{group_id}/members/{user_id}", operation_id="remove_member_from_group")
def remove_member_from_group(
    group_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    membership = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == user_id,
        Membership.is_active == True
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    is_group_admin = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
        Membership.is_admin == True
    ).first()
    if not (is_group_admin or current_user.role == "admin" or str(current_user.id) == str(user_id)):
        raise HTTPException(status_code=403, detail="Not authorized")

    membership.is_active = False
    db.commit()
    return {"message": "Member removed successfully"}


@router.put("/{group_id}/members/{user_id}/reorder", operation_id="reorder_member_payout")
def reorder_member_payout(
    group_id: UUID,
    user_id: UUID,
    direction: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    is_group_admin = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
        Membership.is_admin == True
    ).first()
    if not is_group_admin and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    members = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.is_active == True
    ).order_by(Membership.payout_order).all()

    target = next((m for m in members if str(m.user_id) == str(user_id)), None)
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    idx = members.index(target)
    if direction == "up":
        if idx == 0:
            raise HTTPException(status_code=400, detail="Already first")
        swap = members[idx - 1]
    elif direction == "down":
        if idx == len(members) - 1:
            raise HTTPException(status_code=400, detail="Already last")
        swap = members[idx + 1]
    else:
        raise HTTPException(status_code=400, detail="Direction must be up or down")

    target.payout_order, swap.payout_order = swap.payout_order, target.payout_order
    db.commit()
    return {"message": f"Member moved {direction}"}


@router.post("/{group_id}/members/{user_id}/request-guarantor-removal")
def request_guarantor_removal(
    group_id: UUID,
    user_id: UUID,
    reason: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    A guarantor can request to be removed from their guarantor role.
    Admin is notified — the member must get a new guarantor first.
    """
    membership = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == user_id,
        Membership.is_active == True
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    if str(membership.guarantor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="You are not the guarantor for this member")

    # Notify group admins
    admins = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.is_admin == True,
        Membership.is_active == True
    ).all()

    member = db.query(User).filter(User.id == user_id).first()
    group = db.query(Group).filter(Group.id == group_id).first()

    for admin_m in admins:
        admin_user = db.query(User).filter(User.id == admin_m.user_id).first()
        if admin_user:
            subject = f"{APP_NAME} — Guarantor Removal Request"
            html = f"""
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
              <h2 style="color:#1f2937">Guarantor Removal Request</h2>
              <p><strong>{current_user.full_name}</strong> has requested to be removed as guarantor
              for <strong>{member.full_name if member else 'a member'}</strong>
              in group <strong>{group.name if group else ''}</strong>.</p>
              {"<p>Reason: " + reason + "</p>" if reason else ""}
              <p style="color:#dc2626">⚠️ This member must be assigned a new guarantor before the request can be approved.</p>
              <a href="{FRONTEND_URL}/dashboard" style="background:#667eea;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">
                Manage Group
              </a>
            </div>"""
            try:
                _send_email(admin_user.email, subject, html)
            except Exception as e:
                print(f"[EMAIL] Admin notify failed: {e}")

    return {"message": "Removal request sent to group admin. A new guarantor must be assigned before this can be processed."}


@router.put("/{group_id}/members/{user_id}/change-guarantor")
def change_guarantor(
    group_id: UUID,
    user_id: UUID,
    new_guarantor_user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin reassigns a member's guarantor."""
    is_group_admin = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
        Membership.is_admin == True
    ).first()
    if not is_group_admin and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    membership = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == user_id,
        Membership.is_active == True
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    new_guarantor_membership = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == new_guarantor_user_id,
        Membership.is_active == True
    ).first()
    if not new_guarantor_membership:
        raise HTTPException(status_code=400, detail="New guarantor must be an active member of this group")

    new_guarantor = db.query(User).filter(User.id == new_guarantor_user_id).first()
    member = db.query(User).filter(User.id == user_id).first()
    group = db.query(Group).filter(Group.id == group_id).first()

    membership.guarantor_id = new_guarantor_user_id
    db.commit()

    if new_guarantor and member and group:
        _notify_guarantor_assigned(new_guarantor, member, group.name)

    return {"message": f"Guarantor updated to {new_guarantor.full_name if new_guarantor else 'new member'}"}

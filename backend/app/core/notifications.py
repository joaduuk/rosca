# backend/app/core/notifications.py
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import asyncio

from app.models.notification import Notification
from app.models.membership import Membership
from app.models.user import User
from app.core.websocket_manager import ws_manager
from app.core.email import _send_email
import os

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
APP_NAME = os.getenv("APP_NAME", "ROSCA")


def _get_group_member_user_ids(group_id: UUID, db: Session) -> List[str]:
    """Return list of user_id strings for all active, registered members of
    a group. Offline members (no user_id) have nothing to notify, so
    they're excluded here."""
    memberships = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.is_active == True,
        Membership.user_id.isnot(None)
    ).all()
    return [str(m.user_id) for m in memberships]


def _save_and_push(
    db: Session,
    user_ids: List[str],
    group_id: Optional[UUID],
    notif_type: str,
    title: str,
    message: str,
):
    """Save notification to DB for each user and push via WebSocket."""
    notifications = []
    for uid in user_ids:
        n = Notification(
            user_id=uid,
            group_id=group_id,
            type=notif_type,
            title=title,
            message=message,
        )
        db.add(n)
        notifications.append((uid, n))

    db.commit()

    # Push via WebSocket (fire and forget)
    for uid, n in notifications:
        payload = {
            "id": str(n.id),
            "type": n.type,
            "title": n.title,
            "message": n.message,
            "group_id": str(n.group_id) if n.group_id else None,
            "created_at": n.created_at.isoformat(),
            "is_read": False,
        }
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(ws_manager.send_to_user(uid, payload))
            else:
                loop.run_until_complete(ws_manager.send_to_user(uid, payload))
        except Exception as e:
            print(f"[WS] Push failed for {uid}: {e}")


def _send_email_to_members(db: Session, user_ids: List[str], subject: str, html: str):
    """Send email to all users in the list."""
    for uid in user_ids:
        user = db.query(User).filter(User.id == uid).first()
        if user and user.email:
            try:
                _send_email(user.email, subject, html)
            except Exception as e:
                print(f"[EMAIL] Failed to send to {user.email}: {e}")


# ─────────────────────────────────────────────────────────
# Event: Contribution Recorded
# ─────────────────────────────────────────────────────────
def notify_contribution_paid(
    db: Session,
    group_id: UUID,
    group_name: str,
    member_name: str,
    amount: float,
    currency: str,
    cycle_number: int,
):
    user_ids = _get_group_member_user_ids(group_id, db)
    title = f"💰 Payment Received — {group_name}"
    message = f"{member_name} paid {currency} {amount:,.2f} for Cycle #{cycle_number}."

    _save_and_push(db, user_ids, group_id, "contribution_paid", title, message)

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:24px;border-radius:10px 10px 0 0;text-align:center">
        <h1 style="color:white;margin:0">🔄 {APP_NAME}</h1>
      </div>
      <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 10px 10px">
        <h2 style="color:#1f2937">💰 Contribution Received</h2>
        <p style="color:#4b5563"><strong>{member_name}</strong> has paid their contribution for <strong>{group_name}</strong>.</p>
        <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0;color:#374151">Amount: <strong>{currency} {amount:,.2f}</strong></p>
          <p style="margin:4px 0 0;color:#374151">Cycle: <strong>#{cycle_number}</strong></p>
        </div>
        <a href="{FRONTEND_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">View Dashboard</a>
      </div>
    </div>"""
    _send_email_to_members(db, user_ids, title, html)


# ─────────────────────────────────────────────────────────
# Event: Payout Processed
# ─────────────────────────────────────────────────────────
def notify_payout_processed(
    db: Session,
    group_id: UUID,
    group_name: str,
    recipient_name: str,
    amount: float,
    currency: str,
    cycle_number: int,
):
    user_ids = _get_group_member_user_ids(group_id, db)
    title = f"🎉 Payout Processed — {group_name}"
    message = f"{recipient_name} received {currency} {amount:,.2f} for Cycle #{cycle_number}."

    _save_and_push(db, user_ids, group_id, "payout_processed", title, message)

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:24px;border-radius:10px 10px 0 0;text-align:center">
        <h1 style="color:white;margin:0">🔄 {APP_NAME}</h1>
      </div>
      <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 10px 10px">
        <h2 style="color:#1f2937">🎉 Payout Processed!</h2>
        <p style="color:#4b5563">Great news! The Cycle #{cycle_number} payout for <strong>{group_name}</strong> has been processed.</p>
        <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0;color:#374151">Recipient: <strong>{recipient_name}</strong></p>
          <p style="margin:4px 0 0;color:#374151">Amount: <strong>{currency} {amount:,.2f}</strong></p>
          <p style="margin:4px 0 0;color:#374151">Cycle: <strong>#{cycle_number}</strong></p>
        </div>
        <a href="{FRONTEND_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">View Dashboard</a>
      </div>
    </div>"""
    _send_email_to_members(db, user_ids, title, html)


# ─────────────────────────────────────────────────────────
# Event: Member Joined
# ─────────────────────────────────────────────────────────
def notify_member_joined(
    db: Session,
    group_id: UUID,
    group_name: str,
    new_member_name: str,
    new_member_user_id: Optional[str] = None,
):
    user_ids = _get_group_member_user_ids(group_id, db)
    title = f"👋 New Member — {group_name}"
    message = f"{new_member_name} has joined the group."

    _save_and_push(db, user_ids, group_id, "member_joined", title, message)

    # Only email existing members (not the new member themselves — they get welcome email)
    existing_ids = [uid for uid in user_ids if uid != new_member_user_id]
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:24px;border-radius:10px 10px 0 0;text-align:center">
        <h1 style="color:white;margin:0">🔄 {APP_NAME}</h1>
      </div>
      <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 10px 10px">
        <h2 style="color:#1f2937">👋 New Member Joined</h2>
        <p style="color:#4b5563"><strong>{new_member_name}</strong> has joined <strong>{group_name}</strong>.</p>
        <a href="{FRONTEND_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">View Group</a>
      </div>
    </div>"""
    _send_email_to_members(db, existing_ids, title, html)


# ─────────────────────────────────────────────────────────
# Event: Payment Due Tomorrow (called by scheduler)
# ─────────────────────────────────────────────────────────
def notify_payment_due(
    db: Session,
    user_id: str,
    group_id: UUID,
    group_name: str,
    amount: float,
    currency: str,
    cycle_number: int,
    due_date_str: str,
):
    title = f"⏰ Payment Due Tomorrow — {group_name}"
    message = f"Your {currency} {amount:,.2f} contribution for Cycle #{cycle_number} is due tomorrow ({due_date_str})."

    _save_and_push(db, [user_id], group_id, "payment_due", title, message)

    user = db.query(User).filter(User.id == user_id).first()
    if user and user.email:
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:24px;border-radius:10px 10px 0 0;text-align:center">
            <h1 style="color:white;margin:0">🔄 {APP_NAME}</h1>
          </div>
          <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 10px 10px">
            <h2 style="color:#1f2937">⏰ Payment Reminder</h2>
            <p style="color:#4b5563">Hi {user.full_name},</p>
            <p style="color:#4b5563">Your contribution for <strong>{group_name}</strong> is due <strong>tomorrow</strong>.</p>
            <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:0;color:#374151">Amount: <strong>{currency} {amount:,.2f}</strong></p>
              <p style="margin:4px 0 0;color:#374151">Due Date: <strong>{due_date_str}</strong></p>
              <p style="margin:4px 0 0;color:#374151">Cycle: <strong>#{cycle_number}</strong></p>
            </div>
            <a href="{FRONTEND_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">Pay Now</a>
          </div>
        </div>"""
        try:
            _send_email(user.email, title, html)
        except Exception as e:
            print(f"[EMAIL] Reminder failed for {user.email}: {e}")


# ─────────────────────────────────────────────────────────
# Event: New Group Created (notifies all super admins)
# ─────────────────────────────────────────────────────────
def notify_group_created(
    db: Session,
    group_id: UUID,
    group_name: str,
    creator_name: str,
    creator_email: str,
    contribution_amount: float,
    currency: str,
):
    """Notify all super admins (in-app + email) when a new group is created."""
    admins = db.query(User).filter(User.role == "super_admin", User.is_active == True).all()
    admin_ids = [str(a.id) for a in admins]

    if not admin_ids:
        return

    title = f"🆕 New Group Created — {group_name}"
    message = f"{creator_name} ({creator_email}) created a new group: \"{group_name}\" — {currency} {contribution_amount:,.2f} contribution."

    _save_and_push(db, admin_ids, group_id, "group_created", title, message)

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#1a6b4a,#124d35);padding:24px;border-radius:10px 10px 0 0;text-align:center">
        <h1 style="color:white;margin:0">{APP_NAME}</h1>
      </div>
      <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 10px 10px">
        <h2 style="color:#1f2937">🆕 New Group Created</h2>
        <p style="color:#4b5563"><strong>{creator_name}</strong> ({creator_email}) just created a new group.</p>
        <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0;color:#374151">Group: <strong>{group_name}</strong></p>
          <p style="margin:4px 0 0;color:#374151">Contribution: <strong>{currency} {contribution_amount:,.2f}</strong></p>
        </div>
        <a href="{FRONTEND_URL}/admin/groups" style="display:inline-block;background:linear-gradient(135deg,#1a6b4a,#124d35);color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">View in Admin</a>
      </div>
    </div>"""
    _send_email_to_members(db, admin_ids, title, html)

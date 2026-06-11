from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

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
from app.schemas.group import (
    GroupCreate, GroupResponse, GroupUpdate,
    CycleDecisionRequest, ExitRequest, ExitRequestResponse,
    ExitDecision, WaitlistResponse, WaitlistDecision,
)

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


# ── CRUD ──────────────────────────────────────────────────────────────────

@router.post("/", response_model=GroupResponse)
def create_group(
    group_data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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
        membership_status="active",
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
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    group.is_active = False
    group.group_status = "ended"
    db.commit()
    return {"message": "Group deactivated successfully"}


# ── CYCLE LIFECYCLE ───────────────────────────────────────────────────────

@router.post("/{group_id}/cycle-decision")
def make_cycle_decision(
    group_id: UUID,
    body: CycleDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(group_admin_dependency)
):
    """
    Admin decides what happens after the current cycle completes.
    decision: continue | pause | end
    Can be called at any time — takes effect after the next payout is processed.
    """
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    decision = body.decision.value if hasattr(body.decision, 'value') else body.decision

    group.cycle_decision = decision
    group.cycle_decision_at = datetime.utcnow()
    group.cycle_decision_note = body.note

    if decision == "continue":
        group.group_status = "active"
    elif decision == "pause":
        group.group_status = "paused"
        group.is_active = False
    elif decision == "end":
        group.group_status = "ended"
        group.is_active = False

    db.commit()
    return {
        "message": f"Group decision set to '{decision}'",
        "group_status": group.group_status,
        "note": group.cycle_decision_note,
    }


@router.post("/{group_id}/resume")
def resume_group(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(group_admin_dependency)
):
    """Resume a paused group."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.group_status != "paused":
        raise HTTPException(status_code=400, detail="Group is not paused")

    group.group_status = "active"
    group.is_active = True
    group.cycle_decision = "continue"
    group.cycle_decision_at = datetime.utcnow()
    db.commit()
    return {"message": "Group resumed successfully"}


# ── EXIT REQUESTS ─────────────────────────────────────────────────────────

@router.post("/{group_id}/request-exit")
def request_exit(
    group_id: UUID,
    body: ExitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Member requests to leave the group at the end of the current cycle."""
    membership = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
        Membership.is_active == True,
        Membership.membership_status == "active",
    ).first()

    if not membership:
        raise HTTPException(status_code=404, detail="Active membership not found")
    if membership.is_admin:
        raise HTTPException(status_code=400, detail="Group admin cannot request exit. Transfer admin role first.")
    if membership.exit_requested:
        raise HTTPException(status_code=400, detail="Exit already requested")

    membership.exit_requested = True
    membership.exit_requested_at = datetime.utcnow()
    membership.exit_reason = body.reason
    membership.membership_status = "exit_requested"
    db.commit()

    return {"message": "Exit request submitted. The admin will review it."}


@router.delete("/{group_id}/cancel-exit")
def cancel_exit_request(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Member cancels their exit request."""
    membership = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
        Membership.exit_requested == True,
        Membership.exit_approved == None,
    ).first()

    if not membership:
        raise HTTPException(status_code=404, detail="No pending exit request found")

    membership.exit_requested = False
    membership.exit_requested_at = None
    membership.exit_reason = None
    membership.membership_status = "active"
    db.commit()
    return {"message": "Exit request cancelled"}


@router.get("/{group_id}/exit-requests", response_model=List[ExitRequestResponse])
def list_exit_requests(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(group_admin_dependency)
):
    """Admin views all pending exit requests for a group."""
    memberships = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.exit_requested == True,
        Membership.exit_approved == None,
    ).all()

    return [
        ExitRequestResponse(
            membership_id=m.id,
            user_id=m.user_id,
            user_name=m.user.full_name if m.user else "Unknown",
            user_email=m.user.email if m.user else "",
            exit_requested_at=m.exit_requested_at,
            exit_reason=m.exit_reason,
            exit_approved=m.exit_approved,
        )
        for m in memberships
    ]


@router.put("/{group_id}/exit-requests/{user_id}")
def decide_exit_request(
    group_id: UUID,
    user_id: UUID,
    body: ExitDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(group_admin_dependency)
):
    """Admin approves or rejects a member's exit request."""
    membership = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == user_id,
        Membership.exit_requested == True,
    ).first()

    if not membership:
        raise HTTPException(status_code=404, detail="Exit request not found")

    membership.exit_approved = body.approved
    membership.exit_approved_at = datetime.utcnow()

    if body.approved:
        membership.is_active = False
        membership.membership_status = "exited"
    else:
        membership.exit_requested = False
        membership.membership_status = "active"

    db.commit()
    action = "approved" if body.approved else "rejected"
    return {"message": f"Exit request {action}"}


# ── WAITLIST ──────────────────────────────────────────────────────────────

@router.post("/{group_id}/waitlist")
def join_waitlist(
    group_id: UUID,
    note: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """A user requests to join a group — added to waitlist pending admin approval."""
    group = db.query(Group).filter(Group.id == group_id, Group.is_active == True).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or inactive")

    existing = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
    ).first()

    if existing:
        if existing.is_active:
            raise HTTPException(status_code=400, detail="You are already a member of this group")
        if existing.membership_status == "waitlist":
            raise HTTPException(status_code=400, detail="You are already on the waitlist")

    waitlist_membership = Membership(
        user_id=current_user.id,
        group_id=group_id,
        is_active=False,
        is_admin=False,
        membership_status="waitlist",
        waitlist_requested_at=datetime.utcnow(),
        waitlist_note=note,
    )
    db.add(waitlist_membership)
    db.commit()
    return {"message": "Waitlist request submitted. The admin will review it."}


@router.get("/{group_id}/waitlist", response_model=List[WaitlistResponse])
def list_waitlist(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(group_admin_dependency)
):
    """Admin views all waitlist requests for a group."""
    memberships = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.membership_status == "waitlist",
        Membership.waitlist_approved == None,
    ).all()

    return [
        WaitlistResponse(
            membership_id=m.id,
            user_id=m.user_id,
            user_name=m.user.full_name if m.user else "Unknown",
            user_email=m.user.email if m.user else "",
            waitlist_requested_at=m.waitlist_requested_at,
            waitlist_note=m.waitlist_note,
            waitlist_approved=m.waitlist_approved,
        )
        for m in memberships
    ]


@router.put("/{group_id}/waitlist/{user_id}")
def decide_waitlist(
    group_id: UUID,
    user_id: UUID,
    body: WaitlistDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(group_admin_dependency)
):
    """Admin approves or rejects a waitlist request."""
    membership = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == user_id,
        Membership.membership_status == "waitlist",
    ).first()

    if not membership:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")

    group = db.query(Group).filter(Group.id == group_id).first()
    active_members = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.is_active == True,
    ).count()

    if body.approved:
        if active_members >= group.member_count:
            raise HTTPException(status_code=400, detail=f"Group is full ({group.member_count} members max)")

        max_order = db.query(Membership).filter(
            Membership.group_id == group_id,
            Membership.is_active == True,
        ).count()

        membership.is_active = True
        membership.membership_status = "active"
        membership.payout_order = max_order + 1
        membership.joined_at = datetime.utcnow()
        membership.waitlist_approved = True
        membership.waitlist_approved_at = datetime.utcnow()
    else:
        membership.waitlist_approved = False
        membership.waitlist_approved_at = datetime.utcnow()
        membership.membership_status = "rejected"

    db.commit()
    action = "approved and added to group" if body.approved else "rejected"
    return {"message": f"Waitlist request {action}"}


# ── CONTRIBUTION MATRIX ───────────────────────────────────────────────────

@router.get("/{group_id}/contribution-matrix")
def contribution_matrix(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(group_member_dependency)
):
    """Returns a matrix of member contributions per cycle for reporting."""
    from app.models.contribution import Contribution
    from app.models.payout import PayoutSchedule

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    active_members = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.is_active == True,
    ).all()

    contributions = db.query(Contribution).filter(
        Contribution.group_id == group_id,
        Contribution.status == 'paid',
    ).all()

    payouts = db.query(PayoutSchedule).filter(
        PayoutSchedule.group_id == group_id,
        PayoutSchedule.status == 'paid',
    ).all()

    # Build payout lookup: membership_id -> cycle_number
    payout_lookup = {str(p.membership_id): p.cycle_number for p in payouts}

    # Get all cycle numbers that have contributions
    cycles = sorted(set(c.cycle_number for c in contributions)) or [1]

    # Build cycle totals
    cycle_totals = {}
    for c in contributions:
        cycle_totals[c.cycle_number] = cycle_totals.get(c.cycle_number, 0) + c.amount

    grand_total = sum(c.amount for c in contributions)

    # Build member rows
    members_data = []
    for m in active_members:
        member_contribs = {c.cycle_number: {'amount': c.amount, 'paid_date': c.paid_date.isoformat() if c.paid_date else None}
                          for c in contributions if str(c.membership_id) == str(m.id)}
        total_paid = sum(v['amount'] for v in member_contribs.values())
        payout_cycle = payout_lookup.get(str(m.id))

        members_data.append({
            'user_id': str(m.user_id),
            'name': m.user.full_name if m.user else 'Unknown',
            'email': m.user.email if m.user else '',
            'payout_order': m.payout_order,
            'contributions': member_contribs,
            'total_paid': total_paid,
            'payout_cycle': payout_cycle,
        })

    members_data.sort(key=lambda x: x['payout_order'] or 999)

    return {
        'cycles': cycles,
        'members': members_data,
        'cycle_totals': cycle_totals,
        'grand_total': grand_total,
        'currency': group.currency,
    }

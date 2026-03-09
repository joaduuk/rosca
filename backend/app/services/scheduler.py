# backend/app/services/scheduler.py
def generate_payout_schedule(group_id: UUID, db: Session):
    """
    Generate fair rotation order for ROSCA payouts
    Supports random, seniority-based, or custom order
    """
    members = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.is_active == True
    ).all()
    
    # Simple random rotation for MVP
    import random
    member_ids = [m.id for m in members]
    random.shuffle(member_ids)
    
    # Create payout schedule entries
    start_date = datetime.utcnow()
    for idx, member_id in enumerate(member_ids):
        payout_date = start_date + timedelta(days=30 * idx)  # Monthly
        schedule = PayoutSchedule(
            group_id=group_id,
            member_id=member_id,
            payout_date=payout_date,
            amount=100,  # Get from group settings
            cycle_number=idx + 1
        )
        db.add(schedule)
    
    db.commit()
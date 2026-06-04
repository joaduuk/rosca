# backend/app/tasks/due_reminders.py
import threading
import time
from datetime import datetime, timedelta

from app.core.database import SessionLocal
from app.models.group import Group
from app.models.membership import Membership
from app.models.contribution import Contribution
from app.core.notifications import notify_payment_due


def check_due_reminders():
    db = SessionLocal()
    try:
        tomorrow = (datetime.utcnow() + timedelta(days=1)).date()
        active_groups = db.query(Group).filter(Group.is_active == True).all()

        for group in active_groups:
            active_cycle = (group.current_cycle or 0) + 1
            members = db.query(Membership).filter(
                Membership.group_id == group.id,
                Membership.is_active == True
            ).all()

            for member in members:
                already_paid = db.query(Contribution).filter(
                    Contribution.group_id == group.id,
                    Contribution.membership_id == member.id,
                    Contribution.cycle_number == active_cycle,
                    Contribution.status == "paid"
                ).first()

                if already_paid:
                    continue

                if group.next_payout_date and group.next_payout_date.date() == tomorrow:
                    due_str = tomorrow.strftime("%B %d, %Y")
                    try:
                        notify_payment_due(
                            db=db,
                            user_id=str(member.user_id),
                            group_id=group.id,
                            group_name=group.name,
                            amount=float(group.contribution_amount),
                            currency=group.currency or "USD",
                            cycle_number=active_cycle,
                            due_date_str=due_str,
                        )
                    except Exception as e:
                        print(f"[REMINDER] Failed for member {member.id}: {e}")
    except Exception as e:
        print(f"[REMINDER] Scheduler error: {e}")
    finally:
        db.close()


def _scheduler_loop():
    print("[SCHEDULER] Due reminder scheduler started")
    while True:
        now = datetime.utcnow()
        next_run = now.replace(hour=8, minute=0, second=0, microsecond=0)
        if next_run <= now:
            next_run += timedelta(days=1)
        sleep_seconds = (next_run - now).total_seconds()
        print(f"[SCHEDULER] Next check in {sleep_seconds/3600:.1f}h")
        time.sleep(sleep_seconds)
        try:
            check_due_reminders()
        except Exception as e:
            print(f"[SCHEDULER] Error: {e}")


def start_scheduler():
    t = threading.Thread(target=_scheduler_loop, daemon=True)
    t.start()

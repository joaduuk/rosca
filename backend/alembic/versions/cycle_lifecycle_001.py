"""add cycle lifecycle fields

Revision ID: cycle_lifecycle_001
Revises: 
Create Date: 2026-06-07

"""
from alembic import op
import sqlalchemy as sa

revision = 'cycle_lifecycle_001'
down_revision = '0f29017c9e90' # Replace with your latest revision ID
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Group table ───────────────────────────────────────────────────────
    op.add_column('groups', sa.Column('group_status', sa.String(), nullable=False, server_default='active'))
    op.add_column('groups', sa.Column('cycle_decision', sa.String(), nullable=True))
    op.add_column('groups', sa.Column('cycle_decision_at', sa.DateTime(), nullable=True))
    op.add_column('groups', sa.Column('cycle_decision_note', sa.String(), nullable=True))

    # ── Membership table ──────────────────────────────────────────────────
    op.add_column('memberships', sa.Column('membership_status', sa.String(), nullable=False, server_default='active'))
    op.add_column('memberships', sa.Column('exit_requested', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('memberships', sa.Column('exit_requested_at', sa.DateTime(), nullable=True))
    op.add_column('memberships', sa.Column('exit_reason', sa.String(), nullable=True))
    op.add_column('memberships', sa.Column('exit_approved', sa.Boolean(), nullable=True))
    op.add_column('memberships', sa.Column('exit_approved_at', sa.DateTime(), nullable=True))
    op.add_column('memberships', sa.Column('waitlist_requested_at', sa.DateTime(), nullable=True))
    op.add_column('memberships', sa.Column('waitlist_approved', sa.Boolean(), nullable=True))
    op.add_column('memberships', sa.Column('waitlist_approved_at', sa.DateTime(), nullable=True))
    op.add_column('memberships', sa.Column('waitlist_note', sa.String(), nullable=True))


def downgrade() -> None:
    # ── Group table ───────────────────────────────────────────────────────
    op.drop_column('groups', 'group_status')
    op.drop_column('groups', 'cycle_decision')
    op.drop_column('groups', 'cycle_decision_at')
    op.drop_column('groups', 'cycle_decision_note')

    # ── Membership table ──────────────────────────────────────────────────
    op.drop_column('memberships', 'membership_status')
    op.drop_column('memberships', 'exit_requested')
    op.drop_column('memberships', 'exit_requested_at')
    op.drop_column('memberships', 'exit_reason')
    op.drop_column('memberships', 'exit_approved')
    op.drop_column('memberships', 'exit_approved_at')
    op.drop_column('memberships', 'waitlist_requested_at')
    op.drop_column('memberships', 'waitlist_approved')
    op.drop_column('memberships', 'waitlist_approved_at')
    op.drop_column('memberships', 'waitlist_note')

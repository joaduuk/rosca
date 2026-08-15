"""Add round tracking to groups, contributions, payouts

Revision ID: add_round_tracking_001
Revises: email_verification_001
Create Date: 2026-08-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

revision = 'add_round_tracking_001'
down_revision = 'email_verification_001'
branch_labels = None
depends_on = None


def upgrade():
    # Group: lock + round tracking
    op.add_column('groups', sa.Column('is_locked', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('groups', sa.Column('round_number', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('groups', sa.Column('round_size', sa.Integer(), nullable=True))
    op.alter_column('groups', 'start_date', existing_type=sa.DateTime(), nullable=True)

    # Contribution + PayoutSchedule: scope to a round, so cycle numbers
    # don't collide across rounds
    op.add_column('contributions', sa.Column('round_number', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('payout_schedules', sa.Column('round_number', sa.Integer(), nullable=False, server_default='1'))

    # New history table
    op.create_table(
        'group_rounds',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('group_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('groups.id'), nullable=False),
        sa.Column('round_number', sa.Integer(), nullable=False),
        sa.Column('round_size', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('total_collected', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_paid_out', sa.Float(), nullable=False, server_default='0'),
    )


def downgrade():
    op.drop_table('group_rounds')
    op.drop_column('payout_schedules', 'round_number')
    op.drop_column('contributions', 'round_number')
    op.alter_column('groups', 'start_date', existing_type=sa.DateTime(), nullable=False)
    op.drop_column('groups', 'round_size')
    op.drop_column('groups', 'round_number')
    op.drop_column('groups', 'is_locked')
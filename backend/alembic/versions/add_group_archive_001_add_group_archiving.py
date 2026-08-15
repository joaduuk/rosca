"""Add group archiving

Revision ID: add_group_archive_001
Revises: add_round_tracking_001
Create Date: 2026-08-09
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_group_archive_001'
down_revision = 'add_round_tracking_001'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('groups', sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    op.drop_column('groups', 'is_archived')
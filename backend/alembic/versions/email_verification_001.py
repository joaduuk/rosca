"""add email verification and bounce suppression fields

Revision ID: email_verification_001
Revises: offline_members_001
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa

revision = 'email_verification_001'
down_revision = 'offline_members_001'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('users', sa.Column('email_valid', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('users', sa.Column('verification_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('verification_token_expires', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('verification_sent_at', sa.DateTime(), nullable=True))
    op.create_index('ix_users_verification_token', 'users', ['verification_token'])


def downgrade():
    op.drop_index('ix_users_verification_token', table_name='users')
    op.drop_column('users', 'verification_sent_at')
    op.drop_column('users', 'verification_token_expires')
    op.drop_column('users', 'verification_token')
    op.drop_column('users', 'email_valid')
    op.drop_column('users', 'is_verified')

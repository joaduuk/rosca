"""add invite_code to users

Revision ID: invite_code_001
Revises: cycle_lifecycle_001
Create Date: 2026-06-11

"""
from alembic import op
import sqlalchemy as sa
import secrets
import string

revision = 'invite_code_001'
down_revision = 'cycle_lifecycle_001'
branch_labels = None
depends_on = None


def generate_code():
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(8))


def upgrade():
    # Add column as nullable first
    op.add_column('users', sa.Column('invite_code', sa.String(20), nullable=True))

    # Generate unique codes for all existing users
    conn = op.get_bind()
    users = conn.execute(sa.text("SELECT id FROM users WHERE invite_code IS NULL")).fetchall()
    for user in users:
        while True:
            code = 'RC-' + ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
            exists = conn.execute(
                sa.text("SELECT 1 FROM users WHERE invite_code = :code"),
                {"code": code}
            ).fetchone()
            if not exists:
                conn.execute(
                    sa.text("UPDATE users SET invite_code = :code WHERE id = :id"),
                    {"code": code, "id": user[0]}
                )
                break

    # Now make it not nullable and unique
    op.alter_column('users', 'invite_code', nullable=False)
    op.create_unique_constraint('uq_users_invite_code', 'users', ['invite_code'])


def downgrade():
    op.drop_constraint('uq_users_invite_code', 'users', type_='unique')
    op.drop_column('users', 'invite_code')

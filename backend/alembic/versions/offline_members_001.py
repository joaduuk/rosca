"""offline members - add unregistered member support

Revision ID: offline_members_001
Revises: 47dbdb273e13
Create Date: 2026-07-14

Adds support for "offline" members: group members who don't have a
registered User account. memberships.user_id becomes nullable, and
display_name / contact_phone / contact_email / member_status are added
to hold the info for those rows.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "offline_members_001"
down_revision = "47dbdb273e13"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Make user_id nullable — offline members have no linked account.
    op.alter_column(
        "memberships",
        "user_id",
        existing_type=sa.dialects.postgresql.UUID(as_uuid=True),
        nullable=True,
    )

    # 2. New columns for offline members.
    op.add_column(
        "memberships",
        sa.Column("member_status", sa.String(), nullable=False, server_default="registered"),
    )
    op.add_column("memberships", sa.Column("display_name", sa.String(), nullable=True))
    op.add_column("memberships", sa.Column("contact_phone", sa.String(), nullable=True))
    op.add_column("memberships", sa.Column("contact_email", sa.String(), nullable=True))

    # 3. Drop the server_default after backfilling existing rows, so future
    #    inserts must specify it explicitly (matches the SQLAlchemy model,
    #    which sets it in Python, not at the DB level).
    op.alter_column("memberships", "member_status", server_default=None)


def downgrade():
    op.drop_column("memberships", "contact_email")
    op.drop_column("memberships", "contact_phone")
    op.drop_column("memberships", "display_name")
    op.drop_column("memberships", "member_status")
    op.alter_column(
        "memberships",
        "user_id",
        existing_type=sa.dialects.postgresql.UUID(as_uuid=True),
        nullable=False,
    )

"""add contribution and payout models

Revision ID: c3e58a942a13
Revises: e26e508e2f49
Create Date: 2026-03-19 05:54:05.303325

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c3e58a942a13'
down_revision: Union[str, None] = 'e26e508e2f49'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Handle NULL values in full_name first
    op.execute("UPDATE users SET full_name = 'Unknown User' WHERE full_name IS NULL")
    
    # Step 2: Add NOT NULL constraint to full_name
    op.alter_column('users', 'full_name',
               existing_type=sa.VARCHAR(),
               nullable=False)
    
    # Step 3: Create the enum type (if it doesn't exist)
    from sqlalchemy.dialects.postgresql import ENUM
    userrole_enum = ENUM('SUPER_ADMIN', 'GROUP_ADMIN', 'GROUP_MEMBER', 
                        name='userrole', create_type=True)
    userrole_enum.create(op.get_bind(), checkfirst=True)
    
    # Step 4: Handle NULL values in role
    op.execute("UPDATE users SET role = 'GROUP_MEMBER' WHERE role IS NULL")
    
    # Step 5: Convert role column to enum with proper casting
    op.execute("""
        ALTER TABLE users 
        ALTER COLUMN role TYPE userrole 
        USING CASE 
            WHEN role::text = 'admin' THEN 'SUPER_ADMIN'::userrole
            WHEN role::text = 'member' THEN 'GROUP_MEMBER'::userrole
            WHEN role::text = 'group_admin' THEN 'GROUP_ADMIN'::userrole
            WHEN role::text = 'SUPER_ADMIN' THEN 'SUPER_ADMIN'::userrole
            WHEN role::text = 'GROUP_ADMIN' THEN 'GROUP_ADMIN'::userrole
            WHEN role::text = 'GROUP_MEMBER' THEN 'GROUP_MEMBER'::userrole
            ELSE 'GROUP_MEMBER'::userrole
        END
    """)
    
    # Step 6: Set default for new records
    op.alter_column('users', 'role',
               existing_type=userrole_enum,
               nullable=False,
               server_default='GROUP_MEMBER')
    
    # Continue with other alterations
    op.alter_column('users', 'created_at',
               existing_type=postgresql.TIMESTAMP(timezone=True),
               type_=sa.DateTime(),
               existing_nullable=True)
    op.alter_column('users', 'updated_at',
               existing_type=postgresql.TIMESTAMP(timezone=True),
               type_=sa.DateTime(),
               existing_nullable=True)
    
    # Drop old columns and indexes
    op.drop_index('ix_users_id', table_name='users')
    op.drop_index('ix_users_username', table_name='users')
    op.drop_column('users', 'first_name')
    op.drop_column('users', 'username')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'phone_number')
    op.drop_column('users', 'address')
    op.drop_column('users', 'profile_picture')
    op.drop_column('users', 'date_of_birth')


def downgrade() -> None:
    # Revert column changes first
    op.add_column('users', sa.Column('date_of_birth', sa.DATE(), autoincrement=False, nullable=True))
    op.add_column('users', sa.Column('profile_picture', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('users', sa.Column('address', sa.TEXT(), autoincrement=False, nullable=True))
    op.add_column('users', sa.Column('phone_number', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('users', sa.Column('last_name', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('users', sa.Column('username', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('users', sa.Column('first_name', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.create_index('ix_users_username', 'users', ['username'], unique=False)
    op.create_index('ix_users_id', 'users', ['id'], unique=False)
    
    # Revert timestamp columns
    op.alter_column('users', 'updated_at',
               existing_type=sa.DateTime(),
               type_=postgresql.TIMESTAMP(timezone=True),
               existing_nullable=True)
    op.alter_column('users', 'created_at',
               existing_type=sa.DateTime(),
               type_=postgresql.TIMESTAMP(timezone=True),
               existing_nullable=True)
    
    # Convert role back to string
    op.alter_column('users', 'role',
               existing_type=sa.Enum('SUPER_ADMIN', 'GROUP_ADMIN', 'GROUP_MEMBER', name='userrole'),
               type_=sa.VARCHAR(),
               nullable=True,
               server_default=None)
    
    # Drop the enum type
    op.execute('DROP TYPE IF EXISTS userrole')
    
    # Make full_name nullable again
    op.alter_column('users', 'full_name',
               existing_type=sa.VARCHAR(),
               nullable=True)
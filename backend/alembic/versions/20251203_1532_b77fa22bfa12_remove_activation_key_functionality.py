"""remove_activation_key_functionality

Revision ID: b77fa22bfa12
Revises: 8993f932e24f
Create Date: 2025-12-03 15:32:00.601017

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b77fa22bfa12'
down_revision: Union[str, None] = '8993f932e24f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove activation_key column from users table
    op.drop_column('users', 'activation_key')

    # Drop activation_keys table
    op.drop_table('activation_keys')


def downgrade() -> None:
    # Recreate activation_keys table
    op.create_table(
        'activation_keys',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('plan_type', sa.Enum('free', 'premium', 'enterprise', name='userplan'), nullable=False),
        sa.Column('days_valid', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('used_by_user_id', sa.Integer(), nullable=True),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['used_by_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_activation_keys_id'), 'activation_keys', ['id'], unique=False)
    op.create_index(op.f('ix_activation_keys_key'), 'activation_keys', ['key'], unique=True)
    op.create_index(op.f('ix_activation_keys_is_used'), 'activation_keys', ['is_used'], unique=False)

    # Add activation_key column back to users table
    op.add_column('users', sa.Column('activation_key', sa.String(length=100), nullable=True))

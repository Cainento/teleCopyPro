"""add_subscription_period_end

Revision ID: 8993f932e24f
Revises: 001_initial
Create Date: 2025-12-01 16:10:19.144277

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8993f932e24f'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add subscription_period_end column to users table
    op.add_column('users', sa.Column('subscription_period_end', sa.DateTime(), nullable=True))

    # Add index on stripe_customer_id for faster lookups
    op.create_index(op.f('ix_users_stripe_customer_id'), 'users', ['stripe_customer_id'], unique=True)


def downgrade() -> None:
    # Remove index on stripe_customer_id
    op.drop_index(op.f('ix_users_stripe_customer_id'), table_name='users')

    # Remove subscription_period_end column from users table
    op.drop_column('users', 'subscription_period_end')

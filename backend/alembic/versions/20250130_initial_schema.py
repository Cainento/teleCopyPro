"""Initial schema

Revision ID: 001_initial
Revises:
Create Date: 2025-01-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('firebase_uid', sa.String(length=128), nullable=True),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('phone_number', sa.String(length=50), nullable=True),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('plan', sa.Enum('free', 'premium', 'enterprise', name='userplan'), nullable=False),
    sa.Column('plan_expiry', sa.DateTime(), nullable=True),
    sa.Column('activation_key', sa.String(length=100), nullable=True),
    sa.Column('stripe_customer_id', sa.String(length=255), nullable=True),
    sa.Column('stripe_subscription_id', sa.String(length=255), nullable=True),
    sa.Column('subscription_status', sa.String(length=50), nullable=True),
    sa.Column('usage_count', sa.Integer(), nullable=False),
    sa.Column('email_verified', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_firebase_uid'), 'users', ['firebase_uid'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_phone_number'), 'users', ['phone_number'], unique=True)
    op.create_index(op.f('ix_users_plan'), 'users', ['plan'], unique=False)

    # Create activation_keys table
    op.create_table('activation_keys',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('key', sa.String(length=100), nullable=False),
    sa.Column('plan_type', sa.Enum('free', 'premium', 'enterprise', name='userplan'), nullable=False),
    sa.Column('days_valid', sa.Integer(), nullable=False),
    sa.Column('is_used', sa.Boolean(), nullable=False),
    sa.Column('used_by_user_id', sa.Integer(), nullable=True),
    sa.Column('used_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['used_by_user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_activation_keys_id'), 'activation_keys', ['id'], unique=False)
    op.create_index(op.f('ix_activation_keys_is_used'), 'activation_keys', ['is_used'], unique=False)
    op.create_index(op.f('ix_activation_keys_key'), 'activation_keys', ['key'], unique=True)

    # Create telegram_sessions table
    op.create_table('telegram_sessions',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('phone_number', sa.String(length=50), nullable=False),
    sa.Column('session_file_path', sa.String(length=500), nullable=False),
    sa.Column('api_id', sa.String(length=100), nullable=False),
    sa.Column('api_hash', sa.String(length=100), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.Column('last_used_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_telegram_sessions_id'), 'telegram_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_telegram_sessions_is_active'), 'telegram_sessions', ['is_active'], unique=False)
    op.create_index(op.f('ix_telegram_sessions_phone_number'), 'telegram_sessions', ['phone_number'], unique=True)
    op.create_index(op.f('ix_telegram_sessions_user_id'), 'telegram_sessions', ['user_id'], unique=False)

    # Create copy_jobs table
    op.create_table('copy_jobs',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('job_id', sa.String(length=100), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('source_channel', sa.String(length=255), nullable=False),
    sa.Column('destination_channel', sa.String(length=255), nullable=False),
    sa.Column('mode', sa.String(length=50), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('total_messages', sa.Integer(), nullable=False),
    sa.Column('copied_messages', sa.Integer(), nullable=False),
    sa.Column('failed_messages', sa.Integer(), nullable=False),
    sa.Column('progress_percentage', sa.Float(), nullable=False),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.Column('started_at', sa.DateTime(), nullable=True),
    sa.Column('completed_at', sa.DateTime(), nullable=True),
    sa.Column('stopped_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_copy_jobs_id'), 'copy_jobs', ['id'], unique=False)
    op.create_index(op.f('ix_copy_jobs_job_id'), 'copy_jobs', ['job_id'], unique=True)
    op.create_index(op.f('ix_copy_jobs_status'), 'copy_jobs', ['status'], unique=False)
    op.create_index(op.f('ix_copy_jobs_user_id'), 'copy_jobs', ['user_id'], unique=False)

    # Create invoices table
    op.create_table('invoices',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('stripe_invoice_id', sa.String(length=255), nullable=False),
    sa.Column('stripe_customer_id', sa.String(length=255), nullable=False),
    sa.Column('stripe_subscription_id', sa.String(length=255), nullable=True),
    sa.Column('amount', sa.Float(), nullable=False),
    sa.Column('currency', sa.String(length=10), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('invoice_url', sa.String(length=500), nullable=True),
    sa.Column('invoice_pdf', sa.String(length=500), nullable=True),
    sa.Column('paid_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_invoices_id'), 'invoices', ['id'], unique=False)
    op.create_index(op.f('ix_invoices_status'), 'invoices', ['status'], unique=False)
    op.create_index(op.f('ix_invoices_stripe_invoice_id'), 'invoices', ['stripe_invoice_id'], unique=True)
    op.create_index(op.f('ix_invoices_user_id'), 'invoices', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_invoices_user_id'), table_name='invoices')
    op.drop_index(op.f('ix_invoices_stripe_invoice_id'), table_name='invoices')
    op.drop_index(op.f('ix_invoices_status'), table_name='invoices')
    op.drop_index(op.f('ix_invoices_id'), table_name='invoices')
    op.drop_table('invoices')

    op.drop_index(op.f('ix_copy_jobs_user_id'), table_name='copy_jobs')
    op.drop_index(op.f('ix_copy_jobs_status'), table_name='copy_jobs')
    op.drop_index(op.f('ix_copy_jobs_job_id'), table_name='copy_jobs')
    op.drop_index(op.f('ix_copy_jobs_id'), table_name='copy_jobs')
    op.drop_table('copy_jobs')

    op.drop_index(op.f('ix_telegram_sessions_user_id'), table_name='telegram_sessions')
    op.drop_index(op.f('ix_telegram_sessions_phone_number'), table_name='telegram_sessions')
    op.drop_index(op.f('ix_telegram_sessions_is_active'), table_name='telegram_sessions')
    op.drop_index(op.f('ix_telegram_sessions_id'), table_name='telegram_sessions')
    op.drop_table('telegram_sessions')

    op.drop_index(op.f('ix_activation_keys_key'), table_name='activation_keys')
    op.drop_index(op.f('ix_activation_keys_is_used'), table_name='activation_keys')
    op.drop_index(op.f('ix_activation_keys_id'), table_name='activation_keys')
    op.drop_table('activation_keys')

    op.drop_index(op.f('ix_users_plan'), table_name='users')
    op.drop_index(op.f('ix_users_phone_number'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_firebase_uid'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')

    op.execute('DROP TYPE userplan')

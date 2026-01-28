"""Add session_string to sessions

Revision ID: e91eb8989f0d
Revises: 5782be5cc06b
Create Date: 2026-01-27 12:01:46.483511

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e91eb8989f0d'
down_revision: Union[str, None] = '5782be5cc06b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add session_string columns for StringSession support
    op.add_column('telegram_sessions', sa.Column('session_string', sa.Text(), nullable=True))
    op.add_column('temp_auth_sessions', sa.Column('session_string', sa.Text(), nullable=True))
    # Note: session_file_path nullable change will be handled by PostgreSQL on deploy
    # SQLite doesn't support ALTER COLUMN, so we skip it here


def downgrade() -> None:
    op.drop_column('temp_auth_sessions', 'session_string')
    op.drop_column('telegram_sessions', 'session_string')

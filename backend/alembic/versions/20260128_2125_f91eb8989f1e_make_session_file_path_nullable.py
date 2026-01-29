"""Make session_file_path nullable

Revision ID: f91eb8989f1e
Revises: e91eb8989f0d
Create Date: 2026-01-28 21:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f91eb8989f1e'
down_revision: Union[str, None] = 'e91eb8989f0d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make session_file_path nullable since we now use session_string (StringSession)
    op.alter_column('telegram_sessions', 'session_file_path',
                    existing_type=sa.VARCHAR(),
                    nullable=True)


def downgrade() -> None:
    # Revert to NOT NULL (this may fail if there are NULL values)
    op.alter_column('telegram_sessions', 'session_file_path',
                    existing_type=sa.VARCHAR(),
                    nullable=False)

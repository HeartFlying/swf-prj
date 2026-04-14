"""Add project last_sync_at fields

Revision ID: 6ead83d9d18d
Revises: 003
Create Date: 2026-03-31 12:29:47.232459

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '6ead83d9d18d'
down_revision: Union[str, Sequence[str], None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add last_sync_at fields to projects table."""
    op.add_column('projects', sa.Column('last_sync_at', sa.DateTime(), nullable=True))
    op.add_column('projects', sa.Column('gitlab_last_sync_at', sa.DateTime(), nullable=True))
    op.add_column('projects', sa.Column('zendao_last_sync_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Remove last_sync_at fields from projects table."""
    op.drop_column('projects', 'zendao_last_sync_at')
    op.drop_column('projects', 'gitlab_last_sync_at')
    op.drop_column('projects', 'last_sync_at')

"""add shelf user book unique constraint

Revision ID: 5e4fc04a4b1d
Revises: b2f1a9c4d7e3
Create Date: 2026-06-09 12:10:29.948506

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5e4fc04a4b1d'
down_revision: Union[str, None] = 'b2f1a9c4d7e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint("uq_shelf_user_book", "shelves", ["user_id", "book_id"])


def downgrade() -> None:
    op.drop_constraint("uq_shelf_user_book", "shelves", type_="unique")

"""seed genres

Revision ID: b2f1a9c4d7e3
Revises: 818c82d8d173
Create Date: 2026-05-30 00:00:00.000000

Seeds the eight canonical genres the frontend expects (slugs match
Home.jsx FALLBACK_GENRES). Idempotent via ON CONFLICT (slug) DO NOTHING,
so re-running is safe. The `id` column is omitted so the table's
gen_random_uuid() server default assigns each primary key.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert


# revision identifiers, used by Alembic.
revision: str = "b2f1a9c4d7e3"
down_revision: Union[str, None] = "818c82d8d173"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


GENRES = [
    {"name": "Literary Fiction", "slug": "literary-fiction", "description": "Character-driven stories with literary merit."},
    {"name": "Science Fiction", "slug": "science-fiction", "description": "Speculative worlds, technology, and futures."},
    {"name": "Fantasy", "slug": "fantasy", "description": "Magic, myth, and invented worlds."},
    {"name": "History", "slug": "history", "description": "Non-fiction explorations of the past."},
    {"name": "Philosophy", "slug": "philosophy", "description": "Ideas, ethics, and ways of knowing."},
    {"name": "Biography", "slug": "biography", "description": "Lives examined and recorded."},
    {"name": "Mystery", "slug": "mystery", "description": "Puzzles, crimes, and revelations."},
    {"name": "Poetry", "slug": "poetry", "description": "Language compressed into meaning."},
]


genres_table = sa.table(
    "genres",
    sa.column("name", sa.String),
    sa.column("slug", sa.String),
    sa.column("description", sa.Text),
)


def upgrade() -> None:
    op.execute(
        pg_insert(genres_table)
        .values(GENRES)
        .on_conflict_do_nothing(index_elements=["slug"])
    )


def downgrade() -> None:
    slugs = [g["slug"] for g in GENRES]
    op.execute(genres_table.delete().where(genres_table.c.slug.in_(slugs)))

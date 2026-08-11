"""One-time backfill: upgrade ``cover_url`` strings on existing ``books`` rows.

We recently improved cover URL selection/transformation in
``app.services.google_books``. Rows already stored only have the *chosen* URL
string (not the original ``imageLinks`` dict), so only the recoverable string
transforms apply here: http→https, strip ``&edge=curl``, ``zoom=1``→``zoom=0``.
Those transforms are idempotent, so running this twice is a no-op.

Run with::

    python -m scripts.backfill_cover_urls
    # or:
    docker compose exec backend python -m scripts.backfill_cover_urls
"""

from __future__ import annotations

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models import Book
from app.services.google_books import _upgrade_cover_url


async def backfill(session: AsyncSession) -> dict[str, int]:
    """Upgrade every non-null ``cover_url`` in place, committing once.

    Returns a summary dict with ``scanned``, ``updated``, and ``unchanged``
    counts. Only rows whose value actually changes are written.
    """
    result = await session.execute(select(Book).where(Book.cover_url.is_not(None)))
    books = result.scalars().all()

    scanned = 0
    updated = 0
    for book in books:
        scanned += 1
        new_url = _upgrade_cover_url(book.cover_url)
        if new_url != book.cover_url:
            book.cover_url = new_url
            updated += 1

    await session.commit()
    return {"scanned": scanned, "updated": updated, "unchanged": scanned - updated}


async def main() -> None:
    async with AsyncSessionLocal() as session:
        summary = await backfill(session)
    print(
        f"Cover URL backfill complete: "
        f"{summary['scanned']} scanned, "
        f"{summary['updated']} updated, "
        f"{summary['unchanged']} unchanged."
    )


if __name__ == "__main__":
    asyncio.run(main())

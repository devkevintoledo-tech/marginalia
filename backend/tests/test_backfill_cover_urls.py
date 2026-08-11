"""Tests for the one-time cover_url backfill script.

Drives the script's core ``backfill(session)`` against the test db session
(see conftest's ``db_session`` fixture) so no second engine is spun up.
"""

import uuid

import pytest_asyncio
from sqlalchemy import select

from app.models import Book
from scripts.backfill_cover_urls import backfill

STALE = "http://books.google.com/books/content?id=X&zoom=1&edge=curl&source=gbs_api"
UPGRADED = "https://books.google.com/books/content?id=X&zoom=0&source=gbs_api"


@pytest_asyncio.fixture
async def stale_book(db_session):
    b = Book(
        source="google_books",
        external_id=uuid.uuid4().hex[:12],
        title="Stale Cover",
        author="A. Tester",
        cover_url=STALE,
    )
    db_session.add(b)
    await db_session.commit()
    await db_session.refresh(b)
    return b


async def test_backfill_upgrades_stale_cover_url(db_session, stale_book):
    summary = await backfill(db_session)

    refreshed = (
        await db_session.execute(select(Book).where(Book.id == stale_book.id))
    ).scalar_one()
    assert refreshed.cover_url == UPGRADED
    assert summary["scanned"] == 1
    assert summary["updated"] == 1
    assert summary["unchanged"] == 0


async def test_backfill_is_idempotent(db_session, stale_book):
    await backfill(db_session)
    summary = await backfill(db_session)

    refreshed = (
        await db_session.execute(select(Book).where(Book.id == stale_book.id))
    ).scalar_one()
    assert refreshed.cover_url == UPGRADED
    assert summary["scanned"] == 1
    assert summary["updated"] == 0
    assert summary["unchanged"] == 1

"""Shelf model and API tests."""
import uuid
import pytest
from sqlalchemy.exc import IntegrityError

from app.models.shelf import Shelf, ShelfStatus
from app.models.user import User, AuthProvider

pytestmark = pytest.mark.asyncio


async def test_shelf_db_rejects_duplicate_user_book(db_session, book):
    """The DB uniqueness constraint must fire even if app-layer check is bypassed."""
    user = User(
        email=f"u{uuid.uuid4().hex[:6]}@test.com",
        username=f"u{uuid.uuid4().hex[:6]}",
        password_hash="x",
        auth_provider=AuthProvider.email,
    )
    db_session.add(user)
    await db_session.flush()

    db_session.add(Shelf(user_id=user.id, book_id=book.id, status=ShelfStatus.want_to_read))
    await db_session.flush()

    db_session.add(Shelf(user_id=user.id, book_id=book.id, status=ShelfStatus.reading))
    with pytest.raises(IntegrityError):
        await db_session.flush()
    await db_session.rollback()

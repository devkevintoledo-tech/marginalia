"""Shelf model and API tests."""
import uuid
import pytest
from sqlalchemy.exc import IntegrityError

from app.models.shelf import Shelf, ShelfStatus
from app.models.user import User, AuthProvider

pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# API tests
# ---------------------------------------------------------------------------


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


async def test_add_book_to_shelf(client, auth_headers, book):
    resp = await client.post(
        f"/api/books/{book.id}/shelf",
        json={"status": "want_to_read"},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "want_to_read"
    assert body["book_id"] == str(book.id)


async def test_add_duplicate_shelf_returns_409(client, auth_headers, book):
    await client.post(
        f"/api/books/{book.id}/shelf",
        json={"status": "want_to_read"},
        headers=auth_headers,
    )
    resp = await client.post(
        f"/api/books/{book.id}/shelf",
        json={"status": "reading"},
        headers=auth_headers,
    )
    assert resp.status_code == 409, resp.text


async def test_update_shelf_status(client, auth_headers, book):
    await client.post(
        f"/api/books/{book.id}/shelf",
        json={"status": "want_to_read"},
        headers=auth_headers,
    )
    resp = await client.put(
        f"/api/books/{book.id}/shelf",
        json={"status": "read"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "read"


async def test_update_nonexistent_shelf_returns_404(client, auth_headers, book):
    resp = await client.put(
        f"/api/books/{book.id}/shelf",
        json={"status": "read"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


async def test_remove_from_shelf(client, auth_headers, book):
    await client.post(
        f"/api/books/{book.id}/shelf",
        json={"status": "reading"},
        headers=auth_headers,
    )
    resp = await client.delete(f"/api/books/{book.id}/shelf", headers=auth_headers)
    assert resp.status_code == 204

    update = await client.put(
        f"/api/books/{book.id}/shelf",
        json={"status": "read"},
        headers=auth_headers,
    )
    assert update.status_code == 404


async def test_shelf_requires_auth(client, book):
    resp = await client.post(
        f"/api/books/{book.id}/shelf",
        json={"status": "want_to_read"},
    )
    assert resp.status_code in (401, 403)

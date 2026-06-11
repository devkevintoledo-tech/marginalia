import respx
from httpx import Response

VOLUME = {
    "id": "ABC123",
    "volumeInfo": {
        "title": "The Darkness That Comes Before",
        "authors": ["R. Scott Bakker"],
        "description": "Prince of Nothing.",
        "publishedDate": "2003-05-01",
        "industryIdentifiers": [{"type": "ISBN_13", "identifier": "9781585675340"}],
        "pageCount": 577,
        "categories": ["Fiction / Fantasy / Epic"],
        "averageRating": 4.0,
        "ratingsCount": 42,
        "language": "en",
        "imageLinks": {"thumbnail": "http://x/y?zoom=1"},
    },
}


@respx.mock
async def test_search_creates_enriched_book(client):
    respx.get("https://www.googleapis.com/books/v1/volumes").mock(
        return_value=Response(200, json={"items": [VOLUME]})
    )
    resp = await client.get("/api/books/search", params={"q": "darkness"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert len(body) == 1
    b = body[0]
    assert b["external_id"] == "ABC123"
    assert b["source"] == "google_books"
    assert b["description"] == "Prince of Nothing."
    assert b["isbn_13"] == "9781585675340"
    assert b["page_count"] == 577
    assert b["published_year"] == 2003
    assert b["cover_url"].startswith("https://")


@respx.mock
async def test_search_is_idempotent_on_repeat(client):
    respx.get("https://www.googleapis.com/books/v1/volumes").mock(
        return_value=Response(200, json={"items": [VOLUME]})
    )
    first = (await client.get("/api/books/search", params={"q": "darkness"})).json()
    second = (await client.get("/api/books/search", params={"q": "darkness"})).json()
    assert first[0]["id"] == second[0]["id"]  # same DB row, not a duplicate


@respx.mock
async def test_search_auto_maps_genre(client, db_session):
    # Seed the 'fantasy' genre the category should map to.
    from app.models.genre import Genre

    g = Genre(name="Fantasy", slug="fantasy")
    db_session.add(g)
    await db_session.commit()

    respx.get("https://www.googleapis.com/books/v1/volumes").mock(
        return_value=Response(200, json={"items": [VOLUME]})
    )
    body = (await client.get("/api/books/search", params={"q": "darkness"})).json()
    assert body[0]["genre_id"] == str(g.id)


async def test_get_book_includes_shelf_status_for_owner(client, auth_headers, book):
    await client.post(
        f"/api/books/{book.id}/shelf", json={"status": "reading"}, headers=auth_headers
    )
    resp = await client.get(f"/api/books/{book.id}", headers=auth_headers)
    assert resp.json()["shelf_status"] == "reading"


async def test_get_book_shelf_status_null_when_anonymous(client, book):
    resp = await client.get(f"/api/books/{book.id}")
    assert resp.status_code == 200
    assert resp.json()["shelf_status"] is None

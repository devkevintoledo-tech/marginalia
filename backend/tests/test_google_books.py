import pytest
import respx
from httpx import Response

from app.services import google_books as gb

SAMPLE_VOLUME = {
    "id": "ABC123",
    "volumeInfo": {
        "title": "The Darkness That Comes Before",
        "subtitle": "Book One",
        "authors": ["R. Scott Bakker"],
        "publisher": "Overlook Press",
        "publishedDate": "2003-05-01",
        "description": "Prince of Nothing, Book One...",
        "industryIdentifiers": [
            {"type": "ISBN_13", "identifier": "9781585675340"},
            {"type": "ISBN_10", "identifier": "1585675342"},
        ],
        "pageCount": 577,
        "categories": ["Fiction / Fantasy / Epic"],
        "averageRating": 4.0,
        "ratingsCount": 42,
        "maturityRating": "NOT_MATURE",
        "language": "en",
        "previewLink": "http://books.google.com/books?id=ABC123",
        "infoLink": "https://books.google.com/books?id=ABC123",
        "imageLinks": {"thumbnail": "http://books.google.com/x?id=ABC123&zoom=1"},
    },
}


def test_map_volume_extracts_all_fields():
    m = gb._map_volume(SAMPLE_VOLUME)
    assert m["external_id"] == "ABC123"
    assert m["title"] == "The Darkness That Comes Before"
    assert m["subtitle"] == "Book One"
    assert m["author"] == "R. Scott Bakker"
    assert m["publisher"] == "Overlook Press"
    assert m["published_date"].isoformat() == "2003-05-01"
    assert m["published_year"] == 2003
    assert m["isbn_13"] == "9781585675340"
    assert m["page_count"] == 577
    assert m["average_rating"] == 4.0
    assert m["ratings_count"] == 42
    assert m["language"] == "en"
    assert m["categories"] == ["Fiction / Fantasy / Epic"]
    assert m["genre_slug"] == "fantasy"
    assert m["cover_url"].startswith("https://")  # http upgraded


def test_map_volume_handles_missing_optional_fields():
    m = gb._map_volume({"id": "X", "volumeInfo": {"title": "Bare"}})
    assert m["external_id"] == "X"
    assert m["title"] == "Bare"
    assert m["author"] == "Unknown"  # NOT NULL fallback
    assert m["cover_url"] is None
    assert m["published_year"] is None
    assert m["genre_slug"] is None


def test_parse_year_from_year_only_date():
    assert gb._parse_year("1998") == 1998
    assert gb._parse_year(None) is None


@pytest.mark.parametrize(
    "category,slug",
    [
        ("Science Fiction", "science-fiction"),
        ("Fiction / Fantasy / Epic", "fantasy"),
        ("Biography & Autobiography", "biography"),
        ("History / Europe", "history"),
        ("Philosophy", "philosophy"),
        ("Poetry", "poetry"),
        ("True Crime / Murder", "mystery"),
        ("Fiction / Literary", "literary-fiction"),
        ("Cooking", None),
    ],
)
def test_category_to_slug(category, slug):
    assert gb._category_to_slug([category]) == slug


@respx.mock
async def test_search_books_maps_results():
    respx.get("https://www.googleapis.com/books/v1/volumes").mock(
        return_value=Response(200, json={"totalItems": 1, "items": [SAMPLE_VOLUME]})
    )
    results = await gb.search_books("darkness")
    assert len(results) == 1
    assert results[0]["external_id"] == "ABC123"


@respx.mock
async def test_search_books_empty_when_no_items():
    respx.get("https://www.googleapis.com/books/v1/volumes").mock(
        return_value=Response(200, json={"totalItems": 0})
    )
    assert await gb.search_books("zzzz") == []

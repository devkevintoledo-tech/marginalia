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


# ---------------------------------------------------------------------------
# Two-pass relevance: title-weighted search first, broad fallback second.
# ---------------------------------------------------------------------------

def _volume(vid: str, title: str = "T") -> dict:
    return {"id": vid, "volumeInfo": {"title": title}}


def _route_by_query(mapping: dict[str, list[dict]]):
    """respx side_effect: return items keyed by the request's `q` param."""

    def handler(request):
        q = request.url.params.get("q")
        return Response(200, json={"items": mapping.get(q, [])})

    return handler


@respx.mock
async def test_search_books_first_pass_uses_intitle_and_country():
    captured = {}

    def handler(request):
        captured["q"] = request.url.params.get("q")
        captured["country"] = request.url.params.get("country")
        captured["orderBy"] = request.url.params.get("orderBy")
        # Enough title hits → no fallback.
        return Response(200, json={"items": [_volume("a"), _volume("b"), _volume("c")]})

    respx.get("https://www.googleapis.com/books/v1/volumes").mock(side_effect=handler)
    await gb.search_books("wuthering heights")
    assert captured["q"] == "intitle:wuthering heights"
    assert captured["country"] == "US"
    assert captured["orderBy"] == "relevance"


@respx.mock
async def test_search_books_no_fallback_when_enough_title_results():
    route = respx.get("https://www.googleapis.com/books/v1/volumes").mock(
        side_effect=_route_by_query(
            {"intitle:dune": [_volume("a"), _volume("b"), _volume("c")]}
        )
    )
    results = await gb.search_books("dune")
    assert [r["external_id"] for r in results] == ["a", "b", "c"]
    assert route.call_count == 1  # broad pass NOT made


@respx.mock
async def test_search_books_falls_back_to_broad_when_few_title_results():
    route = respx.get("https://www.googleapis.com/books/v1/volumes").mock(
        side_effect=_route_by_query(
            {
                "intitle:emily bronte": [_volume("title1")],
                "emily bronte": [_volume("broad1"), _volume("broad2")],
            }
        )
    )
    results = await gb.search_books("emily bronte")
    assert route.call_count == 2  # both passes made
    # Title hit first, then broad results appended.
    assert [r["external_id"] for r in results] == ["title1", "broad1", "broad2"]


@respx.mock
async def test_search_books_fallback_dedupes_by_external_id():
    respx.get("https://www.googleapis.com/books/v1/volumes").mock(
        side_effect=_route_by_query(
            {
                "intitle:grief": [_volume("shared")],
                "grief": [_volume("shared"), _volume("unique")],
            }
        )
    )
    results = await gb.search_books("grief")
    assert [r["external_id"] for r in results] == ["shared", "unique"]


# ---------------------------------------------------------------------------
# normalize() helper for dedup matching.
# ---------------------------------------------------------------------------


def test_normalize_lowercases_and_collapses_whitespace():
    assert gb.normalize("  The   Hobbit  ") == "the hobbit"


def test_normalize_strips_accents():
    assert gb.normalize("Les Misérables") == "les miserables"


def test_normalize_strips_punctuation():
    assert gb.normalize("Slaughterhouse-Five!") == "slaughterhouse five"


def test_normalize_handles_empty():
    assert gb.normalize("") == ""
    assert gb.normalize(None) == ""


# ---------------------------------------------------------------------------
# _dedup_key() helper for edition grouping.
# ---------------------------------------------------------------------------


def test_dedup_key_combines_title_and_first_author():
    vol = {"title": "The Hobbit", "author": "J.R.R. Tolkien"}
    assert gb._dedup_key(vol) == "the hobbit\x1fj r r tolkien"


def test_dedup_key_uses_only_first_author():
    vol = {"title": "Good Omens", "author": "Terry Pratchett, Neil Gaiman"}
    assert gb._dedup_key(vol) == "good omens\x1fterry pratchett"


def test_dedup_key_none_when_title_missing():
    assert gb._dedup_key({"title": "", "author": "Anyone"}) is None
    assert gb._dedup_key({"title": None, "author": "Anyone"}) is None


# ---------------------------------------------------------------------------
# _completeness_score() helper for representative selection.
# ---------------------------------------------------------------------------


def test_completeness_score_weights_cover_highest():
    with_cover = {"cover_url": "https://x/c.jpg"}
    without = {"description": "d", "isbn_13": "9", "page_count": 1}
    # cover alone (+4) beats three other fields (+3)
    assert gb._completeness_score(with_cover) > gb._completeness_score(without)


def test_completeness_score_sums_fields():
    vol = {
        "cover_url": "https://x/c.jpg",
        "description": "d",
        "isbn_13": "9781585675340",
        "page_count": 200,
        "ratings_count": 10,
    }
    assert gb._completeness_score(vol) == 8  # 4 + 1 + 1 + 1 + 1


def test_completeness_score_ignores_zero_ratings():
    assert gb._completeness_score({"ratings_count": 0}) == 0


def test_completeness_score_empty_volume_is_zero():
    assert gb._completeness_score({}) == 0

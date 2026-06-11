from __future__ import annotations

from datetime import date, datetime
from typing import Any

import httpx

from app.config import settings

# Maps a substring (checked against the lowercased category string) to a seeded
# Genre slug. Order matters — more specific terms first; generic "fiction" last.
_CATEGORY_SLUGS: list[tuple[str, str]] = [
    ("science fiction", "science-fiction"),
    ("fantasy", "fantasy"),
    ("biography", "biography"),
    ("autobiography", "biography"),
    ("history", "history"),
    ("philosophy", "philosophy"),
    ("poetry", "poetry"),
    ("mystery", "mystery"),
    ("detective", "mystery"),
    ("crime", "mystery"),
    ("literary", "literary-fiction"),
    ("fiction", "literary-fiction"),  # generic fiction fallback (last)
]


def _category_to_slug(categories: list[str] | None) -> str | None:
    if not categories:
        return None
    blob = " ".join(categories).lower()
    for needle, slug in _CATEGORY_SLUGS:
        if needle in blob:
            return slug
    return None


def _parse_year(published_date: str | None) -> int | None:
    if not published_date:
        return None
    head = published_date[:4]
    return int(head) if head.isdigit() else None


def _parse_date(published_date: str | None) -> date | None:
    if not published_date:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
        try:
            return datetime.strptime(published_date, fmt).date()
        except ValueError:
            continue
    return None


def _isbn_13(identifiers: list[dict[str, Any]] | None) -> str | None:
    for ident in identifiers or []:
        if ident.get("type") == "ISBN_13":
            return ident.get("identifier")
    return None


def _cover_url(image_links: dict[str, Any] | None) -> str | None:
    if not image_links:
        return None
    url = image_links.get("thumbnail") or image_links.get("smallThumbnail")
    if not url:
        return None
    return url.replace("http://", "https://", 1)


def _map_volume(volume: dict[str, Any]) -> dict[str, Any]:
    info = volume.get("volumeInfo", {})
    authors = info.get("authors") or []
    published = info.get("publishedDate")
    categories = info.get("categories")
    return {
        "external_id": volume.get("id"),
        "source": "google_books",
        "title": info.get("title"),
        "subtitle": info.get("subtitle"),
        "author": ", ".join(authors) if authors else "Unknown",
        "publisher": info.get("publisher"),
        "published_date": _parse_date(published),
        "published_year": _parse_year(published),
        "description": info.get("description"),
        "isbn_13": _isbn_13(info.get("industryIdentifiers")),
        "page_count": info.get("pageCount"),
        "average_rating": info.get("averageRating"),
        "ratings_count": info.get("ratingsCount"),
        "language": info.get("language"),
        "categories": categories,
        "maturity_rating": info.get("maturityRating"),
        "info_link": info.get("infoLink"),
        "preview_link": info.get("previewLink"),
        "cover_url": _cover_url(info.get("imageLinks")),
        "genre_slug": _category_to_slug(categories),
    }


def _params(**extra: Any) -> dict[str, Any]:
    params = dict(extra)
    if settings.GOOGLE_BOOKS_API_KEY:
        params["key"] = settings.GOOGLE_BOOKS_API_KEY
    return params


async def search_books(query: str) -> list[dict[str, Any]]:
    url = f"{settings.GOOGLE_BOOKS_BASE_URL}/volumes"
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            url, params=_params(q=query, maxResults=20, printType="books")
        )
        response.raise_for_status()
        data = response.json()
    return [_map_volume(item) for item in data.get("items", []) if item.get("id")]


async def get_book(volume_id: str) -> dict[str, Any]:
    url = f"{settings.GOOGLE_BOOKS_BASE_URL}/volumes/{volume_id}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, params=_params())
        response.raise_for_status()
        return _map_volume(response.json())

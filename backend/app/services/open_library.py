from __future__ import annotations

from typing import Any

import httpx

from app.config import settings

_COVER_BASE = "https://covers.openlibrary.org/b/id/{cover_id}-M.jpg"


def _extract_cover_url(doc: dict[str, Any]) -> str | None:
    cover_id = None
    if "cover_i" in doc:
        cover_id = doc["cover_i"]
    elif "covers" in doc and doc["covers"]:
        cover_id = doc["covers"][0]
    if cover_id and cover_id != -1:
        return _COVER_BASE.format(cover_id=cover_id)
    return None


async def search_books(query: str) -> list[dict[str, Any]]:
    url = f"{settings.OPEN_LIBRARY_BASE_URL}/search.json"
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, params={"q": query, "limit": 20})
        response.raise_for_status()
        data = response.json()

    results: list[dict[str, Any]] = []
    for doc in data.get("docs", []):
        ol_id = doc.get("key", "")
        # key is like /works/OL123W — extract just the ID portion
        if ol_id.startswith("/works/"):
            ol_id = ol_id[len("/works/"):]

        author_names = doc.get("author_name") or []
        author = ", ".join(author_names) if author_names else None

        results.append(
            {
                "open_library_id": ol_id,
                "title": doc.get("title"),
                "author": author,
                "cover_url": _extract_cover_url(doc),
                "published_year": doc.get("first_publish_year"),
            }
        )
    return results


async def get_book(ol_id: str) -> dict[str, Any]:
    url = f"{settings.OPEN_LIBRARY_BASE_URL}/works/{ol_id}.json"
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        doc = response.json()

    # description may be a string or a dict with "value"
    raw_desc = doc.get("description")
    if isinstance(raw_desc, dict):
        description = raw_desc.get("value")
    else:
        description = raw_desc

    # Authors require separate lookup; provide what's embedded
    authors_field = doc.get("authors") or []
    author = None
    if authors_field:
        # Each entry looks like {"author": {"key": "/authors/OL123A"}}
        author_keys = [
            a.get("author", {}).get("key", "").split("/")[-1]
            for a in authors_field
            if isinstance(a, dict)
        ]
        # Return keys as a best-effort; callers can enrich later
        author = ", ".join(filter(None, author_keys)) or None

    key = doc.get("key", "")
    if key.startswith("/works/"):
        key = key[len("/works/"):]

    published_year = None
    first_sentence = doc.get("first_publish_date")
    if first_sentence and isinstance(first_sentence, str):
        # Try to pull a 4-digit year from the string
        import re
        m = re.search(r"\b(\d{4})\b", first_sentence)
        if m:
            published_year = int(m.group(1))

    return {
        "open_library_id": key or ol_id,
        "title": doc.get("title"),
        "author": author,
        "cover_url": _extract_cover_url(doc),
        "published_year": published_year,
        "description": description,
    }

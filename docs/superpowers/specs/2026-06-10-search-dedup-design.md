# Conservative Duplicate-Edition Dedup — Google Books Search

**Date:** 2026-06-10
**Status:** Approved (design)
**Roadmap item:** Phase 1 — "Duplicate search results" (`ROADMAP.md:46`)

## Problem

Google Books returns multiple editions of the same work as distinct volumes,
each with its own `external_id`. Today `search_books()` returns every volume and
the `/books/search` route upserts each into its own `Book` row, so search
results show the same title several times — often with one good cover/metadata
card buried among thin duplicates.

We want a **conservative display-dedup**: collapse near-certain duplicate
editions into a single best representative, without merging genuinely different
works.

## Decisions

- **Placement:** in `backend/app/services/google_books.py`, applied to the final
  merged list inside `search_books()` (after the two-pass title/broad merge),
  **before** the route upserts. Collapsed editions never become `Book` rows — no
  junk DB rows, no client-side reimplementation.
- **Dedup key:** `normalize(title) + "\x1f" + normalize(first_author)`.
  Conservative — different authors or genuinely different titles stay separate.
- **Winner within a group:** highest metadata-completeness score; ties broken by
  earliest position in Google's relevance order (stable).
- **Order:** the surviving representative keeps the position of its group's first
  member, so overall relevance ordering is preserved.

## Design

All new helpers are pure and unit-testable, added to `google_books.py`.

### `normalize(text: str) -> str`
NFKD-decompose → drop combining marks (strip accents) → lowercase → remove
punctuation → collapse internal whitespace → strip. Empty/`None` → `""`.

### `_dedup_key(volume) -> str | None`
- `title = volume.get("title")`; if falsy → return `None` (volume is passed
  through untouched, never grouped).
- `first_author = volume.get("author", "").split(",")[0]` (the normalized dict
  already joins authors with `", "`, or stores `"Unknown"`).
- Return `f"{normalize(title)}\x1f{normalize(first_author)}"`.

### `_completeness_score(volume) -> int`
Weighted sum, favoring a usable card:
- `cover_url` present → **+4**
- `description` present → +1
- `isbn_13` present → +1
- `page_count` present → +1
- `ratings_count` truthy (> 0) → +1

### `_dedup_volumes(volumes: list[dict]) -> list[dict]`
Single pass preserving first-seen order:
- For each volume, compute `_dedup_key`.
  - Key is `None` → emit the volume in place (keyless volumes never grouped).
  - First time a key is seen → record its output position and keep the volume.
  - Key seen again → compare `_completeness_score`; if the new volume scores
    **strictly higher**, replace the representative at the recorded position;
    otherwise discard it. (Strictly-higher ⇒ ties keep the earlier/more-relevant
    volume.)
- Return the surviving representatives in their recorded positions.

### Wiring
`search_books()` returns `_dedup_volumes(merged)` instead of `merged`. No change
to `books.py`, schemas, or the database.

## Testing (pytest, `respx`-mocked — never hit the network)

Unit tests on the pure helpers plus an integration test through
`search_books()`:

1. Same title + author, one volume richer (has cover/description) → one result,
   the richer one survives.
2. Accent / case / punctuation variants of the same title collapse to one.
3. Same title, different authors → both kept.
4. Title-less volume → passed through, not dropped.
5. Ordering: a duplicate whose richer twin appears **later** still surfaces at
   the earlier position; surrounding non-dups keep relevance order.
6. Score tie → earliest (more relevant) volume kept.

## Out of scope (YAGNI)

- Cross-search or DB-wide dedup (only within a single result set).
- Fuzzy / Levenshtein title matching.
- Subtitle handling in the key.
- ISBN-based splitting of editions.

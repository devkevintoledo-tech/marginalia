# Search Dedup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse near-certain duplicate editions in Google Books search results into a single best representative, inside the service layer before the route upserts.

**Architecture:** Three pure helpers (`normalize`, `_dedup_key`, `_completeness_score`) plus a single-pass `_dedup_volumes` are added to `app/services/google_books.py`. `search_books()` returns `_dedup_volumes(merged)`. No route, schema, or DB change. Helpers operate on the already-normalized volume dicts (keys: `title`, `author`, `cover_url`, `description`, `isbn_13`, `page_count`, `ratings_count`, `external_id`).

**Tech Stack:** Python 3, httpx, pytest (`asyncio_mode=auto`), respx for HTTP mocking.

**Spec:** `docs/superpowers/specs/2026-06-10-search-dedup-design.md`

**Test command (from `backend/`):**
```bash
DATABASE_URL=postgresql+asyncpg://marginalia:marginalia@localhost:5432/marginalia_test pytest tests/test_google_books.py -v
```
(Pure-helper tests don't touch the DB, but the conftest may import DB settings, so keep the env var.)

---

### Task 1: `normalize()` — canonicalize a string for matching

**Files:**
- Modify: `backend/app/services/google_books.py`
- Test: `backend/tests/test_google_books.py`

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_google_books.py`:

```python
def test_normalize_lowercases_and_collapses_whitespace():
    assert gb.normalize("  The   Hobbit  ") == "the hobbit"


def test_normalize_strips_accents():
    assert gb.normalize("Les Misérables") == "les miserables"


def test_normalize_strips_punctuation():
    assert gb.normalize("Slaughterhouse-Five!") == "slaughterhouse five"


def test_normalize_handles_empty():
    assert gb.normalize("") == ""
    assert gb.normalize(None) == ""
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_google_books.py -k normalize -v`
Expected: FAIL with `AttributeError: module 'app.services.google_books' has no attribute 'normalize'`

- [ ] **Step 3: Implement `normalize`**

Add near the top of `google_books.py`, after the existing imports add `import re` and `import unicodedata`, then define:

```python
def normalize(text: str | None) -> str:
    """Canonicalize a string for duplicate matching.

    NFKD-strip accents, lowercase, drop punctuation, collapse whitespace.
    """
    if not text:
        return ""
    decomposed = unicodedata.normalize("NFKD", text)
    no_accents = "".join(c for c in decomposed if not unicodedata.combining(c))
    lowered = no_accents.lower()
    no_punct = re.sub(r"[^\w\s]", " ", lowered)
    return re.sub(r"\s+", " ", no_punct).strip()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_google_books.py -k normalize -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/google_books.py backend/tests/test_google_books.py
git commit -m "feat(search): add normalize() helper for dedup matching"
```

---

### Task 2: `_dedup_key()` — group key from title + first author

**Files:**
- Modify: `backend/app/services/google_books.py`
- Test: `backend/tests/test_google_books.py`

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_google_books.py`:

```python
def test_dedup_key_combines_title_and_first_author():
    vol = {"title": "The Hobbit", "author": "J.R.R. Tolkien"}
    assert gb._dedup_key(vol) == "the hobbit\x1fj r r tolkien"


def test_dedup_key_uses_only_first_author():
    vol = {"title": "Good Omens", "author": "Terry Pratchett, Neil Gaiman"}
    assert gb._dedup_key(vol) == "good omens\x1fterry pratchett"


def test_dedup_key_none_when_title_missing():
    assert gb._dedup_key({"title": "", "author": "Anyone"}) is None
    assert gb._dedup_key({"title": None, "author": "Anyone"}) is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_google_books.py -k dedup_key -v`
Expected: FAIL with `AttributeError: ... has no attribute '_dedup_key'`

- [ ] **Step 3: Implement `_dedup_key`**

Add to `google_books.py` (use `\x1f`, the ASCII unit separator, so a title and author can never collide across the boundary):

```python
def _dedup_key(volume: dict[str, Any]) -> str | None:
    """Group key for duplicate editions: normalized title + first author.

    Returns None when there is no title — such volumes are never grouped.
    """
    title = volume.get("title")
    if not title:
        return None
    first_author = (volume.get("author") or "").split(",")[0]
    return f"{normalize(title)}\x1f{normalize(first_author)}"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_google_books.py -k dedup_key -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/google_books.py backend/tests/test_google_books.py
git commit -m "feat(search): add _dedup_key() for edition grouping"
```

---

### Task 3: `_completeness_score()` — rank metadata richness

**Files:**
- Modify: `backend/app/services/google_books.py`
- Test: `backend/tests/test_google_books.py`

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_google_books.py`:

```python
def test_completeness_score_weights_cover_highest():
    with_cover = {"cover_url": "https://x/c.jpg"}
    without = {"description": "d", "isbn_13": "9", "page_count": 1, "ratings_count": 5}
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_google_books.py -k completeness -v`
Expected: FAIL with `AttributeError: ... has no attribute '_completeness_score'`

- [ ] **Step 3: Implement `_completeness_score`**

Add to `google_books.py`:

```python
def _completeness_score(volume: dict[str, Any]) -> int:
    """Higher = richer, more useful result card. Cover is weighted highest."""
    score = 0
    if volume.get("cover_url"):
        score += 4
    if volume.get("description"):
        score += 1
    if volume.get("isbn_13"):
        score += 1
    if volume.get("page_count"):
        score += 1
    if volume.get("ratings_count"):  # truthy ⇒ > 0
        score += 1
    return score
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_google_books.py -k completeness -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/google_books.py backend/tests/test_google_books.py
git commit -m "feat(search): add _completeness_score() for representative selection"
```

---

### Task 4: `_dedup_volumes()` — collapse groups, preserve order

**Files:**
- Modify: `backend/app/services/google_books.py`
- Test: `backend/tests/test_google_books.py`

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_google_books.py`:

```python
def _vol(ext_id, title, author, **extra):
    return {"external_id": ext_id, "title": title, "author": author, **extra}


def test_dedup_keeps_richer_of_two_editions():
    thin = _vol("a", "The Hobbit", "J.R.R. Tolkien")
    rich = _vol("b", "The Hobbit", "J.R.R. Tolkien", cover_url="https://x/c.jpg")
    out = gb._dedup_volumes([thin, rich])
    assert [v["external_id"] for v in out] == ["a"]  # position of first member
    assert out[0]["cover_url"] == "https://x/c.jpg"  # but richer content wins


def test_dedup_collapses_accent_and_case_variants():
    a = _vol("a", "Les Misérables", "Victor Hugo")
    b = _vol("b", "les miserables", "victor hugo", cover_url="https://x/c.jpg")
    out = gb._dedup_volumes([a, b])
    assert len(out) == 1


def test_dedup_keeps_different_authors_separate():
    a = _vol("a", "Ulysses", "James Joyce")
    b = _vol("b", "Ulysses", "Alfred Tennyson")
    out = gb._dedup_volumes([a, b])
    assert {v["external_id"] for v in out} == {"a", "b"}


def test_dedup_passes_through_title_less_volumes():
    a = _vol("a", "", "Nobody")
    b = _vol("b", None, "Nobody")
    out = gb._dedup_volumes([a, b])
    assert [v["external_id"] for v in out] == ["a", "b"]


def test_dedup_preserves_relevance_order_and_position():
    first = _vol("a", "Dune", "Frank Herbert")  # thin, but appears first
    middle = _vol("b", "Hyperion", "Dan Simmons")
    dup = _vol("c", "Dune", "Frank Herbert", cover_url="https://x/c.jpg")  # richer, later
    out = gb._dedup_volumes([first, middle, dup])
    # Dune surfaces at position 0 (first member's slot) with richer content;
    # Hyperion keeps its relative order.
    assert [v["external_id"] for v in out] == ["a", "b"]
    assert out[0]["cover_url"] == "https://x/c.jpg"


def test_dedup_tie_keeps_earlier_volume():
    a = _vol("a", "1984", "George Orwell", cover_url="https://x/a.jpg")
    b = _vol("b", "1984", "George Orwell", cover_url="https://x/b.jpg")
    out = gb._dedup_volumes([a, b])
    assert [v["external_id"] for v in out] == ["a"]
    assert out[0]["cover_url"] == "https://x/a.jpg"  # tie ⇒ earlier kept
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_google_books.py -k dedup_ -v`
Expected: FAIL with `AttributeError: ... has no attribute '_dedup_volumes'`

- [ ] **Step 3: Implement `_dedup_volumes`**

Add to `google_books.py`:

```python
def _dedup_volumes(volumes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Collapse duplicate editions to the richest representative per group.

    Order is preserved: each surviving volume keeps the output position of its
    group's first member. Title-less volumes are never grouped. On a score tie
    the earlier (more relevant) volume is kept.
    """
    out: list[dict[str, Any]] = []
    positions: dict[str, int] = {}  # key -> index in `out`
    for volume in volumes:
        key = _dedup_key(volume)
        if key is None or key not in positions:
            if key is not None:
                positions[key] = len(out)
            out.append(volume)
            continue
        idx = positions[key]
        if _completeness_score(volume) > _completeness_score(out[idx]):
            out[idx] = volume
    return out
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_google_books.py -k dedup_ -v`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/google_books.py backend/tests/test_google_books.py
git commit -m "feat(search): add _dedup_volumes() collapsing duplicate editions"
```

---

### Task 5: Wire `_dedup_volumes` into `search_books()`

**Files:**
- Modify: `backend/app/services/google_books.py` (the `search_books` function)
- Test: `backend/tests/test_google_books.py`

- [ ] **Step 1: Write the failing integration test**

Append to `backend/tests/test_google_books.py`. This mocks the Google Books API and asserts `search_books` returns deduped results. The title-pass returns 2 duplicate editions; since that is `< _MIN_TITLE_RESULTS` (3), a broad pass also fires — mock both. Use the existing respx pattern from this file / `test_books.py`.

```python
def _api_volume(ext_id, title, author, *, cover=False):
    info = {"title": title, "authors": [author]}
    if cover:
        info["imageLinks"] = {"thumbnail": f"http://books.google.com/x?id={ext_id}"}
    return {"id": ext_id, "volumeInfo": info}


@respx.mock
@pytest.mark.asyncio
async def test_search_books_dedups_editions():
    base = gb.settings.GOOGLE_BOOKS_BASE_URL
    title_payload = {
        "items": [
            _api_volume("a", "The Hobbit", "J.R.R. Tolkien"),
            _api_volume("b", "The Hobbit", "J.R.R. Tolkien", cover=True),
        ]
    }
    # Two title hits (< _MIN_TITLE_RESULTS) ⇒ broad pass also runs.
    broad_payload = {"items": [_api_volume("c", "Hobbit Companion", "Other Author")]}

    route = respx.get(f"{base}/volumes")
    route.side_effect = [
        Response(200, json=title_payload),
        Response(200, json=broad_payload),
    ]

    results = await gb.search_books("the hobbit")
    ids = [r["external_id"] for r in results]
    assert ids == ["a", "c"]  # b collapsed into a's slot; c (different work) kept
    assert results[0]["cover_url"] is not None  # richer edition's data won
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_google_books.py::test_search_books_dedups_editions -v`
Expected: FAIL — `ids == ["a", "b", "c"]` (no dedup yet), assertion error.

- [ ] **Step 3: Wire dedup into `search_books`**

In `google_books.py`, change the tail of `search_books`. Currently:

```python
    seen = {r["external_id"] for r in title_results}
    merged = list(title_results)
    merged.extend(r for r in broad_results if r["external_id"] not in seen)
    return merged
```

becomes:

```python
    seen = {r["external_id"] for r in title_results}
    merged = list(title_results)
    merged.extend(r for r in broad_results if r["external_id"] not in seen)
    return _dedup_volumes(merged)
```

Also apply dedup on the early-return title-only path. Currently:

```python
        title_results = await _query_volumes(client, f"intitle:{query}")
        if len(title_results) >= _MIN_TITLE_RESULTS:
            return title_results
```

becomes:

```python
        title_results = await _query_volumes(client, f"intitle:{query}")
        if len(title_results) >= _MIN_TITLE_RESULTS:
            return _dedup_volumes(title_results)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_google_books.py::test_search_books_dedups_editions -v`
Expected: PASS

- [ ] **Step 5: Run the full service + route test files**

Run:
```bash
pytest tests/test_google_books.py tests/test_books.py -v
```
Expected: PASS (all). If any pre-existing `test_books.py` search test asserted a specific count that included a duplicate, update it to reflect the deduped count and note it in the commit.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/google_books.py backend/tests/test_google_books.py
git commit -m "feat(search): dedup duplicate editions in search_books output"
```

---

### Task 6: Update the roadmap

**Files:**
- Modify: `ROADMAP.md:46`

- [ ] **Step 1: Mark the item done**

Change the Phase 1 "Duplicate search results" row's status from `⬜` to `✅` and tighten the description to past tense, e.g.:

```markdown
| ✅ | **Duplicate search results** — service-layer display-dedup collapses duplicate editions by normalized (title, first author), keeping the richest-metadata representative and preserving relevance order. | `backend/app/services/google_books.py` |
```

- [ ] **Step 2: Commit**

```bash
git add ROADMAP.md
git commit -m "docs: mark search dedup done in roadmap"
```

---

## Self-Review Notes

- **Spec coverage:** placement (Task 5), dedup key (Task 2), completeness score (Task 3), order-preserving collapse + tie-break + title-less pass-through (Task 4), all six spec test cases mapped across Tasks 1–5.
- **Type consistency:** helper names (`normalize`, `_dedup_key`, `_completeness_score`, `_dedup_volumes`) used identically in tests and wiring; all operate on the normalized volume dict shape produced by `_map_volume`.
- **Out of scope (per spec):** no DB/route/schema changes, no fuzzy matching, no ISBN splitting, no subtitle in key.

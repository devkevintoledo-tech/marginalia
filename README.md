# Marginalia

A social reading platform for serious book discussion — Reddit-style threaded debate meets a Goodreads-style catalog, with a design closer to Letterboxd. No inflated reviews, no sanitized book clubs: just honest, threaded conversation anchored to specific books and genres.

**Target user:** opinionated readers who currently split their time between Goodreads (catalog) and Reddit (discussion) because nothing does both well.

> `marginalia_spec.md` is the authoritative product/design spec. The current code is an early scaffold generated from it — the spec describes intent, and some parts of the code are still incompletely wired (see [Known gaps](#known-gaps)).

## Tech stack

| Layer | Choice |
|---|---|
| Backend | FastAPI (async, Python) |
| Database | PostgreSQL |
| ORM / migrations | SQLAlchemy 2.0 + Alembic |
| Auth | Email/password (JWT, bcrypt) + Google OAuth (Authlib) |
| Book data | [Open Library API](https://openlibrary.org/developers/api) |
| Frontend | React 18 (Vite) + React Router |
| Styling | Tailwind CSS |
| State | React Query (server state) + Zustand (client state) |

## Quick start

Everything runs via Docker Compose from the repo root:

```bash
docker compose up --build
```

This starts three services:

| Service | URL |
|---|---|
| PostgreSQL | `localhost:5432` |
| Backend (FastAPI) | http://localhost:8000 (docs at `/docs`) |
| Frontend (Vite) | http://localhost:5173 |

Alembic migrations are applied automatically before the backend starts. The frontend proxies `/api` → `http://localhost:8000` in dev.

Useful commands:

```bash
docker compose logs -f backend     # tail backend logs
docker compose exec backend bash   # shell into the backend container
```

## Architecture

```
backend/app/
  models/    SQLAlchemy 2.0 ORM (DeclarativeBase). __init__ imports every model
             so Base.metadata is complete.
  schemas/   Pydantic v2 request/response shapes. ORM models are never exposed directly.
  services/  Business logic, no FastAPI types — open_library.py (HTTP client),
             auth.py (JWT, bcrypt, get_current_user).
  api/       Thin route handlers; each module owns an APIRouter, wired in main.py.
  config.py  Settings from env / .env.   database.py  Async engine + get_db.

frontend/src/
  api/       axios hooks; client.js sets baseURL '/api' and injects the bearer token.
  store/     Zustand auth store (token + user).
  pages/     Home, Login, Register, Book, Genre, Thread, Profile, Search, NotFound.
  components/
```

The backend is **async end-to-end** — routes, services, and DB access all use `async`/`await`. All routers are mounted under `/api`; the only non-`/api` route is `GET /`.

### Core data models

`User`, `Book`, `Genre`, `Shelf` (a user's book with `want_to_read` / `reading` / `read` status), `Thread` (anchored to exactly one of a book or a genre), and `Post` (threaded replies). See `marginalia_spec.md` for full field definitions.

### Key API routes

```
POST   /api/auth/register | login | logout
GET    /api/auth/me
GET    /api/auth/google   /api/auth/google/callback
GET    /api/books/search?q=...        GET /api/books/{id}
GET    /api/books/{id}/threads
POST   /api/books/{id}/shelf  PUT/DELETE  /api/books/{id}/shelf
GET    /api/genres/   /api/genres/{slug}  /api/genres/{slug}/books  /{slug}/threads
POST   /api/threads/   GET /api/threads/{id}   POST /api/threads/{id}/upvote
POST   /api/posts/     POST /api/posts/{id}/upvote
GET    /api/users/{username}
```

## Testing

There is no linter/formatter configured yet. Always run tests before claiming they pass.

**Backend — pytest** (async, httpx `ASGITransport`). Tests run against a separate `marginalia_test` database, build the schema with `Base.metadata.create_all`, and mock Open Library with `respx` (never hit the network). From `backend/`:

```bash
docker compose up -d db
docker compose exec db psql -U marginalia -c "CREATE DATABASE marginalia_test;"   # one-time
DATABASE_URL=postgresql+asyncpg://marginalia:marginalia@localhost:5432/marginalia_test pytest
```

**Frontend unit — Vitest + React Testing Library** (jsdom). From `frontend/`:

```bash
npm test            # vitest run
npm run test:watch
```

**E2E — Playwright** (drives the full stack). From `frontend/`, with `docker compose up` running in another terminal:

```bash
npx playwright install   # one-time
npm run test:e2e
```

## Migrations

The schema is owned entirely by Alembic migrations (not `create_all` at runtime). From `backend/` or `docker compose exec backend`:

```bash
alembic revision --autogenerate -m "message"
alembic upgrade head
alembic downgrade -1
```

After changing a model, autogenerate a migration and review it. When a migration adds a SQLAlchemy `Enum`, add an explicit type drop in `downgrade()` (autogenerate omits it, which breaks re-upgrade) — see the initial migration for the pattern.

## Environment

The backend reads (see `backend/.env.example` and the `backend` service in `docker-compose.yml`):

`DATABASE_URL`, `SECRET_KEY`, `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional, OAuth), `OPEN_LIBRARY_BASE_URL`, `APP_NAME`.

## Development workflow

Feature work is delegated to focused subagents in `.claude/agents/`: `backend-dev`, `frontend-dev`, `test-engineer`, `code-reviewer`. The phased feature plan lives in [`ROADMAP.md`](ROADMAP.md) (Phase 0 — test/hardening foundations — is the current focus). See [`CLAUDE.md`](CLAUDE.md) for conventions and gotchas.

## Known gaps

- **Shelf uniqueness not enforced** — the spec mandates `UNIQUE (user_id, book_id)` on `shelves`, but the model has no such constraint yet. Add a `UniqueConstraint` and a migration if you rely on one shelf entry per user/book.
- Parts of the scaffold are still incompletely wired against the spec.

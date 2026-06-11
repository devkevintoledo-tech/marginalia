# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Marginalia — a social reading platform (Reddit-style threaded book discussion + Goodreads-style catalog). FastAPI + PostgreSQL backend, React (Vite) frontend. `marginalia_spec.md` is the authoritative product/design spec; the current code is an early scaffold generated from it, so the spec describes intent while parts of the code are still incompletely wired (see Known gaps below).

## Commands

Everything runs via Docker Compose from the repo root:

```bash
docker compose up --build        # db (5432) + backend (8000) + frontend (5173)
docker compose logs -f backend   # tail backend logs
docker compose exec backend bash # shell into backend
```

Backend (inside `backend/`, or via `docker compose exec backend`):

```bash
uvicorn app.main:app --reload                          # run API (compose does this for you)
alembic revision --autogenerate -m "message"           # create a migration
alembic upgrade head                                    # apply migrations
alembic downgrade -1                                    # roll back one
```

Frontend (inside `frontend/`):

```bash
npm run dev        # vite dev server
npm run build      # production build
```

### Testing

A test pyramid exists; there is no linter/formatter configured yet. Always run tests before claiming they pass.

**Backend — pytest** (async, `asyncio_mode=auto`, httpx `ASGITransport`). Tests run against a **separate `marginalia_test` database** so they never touch dev data; the schema is built with `Base.metadata.create_all` (not Alembic) per test, and Google Books must be mocked (`respx`) — never hit the network. From `backend/`:

```bash
docker compose up -d db                                                   # Postgres must be running
docker compose exec db psql -U marginalia -c "CREATE DATABASE marginalia_test;"   # one-time
DATABASE_URL=postgresql+asyncpg://marginalia:marginalia@localhost:5432/marginalia_test pytest
```

**Frontend unit — Vitest + React Testing Library** (jsdom). From `frontend/`:

```bash
npm test            # vitest run
npm run test:watch  # watch mode
```

**E2E — Playwright** drives the real app and needs the full stack up. From `frontend/`:

```bash
docker compose up --build      # in another terminal
npx playwright install         # one-time
npm run test:e2e               # auth flow is network-free; thread/reply use live Google Books search
```

### Subagents & roadmap

Feature work is delegated to focused subagents in `.claude/agents/`: `backend-dev`, `frontend-dev`, `test-engineer`, and `code-reviewer`. The phased feature plan lives in `ROADMAP.md` (Phase 0 = test/hardening foundations is the current focus).

## Architecture

### Backend (`backend/app/`)
Async end-to-end FastAPI app. The layering is strict:

- **`models/`** — SQLAlchemy 2.0 ORM (`DeclarativeBase` in `models/base.py`). `models/__init__.py` imports every model so `Base.metadata` is fully populated — always import models through the package or this `__init__` so metadata stays complete.
- **`schemas/`** — Pydantic v2 request/response models. Keep API I/O shapes here, never expose ORM models directly.
- **`services/`** — business logic with no FastAPI types. `google_books.py` is the Google Books HTTP client (httpx, parses the Volumes API into a normalized dict; optional `GOOGLE_BOOKS_API_KEY`, keyless fallback); `auth.py` holds JWT (python-jose, HS256), bcrypt password hashing, and the `get_current_user` / `get_current_user_optional` dependencies.
- **`api/`** — thin route handlers. Each module owns an `APIRouter(prefix=...)` and is wired in `main.py`.
- **`config.py`** — `Settings` (pydantic-settings) loaded from env / `.env`. `database.py` — async engine + `get_db` dependency (a session that auto-commits on success, rolls back on exception).

**Everything is async**: routes, services, and DB access use `async`/`await`. DB sessions come from `Depends(get_db)`; query with `await db.execute(select(...))` then `.scalar_one_or_none()` / `.scalars()`. The DB URL is rewritten at runtime to the `postgresql+asyncpg://` driver in both `database.py` and `alembic/env.py` — keep those two rewrites in sync.

Auth flow: register/login issue a JWT (`sub` = user id); protected routes depend on `get_current_user`, which decodes the bearer token and loads the `User`. Google OAuth uses Authlib and requires `SessionMiddleware` (already added in `main.py`).

### Frontend (`frontend/src/`)
Vite + React 18 + React Router + Tailwind.
- **`api/`** — axios-based API hooks. All requests go through `api/client.js`, whose axios instance has `baseURL: '/api'` and injects the bearer token from the Zustand auth store.
- **`store/auth.js`** — Zustand client-state store (token + user).
- React Query is the intended server-state layer (`@tanstack/react-query` is a dependency).
- `vite.config.js` proxies `/api` → `http://localhost:8000` in dev.

## Conventions & gotchas

- **API prefix**: all routers are mounted under `/api` in `main.py` (each router keeps its own resource prefix, e.g. `/api/auth/login`, `/api/genres/`). This matches the frontend's axios `baseURL: '/api'` and the vite dev proxy. New routers must be `include_router(..., prefix="/api")` and registered in `main.py`. The only non-`/api` route is `GET /` (returns the app name).
- **Schema = Alembic, not `create_all`**: the schema is owned entirely by Alembic migrations in `alembic/versions/` (the initial one creates all six tables). `main.py` does **not** call `create_all` — run `alembic upgrade head` (compose does this automatically before uvicorn). After changing a model, autogenerate a migration and review it.
- **Enum drops in migrations**: SQLAlchemy `Enum` columns implicitly `CREATE TYPE` on upgrade but autogenerate does **not** drop the type on downgrade, which breaks re-upgrade ("type already exists"). When a migration adds an enum, add an explicit `sa.Enum(name='...').drop(op.get_bind(), checkfirst=True)` in `downgrade()` (see the initial migration for the pattern).
- **Async DB URL rewrite**: the `postgresql+asyncpg://` driver rewrite is duplicated in `database.py` and `alembic/env.py` — keep both in sync.

## Known remaining gaps

- **Shelf uniqueness not enforced**: the spec mandates `UNIQUE (user_id, book_id)` on `shelves`, but `models/shelf.py` has no such constraint (so neither does the migration). Add a `UniqueConstraint` and a migration if you rely on one shelf entry per user/book.

## Environment

Backend reads env vars (see `backend/.env.example` and the `backend` service in `docker-compose.yml`): `DATABASE_URL`, `SECRET_KEY`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (optional, for OAuth), `GOOGLE_BOOKS_BASE_URL`, `GOOGLE_BOOKS_API_KEY` (optional; keyless fallback), `APP_NAME`.

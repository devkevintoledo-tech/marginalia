# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Marginalia — a social reading platform (Reddit-style threaded book discussion + Goodreads-style catalog). FastAPI + PostgreSQL backend, React (Vite) frontend. `marginalia_spec.md` is the authoritative product/design spec. The code is a functionally complete v1 MVP with a test suite and CI, but the spec still describes intent ahead of the code in places (see Known gaps below and `ROADMAP.md`).

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

A test pyramid exists; there is no linter/formatter configured yet. Always run tests before claiming they pass. `.github/workflows/ci.yml` runs backend + frontend unit tests on every push/PR and the e2e suite nightly.

**Backend — pytest** (async, `asyncio_mode=auto`, httpx `ASGITransport`). Tests run against a **separate `marginalia_test` database** so they never touch dev data; the schema is built with `Base.metadata.create_all` (not Alembic) per test, and Google Books must be mocked (`respx`) — never hit the network. Email likewise never leaves the process: override `email_sender_dep` with a fake `EmailSender` to capture the reset URL (see `tests/test_password_reset.py`). From `backend/`:

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
- **`services/`** — business logic with no FastAPI types. `google_books.py` is the Google Books HTTP client (httpx, parses the Volumes API into a normalized dict; optional `GOOGLE_BOOKS_API_KEY`, keyless fallback; two-pass title-weighted search, edition dedup, cover-URL upgrade); `auth.py` holds JWT (python-jose, HS256), bcrypt password hashing, reset-token generation/hashing, and the `get_current_user` / `get_current_user_optional` dependencies; `email.py` provides the `EmailSender` ABC with SMTP and console implementations.
- **`scripts/`** — standalone maintenance entrypoints run with `python -m scripts.<name>` (e.g. `backfill_cover_urls`). They open their own session via `AsyncSessionLocal` and must stay idempotent.
- **`api/`** — thin route handlers. Each module owns an `APIRouter(prefix=...)` and is wired in `main.py`.
- **`config.py`** — `Settings` (pydantic-settings) loaded from env / `.env`. `database.py` — async engine + `get_db` dependency (a session that auto-commits on success, rolls back on exception).

**Everything is async**: routes, services, and DB access use `async`/`await`. DB sessions come from `Depends(get_db)`; query with `await db.execute(select(...))` then `.scalar_one_or_none()` / `.scalars()`. The DB URL is rewritten at runtime to the `postgresql+asyncpg://` driver in both `database.py` and `alembic/env.py` — keep those two rewrites in sync.

Auth flow: register/login issue a JWT (`sub` = user id); protected routes depend on `get_current_user`, which decodes the bearer token and loads the `User`. Google OAuth uses Authlib and requires `SessionMiddleware` (already added in `main.py`).

**Password reset** (`POST /auth/forgot-password` → `/auth/reset-password`): only the token's SHA-256 hash is persisted (`password_reset_tokens`), so a leaked row can't be replayed; the raw token only exists in the emailed link. Preserve these properties when touching the flow — the forgot endpoint returns an identical response whether or not the account exists (anti-enumeration) and only issues tokens for `AuthProvider.email` accounts with a password hash, and it commits the token row *before* sending the email so a failed commit can't produce a live link. Tokens are single-use (`used_at`) and expire after `PASSWORD_RESET_TOKEN_TTL_MINUTES`.

**Email**: routes depend on `email_sender_dep`, never on a concrete sender — that's the seam tests override via `app.dependency_overrides`. `get_email_sender()` picks `SmtpEmailSender` when `SMTP_HOST` is set and `ConsoleEmailSender` (logs the link) otherwise, so local dev needs no SMTP server.

### Frontend (`frontend/src/`)
Vite + React 18 + React Router + Tailwind.
- **`api/`** — axios-based API hooks. All requests go through `api/client.js`, whose axios instance has `baseURL: '/api'`, injects the bearer token from the Zustand auth store, and clears that store on any 401 response (it does not redirect — routes/components decide what to render). `api/errors.js` exports `errorMessage()`, which normalizes both FastAPI error shapes (`detail` as a string, or a 422 array of `{msg}`) into one display string — use it instead of hand-reading `error.response.data`.
- **`store/auth.js`** — Zustand client-state store (token + user), wrapped in `persist` (localStorage key `marginalia-auth`). `App.jsx` calls `useMe()` on mount to revalidate the persisted token against `/auth/me` and refresh stale user data.
- React Query is the server-state layer — the `api/` modules expose `useQuery`/`useMutation` hooks; components should consume those rather than calling `client` directly.
- `vite.config.js` proxies `/api` → `http://localhost:8000` in dev.

## Conventions & gotchas

- **API prefix**: all routers are mounted under `/api` in `main.py` (each router keeps its own resource prefix, e.g. `/api/auth/login`, `/api/genres/`). This matches the frontend's axios `baseURL: '/api'` and the vite dev proxy. New routers must be `include_router(..., prefix="/api")` and registered in `main.py`. The only non-`/api` route is `GET /` (returns the app name).
- **Schema = Alembic, not `create_all`**: the schema is owned entirely by Alembic migrations in `alembic/versions/` (the initial one creates all six tables). `main.py` does **not** call `create_all` — run `alembic upgrade head` (compose does this automatically before uvicorn). After changing a model, autogenerate a migration and review it.
- **Enum drops in migrations**: SQLAlchemy `Enum` columns implicitly `CREATE TYPE` on upgrade but autogenerate does **not** drop the type on downgrade, which breaks re-upgrade ("type already exists"). When a migration adds an enum, add an explicit `sa.Enum(name='...').drop(op.get_bind(), checkfirst=True)` in `downgrade()` (see the initial migration for the pattern).
- **Async DB URL rewrite**: the `postgresql+asyncpg://` driver rewrite is duplicated in `database.py` and `alembic/env.py` — keep both in sync.

## Known remaining gaps

- **No token revocation**: `POST /auth/logout` is a stateless no-op — the frontend just clears the persisted JWT, and a stolen token stays valid until expiry. A password reset does not invalidate existing sessions either. Anything relying on server-side session invalidation needs a refresh/denylist design first.
- Content is immutable (no edit/delete for threads or posts) and upvotes only increment. See `ROADMAP.md` for the tracked list.

## Environment

Backend reads env vars (see `backend/.env.example` and the `backend` service in `docker-compose.yml`):

- Core: `DATABASE_URL`, `SECRET_KEY`, `APP_NAME`
- OAuth (optional): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Book data: `GOOGLE_BOOKS_BASE_URL`, `GOOGLE_BOOKS_API_KEY` (optional; keyless fallback)
- Email (optional — no `SMTP_HOST` means reset links are logged, not sent): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_USE_TLS`, `MAIL_FROM`
- Password reset: `FRONTEND_BASE_URL` (base of the emailed link), `PASSWORD_RESET_TOKEN_TTL_MINUTES`

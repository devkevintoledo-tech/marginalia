from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.base import Base  # noqa: F401 — ensure metadata loaded
from app.schemas.book import BookOut, ShelfIn
from app.services import open_library
from app.services.auth import get_current_user

# ---------------------------------------------------------------------------
# Lazy model imports — models live in app/models/ but we reference them by
# class name to avoid circular import issues at module load time.
# ---------------------------------------------------------------------------
from app.models.book import Book  # type: ignore[import]
from app.models.genre import Genre  # type: ignore[import]  # noqa: F401
from app.models.shelf import Shelf  # type: ignore[import]
from app.models.thread import Thread  # type: ignore[import]

router = APIRouter(prefix="/books", tags=["books"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_book_or_404(book_id: int, db: AsyncSession) -> Book:
    result = await db.get(Book, book_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return result


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/search", response_model=list[BookOut])
async def search_books(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    """Search Open Library and upsert results into the local DB."""
    ol_results = await open_library.search_books(q)

    books: list[Book] = []
    for item in ol_results:
        ol_id = item.get("open_library_id")
        if not ol_id:
            continue

        # Check if already in DB
        stmt = select(Book).where(Book.open_library_id == ol_id)
        existing = (await db.execute(stmt)).scalars().first()

        if existing:
            # Update mutable fields in case OL data improved
            existing.title = item.get("title") or existing.title
            existing.author = item.get("author") or existing.author
            existing.cover_url = item.get("cover_url") or existing.cover_url
            existing.published_year = item.get("published_year") or existing.published_year
            books.append(existing)
        else:
            book = Book(
                open_library_id=ol_id,
                title=item.get("title"),
                author=item.get("author"),
                cover_url=item.get("cover_url"),
                published_year=item.get("published_year"),
            )
            db.add(book)
            await db.flush()  # get generated id
            books.append(book)

    await db.flush()
    return books


@router.get("/{book_id}", response_model=BookOut)
async def get_book(
    book_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await _get_book_or_404(book_id, db)


@router.get("/{book_id}/threads")
async def get_book_threads(
    book_id: int,
    db: AsyncSession = Depends(get_db),
):
    await _get_book_or_404(book_id, db)
    stmt = (
        select(Thread)
        .where(Thread.book_id == book_id)
        .order_by(Thread.upvotes.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/{book_id}/shelf", status_code=status.HTTP_201_CREATED)
async def add_to_shelf(
    book_id: int,
    payload: ShelfIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await _get_book_or_404(book_id, db)

    # Prevent duplicate shelf entries
    stmt = select(Shelf).where(
        Shelf.user_id == current_user.id,
        Shelf.book_id == book_id,
    )
    existing = (await db.execute(stmt)).scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Book already on shelf. Use PUT to update.",
        )

    shelf = Shelf(user_id=current_user.id, book_id=book_id, status=payload.status)
    db.add(shelf)
    await db.flush()
    return shelf


@router.put("/{book_id}/shelf")
async def update_shelf(
    book_id: int,
    payload: ShelfIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    stmt = select(Shelf).where(
        Shelf.user_id == current_user.id,
        Shelf.book_id == book_id,
    )
    shelf = (await db.execute(stmt)).scalars().first()
    if shelf is None:
        raise HTTPException(status_code=404, detail="Shelf entry not found")

    shelf.status = payload.status
    await db.flush()
    return shelf


@router.delete("/{book_id}/shelf", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_shelf(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    stmt = select(Shelf).where(
        Shelf.user_id == current_user.id,
        Shelf.book_id == book_id,
    )
    shelf = (await db.execute(stmt)).scalars().first()
    if shelf is None:
        raise HTTPException(status_code=404, detail="Shelf entry not found")

    await db.delete(shelf)

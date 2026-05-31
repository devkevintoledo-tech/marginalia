from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.book import BookOut, GenreOut
from app.models.book import Book  # type: ignore[import]
from app.models.genre import Genre  # type: ignore[import]
from app.models.thread import Thread  # type: ignore[import]

router = APIRouter(prefix="/genres", tags=["genres"])


async def _get_genre_or_404(slug: str, db: AsyncSession) -> Genre:
    stmt = select(Genre).where(Genre.slug == slug)
    genre = (await db.execute(stmt)).scalars().first()
    if genre is None:
        raise HTTPException(status_code=404, detail="Genre not found")
    return genre


@router.get("/", response_model=list[GenreOut])
async def list_genres(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Genre).order_by(Genre.name))
    return result.scalars().all()


@router.get("/{slug}", response_model=GenreOut)
async def get_genre(slug: str, db: AsyncSession = Depends(get_db)):
    return await _get_genre_or_404(slug, db)


@router.get("/{slug}/books", response_model=list[BookOut])
async def get_genre_books(slug: str, db: AsyncSession = Depends(get_db)):
    genre = await _get_genre_or_404(slug, db)
    stmt = select(Book).where(Book.genre_id == genre.id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{slug}/threads")
async def get_genre_threads(slug: str, db: AsyncSession = Depends(get_db)):
    genre = await _get_genre_or_404(slug, db)
    stmt = (
        select(Thread)
        .where(Thread.genre_id == genre.id)
        .order_by(Thread.upvotes.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()

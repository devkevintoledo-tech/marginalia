from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.shelf import ShelfStatus


class BookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    source: str
    external_id: str
    title: str | None
    subtitle: str | None = None
    author: str | None
    cover_url: str | None
    description: str | None
    publisher: str | None = None
    published_date: date | None = None
    published_year: int | None
    isbn_13: str | None = None
    page_count: int | None = None
    average_rating: float | None = None
    ratings_count: int | None = None
    language: str | None = None
    categories: list[str] | None = None
    maturity_rating: str | None = None
    info_link: str | None = None
    preview_link: str | None = None
    genre_id: UUID | None
    shelf_status: ShelfStatus | None = None


class GenreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    description: str | None


class ShelfIn(BaseModel):
    status: Literal["want_to_read", "reading", "read"]


class ShelfOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    book_id: UUID
    status: ShelfStatus
    created_at: datetime

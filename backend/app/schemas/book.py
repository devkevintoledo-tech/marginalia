from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.shelf import ShelfStatus


class BookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    open_library_id: str
    title: str | None
    author: str | None
    cover_url: str | None
    description: str | None
    published_year: int | None
    genre_id: UUID | None


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

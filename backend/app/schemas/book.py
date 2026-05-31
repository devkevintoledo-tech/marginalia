from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict


class BookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    open_library_id: str
    title: str | None
    author: str | None
    cover_url: str | None
    description: str | None
    published_year: int | None
    genre_id: int | None


class GenreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None


class ShelfIn(BaseModel):
    status: Literal["want_to_read", "reading", "read"]

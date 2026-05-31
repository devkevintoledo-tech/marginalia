from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, model_validator


class ThreadCreate(BaseModel):
    title: str
    book_id: UUID | None = None
    genre_id: UUID | None = None

    @model_validator(mode="after")
    def exactly_one_target(self) -> "ThreadCreate":
        has_book = self.book_id is not None
        has_genre = self.genre_id is not None
        if has_book == has_genre:  # both set or neither set
            raise ValueError("Exactly one of book_id or genre_id must be provided.")
        return self


class ThreadOut(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    title: str
    user_id: UUID
    book_id: UUID | None
    genre_id: UUID | None
    upvotes: int
    created_at: datetime


class PostCreate(BaseModel):
    thread_id: UUID
    content: str
    parent_id: UUID | None = None


class PostOut(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    thread_id: UUID
    user_id: UUID
    parent_id: UUID | None
    content: str
    upvotes: int
    created_at: datetime
    updated_at: datetime
    replies: list["PostOut"] = []


PostOut.model_rebuild()

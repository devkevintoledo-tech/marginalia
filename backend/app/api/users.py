from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.shelf import Shelf, ShelfStatus
from app.models.user import User
from app.schemas.user import UserOut

router = APIRouter(prefix="/users", tags=["users"])


class ShelvesGrouped:
    want_to_read: list
    reading: list
    read: list


from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class ShelfBookOut(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    book_id: UUID
    status: str
    created_at: datetime


class UserWithShelves(UserOut):
    shelves: dict[str, list[ShelfBookOut]] = {
        "want_to_read": [],
        "reading": [],
        "read": [],
    }


@router.get("/{username}", response_model=UserWithShelves)
async def get_user_profile(
    username: str,
    db: AsyncSession = Depends(get_db),
) -> UserWithShelves:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    shelves_result = await db.execute(select(Shelf).where(Shelf.user_id == user.id))
    shelves = shelves_result.scalars().all()

    grouped: dict[str, list[ShelfBookOut]] = {
        "want_to_read": [],
        "reading": [],
        "read": [],
    }
    for shelf in shelves:
        shelf_out = ShelfBookOut.model_validate(shelf)
        grouped[shelf.status.value].append(shelf_out)

    user_out = UserWithShelves.model_validate(user)
    user_out.shelves = grouped
    return user_out

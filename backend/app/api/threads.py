from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.thread import Thread
from app.models.post import Post
from app.models.user import User
from app.schemas.thread import PostOut, ThreadCreate, ThreadOut
from app.services.auth import get_current_user

router = APIRouter(prefix="/threads", tags=["threads"])


@router.post("/", response_model=ThreadOut, status_code=status.HTTP_201_CREATED)
async def create_thread(
    payload: ThreadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ThreadOut:
    # ThreadCreate validator already enforces XOR; no extra check needed here.
    thread = Thread(
        title=payload.title,
        user_id=current_user.id,
        book_id=payload.book_id,
        genre_id=payload.genre_id,
    )
    db.add(thread)
    await db.flush()
    await db.refresh(thread)
    return ThreadOut.model_validate(thread)


class ThreadWithPosts(ThreadOut):
    posts: list[PostOut] = []


@router.get("/{id}", response_model=ThreadWithPosts)
async def get_thread(
    id: UUID,
    db: AsyncSession = Depends(get_db),
) -> ThreadWithPosts:
    result = await db.execute(select(Thread).where(Thread.id == id))
    thread = result.scalar_one_or_none()
    if thread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    # Fetch top-level posts (no parent)
    top_result = await db.execute(
        select(Post).where(Post.thread_id == id, Post.parent_id.is_(None))
    )
    top_posts = top_result.scalars().all()

    # Fetch replies for each top-level post
    posts_out: list[PostOut] = []
    for post in top_posts:
        replies_result = await db.execute(
            select(Post).where(Post.parent_id == post.id)
        )
        replies = replies_result.scalars().all()
        post_out = PostOut.model_validate(post)
        post_out.replies = [PostOut.model_validate(r) for r in replies]
        posts_out.append(post_out)

    thread_out = ThreadWithPosts.model_validate(thread)
    thread_out.posts = posts_out
    return thread_out


@router.post("/{id}/upvote", response_model=ThreadOut)
async def upvote_thread(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ThreadOut:
    result = await db.execute(select(Thread).where(Thread.id == id))
    thread = result.scalar_one_or_none()
    if thread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    thread.upvotes += 1
    await db.flush()
    await db.refresh(thread)
    return ThreadOut.model_validate(thread)

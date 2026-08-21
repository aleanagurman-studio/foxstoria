from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Author, Genre, Story, StoryStatus, StoryType
from app.schemas import (
    AuthorListItem,
    AuthorListResponse,
    GenreBrief,
    StoryCreate,
    StoryListItem,
    StoryListResponse,
    StorySort,
)

router = APIRouter(prefix="/api")


def _sort_clause(sort: StorySort):
    mapping = {
        StorySort.POPULAR: Story.play_count.desc(),
        StorySort.RATING: Story.rating_avg.desc(),
        StorySort.NEW: Story.published_at.desc().nullslast(),
        StorySort.PLAY_COUNT: Story.play_count.desc(),
    }
    return mapping[sort]


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/genres", response_model=list[GenreBrief])
async def list_genres(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Genre).order_by(Genre.name))
    return result.scalars().all()


@router.get("/stories", response_model=StoryListResponse)
async def list_stories(
    db: Annotated[AsyncSession, Depends(get_db)],
    story_type: StoryType | None = None,
    genre: str | None = None,
    age_rating: str | None = None,
    is_paid: bool | None = None,
    is_completed: bool | None = None,
    q: str | None = None,
    sort: StorySort = StorySort.POPULAR,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    query = (
        select(Story)
        .where(Story.status == StoryStatus.PUBLISHED)
        .options(
            selectinload(Story.author),
            selectinload(Story.genres),
        )
    )

    if story_type:
        query = query.where(Story.story_type == story_type)
    if age_rating:
        query = query.where(Story.age_rating == age_rating)
    if is_paid is not None:
        query = query.where(Story.is_paid == is_paid)
    if is_completed is not None:
        query = query.where(Story.is_completed == is_completed)
    if q:
        query = query.where(Story.title.ilike(f"%{q}%"))
    if genre:
        query = query.join(Story.genres).where(Genre.slug == genre)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(_sort_clause(sort)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().unique().all()

    return StoryListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/stories", response_model=StoryListItem, status_code=201)
async def create_story(payload: StoryCreate, db: AsyncSession = Depends(get_db)):
    author = await db.get(Author, payload.author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    base_slug = slugify(payload.title)
    slug = base_slug
    suffix = 1
    while (await db.execute(select(Story.id).where(Story.slug == slug))).scalar_one_or_none():
        slug = f"{base_slug}-{suffix}"
        suffix += 1

    story = Story(
        title=payload.title,
        slug=slug,
        description=payload.description,
        story_type=payload.story_type,
        age_rating=payload.age_rating,
        author_id=payload.author_id,
        cover_url=payload.cover_url,
        is_paid=payload.is_paid,
        price=payload.price,
        scene_count=payload.scene_count,
        endings_count=payload.endings_count,
        chapter_count=payload.chapter_count,
        is_completed=payload.is_completed,
        status=StoryStatus.PUBLISHED,
    )

    if payload.genre_slugs:
        genres_result = await db.execute(select(Genre).where(Genre.slug.in_(payload.genre_slugs)))
        story.genres = list(genres_result.scalars().all())

    db.add(story)
    author.story_count += 1
    await db.commit()
    await db.refresh(story, ["author", "genres"])
    return story


@router.get("/authors", response_model=AuthorListResponse)
async def list_authors(
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str | None = None,
    sort: str = Query("rating", pattern="^(rating|stories|followers|name)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
):
    query = select(Author)
    if q:
        query = query.where(
            Author.display_name.ilike(f"%{q}%") | Author.username.ilike(f"%{q}%")
        )

    sort_map = {
        "rating": Author.rating_avg.desc(),
        "stories": Author.story_count.desc(),
        "followers": Author.follower_count.desc(),
        "name": Author.display_name.asc(),
    }
    query = query.order_by(sort_map[sort])

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    items = result.scalars().all()

    return AuthorListResponse(items=items, total=total)

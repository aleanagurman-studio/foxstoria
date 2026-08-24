from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import (
    AgeRating,
    Author,
    ContentWarning,
    Fandom,
    Genre,
    Kink,
    RomanceOrientation,
    Story,
    StoryCredit,
    StoryCreditRole,
    StoryStatus,
    StoryType,
    WorkFormat,
    work_size_for_chapters,
)
from app.schemas import (
    AuthorBrief,
    AuthorListItem,
    AuthorListResponse,
    FandomBrief,
    GenreBrief,
    LabelBrief,
    StoryCreate,
    StoryListItem,
    StoryListResponse,
    StorySort,
    TaxonomyResponse,
)

router = APIRouter(prefix="/api")

# Public catalog only. Author studio (characters, notes, timeline, summaries)
# is never returned from these routes.
# Public work card fields ARE returned: title, credits, age, fandom, romance,
# description, author notes, status, size.


def _sort_clause(sort: StorySort):
    mapping = {
        StorySort.POPULAR: Story.play_count.desc(),
        StorySort.RATING: Story.rating_avg.desc(),
        StorySort.NEW: Story.published_at.desc().nullslast(),
        StorySort.PLAY_COUNT: Story.play_count.desc(),
    }
    return mapping[sort]


def _story_item(story: Story) -> StoryListItem:
    editor = None
    coauthors: list[AuthorBrief] = []
    for credit in story.credits:
        brief = AuthorBrief.model_validate(credit.author)
        if credit.role == StoryCreditRole.EDITOR:
            editor = brief
        elif credit.role == StoryCreditRole.COAUTHOR:
            coauthors.append(brief)
    return StoryListItem(
        id=story.id,
        title=story.title,
        slug=story.slug,
        description=story.description,
        author_notes=story.author_notes,
        cover_url=story.cover_url,
        story_type=story.story_type,
        age_rating=story.age_rating,
        romance=story.romance,
        fandom=FandomBrief.model_validate(story.fandom),
        work_size=story.work_size,
        is_paid=story.is_paid,
        price=story.price,
        rating_avg=story.rating_avg,
        rating_count=story.rating_count,
        play_count=story.play_count,
        scene_count=story.scene_count,
        endings_count=story.endings_count,
        chapter_count=story.chapter_count,
        is_completed=story.is_completed,
        author=AuthorBrief.model_validate(story.author),
        editor=editor,
        coauthors=coauthors,
        genres=[GenreBrief.model_validate(g) for g in story.genres],
        formats=[LabelBrief.model_validate(item) for item in story.formats],
        warnings=[LabelBrief.model_validate(item) for item in story.warnings],
        kinks=[LabelBrief.model_validate(item) for item in story.kinks] if story.age_rating == AgeRating.EIGHTEEN else [],
        published_at=story.published_at,
    )


def _story_load():
    return (
        selectinload(Story.author),
        selectinload(Story.genres),
        selectinload(Story.formats),
        selectinload(Story.warnings),
        selectinload(Story.kinks),
        selectinload(Story.fandom),
        selectinload(Story.credits).selectinload(StoryCredit.author),
    )


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/taxonomy", response_model=TaxonomyResponse)
async def list_taxonomy(db: AsyncSession = Depends(get_db)):
    genres = (await db.execute(select(Genre).order_by(Genre.name))).scalars().all()
    formats = (await db.execute(select(WorkFormat).order_by(WorkFormat.name))).scalars().all()
    warnings = (await db.execute(select(ContentWarning).order_by(ContentWarning.name))).scalars().all()
    kinks = (await db.execute(select(Kink).order_by(Kink.name))).scalars().all()
    return TaxonomyResponse(genres=genres, formats=formats, warnings=warnings, kinks=kinks)


@router.get("/genres", response_model=list[GenreBrief])
async def list_genres(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Genre).order_by(Genre.name))
    return result.scalars().all()


@router.get("/fandoms", response_model=list[FandomBrief])
async def list_fandoms(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Fandom).order_by(Fandom.name))
    return result.scalars().all()


@router.get("/stories", response_model=StoryListResponse)
async def list_stories(
    db: Annotated[AsyncSession, Depends(get_db)],
    story_type: StoryType | None = None,
    genre: str | None = None,
    work_format: str | None = Query(None, alias="format"),
    warning: str | None = None,
    kink: str | None = None,
    fandom: str | None = None,
    romance: RomanceOrientation | None = None,
    age_rating: AgeRating | None = None,
    is_paid: bool | None = None,
    is_completed: bool | None = None,
    q: str | None = None,
    sort: StorySort = StorySort.POPULAR,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    query = select(Story).where(Story.status == StoryStatus.PUBLISHED).options(*_story_load())

    if story_type:
        query = query.where(Story.story_type == story_type)
    if age_rating:
        query = query.where(Story.age_rating == age_rating)
    if romance:
        query = query.where(Story.romance == romance)
    if is_paid is not None:
        query = query.where(Story.is_paid == is_paid)
    if is_completed is not None:
        query = query.where(Story.is_completed == is_completed)
    if q:
        query = query.where(Story.title.ilike(f"%{q}%"))
    if genre:
        query = query.join(Story.genres).where(Genre.slug == genre)
    if work_format:
        query = query.join(Story.formats).where(WorkFormat.slug == work_format)
    if warning:
        query = query.join(Story.warnings).where(ContentWarning.slug == warning)
    if kink:
        query = query.join(Story.kinks).where(Kink.slug == kink)
    if fandom:
        query = query.join(Story.fandom).where(Fandom.slug == fandom)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(_sort_clause(sort)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().unique().all()

    return StoryListResponse(
        items=[_story_item(story) for story in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/stories", response_model=StoryListItem, status_code=201)
async def create_story(payload: StoryCreate, db: AsyncSession = Depends(get_db)):
    author = await db.get(Author, payload.author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    fandom = (
        await db.execute(select(Fandom).where(Fandom.slug == payload.fandom_slug))
    ).scalar_one_or_none()
    if not fandom:
        raise HTTPException(status_code=400, detail="Fandom is required")

    base_slug = slugify(payload.title)
    slug = base_slug
    suffix = 1
    while (await db.execute(select(Story.id).where(Story.slug == slug))).scalar_one_or_none():
        slug = f"{base_slug}-{suffix}"
        suffix += 1

    work_size = work_size_for_chapters(payload.chapter_count) if payload.is_completed else None

    story = Story(
        title=payload.title,
        slug=slug,
        description=payload.description,
        author_notes=payload.author_notes,
        story_type=payload.story_type,
        age_rating=payload.age_rating,
        romance=payload.romance,
        fandom_id=fandom.id,
        work_size=work_size,
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

    if payload.kink_slugs and payload.age_rating != AgeRating.EIGHTEEN:
        raise HTTPException(status_code=400, detail="Kinks are only allowed on 18+ works")

    if payload.genre_slugs:
        genres_result = await db.execute(select(Genre).where(Genre.slug.in_(payload.genre_slugs)))
        story.genres = list(genres_result.scalars().all())
    if payload.format_slugs:
        formats_result = await db.execute(select(WorkFormat).where(WorkFormat.slug.in_(payload.format_slugs)))
        story.formats = list(formats_result.scalars().all())
    if payload.warning_slugs:
        warnings_result = await db.execute(select(ContentWarning).where(ContentWarning.slug.in_(payload.warning_slugs)))
        story.warnings = list(warnings_result.scalars().all())
    if payload.kink_slugs:
        kinks_result = await db.execute(select(Kink).where(Kink.slug.in_(payload.kink_slugs)))
        story.kinks = list(kinks_result.scalars().all())

    db.add(story)
    await db.flush()

    db.add(
        StoryCredit(author_id=payload.author_id, story_id=story.id, role=StoryCreditRole.OWNER)
    )
    if payload.editor_id:
        editor = await db.get(Author, payload.editor_id)
        if not editor:
            raise HTTPException(status_code=404, detail="Editor not found")
        db.add(
            StoryCredit(author_id=payload.editor_id, story_id=story.id, role=StoryCreditRole.EDITOR)
        )
    for coauthor_id in payload.coauthor_ids:
        coauthor = await db.get(Author, coauthor_id)
        if not coauthor:
            raise HTTPException(status_code=404, detail="Co-author not found")
        db.add(
            StoryCredit(author_id=coauthor_id, story_id=story.id, role=StoryCreditRole.COAUTHOR)
        )

    author.story_count += 1
    await db.commit()

    loaded = await db.execute(select(Story).where(Story.id == story.id).options(*_story_load()))
    return _story_item(loaded.scalar_one())


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

"""Site-facing work cards: catalog, cabinet, editor JSON."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

from urllib.parse import unquote

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from slugify import slugify
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.ficbook import FicbookError, scrape_ficbook
from app.staff import STAFF_USERS
from app.models.entities import StoryFormat, StoryGenre, StoryKink, StoryWarning
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
    StoryLike,
    StoryStatus,
    StoryType,
    WorkFormat,
    WorkSize,
    work_size_for_chapters,
)

router = APIRouter()

DEFAULT_AUTHOR = "moonwander"
RESERVED_USERNAMES = {"foxstoria", "foxstoria-support", "admin", "support", "moderator", "help"}


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


def _age_from_ui(value: Any) -> AgeRating:
    raw = str(value or "").strip().lower()
    if raw in ("16+", "16"):
        return AgeRating.SIXTEEN
    if raw in ("18+", "18"):
        return AgeRating.EIGHTEEN
    return AgeRating.NONE


def _age_to_ui(age: AgeRating) -> str:
    if age == AgeRating.SIXTEEN:
        return "16+"
    if age == AgeRating.EIGHTEEN:
        return "18+"
    return "0+"


def _romance_from_ui(value: Any) -> RomanceOrientation:
    raw = str(value or "").strip().lower()
    mapping = {item.value: item for item in RomanceOrientation}
    return mapping.get(raw, RomanceOrientation.GEN)


def _type_from_ui(value: Any) -> StoryType:
    raw = str(value or "").strip().lower()
    if raw == "linear":
        return StoryType.LINEAR
    if raw == "messenger":
        return StoryType.MESSENGER
    return StoryType.INTERACTIVE


def _listed(card: dict) -> bool:
    if card.get("listed") is True:
        return str(card.get("status") or "") != "draft"
    if card.get("listed") is False or str(card.get("status") or "") == "draft":
        return False
    return True


def _parse_card_json(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def story_to_card(story: Story) -> dict:
    extra = _parse_card_json(story.card_json)
    listed = story.status == StoryStatus.PUBLISHED
    status = extra.get("status")
    if not status:
        if story.is_completed:
            status = "completed"
        elif listed:
            status = "in_progress"
        else:
            status = "draft"
    work_id = str(story.id)
    genres = extra.get("genres") or [g.slug for g in story.genres]
    formats = extra.get("formats") or [item.slug for item in story.formats]
    warnings = extra.get("warnings") or [item.slug for item in story.warnings]
    kinks = extra.get("kinks") or [item.slug for item in story.kinks]
    fandoms = extra.get("fandoms")
    if not fandoms:
        fandoms = [story.fandom.slug] if story.fandom else ["original"]
    created = extra.get("createdAt") or (story.created_at.isoformat() if story.created_at else "")
    published = extra.get("publishedAt") or (
        story.published_at.isoformat() if story.published_at else created
    )
    updated = extra.get("updatedAt") or (
        (story.published_at or story.created_at).isoformat() if story.created_at else ""
    )
    cover = extra.get("cover") or story.cover_url or ""
    return {
        **extra,
        "id": work_id,
        "title": story.title,
        "story_type": story.story_type.value,
        "romance": extra.get("romance") or story.romance.value,
        "age": extra.get("age") or _age_to_ui(story.age_rating),
        "description": story.description or extra.get("description") or "",
        "author_notes": story.author_notes or extra.get("author_notes") or "",
        "status": status,
        "listed": listed,
        "is_completed": bool(story.is_completed or status == "completed"),
        "fandoms": fandoms,
        "fandom": extra.get("fandom") or (story.fandom.name if story.fandom else "Ориджинал"),
        "genres": genres,
        "formats": formats,
        "warnings": warnings,
        "kinks": kinks,
        "cover": cover,
        "author": extra.get("author") or story.author.display_name,
        "author_slug": extra.get("author_slug") or story.author.username,
        "href": f"story.html?id={work_id}",
        "likes": int(extra.get("likes") or 0),
        "likesWeek": int(extra.get("likesWeek") or extra.get("likes_week") or 0),
        "plays": int(story.play_count or extra.get("plays") or 0),
        "role": extra.get("role") or "author",
        "createdAt": created,
        "publishedAt": published,
        "updatedAt": updated,
        "work_size": extra.get("work_size") or (story.work_size.value if story.work_size else None),
        "planned_size": extra.get("planned_size") or extra.get("work_size") or "mini",
    }


async def like_stats_by_id(db: AsyncSession, ids: list[int]) -> dict[int, tuple[int, int]]:
    if not ids:
        return {}
    since = datetime.now(timezone.utc) - timedelta(days=7)
    totals = {
        int(row[0]): int(row[1])
        for row in (
            await db.execute(
                select(StoryLike.story_id, func.count())
                .where(StoryLike.story_id.in_(ids))
                .group_by(StoryLike.story_id)
            )
        ).all()
    }
    weeks = {
        int(row[0]): int(row[1])
        for row in (
            await db.execute(
                select(StoryLike.story_id, func.count())
                .where(StoryLike.story_id.in_(ids), StoryLike.created_at >= since)
                .group_by(StoryLike.story_id)
            )
        ).all()
    }
    return {story_id: (totals.get(story_id, 0), weeks.get(story_id, 0)) for story_id in ids}


async def with_like_stats(db: AsyncSession, works: list[dict]) -> list[dict]:
    ids: list[int] = []
    for work in works:
        try:
            ids.append(int(work["id"]))
        except (TypeError, ValueError, KeyError):
            work.setdefault("likesWeek", int(work.get("likes_week") or 0))
    stats = await like_stats_by_id(db, ids)
    for work in works:
        try:
            story_id = int(work["id"])
        except (TypeError, ValueError, KeyError):
            continue
        total, week = stats.get(story_id, (0, 0))
        if total:
            work["likes"] = total
        work["likesWeek"] = week
        work["likes_week"] = week
    return works


async def card_with_likes(db: AsyncSession, story: Story) -> dict:
    cards = await with_like_stats(db, [story_to_card(story)])
    return cards[0]


def authors_from_works(works: list[dict]) -> list[dict]:
    by_slug: dict[str, dict] = {}
    for work in works:
        slug = str(work.get("author_slug") or work.get("author") or "").strip()
        if not slug:
            continue
        cur = by_slug.get(slug) or {
            "name": work.get("author") or slug,
            "display_name": work.get("author") or slug,
            "slug": slug,
            "story_count": 0,
            "works": 0,
            "followers": 0,
            "avatar": "",
            "href": f"profile.html?u={slug}",
        }
        cur["story_count"] = int(cur.get("story_count") or 0) + 1
        cur["works"] = cur["story_count"]
        by_slug[slug] = cur
    return list(by_slug.values())


def norm_username(value: str | None) -> str:
    return unquote(str(value or "")).lstrip("@").strip().lower()


def norm_display_name(value: str | None) -> str:
    return " ".join(unquote(str(value or "")).split())


async def find_author_by_username(db: AsyncSession, handle: str | None) -> Author | None:
    username = norm_username(handle)
    if not username:
        return None
    return (
        await db.execute(select(Author).where(func.lower(Author.username) == username))
    ).scalar_one_or_none()


async def username_taken(db: AsyncSession, handle: str, exclude_id: int | None = None) -> bool:
    username = norm_username(handle)
    if not username:
        return True
    rows = (await db.execute(select(Author.id, Author.username))).all()
    for author_id, value in rows:
        if exclude_id is not None and author_id == exclude_id:
            continue
        if norm_username(value) == username:
            return True
    return False


async def display_name_taken(db: AsyncSession, name: str, exclude_id: int | None = None) -> bool:
    label = norm_display_name(name).lower()
    if not label:
        return True
    rows = (await db.execute(select(Author.id, Author.display_name))).all()
    for author_id, value in rows:
        if exclude_id is not None and author_id == exclude_id:
            continue
        if norm_display_name(value).lower() == label:
            return True
    return False


async def get_author(
    db: AsyncSession,
    handle: str | None,
    display_name: str | None = None,
) -> Author:
    username = norm_username(handle) or DEFAULT_AUTHOR
    author = await find_author_by_username(db, username)
    if author:
        return author
    author = Author(
        username=username,
        display_name=norm_display_name(display_name) or "Вы",
        story_count=0,
        follower_count=0,
    )
    db.add(author)
    await db.flush()
    return author


async def get_or_create_fandom(db: AsyncSession, card: dict) -> Fandom:
    slugs = card.get("fandoms") if isinstance(card.get("fandoms"), list) else []
    slug = str(slugs[0] if slugs else card.get("fandom_slug") or "original").strip() or "original"
    if slug in ("Ориджинал", "ориджинал"):
        slug = "original"
    fandom = (await db.execute(select(Fandom).where(Fandom.slug == slug))).scalar_one_or_none()
    if fandom:
        return fandom
    name = str(card.get("fandom") or slug)
    fandom = (await db.execute(select(Fandom).where(Fandom.name == name))).scalar_one_or_none()
    if fandom:
        return fandom
    fandom = Fandom(name=name if name != slug else slug, slug=slugify(slug) or "original")
    existing = (await db.execute(select(Fandom).where(Fandom.slug == fandom.slug))).scalar_one_or_none()
    if existing:
        return existing
    db.add(fandom)
    await db.flush()
    return fandom


async def resolve_labels(db: AsyncSession, model, values: list | None):
    slugs = [str(item).strip() for item in (values or []) if str(item).strip()]
    if not slugs:
        return []
    found = (await db.execute(select(model).where(model.slug.in_(slugs)))).scalars().all()
    have = {item.slug for item in found}
    missing = [item for item in slugs if item not in have]
    if missing:
        by_name = (await db.execute(select(model).where(model.name.in_(missing)))).scalars().all()
        found = list(found) + list(by_name)
        have = {item.slug for item in found}
        still = [item for item in slugs if item not in have]
        if still and model is WorkFormat:
            known = {
                "perevod-raboty-s-inostrannogo-yazyka": (
                    "Перевод работы с иностранного языка",
                    "Работа является переводом. В примечании автора укажите ссылку на оригинальную работу.",
                )
            }
            for slug in still:
                name, desc = known.get(slug, (None, None))
                if not name:
                    continue
                row = WorkFormat(name=name, slug=slug, description=desc)
                db.add(row)
                found.append(row)
            await db.flush()
    return list(found)


async def unique_slug(db: AsyncSession, title: str, exclude_id: int | None = None) -> str:
    base = slugify(title) or "untitled"
    slug = base
    suffix = 1
    while True:
        query = select(Story.id).where(Story.slug == slug)
        if exclude_id is not None:
            query = query.where(Story.id != exclude_id)
        if not (await db.execute(query)).scalar_one_or_none():
            return slug
        slug = f"{base}-{suffix}"
        suffix += 1


async def apply_card(db: AsyncSession, story: Story, card: dict, author: Author) -> None:
    title = str(card.get("title") or "").strip() or "Без названия"
    listed = _listed(card)
    completed = bool(card.get("is_completed") or card.get("status") == "completed")
    age = _age_from_ui(card.get("age"))
    story.title = title
    story.slug = await unique_slug(db, title, exclude_id=story.id)
    story.description = str(card.get("description") or "") or None
    story.author_notes = str(card.get("author_notes") or "") or None
    story.story_type = _type_from_ui(card.get("story_type"))
    story.age_rating = age
    story.romance = _romance_from_ui(card.get("romance"))
    story.fandom = await get_or_create_fandom(db, card)
    story.is_completed = completed
    story.status = StoryStatus.PUBLISHED if listed else StoryStatus.DRAFT
    if listed and not story.published_at:
        story.published_at = datetime.now(timezone.utc)
    if not listed:
        story.published_at = None
    planned = str(card.get("planned_size") or card.get("work_size") or "")
    if completed and planned in {item.value for item in WorkSize}:
        story.work_size = WorkSize(planned)
    elif completed:
        story.work_size = work_size_for_chapters(story.chapter_count or 1)
    else:
        story.work_size = None
    cover = str(card.get("cover") or "")
    story.cover_url = cover if cover and not cover.startswith("data:") else None
    story.author = author
    public = {key: value for key, value in card.items() if key != "id"}
    public["id"] = str(story.id) if story.id else card.get("id")
    story.card_json = json.dumps(public, ensure_ascii=False)
    if story.id:
        await replace_m2m(db, story, card, age)


async def replace_m2m(db: AsyncSession, story: Story, card: dict, age: AgeRating) -> None:
    genres = await resolve_labels(db, Genre, card.get("genres"))
    formats = await resolve_labels(db, WorkFormat, card.get("formats"))
    warnings = await resolve_labels(db, ContentWarning, card.get("warnings"))
    kinks = await resolve_labels(db, Kink, card.get("kinks")) if age == AgeRating.EIGHTEEN else []
    await db.execute(delete(StoryGenre).where(StoryGenre.story_id == story.id))
    await db.execute(delete(StoryFormat).where(StoryFormat.story_id == story.id))
    await db.execute(delete(StoryWarning).where(StoryWarning.story_id == story.id))
    await db.execute(delete(StoryKink).where(StoryKink.story_id == story.id))
    for item in genres:
        db.add(StoryGenre(story_id=story.id, genre_id=item.id))
    for item in formats:
        db.add(StoryFormat(story_id=story.id, format_id=item.id))
    for item in warnings:
        db.add(StoryWarning(story_id=story.id, warning_id=item.id))
    for item in kinks:
        db.add(StoryKink(story_id=story.id, kink_id=item.id))


def deny_if_blocked(author: Author) -> None:
    if author.blocked_at and author.username not in STAFF_USERS:
        raise HTTPException(
            status_code=403,
            detail="Профиль заблокирован. Работы сохранены. Напишите в поддержку, чтобы обжаловать.",
        )


async def load_story(db: AsyncSession, story_id: int) -> Story:
    loaded = await db.execute(select(Story).where(Story.id == story_id).options(*_story_load()))
    story = loaded.scalar_one_or_none()
    if not story or story.deleted_at:
        raise HTTPException(status_code=404, detail="Work not found")
    return story


@router.get("/me")
async def me(
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    author = await get_author(db, x_fox_author, x_fox_name)
    await db.commit()
    return {
        "id": author.id,
        "username": author.username,
        "display_name": author.display_name,
    }


@router.get("/catalog")
async def catalog(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Story)
        .where(Story.status == StoryStatus.PUBLISHED, Story.deleted_at.is_(None))
        .options(*_story_load())
        .order_by(Story.published_at.desc().nullslast())
    )
    works = await with_like_stats(db, [story_to_card(story) for story in result.scalars().unique().all()])
    return {"works": works, "authors": authors_from_works(works)}


@router.get("/works")
async def list_mine(
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    author = await get_author(db, x_fox_author, x_fox_name)
    result = await db.execute(
        select(Story)
        .where(Story.author_id == author.id, Story.deleted_at.is_(None))
        .options(*_story_load())
        .order_by(Story.id.desc())
    )
    return {
        "works": await with_like_stats(
            db, [story_to_card(story) for story in result.scalars().unique().all()]
        )
    }


@router.get("/works/{work_id}")
async def get_work(work_id: int, db: AsyncSession = Depends(get_db)):
    return await card_with_likes(db, await load_story(db, work_id))


@router.post("/works", status_code=201)
async def create_work(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    author = await get_author(db, x_fox_author or payload.get("author_slug"), x_fox_name or payload.get("author"))
    deny_if_blocked(author)
    story = Story(
        title=str(payload.get("title") or "").strip() or "Без названия",
        slug=await unique_slug(db, str(payload.get("title") or "untitled")),
        story_type=_type_from_ui(payload.get("story_type")),
        status=StoryStatus.DRAFT,
        author=author,
        fandom=await get_or_create_fandom(db, payload),
    )
    db.add(story)
    await apply_card(db, story, payload, author)
    await db.flush()
    age = _age_from_ui(payload.get("age"))
    await replace_m2m(db, story, payload, age)
    db.add(StoryCredit(author_id=author.id, story_id=story.id, role=StoryCreditRole.OWNER))
    card = _parse_card_json(story.card_json)
    card["id"] = str(story.id)
    story.card_json = json.dumps(card, ensure_ascii=False)
    if story.status == StoryStatus.PUBLISHED:
        author.story_count = int(author.story_count or 0) + 1
    await db.commit()
    return await card_with_likes(db, await load_story(db, story.id))


@router.put("/works/{work_id}")
async def update_work(
    work_id: int,
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    author = await get_author(db, x_fox_author or payload.get("author_slug"), x_fox_name or payload.get("author"))
    deny_if_blocked(author)
    story = await load_story(db, work_id)
    was_listed = story.status == StoryStatus.PUBLISHED
    await apply_card(db, story, payload, author)
    now_listed = story.status == StoryStatus.PUBLISHED
    if now_listed and not was_listed:
        author.story_count = int(author.story_count or 0) + 1
    elif was_listed and not now_listed:
        author.story_count = max(0, int(author.story_count or 0) - 1)
    await db.commit()
    return await card_with_likes(db, await load_story(db, work_id))


@router.delete("/works/{work_id}", status_code=204)
async def delete_work(work_id: int, db: AsyncSession = Depends(get_db)):
    story = await db.get(Story, work_id)
    if not story or story.deleted_at:
        raise HTTPException(status_code=404, detail="Work not found")
    author = await db.get(Author, story.author_id)
    if author and story.status == StoryStatus.PUBLISHED:
        author.story_count = max(0, int(author.story_count or 0) - 1)
    story.status = StoryStatus.DRAFT
    story.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return None


@router.get("/works/{work_id}/content")
async def get_content(work_id: int, db: AsyncSession = Depends(get_db)):
    story = await db.get(Story, work_id)
    if not story or story.deleted_at:
        raise HTTPException(status_code=404, detail="Work not found")
    data = _parse_card_json(story.content_json)
    return data


@router.put("/works/{work_id}/content")
async def put_content(
    work_id: int,
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    author = await get_author(db, x_fox_author, x_fox_name)
    deny_if_blocked(author)
    story = await db.get(Story, work_id)
    if not story or story.deleted_at:
        raise HTTPException(status_code=404, detail="Work not found")
    story.content_json = json.dumps(payload, ensure_ascii=False)
    await db.commit()
    return {"ok": True}


@router.post("/import/ficbook")
async def import_ficbook(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    author = await get_author(db, x_fox_author, x_fox_name)
    deny_if_blocked(author)
    if not payload.get("confirm_author"):
        raise HTTPException(status_code=400, detail="Подтвердите, что вы автор этой работы")
    try:
        data = await run_in_threadpool(scrape_ficbook, str(payload.get("url") or ""))
    except FicbookError as err:
        raise HTTPException(status_code=err.status, detail=str(err)) from err
    return data

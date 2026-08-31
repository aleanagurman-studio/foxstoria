"""Account snapshot: profile, library, wallet, settings, stats, collections."""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.works import (
    RESERVED_USERNAMES,
    deny_if_blocked,
    display_name_taken,
    get_author,
    norm_display_name,
    norm_username,
    username_taken,
)
from app.database import get_db
from app.models import (
    Author,
    Block,
    Collection,
    CollectionItem,
    Follow,
    FollowTarget,
    SocialLink,
    StoryLike,
    UserSettings,
)
from app.models.activity import (
    Bookmark,
    DailyCounter,
    ReadingProgress,
    UserCounters,
)
from app.models.social import AuthorStrike, Comment, CommentTarget, Review
from app.models.wallet import LedgerEntry, LedgerKind, PaymentKind, PaymentMethod, Wallet
from app.staff import STAFF_USERS
from app.stores import STORES

router = APIRouter()


async def _settings(db: AsyncSession, author_id: int) -> UserSettings:
    row = await db.get(UserSettings, author_id)
    if not row:
        row = UserSettings(author_id=author_id)
        db.add(row)
        await db.flush()
    return row


async def _wallet(db: AsyncSession, author_id: int) -> Wallet:
    row = await db.get(Wallet, author_id)
    if not row:
        row = Wallet(author_id=author_id, balance_cents=0)
        db.add(row)
        await db.flush()
    return row


async def _counters(db: AsyncSession, author_id: int) -> UserCounters:
    row = await db.get(UserCounters, author_id)
    if not row:
        row = UserCounters(author_id=author_id)
        db.add(row)
        await db.flush()
    return row


def _settings_json(row: UserSettings) -> dict:
    extra = {}
    if row.prefs_json:
        try:
            extra = json.loads(row.prefs_json)
        except json.JSONDecodeError:
            extra = {}
    return {
        **extra,
        "notify_comments": row.notify_comments,
        "notify_follows": row.notify_follows,
        "notify_messages": row.notify_messages,
        "notify_story_updates": row.notify_story_updates,
        "editor_autosave": row.editor_autosave,
        "editor_show_minimap": row.editor_show_minimap,
        "privacy_messages": row.privacy_messages,
        "privacy_profile": row.privacy_profile,
        "privacy_packs": row.privacy_packs,
        "adult_blur": row.adult_blur,
        "downloads": {
            "auto_chapters": row.download_auto_chapters,
            "wifi_only": row.download_wifi_only,
            "max_mb": row.download_max_mb,
        },
    }


@router.get("/stores")
async def list_stores():
    return {"domains": STORES}


@router.get("/me/state")
async def me_state(
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    settings = await _settings(db, me.id)
    wallet = await _wallet(db, me.id)
    counters = await _counters(db, me.id)
    counters.last_seen_at = datetime.now(timezone.utc)

    likes = (await db.execute(select(StoryLike.story_id).where(StoryLike.author_id == me.id))).scalars().all()
    follows = (await db.execute(select(Follow).where(Follow.follower_id == me.id))).scalars().all()
    bookmarks = (await db.execute(select(Bookmark).where(Bookmark.author_id == me.id))).scalars().all()
    history = (
        await db.execute(
            select(ReadingProgress).where(ReadingProgress.author_id == me.id).order_by(ReadingProgress.viewed_at.desc())
        )
    ).scalars().all()
    methods = (
        await db.execute(select(PaymentMethod).where(PaymentMethod.author_id == me.id).order_by(PaymentMethod.id))
    ).scalars().all()
    ops = (
        await db.execute(
            select(LedgerEntry).where(LedgerEntry.author_id == me.id).order_by(LedgerEntry.created_at.desc()).limit(100)
        )
    ).scalars().all()
    packs = (
        await db.execute(
            select(Collection).where(Collection.author_id == me.id).options(selectinload(Collection.items))
        )
    ).scalars().unique().all()
    links = (await db.execute(select(SocialLink).where(SocialLink.author_id == me.id).order_by(SocialLink.sort_index))).scalars().all()
    blocks = (await db.execute(select(Block).where(Block.author_id == me.id))).scalars().all()
    days = (
        await db.execute(
            select(DailyCounter).where(DailyCounter.author_id == me.id).order_by(DailyCounter.day.desc()).limit(30)
        )
    ).scalars().all()
    await db.commit()

    return {
        "profile": {
            "id": me.id,
            "username": me.username,
            "display_name": me.display_name,
            "avatar": me.avatar_url or "",
            "bio": me.bio or "",
            "plan": me.plan.value if hasattr(me.plan, "value") else (me.plan or "free"),
            "is_staff": me.username in STAFF_USERS,
            "blocked": bool(me.blocked_at),
            "strikes": int(
                (
                    await db.execute(select(func.count(AuthorStrike.id)).where(AuthorStrike.author_id == me.id))
                ).scalar_one()
                or 0
            ),
            "links": [{"title": item.label, "url": item.url} for item in links],
        },
        "settings": _settings_json(settings),
        "library": {
            "likes": [str(item) for item in likes],
            "follows": [
                {"type": item.target_type.value if hasattr(item.target_type, "value") else item.target_type, "author_id": item.author_id, "story_id": item.story_id}
                for item in follows
            ],
            "bookmarks": [{"type": item.target_type.value if hasattr(item.target_type, "value") else item.target_type, "key": item.target_key} for item in bookmarks],
            "read": [
                {
                    "story_id": str(item.story_id),
                    "chapter_key": item.chapter_key,
                    "scene_key": item.scene_key,
                    "progress": item.progress,
                    "completed": item.completed,
                    "viewed_at": item.viewed_at.isoformat() if item.viewed_at else "",
                }
                for item in history
            ],
        },
        "wallet": {
            "balance": wallet.balance_cents,
            "methods": [
                {"id": str(item.id), "kind": item.kind.value if hasattr(item.kind, "value") else item.kind, "title": item.title, "hint": item.hint}
                for item in methods
            ],
            "ops": [
                {
                    "id": str(item.id),
                    "kind": item.kind.value if hasattr(item.kind, "value") else item.kind,
                    "title": item.title,
                    "amount": item.amount_cents,
                    "at": item.created_at.isoformat() if item.created_at else "",
                }
                for item in ops
            ],
        },
        "stats": {
            "works_read": counters.works_read,
            "likes_given": counters.likes_given,
            "comments_written": counters.comments_written,
            "follows": counters.follows,
            "story_count": me.story_count,
            "rating_avg": me.rating_avg,
            "days": [{"day": item.day.isoformat(), "reads": item.reads, "likes": item.likes, "comments": item.comments} for item in days],
        },
        "collections": [
            {
                "id": str(pack.id),
                "title": pack.title,
                "description": pack.description or "",
                "cover": pack.cover_url or "",
                "private": not pack.is_public,
                "pinned": pack.is_pinned,
                "works": [str(item.story_id) for item in pack.items],
            }
            for pack in packs
        ],
        "blocks": [item.blocked_id for item in blocks],
    }


@router.put("/me/profile")
async def save_profile(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    if "username" in payload or "handle" in payload:
        handle = norm_username(payload.get("username") or payload.get("handle"))
        if not handle or len(handle) < 3:
            raise HTTPException(status_code=400, detail="Юзернейм от 3 символов: латиница, цифры и _.")
        if handle in RESERVED_USERNAMES:
            raise HTTPException(status_code=409, detail="Этот юзернейм зарезервирован.")
        if await username_taken(db, handle, exclude_id=me.id):
            raise HTTPException(status_code=409, detail="Такой юзернейм уже занят.")
        me.username = handle
    if payload.get("display_name") or payload.get("name"):
        label = norm_display_name(payload.get("display_name") or payload.get("name"))
        if not label:
            raise HTTPException(status_code=400, detail="Введите имя.")
        if await display_name_taken(db, label, exclude_id=me.id):
            raise HTTPException(status_code=409, detail="Такое имя уже занято.")
        me.display_name = label
    if "bio" in payload:
        me.bio = str(payload.get("bio") or "")
    if "avatar" in payload:
        me.avatar_url = str(payload.get("avatar") or "") or None
    if "links" in payload and isinstance(payload["links"], list):
        existing = (await db.execute(select(SocialLink).where(SocialLink.author_id == me.id))).scalars().all()
        for row in existing:
            await db.delete(row)
        for index, item in enumerate(payload["links"]):
            if not isinstance(item, dict):
                continue
            label = str(item.get("title") or item.get("label") or "").strip()
            url = str(item.get("url") or "").strip()
            if label and url:
                db.add(SocialLink(author_id=me.id, label=label, url=url, sort_index=index))
    await db.commit()
    return {"ok": True}


@router.get("/identity/available")
async def identity_available(
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
    username: str | None = Query(None),
    name: str | None = Query(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    handle = norm_username(username) if username is not None else ""
    label = norm_display_name(name) if name is not None else ""
    username_ok = True
    name_ok = True
    username_error = ""
    name_error = ""
    if username is not None:
        if not handle or len(handle) < 3:
            username_ok = False
            username_error = "Юзернейм от 3 символов: латиница, цифры и _."
        elif handle in RESERVED_USERNAMES:
            username_ok = False
            username_error = "Этот юзернейм зарезервирован."
        elif await username_taken(db, handle, exclude_id=me.id):
            username_ok = False
            username_error = "Такой юзернейм уже занят."
    if name is not None:
        if not label:
            name_ok = False
            name_error = "Введите имя."
        elif await display_name_taken(db, label, exclude_id=me.id):
            name_ok = False
            name_error = "Такое имя уже занято."
    return {
        "username": username_ok,
        "name": name_ok,
        "username_error": username_error,
        "name_error": name_error,
    }


@router.put("/me/settings")
async def save_settings(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    row = await _settings(db, me.id)
    for key in (
        "notify_comments",
        "notify_follows",
        "notify_messages",
        "notify_story_updates",
        "editor_autosave",
        "editor_show_minimap",
        "adult_blur",
    ):
        if key in payload:
            setattr(row, key, bool(payload[key]))
    for key in ("privacy_messages", "privacy_profile", "privacy_packs"):
        if key in payload:
            setattr(row, key, str(payload[key]))
    downloads = payload.get("downloads") if isinstance(payload.get("downloads"), dict) else {}
    if "auto_chapters" in downloads:
        row.download_auto_chapters = bool(downloads["auto_chapters"])
    if "wifi_only" in downloads:
        row.download_wifi_only = bool(downloads["wifi_only"])
    if "max_mb" in downloads:
        row.download_max_mb = int(downloads["max_mb"] or 2048)
    extra = {key: value for key, value in payload.items() if key not in {
        "notify_comments", "notify_follows", "notify_messages", "notify_story_updates",
        "editor_autosave", "editor_show_minimap", "adult_blur", "privacy_messages",
        "privacy_profile", "privacy_packs", "downloads",
    }}
    if extra:
        row.prefs_json = json.dumps(extra, ensure_ascii=False)
    await db.commit()
    return {"ok": True, "settings": _settings_json(row)}


@router.post("/me/library/like")
async def toggle_like(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    try:
        story_id = int(payload.get("story_id"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="story_id required")
    on = payload.get("on", True)
    existing = (
        await db.execute(select(StoryLike).where(StoryLike.author_id == me.id, StoryLike.story_id == story_id))
    ).scalar_one_or_none()
    counters = await _counters(db, me.id)
    if on and not existing:
        db.add(StoryLike(author_id=me.id, story_id=story_id))
        counters.likes_given = int(counters.likes_given or 0) + 1
    if not on and existing:
        await db.delete(existing)
        counters.likes_given = max(0, int(counters.likes_given or 0) - 1)
    await db.commit()
    return {"ok": True, "on": bool(on)}


@router.post("/me/library/follow")
async def toggle_follow(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    target = str(payload.get("type") or "story")
    on = payload.get("on", True)
    story_id = int(payload["story_id"]) if payload.get("story_id") else None
    author_id = int(payload["author_id"]) if payload.get("author_id") else None
    kind = FollowTarget.AUTHOR if target == "author" else FollowTarget.STORY
    query = select(Follow).where(Follow.follower_id == me.id, Follow.target_type == kind)
    if kind == FollowTarget.STORY:
        query = query.where(Follow.story_id == story_id)
    else:
        query = query.where(Follow.author_id == author_id)
    existing = (await db.execute(query)).scalar_one_or_none()
    counters = await _counters(db, me.id)
    if on and not existing:
        db.add(Follow(follower_id=me.id, target_type=kind, story_id=story_id, author_id=author_id))
        counters.follows = int(counters.follows or 0) + 1
    if not on and existing:
        await db.delete(existing)
        counters.follows = max(0, int(counters.follows or 0) - 1)
    await db.commit()
    return {"ok": True}


@router.post("/me/library/progress")
async def save_progress(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    try:
        story_id = int(payload.get("story_id"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="story_id required")
    row = (
        await db.execute(
            select(ReadingProgress).where(ReadingProgress.author_id == me.id, ReadingProgress.story_id == story_id)
        )
    ).scalar_one_or_none()
    if not row:
        row = ReadingProgress(author_id=me.id, story_id=story_id)
        db.add(row)
        counters = await _counters(db, me.id)
        counters.works_read = int(counters.works_read or 0) + 1
    row.chapter_key = str(payload.get("chapter_key") or "") or None
    row.scene_key = str(payload.get("scene_key") or "") or None
    row.progress = int(payload.get("progress") or 0)
    row.completed = bool(payload.get("completed"))
    row.viewed_at = datetime.now(timezone.utc)
    day = date.today()
    daily = (
        await db.execute(select(DailyCounter).where(DailyCounter.author_id == me.id, DailyCounter.day == day))
    ).scalar_one_or_none()
    if not daily:
        daily = DailyCounter(author_id=me.id, day=day, reads=0)
        db.add(daily)
    daily.reads = int(daily.reads or 0) + 1
    await db.commit()
    return {"ok": True}


@router.post("/me/wallet/op")
async def wallet_op(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    kind_raw = str(payload.get("kind") or "topup")
    mapping = {item.value: item for item in LedgerKind}
    kind = mapping.get(kind_raw)
    if not kind:
        raise HTTPException(status_code=400, detail="Unknown operation")
    amount = int(payload.get("amount") or 0)
    if amount == 0:
        raise HTTPException(status_code=400, detail="Amount required")
    wallet = await _wallet(db, me.id)
    wallet.balance_cents = int(wallet.balance_cents or 0) + amount
    wallet.updated_at = datetime.now(timezone.utc)
    db.add(
        LedgerEntry(
            author_id=me.id,
            kind=kind,
            title=str(payload.get("title") or kind.value),
            amount_cents=amount,
            story_id=int(payload["story_id"]) if payload.get("story_id") else None,
        )
    )
    await db.commit()
    return {"ok": True, "balance": wallet.balance_cents}


@router.post("/me/wallet/method")
async def add_method(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    kind_raw = str(payload.get("kind") or "card")
    kind = PaymentKind.SBP if kind_raw == "sbp" else PaymentKind.CARD
    method = PaymentMethod(
        author_id=me.id,
        kind=kind,
        title="СБП" if kind == PaymentKind.SBP else "Карта",
        hint=str(payload.get("hint") or ""),
    )
    db.add(method)
    await db.commit()
    await db.refresh(method)
    return {"id": str(method.id), "kind": kind.value, "title": method.title, "hint": method.hint}


@router.get("/collections")
async def list_collections(
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
    mine: bool = True,
):
    me = await get_author(db, x_fox_author, x_fox_name)
    query = select(Collection).options(selectinload(Collection.items))
    if mine:
        query = query.where(Collection.author_id == me.id)
    else:
        query = query.where(Collection.is_public.is_(True))
    packs = (await db.execute(query)).scalars().unique().all()
    return {
        "collections": [
            {
                "id": str(pack.id),
                "title": pack.title,
                "cover": pack.cover_url or "",
                "private": not pack.is_public,
                "pinned": pack.is_pinned,
                "works": len(pack.items),
            }
            for pack in packs
        ]
    }


@router.post("/collections")
async def create_collection(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    pack = Collection(
        author_id=me.id,
        title=str(payload.get("title") or "Сборник").strip() or "Сборник",
        description=str(payload.get("description") or "") or None,
        cover_url=str(payload.get("cover") or "") or None,
        is_public=not bool(payload.get("private")),
        is_pinned=bool(payload.get("pinned")),
    )
    db.add(pack)
    await db.commit()
    await db.refresh(pack)
    return {"id": str(pack.id), "title": pack.title}


@router.get("/comments")
async def list_comments(
    target_type: str,
    target_key: str,
    db: AsyncSession = Depends(get_db),
):
    mapping = {item.value: item for item in CommentTarget}
    kind = mapping.get(target_type)
    if not kind:
        raise HTTPException(status_code=400, detail="Unknown target")
    rows = (
        await db.execute(
            select(Comment)
            .where(Comment.target_type == kind, Comment.target_key == str(target_key))
            .order_by(Comment.created_at)
        )
    ).scalars().all()
    authors = {}
    ids = {row.author_id for row in rows}
    if ids:
        people = (await db.execute(select(Author).where(Author.id.in_(ids)))).scalars().all()
        authors = {person.id: person for person in people}
    return {
        "comments": [
            {
                "id": str(row.id),
                "parent_id": str(row.parent_id) if row.parent_id else "",
                "body": row.body,
                "created_at": row.created_at.isoformat() if row.created_at else "",
                "author": authors[row.author_id].display_name if row.author_id in authors else "",
                "username": authors[row.author_id].username if row.author_id in authors else "",
            }
            for row in rows
        ]
    }


@router.post("/comments")
async def add_comment(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    deny_if_blocked(me)
    mapping = {item.value: item for item in CommentTarget}
    kind = mapping.get(str(payload.get("target_type") or "story"))
    if not kind:
        raise HTTPException(status_code=400, detail="Unknown target")
    body = str(payload.get("body") or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="Empty comment")
    parent_id = int(payload["parent_id"]) if payload.get("parent_id") else None
    row = Comment(
        author_id=me.id,
        target_type=kind,
        target_key=str(payload.get("target_key") or ""),
        parent_id=parent_id,
        body=body,
    )
    db.add(row)
    counters = await _counters(db, me.id)
    counters.comments_written = int(counters.comments_written or 0) + 1
    await db.commit()
    await db.refresh(row)
    return {"id": str(row.id)}


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    row = await db.get(Comment, comment_id)
    if not row:
        raise HTTPException(status_code=404, detail="Комментарий не найден")
    if row.author_id != me.id and me.username not in STAFF_USERS:
        raise HTTPException(status_code=403, detail="Нельзя удалить чужой комментарий")
    await db.execute(delete(Comment).where(Comment.parent_id == row.id))
    await db.delete(row)
    await db.commit()
    return {"ok": True}


@router.post("/reviews")
async def upsert_review(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    try:
        story_id = int(payload.get("story_id"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="story_id required")
    row = (
        await db.execute(select(Review).where(Review.author_id == me.id, Review.story_id == story_id))
    ).scalar_one_or_none()
    if not row:
        row = Review(author_id=me.id, story_id=story_id)
        db.add(row)
    row.rating = int(payload.get("rating") or 0)
    row.body = str(payload.get("body") or "")
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}

"""Site admin cabinet: stats, reports, catalog, moderation."""

from __future__ import annotations

import json
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.messages import send_support_notice, staff_reply, thread_json
from app.api.works import find_author_by_username, get_author, load_story, story_to_card
from app.catalog_sync import (
    character_slug,
    dump_characters_for,
    dump_fandoms,
    load_taxonomy_categories,
    seed_fandom_catalog,
)
from app.database import get_db
from app.models import (
    Author,
    AuthorStrike,
    Collection,
    Comment,
    ContentReport,
    DirectMessage,
    Fandom,
    FandomCharacter,
    LedgerEntry,
    MessageParticipant,
    MessageThread,
    PageHit,
    ProfilePost,
    ReportStatus,
    Review,
    Story,
    StoryStatus,
    ThreadKind,
)
from app.staff import STAFF_USERS

router = APIRouter()

IMG_RE = re.compile(r"<img\b[^>]*>", re.I)

STRIKE_LIMIT = 3
ONLINE_MINUTES = 5
PURGE_DAYS = 3


def _today_clause(column):
    return func.date(column) == date.today().isoformat()


def _money_bucket(kind: str, title: str) -> str:
    text = f"{kind} {title}".lower()
    if "подар" in text or "gift" in text or kind == "gift":
        return "gifts"
    if "подписк" in text or kind == "sub":
        return "subs"
    if kind == "buy":
        return "other"
    return kind


async def _purge_deleted(db: AsyncSession) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=PURGE_DAYS)
    rows = (
        await db.execute(select(Story).where(Story.deleted_at.is_not(None), Story.deleted_at < cutoff))
    ).scalars().all()
    for story in rows:
        story.cover_url = None
        story.card_json = None
        story.content_json = None
        await db.delete(story)
    return len(rows)


async def _count(db: AsyncSession, stmt) -> int:
    return int((await db.execute(stmt)).scalar_one() or 0)


SECTION_RULES = [
    ("Главное", ("/index.html", "/", "/feed.html", "/news.html")),
    ("Каталог", ("/catalog.html", "/search.html", "/authors.html")),
    ("Работы и чтение", ("/story.html", "/read-", "/story-")),
    ("Кабинет автора", ("/author-home.html", "/studio.html", "/work-new.html", "/editor", "/changes.html", "/limits.html", "/reviews.html")),
    ("Кабинет читателя", ("/library.html", "/collections.html")),
    ("Профиль и блог", ("/profile.html", "/blog.html", "/replies.html", "/settings.html")),
    ("Сообщения и помощь", ("/messages.html", "/support.html")),
    ("Кошелёк", ("/wallet.html",)),
    ("Админка", ("/admin",)),
]


async def require_admin(
    db: AsyncSession,
    x_fox_author: str | None,
    x_fox_name: str | None,
) -> Author:
    me = await get_author(db, x_fox_author, x_fox_name)
    if me.username not in STAFF_USERS:
        raise HTTPException(status_code=403, detail="Нужны права администратора")
    return me


def _reason(payload: dict[str, Any]) -> str:
    text = str(payload.get("reason") or "").strip()
    if len(text) < 3:
        raise HTTPException(status_code=400, detail="Укажите причину удаления")
    return text


def _parse(raw: str | None) -> dict:
    try:
        data = json.loads(raw or "{}")
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def _strip_imgs(html: str) -> str:
    return IMG_RE.sub("", html or "")


def strip_media(content: dict, kind: str) -> dict:
    data = json.loads(json.dumps(content)) if content else {}

    def walk_chapters(chapters: list) -> None:
        for chapter in chapters:
            if kind in ("cover", "all"):
                chapter["cover"] = ""
            if kind in ("art", "all"):
                chapter["html"] = _strip_imgs(chapter.get("html") or "")
                chapter["images"] = []
            if kind in ("music", "all"):
                chapter["audioKey"] = ""
                chapter["audioName"] = ""

    def walk_scenes(scenes: list) -> None:
        for scene in scenes:
            if kind in ("cover", "all"):
                scene["background"] = ""
            if kind in ("art", "all"):
                scene["html"] = _strip_imgs(scene.get("html") or "")
                for block in scene.get("blocks") or []:
                    if isinstance(block, dict):
                        block["image"] = ""
            if kind in ("music", "all"):
                scene["audioKey"] = ""
                scene["audioName"] = ""

    walk_chapters(data.get("chapters") or [])
    walk_scenes(data.get("scenes") or [])
    return data


def notice_text(title: str, what: str, reason: str) -> str:
    return (
        f"Мы сожалеем, но администрация была вынуждена удалить {what} "
        f"в работе «{title}».\nПричина: «{reason}»"
    )


async def _notify_owner(db: AsyncSession, story: Story, what: str, reason: str) -> None:
    author = await db.get(Author, story.author_id)
    if author:
        await send_support_notice(db, author, notice_text(story.title or "Без названия", what, reason))


def _report_href(target_type: str, target_key: str) -> str:
    kind = (target_type or "").lower()
    key = target_key or ""
    if kind in ("work", "story", "page") and key:
        if key[0].isdigit():
            return f"story.html?id={key}"
        if key[0].isalpha():
            return f"story-{key}.html"
    if kind == "profile":
        return f"profile.html?u={key}"
    if kind == "collection":
        return f"collections.html?id={key}"
    if kind == "blog" or kind == "post":
        return f"blog.html?u={key}" if key else "blog.html"
    if key.startswith("/") or key.endswith(".html"):
        return key
    return key or "catalog.html"


def _section_of(path: str) -> str:
    low = path.lower()
    for name, prefixes in SECTION_RULES:
        for prefix in prefixes:
            if low == prefix or low.startswith(prefix):
                return name
    return "Прочее"


@router.get("/admin/me")
async def admin_me(
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await require_admin(db, x_fox_author, x_fox_name)
    return {"ok": True, "username": me.username, "display_name": me.display_name}


@router.get("/admin/stats")
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    await require_admin(db, x_fox_author, x_fox_name)
    await _purge_deleted(db)
    await db.commit()

    alive = Story.deleted_at.is_(None)
    users = await _count(db, select(func.count(Author.id)))
    works = await _count(db, select(func.count(Story.id)).where(alive))
    published = await _count(
        db, select(func.count(Story.id)).where(alive, Story.status == StoryStatus.PUBLISHED)
    )
    comments = await _count(db, select(func.count(Comment.id)))
    reports_total = await _count(db, select(func.count(ContentReport.id)))
    reports_open = await _count(
        db, select(func.count(ContentReport.id)).where(ContentReport.status == ReportStatus.OPEN)
    )
    messages = await _count(db, select(func.count(DirectMessage.id)))
    blogs = await _count(db, select(func.count(ProfilePost.id)))
    collections = await _count(db, select(func.count(Collection.id)))
    fandoms = await _count(db, select(func.count(Fandom.id)))
    characters = await _count(db, select(func.count(FandomCharacter.id)))

    today_users = await _count(db, select(func.count(Author.id)).where(_today_clause(Author.created_at)))
    today_works = await _count(db, select(func.count(Story.id)).where(alive, _today_clause(Story.created_at)))
    today_pubs = await _count(
        db,
        select(func.count(Story.id)).where(
            alive, Story.status == StoryStatus.PUBLISHED, _today_clause(Story.published_at)
        ),
    )
    today_blogs = await _count(db, select(func.count(ProfilePost.id)).where(_today_clause(ProfilePost.created_at)))
    today_collections = await _count(
        db, select(func.count(Collection.id)).where(_today_clause(Collection.created_at))
    )
    today_comments = await _count(db, select(func.count(Comment.id)).where(_today_clause(Comment.created_at)))
    today_reports = await _count(
        db, select(func.count(ContentReport.id)).where(_today_clause(ContentReport.created_at))
    )

    money = {kind: 0 for kind in ("topup", "buy", "sub", "gift", "refund", "payout", "subs", "gifts", "other")}
    money_today = {"subs": 0, "gifts": 0, "other": 0, "topup": 0, "income": 0}
    rows = (
        await db.execute(select(LedgerEntry.kind, LedgerEntry.title, LedgerEntry.amount_cents, LedgerEntry.created_at))
    ).all()
    for kind, title, amount, created in rows:
        key = kind.value if hasattr(kind, "value") else str(kind)
        cents = int(amount or 0)
        if key in money:
            money[key] += cents
        bucket = _money_bucket(key, title or "")
        if bucket in money:
            money[bucket] += cents
        if created and (created.date() if hasattr(created, "date") else date.today()) == date.today():
            if bucket in money_today:
                money_today[bucket] += cents
            if key == "topup":
                money_today["topup"] += cents
            if bucket in ("subs", "gifts", "other") and cents > 0:
                money_today["income"] += cents
            elif bucket in ("subs", "gifts", "other") and cents < 0:
                money_today["income"] += abs(cents)

    covers = art = music = 0
    stories_rows = (
        await db.execute(select(Story.cover_url, Story.card_json, Story.content_json).where(alive))
    ).all()
    for cover, card_raw, content_raw in stories_rows:
        covers += len(cover or "")
        card = _parse(card_raw)
        content = _parse(content_raw)
        blob = json.dumps(card, ensure_ascii=False) + json.dumps(content, ensure_ascii=False)
        if "data:image" in blob or (cover or "").startswith("data:image"):
            art += blob.count("data:image")
        if "audioKey" in blob:
            music += blob.count("audioKey")
        covers += len(card_raw or "") // 20
        art += len(content_raw or "")

    hits = (
        await db.execute(
            select(PageHit.path, func.sum(PageHit.hits)).group_by(PageHit.path).order_by(func.sum(PageHit.hits).desc())
        )
    ).all()
    sections: dict[str, int] = {}
    pages = []
    for path, total in hits:
        n = int(total or 0)
        pages.append({"path": path, "hits": n})
        sec = _section_of(path)
        sections[sec] = sections.get(sec, 0) + n

    hits_today = (
        await db.execute(
            select(PageHit.path, func.sum(PageHit.hits))
            .where(PageHit.day == date.today())
            .group_by(PageHit.path)
            .order_by(func.sum(PageHit.hits).desc())
        )
    ).all()
    sections_today: dict[str, int] = {}
    for path, total in hits_today:
        sec = _section_of(path)
        sections_today[sec] = sections_today.get(sec, 0) + int(total or 0)

    since = datetime.now(timezone.utc) - timedelta(minutes=ONLINE_MINUTES)
    online = await _count(db, select(func.count(Author.id)).where(Author.last_seen_at >= since))

    return {
        "today": {
            "users": today_users,
            "works": today_works,
            "published": today_pubs,
            "blogs": today_blogs,
            "collections": today_collections,
            "comments": today_comments,
            "reports": today_reports,
            "income": int(money_today["income"]),
            "subs": int(money_today["subs"]),
            "gifts": int(money_today["gifts"]),
        },
        "users": users,
        "works": works,
        "published": published,
        "blogs": blogs,
        "collections": collections,
        "comments": comments,
        "messages": messages,
        "reports_total": reports_total,
        "reports_open": reports_open,
        "fandoms": fandoms,
        "characters": characters,
        "online": online,
        "money": money,
        "storage": {"bytes_est": covers + art, "covers_est": covers, "content_est": art, "audio_keys": music},
        "traffic": {
            "total": sum(item["hits"] for item in pages),
            "sections": sections,
            "sections_today": sections_today,
            "pages": pages[:40],
        },
    }


@router.post("/stats/hit")
async def record_hit(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    path = str(payload.get("path") or "/")[:256]
    if not path.startswith("/"):
        path = "/" + path
    today = date.today()
    row = (
        await db.execute(select(PageHit).where(PageHit.path == path, PageHit.day == today))
    ).scalar_one_or_none()
    if not row:
        row = PageHit(path=path, day=today, hits=0)
        db.add(row)
    row.hits = int(row.hits or 0) + 1
    if x_fox_author:
        me = await get_author(db, x_fox_author, x_fox_name)
        me.last_seen_at = datetime.now(timezone.utc)
    await _purge_deleted(db)
    await db.commit()
    return {"ok": True}


@router.post("/reports")
async def create_report(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    row = ContentReport(
        reporter_id=me.id,
        target_type=str(payload.get("target_type") or "other")[:32],
        target_key=str(payload.get("target_key") or "")[:128],
        target_title=str(payload.get("target_title") or "")[:256],
        target_url=str(payload.get("target_url") or payload.get("href") or "")[:512],
        reason_code=str(payload.get("reason_code") or "")[:64],
        reason=str(payload.get("reason") or "")[:4000],
        status=ReportStatus.OPEN,
    )
    db.add(row)
    await db.commit()
    return {"ok": True, "id": row.id}


@router.get("/admin/reports")
async def list_reports(
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    await require_admin(db, x_fox_author, x_fox_name)
    rows = (
        await db.execute(select(ContentReport).order_by(ContentReport.created_at.desc()).limit(300))
    ).scalars().all()
    people = {}
    ids = {row.reporter_id for row in rows if row.reporter_id}
    if ids:
        for person in (await db.execute(select(Author).where(Author.id.in_(ids)))).scalars().all():
            people[person.id] = person
    return {
        "reports": [
            {
                "id": row.id,
                "target_type": row.target_type,
                "target_key": row.target_key,
                "target_title": row.target_title,
                "target_url": row.target_url or _report_href(row.target_type, row.target_key),
                "reason_code": row.reason_code,
                "reason": row.reason,
                "status": row.status.value if hasattr(row.status, "value") else str(row.status),
                "created_at": row.created_at.isoformat() if row.created_at else "",
                "reporter": people[row.reporter_id].display_name if row.reporter_id in people else "",
                "username": people[row.reporter_id].username if row.reporter_id in people else "",
            }
            for row in rows
        ]
    }


@router.post("/admin/reports/{report_id}")
async def update_report(
    report_id: int,
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    await require_admin(db, x_fox_author, x_fox_name)
    row = await db.get(ContentReport, report_id)
    if not row:
        raise HTTPException(status_code=404, detail="Жалоба не найдена")
    status = str(payload.get("status") or "").lower()
    if status in ("open", "done"):
        row.status = ReportStatus(status)
    await db.commit()
    return {"ok": True}


@router.get("/admin/messages")
async def admin_messages(
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await require_admin(db, x_fox_author, x_fox_name)
    result = await db.execute(
        select(MessageThread)
        .options(
            selectinload(MessageThread.participants).selectinload(MessageParticipant.author),
            selectinload(MessageThread.messages).selectinload(DirectMessage.sender),
        )
        .order_by(MessageThread.updated_at.desc())
        .limit(200)
    )
    threads = result.scalars().unique().all()
    items = []
    for thread in threads:
        kind = thread.kind.value if hasattr(thread.kind, "value") else str(thread.kind)
        if kind == "system":
            continue
        data = thread_json(thread, me)
        people = [
            {
                "username": part.author.username if part.author else "",
                "display_name": part.author.display_name if part.author else "",
            }
            for part in thread.participants
        ]
        data["people"] = people
        data["kind"] = kind
        items.append(data)
    return {"threads": items}


@router.get("/admin/messages/{thread_id}")
async def admin_message_thread(
    thread_id: int,
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await require_admin(db, x_fox_author, x_fox_name)
    result = await db.execute(
        select(MessageThread)
        .where(MessageThread.id == thread_id)
        .options(
            selectinload(MessageThread.participants).selectinload(MessageParticipant.author),
            selectinload(MessageThread.messages).selectinload(DirectMessage.sender),
        )
    )
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Чат не найден")
    data = thread_json(thread, me, with_messages=True)
    data["people"] = [
        {
            "username": part.author.username if part.author else "",
            "display_name": part.author.display_name if part.author else "",
        }
        for part in thread.participants
    ]
    return data


@router.post("/admin/messages/{thread_id}")
async def admin_message_reply(
    thread_id: int,
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await require_admin(db, x_fox_author, x_fox_name)
    result = await db.execute(
        select(MessageThread)
        .where(MessageThread.id == thread_id)
        .options(
            selectinload(MessageThread.participants).selectinload(MessageParticipant.author),
            selectinload(MessageThread.messages).selectinload(DirectMessage.sender),
        )
    )
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Чат не найден")
    body = str(payload.get("body") or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="Пустое сообщение")
    thread = await staff_reply(db, thread, me, body)
    return thread_json(thread, me, with_messages=True)


@router.post("/admin/authors/{username}/warn")
async def warn_author(
    username: str,
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await require_admin(db, x_fox_author, x_fox_name)
    author = await find_author_by_username(db, username)
    if not author:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    reason = str(payload.get("reason") or "").strip()
    if len(reason) < 3:
        raise HTTPException(status_code=400, detail="Укажите причину предупреждения")
    db.add(AuthorStrike(author_id=author.id, admin_id=me.id, reason=reason))
    await db.flush()
    count = await _count(db, select(func.count(AuthorStrike.id)).where(AuthorStrike.author_id == author.id))
    blocked = False
    if count >= STRIKE_LIMIT and not author.blocked_at:
        author.blocked_at = datetime.now(timezone.utc)
        blocked = True
        await send_support_notice(
            db,
            author,
            "Профиль заблокирован после трёх предупреждений. Работы не удалены. "
            "Если считаете решение ошибочным, ответьте в этот чат — обжалуем.",
        )
    else:
        await send_support_notice(
            db,
            author,
            f"Вам выдано предупреждение ({count} из {STRIKE_LIMIT}).\nПричина: «{reason}».\n"
            "Три предупреждения автоматически блокируют профиль. Работы при этом не удаляются.",
        )
    await db.commit()
    return {"ok": True, "strikes": count, "blocked": blocked, "limit": STRIKE_LIMIT}


@router.get("/admin/content")
async def admin_content(
    q: str = "",
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    await require_admin(db, x_fox_author, x_fox_name)
    query = (
        select(Story)
        .options(selectinload(Story.author))
        .where(Story.deleted_at.is_(None))
        .order_by(Story.id.desc())
        .limit(80)
    )
    if q.strip():
        like = f"%{q.strip()}%"
        query = (
            select(Story)
            .options(selectinload(Story.author))
            .where(Story.title.ilike(like), Story.deleted_at.is_(None))
            .order_by(Story.id.desc())
            .limit(80)
        )
    works = (await db.execute(query)).scalars().unique().all()
    comments = (
        await db.execute(select(Comment).order_by(Comment.created_at.desc()).limit(80))
    ).scalars().all()
    authors = {}
    ids = {row.author_id for row in comments}
    if ids:
        for person in (await db.execute(select(Author).where(Author.id.in_(ids)))).scalars().all():
            authors[person.id] = person
    reviews = (
        await db.execute(select(Review).order_by(Review.updated_at.desc()).limit(40))
    ).scalars().all()
    return {
        "works": [
            {
                "id": story.id,
                "title": story.title,
                "author": story.author.display_name if story.author else "",
                "username": story.author.username if story.author else "",
                "status": story.status.value if hasattr(story.status, "value") else str(story.status),
                "type": story.story_type.value if hasattr(story.story_type, "value") else str(story.story_type),
                "href": f"story.html?id={story.id}",
                "studio": f"studio.html?id={story.id}",
            }
            for story in works
        ],
        "comments": [
            {
                "id": row.id,
                "body": row.body[:240],
                "target_type": row.target_type.value if hasattr(row.target_type, "value") else str(row.target_type),
                "target_key": row.target_key,
                "author": authors[row.author_id].display_name if row.author_id in authors else "",
            }
            for row in comments
        ],
        "reviews": [{"id": row.id, "story_id": row.story_id, "body": (row.body or "")[:240], "rating": row.rating} for row in reviews],
    }


@router.post("/admin/remove")
async def admin_remove(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    await require_admin(db, x_fox_author, x_fox_name)
    reason = _reason(payload)
    kind = str(payload.get("kind") or "").strip()
    work_id = payload.get("work_id")
    story = await db.get(Story, int(work_id)) if work_id is not None else None

    if kind == "work":
        if not story:
            raise HTTPException(status_code=404, detail="Работа не найдена")
        await _notify_owner(db, story, "работу", reason)
        author = await db.get(Author, story.author_id)
        if author and story.status == StoryStatus.PUBLISHED:
            author.story_count = max(0, int(author.story_count or 0) - 1)
        story.status = StoryStatus.DRAFT
        story.deleted_at = datetime.now(timezone.utc)
        await db.commit()
        return {"ok": True}

    if kind == "comment":
        row = await db.get(Comment, int(payload.get("id") or 0))
        if not row:
            raise HTTPException(status_code=404, detail="Комментарий не найден")
        author = await db.get(Author, row.author_id)
        if author:
            await send_support_notice(
                db,
                author,
                f"Мы сожалеем, но администрация была вынуждена удалить ваш комментарий.\nПричина: «{reason}»",
            )
        await db.delete(row)
        await db.commit()
        return {"ok": True}

    if kind == "review":
        row = await db.get(Review, int(payload.get("id") or 0))
        if not row:
            raise HTTPException(status_code=404, detail="Отзыв не найден")
        author = await db.get(Author, row.author_id)
        if author:
            await send_support_notice(
                db,
                author,
                f"Мы сожалеем, но администрация была вынуждена удалить ваш отзыв.\nПричина: «{reason}»",
            )
        await db.delete(row)
        await db.commit()
        return {"ok": True}

    if kind == "chapter":
        if not story:
            raise HTTPException(status_code=404, detail="Работа не найдена")
        content = _parse(story.content_json)
        cid = str(payload.get("part_id") or "")
        content["chapters"] = [ch for ch in (content.get("chapters") or []) if str(ch.get("id")) != cid]
        content["scenes"] = [sc for sc in (content.get("scenes") or []) if str(sc.get("id")) != cid and str(sc.get("chapterId")) != cid]
        story.content_json = json.dumps(content, ensure_ascii=False)
        await _notify_owner(db, story, "главу", reason)
        await db.commit()
        return {"ok": True}

    if kind in ("cover", "art", "music"):
        if not story:
            raise HTTPException(status_code=404, detail="Работа не найдена")
        labels = {"cover": "обложку", "art": "иллюстрации", "music": "музыку к работе"}
        if kind == "cover":
            story.cover_url = None
            card = _parse(story.card_json)
            card["cover"] = ""
            story.card_json = json.dumps(card, ensure_ascii=False)
        content = strip_media(_parse(story.content_json), kind)
        story.content_json = json.dumps(content, ensure_ascii=False)
        await _notify_owner(db, story, labels[kind], reason)
        await db.commit()
        return {"ok": True, "work": story_to_card(await load_story(db, story.id))}

    raise HTTPException(status_code=400, detail="Неизвестный тип удаления")


@router.get("/admin/fandoms/categories")
async def fandom_categories(
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    await require_admin(db, x_fox_author, x_fox_name)
    await seed_fandom_catalog(db)
    await db.commit()
    cats = load_taxonomy_categories()
    counts = dict(
        (await db.execute(select(Fandom.category, func.count(Fandom.id)).group_by(Fandom.category))).all()
    )
    return {
        "categories": [
            {"name": item["name"], "slug": item["slug"], "count": int(counts.get(item["slug"], 0) or 0)}
            for item in cats
        ]
    }


@router.get("/admin/fandoms")
async def list_admin_fandoms(
    category: str = "",
    q: str = "",
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    await require_admin(db, x_fox_author, x_fox_name)
    await seed_fandom_catalog(db)
    await db.commit()
    query = select(Fandom).order_by(Fandom.name)
    if category:
        query = query.where(Fandom.category == category)
    if q.strip():
        like = f"%{q.strip()}%"
        query = query.where(Fandom.name.ilike(like))
    rows = (await db.execute(query.limit(4000))).scalars().all()
    char_counts = dict(
        (
            await db.execute(
                select(FandomCharacter.fandom_id, func.count(FandomCharacter.id)).group_by(FandomCharacter.fandom_id)
            )
        ).all()
    )
    return {
        "fandoms": [
            {
                "id": row.id,
                "name": row.name,
                "slug": row.slug,
                "category": row.category or "",
                "characters": int(char_counts.get(row.id, 0) or 0),
            }
            for row in rows
        ]
    }


@router.post("/admin/fandoms")
async def create_fandom(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    await require_admin(db, x_fox_author, x_fox_name)
    name = str(payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Название фандома обязательно")
    from slugify import slugify

    slug = str(payload.get("slug") or slugify(name) or "fandom")[:256]
    category = str(payload.get("category") or "").strip()
    exists = (await db.execute(select(Fandom).where(Fandom.slug == slug))).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Такой фандом уже есть")
    row = Fandom(name=name[:256], slug=slug, category=category)
    db.add(row)
    await db.flush()
    await dump_fandoms(db)
    await db.commit()
    return {"id": row.id, "slug": row.slug, "name": row.name, "category": row.category}


@router.put("/admin/fandoms/{fandom_id}")
async def update_fandom(
    fandom_id: int,
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    await require_admin(db, x_fox_author, x_fox_name)
    row = await db.get(Fandom, fandom_id)
    if not row:
        raise HTTPException(status_code=404, detail="Фандом не найден")
    if payload.get("name"):
        row.name = str(payload["name"]).strip()[:256]
    if "category" in payload:
        row.category = str(payload.get("category") or "").strip()
    if payload.get("slug"):
        row.slug = str(payload["slug"]).strip()[:256]
    await dump_fandoms(db)
    await dump_characters_for(db, row)
    await db.commit()
    return {"ok": True, "slug": row.slug}


@router.delete("/admin/fandoms/{fandom_id}")
async def delete_fandom(
    fandom_id: int,
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    await require_admin(db, x_fox_author, x_fox_name)
    row = await db.get(Fandom, fandom_id)
    if not row:
        raise HTTPException(status_code=404, detail="Фандом не найден")
    slug = row.slug
    used = (await db.execute(select(func.count(Story.id)).where(Story.fandom_id == row.id))).scalar_one()
    if used:
        raise HTTPException(status_code=400, detail="Фандом уже стоит на работах — сначала смените его там")
    await db.delete(row)
    await db.flush()
    await dump_fandoms(db)
    from app.catalog_sync import patch_characters_json

    patch_characters_json(slug, [])
    await db.commit()
    return {"ok": True}


@router.get("/admin/fandoms/{slug}/characters")
async def list_characters(
    slug: str,
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    await require_admin(db, x_fox_author, x_fox_name)
    fandom = (await db.execute(select(Fandom).where(Fandom.slug == slug))).scalar_one_or_none()
    if not fandom:
        raise HTTPException(status_code=404, detail="Фандом не найден")
    rows = (
        await db.execute(
            select(FandomCharacter).where(FandomCharacter.fandom_id == fandom.id).order_by(FandomCharacter.name)
        )
    ).scalars().all()
    return {
        "fandom": {"id": fandom.id, "name": fandom.name, "slug": fandom.slug, "category": fandom.category},
        "characters": [{"id": row.id, "name": row.name, "slug": row.slug} for row in rows],
    }


@router.post("/admin/fandoms/{slug}/characters")
async def add_character(
    slug: str,
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    await require_admin(db, x_fox_author, x_fox_name)
    fandom = (await db.execute(select(Fandom).where(Fandom.slug == slug))).scalar_one_or_none()
    if not fandom:
        raise HTTPException(status_code=404, detail="Фандом не найден")
    name = str(payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Имя персонажа обязательно")
    cslug = str(payload.get("slug") or character_slug(name))[:256]
    row = FandomCharacter(fandom_id=fandom.id, name=name[:512], slug=cslug)
    db.add(row)
    await db.flush()
    await dump_characters_for(db, fandom)
    await db.commit()
    return {"id": row.id, "name": row.name, "slug": row.slug}


@router.put("/admin/characters/{char_id}")
async def update_character(
    char_id: int,
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    await require_admin(db, x_fox_author, x_fox_name)
    row = await db.get(FandomCharacter, char_id)
    if not row:
        raise HTTPException(status_code=404, detail="Персонаж не найден")
    if payload.get("name"):
        row.name = str(payload["name"]).strip()[:512]
        row.slug = character_slug(row.name)
    fandom = await db.get(Fandom, row.fandom_id)
    if fandom:
        await dump_characters_for(db, fandom)
    await db.commit()
    return {"ok": True}


@router.delete("/admin/characters/{char_id}")
async def delete_character(
    char_id: int,
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    await require_admin(db, x_fox_author, x_fox_name)
    row = await db.get(FandomCharacter, char_id)
    if not row:
        raise HTTPException(status_code=404, detail="Персонаж не найден")
    fandom = await db.get(Fandom, row.fandom_id)
    await db.delete(row)
    if fandom:
        await dump_characters_for(db, fandom)
    await db.commit()
    return {"ok": True}

"""Direct messages, system mail, and support inbox."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.works import get_author
from app.database import get_db
from app.models import Author, DirectMessage, MessageParticipant, MessageThread, ThreadKind

router = APIRouter()

SYSTEM_USER = "foxstoria"
SUPPORT_USER = "foxstoria-support"
STAFF_USERS = {SYSTEM_USER, SUPPORT_USER, "moonwander"}

SYSTEM_AVATAR = "assets/brand/лисичка.png"
SUPPORT_AVATAR = "assets/brand/помощник.png"


def _load_thread():
    return (
        selectinload(MessageThread.participants).selectinload(MessageParticipant.author),
        selectinload(MessageThread.messages).selectinload(DirectMessage.sender),
    )


async def _named_author(db: AsyncSession, username: str, display_name: str, avatar: str | None) -> Author:
    author = (await db.execute(select(Author).where(Author.username == username))).scalar_one_or_none()
    if author:
        if not author.avatar_url and avatar:
            author.avatar_url = avatar
        return author
    author = Author(username=username, display_name=display_name, avatar_url=avatar, story_count=0, follower_count=0)
    db.add(author)
    await db.flush()
    return author


async def system_author(db: AsyncSession) -> Author:
    return await _named_author(db, SYSTEM_USER, "FoxStoria", SYSTEM_AVATAR)


async def support_author(db: AsyncSession) -> Author:
    return await _named_author(db, SUPPORT_USER, "Поддержка", SUPPORT_AVATAR)


def _avatar(author: Author | None, kind: ThreadKind | str | None = None) -> str:
    if author and author.avatar_url:
        return author.avatar_url
    if kind == ThreadKind.SYSTEM or (author and author.username == SYSTEM_USER):
        return SYSTEM_AVATAR
    if kind == ThreadKind.SUPPORT or (author and author.username == SUPPORT_USER):
        return SUPPORT_AVATAR
    return "assets/deco/fox.svg"


def _stamp(dt: datetime | None) -> str:
    if not dt:
        return ""
    local = dt
    if dt.tzinfo is None:
        local = dt.replace(tzinfo=timezone.utc)
    return local.astimezone().strftime("%H:%M")


def _iso(dt: datetime | None) -> str:
    return dt.isoformat() if dt else ""


def _peer(thread: MessageThread, me: Author) -> Author | None:
    others = [part.author for part in thread.participants if part.author_id != me.id and part.author]
    if thread.kind == ThreadKind.SYSTEM:
        return next((a for a in others if a.username == SYSTEM_USER), others[0] if others else None)
    if thread.kind == ThreadKind.SUPPORT:
        if me.username == SUPPORT_USER:
            return next((a for a in others if a.username != SUPPORT_USER), others[0] if others else None)
        return next((a for a in others if a.username == SUPPORT_USER), others[0] if others else None)
    return others[0] if others else None


def _title(thread: MessageThread, me: Author) -> str:
    if thread.kind == ThreadKind.SYSTEM:
        return "FoxStoria"
    if thread.kind == ThreadKind.SUPPORT:
        if me.username == SUPPORT_USER:
            peer = _peer(thread, me)
            return f"Обращение · {peer.display_name if peer else 'пользователь'}"
        return "Поддержка"
    peer = _peer(thread, me)
    return peer.display_name if peer else "Диалог"


def message_json(msg: DirectMessage, me: Author) -> dict:
    sender = msg.sender
    return {
        "id": msg.id,
        "body": msg.body,
        "created_at": _iso(msg.created_at),
        "time": _stamp(msg.created_at),
        "mine": msg.sender_id == me.id,
        "sender": {
            "username": sender.username if sender else "",
            "display_name": sender.display_name if sender else "",
            "avatar": _avatar(sender),
        },
    }


def thread_json(thread: MessageThread, me: Author, *, with_messages: bool = False) -> dict:
    messages = sorted(thread.messages, key=lambda item: item.created_at or datetime.min.replace(tzinfo=timezone.utc))
    last = messages[-1] if messages else None
    peer = _peer(thread, me)
    unread = 0
    mine_part = next((p for p in thread.participants if p.author_id == me.id), None)
    read_at = mine_part.last_read_at if mine_part else None
    if read_at:
        unread = sum(1 for item in messages if item.sender_id != me.id and item.created_at and item.created_at > read_at)
    elif messages:
        unread = sum(1 for item in messages if item.sender_id != me.id)
    data = {
        "id": thread.id,
        "kind": thread.kind.value if hasattr(thread.kind, "value") else str(thread.kind),
        "title": _title(thread, me),
        "peer": {
            "username": peer.username if peer else "",
            "display_name": peer.display_name if peer else _title(thread, me),
            "avatar": _avatar(peer, thread.kind),
        },
        "preview": (last.body[:140] if last else ""),
        "updated_at": _iso(thread.updated_at or (last.created_at if last else thread.created_at)),
        "time": _stamp(thread.updated_at or (last.created_at if last else thread.created_at)),
        "unread": unread,
        "can_reply": thread.kind != ThreadKind.SYSTEM or me.username in STAFF_USERS,
    }
    if with_messages:
        data["messages"] = [message_json(item, me) for item in messages]
    return data


async def _get_thread(db: AsyncSession, thread_id: int) -> MessageThread:
    loaded = await db.execute(select(MessageThread).where(MessageThread.id == thread_id).options(*_load_thread()))
    thread = loaded.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


def _in_thread(thread: MessageThread, author_id: int) -> bool:
    return any(part.author_id == author_id for part in thread.participants)


async def _add_part(db: AsyncSession, thread: MessageThread, author_id: int) -> None:
    exists = any(part.author_id == author_id for part in thread.participants)
    if exists:
        return
    db.add(MessageParticipant(thread_id=thread.id, author_id=author_id))


async def _ensure_pair_thread(
    db: AsyncSession,
    me: Author,
    other: Author,
    kind: ThreadKind,
) -> MessageThread:
    mine = select(MessageParticipant.thread_id).where(MessageParticipant.author_id == me.id)
    theirs = select(MessageParticipant.thread_id).where(MessageParticipant.author_id == other.id)
    found = (
        await db.execute(
            select(MessageThread)
            .where(MessageThread.kind == kind, MessageThread.id.in_(mine), MessageThread.id.in_(theirs))
            .options(*_load_thread())
            .limit(1)
        )
    ).scalar_one_or_none()
    if found:
        return found
    thread = MessageThread(kind=kind, updated_at=datetime.now(timezone.utc))
    db.add(thread)
    await db.flush()
    db.add(MessageParticipant(thread_id=thread.id, author_id=me.id))
    if other.id != me.id:
        db.add(MessageParticipant(thread_id=thread.id, author_id=other.id))
    await db.flush()
    return await _get_thread(db, thread.id)


async def _post(db: AsyncSession, thread: MessageThread, sender: Author, body: str) -> DirectMessage:
    text = str(body or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message is empty")
    msg = DirectMessage(thread_id=thread.id, sender_id=sender.id, body=text)
    thread.updated_at = datetime.now(timezone.utc)
    db.add(msg)
    await db.flush()
    return msg


@router.get("/messages/threads")
async def list_threads(
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    sys = await system_author(db)
    support = await support_author(db)
    if me.id not in (sys.id, support.id):
        await _ensure_pair_thread(db, me, sys, ThreadKind.SYSTEM)
        await _ensure_pair_thread(db, me, support, ThreadKind.SUPPORT)
    await db.commit()

    ids = select(MessageParticipant.thread_id).where(MessageParticipant.author_id == me.id)
    result = await db.execute(
        select(MessageThread).where(MessageThread.id.in_(ids)).options(*_load_thread())
    )
    threads = result.scalars().unique().all()
    items = [thread_json(thread, me) for thread in threads]
    items.sort(key=lambda item: item.get("updated_at") or "", reverse=True)
    return {"me": {"username": me.username, "display_name": me.display_name}, "threads": items}


@router.get("/messages/threads/{thread_id}")
async def get_thread(
    thread_id: int,
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    thread = await _get_thread(db, thread_id)
    if not _in_thread(thread, me.id):
        raise HTTPException(status_code=404, detail="Thread not found")
    part = next((p for p in thread.participants if p.author_id == me.id), None)
    if part:
        part.last_read_at = datetime.now(timezone.utc)
    await db.commit()
    thread = await _get_thread(db, thread_id)
    return thread_json(thread, me, with_messages=True)


@router.post("/messages/threads/{thread_id}")
async def send_in_thread(
    thread_id: int,
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    thread = await _get_thread(db, thread_id)
    if not _in_thread(thread, me.id):
        raise HTTPException(status_code=404, detail="Thread not found")
    if thread.kind == ThreadKind.SYSTEM:
        if me.username not in STAFF_USERS:
            raise HTTPException(status_code=400, detail="Cannot reply to system mail")
        await _broadcast(db, str(payload.get("body") or ""))
        await db.commit()
        thread = await _get_thread(db, thread.id)
        return thread_json(thread, me, with_messages=True)
    await _post(db, thread, me, payload.get("body") or "")
    await db.commit()
    thread = await _get_thread(db, thread_id)
    return thread_json(thread, me, with_messages=True)


@router.post("/messages")
async def start_direct(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    handle = str(payload.get("to") or payload.get("username") or "").lstrip("@").strip()
    if not handle:
        raise HTTPException(status_code=400, detail="Recipient is required")
    if handle in {SYSTEM_USER, SUPPORT_USER}:
        raise HTTPException(status_code=400, detail="Use support or wait for system mail")
    other = await get_author(db, handle, str(payload.get("name") or handle))
    if other.id == me.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    thread = await _ensure_pair_thread(db, me, other, ThreadKind.DIRECT)
    if payload.get("body"):
        await _post(db, thread, me, payload.get("body"))
    await db.commit()
    thread = await _get_thread(db, thread.id)
    return thread_json(thread, me, with_messages=True)


@router.post("/messages/support")
async def send_support(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    support = await support_author(db)
    thread = await _ensure_pair_thread(db, me, support, ThreadKind.SUPPORT)
    topic = str(payload.get("topic") or "").strip()
    body = str(payload.get("body") or "").strip()
    if topic:
        body = f"{topic}\n\n{body}" if body else topic
    await _post(db, thread, me, body)
    await db.commit()
    thread = await _get_thread(db, thread.id)
    return thread_json(thread, me, with_messages=True)


async def _broadcast(db: AsyncSession, body: str) -> int:
    text = str(body or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message is empty")
    sys = await system_author(db)
    authors = (
        await db.execute(select(Author).where(Author.username.notin_([SYSTEM_USER, SUPPORT_USER])))
    ).scalars().all()
    count = 0
    for author in authors:
        thread = await _ensure_pair_thread(db, author, sys, ThreadKind.SYSTEM)
        await _post(db, thread, sys, text)
        count += 1
    return count


@router.post("/messages/broadcast")
async def broadcast(
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    x_fox_author: str | None = Header(None),
    x_fox_name: str | None = Header(None),
):
    me = await get_author(db, x_fox_author, x_fox_name)
    if me.username not in STAFF_USERS:
        raise HTTPException(status_code=403, detail="Staff only")
    count = await _broadcast(db, payload.get("body") or "")
    await db.commit()
    return {"ok": True, "sent": count}

"""Trial accounts and ownership of seeded catalog works."""

from __future__ import annotations

import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Author, Story, StoryCredit, StoryCreditRole
from app.staff import STAFF_USERS

DEMO_AUTHORS = (
    ("fox", "Фокс", "assets/brand/лисичка.png"),
    ("lis", "Лис", "assets/test/avatar-2.png"),
    ("hvostik", "Хвостик", "assets/test/avatar-3.png"),
)


async def _upsert_author(db: AsyncSession, username: str, display_name: str, avatar: str) -> Author:
    row = (await db.execute(select(Author).where(Author.username == username))).scalar_one_or_none()
    if not row:
        row = Author(
            username=username,
            display_name=display_name,
            avatar_url=avatar,
            story_count=0,
            follower_count=0,
        )
        db.add(row)
        await db.flush()
        return row
    row.display_name = display_name
    if avatar and not row.avatar_url:
        row.avatar_url = avatar
    return row


async def _give_story_to(db: AsyncSession, story: Story, owner: Author) -> None:
    story.author_id = owner.id
    extra = {}
    if story.card_json:
        try:
            data = json.loads(story.card_json)
            extra = data if isinstance(data, dict) else {}
        except json.JSONDecodeError:
            extra = {}
    extra["author"] = owner.display_name
    extra["author_slug"] = owner.username
    story.card_json = json.dumps(extra, ensure_ascii=False)
    credits = (
        await db.execute(
            select(StoryCredit).where(
                StoryCredit.story_id == story.id,
                StoryCredit.role == StoryCreditRole.OWNER,
            )
        )
    ).scalars().all()
    kept = False
    for credit in credits:
        if credit.author_id == owner.id:
            kept = True
        else:
            await db.delete(credit)
    if not kept:
        db.add(StoryCredit(author_id=owner.id, story_id=story.id, role=StoryCreditRole.OWNER))


async def ensure_demo_accounts(db: AsyncSession) -> None:
    fox = await _upsert_author(db, *DEMO_AUTHORS[0])
    lis = await _upsert_author(db, *DEMO_AUTHORS[1])
    await _upsert_author(db, *DEMO_AUTHORS[2])
    _ = fox
    moon = (await db.execute(select(Author).where(Author.username == "moonwander"))).scalar_one_or_none()
    stories = (await db.execute(select(Story).where(Story.deleted_at.is_(None)))).scalars().all()
    for story in stories:
        extra = {}
        if story.card_json:
            try:
                data = json.loads(story.card_json)
                extra = data if isinstance(data, dict) else {}
            except json.JSONDecodeError:
                extra = {}
        slug = str(extra.get("author_slug") or "").lower()
        if moon and story.author_id == moon.id:
            await _give_story_to(db, story, lis)
        elif slug in {"moonwander", "lis", ""} and story.author_id != lis.id:
            author = (await db.execute(select(Author).where(Author.id == story.author_id))).scalar_one_or_none()
            if author and author.username not in STAFF_USERS | {"lis", "hvostik", "fox"}:
                await _give_story_to(db, story, lis)
    count = len(
        (await db.execute(select(Story.id).where(Story.author_id == lis.id, Story.deleted_at.is_(None)))).scalars().all()
    )
    lis.story_count = count
    await db.commit()

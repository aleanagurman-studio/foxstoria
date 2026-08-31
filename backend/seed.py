"""Seed local database with taxonomy. Catalog stays empty until works are created on the site."""

import asyncio
import json
from pathlib import Path

from sqlalchemy import delete, select

from app.database import Base, SessionLocal, engine
from app.main import _sqlite_migrate
from app.models import Author, ContentWarning, DirectMessage, Fandom, Genre, Kink, MessageParticipant, MessageThread, ThreadKind, WorkFormat

TAXONOMY_PATH = Path(__file__).resolve().parents[1] / "web" / "taxonomy.json"


def load_taxonomy() -> dict:
    return json.loads(TAXONOMY_PATH.read_text(encoding="utf-8"))


async def ensure_core() -> None:
    async with SessionLocal() as db:
        original = (await db.execute(select(Fandom).where(Fandom.slug == "original"))).scalar_one_or_none()
        if not original:
            db.add(Fandom(name="Ориджинал", slug="original"))
        for username, display_name, avatar in (
            ("moonwander", "Вы", None),
            ("foxstoria", "FoxStoria", "assets/brand/лисичка.png"),
            ("foxstoria-support", "Поддержка", "assets/brand/помощник.png"),
        ):
            row = (await db.execute(select(Author).where(Author.username == username))).scalar_one_or_none()
            if not row:
                db.add(
                    Author(
                        username=username,
                        display_name=display_name,
                        avatar_url=avatar,
                        story_count=0,
                        follower_count=0,
                    )
                )
            elif avatar and not row.avatar_url:
                row.avatar_url = avatar
        await db.commit()

        sys = (await db.execute(select(Author).where(Author.username == "foxstoria"))).scalar_one_or_none()
        already = (await db.execute(select(DirectMessage.id).limit(1))).scalar_one_or_none()
        if sys and not already:
            people = (
                await db.execute(select(Author).where(Author.username.notin_(["foxstoria", "foxstoria-support"])))
            ).scalars().all()
            text = (
                "Добро пожаловать в FoxStoria. Здесь появляются системные письма: "
                "объявления, напоминания и ответы поддержки — в соседнем чате «Поддержка»."
            )
            for person in people:
                thread = MessageThread(kind=ThreadKind.SYSTEM)
                db.add(thread)
                await db.flush()
                db.add(MessageParticipant(thread_id=thread.id, author_id=person.id))
                db.add(MessageParticipant(thread_id=thread.id, author_id=sys.id))
                db.add(DirectMessage(thread_id=thread.id, sender_id=sys.id, body=text))
            await db.commit()
            print("Seeded system welcome mail.")


def _label_buckets():
    from app.models.entities import StoryFormat, StoryGenre, StoryKink, StoryWarning

    return {
        "genres": (Genre, StoryGenre, StoryGenre.genre_id),
        "formats": (WorkFormat, StoryFormat, StoryFormat.format_id),
        "warnings": (ContentWarning, StoryWarning, StoryWarning.warning_id),
        "kinks": (Kink, StoryKink, StoryKink.kink_id),
    }


async def _upsert_labels(db, model, items: list[dict], link_model, fk) -> None:
    existing = {row.slug: row for row in (await db.execute(select(model))).scalars().all()}
    wanted = {item["slug"] for item in items}
    for item in items:
        row = existing.get(item["slug"])
        if row:
            row.name = item["name"]
            row.description = item.get("description")
        else:
            db.add(model(name=item["name"], slug=item["slug"], description=item.get("description")))
            await db.flush()
    stale = [row for slug, row in existing.items() if slug not in wanted]
    for row in stale:
        await db.execute(delete(link_model).where(fk == row.id))
        await db.delete(row)


async def _relocate_label(db, row, source_key: str, dest_key: str, buckets: dict) -> None:
    src_model, src_link, src_fk = buckets[source_key]
    dest_model, dest_link, dest_fk = buckets[dest_key]
    dest = (await db.execute(select(dest_model).where(dest_model.slug == row.slug))).scalar_one_or_none()
    if not dest:
        dest = dest_model(name=row.name, slug=row.slug, description=row.description)
        db.add(dest)
        await db.flush()
    links = (await db.execute(select(src_link).where(src_fk == row.id))).scalars().all()
    story_attr = "story_id"
    for link in links:
        story_id = getattr(link, story_attr)
        exists = (
            await db.execute(select(dest_link).where(dest_link.story_id == story_id, dest_fk == dest.id))
        ).scalar_one_or_none()
        if not exists:
            db.add(dest_link(story_id=story_id, **{dest_fk.key: dest.id}))
    await db.execute(delete(src_link).where(src_fk == row.id))
    await db.delete(row)


async def sync_taxonomy(db) -> dict:
    taxonomy = load_taxonomy()
    buckets = _label_buckets()
    slug_dest = {}
    for key in buckets:
        for item in taxonomy[key]:
            slug_dest[item["slug"]] = key

    for source_key, (model, _link, _fk) in buckets.items():
        rows = (await db.execute(select(model))).scalars().all()
        for row in rows:
            dest = slug_dest.get(row.slug)
            if dest and dest != source_key:
                await _relocate_label(db, row, source_key, dest, buckets)

    for key, (model, link_model, fk) in buckets.items():
        await _upsert_labels(db, model, taxonomy[key], link_model, fk)
    return taxonomy


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_sqlite_migrate)

    async with SessionLocal() as db:
        existing = (await db.execute(select(Genre.id).limit(1))).scalar_one_or_none()
        taxonomy = await sync_taxonomy(db)
        if not existing:
            original = (await db.execute(select(Fandom).where(Fandom.slug == "original"))).scalar_one_or_none()
            if not original:
                db.add(Fandom(name="Ориджинал", slug="original"))
            for username, display_name, rating, followers in (
                ("moonwander", "Вы", 0.0, 0),
                ("lunny-strannik", "Лунный странник", 4.9, 340),
                ("temniy-les", "Тёмный лес", 4.8, 210),
                ("zvezdnaya-pyl", "Звёздная пыль", 4.7, 520),
            ):
                row = (await db.execute(select(Author).where(Author.username == username))).scalar_one_or_none()
                if not row:
                    db.add(
                        Author(
                            username=username,
                            display_name=display_name,
                            rating_avg=rating,
                            story_count=0,
                            follower_count=followers,
                        )
                    )
            print(
                "Seed complete:",
                f"{len(taxonomy['genres'])} genres,",
                f"{len(taxonomy['formats'])} formats,",
                f"{len(taxonomy['warnings'])} warnings,",
                f"{len(taxonomy['kinks'])} kinks.",
                "Catalog is empty until works are created on the site.",
            )
        else:
            print(
                "Taxonomy synced:",
                f"{len(taxonomy['genres'])} genres,",
                f"{len(taxonomy['formats'])} formats,",
                f"{len(taxonomy['warnings'])} warnings,",
                f"{len(taxonomy['kinks'])} kinks.",
            )
        await db.commit()

    await ensure_core()


if __name__ == "__main__":
    asyncio.run(seed())

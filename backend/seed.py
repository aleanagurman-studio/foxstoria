"""Seed local database with the spreadsheet taxonomy and sample stories."""

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path

from slugify import slugify
from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import (
    AgeRating,
    Author,
    ContentWarning,
    Fandom,
    Genre,
    Kink,
    RomanceOrientation,
    Story,
    StoryStatus,
    StoryType,
    WorkFormat,
    work_size_for_chapters,
)

TAXONOMY_PATH = Path(__file__).resolve().parents[1] / "web" / "taxonomy.json"


def load_taxonomy() -> dict:
    return json.loads(TAXONOMY_PATH.read_text(encoding="utf-8"))


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        existing = (await db.execute(select(Genre.id).limit(1))).scalar_one_or_none()
        if existing:
            print("Database already seeded, skipping.")
            return

        taxonomy = load_taxonomy()
        genres: dict[str, Genre] = {}
        for item in taxonomy["genres"]:
            genre = Genre(name=item["name"], slug=item["slug"], description=item.get("description"))
            db.add(genre)
            genres[item["name"]] = genre
        formats: dict[str, WorkFormat] = {}
        for item in taxonomy["formats"]:
            work_format = WorkFormat(name=item["name"], slug=item["slug"], description=item.get("description"))
            db.add(work_format)
            formats[item["name"]] = work_format
        for item in taxonomy["warnings"]:
            db.add(ContentWarning(name=item["name"], slug=item["slug"], description=item.get("description")))
        for item in taxonomy["kinks"]:
            db.add(Kink(name=item["name"], slug=item["slug"], description=item.get("description")))

        original = Fandom(name="Ориджинал", slug="original")
        db.add(original)
        await db.flush()

        authors_data = [
            ("lunny-strannik", "Лунный странник", 4.9, 340),
            ("temniy-les", "Тёмный лес", 4.8, 210),
            ("zvezdnaya-pyl", "Звёздная пыль", 4.7, 520),
        ]
        authors = []
        for username, display_name, rating, followers in authors_data:
            author = Author(
                username=username,
                display_name=display_name,
                rating_avg=rating,
                story_count=0,
                follower_count=followers,
            )
            db.add(author)
            authors.append(author)
        await db.flush()

        now = datetime.now(timezone.utc)
        interactive = [
            ("Тени прошлого", ["Драма", "Мистика"], AgeRating.EIGHTEEN, 4.9, 32100, 42, 7),
            ("Лесная тропа", ["Фэнтези", "Приключения"], AgeRating.NONE, 4.8, 18400, 38, 5),
            ("Академия магии", ["Фэнтези", "Романтика"], AgeRating.SIXTEEN, 4.9, 25600, 55, 8),
            ("Тайна особняка", ["Ужасы", "Мистика"], AgeRating.EIGHTEEN, 4.8, 15200, 30, 6),
        ]
        linear = [
            ("Письма из прошлого", ["Драма", "Романтика"], AgeRating.SIXTEEN, 4.7, 9800, 24),
            ("Город без сна", ["Мистика", "Драма"], AgeRating.SIXTEEN, 4.6, 11200, 18),
            ("Последний вагон", ["Драма", "Повседневность"], AgeRating.NONE, 4.5, 7600, 15),
        ]

        for i, (title, genre_names, age, rating, plays, scenes, endings) in enumerate(interactive):
            story = Story(
                title=title,
                slug=slugify(title),
                description=f"Интерактивная новелла «{title}». Ваш выбор определяет сюжет.",
                story_type=StoryType.INTERACTIVE,
                status=StoryStatus.PUBLISHED,
                age_rating=age,
                romance=RomanceOrientation.GEN,
                fandom_id=original.id,
                rating_avg=rating,
                rating_count=1200 + i * 300,
                play_count=plays,
                scene_count=scenes,
                endings_count=endings,
                is_completed=True,
                work_size=work_size_for_chapters(scenes),
                author_id=authors[i % len(authors)].id,
                published_at=now,
            )
            story.genres = [genres[name] for name in genre_names]
            db.add(story)
            authors[i % len(authors)].story_count += 1

        for i, (title, genre_names, age, rating, reads, chapters) in enumerate(linear):
            story = Story(
                title=title,
                slug=slugify(title),
                description=f"Линейная история «{title}» для чтения без ветвлений.",
                story_type=StoryType.LINEAR,
                status=StoryStatus.PUBLISHED,
                age_rating=age,
                romance=RomanceOrientation.HET if title == "Письма из прошлого" else RomanceOrientation.GEN,
                fandom_id=original.id,
                rating_avg=rating,
                rating_count=800 + i * 200,
                play_count=reads,
                chapter_count=chapters,
                word_count=chapters * 3500,
                is_completed=True,
                work_size=work_size_for_chapters(chapters),
                author_id=authors[(i + 1) % len(authors)].id,
                published_at=now,
            )
            story.genres = [genres[name] for name in genre_names]
            if title == "Письма из прошлого":
                story.formats = [formats["Письма (стилизация)"]]
            db.add(story)
            authors[(i + 1) % len(authors)].story_count += 1

        await db.commit()
        print(
            "Seed complete:",
            f"{len(taxonomy['genres'])} genres,",
            f"{len(taxonomy['formats'])} formats,",
            f"{len(taxonomy['warnings'])} warnings,",
            f"{len(taxonomy['kinks'])} kinks.",
        )


if __name__ == "__main__":
    asyncio.run(seed())

"""Seed local database with sample authors, genres and stories."""

import asyncio
from datetime import datetime, timezone

from slugify import slugify
from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import Author, Genre, Story, StoryStatus, StoryType


GENRES = [
    ("Фэнтези", "fantasy"),
    ("Романтика", "romance"),
    ("Драма", "drama"),
    ("Мистика", "mystery"),
    ("Приключения", "adventure"),
    ("Sci-Fi", "sci-fi"),
    ("Хоррор", "horror"),
    ("Повседневность", "slice-of-life"),
]

INTERACTIVE_STORIES = [
    ("Тени прошлого", "Драма", "Мистика", "18+", 4.9, 32100, 42, 7),
    ("Лесная тропа", "Фэнтези", "Приключения", "12+", 4.8, 18400, 38, 5),
    ("Академия магии", "Фэнтези", "Романтика", "12+", 4.9, 25600, 55, 8),
    ("Тайна особняка", "Хоррор", "Мистика", "18+", 4.8, 15200, 30, 6),
]

LINEAR_STORIES = [
    ("Письма из прошлого", "Драма", "Романтика", "16+", 4.7, 9800, 24),
    ("Город без сна", "Мистика", "Драма", "16+", 4.6, 11200, 18),
    ("Последний вагон", "Драма", "Повседневность", "12+", 4.5, 7600, 15),
]


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        existing = (await db.execute(select(Genre.id).limit(1))).scalar_one_or_none()
        if existing:
            print("Database already seeded, skipping.")
            return

        genres = {}
        for name, slug in GENRES:
            genre = Genre(name=name, slug=slug)
            db.add(genre)
            genres[name] = genre
        await db.flush()

        authors_data = [
            ("lunny-strannik", "Лунный странник", 4.9, 12, 340),
            ("temniy-les", "Тёмный лес", 4.8, 8, 210),
            ("zvezdnaya-pyl", "Звёздная пыль", 4.7, 15, 520),
        ]
        authors = []
        for username, display_name, rating, story_count, followers in authors_data:
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

        for i, (title, g1, g2, age, rating, plays, scenes, endings) in enumerate(INTERACTIVE_STORIES):
            story = Story(
                title=title,
                slug=slugify(title),
                description=f"Интерактивная новелла «{title}». Ваш выбор определяет сюжет.",
                story_type=StoryType.INTERACTIVE,
                status=StoryStatus.PUBLISHED,
                age_rating=age,
                rating_avg=rating,
                rating_count=1200 + i * 300,
                play_count=plays,
                scene_count=scenes,
                endings_count=endings,
                is_completed=True,
                author_id=authors[i % len(authors)].id,
                published_at=now,
            )
            story.genres = [genres[g1], genres[g2]]
            db.add(story)
            authors[i % len(authors)].story_count += 1

        for i, (title, g1, g2, age, rating, reads, chapters) in enumerate(LINEAR_STORIES):
            story = Story(
                title=title,
                slug=slugify(title),
                description=f"Линейная история «{title}» для чтения без ветвлений.",
                story_type=StoryType.LINEAR,
                status=StoryStatus.PUBLISHED,
                age_rating=age,
                rating_avg=rating,
                rating_count=800 + i * 200,
                play_count=reads,
                chapter_count=chapters,
                word_count=chapters * 3500,
                is_completed=True,
                author_id=authors[(i + 1) % len(authors)].id,
                published_at=now,
            )
            story.genres = [genres[g1], genres[g2]]
            db.add(story)
            authors[(i + 1) % len(authors)].story_count += 1

        await db.commit()
        print("Seed complete: genres, authors, interactive & linear stories.")


if __name__ == "__main__":
    asyncio.run(seed())

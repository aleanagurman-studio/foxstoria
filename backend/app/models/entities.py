import enum
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class StoryType(str, enum.Enum):
    LINEAR = "linear"
    INTERACTIVE = "interactive"


class StoryStatus(str, enum.Enum):
    DRAFT = "draft"
    MODERATION = "moderation"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class AgeRating(str, enum.Enum):
    """Public age mark. No 12+: either unmarked, 16+ hints, or 18+ content."""

    NONE = "none"
    SIXTEEN = "16+"
    EIGHTEEN = "18+"


class RomanceOrientation(str, enum.Enum):
    SLASH = "slash"  # M/M
    FEMSLASH = "femslash"  # F/F
    HET = "het"  # M/F
    GEN = "gen"  # no romance


class WorkSize(str, enum.Enum):
    """Set only after the work is completed. Counted in chapters."""

    MINI = "mini"  # 1–20
    MIDI = "midi"  # 21–50
    MAXI = "maxi"  # 51+


MINI_MAX_CHAPTERS = 20
MIDI_MAX_CHAPTERS = 50


def work_size_for_chapters(chapter_count: int | None) -> WorkSize | None:
    if not chapter_count or chapter_count < 1:
        return None
    if chapter_count <= MINI_MAX_CHAPTERS:
        return WorkSize.MINI
    if chapter_count <= MIDI_MAX_CHAPTERS:
        return WorkSize.MIDI
    return WorkSize.MAXI


class AuthorPlan(str, enum.Enum):
    """Plus unlocks AI chapter summaries and character extraction."""

    FREE = "free"
    PLUS = "plus"


class Author(Base):
    __tablename__ = "authors"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(128))
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    rating_avg: Mapped[float] = mapped_column(Float, default=0.0)
    story_count: Mapped[int] = mapped_column(Integer, default=0)
    follower_count: Mapped[int] = mapped_column(Integer, default=0)
    plan: Mapped[AuthorPlan] = mapped_column(
        Enum(AuthorPlan, native_enum=False), default=AuthorPlan.FREE
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    stories: Mapped[list["Story"]] = relationship(back_populates="author")


class Genre(Base):
    __tablename__ = "genres"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    stories: Mapped[list["Story"]] = relationship(
        secondary="story_genres", back_populates="genres"
    )


class StoryGenre(Base):
    __tablename__ = "story_genres"
    __table_args__ = (UniqueConstraint("story_id", "genre_id"),)

    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), primary_key=True)
    genre_id: Mapped[int] = mapped_column(ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True)


class Fandom(Base):
    """Required on every work. Original works use the «Ориджинал» fandom."""

    __tablename__ = "fandoms"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True)
    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True)

    stories: Mapped[list["Story"]] = relationship(back_populates="fandom")


class Story(Base):
    __tablename__ = "stories"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(256), index=True)
    slug: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    author_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    story_type: Mapped[StoryType] = mapped_column(
        Enum(StoryType, native_enum=False), index=True
    )
    status: Mapped[StoryStatus] = mapped_column(
        Enum(StoryStatus, native_enum=False), default=StoryStatus.DRAFT, index=True
    )
    age_rating: Mapped[AgeRating] = mapped_column(
        Enum(AgeRating, native_enum=False), default=AgeRating.NONE, index=True
    )
    romance: Mapped[RomanceOrientation] = mapped_column(
        Enum(RomanceOrientation, native_enum=False),
        default=RomanceOrientation.GEN,
        index=True,
    )
    fandom_id: Mapped[int] = mapped_column(ForeignKey("fandoms.id"), index=True)
    work_size: Mapped[WorkSize | None] = mapped_column(
        Enum(WorkSize, native_enum=False), nullable=True
    )
    is_paid: Mapped[bool] = mapped_column(default=False)
    price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rating_avg: Mapped[float] = mapped_column(Float, default=0.0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    play_count: Mapped[int] = mapped_column(Integer, default=0)
    scene_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    endings_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    chapter_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    word_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_completed: Mapped[bool] = mapped_column(default=False)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    author: Mapped["Author"] = relationship(back_populates="stories")
    fandom: Mapped["Fandom"] = relationship(back_populates="stories")
    genres: Mapped[list["Genre"]] = relationship(
        secondary="story_genres", back_populates="stories"
    )
    credits: Mapped[list["StoryCredit"]] = relationship(
        cascade="all, delete-orphan"
    )
    chapters: Mapped[list["Chapter"]] = relationship(
        back_populates="story", cascade="all, delete-orphan"
    )
    scenes: Mapped[list["Scene"]] = relationship(
        back_populates="story", cascade="all, delete-orphan"
    )
    characters: Mapped[list["Character"]] = relationship(
        back_populates="story", cascade="all, delete-orphan"
    )
    notes: Mapped[list["StoryNote"]] = relationship(
        back_populates="story", cascade="all, delete-orphan"
    )
    timeline_events: Mapped[list["TimelineEvent"]] = relationship(
        back_populates="story", cascade="all, delete-orphan"
    )

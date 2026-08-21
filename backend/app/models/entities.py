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


class Story(Base):
    __tablename__ = "stories"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(256), index=True)
    slug: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    story_type: Mapped[StoryType] = mapped_column(
        Enum(StoryType, native_enum=False), index=True
    )
    status: Mapped[StoryStatus] = mapped_column(
        Enum(StoryStatus, native_enum=False), default=StoryStatus.DRAFT, index=True
    )
    age_rating: Mapped[str] = mapped_column(String(8), default="12+")
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
    genres: Mapped[list["Genre"]] = relationship(
        secondary="story_genres", back_populates="stories"
    )

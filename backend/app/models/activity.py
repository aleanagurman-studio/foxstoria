"""Reader activity: bookmarks, history, stats, notifications, sessions."""

import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.types import str_enum


class BookmarkTarget(str, enum.Enum):
    STORY = "story"
    NEWS = "news"
    COLLECTION = "collection"


class NotificationKind(str, enum.Enum):
    COMMENT = "comment"
    FOLLOW = "follow"
    MESSAGE = "message"
    STORY = "story"
    SYSTEM = "system"
    PAYMENT = "payment"


class Bookmark(Base):
    """Saved items in the reader cabinet (works, news, packs)."""

    __tablename__ = "bookmarks"
    __table_args__ = (UniqueConstraint("author_id", "target_type", "target_key"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    target_type: Mapped[BookmarkTarget] = mapped_column(str_enum(BookmarkTarget), index=True)
    target_key: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ReadingProgress(Base):
    """Last place in a work. One row per reader per story."""

    __tablename__ = "reading_progress"
    __table_args__ = (UniqueConstraint("author_id", "story_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), index=True)
    chapter_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    scene_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserCounters(Base):
    """Running totals for the profile and cabinets."""

    __tablename__ = "user_counters"

    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), primary_key=True)
    works_read: Mapped[int] = mapped_column(Integer, default=0)
    likes_given: Mapped[int] = mapped_column(Integer, default=0)
    comments_written: Mapped[int] = mapped_column(Integer, default=0)
    follows: Mapped[int] = mapped_column(Integer, default=0)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class DailyCounter(Base):
    """Per-day activity for charts."""

    __tablename__ = "daily_counters"
    __table_args__ = (UniqueConstraint("author_id", "day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    reads: Mapped[int] = mapped_column(Integer, default=0)
    likes: Mapped[int] = mapped_column(Integer, default=0)
    comments: Mapped[int] = mapped_column(Integer, default=0)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    kind: Mapped[NotificationKind] = mapped_column(str_enum(NotificationKind), index=True)
    title: Mapped[str] = mapped_column(String(256))
    body: Mapped[str] = mapped_column(Text, default="")
    href: Mapped[str | None] = mapped_column(String(512), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DeviceSession(Base):
    """Settings → sessions / devices."""

    __tablename__ = "device_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(128), default="")
    device_key: Mapped[str] = mapped_column(String(64), index=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CollectionFollow(Base):
    __tablename__ = "collection_follows"
    __table_args__ = (UniqueConstraint("author_id", "collection_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    collection_id: Mapped[int] = mapped_column(ForeignKey("collections.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PageHit(Base):
    """Anonymous page views for admin traffic charts."""

    __tablename__ = "page_hits"
    __table_args__ = (UniqueConstraint("path", "day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    path: Mapped[str] = mapped_column(String(256), index=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    hits: Mapped[int] = mapped_column(Integer, default=0)

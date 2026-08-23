"""Account layer: one person is both reader and author.

Public profile fields may appear on /profile.
Reader cabinet, messages, settings, and blacklist stay private.
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class StoryCreditRole(str, enum.Enum):
    OWNER = "owner"
    COAUTHOR = "coauthor"
    EDITOR = "editor"


class FollowTarget(str, enum.Enum):
    AUTHOR = "author"
    STORY = "story"


class PostKind(str, enum.Enum):
    TEXT = "text"
    ANNOUNCEMENT = "announcement"
    POLL = "poll"


class SocialLink(Base):
    """Public links on the profile (Telegram, VK, site)."""

    __tablename__ = "social_links"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(64))
    url: Mapped[str] = mapped_column(String(512))
    sort_index: Mapped[int] = mapped_column(Integer, default=0)


class StoryCredit(Base):
    """Owner, co-author, or editor of a work. Shown on the public profile."""

    __tablename__ = "story_credits"
    __table_args__ = (UniqueConstraint("author_id", "story_id", "role"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), index=True)
    role: Mapped[StoryCreditRole] = mapped_column(Enum(StoryCreditRole, native_enum=False))


class Follow(Base):
    """Reader cabinet: follow an author or a work."""

    __tablename__ = "follows"
    __table_args__ = (UniqueConstraint("follower_id", "target_type", "author_id", "story_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    follower_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    target_type: Mapped[FollowTarget] = mapped_column(Enum(FollowTarget, native_enum=False))
    author_id: Mapped[int | None] = mapped_column(
        ForeignKey("authors.id", ondelete="CASCADE"), nullable=True
    )
    story_id: Mapped[int | None] = mapped_column(
        ForeignKey("stories.id", ondelete="CASCADE"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StoryLike(Base):
    __tablename__ = "story_likes"
    __table_args__ = (UniqueConstraint("author_id", "story_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ViewHistory(Base):
    """Private reader history. Not shown on the public profile."""

    __tablename__ = "view_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), index=True)
    last_scene_id: Mapped[int | None] = mapped_column(ForeignKey("scenes.id", ondelete="SET NULL"), nullable=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Collection(Base):
    """Reader-made packs. Public ones appear on the profile."""

    __tablename__ = "collections"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(256))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    items: Mapped[list["CollectionItem"]] = relationship(
        back_populates="collection", cascade="all, delete-orphan"
    )


class CollectionItem(Base):
    __tablename__ = "collection_items"
    __table_args__ = (UniqueConstraint("collection_id", "story_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    collection_id: Mapped[int] = mapped_column(
        ForeignKey("collections.id", ondelete="CASCADE"), index=True
    )
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), index=True)
    sort_index: Mapped[int] = mapped_column(Integer, default=0)

    collection: Mapped["Collection"] = relationship(back_populates="items")


class ProfilePost(Base):
    """Public feed: notes, announcements, polls."""

    __tablename__ = "profile_posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    kind: Mapped[PostKind] = mapped_column(Enum(PostKind, native_enum=False), default=PostKind.TEXT)
    title: Mapped[str | None] = mapped_column(String(256), nullable=True)
    body: Mapped[str] = mapped_column(Text)
    story_id: Mapped[int | None] = mapped_column(
        ForeignKey("stories.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["PollOption"]] = relationship(
        back_populates="post", cascade="all, delete-orphan"
    )


class PollOption(Base):
    __tablename__ = "poll_options"

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("profile_posts.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(256))
    vote_count: Mapped[int] = mapped_column(Integer, default=0)

    post: Mapped["ProfilePost"] = relationship(back_populates="options")


class MessageThread(Base):
    __tablename__ = "message_threads"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MessageParticipant(Base):
    __tablename__ = "message_participants"
    __table_args__ = (UniqueConstraint("thread_id", "author_id"),)

    thread_id: Mapped[int] = mapped_column(
        ForeignKey("message_threads.id", ondelete="CASCADE"), primary_key=True
    )
    author_id: Mapped[int] = mapped_column(
        ForeignKey("authors.id", ondelete="CASCADE"), primary_key=True
    )


class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[int] = mapped_column(
        ForeignKey("message_threads.id", ondelete="CASCADE"), index=True
    )
    sender_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Block(Base):
    """Settings → blacklist. Hidden from the blocked person."""

    __tablename__ = "blocks"
    __table_args__ = (UniqueConstraint("author_id", "blocked_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    blocked_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserSettings(Base):
    """Private: auth, notifications, editor prefs. One row per account."""

    __tablename__ = "user_settings"

    author_id: Mapped[int] = mapped_column(
        ForeignKey("authors.id", ondelete="CASCADE"), primary_key=True
    )
    notify_comments: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_follows: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_messages: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_story_updates: Mapped[bool] = mapped_column(Boolean, default=True)
    editor_autosave: Mapped[bool] = mapped_column(Boolean, default=True)
    editor_show_minimap: Mapped[bool] = mapped_column(Boolean, default=True)

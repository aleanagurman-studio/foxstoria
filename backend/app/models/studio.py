"""Author studio: private writing tools. Never expose these on public story APIs."""

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class NoteFolder(str, enum.Enum):
    PLOT = "plot"
    IDEAS = "ideas"
    DIALOGUES = "dialogues"
    FUTURE = "future"


class SummarySource(str, enum.Enum):
    MANUAL = "manual"
    AI = "ai"
    AI_EDITED = "ai_edited"


class AiJobKind(str, enum.Enum):
    CHAPTER_SUMMARY = "chapter_summary"
    CHARACTER_EXTRACT = "character_extract"
    CHARACTER_UPDATE = "character_update"


class AiJobStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class Chapter(Base):
    """Grouping of scenes. Linear stories read in chapter order."""

    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(primary_key=True)
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(256))
    sort_index: Mapped[int] = mapped_column(Integer, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)

    # Private recap for the author. Readers never see this field.
    summary_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_source: Mapped[SummarySource] = mapped_column(
        Enum(SummarySource, native_enum=False), default=SummarySource.MANUAL
    )
    ai_draft: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    author_edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    story: Mapped["Story"] = relationship(back_populates="chapters")
    scenes: Mapped[list["Scene"]] = relationship(back_populates="chapter")


class Scene(Base):
    """Playable unit. Interactive stories connect scenes with choices."""

    __tablename__ = "scenes"

    id: Mapped[int] = mapped_column(primary_key=True)
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), index=True)
    chapter_id: Mapped[int | None] = mapped_column(
        ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(256))
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_index: Mapped[int] = mapped_column(Integer, default=0)
    is_start: Mapped[bool] = mapped_column(Boolean, default=False)
    is_ending: Mapped[bool] = mapped_column(Boolean, default=False)
    graph_x: Mapped[float] = mapped_column(Float, default=0.0)
    graph_y: Mapped[float] = mapped_column(Float, default=0.0)

    story: Mapped["Story"] = relationship(back_populates="scenes")
    chapter: Mapped["Chapter | None"] = relationship(back_populates="scenes")
    outgoing: Mapped[list["SceneChoice"]] = relationship(
        back_populates="from_scene",
        foreign_keys="SceneChoice.from_scene_id",
        cascade="all, delete-orphan",
    )


class SceneChoice(Base):
    __tablename__ = "scene_choices"

    id: Mapped[int] = mapped_column(primary_key=True)
    from_scene_id: Mapped[int] = mapped_column(ForeignKey("scenes.id", ondelete="CASCADE"), index=True)
    to_scene_id: Mapped[int] = mapped_column(ForeignKey("scenes.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(256))
    sort_index: Mapped[int] = mapped_column(Integer, default=0)

    from_scene: Mapped["Scene"] = relationship(foreign_keys=[from_scene_id], back_populates="outgoing")
    to_scene: Mapped["Scene"] = relationship(foreign_keys=[to_scene_id])


class TimelineEvent(Base):
    """In-world chronology, not reading order.

    Linear stories: a single sequence (sort_index).
    Interactive stories: a tree/DAG via TimelineEdge — branches can split and rejoin.
    """

    __tablename__ = "timeline_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(256))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    story_time: Mapped[str | None] = mapped_column(String(128), nullable=True)
    sort_index: Mapped[int] = mapped_column(Integer, default=0)
    linked_scene_id: Mapped[int | None] = mapped_column(
        ForeignKey("scenes.id", ondelete="SET NULL"), nullable=True
    )

    story: Mapped["Story"] = relationship(back_populates="timeline_events")
    outgoing: Mapped[list["TimelineEdge"]] = relationship(
        back_populates="from_event",
        foreign_keys="TimelineEdge.from_event_id",
        cascade="all, delete-orphan",
    )


class TimelineEdge(Base):
    __tablename__ = "timeline_edges"

    id: Mapped[int] = mapped_column(primary_key=True)
    from_event_id: Mapped[int] = mapped_column(
        ForeignKey("timeline_events.id", ondelete="CASCADE"), index=True
    )
    to_event_id: Mapped[int] = mapped_column(
        ForeignKey("timeline_events.id", ondelete="CASCADE"), index=True
    )
    branch_label: Mapped[str | None] = mapped_column(String(128), nullable=True)

    from_event: Mapped["TimelineEvent"] = relationship(
        foreign_keys=[from_event_id], back_populates="outgoing"
    )
    to_event: Mapped["TimelineEvent"] = relationship(foreign_keys=[to_event_id])


class Character(Base):
    """Author-only character bible for one story. Not visible to readers."""

    __tablename__ = "characters"

    id: Mapped[int] = mapped_column(primary_key=True)
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(128), index=True)
    aliases: Mapped[str | None] = mapped_column(String(512), nullable=True)
    role: Mapped[str | None] = mapped_column(String(64), nullable=True)
    short_bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    traits: Mapped[str | None] = mapped_column(Text, nullable=True)
    appearance: Mapped[str | None] = mapped_column(Text, nullable=True)
    secrets: Mapped[str | None] = mapped_column(Text, nullable=True)
    lock_ai_updates: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_suggestions: Mapped[str | None] = mapped_column(Text, nullable=True)

    story: Mapped["Story"] = relationship(back_populates="characters")
    notes: Mapped[list["StoryNote"]] = relationship(back_populates="character")


class StoryNote(Base):
    """Private notebooks: plot, ideas, dialogues, future events."""

    __tablename__ = "story_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), index=True)
    character_id: Mapped[int | None] = mapped_column(
        ForeignKey("characters.id", ondelete="SET NULL"), nullable=True
    )
    scene_id: Mapped[int | None] = mapped_column(
        ForeignKey("scenes.id", ondelete="SET NULL"), nullable=True
    )
    folder: Mapped[NoteFolder] = mapped_column(Enum(NoteFolder, native_enum=False), index=True)
    title: Mapped[str] = mapped_column(String(256))
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    story: Mapped["Story"] = relationship(back_populates="notes")
    character: Mapped["Character | None"] = relationship(back_populates="notes")


class AiJob(Base):
    """Plus-plan jobs. Results land in ai_draft / ai_suggestions, never overwrite locked fields."""

    __tablename__ = "ai_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id", ondelete="CASCADE"), index=True)
    chapter_id: Mapped[int | None] = mapped_column(
        ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True
    )
    kind: Mapped[AiJobKind] = mapped_column(Enum(AiJobKind, native_enum=False), index=True)
    status: Mapped[AiJobStatus] = mapped_column(
        Enum(AiJobStatus, native_enum=False), default=AiJobStatus.QUEUED
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

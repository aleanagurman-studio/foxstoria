from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from app.models import (
    AgeRating,
    RomanceOrientation,
    StoryCreditRole,
    StoryType,
    WorkSize,
)


class StorySort(str, Enum):
    POPULAR = "popular"
    RATING = "rating"
    NEW = "new"
    PLAY_COUNT = "play_count"


class AuthorBrief(BaseModel):
    id: int
    username: str
    display_name: str
    avatar_url: str | None = None
    rating_avg: float
    story_count: int

    model_config = {"from_attributes": True}


class GenreBrief(BaseModel):
    id: int
    name: str
    slug: str

    model_config = {"from_attributes": True}


class FandomBrief(BaseModel):
    id: int
    name: str
    slug: str

    model_config = {"from_attributes": True}


class CreditBrief(BaseModel):
    role: StoryCreditRole
    author: AuthorBrief


class StoryListItem(BaseModel):
    id: int
    title: str
    slug: str
    description: str | None
    author_notes: str | None
    cover_url: str | None
    story_type: StoryType
    age_rating: AgeRating
    romance: RomanceOrientation
    fandom: FandomBrief
    work_size: WorkSize | None
    is_paid: bool
    price: int | None
    rating_avg: float
    rating_count: int
    play_count: int
    scene_count: int | None
    endings_count: int | None
    chapter_count: int | None
    is_completed: bool
    author: AuthorBrief
    editor: AuthorBrief | None = None
    coauthors: list[AuthorBrief] = Field(default_factory=list)
    genres: list[GenreBrief]
    published_at: datetime | None

    model_config = {"from_attributes": True}


class StoryListResponse(BaseModel):
    items: list[StoryListItem]
    total: int
    page: int
    page_size: int


class AuthorListItem(BaseModel):
    id: int
    username: str
    display_name: str
    avatar_url: str | None
    bio: str | None
    rating_avg: float
    story_count: int
    follower_count: int

    model_config = {"from_attributes": True}


class AuthorListResponse(BaseModel):
    items: list[AuthorListItem]
    total: int


class StoryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=256)
    description: str | None = None
    author_notes: str | None = None
    story_type: StoryType
    age_rating: AgeRating = AgeRating.NONE
    romance: RomanceOrientation = RomanceOrientation.GEN
    fandom_slug: str
    author_id: int
    editor_id: int | None = None
    coauthor_ids: list[int] = Field(default_factory=list)
    genre_slugs: list[str] = Field(default_factory=list)
    cover_url: str | None = None
    is_paid: bool = False
    price: int | None = None
    scene_count: int | None = None
    endings_count: int | None = None
    chapter_count: int | None = None
    is_completed: bool = False

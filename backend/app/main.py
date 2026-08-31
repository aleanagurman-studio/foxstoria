from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api.account import router as account_router
from app.api.admin import router as admin_router
from app.api.messages import router as messages_router
from app.api.routes import router
from app.api.works import router as works_router
from app.config import settings
from app.database import Base, engine
from app import models  # noqa: F401 — register all tables

WEB_DIR = Path(__file__).resolve().parents[2] / "web"


def _sqlite_migrate(sync_conn) -> None:
    try:
        url = str(sync_conn.engine.url)
    except AttributeError:
        return
    if "sqlite" not in url:
        return
    try:
        rows = sync_conn.execute(text("PRAGMA table_info(stories)")).fetchall()
    except Exception:
        return
    cols = {row[1] for row in rows}
    if "card_json" not in cols:
        sync_conn.execute(text("ALTER TABLE stories ADD COLUMN card_json TEXT"))
    if "content_json" not in cols:
        sync_conn.execute(text("ALTER TABLE stories ADD COLUMN content_json TEXT"))
    try:
        thread_cols = {row[1] for row in sync_conn.execute(text("PRAGMA table_info(message_threads)")).fetchall()}
    except Exception:
        thread_cols = set()
    if thread_cols:
        if "kind" not in thread_cols:
            sync_conn.execute(text("ALTER TABLE message_threads ADD COLUMN kind VARCHAR(16) DEFAULT 'direct'"))
        if "updated_at" not in thread_cols:
            sync_conn.execute(text("ALTER TABLE message_threads ADD COLUMN updated_at DATETIME"))
    try:
        part_cols = {row[1] for row in sync_conn.execute(text("PRAGMA table_info(message_participants)")).fetchall()}
    except Exception:
        part_cols = set()
    if part_cols and "last_read_at" not in part_cols:
        sync_conn.execute(text("ALTER TABLE message_participants ADD COLUMN last_read_at DATETIME"))
    try:
        col_cols = {row[1] for row in sync_conn.execute(text("PRAGMA table_info(collections)")).fetchall()}
    except Exception:
        col_cols = set()
    if col_cols:
        if "cover_url" not in col_cols:
            sync_conn.execute(text("ALTER TABLE collections ADD COLUMN cover_url VARCHAR(512)"))
        if "is_pinned" not in col_cols:
            sync_conn.execute(text("ALTER TABLE collections ADD COLUMN is_pinned BOOLEAN DEFAULT 0"))
    try:
        set_cols = {row[1] for row in sync_conn.execute(text("PRAGMA table_info(user_settings)")).fetchall()}
    except Exception:
        set_cols = set()
    if set_cols:
        alters = {
            "privacy_messages": "VARCHAR(32) DEFAULT 'followers'",
            "privacy_profile": "VARCHAR(32) DEFAULT 'all'",
            "privacy_packs": "VARCHAR(32) DEFAULT 'public'",
            "adult_blur": "BOOLEAN DEFAULT 0",
            "download_auto_chapters": "BOOLEAN DEFAULT 1",
            "download_wifi_only": "BOOLEAN DEFAULT 1",
            "download_max_mb": "INTEGER DEFAULT 2048",
            "prefs_json": "TEXT",
        }
        for name, spec in alters.items():
            if name not in set_cols:
                sync_conn.execute(text(f"ALTER TABLE user_settings ADD COLUMN {name} {spec}"))
    try:
        fan_cols = {row[1] for row in sync_conn.execute(text("PRAGMA table_info(fandoms)")).fetchall()}
    except Exception:
        fan_cols = set()
    if fan_cols and "category" not in fan_cols:
        sync_conn.execute(text("ALTER TABLE fandoms ADD COLUMN category VARCHAR(64) DEFAULT ''"))
    try:
        author_cols = {row[1] for row in sync_conn.execute(text("PRAGMA table_info(authors)")).fetchall()}
    except Exception:
        author_cols = set()
    if author_cols:
        if "last_seen_at" not in author_cols:
            sync_conn.execute(text("ALTER TABLE authors ADD COLUMN last_seen_at DATETIME"))
        if "blocked_at" not in author_cols:
            sync_conn.execute(text("ALTER TABLE authors ADD COLUMN blocked_at DATETIME"))
    try:
        story_cols = {row[1] for row in sync_conn.execute(text("PRAGMA table_info(stories)")).fetchall()}
    except Exception:
        story_cols = set()
    if story_cols and "deleted_at" not in story_cols:
        sync_conn.execute(text("ALTER TABLE stories ADD COLUMN deleted_at DATETIME"))
    try:
        report_cols = {row[1] for row in sync_conn.execute(text("PRAGMA table_info(content_reports)")).fetchall()}
    except Exception:
        report_cols = set()
    if report_cols:
        if "target_url" not in report_cols:
            sync_conn.execute(text("ALTER TABLE content_reports ADD COLUMN target_url VARCHAR(512) DEFAULT ''"))
        if "reason_code" not in report_cols:
            sync_conn.execute(text("ALTER TABLE content_reports ADD COLUMN reason_code VARCHAR(64) DEFAULT ''"))


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_sqlite_migrate)
    yield
    await engine.dispose()


app = FastAPI(title="FoxStoria API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(works_router, prefix="/api")
app.include_router(messages_router, prefix="/api")
app.include_router(account_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

if WEB_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(WEB_DIR), html=True), name="web")

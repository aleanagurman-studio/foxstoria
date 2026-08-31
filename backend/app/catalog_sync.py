"""Keep web/fandoms.json and characters-by-fandom.json in sync with the DB."""

from __future__ import annotations

import json
from pathlib import Path

from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Fandom, FandomCharacter

WEB_DIR = Path(__file__).resolve().parents[2] / "web"
FANDOM_JSON = WEB_DIR / "fandoms.json"
CHAR_JSON = WEB_DIR / "characters-by-fandom.json"
TAXONOMY_JSON = WEB_DIR / "taxonomy.json"


def load_taxonomy_categories() -> list[dict]:
    data = json.loads(TAXONOMY_JSON.read_text(encoding="utf-8"))
    return list(data.get("categories") or [])


def character_slug(name: str) -> str:
    return (slugify(name) or "character")[:256]


async def seed_fandom_catalog(db: AsyncSession) -> dict:
    count = (await db.execute(select(func.count(Fandom.id)))).scalar_one()
    char_count = (await db.execute(select(func.count(FandomCharacter.id)))).scalar_one()
    if count and count >= 100 and char_count:
        return {"seeded": False, "fandoms": int(count), "characters": int(char_count)}

    fandoms = json.loads(FANDOM_JSON.read_text(encoding="utf-8"))
    characters = json.loads(CHAR_JSON.read_text(encoding="utf-8"))
    rows = (await db.execute(select(Fandom))).scalars().all()
    existing = {row.slug: row for row in rows}
    names = {row.name.lower(): row for row in rows}

    for item in fandoms:
        slug = str(item.get("slug") or "").strip()
        name = str(item.get("name") or slug).strip()[:256]
        category = str(item.get("category") or "").strip()
        if not slug:
            continue
        row = existing.get(slug)
        if row:
            if category and not row.category:
                row.category = category
            continue
        twin = names.get(name.lower())
        if twin:
            if category and not twin.category:
                twin.category = category
            existing[slug] = twin
            continue
        row = Fandom(name=name, slug=slug[:256], category=category)
        db.add(row)
        existing[slug] = row
        names[name.lower()] = row
    await db.flush()

    have = (
        await db.execute(select(FandomCharacter.fandom_id, FandomCharacter.slug))
    ).all()
    seen = {(fid, slug) for fid, slug in have}
    for fslug, names in characters.items():
        fandom = existing.get(str(fslug))
        if not fandom or not fandom.id:
            continue
        for raw in names or []:
            name = str(raw or "").strip()
            if not name:
                continue
            slug = character_slug(name)
            key = (fandom.id, slug)
            if key in seen:
                continue
            seen.add(key)
            db.add(FandomCharacter(fandom_id=fandom.id, name=name[:512], slug=slug))
    await db.flush()
    return {
        "seeded": True,
        "fandoms": (await db.execute(select(func.count(Fandom.id)))).scalar_one(),
        "characters": (await db.execute(select(func.count(FandomCharacter.id)))).scalar_one(),
    }


def write_fandoms_json(rows: list[Fandom]) -> None:
    payload = [{"name": row.name, "slug": row.slug, "category": row.category or ""} for row in rows]
    payload.sort(key=lambda item: (item["category"], item["name"].lower()))
    FANDOM_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def patch_characters_json(fandom_slug: str, names: list[str]) -> None:
    data = {}
    if CHAR_JSON.exists():
        data = json.loads(CHAR_JSON.read_text(encoding="utf-8"))
    data[fandom_slug] = names
    CHAR_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


async def dump_fandoms(db: AsyncSession) -> None:
    rows = (await db.execute(select(Fandom).order_by(Fandom.category, Fandom.name))).scalars().all()
    write_fandoms_json(rows)


async def dump_characters_for(db: AsyncSession, fandom: Fandom) -> None:
    names = (
        await db.execute(
            select(FandomCharacter.name)
            .where(FandomCharacter.fandom_id == fandom.id)
            .order_by(FandomCharacter.name)
        )
    ).scalars().all()
    patch_characters_json(fandom.slug, list(names))

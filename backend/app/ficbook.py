"""Fetch a Ficbook work: header, tags, and chapter HTML."""

from __future__ import annotations

import html as html_lib
import re
import urllib.error
import urllib.request
from urllib.parse import urljoin, urlparse

FICBOOK_HOSTS = {"ficbook.net", "www.ficbook.net"}
MAX_CHAPTERS = 40
MAX_BODY = 400_000
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)
ADULT_COOKIE = "adult=1; confirmedAge=18; isAdult=1; adultConfirmed=1"

RATING_MAP = {
    "g": "0+",
    "pg": "0+",
    "pg-13": "0+",
    "pg13": "0+",
    "r": "16+",
    "nc-17": "18+",
    "nc17": "18+",
    "nc-21": "18+",
    "nc21": "18+",
}

ROMANCE_MAP = {
    "гет": "het",
    "het": "het",
    "слэш": "slash",
    "slash": "slash",
    "фемслэш": "femslash",
    "фем-слэш": "femslash",
    "femslash": "femslash",
    "джен": "gen",
    "gen": "gen",
    "смешанный": "mixed",
    "mixed": "mixed",
}


class FicbookError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def normalize_url(raw: str) -> str:
    text = str(raw or "").strip()
    if not text:
        raise FicbookError("Вставьте ссылку на работу с ficbook.net")
    if not re.match(r"^https?://", text, re.I):
        text = "https://" + text.lstrip("/")
    parsed = urlparse(text)
    host = (parsed.hostname or "").lower()
    if host not in FICBOOK_HOSTS:
        raise FicbookError("Нужна ссылка вида https://ficbook.net/readfic/…")
    match = re.search(r"/readfic/([\d\-a-zA-Z]+)", parsed.path or "")
    if not match:
        raise FicbookError("В ссылке нет номера работы (/readfic/…)")
    return f"https://ficbook.net/readfic/{match.group(1)}"


def _fetch(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ru,en;q=0.8",
            "Cookie": ADULT_COOKIE,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            raw = resp.read()
            charset = resp.headers.get_content_charset() or "utf-8"
            return raw.decode(charset, errors="replace")
    except urllib.error.HTTPError as err:
        if err.code == 404:
            raise FicbookError("Работа на ФБ не найдена", 404) from err
        raise FicbookError(f"ФБ ответил {err.code}. Попробуйте позже.", 502) from err
    except urllib.error.URLError as err:
        raise FicbookError("Не удалось открыть ФБ. Проверьте ссылку и сеть.", 502) from err


def _strip_tags(chunk: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", chunk or "", flags=re.I)
    text = re.sub(r"</(p|div|h[1-6]|li|tr)>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html_lib.unescape(text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _inner_by_attr(html: str, tag: str, attr: str, value: str) -> str | None:
    pattern = re.compile(
        rf"<{tag}\b([^>]*\s{attr}=['\"]{re.escape(value)}['\"][^>]*)>",
        re.I,
    )
    match = pattern.search(html)
    if not match:
        pattern = re.compile(
            rf"<{tag}\b([^>]*\s{attr}=['\"][^'\"]*\b{re.escape(value)}\b[^'\"]*['\"][^>]*)>",
            re.I,
        )
        match = pattern.search(html)
    if not match:
        return None
    start = match.end()
    depth = 1
    pos = start
    open_re = re.compile(rf"<{tag}\b", re.I)
    close_re = re.compile(rf"</{tag}\s*>", re.I)
    while pos < len(html) and depth:
        nxt_open = open_re.search(html, pos)
        nxt_close = close_re.search(html, pos)
        if not nxt_close:
            return html[start:]
        if nxt_open and nxt_open.start() < nxt_close.start():
            depth += 1
            pos = nxt_open.end()
        else:
            depth -= 1
            if depth == 0:
                return html[start : nxt_close.start()]
            pos = nxt_close.end()
    return html[start:]


def _links(html: str, href_re: str) -> list[tuple[str, str, str]]:
    found: list[tuple[str, str, str]] = []
    for match in re.finditer(r"<a\b([^>]*)>([\s\S]*?)</a>", html or "", re.I):
        attrs, inner = match.group(1), match.group(2)
        href_m = re.search(r"""href=['"]([^'"]+)['"]""", attrs, re.I)
        if not href_m:
            continue
        href = html_lib.unescape(href_m.group(1))
        if not re.search(href_re, href):
            continue
        found.append((href, _strip_tags(inner), attrs))
    return found


def _uniq(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in values:
        text = re.sub(r"\s+", " ", str(item or "")).strip()
        key = text.casefold()
        if not text or key in seen:
            continue
        seen.add(key)
        out.append(text)
    return out


def map_rating(raw: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "", (raw or "").lower())
    if text in RATING_MAP:
        return RATING_MAP[text]
    dashed = (raw or "").lower().replace(" ", "")
    dashed = re.sub(r"[^a-z0-9-]", "", dashed)
    return RATING_MAP.get(dashed, "0+")


def map_romance(raw: str) -> str:
    key = re.sub(r"\s+", " ", (raw or "").strip().lower().replace("ё", "е"))
    for token, slug in ROMANCE_MAP.items():
        if token in key:
            return slug
    return "gen"


def _sanitize_html(chunk: str) -> str:
    text = re.sub(r"<(script|style|iframe|object|embed)[\s\S]*?</\1>", "", chunk or "", flags=re.I)
    text = re.sub(r"\son[a-z]+\s*=\s*(['\"]).*?\1", "", text, flags=re.I)
    text = re.sub(r"\s(href|src)\s*=\s*(['\"])\s*javascript:[^'\"]*\2", "", text, flags=re.I)
    if "<" not in text:
        text = html_lib.escape(text).replace("\n", "<br>\n")
    if len(text) > MAX_BODY:
        text = text[:MAX_BODY] + "…"
    return text.strip()


def _parse_header(html: str, story_url: str) -> dict:
    if "adultCoverWarning" in html and "chapter-info" not in html:
        raise FicbookError("Работа 18+ на ФБ закрыта предупреждением. Откройте её в браузере и повторите.")

    title_block = _inner_by_attr(html, "section", "class", "chapter-info") or ""
    h1 = re.search(r"<h1\b[^>]*>([\s\S]*?)</h1>", title_block or html, re.I)
    title = _strip_tags(re.sub(r"<sup\b[\s\S]*?</sup>", "", h1.group(1) if h1 else ""))
    if not title:
        raise FicbookError("Не удалось прочитать шапку работы на ФБ")

    author = ""
    for href, label, attrs in _links(html, r"/authors/"):
        if "creator-username" in attrs or label:
            author = label
            if "creator-username" in attrs:
                break
    creator = re.search(
        r"""<a\b[^>]*class=['"][^'"]*creator-username[^'"]*['"][^>]*>([\s\S]*?)</a>""",
        html,
        re.I,
    )
    if creator:
        author = _strip_tags(creator.group(1)) or author

    fandoms = [label for href, label, _attrs in _links(html, r"/fanfiction/") if label]
    tags = [label for href, label, _attrs in _links(html, r"/tags/") if label]

    pairing_labels: list[str] = []
    characters: list[str] = []
    for href, label, attrs in _links(html, r"/pairings/"):
        if not label:
            continue
        highlighted = "pairing-highlight" in attrs
        if highlighted or "/" in label or "|" in label:
            pairing_labels.append(label.replace(" / ", "/"))
            for part in re.split(r"\s*[|/]\s*", label):
                if part.strip():
                    characters.append(part.strip())
        else:
            characters.append(label)

    rating_raw = ""
    class_m = re.search(r"ds-label-rating-([a-z0-9-]+)", html, re.I)
    if class_m:
        rating_raw = class_m.group(1)
    badge = _inner_by_attr(html, "div", "class", "ds-label-rating-") or ""
    if not rating_raw:
        rating_raw = _strip_tags(badge)
    else:
        rating_raw = _strip_tags(badge) or rating_raw

    direction = ""
    dir_block = _inner_by_attr(html, "div", "class", "direction") or ""
    if dir_block:
        direction = _strip_tags(dir_block)

    description = _strip_tags(_inner_by_attr(html, "div", "itemprop", "description") or "")
    dedication = _strip_tags(_inner_by_attr(html, "div", "class", "js-public-beta-dedication") or "")
    comment = _strip_tags(_inner_by_attr(html, "div", "class", "js-public-beta-author-comment") or "")

    chapters: list[dict] = []
    parts = _inner_by_attr(html, "ul", "class", "list-of-fanfic-parts") or ""
    story_id = urlparse(story_url).path.rstrip("/").split("/")[-1]
    if parts:
        for href, label, _attrs in _links(parts, rf"/readfic/{re.escape(story_id)}/\d+"):
            abs_url = urljoin("https://ficbook.net", href.split("#")[0])
            chapters.append({"title": label or "Глава", "url": abs_url})
    if not chapters:
        chapters.append({"title": title, "url": story_url})
    chapters = chapters[:MAX_CHAPTERS]

    notes = []
    if dedication:
        notes.append(dedication)
    if comment:
        notes.append(comment)

    return {
        "url": story_url,
        "title": title,
        "fb_author": author,
        "fandoms": _uniq(fandoms),
        "tags": _uniq(tags),
        "pairings": _uniq(pairing_labels),
        "characters": _uniq(characters),
        "rating_raw": rating_raw,
        "age": map_rating(rating_raw),
        "romance": map_romance(direction),
        "romance_raw": direction,
        "description": description,
        "author_notes": "\n\n".join(notes),
        "chapters": chapters,
    }


def _parse_chapter(html: str, fallback_title: str) -> dict:
    title_m = re.search(r"<h2\b[^>]*>([\s\S]*?)</h2>", html, re.I)
    title = _strip_tags(title_m.group(1) if title_m else "") or fallback_title
    body = _inner_by_attr(html, "div", "id", "content")
    if body is None:
        body = _inner_by_attr(html, "div", "class", "public_beta_disabled")
    if body is None:
        raise FicbookError("Не удалось прочитать текст главы")
    before = _strip_tags(_inner_by_attr(html, "div", "class", "js-public-beta-comment-before") or "")
    after = _strip_tags(_inner_by_attr(html, "div", "class", "js-public-beta-comment-after") or "")
    notes = "\n\n".join(part for part in (before, after) if part)
    return {"title": title, "html": _sanitize_html(body), "notes": notes}


def scrape_ficbook(raw_url: str) -> dict:
    story_url = normalize_url(raw_url)
    header_html = _fetch(story_url)
    meta = _parse_header(header_html, story_url)
    filled = []
    for index, chap in enumerate(meta["chapters"]):
        page = header_html if chap["url"].rstrip("/") == story_url.rstrip("/") and index == 0 else _fetch(chap["url"])
        parsed = _parse_chapter(page, chap["title"])
        filled.append({**chap, **parsed, "title": parsed["title"] or chap["title"]})
    meta["chapters"] = filled
    return meta

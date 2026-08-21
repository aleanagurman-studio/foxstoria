# FoxStoria

Платформа интерактивных и линейных историй.

Сейчас это **статический сайт** в папке `web/`. Его можно выложить на хостинг **без бэкенда** — GitHub Pages, Netlify, Cloudflare Pages.

Позже, когда появятся аккаунты, оплаты и редактор с сохранением, бэкенд подключается отдельно. Макеты страниц от этого не ломаются.

## Что уже есть

| Страница | Файл |
|---|---|
| Главная | `web/index.html` |
| Поиск с фильтрами | `web/search.html` |
| Авторы | `web/authors.html` |
| Интерактивные работы | `web/stories-interactive.html` |
| Линейные работы | `web/stories-linear.html` |
| Редактор (макет) | `web/editor.html` |

Данные на карточках пока макетные.

## Как открыть без сервера

Откройте файл `web/index.html` в браузере. Python и npm не нужны.

## GitHub Pages

После push в `main` сайт собирается из папки `web/`.

1. GitHub → Settings → Pages → Source: **GitHub Actions**
2. Через 1–2 минуты сайт будет по адресу:
   `https://<логин>.github.io/foxstoria/`

## Бэкенд (позже, не для локального Python 3.14)

Папки `backend/` и `frontend/` — задел на будущее. Локально на Python 3.14 FastAPI не ставится (pydantic-core). Когда понадобится API — Python 3.12 или облачный хостинг (Railway, Render).

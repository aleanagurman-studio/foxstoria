"""Map of every FoxStoria store. Source of truth for what lives in SQLite."""

STORES = [
    {
        "id": "identity",
        "title": "Профили",
        "tables": [
            {"name": "authors", "holds": "Аккаунт: ник, имя, аватар, био, рейтинг, план"},
            {"name": "social_links", "holds": "Публичные ссылки профиля"},
            {"name": "user_settings", "holds": "Уведомления, приватность, редактор, загрузки приложения"},
            {"name": "blocks", "holds": "Чёрный список"},
            {"name": "device_sessions", "holds": "Сессии устройств"},
        ],
    },
    {
        "id": "catalog",
        "title": "Работы и каталог",
        "tables": [
            {"name": "stories", "holds": "Карточка работы, статус, обложка, JSON редактора"},
            {"name": "story_credits", "holds": "Автор, соавтор, редактор"},
            {"name": "story_genres / formats / warnings / kinks", "holds": "Метки работы"},
            {"name": "fandoms, genres, work_formats, content_warnings, kinks", "holds": "Справочники"},
            {"name": "chapters, scenes, scene_choices", "holds": "Текст и карта сцен"},
        ],
    },
    {
        "id": "studio",
        "title": "Кабинет автора",
        "tables": [
            {"name": "characters, story_notes, timeline_events", "holds": "Приватная библия работы"},
            {"name": "ai_jobs", "holds": "Очередь сводок ИИ"},
        ],
    },
    {
        "id": "library",
        "title": "Кабинет читателя",
        "tables": [
            {"name": "story_likes", "holds": "Лайки работ"},
            {"name": "follows", "holds": "Подписки на авторов и работы"},
            {"name": "bookmarks", "holds": "Закладки: работы, новости, сборники"},
            {"name": "reading_progress", "holds": "История и прогресс чтения"},
            {"name": "collections, collection_items", "holds": "Свои сборники"},
            {"name": "collection_follows", "holds": "Подписки на чужие сборники"},
        ],
    },
    {
        "id": "social",
        "title": "Обсуждения",
        "tables": [
            {"name": "comments", "holds": "Комментарии к работам, главам, постам, новостям"},
            {"name": "reviews", "holds": "Отзывы на работы"},
            {"name": "profile_posts, poll_options", "holds": "Лента и блог профиля"},
            {"name": "notifications", "holds": "Оповещения в шапке"},
        ],
    },
    {
        "id": "messages",
        "title": "Сообщения",
        "tables": [
            {"name": "message_threads", "holds": "Личка, системная рассылка, поддержка"},
            {"name": "message_participants, direct_messages", "holds": "Участники и текст"},
        ],
    },
    {
        "id": "wallet",
        "title": "Кошелёк",
        "tables": [
            {"name": "wallets", "holds": "Баланс"},
            {"name": "payment_methods", "holds": "Карты и СБП — один список для пополнения и вывода"},
            {"name": "ledger_entries", "holds": "Пополнения, покупки, возвраты, выводы"},
        ],
    },
    {
        "id": "stats",
        "title": "Статистика",
        "tables": [
            {"name": "user_counters", "holds": "Счётчики профиля: прочитано, лайки, комментарии"},
            {"name": "daily_counters", "holds": "Активность по дням"},
        ],
    },
]

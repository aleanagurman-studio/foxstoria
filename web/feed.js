(function feedPage() {
  const PAGE = 6;
  const KINDS = {
    works: { label: "Работы", hint: "новые главы конкретных работ", icon: "assets/deco/книга.svg" },
    authors: { label: "Авторы", hint: "новые работы и главы авторов", icon: "assets/deco/перо1.svg" },
    blogs: { label: "Блоги", hint: "посты из блогов", icon: "assets/deco/блог.svg" },
    collections: { label: "Сборники", hint: "работы и главы в сборниках", icon: "assets/deco/сборник.svg" },
  };
  const SUBS = { authors: 14, works: 18, blogs: 9, collections: 6 };
  const ITEMS = [
    {
      id: "w-shadows-12",
      kind: "works",
      minutes: 5,
      cover: "assets/test/cover-1.png",
      kicker: "Обновление работы",
      badge: "Глава 12",
      title: "Тени прошлого",
      text: "Иногда один шаг может изменить всё. Но готова ли она к тому, что ждёт впереди?..",
      tags: ["Фэнтези", "Драма", "Ориджинал"],
      href: "story-interactive.html",
      action: "Читать главу",
    },
    {
      id: "a-letters-new",
      kind: "authors",
      minutes: 28,
      cover: "assets/test/cover-2.png",
      kicker: "Новая работа автора",
      badge: "Звёздная пыль",
      title: "Письма из прошлого",
      text: "Автор, на которого вы подписаны, опубликовал новую линейную историю.",
      href: "story-linear.html",
      action: "Открыть работу",
    },
    {
      id: "b-before-chapter",
      kind: "blogs",
      minutes: 60,
      cover: "assets/test/avatar-2.png",
      kicker: "Новый пост в блоге",
      badge: "Звёздная пыль",
      title: "Мысли перед новой главой",
      text: "Делюсь тем, что вдохновило меня на новую главу и немного о процессе.",
      likes: 24,
      comments: 7,
      href: "blog.html",
      action: "Читать пост",
    },
    {
      id: "w-mic-7",
      kind: "works",
      minutes: 120,
      cover: "assets/test/cover-3.png",
      kicker: "Обновление работы",
      badge: "Глава 7",
      title: "Микрофон и монохром",
      text: "После сорванного концерта Rap Line остаётся в гримёрке дольше, чем планировали.",
      tags: ["Слэш", "BTS", "18+"],
      href: "story-bts-slash.html",
      action: "Читать главу",
    },
    {
      id: "c-love-added",
      kind: "collections",
      minutes: 180,
      cover: "assets/brand/collection-heart.png",
      kicker: "Обновление сборника",
      badge: "Новая работа",
      title: "Сборник «Истории о любви»",
      text: "Добавлена новая работа: «Письма из прошлого». Всего работ: 8.",
      href: "collections.html",
      action: "Открыть сборник",
    },
    {
      id: "a-tea-chapter",
      kind: "authors",
      minutes: 240,
      cover: "assets/test/cover-4.png",
      kicker: "Новая глава автора",
      badge: "Лунный странник",
      title: "Чай с мятой и шрамами",
      text: "У автора, на которого вы подписаны, вышла новая глава — даже если саму работу вы не отслеживали.",
      href: "story-hp-femslash.html",
      action: "Читать главу",
    },
    {
      id: "b-future",
      kind: "blogs",
      minutes: 300,
      cover: "assets/test/avatar-1.png",
      kicker: "Новый пост в блоге",
      badge: "Лунный странник",
      title: "Немного о будущих проектах",
      text: "Рассказываю, над чем сейчас работаю и что планируется дальше.",
      likes: 18,
      comments: 2,
      href: "blog.html",
      action: "Читать пост",
    },
    {
      id: "w-tea-4",
      kind: "works",
      minutes: 360,
      cover: "assets/test/cover-4.png",
      kicker: "Обновление работы",
      badge: "Глава 4",
      title: "Чай с мятой и шрамами",
      text: "Гермиона ставит чайник. Джинни молчит дольше обычного.",
      tags: ["Фемслэш", "Гарри Поттер", "0+"],
      href: "story-hp-femslash.html",
      action: "Читать главу",
    },
    {
      id: "c-hearth-chapter",
      kind: "collections",
      minutes: 480,
      cover: "assets/brand/collection-chair.png",
      kicker: "Обновление сборника",
      badge: "Новая глава",
      title: "Сборник «У камина»",
      text: "В работе «Тени прошлого» вышла глава 12. Всего работ в сборнике: 5.",
      href: "collections.html",
      action: "Открыть сборник",
    },
    {
      id: "w-letters-edit",
      kind: "works",
      minutes: 600,
      cover: "assets/test/cover-2.png",
      kicker: "Обновление работы",
      badge: "Правка главы",
      title: "Письма из прошлого",
      text: "Автор поправил финал третьей главы и подписал примечание для читателей.",
      tags: ["Гет", "Ориджинал", "мини"],
      href: "story-linear.html",
      action: "Читать главу",
    },
    {
      id: "a-crossroads",
      kind: "authors",
      minutes: 720,
      cover: "assets/test/cover-1.png",
      kicker: "Новая глава автора",
      badge: "Лунный странник",
      title: "Перекрёсток проклятий",
      text: "Новая ветка в интерактивной истории: выбор на площади меняет финал.",
      href: "story-jujutsu-mixed.html",
      action: "Открыть работу",
    },
    {
      id: "w-cross-4",
      kind: "works",
      minutes: 840,
      cover: "assets/test/cover-1.png",
      kicker: "Обновление работы",
      badge: "Глава 4",
      title: "Перекрёсток проклятий",
      text: "Смешанные линии сходятся у школьных ворот. Один выбор закроет две ветки.",
      tags: ["Смешанный", "Jujutsu Kaisen", "16+"],
      href: "story-jujutsu-mixed.html",
      action: "Читать главу",
    },
  ];

  const ICO = {
    bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.2L6 20V5.5a1 1 0 0 1 1-1Z"/></svg>',
    heart: '<img src="assets/svg/like.svg" alt="">',
    comment: '<img src="assets/svg/коммент.svg" alt="">',
  };

  let tab = "all";
  let sort = "new";
  let shown = PAGE;
  const saved = new Set();

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function relTime(minutes) {
    if (minutes < 60) return `${minutes} мин назад`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) {
      const n = hours;
      const word = n === 1 ? "час" : n < 5 ? "часа" : "часов";
      return `${n} ${word} назад`;
    }
    return "вчера";
  }

  function filtered() {
    const list = ITEMS.filter((item) => tab === "all" || item.kind === tab);
    return [...list].sort((a, b) => (sort === "new" ? a.minutes - b.minutes : b.minutes - a.minutes));
  }

  function renderStats() {
    const total = SUBS.authors + SUBS.works + SUBS.blogs + SUBS.collections;
    const totalEl = document.querySelector("[data-feed-subs-total]");
    if (totalEl) totalEl.textContent = String(total);
    Object.entries(SUBS).forEach(([key, value]) => {
      const el = document.querySelector(`[data-feed-subs="${key}"]`);
      if (el) el.textContent = String(value);
    });
  }

  function cardHTML(item) {
    const kind = KINDS[item.kind];
    const tags = (item.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
    const stats =
      item.likes != null
        ? `<p class="feed-item-stats">
            <span>${ICO.heart} ${item.likes}</span>
            <span>${ICO.comment} ${item.comments || 0}</span>
          </p>`
        : "";
    return `
      <article class="feed-item" data-kind="${item.kind}">
        <div class="feed-item-rail">
          <div class="feed-item-stamp">
            <img src="${kind.icon}" alt="">
            <time>${escapeHtml(relTime(item.minutes))}</time>
          </div>
          <span class="feed-item-line" aria-hidden="true"></span>
        </div>
        <div class="feed-item-card">
          <a class="feed-item-cover" href="${escapeHtml(item.href)}">
            <img src="${escapeHtml(item.cover)}" alt="">
          </a>
          <div class="feed-item-body">
            <p class="feed-item-kinds">
              <span class="work-badge feed-kind-badge">${escapeHtml(item.kicker)}</span>
              ${item.badge ? `<span class="work-badge feed-kind-extra">${escapeHtml(item.badge)}</span>` : ""}
            </p>
            <h2><a href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a></h2>
            <p class="feed-item-text">${escapeHtml(item.text)}</p>
            ${tags ? `<p class="feed-item-tags">${tags}</p>` : ""}
            ${stats}
            <p class="feed-item-foot">
              <a class="btn btn-outline" href="${escapeHtml(item.href)}">${escapeHtml(item.action)}</a>
            </p>
          </div>
          <div class="feed-item-tools">
            <button type="button" class="news-icon-btn${saved.has(item.id) ? " is-on" : ""}" data-save="${escapeHtml(item.id)}" aria-label="В закладки">${ICO.bookmark}</button>
          </div>
        </div>
      </article>`;
  }

  function renderList() {
    const root = document.getElementById("feed-stream");
    const more = document.getElementById("feed-more");
    if (!root) return;
    const list = filtered();
    if (!list.length) {
      root.innerHTML = `<div class="empty-feed"><p>В этой категории пока нет обновлений за сутки.</p></div>`;
      if (more) {
        more.hidden = true;
        if (more.parentElement) more.parentElement.hidden = true;
      }
      return;
    }
    const visible = list.slice(0, shown);
    root.innerHTML = visible.map(cardHTML).join("");
    if (more) {
      more.hidden = visible.length >= list.length;
      if (more.parentElement) more.parentElement.hidden = more.hidden;
    }
  }

  function syncTabs() {
    document.querySelectorAll("#feed-tabs [data-feed-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-feed-tab") === tab);
    });
  }

  function setTab(next) {
    tab = KINDS[next] || next === "all" ? next : "all";
    shown = PAGE;
    const url = new URL(location.href);
    if (tab === "all") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    history.replaceState({}, "", url.pathname + url.search + url.hash);
    syncTabs();
    renderList();
  }

  function ready() {
    if (!document.getElementById("feed-stream")) return;
    const fromUrl = new URLSearchParams(location.search).get("tab");
    if (fromUrl === "packs") tab = "collections";
    else if (fromUrl && (fromUrl === "all" || KINDS[fromUrl])) tab = fromUrl;

    renderStats();
    syncTabs();
    renderList();

    document.getElementById("feed-tabs")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-feed-tab]");
      if (btn) setTab(btn.getAttribute("data-feed-tab"));
    });
    document.getElementById("feed-sort")?.addEventListener("change", (event) => {
      sort = event.target.value === "old" ? "old" : "new";
      shown = PAGE;
      renderList();
    });
    document.getElementById("feed-more")?.addEventListener("click", () => {
      shown += PAGE;
      renderList();
    });
    document.getElementById("feed-stream")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-save]");
      if (!btn) return;
      const id = btn.getAttribute("data-save");
      if (saved.has(id)) saved.delete(id);
      else saved.add(id);
      btn.classList.toggle("is-on", saved.has(id));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();

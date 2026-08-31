/* Feeds fill from works.json. Empty arrays keep empty states until works appear. */

const ROMANCE = {
  slash: "Слэш",
  femslash: "Фемслэш",
  het: "Гет",
  gen: "Джен",
  mixed: "Смешанный",
};

const SIZE = { mini: "мини", midi: "миди", maxi: "макси" };

function ageLabel(age) {
  if (!age || age === "none" || age === "0+") return "0+";
  return age;
}

function workLikes(work) {
  return Number(work.likes ?? work.plays ?? 0) || 0;
}

function formatCount(value) {
  const n = Number(value) || 0;
  if (n >= 1000) {
    const k = n / 1000;
    const text = k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "");
    return `${text}K`;
  }
  return String(n);
}

function workHref(work) {
  if (window.FoxWorks && work?.id) return FoxWorks.urls(work).public;
  if (work.href) return work.href;
  if (work.story_type === "linear") return "story-linear.html";
  if (work.story_type === "messenger") return "story.html";
  return "story-interactive.html";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const TYPE = {
  interactive: "Интерактивная",
  linear: "Линейная",
  messenger: "Мессенджеры",
};

function workTypeLabel(work) {
  if (window.FoxWorks?.storyTypeLabel) return FoxWorks.storyTypeLabel(work);
  return TYPE[work.story_type] || work.story_type || "";
}

function cardHTML(work, rank, isNew) {
  const typeLabel = workTypeLabel(work);
  const romanceLabel = ROMANCE[work.romance] || work.romance || "";
  const size = work.is_completed && work.work_size ? SIZE[work.work_size] : work.is_completed ? "" : "в процессе";
  const cover = work.cover
    ? `<img src="${escapeHtml(work.cover)}" alt="">`
    : `<span class="cover-fallback"><img src="assets/deco/paw.svg" alt=""></span>`;
  const rankBadge = rank ? `<span class="story-rank">${rank}</span>` : "";
  const newBadge = isNew ? `<span class="badge-new">New</span>` : "";

  return `
    <article class="story-card" data-title="${escapeHtml(work.title)}" data-updated="${escapeHtml(cabinetMeta(work).updatedAt)}">
      <a href="${escapeHtml(workHref(work))}">
        <div class="story-cover">${rankBadge}${newBadge}${cover}</div>
        <h3 class="story-title">${escapeHtml(work.title)}</h3>
        <p class="story-kicker">${
          [typeLabel, romanceLabel]
            .filter(Boolean)
            .map((label) => `<span>${escapeHtml(label)}</span>`)
            .join("")
        }</p>
        <p class="story-meta">${escapeHtml(work.fandom || "")}</p>
        <p class="story-stats">
          <span class="story-likes"><img src="assets/svg/heart.svg" alt=""> ${formatCount(workLikes(work))}</span>
          <span class="age-badge">${escapeHtml(ageLabel(work.age))}</span>
          ${size ? `<span class="status-badge">${escapeHtml(size)}</span>` : ""}
        </p>
      </a>
    </article>`;
}

function emptyHTML(text) {
  return `<div class="empty-feed"><p>${escapeHtml(text)}</p></div>`;
}

function renderFeed(id, items, emptyText) {
  const root = document.querySelector(`[data-feed="${id}"]`);
  if (!root) return;
  if (!items.length) {
    root.innerHTML = emptyHTML(emptyText);
    return;
  }
  const ranked = id === "popular";
  const isNew = id === "latest";
  root.innerHTML = items.map((work, index) => cardHTML(work, ranked ? index + 1 : 0, isNew)).join("");
}

function studioHref(work) {
  if (window.FoxWorks && work?.id) return FoxWorks.urls(work).studio;
  return work.id ? `studio.html?id=${encodeURIComponent(work.id)}` : "work-new.html";
}

const CABINET_STATUS = {
  draft: "Черновик",
  published: "Опубликовано",
  moderation: "На модерации",
  completed: "Завершена",
};

function cabinetWorkState(pubStatus, isCompleted) {
  if (pubStatus === "draft") return "draft";
  if (pubStatus === "completed" || isCompleted) return "completed";
  return "in_progress";
}

function cabinetMeta(work) {
  let status = work.status || (work.is_completed ? "completed" : work.listed === false ? "draft" : "published");
  if (status === "in_progress") status = "published";
  try {
    const map = JSON.parse(localStorage.getItem("foxtoria-work-status") || "{}");
    const overlay = map && typeof map === "object" ? map[work.id] : "";
    if (overlay === "completed") status = "completed";
    else if (overlay === "draft") status = "draft";
    else if (overlay === "in_progress") status = "published";
  } catch {
    /* keep stored status */
  }
  const updatedAt = work.updatedAt || work.publishedAt || "";
  return {
    status,
    updated: formatCabinetUpdated(updatedAt),
    updatedAt: updatedAt || "1970-01-01T00:00:00",
    views: work.plays ?? 0,
    likes: workLikes(work),
    comments: work.comments ?? 0,
    waiting: work.waiting ?? 0,
  };
}

function formatCabinetUpdated(iso) {
  if (!iso) return "ещё не сохранялась";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "недавно";
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "только что";
  if (diff < 3600_000) return `${Math.max(1, Math.floor(diff / 60_000))} мин. назад`;
  if (diff < 86400_000) return `${Math.max(1, Math.floor(diff / 3600_000))} ч. назад`;
  return date.toLocaleDateString("ru-RU");
}

function cabinetStatsHTML(work, meta) {
  return `<div class="cabinet-card-stats">
      <span title="Ждут продолжения"><img src="assets/svg/ждуля2.svg" alt=""> ${formatCount(meta.waiting)}</span>
      <span><img src="assets/svg/eye.svg" alt=""> ${formatCount(meta.views)}</span>
      <span><img src="assets/svg/heart.svg" alt=""> ${formatCount(meta.likes)}</span>
      <span><img src="assets/svg/коммент.svg" alt=""> ${formatCount(meta.comments)}</span>
    </div>`;
}

function cabinetVisibilityLabel(status) {
  return status === "draft" ? "Опубликовать" : "Скрыть в черновик";
}

function cabinetVisibilityButton(status) {
  if (status === "draft") {
    return `<button type="button" role="menuitem" data-cabinet-action="visibility"><img src="assets/svg/eye.svg" alt=""> Опубликовать</button>`;
  }
  return `<button type="button" role="menuitem" data-cabinet-action="visibility"><img src="assets/svg/eyesno.svg" alt=""> Скрыть в черновик</button>`;
}

function cabinetCardHTML(work, role) {
  const meta = cabinetMeta(work);
  const completed = Boolean(work.is_completed || meta.status === "completed");
  const workState = cabinetWorkState(meta.status, completed);
  const typeLabel = window.FoxWorks?.storyTypeLabel
    ? FoxWorks.storyTypeLabel(work, true)
    : work.story_type === "linear"
      ? "Линейная история"
      : work.story_type === "messenger"
        ? "Мессенджеры"
        : "Интерактивная история";
  const cover = work.cover
    ? `<img src="${escapeHtml(work.cover)}" alt="">`
    : `<span class="cover-fallback"><img src="assets/deco/paw.svg" alt=""></span>`;
  return `
    <article class="cabinet-card" data-work-id="${escapeHtml(work.id)}" data-status="${escapeHtml(meta.status)}" data-work-status="${workState}" data-completed="${completed ? "1" : "0"}" data-title="${escapeHtml(work.title)}" data-updated="${escapeHtml(meta.updatedAt)}">
      <div class="cabinet-cover">
        <div class="cabinet-cover-frame">${cover}</div>
        <div class="cabinet-more-wrap">
          <button type="button" class="cabinet-more" aria-label="Ещё" aria-haspopup="menu" aria-expanded="false"><img src="assets/ornaments/03_more_card.svg?v=1" alt=""></button>
          <div class="cabinet-menu" hidden role="menu">
            ${cabinetVisibilityButton(meta.status)}
            <button type="button" role="menuitem" data-cabinet-action="delete"><img src="assets/svg/удалить.svg" alt=""> Удалить</button>
          </div>
        </div>
      </div>
      <h3 class="cabinet-card-title"><a href="${escapeHtml(studioHref(work))}">${escapeHtml(work.title)}</a></h3>
      <p class="cabinet-card-meta">
        <span>${typeLabel}</span>
        <span class="cabinet-status is-${meta.status}">${CABINET_STATUS[meta.status] || meta.status}</span>
      </p>
      <p class="cabinet-card-role">${escapeHtml(role)}</p>
      <p class="cabinet-card-updated">${escapeHtml(meta.updated)}</p>
      ${cabinetStatsHTML(work, meta)}
      <a class="btn btn-outline cabinet-open" href="${escapeHtml(studioHref(work))}">Открыть редактор</a>
    </article>`;
}

function bindCabinetChrome() {
  const page = document.querySelector(".cabinet-page");
  if (!page || page.dataset.cabinetBound === "1") return;
  page.dataset.cabinetBound = "1";
  const search = document.querySelector("[data-cabinet-search]");
  const sort = document.querySelector("[data-cabinet-sort]");
  const statusFilter = document.querySelector("[data-cabinet-status]");
  const grids = [...document.querySelectorAll(".cabinet-grid")];

  function applyFilterSort() {
    const q = (search?.value || "").trim().toLowerCase();
    const by = sort?.value || "updated";
    const status = statusFilter?.value || "all";
    grids.forEach((grid) => {
      const cards = [...grid.querySelectorAll(".cabinet-card")];
      cards.sort((a, b) => {
        if (by === "title") return (a.dataset.title || "").localeCompare(b.dataset.title || "", "ru");
        return String(b.dataset.updated || "").localeCompare(String(a.dataset.updated || ""));
      });
      cards.forEach((card) => {
        const matchTitle = !q || (card.dataset.title || "").toLowerCase().includes(q);
        const matchStatus = status === "all" || card.dataset.workStatus === status;
        card.hidden = !(matchTitle && matchStatus);
        grid.appendChild(card);
      });
      grid.querySelector(".cabinet-filter-empty")?.remove();
      if (cards.length && cards.every((card) => card.hidden)) {
        const empty = document.createElement("p");
        empty.className = "cabinet-filter-empty";
        empty.textContent = "Нет работ с таким статусом.";
        grid.appendChild(empty);
      }
    });
  }

  function closeMenus(except) {
    document.querySelectorAll(".cabinet-menu").forEach((menu) => {
      if (menu === except) return;
      menu.hidden = true;
      menu.closest(".cabinet-more-wrap")?.querySelector(".cabinet-more")?.setAttribute("aria-expanded", "false");
    });
  }

  function refreshCounts() {
    const keys = ["all", "author", "coauthor", "editor"];
    keys.forEach((key) => {
      const root = document.querySelector(`[data-feed="author-home-${key}"]`);
      const n = root ? root.querySelectorAll(".cabinet-card").length : 0;
      document.querySelectorAll(`[data-cabinet-count="${key}"]`).forEach((el) => {
        el.textContent = String(n);
      });
    });
  }

  function setCardStatus(card, status) {
    card.dataset.status = status;
    card.dataset.workStatus = cabinetWorkState(status, card.dataset.completed === "1");
    const badge = card.querySelector(".cabinet-status");
    if (badge) {
      badge.className = `cabinet-status is-${status}`;
      badge.textContent = CABINET_STATUS[status] || status;
    }
    const vis = card.querySelector("[data-cabinet-action='visibility']");
    if (vis) vis.outerHTML = cabinetVisibilityButton(status);
  }

  search?.addEventListener("input", applyFilterSort);
  sort?.addEventListener("change", applyFilterSort);
  statusFilter?.addEventListener("change", applyFilterSort);
  document.querySelectorAll("[data-cabinet-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.getAttribute("data-cabinet-view");
      page.classList.toggle("is-list", view === "list");
      document.querySelectorAll("[data-cabinet-view]").forEach((other) => {
        other.classList.toggle("is-active", other === btn);
      });
    });
  });
  page.addEventListener("click", (event) => {
    const more = event.target.closest(".cabinet-more");
    if (more) {
      event.preventDefault();
      event.stopPropagation();
      const menu = more.parentElement.querySelector(".cabinet-menu");
      const open = menu.hidden;
      closeMenus(open ? menu : null);
      menu.hidden = !open;
      more.setAttribute("aria-expanded", open ? "true" : "false");
      return;
    }
    const action = event.target.closest("[data-cabinet-action]");
    if (action) {
      event.preventDefault();
      event.stopPropagation();
      const card = action.closest(".cabinet-card");
      const id = card?.dataset.workId;
      if (!card || !id) return;
      if (action.getAttribute("data-cabinet-action") === "delete") {
        if (window.FoxWorks) FoxWorks.remove(id);
        document.querySelectorAll(`.cabinet-card[data-work-id="${id}"]`).forEach((el) => el.remove());
        refreshCounts();
        applyFilterSort();
      } else if (action.getAttribute("data-cabinet-action") === "visibility") {
        const next = card.dataset.status === "draft" ? "published" : "draft";
        if (window.FoxWorks) {
          const work = FoxWorks.get(id);
          if (work) {
            work.status = next === "draft" ? "draft" : work.is_completed ? "completed" : "in_progress";
            work.listed = next !== "draft";
            if (work.listed && !work.publishedAt) work.publishedAt = new Date().toISOString();
            work.updatedAt = new Date().toISOString();
            FoxWorks.upsert(work);
          }
        }
        document.querySelectorAll(`.cabinet-card[data-work-id="${id}"]`).forEach((el) => setCardStatus(el, next));
        applyFilterSort();
      }
      closeMenus();
      return;
    }
    if (!event.target.closest(".cabinet-more-wrap")) closeMenus();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenus();
  });
  applyFilterSort();
}

function renderAuthorHome(works) {
  const authorRoot = document.querySelector('[data-feed="author-home-author"]');
  if (!authorRoot) return;
  const groups = {
    author: works.filter((work) => (work.role || "author") === "author"),
    coauthor: works.filter((work) => work.role === "coauthor"),
    editor: works.filter((work) => work.role === "editor"),
  };
  const all = [...groups.author, ...groups.coauthor, ...groups.editor];
  const roleOf = (id) =>
    groups.author.some((work) => work.id === id) ? "Автор" : groups.coauthor.some((work) => work.id === id) ? "Соавтор" : "Редактор";
  function paint(root, items, emptyText) {
    if (!root) return;
    if (!items.length) {
      root.innerHTML = emptyHTML(emptyText);
      return;
    }
    root.innerHTML = items.map((work) => cabinetCardHTML(work, roleOf(work.id))).join("");
  }
  paint(document.querySelector('[data-feed="author-home-all"]'), all, "Когда появится первая история, она откроется отсюда.");
  paint(authorRoot, groups.author, "Здесь будут истории, где вы указаны автором.");
  paint(document.querySelector('[data-feed="author-home-coauthor"]'), groups.coauthor, "Здесь будут истории, где вы соавтор.");
  paint(document.querySelector('[data-feed="author-home-editor"]'), groups.editor, "Здесь будут истории, которые вы редактируете.");
  const waitingRoot = document.querySelector("[data-cabinet-waiting]");
  if (waitingRoot) {
    const waiting = all
      .map((work) => ({ work, count: cabinetMeta(work).waiting || 0 }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
    waitingRoot.innerHTML = waiting.length
      ? waiting
          .map(
            (item) => `<a class="cabinet-waiting-row" href="${escapeHtml(studioHref(item.work))}">
          <strong>${escapeHtml(item.work.title)}</strong>
          <span>${formatCount(item.count)}</span>
        </a>`
          )
          .join("")
      : `<p class="profile-meta">Пока никто не ждёт продолжения.</p>`;
  }
  const counts = { all: all.length, author: groups.author.length, coauthor: groups.coauthor.length, editor: groups.editor.length };
  Object.entries(counts).forEach(([key, value]) => {
    document.querySelectorAll(`[data-cabinet-count="${key}"]`).forEach((el) => {
      el.textContent = String(value);
    });
  });
  const pager = document.querySelector(".cabinet-pager");
  if (pager) pager.hidden = !all.length;
  bindCabinetChrome();
}

function renderProfileWorks(works) {
  const root = document.querySelector('[data-feed="profile-works"]');
  if (!root) return;
  const slug = root.getAttribute("data-author") || "moonwander";
  const items = works.filter((work) => work.author_slug === slug);
  if (!items.length) {
    root.innerHTML = emptyHTML("Работы появятся на профиле после публикации.");
    return;
  }
  root.innerHTML = items.map((work) => cardHTML(work, 0, false)).join("");
}

function renderFeatured(works) {
  const root = document.querySelector("[data-feed='featured']");
  if (!root) return;
  const work = [...works].sort((a, b) => workLikes(b) - workLikes(a) || (b.plays || 0) - (a.plays || 0))[0];
  if (!work) {
    root.innerHTML = emptyHTML("Выбор читателей появится, когда у работ появятся лайки.");
    return;
  }
  const typeLabel = workTypeLabel(work);
  const romanceLabel = ROMANCE[work.romance] || work.romance || "";
  const meta = [typeLabel, romanceLabel, work.fandom].filter(Boolean).join(" · ");
  root.innerHTML = `
    <a class="featured-card" href="${escapeHtml(workHref(work))}">
      <div class="featured-cover">${work.cover ? `<img src="${escapeHtml(work.cover)}" alt="">` : ""}</div>
      <div class="featured-info">
        <h3>${escapeHtml(work.title)}</h3>
        <p>${escapeHtml(work.description || meta)}</p>
        <div class="featured-stats">
          <span>${escapeHtml(meta)}</span>
          <span><strong>${work.plays || 0}</strong> прохождений</span>
          <span class="story-likes"><img src="assets/svg/heart.svg" alt=""> ${formatCount(workLikes(work))}</span>
          <span class="age-badge">${escapeHtml(ageLabel(work.age))}</span>
        </div>
      </div>
    </a>`;
}

function renderAuthors(authors) {
  const root = document.querySelector("[data-feed='authors']");
  if (!root) return;
  if (!authors.length) {
    root.innerHTML = emptyHTML("Авторы появятся вместе с первыми работами.");
    return;
  }
  root.innerHTML = authors
    .slice(0, 5)
    .map(
      (author, index) => `
      <a class="author-item" href="${escapeHtml(author.href || profileHref(author.display_name || author.name))}">
        <span class="author-rank">${index + 1}</span>
        <span class="author-avatar">${author.avatar ? `<img src="${escapeHtml(author.avatar)}" alt="">` : ""}</span>
        <span class="author-info">
          <span class="author-name">${escapeHtml(author.display_name || author.name)}</span>
          <span class="author-stats">${author.story_count ?? author.works ?? 0} работ</span>
        </span>
      </a>`
    )
    .join("");
}

function authorsFromWorks(works, seeded) {
  const map = new Map();
  (seeded || []).forEach((author) => {
    const slug = author.slug || author.name;
    if (slug) map.set(slug, { ...author, story_count: 0, works: 0 });
  });
  (works || []).forEach((work) => {
    const slug = work.author_slug || work.author;
    if (!slug) return;
    const cur = map.get(slug) || {
      name: work.author || slug,
      display_name: work.author || slug,
      slug,
      story_count: 0,
      works: 0,
      followers: 0,
      avatar: "",
      updatedAt: work.updatedAt || work.publishedAt,
    };
    cur.story_count = (cur.story_count || 0) + 1;
    cur.works = cur.story_count;
    cur.updatedAt = work.updatedAt || work.publishedAt || cur.updatedAt;
    map.set(slug, cur);
  });
  return [...map.values()].filter((author) => (author.story_count || author.works) > 0);
}

async function loadCatalog() {
  await loadFandomIndex();
  if (window.FoxWorks) await FoxWorks.hydrate();
  try {
    const response = await fetch("works.json", { cache: "no-store" });
    if (!response.ok) throw new Error("catalog");
    const data = await response.json();
    const fileWorks = Array.isArray(data.works) ? data.works : [];
    const apiWorks = window.FoxWorks ? FoxWorks.publicWorks || [] : [];
    const userWorks = window.FoxWorks ? FoxWorks.load() : [];
    const byId = new Map();
    fileWorks.forEach((work) => byId.set(String(work.id), work));
    apiWorks.forEach((work) => byId.set(String(work.id), work));
    userWorks.forEach((work) => byId.set(String(work.id), work));
    const merged = [...byId.values()];
    const works = withoutHiddenTags(merged.filter((work) => (window.FoxWorks ? FoxWorks.isListed(work) : true)));
    const authors = authorsFromWorks(works, Array.isArray(data.authors) ? data.authors : []);
    const popular = [...works].sort(
      (a, b) => workLikes(b) - workLikes(a) || (b.plays || 0) - (a.plays || 0)
    );
    const latest = [...works].sort(
      (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
    );
    renderFeed(
      "popular",
      popular.slice(0, 6),
      "Популярные работы появятся здесь сами, как только их начнут читать."
    );
    renderFeed(
      "latest",
      latest.slice(0, 4),
      "Новые работы появятся здесь сразу после публикации."
    );
    renderFeatured(works);
    renderAuthors(authors);
    renderCatalogGrid(works);
    renderAuthorsGrid(authors);
    renderAuthorHome(userWorks);
    renderProfileWorks(works);
    renderReaderFeeds(works, authors);
    window.__foxWorks = works;
    window.__foxAuthors = authors;
  } catch (error) {
    renderFeed("popular", [], "Каталог пока не загрузился.");
    renderFeed("latest", [], "Каталог пока не загрузился.");
    renderFeatured([]);
    renderAuthors([]);
    renderCatalogGrid([]);
    renderAuthorsGrid([]);
    renderProfileWorks([]);
    renderAuthorHome([]);
    renderReaderFeeds([], []);
  }
}

function renderReaderFeeds(works, authors) {
  const lib = typeof loadReaderLibrary === "function" ? loadReaderLibrary() : { follows: [], read: [] };
  const byIds = (ids) => works.filter((work) => (ids || []).includes(work.id));
  const followIds = lib.follows || [];
  if (document.querySelector('[data-feed="library-likes"]')) {
    renderFeed(
      "library-likes",
      works.filter((work) => likedWorkIds(works).has(String(work.id))),
      "Понравившиеся истории появятся здесь."
    );
  }
  if (document.querySelector('[data-feed="library-follows"]')) {
    renderFeed(
      "library-follows",
      byIds(followIds),
      "Работы, на которые вы подпишетесь, появятся здесь."
    );
  }
  if (document.querySelector('[data-feed="library-read"]')) {
    renderFeed(
      "library-read",
      byIds(lib.read),
      "Отмеченные как прочитанные работы появятся здесь."
    );
  }
  renderLibraryAuthors(authors || []);
  bindLibraryToolbar();
}

function authorWorks(author) {
  return Number(author.story_count ?? author.works ?? 0) || 0;
}

function authorFollowers(author) {
  return Number(author.followers ?? author.subscribers ?? 0) || 0;
}

function authorCardHTML(author) {
  const works = authorWorks(author);
  const followers = authorFollowers(author);
  return `
      <a class="author-card" href="${escapeHtml(author.href || profileHref(author.display_name || author.name))}" data-title="${escapeHtml(author.display_name || author.name)}" data-updated="${escapeHtml(author.updatedAt || "")}" data-popular="${followers}" data-works="${works}">
        <span class="author-avatar">${author.avatar ? `<img src="${escapeHtml(author.avatar)}" alt="">` : ""}</span>
        <span>
          <span class="author-name">${escapeHtml(author.display_name || author.name)}</span>
          <p class="author-stats">
            <span class="author-stat" title="Работы"><img src="assets/svg/читать.svg" alt=""> ${formatCount(works)} <span class="author-stat-label">работ</span></span>
            <span class="author-stat" title="Подписчики"><img src="assets/svg/пейринг.svg" alt=""> ${formatCount(followers)} <span class="author-stat-label">подписчиков</span></span>
          </p>
        </span>
      </a>`;
}

function renderLibraryAuthors(authors) {
  const root = document.querySelector("[data-feed='library-authors']");
  if (!root) return;
  const list = [...authors];
  if (!list.length) {
    root.innerHTML = emptyHTML("Авторы, на которых вы подпишетесь, появятся здесь.");
    return;
  }
  root.innerHTML = list.map((author) => authorCardHTML(author)).join("");
  if (typeof hydrateUiIcons === "function") hydrateUiIcons(root);
}

function sortWorks(works, sort) {
  const copy = [...works];
  if (sort === "latest") return copy.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  if (sort === "name") return copy.sort((a, b) => String(a.title || "").localeCompare(b.title || "", "ru"));
  return copy.sort((a, b) => workLikes(b) - workLikes(a) || (b.plays || 0) - (a.plays || 0));
}

function slugsFromParams(params, plural, singular) {
  return [
    ...new Set(
      [...params.getAll(plural), ...(singular ? params.getAll(singular) : [])]
        .flatMap((value) => String(value).split(","))
        .map((slug) => slug.trim())
        .filter(Boolean)
    ),
  ];
}

function workSlugs(work, keys) {
  for (const key of keys) {
    const value = work[key];
    if (!value) continue;
    if (Array.isArray(value)) {
      return value.map((item) => (typeof item === "string" ? item : item.slug)).filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split(",")
        .map((slug) => slug.trim())
        .filter(Boolean);
    }
  }
  return [];
}

let fandomCategoryMap = {};

async function loadFandomIndex() {
  try {
    const response = await fetch("fandoms.json", { cache: "no-store" });
    if (!response.ok) return;
    const fandoms = await response.json();
    fandomCategoryMap = Object.fromEntries(
      (Array.isArray(fandoms) ? fandoms : []).map((item) => [item.slug, item.category]).filter(([, category]) => category)
    );
  } catch {
    fandomCategoryMap = {};
  }
}

function workCategorySlugs(work) {
  const slugs = new Set(workSlugs(work, ["categories", "category_slugs", "category"]));
  workFandomSlugs(work).forEach((fandomSlug) => {
    const category = fandomCategoryMap[fandomSlug];
    if (category) slugs.add(category);
  });
  return [...slugs];
}

function matchesAllSlugs(work, keys, selected) {
  if (!selected.length) return true;
  const set = new Set(workSlugs(work, keys));
  return selected.every((slug) => set.has(slug));
}

function hiddenFeedSlugs(key) {
  if (typeof loadFoxPrefs !== "function") return [];
  const list = loadFoxPrefs()[key];
  return Array.isArray(list) ? list.map(String).filter(Boolean) : [];
}

function blockedByHidePrefs(work) {
  return [
    ["hideGenres", ["genres", "genre_slugs", "genre"]],
    ["hideFormats", ["formats", "format_slugs", "format"]],
    ["hideWarnings", ["warnings", "warning_slugs", "warning"]],
    ["hideKinks", ["kinks", "kink_slugs", "kink"]],
  ].some(([pref, keys]) => {
    const blocked = hiddenFeedSlugs(pref);
    if (!blocked.length) return false;
    const have = new Set(workSlugs(work, keys));
    return blocked.some((slug) => have.has(slug));
  });
}

function withoutHiddenTags(works) {
  return (works || []).filter((work) => !blockedByHidePrefs(work));
}

function paramFlag(params, name) {
  const value = params.get(name);
  return value === "1" || value === "on" || value === "true";
}

function readerIdSet(key) {
  const lib = typeof loadReaderLibrary === "function" ? loadReaderLibrary() : {};
  return new Set((Array.isArray(lib[key]) ? lib[key] : []).map(String));
}

function likedWorkIds(works) {
  const ids = readerIdSet("likes");
  try {
    const paths = new Set();
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("foxtoria-work-like:")) continue;
      if (localStorage.getItem(key) !== "1") continue;
      paths.add(key.slice("foxtoria-work-like:".length).replace(/^\//, "").split(/[?#]/)[0]);
    }
    (works || []).forEach((work) => {
      const href = String(work.href || workHref(work) || "")
        .replace(/^\.\//, "")
        .split(/[?#]/)[0];
      if (paths.has(href) || paths.has(`/${href}`)) ids.add(String(work.id));
    });
  } catch {
    /* ignore */
  }
  return ids;
}

function workFandomSlugs(work) {
  const slugs = new Set(workSlugs(work, ["fandoms", "fandom_slugs"]));
  const single = work.fandom || work.fandom_slug;
  if (single) slugs.add(String(single));
  return [...slugs];
}

function workCharacterSlugs(work) {
  const slugs = new Set(workSlugs(work, ["characters", "character_slugs"]));
  const names = work.characters || work.character_names;
  if (Array.isArray(names)) {
    const fandom = workFandomSlugs(work)[0] || "original";
    names.forEach((name) => {
      if (typeof name === "string") slugs.add(characterSlug(fandom, name));
    });
  }
  return [...slugs];
}

function characterSlug(fandomSlug, name) {
  return `${tagSlug(fandomSlug || "original")}-${tagSlug(name)}`;
}

function workPairingSlugs(work) {
  const slugs = new Set(workSlugs(work, ["pairings", "pairing_slugs"]));
  const list = work.pairings_list || work.pairing_list || work.pairings;
  if (Array.isArray(list)) {
    list.forEach((entry) => {
      if (typeof entry === "string") slugs.add(entry);
      else if (entry && entry.left && entry.right) slugs.add(pairingSlug(entry));
    });
  }
  return [...slugs];
}

function renderCatalogGrid(allWorks) {
  const root = document.querySelector("[data-feed='catalog']");
  if (!root) return;
  const type = root.getAttribute("data-type");
  const sort = document.querySelector(".sort-bar .sort-btn.active")?.getAttribute("data-sort") || "popular";
  let works = type ? allWorks.filter((work) => work.story_type === type) : allWorks;
  const params = new URLSearchParams(location.search);
  const query = (params.get("q") || "").trim().toLowerCase();
  if (query) {
    works = works.filter((work) =>
      [work.title, work.author, work.fandom, work.description, workTypeLabel(work), ROMANCE[work.romance] || work.romance]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }
  const typeFilter = params.get("type");
  if (typeFilter) works = works.filter((work) => work.story_type === typeFilter);
  ["romance", "age"].forEach((key) => {
    const value = params.get(key);
    if (!value) return;
    if (key === "age" && value === "0+") {
      works = works.filter((work) => {
        const age = String(work.age || work.age_rating || "");
        return !age || age === "none" || age === "0+";
      });
      return;
    }
    works = works.filter((work) => String(work[key] || work.age_rating || "") === value);
  });
  const status = params.get("status");
  if (status === "completed") works = works.filter((work) => work.is_completed);
  if (status === "in_progress") works = works.filter((work) => !work.is_completed);
  const size = params.get("size");
  if (size) works = works.filter((work) => work.work_size === size);
  const categorySlugs = slugsFromParams(params, "categories", "category");
  const fandomSlugs = slugsFromParams(params, "fandoms", "fandom");
  const characterSlugs = slugsFromParams(params, "characters", "character");
  const genreSlugs = slugsFromParams(params, "genres", "genre");
  const formatSlugs = slugsFromParams(params, "formats", "format");
  const warningSlugs = slugsFromParams(params, "warnings", "warning");
  const kinkSlugs = slugsFromParams(params, "kinks", "kink");
  const pairingSlugs = slugsFromParams(params, "pairings", "pairing");
  if (categorySlugs.length) {
    works = works.filter((work) => {
      const have = new Set(workCategorySlugs(work));
      return categorySlugs.every((slug) => have.has(slug));
    });
  }
  if (fandomSlugs.length) {
    works = works.filter((work) => {
      const have = new Set(workFandomSlugs(work));
      return fandomSlugs.every((slug) => have.has(slug));
    });
  }
  if (characterSlugs.length) {
    works = works.filter((work) => {
      const have = new Set(workCharacterSlugs(work));
      return characterSlugs.every((slug) => have.has(slug));
    });
  }
  if (genreSlugs.length) {
    works = works.filter((work) => matchesAllSlugs(work, ["genres", "genre_slugs", "genre"], genreSlugs));
  }
  if (formatSlugs.length) {
    works = works.filter((work) => matchesAllSlugs(work, ["formats", "format_slugs", "format"], formatSlugs));
  }
  if (warningSlugs.length) {
    works = works.filter((work) => matchesAllSlugs(work, ["warnings", "warning_slugs", "warning"], warningSlugs));
  }
  if (kinkSlugs.length) {
    works = works.filter((work) => {
      const age = work.age || work.age_rating;
      if (age !== "18+") return false;
      return matchesAllSlugs(work, ["kinks", "kink_slugs", "kink"], kinkSlugs);
    });
  }
  if (pairingSlugs.length) {
    works = works.filter((work) => {
      const have = new Set(workPairingSlugs(work));
      return pairingSlugs.every((slug) => have.has(slug));
    });
  }
  if (paramFlag(params, "hide_read")) {
    const read = readerIdSet("read");
    works = works.filter((work) => !read.has(String(work.id)));
  }
  if (paramFlag(params, "hide_liked")) {
    const liked = likedWorkIds(allWorks);
    works = works.filter((work) => !liked.has(String(work.id)));
  }
  const empty =
    type === "linear" || typeFilter === "linear"
      ? "Линейные истории появятся здесь после публикации."
      : type === "interactive" || typeFilter === "interactive"
        ? "Интерактивные работы появятся здесь после публикации."
        : type === "messenger" || typeFilter === "messenger"
          ? "Истории в формате мессенджеров появятся здесь после публикации."
          : "Работы появятся здесь, как только авторы начнут публиковать.";
  renderFeed("catalog", sortWorks(works, sort), empty);
}

function bindLibraryToolbar() {
  const page = document.querySelector(".library-page");
  if (!page || page.dataset.libraryBound === "1") return;
  page.dataset.libraryBound = "1";
  const sort = document.querySelector("[data-library-sort]");

  function applySort() {
    const dir = sort?.value || "new";
    document.querySelectorAll(".library-page .stories-grid, .library-page .authors-grid").forEach((grid) => {
      const cards = [...grid.querySelectorAll(".story-card, .author-card")];
      cards.sort((a, b) => {
        const ta = a.dataset.updated || "";
        const tb = b.dataset.updated || "";
        return dir === "old" ? ta.localeCompare(tb) : tb.localeCompare(ta);
      });
      cards.forEach((card) => grid.appendChild(card));
    });
  }

  sort?.addEventListener("change", applySort);
  document.querySelectorAll("[data-cabinet-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.getAttribute("data-cabinet-view");
      page.classList.toggle("is-list", view === "list");
      document.querySelectorAll("[data-cabinet-view]").forEach((other) => {
        other.classList.toggle("is-active", other === btn);
      });
    });
  });
  applySort();
}

function applyAuthorsSort() {
  const dir = document.querySelector("[data-authors-sort]")?.value || "popular";
  document.querySelectorAll(".authors-page .authors-grid").forEach((grid) => {
    const cards = [...grid.querySelectorAll(".author-card")];
    cards.sort((a, b) => {
      if (dir === "latest") {
        return (b.dataset.updated || "").localeCompare(a.dataset.updated || "");
      }
      const popular = (Number(b.dataset.popular) || 0) - (Number(a.dataset.popular) || 0);
      if (popular) return popular;
      return (Number(b.dataset.works) || 0) - (Number(a.dataset.works) || 0);
    });
    cards.forEach((card) => grid.appendChild(card));
  });
}

function bindAuthorsToolbar() {
  const page = document.querySelector(".authors-page");
  if (!page || page.dataset.authorsBound === "1") return;
  page.dataset.authorsBound = "1";
  document.querySelector("[data-authors-sort]")?.addEventListener("change", applyAuthorsSort);
  document.querySelectorAll("[data-authors-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.getAttribute("data-authors-view");
      page.classList.toggle("is-list", view === "list");
      document.querySelectorAll("[data-authors-view]").forEach((other) => {
        other.classList.toggle("is-active", other === btn);
      });
    });
  });
}

function renderAuthorsGrid(authors) {
  const root = document.querySelector("[data-feed='authors-grid']");
  if (!root) return;
  if (!authors.length) {
    root.innerHTML = emptyHTML("Авторы появятся вместе с первыми работами.");
    return;
  }
  root.innerHTML = authors.map((author) => authorCardHTML(author)).join("");
  if (typeof hydrateUiIcons === "function") hydrateUiIcons(root);
  bindAuthorsToolbar();
  applyAuthorsSort();
}

document.addEventListener("DOMContentLoaded", () => {
  loadCatalog();
  document.querySelectorAll(".sort-bar .sort-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      document.querySelectorAll(".sort-bar .sort-btn").forEach((other) => other.classList.toggle("active", other === btn));
      renderCatalogGrid(window.__foxWorks || []);
    });
  });
  const catalogPage = document.querySelector(".catalog-page");
  document.querySelectorAll("[data-catalog-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.getAttribute("data-catalog-view");
      catalogPage?.classList.toggle("is-list", view === "list");
      document.querySelectorAll("[data-catalog-view]").forEach((other) => {
        other.classList.toggle("is-active", other === btn);
      });
    });
  });
  document.querySelectorAll("[data-scroll]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.querySelector(btn.getAttribute("data-scroll"));
      if (!target) return;
      const dir = btn.getAttribute("data-dir") === "prev" ? -1 : 1;
      target.scrollBy({ left: dir * 260, behavior: "smooth" });
    });
  });
});

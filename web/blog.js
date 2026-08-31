(function blogPage() {
  const PAGE = 4;
  const STORE = "foxtoria-blog";
  const SETTINGS = "foxtoria-blog-settings";
  const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const BASE_STATS = { posts: 24, comments: 126, subs: 58, likes: 312 };
  const POSTS = [
    {
      id: "thoughts-chapter",
      status: "published",
      date: "2026-08-24",
      title: "Мысли перед новой главой",
      text: "Делюсь тем, что вдохновило меня на новую главу, и немного о процессе: чай, плейлист и карта сцен, которую я наконец нарисовала на бумаге.",
      tags: ["Вдохновение", "Письмо"],
      cover: "assets/test/cover-1.png",
      comments: 18,
      likes: 64,
      views: 820,
      pinned: true,
    },
    {
      id: "autumn-prep",
      status: "published",
      date: "2026-08-18",
      title: "Осенний марафон: как я готовлюсь",
      text: "Расписание, список глав и обещание себе не начинать новую работу, пока не закрою текущую. Спойлер: обещание уже под угрозой.",
      tags: ["Ивент", "План"],
      cover: "assets/test/cover-2.png",
      comments: 9,
      likes: 41,
      views: 540,
    },
    {
      id: "ending-poll",
      status: "published",
      date: "2026-08-12",
      title: "Маленькое голосование про концовку",
      text: "Два варианта финала, оба мне нравятся. Хочу услышать, какой путь кажется честнее для героев — без спойлеров в комментариях, пожалуйста.",
      tags: ["Голосование"],
      cover: "assets/test/cover-3.png",
      comments: 31,
      likes: 22,
      views: 910,
    },
    {
      id: "tea-scars",
      status: "published",
      date: "2026-08-03",
      title: "Чай с мятой и шрамами",
      text: "Короткий фрагмент, который не влез в главу. Пусть полежит здесь, пока я решаю, возвращать ли его в текст.",
      tags: ["Отрывок"],
      cover: "assets/test/cover-4.png",
      comments: 4,
      likes: 19,
      views: 260,
      paid: true,
      paid_min_level: 1,
    },
    {
      id: "letter-2019",
      status: "draft",
      date: "2026-08-21",
      title: "Письмо себе из 2019",
      text: "Черновик. Ещё не знаю, публиковать ли: слишком личное, но, кажется, именно из этого выросла текущая история.",
      tags: ["Черновик", "Письмо"],
      cover: "assets/test/новость1.png",
      comments: 0,
      likes: 0,
      views: 12,
    },
    {
      id: "chapter-12-tease",
      status: "scheduled",
      date: "2026-09-01",
      title: "Анонс 12 главы",
      text: "Запланировано на первое сентября. Короткий анонс и обложка, которую ещё дорисовываю.",
      tags: ["Анонс"],
      cover: "assets/test/новость2.png",
      comments: 0,
      likes: 0,
      views: 0,
    },
    {
      id: "old-playlist",
      status: "archived",
      date: "2026-03-14",
      title: "Плейлист зимы, которой уже нет",
      text: "Старая заметка. Оставляю в архиве, чтобы не терять ссылки, которые читатели всё ещё присылают.",
      tags: ["Архив", "Музыка"],
      cover: "assets/test/новость3.png",
      comments: 7,
      likes: 15,
      views: 190,
    },
    {
      id: "desk-notes",
      status: "published",
      date: "2026-07-22",
      title: "Заметки с рабочего стола",
      text: "Что помогает писать, когда сюжет застревает: прогулка, чужая глава и запрет открывать редактор до полудня.",
      tags: ["Процесс"],
      cover: "assets/test/новость4.png",
      comments: 6,
      likes: 28,
      views: 310,
    },
    {
      id: "draft-map",
      status: "draft",
      date: "2026-08-16",
      title: "Карта веток, которую никто не должен видеть",
      text: "Слишком много стрелок. Перенесу в чистовик, когда перестану путать имена.",
      tags: ["Черновик"],
      cover: "assets/test/новость5.png",
      comments: 0,
      likes: 0,
      views: 8,
    },
  ];
  const COMMENTS = [
    { name: "Лиса в книгах", avatar: "assets/test/avatar-2.png", text: "Очень жду продолжения!", when: "2 ч назад", post: "thoughts-chapter" },
    { name: "Никита", avatar: "assets/test/avatar-3.png", text: "За честный финал, даже если грустный.", when: "5 ч назад", post: "ending-poll" },
    { name: "Чайная соня", avatar: "assets/test/avatar-4.png", text: "Плейлист в точку. Спасибо, что поделились.", when: "вчера", post: "autumn-prep" },
    { name: "Лис с фонарём", avatar: "assets/test/avatar-5.png", text: "Этот отрывок лучше, чем целая глава.", when: "2 дня назад", post: "tea-scars" },
    { name: "Серая тетрадь", avatar: "assets/test/avatar-2.png", text: "Запрет открывать редактор до полудня — беру себе.", when: "3 дня назад", post: "desk-notes" },
    { name: "Марафонец", avatar: "assets/test/avatar-3.png", text: "Держу кулачки за осенний список глав.", when: "неделю назад", post: "autumn-prep" },
  ];
  const ICO = {
    comment: '<img src="assets/svg/коммент.svg" alt="">',
    like: '<img src="assets/svg/heart.svg" alt="">',
    eye: '<img src="assets/svg/eye.svg" alt="">',
    more: '<img src="assets/ornaments/03_more.svg?v=3" alt="">',
  };
  const COMMENT_STORE = "foxtoria-blog-comments";
  const LIKE_STORE = "foxtoria-blog-liked";
  const COLLAPSE_AT = 90;

  let tab = "published";
  let sort = "new";
  let view = "list";
  let shown = PAGE;
  let menuId = "";

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "") || { extras: [], edits: {}, deleted: [] };
    } catch {
      return { extras: [], edits: {}, deleted: [] };
    }
  }

  function saveStore(value) {
    localStorage.setItem(STORE, JSON.stringify(value));
  }

  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS) || "") || { privacy: "all", comments: "on" };
    } catch {
      return { privacy: "all", comments: "on" };
    }
  }

  function saveSettings(value) {
    localStorage.setItem(SETTINGS, JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }

  function isPublicStream() {
    return Boolean(document.querySelector("#blog-stream[data-blog-public]"));
  }

  function streamAuthor() {
    return (
      document.querySelector("[data-feed='profile-works']")?.getAttribute("data-author") ||
      (typeof ownerHandle === "function" ? ownerHandle() : "moonwander")
    );
  }

  function postLocked(post) {
    return window.FoxPay ? !FoxPay.postUnlocked(streamAuthor(), post) : false;
  }

  function signed() {
    return typeof isSignedIn === "function" && isSignedIn();
  }

  function loadJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || "") || fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function nextCommentId() {
    return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function localComments(postId) {
    return loadJson(COMMENT_STORE, {})[postId] || [];
  }

  function saveLocalComments(postId, list) {
    const all = loadJson(COMMENT_STORE, {});
    all[postId] = list;
    saveJson(COMMENT_STORE, all);
  }

  function seedComments(postId) {
    return COMMENTS.filter((item) => item.post === postId).map((item, index) => ({
      id: `seed-${postId}-${index}`,
      author: item.name,
      avatar: item.avatar,
      text: item.text,
      when: item.when,
    }));
  }

  function commentsFor(postId) {
    return [...seedComments(postId), ...localComments(postId)];
  }

  function commentCount(post) {
    return (Number(post.comments) || 0) + localComments(post.id).length;
  }

  function likedSet() {
    return new Set(loadJson(LIKE_STORE, []));
  }

  function isLiked(id) {
    return likedSet().has(id);
  }

  function toggleLike(id) {
    const list = loadJson(LIKE_STORE, []);
    const next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
    saveJson(LIKE_STORE, next);
  }

  function likeCount(post) {
    return (Number(post.likes) || 0) + (isLiked(post.id) ? 1 : 0);
  }

  function authorLabel(name) {
    if (typeof userNameLink === "function") return userNameLink(name, "user-link");
    return `<strong>${escapeHtml(name)}</strong>`;
  }

  function renderCommentItem(item) {
    const own = Boolean(item.own) || item.author === "Вы";
    const tools =
      signed() && (own || (typeof isSiteAdmin === "function" && isSiteAdmin()))
        ? `<span class="news-comment-tools"><button type="button" data-comment-delete><img src="assets/svg/удалить.svg" alt=""> Удалить</button></span>`
        : "";
    return `
      <article class="news-comment${own ? " is-own" : ""}" data-comment-id="${escapeHtml(item.id)}">
        <img class="news-comment-ava" src="${escapeHtml(item.avatar || "assets/deco/fox.svg")}" alt="">
        <div class="news-comment-bubble">
          <div class="news-comment-head">
            ${authorLabel(item.author || "Читатель")}
            ${tools}
          </div>
          <p>${typeof mentionHtml === "function" ? mentionHtml(item.text) : escapeHtml(item.text)}</p>
          <time>${escapeHtml(item.when || "")}</time>
        </div>
      </article>`;
  }

  function renderComments(postId) {
    const items = commentsFor(postId);
    if (!items.length) return `<p class="news-comment-empty">Пока нет комментариев. Напишите первый.</p>`;
    return `<div class="news-comment-list">${items.map(renderCommentItem).join("")}</div>`;
  }

  function refreshComments(card, id) {
    const list = card.querySelector("[data-comment-list]");
    const post = allPosts().find((item) => item.id === id);
    if (list) list.innerHTML = renderComments(id);
    card.querySelectorAll("[data-open-comments] span").forEach((el) => {
      if (post) el.textContent = String(commentCount(post));
    });
  }

  function commentForm() {
    if (loadSettings().comments === "off") {
      return `<p class="news-comment-empty">Комментарии выключены.</p>`;
    }
    if (!signed()) {
      return `<p class="news-comment-empty">Чтобы оставить комментарий, <button type="button" class="news-text-link" data-signin>войдите</button>.</p>`;
    }
    return `<form class="news-comment-form" data-comment-form>
      <textarea name="text" rows="3" required placeholder="Комментарий. Можно отметить через @юзернейм"></textarea>
      <button type="submit" class="btn btn-primary">Отправить</button>
    </form>`;
  }

  function publicPostHTML(post) {
    const locked = postLocked(post);
    const text = String(post.text || "");
    const long = text.length > COLLAPSE_AT;
    const excerpt = long ? `${text.slice(0, COLLAPSE_AT).trim()}…` : text;
    const liked = isLiked(post.id);
    const mark = window.FoxPay ? FoxPay.markHTML(post) : "";
    return `
      <article class="blog-post is-public${long ? " is-collapsible" : ""}${post.pinned ? " is-pinned" : ""}${locked ? " is-paid-locked" : ""}" data-id="${escapeHtml(post.id)}">
        <button type="button" class="blog-post-cover" data-expand aria-label="Открыть запись">
          ${mark}
          <img src="${escapeHtml(post.cover)}" alt="">
        </button>
        <div class="blog-post-body">
          <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time>
          <h2><button type="button" data-expand>${escapeHtml(post.title)}</button></h2>
          ${
            locked
              ? (window.FoxPay ? FoxPay.postGateHTML(streamAuthor(), post) : "<p>Только для подписчиков.</p>")
              : long
                ? `<p class="blog-excerpt">${escapeHtml(excerpt)}</p><p class="blog-full" hidden>${escapeHtml(text)}</p>`
                : `<p>${escapeHtml(text)}</p>`
          }
        </div>
        <div class="blog-post-tools">
          <p class="blog-post-stats">
            <button type="button" class="blog-stat-btn${liked ? " is-on" : ""}" data-like aria-pressed="${liked}">${ICO.like} <span>${likeCount(post)}</span></button>
            <button type="button" class="blog-stat-btn" data-open-comments>${ICO.comment} <span>${commentCount(post)}</span></button>
            <span>${ICO.eye} ${post.views || 0}</span>
          </p>
          <div class="blog-post-actions">
            ${long ? `<button type="button" class="news-more" data-expand>Читать далее →</button>` : ""}
            <button type="button" class="news-more" data-open-comments>Комментировать</button>
          </div>
        </div>
        <div class="news-comments" hidden>
          <div data-comment-list>${renderComments(post.id)}</div>
          ${commentForm()}
        </div>
      </article>`;
  }

  function expandPost(card, withComments) {
    if (card.classList.contains("is-paid-locked")) return;
    card.classList.add("is-expanded");
    const full = card.querySelector(".blog-full");
    const excerpt = card.querySelector(".blog-excerpt");
    if (full) {
      full.hidden = false;
      if (excerpt) excerpt.hidden = true;
    }
    const comments = card.querySelector(".news-comments");
    if (withComments && comments) comments.hidden = false;
    const more = card.querySelector(".blog-post-actions [data-expand]");
    if (more) {
      more.textContent = "Свернуть";
      more.setAttribute("data-collapse", "1");
    }
  }

  function collapsePost(card) {
    card.classList.remove("is-expanded");
    const full = card.querySelector(".blog-full");
    const excerpt = card.querySelector(".blog-excerpt");
    if (full && excerpt) {
      full.hidden = true;
      excerpt.hidden = false;
    }
    const comments = card.querySelector(".news-comments");
    if (comments) comments.hidden = true;
    const more = card.querySelector(".blog-post-actions [data-expand]");
    if (more) {
      more.textContent = "Читать далее →";
      more.removeAttribute("data-collapse");
    }
  }

  function bindPublicStream(stream) {
    stream.addEventListener("click", (event) => {
      const card = event.target.closest(".blog-post");
      if (!card) return;
      if (event.target.closest("a.user-link")) return;
      const id = card.getAttribute("data-id");
      if (event.target.closest("[data-like]")) {
        toggleLike(id);
        const post = allPosts().find((item) => item.id === id);
        const btn = event.target.closest("[data-like]");
        const on = isLiked(id);
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        const span = btn.querySelector("span");
        if (span && post) span.textContent = String(likeCount(post));
        return;
      }
      if (event.target.closest("[data-expand]")) {
        const btn = event.target.closest(".blog-post-actions [data-expand]");
        if (btn?.hasAttribute("data-collapse")) collapsePost(card);
        else expandPost(card, false);
        return;
      }
      if (event.target.closest("[data-open-comments]")) {
        expandPost(card, true);
        return;
      }
      if (event.target.closest("[data-comment-delete]")) {
        const cid = event.target.closest(".news-comment")?.getAttribute("data-comment-id");
        if (!cid || cid.startsWith("seed-")) return;
        saveLocalComments(
          id,
          localComments(id).filter((item) => item.id !== cid)
        );
        refreshComments(card, id);
      }
    });
    stream.addEventListener("submit", (event) => {
      const form = event.target.closest("[data-comment-form]");
      if (!form) return;
      event.preventDefault();
      const card = form.closest(".blog-post");
      const id = card.getAttribute("data-id");
      const text = form.text.value.trim();
      if (!text) return;
      saveLocalComments(id, [
        ...localComments(id),
        {
          id: nextCommentId(),
          author: "Вы",
          own: true,
          avatar: "assets/test/avatar-1.png",
          text,
          when: "только что",
        },
      ]);
      refreshComments(card, id);
      form.reset();
    });
  }

  function allPosts() {
    const store = loadStore();
    const deleted = new Set(store.deleted || []);
    const edits = store.edits || {};
    const extras = store.extras || [];
    const base = POSTS.filter((post) => !deleted.has(post.id)).map((post) => ({ ...post, ...(edits[post.id] || {}) }));
    const extra = extras.filter((post) => !deleted.has(post.id)).map((post) => ({ ...post, ...(edits[post.id] || {}) }));
    return [...extra, ...base];
  }

  function filtered() {
    const list = allPosts().filter((post) => {
      if (tab === "published") return post.status === "published";
      return post.status === tab;
    });
    list.sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      const diff = String(a.date).localeCompare(String(b.date));
      return sort === "new" ? -diff : diff;
    });
    return list;
  }

  function updateStats() {
    const posts = allPosts();
    const el = document.querySelector('[data-blog-stat="posts"]');
    if (el) el.textContent = String(Math.max(BASE_STATS.posts || 24, posts.length));
    const comments = document.querySelector('[data-blog-stat="comments"]');
    if (comments) comments.textContent = String(BASE_STATS.comments);
    const subs = document.querySelector('[data-blog-stat="subs"]');
    if (subs) subs.textContent = String(BASE_STATS.subs);
    const likes = document.querySelector('[data-blog-stat="likes"]');
    if (likes) likes.textContent = String(BASE_STATS.likes);
  }

  function patchPost(id, patch) {
    const store = loadStore();
    const extras = store.extras || [];
    const extra = extras.find((post) => post.id === id);
    if (extra) Object.assign(extra, patch);
    else store.edits[id] = { ...(store.edits[id] || {}), ...patch };
    saveStore(store);
  }

  function removePost(id) {
    const store = loadStore();
    store.deleted = [...new Set([...(store.deleted || []), id])];
    store.extras = (store.extras || []).filter((post) => post.id !== id);
    saveStore(store);
  }

  function postHTML(post) {
    if (isPublicStream()) return publicPostHTML(post);
    const open = menuId === post.id;
    const pinLabel = post.pinned ? "Открепить" : "Закрепить в блоге";
    const href = `blog.html?post=${encodeURIComponent(post.id)}`;
    return `
      <article class="blog-post${post.pinned ? " is-pinned" : ""}" data-id="${escapeHtml(post.id)}">
        <a class="blog-post-cover" href="${href}">
          ${window.FoxPay ? FoxPay.markHTML(post) : ""}
          <img src="${escapeHtml(post.cover)}" alt="">
        </a>
        <div class="blog-post-body">
          <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time>
          <h2><a href="${href}">${escapeHtml(post.title)}</a></h2>
          <p>${escapeHtml(post.text)}</p>
        </div>
        <div class="blog-menu${open ? " open" : ""}">
          <button type="button" class="blog-menu-btn" data-menu="${escapeHtml(post.id)}" aria-label="Ещё" aria-expanded="${open}">${ICO.more}</button>
          <div class="blog-menu-dd" ${open ? "" : "hidden"}>
            <button type="button" data-act="edit"><img src="assets/svg/редактировать.svg" alt=""> Редактировать</button>
            <button type="button" data-act="schedule"><img src="assets/deco/календарь.svg" alt=""> Запланировать</button>
            <button type="button" data-act="pin"><img src="assets/svg/кнопка.svg" alt=""> ${pinLabel}</button>
            <button type="button" data-act="copy"><img src="assets/svg/share.svg" alt=""> Копировать ссылку</button>
            <button type="button" class="is-danger" data-act="delete"><img src="assets/svg/удалить.svg" alt=""> Удалить</button>
          </div>
        </div>
        <div class="blog-post-tools">
          <p class="blog-post-stats">
            <span>${ICO.like} ${post.likes || 0}</span>
            <span>${ICO.comment} ${post.comments || 0}</span>
            <span>${ICO.eye} ${post.views || 0}</span>
          </p>
          <a class="btn btn-outline blog-open" href="${href}">Открыть</a>
        </div>
      </article>`;
  }

  function closeMenus() {
    menuId = "";
    document.querySelectorAll(".blog-menu").forEach((wrap) => {
      wrap.classList.remove("open");
      wrap.querySelector(".blog-menu-btn")?.setAttribute("aria-expanded", "false");
      const dd = wrap.querySelector(".blog-menu-dd");
      if (dd) dd.hidden = true;
    });
  }

  function renderRecent() {
    const box = document.getElementById("blog-recent");
    if (!box) return;
    box.innerHTML = COMMENTS.map(
      (item) => `
      <li>
        <img src="${escapeHtml(item.avatar)}" alt="">
        <div>
          <b>${escapeHtml(item.name)}</b>
          <p>${escapeHtml(item.text)}</p>
          <time>${escapeHtml(item.when)}</time>
        </div>
      </li>`
    ).join("");
  }

  function setNav(name) {
    document.querySelectorAll("[data-blog-nav]").forEach((btn) => {
      btn.classList.toggle("is-on", btn.getAttribute("data-blog-nav") === name);
    });
    document.querySelectorAll("[data-blog-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-blog-tab") === name);
    });
  }

  function showMain(kind) {
    const compose = document.getElementById("blog-compose");
    const settings = document.getElementById("blog-settings");
    const toolbar = document.getElementById("blog-toolbar");
    const stream = document.getElementById("blog-stream");
    const more = document.querySelector(".blog-more-wrap");
    if (compose) compose.hidden = kind !== "compose";
    if (settings) settings.hidden = kind !== "settings";
    if (toolbar) toolbar.hidden = kind !== "list";
    if (stream) stream.hidden = kind !== "list";
    if (more) more.hidden = kind !== "list";
  }

  function render() {
    const stream = document.getElementById("blog-stream");
    const more = document.getElementById("blog-more");
    if (!stream) return;
    const list = filtered();
    const slice = list.slice(0, shown);
    stream.classList.toggle("is-grid", view === "grid");
    if (!slice.length) {
      const labels = { published: "записей", draft: "черновиков", scheduled: "запланированных записей", archived: "записей в архиве" };
      stream.innerHTML = `<div class="empty-feed"><p>Пока нет ${labels[tab] || "записей"}.</p></div>`;
    } else {
      stream.innerHTML = slice.map(postHTML).join("");
    }
    if (more) more.hidden = list.length <= shown;
    const moreWrap = document.querySelector(".blog-more-wrap");
    if (moreWrap) moreWrap.hidden = list.length <= shown;
    updateStats();
  }

  function openCompose(post) {
    const form = document.getElementById("blog-form");
    const box = document.getElementById("blog-compose");
    const heading = document.getElementById("blog-compose-title");
    if (!form || !box) return;
    showMain("compose");
    heading.textContent = post ? "Редактировать пост" : "Новый пост";
    form.id.value = post?.id || "";
    form.title.value = post?.title || "";
    form.text.value = post?.text || "";
    form.cover.value = post?.cover || "assets/test/cover-1.png";
    form.status.value = post?.status === "archived" ? "published" : post?.status || "published";
    if (form.elements.paid) form.elements.paid.checked = Boolean(post?.paid);
    if (window.FoxPay) {
      FoxPay.fillLevelSelect(form.elements.paid_min_level, streamAuthor(), post?.paid_min_level);
      FoxPay.bindPaidFields(form, streamAuthor());
    }
    box.hidden = false;
    form.title.focus();
  }

  function copyLink(id) {
    const url = new URL(`blog.html?post=${encodeURIComponent(id)}`, location.href).href;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url);
  }

  function applySettings() {
    const settings = loadSettings();
    const privacy = document.getElementById("blog-privacy");
    const comments = document.getElementById("blog-allow-comments");
    if (privacy) privacy.value = settings.privacy;
    if (comments) comments.value = settings.comments;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const stream = document.getElementById("blog-stream");
    if (!stream) return;
    if (stream.hasAttribute("data-blog-public")) {
      tab = "published";
      shown = PAGE;
      bindPublicStream(stream);
      document.getElementById("blog-more")?.addEventListener("click", () => {
        shown += PAGE;
        render();
      });
      render();
      document.addEventListener("click", (event) => {
        if (event.target.closest("[data-signin], [data-signout]")) queueMicrotask(render);
      });
      return;
    }
    const fromUrl = new URLSearchParams(location.search).get("tab");
    if (["published", "draft", "scheduled", "archived"].includes(fromUrl)) tab = fromUrl;
    shown = PAGE;
    setNav(tab);
    applySettings();
    renderRecent();
    showMain("list");
    render();

    document.getElementById("blog-new")?.addEventListener("click", () => openCompose(null));
    document.getElementById("blog-compose-cancel")?.addEventListener("click", () => {
      showMain("list");
      render();
    });

    document.getElementById("blog-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const id = form.id.value || `post-${Date.now()}`;
      const payload = {
        id,
        status: form.status.value,
        date: new Date().toISOString().slice(0, 10),
        title: form.title.value.trim(),
        text: form.text.value.trim(),
        cover: form.cover.value.trim() || "assets/test/cover-1.png",
        paid: Boolean(form.elements.paid?.checked),
        paid_min_level: Math.max(1, Number(form.elements.paid_min_level?.value) || 1),
        comments: 0,
        likes: 0,
        views: 0,
      };
      const store = loadStore();
      if (form.id.value) patchPost(id, payload);
      else {
        store.extras = [payload, ...(store.extras || [])];
        saveStore(store);
      }
      tab = payload.status === "published" ? "published" : payload.status;
      shown = PAGE;
      setNav(tab);
      showMain("list");
      render();
    });

    document.getElementById("blog-tabs")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-blog-tab]");
      if (!btn) return;
      tab = btn.getAttribute("data-blog-tab");
      shown = PAGE;
      setNav(tab);
      showMain("list");
      render();
    });

    document.getElementById("blog-sort")?.addEventListener("change", (event) => {
      sort = event.target.value;
      render();
    });

    document.querySelector(".blog-views")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-blog-view]");
      if (!btn) return;
      view = btn.getAttribute("data-blog-view");
      document.querySelectorAll("[data-blog-view]").forEach((el) => {
        const on = el === btn;
        el.classList.toggle("is-on", on);
        el.setAttribute("aria-pressed", on ? "true" : "false");
      });
      render();
    });

    document.getElementById("blog-more")?.addEventListener("click", () => {
      shown += PAGE;
      render();
    });

    document.querySelector(".blog-manage")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-blog-nav]");
      if (!btn) return;
      const name = btn.getAttribute("data-blog-nav");
      if (name === "settings") {
        setNav("settings");
        applySettings();
        showMain("settings");
        return;
      }
      if (name === "comments") {
        setNav("comments");
        tab = "published";
        showMain("list");
        render();
        document.getElementById("blog-recent")?.closest(".blog-card")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }
      tab = name;
      shown = PAGE;
      setNav(tab);
      showMain("list");
      render();
    });

    document.getElementById("blog-privacy")?.addEventListener("change", (event) => {
      saveSettings({ ...loadSettings(), privacy: event.target.value });
    });
    document.getElementById("blog-allow-comments")?.addEventListener("change", (event) => {
      saveSettings({ ...loadSettings(), comments: event.target.value });
    });

    document.getElementById("blog-stream")?.addEventListener("click", (event) => {
      const menuBtn = event.target.closest("[data-menu]");
      if (menuBtn) {
        event.preventDefault();
        event.stopPropagation();
        const id = menuBtn.getAttribute("data-menu");
        const was = menuId === id;
        closeMenus();
        if (was) return;
        menuId = id;
        const wrap = menuBtn.closest(".blog-menu");
        wrap?.classList.add("open");
        menuBtn.setAttribute("aria-expanded", "true");
        const dd = wrap?.querySelector(".blog-menu-dd");
        if (dd) dd.hidden = false;
        return;
      }
      const act = event.target.closest("[data-act]");
      if (!act) return;
      event.preventDefault();
      const postEl = act.closest("[data-id]");
      const id = postEl?.getAttribute("data-id");
      const post = allPosts().find((item) => item.id === id);
      const kind = act.getAttribute("data-act");
      closeMenus();
      if (!post) return;
      if (kind === "edit") openCompose(post);
      if (kind === "schedule") {
        patchPost(id, { status: "scheduled" });
        tab = "scheduled";
        setNav(tab);
        render();
      }
      if (kind === "pin") {
        patchPost(id, { pinned: !post.pinned });
        render();
      }
      if (kind === "copy") copyLink(id);
      if (kind === "delete") {
        removePost(id);
        render();
      }
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".blog-menu")) closeMenus();
    });
  });
})();

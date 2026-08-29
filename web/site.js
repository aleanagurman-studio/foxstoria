(function restoreTheme() {
  const stored = localStorage.getItem("foxtoria-theme");
  if (stored === "dark" || stored === "light") {
    document.documentElement.setAttribute("data-theme", stored);
  }
})();

function isSignedIn() {
  return localStorage.getItem("foxtoria-signed-in") === "1";
}

function isSiteOwner() {
  return isSignedIn();
}

const FOX_PREFS_KEY = "foxtoria-prefs";
const FOX_PREFS_DEFAULTS = {
  autosave: true,
  notifComments: true,
  notifReplies: true,
  notifReviews: true,
  notifFollowers: true,
  notifAuthors: true,
  notifWorks: true,
  notifCollections: true,
  notifBlog: true,
  notifMentions: true,
  privacyMessages: "followers",
  privacyProfile: "all",
  privacyPacks: "public",
  privacyOnline: true,
  adultBlur: false,
  hideGenres: [],
  hideFormats: [],
  hideWarnings: [],
  hideKinks: [],
};

function loadFoxPrefs() {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(FOX_PREFS_KEY) || "{}") || {};
  } catch {
    stored = {};
  }
  return { ...FOX_PREFS_DEFAULTS, ...stored };
}

function saveFoxPrefs(prefs) {
  localStorage.setItem(FOX_PREFS_KEY, JSON.stringify({ ...FOX_PREFS_DEFAULTS, ...prefs }));
}

function foxPref(key) {
  const prefs = loadFoxPrefs();
  return prefs[key];
}

const OWNER_AVATAR_DEFAULT = "assets/test/avatar-1.png";

function ownerHandle() {
  try {
    const raw = JSON.parse(localStorage.getItem("foxtoria-profile") || "{}") || {};
    return String(raw.handle || "moonwander").replace(/^@/, "").trim() || "moonwander";
  } catch {
    return "moonwander";
  }
}

function ownerAvatarSrc() {
  try {
    const raw = JSON.parse(localStorage.getItem("foxtoria-profile") || "{}") || {};
    const src = String(raw.avatar || "").trim();
    return src || OWNER_AVATAR_DEFAULT;
  } catch {
    return OWNER_AVATAR_DEFAULT;
  }
}

function foxEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function mentionHtml(text) {
  const me = ownerHandle().toLowerCase();
  return foxEscape(text).replace(/@([a-zA-Z0-9_]{1,24})/g, (_, handle) => {
    const href = handle.toLowerCase() === me ? "profile.html" : `profile.html?u=${encodeURIComponent(handle)}`;
    return `<a class="user-link text-mention" href="${href}">@${handle}</a>`;
  });
}

function applyOwnerAvatar(root = document) {
  const src = ownerAvatarSrc();
  root.querySelectorAll(".header-avatar, .profile-ava img, [data-owner-avatar]").forEach((img) => {
    if (img instanceof HTMLImageElement) img.src = src;
  });
}

function currentPage() {
  const file = location.pathname.split("/").pop();
  return file && file !== "" ? file : "index.html";
}

function isUiIconImg(img) {
  if (!(img instanceof HTMLImageElement)) return false;
  const src = img.getAttribute("src") || "";
  if (!/assets\/(svg|deco)\//.test(src)) return false;
  if (/\.(png|jpe?g|webp)(\?|$)/i.test(src)) return false;
  if (/уголок|corner\.svg|ramka|разделитель1|hfpltkbntkm|дуфа2|lupa\.svg|lupa1/.test(src)) {
    return false;
  }
  if (/flower\.svg|present\.svg|книга\.svg/.test(src) && !img.closest(".feature-item")) {
    return false;
  }
  if (
    img.closest(
      ".logo, .profile-ava, .header-avatar, .sidebar-ornament, .studio-nav-art, .feed-corner, .work-cover, .story-cover, .cabinet-cover-frame, .cabinet-fox, .blog-post-cover, .news-cover, .news-hero-art, .tile-image, .collection-cover, .featured-cover, .author-avatar, .cover-fallback, .footer-art, .news-editor, .news-comment-ava, .lost-art, .lost-art-wrap, .msg-ava, .help-msg-ava, .help-chat-head, .help-ava, .linear-inline-art"
    )
  ) {
    return false;
  }
  return true;
}

const ICON_CACHE = "97";

function paintUiIcon(img) {
  const src = (img.getAttribute("src") || "").split("?")[0];
  const el = document.createElement("span");
  el.className = ["ui-icon", img.className].filter(Boolean).join(" ");
  if (/(?:^|\/)(?:share|флаг|delete|удалить)\.svg$/i.test(src)) el.classList.add("ui-icon-accent");
  el.setAttribute("aria-hidden", "true");
  el.style.setProperty("--icon", `url("${encodeURI(src)}?v=${ICON_CACHE}")`);
  img.replaceWith(el);
  return el;
}

function hydrateUiIcons(root = document) {
  const nodes = [];
  if (root instanceof HTMLImageElement) nodes.push(root);
  if (root.querySelectorAll) nodes.push(...root.querySelectorAll("img"));
  nodes.filter(isUiIconImg).forEach(paintUiIcon);
}

function setUiIcon(el, src) {
  if (!el) return;
  const clean = String(src || "").split("?")[0];
  if (el.tagName === "IMG") {
    el.setAttribute("src", src);
    if (isUiIconImg(el)) paintUiIcon(el);
    return;
  }
  el.style.setProperty("--icon", `url("${encodeURI(clean)}?v=${ICON_CACHE}")`);
}

document.addEventListener("DOMContentLoaded", function paintIcons() {
  hydrateUiIcons(document);
  if (!document.body) return;
  new MutationObserver((records) => {
    records.forEach((rec) => {
      rec.addedNodes.forEach((node) => {
        if (node.nodeType === 1) hydrateUiIcons(node);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
});

function profileSlug(name) {
  return (
    String(name || "")
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^a-zа-я0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "user"
  );
}

function tagSlug(value) {
  return profileSlug(value);
}

function searchHref(params) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value == null || value === "") return;
    if (Array.isArray(value)) {
      const clean = value.filter(Boolean);
      if (clean.length) query.set(key, clean.join(","));
      return;
    }
    query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `catalog.html?${qs}` : "catalog.html";
}

function tagLink(label, param, slug, className = "tag") {
  const safe = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  return `<a class="${safe(className)}" href="${safe(searchHref({ [param]: slug }))}">${safe(label)}</a>`;
}

function characterSlug(fandomSlug, name) {
  return `${tagSlug(fandomSlug || "original")}-${tagSlug(name)}`;
}

function characterLink(name, fandomSlug = "original", className = "tag") {
  return tagLink(name, "characters", characterSlug(fandomSlug, name), className);
}

function parsePairingLine(line) {
  const raw = String(line || "").trim();
  if (!raw) return null;
  if (raw.includes("|")) {
    const [left, right] = raw.split("|").map((part) => part.trim());
    if (!left || !right) return null;
    return { left, right, mode: "equal" };
  }
  if (raw.includes("/")) {
    const [left, right] = raw.split("/").map((part) => part.trim());
    if (!left || !right) return null;
    return { left, right, mode: "domsub" };
  }
  return null;
}

function pairingSlug(pairing) {
  if (typeof pairing === "string") return pairing.trim();
  const left = tagSlug(pairing.left);
  const right = tagSlug(pairing.right);
  return pairing.mode === "equal" ? `${left}|${right}` : `${left}/${right}`;
}

function pairingLabel(pairing) {
  if (typeof pairing === "string") return pairing;
  if (pairing.mode === "equal") return `${pairing.left} | ${pairing.right}`;
  return `${pairing.left}/${pairing.right}`;
}

function pairingLink(pairing, className = "tag pairing-tag") {
  const slug = pairingSlug(pairing);
  const label = pairingLabel(pairing);
  return tagLink(label, "pairings", slug, className);
}

function pairingTitle(pairing) {
  if (typeof pairing === "string") return pairing;
  if (pairing.mode === "equal") return `${pairing.left} и ${pairing.right} — равные роли`;
  return `${pairing.left} — доминант, ${pairing.right} — пассив`;
}

function tagLinks(items, param, className = "tag") {
  return (items || [])
    .map((item) => {
      if (typeof item === "string") return tagLink(item, param, tagSlug(item), className);
      if (item?.name && item?.slug) return tagLink(item.name, param, item.slug, className);
      return "";
    })
    .filter(Boolean)
    .join("");
}

function joinTags(htmlParts, separator = " ") {
  return htmlParts.filter(Boolean).join(separator);
}

function isOwnUserName(name) {
  const value = String(name || "").trim();
  return !value || value === "Вы" || value === "Я";
}

function profileHref(name) {
  if (isOwnUserName(name)) return "profile.html";
  const display = String(name).trim();
  const params = new URLSearchParams();
  params.set("u", profileSlug(display));
  params.set("n", display);
  return `profile.html?${params.toString()}`;
}

function userNameLink(name, className = "user-link") {
  const label = String(name || "Читатель").trim() || "Читатель";
  const safe = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const cls = className ? ` class="${safe(className)}"` : "";
  return `<a${cls} href="${safe(profileHref(label))}">${safe(label)}</a>`;
}

function hydrateUserLinks(root = document) {
  root.querySelectorAll("[data-mention-text]").forEach((el) => {
    el.innerHTML = mentionHtml(el.getAttribute("data-mention-text") || "");
  });
  root.querySelectorAll("[data-user-name]").forEach((el) => {
    const name = (el.getAttribute("data-user-name") || el.textContent || "").trim();
    if (!name) return;
    if (el.tagName === "A") {
      el.href = profileHref(name);
      el.classList.add("user-link");
      if (!el.textContent.trim()) el.textContent = name;
      return;
    }
    el.innerHTML = userNameLink(name);
  });
}

function currentTab(file = currentPage()) {
  const have = new URLSearchParams(location.search).get("tab");
  if (have) return have;
  if (file === "library.html") return "likes";
  if (file === "collections.html") return "mine";
  if (file === "feed.html" || file === "replies.html" || file === "reviews.html" || file === "author-home.html") return "all";
  return "";
}

function ddOn(href) {
  try {
    const url = new URL(href, location.href);
    const file = url.pathname.split("/").pop() || "index.html";
    if (currentPage() !== file) return "";
    const want = url.searchParams.get("tab");
    if (want) return want === currentTab(file) ? " class=\"active\"" : "";
    return " class=\"active\"";
  } catch {
    return "";
  }
}

function ddOnLibrary(tabs) {
  if (currentPage() !== "library.html") return "";
  return tabs.includes(currentTab("library.html")) ? " class=\"active\"" : "";
}

function navOn(href) {
  const page = currentPage();
  if (href === "catalog.html") {
    return ["catalog.html", "search.html", "stories-interactive.html", "stories-linear.html"].includes(page)
      ? " active"
      : "";
  }
  return page === href ? " active" : "";
}

function headerMarkup() {
  const page = currentPage();
  const on = (href) => (page === href ? " active" : "");
  return `
    <div class="header-lead">
      <a href="index.html" class="logo">
        <img src="assets/deco/fox.svg" alt="">
        <span>FoxStoria</span>
      </a>
      <nav class="nav-main">
        <a href="catalog.html"${navOn("catalog.html")}>Каталог</a>
        <a href="authors.html"${on("authors.html")}>Авторы</a>
        <a href="collections.html"${on("collections.html")}>Сборники</a>
        <a href="news.html"${on("news.html")}>Новости</a>
      </nav>
    </div>
    <form class="search-bar" action="catalog.html" role="search">
      <img src="assets/svg/search.svg" alt="">
      <input type="text" name="q" placeholder="Найти работу, автора или тэг..." autocomplete="off">
    </form>
    <div class="header-actions">
      <button type="button" class="theme-btn" id="theme-toggle" aria-label="Переключить тему">
        <img class="theme-moon" src="assets/deco/moon.svg" alt="">
        <img class="theme-day" src="assets/deco/день.svg" alt="">
      </button>
      <div class="header-inbox" id="header-inbox" hidden>
        <div class="header-alert">
          <button type="button" class="header-alert-btn" id="notif-toggle" aria-label="Оповещения" aria-expanded="false">
            <img src="assets/svg/notif.svg" alt="">
            <span class="header-alert-dot" data-notif-dot hidden></span>
          </button>
          <div class="header-alert-dd" id="notif-feed" hidden></div>
        </div>
        <a class="header-alert-btn" id="mail-toggle" href="messages.html" aria-label="Личные сообщения">
          <img src="assets/svg/mail.svg" alt="">
          <span class="header-alert-dot" data-mail-dot hidden></span>
        </a>
      </div>
      <div class="header-auth" id="header-guest">
        <a href="profile.html" class="btn btn-ghost" data-signin>Войти</a>
        <a href="profile.html" class="btn btn-primary" data-signin>Регистрация</a>
      </div>
      <div class="account-menu" id="account-menu" hidden>
        <button type="button" class="account-menu-btn" aria-expanded="false" aria-label="Мой профиль">
          <img class="header-avatar" src="assets/test/avatar-1.png" alt="">
        </button>
        <div class="account-dd" hidden>
          <div class="account-dd-scroll">
            <a href="feed.html"${ddOn("feed.html")}><img src="assets/deco/paw.svg" alt=""> Моя лента</a>
            <a href="blog.html"${ddOn("blog.html")}><img src="assets/deco/блог.svg" alt=""> Мой блог</a>
            <a href="profile.html"${ddOn("profile.html")}><img src="assets/svg/profile.svg" alt=""> Мой профиль</a>
            <a href="replies.html"${ddOn("replies.html")}><img src="assets/deco/heartcomm.svg" alt=""> Обсуждения</a>
            <span class="dd-sep"></span>
            <a href="studio.html"${ddOn("studio.html")}><img src="assets/deco/plus.svg" alt=""> Новая история</a>
            <a href="author-home.html"${ddOn("author-home.html")}><img src="assets/svg/читать.svg" alt=""> Мои истории</a>
            <a href="reviews.html"${ddOn("reviews.html")}><img src="assets/svg/коммент.svg" alt=""> Отзывы</a>
            <a href="changes.html"${ddOn("changes.html")}><img src="assets/deco/календарь.svg" alt=""> Изменения</a>
            <span class="dd-sep"></span>
            <a href="library.html?tab=likes"${ddOnLibrary(["likes", "read", "follows"])}><img src="assets/svg/bookmark2.svg" alt=""> Закладки</a>
            <a href="collections.html"${ddOn("collections.html")}><img src="assets/deco/сборник.svg" alt=""> Сборники</a>
          </div>
          <div class="account-dd-foot">
            <a href="support.html"${ddOn("support.html")}><img src="assets/svg/info.svg" alt=""> Помощь</a>
            <a href="wallet.html"${ddOn("wallet.html")}><img src="assets/svg/кошелек.svg" alt=""> Кошелёк</a>
            <a href="settings.html"${ddOn("settings.html")}><img src="assets/deco/настройки.svg" alt=""> Настройки</a>
            <button type="button" class="dd-signout" data-signout><img src="assets/svg/Traced Image.svg" alt=""> Выйти</button>
          </div>
        </div>
      </div>
    </div>`;
}

function loadBranchWaits(workId) {
  try {
    const raw = JSON.parse(localStorage.getItem("foxtoria-wait-branches:" + workId) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveBranchWaits(workId, waits) {
  localStorage.setItem("foxtoria-wait-branches:" + workId, JSON.stringify(waits));
  localStorage.setItem("foxtoria-wait-work:" + workId, waits.length ? "1" : "0");
}

function loadBranchNews(workId) {
  try {
    const raw = JSON.parse(localStorage.getItem("foxtoria-branch-news:" + workId) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function branchWaitNotifs() {
  if (!foxPref("notifWorks")) return "";
  const hrefByWork = { shadows: "read-interactive.html", letters: "read-linear.html" };
  const parts = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("foxtoria-wait-branches:")) continue;
    const workId = key.slice("foxtoria-wait-branches:".length);
    const news = loadBranchNews(workId);
    loadBranchWaits(workId).forEach((wait) => {
      if (!news.includes(wait.next)) return;
      const href = hrefByWork[workId] || "feed.html";
      parts.push(`<a href="${href}">
              <strong>Новая глава</strong>
              <span>В выбранной ветке: ${foxEscape(wait.label || "продолжение")}</span>
            </a>`);
    });
  }
  return parts.join("");
}

function fillNotifFeed() {
  const feed = document.getElementById("notif-feed");
  if (!feed) return;
  const handle = foxEscape(ownerHandle());
  const mention = foxPref("notifMentions")
    ? `<a href="replies.html?tab=mention">
              <strong>Упоминание</strong>
              <span>Вас отметили как @${handle}</span>
            </a>`
    : "";
  feed.innerHTML = `
            <p class="header-alert-kicker">Оповещения</p>
            ${mention}
            ${branchWaitNotifs()}
            <a href="news.html#editor-update">
              <strong>Обновление сайта</strong>
              <span>Новая версия редактора историй</span>
            </a>
            <a href="news.html#autumn-event">
              <strong>Ивент</strong>
              <span>Осенний марафон историй уже открыт</span>
            </a>
            <a href="feed.html">
              <strong>Моя лента</strong>
              <span>Работа из подписок вышла из черновика</span>
            </a>
            <a href="reviews.html">
              <strong>Отзывы</strong>
              <span>Новый отзыв к вашей истории</span>
            </a>`;
}

document.addEventListener("DOMContentLoaded", function mountHeader() {
  const header = document.querySelector("body > header.header");
  if (!header) return;
  header.innerHTML = headerMarkup();
  hydrateUiIcons(header);
  fillNotifFeed();
  syncAuthChrome();
  applyOwnerAvatar(header);
  document.querySelectorAll(".page-corner").forEach((el) => el.remove());

  const footer = document.querySelector(".page-footer");
  if (footer && !footer.querySelector(".footer-inner")) {
    const inner = document.createElement("div");
    inner.className = "footer-inner";
    inner.innerHTML = `
      <div class="footer-links">
        <nav class="footer-col" aria-label="Приложение">
          <span>Приложение</span>
          <a href="404.html">App Store</a>
          <a href="404.html">Google Play</a>
        </nav>
        <nav class="footer-col" aria-label="Контакты">
          <span>Контакты</span>
          <a href="404.html">Почта</a>
          <a href="https://t.me/foxcavemeit" target="_blank" rel="noopener noreferrer">Telegram</a>
        </nav>
      </div>
      <p class="footer-copy">© 2026 FoxStoria</p>`;
    footer.appendChild(inner);
  }

  const menu = document.getElementById("account-menu");
  const btn = menu?.querySelector(".account-menu-btn");
  const dd = menu?.querySelector(".account-dd");
  const notifBtn = document.getElementById("notif-toggle");
  const notifFeed = document.getElementById("notif-feed");

  function pinHeaderMenu(dd, anchor) {
    if (!dd) return;
    if (dd.hidden || !window.matchMedia("(max-width: 860px)").matches) {
      dd.style.removeProperty("top");
      dd.style.removeProperty("right");
      dd.style.removeProperty("left");
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const header = document.querySelector("body > header.header");
    const headerRect = header?.getBoundingClientRect();
    dd.style.top = `${Math.round(rect.bottom - (headerRect?.top || 0) + 8)}px`;
    dd.style.right = "12px";
    dd.style.left = "auto";
  }

  function closeAccount() {
    if (!dd) return;
    dd.hidden = true;
    dd.style.removeProperty("top");
    dd.style.removeProperty("right");
    dd.style.removeProperty("left");
    menu?.classList.remove("open");
    btn?.setAttribute("aria-expanded", "false");
  }

  function closeNotif() {
    if (!notifFeed) return;
    notifFeed.hidden = true;
    notifFeed.style.removeProperty("top");
    notifFeed.style.removeProperty("right");
    notifFeed.style.removeProperty("left");
    notifBtn?.setAttribute("aria-expanded", "false");
  }

  if (btn && dd) {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      closeNotif();
      const open = dd.hidden;
      dd.hidden = !open;
      menu.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      pinHeaderMenu(dd, btn);
    });
  }
  if (notifBtn && notifFeed) {
    notifBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      closeAccount();
      const open = notifFeed.hidden;
      notifFeed.hidden = !open;
      notifBtn.setAttribute("aria-expanded", open ? "true" : "false");
      pinHeaderMenu(notifFeed, notifBtn);
      if (open) {
        localStorage.setItem("foxtoria-notif-read", "1");
        syncInboxDots();
      }
    });
    notifFeed.addEventListener("click", (event) => event.stopPropagation());
  }
  document.getElementById("mail-toggle")?.addEventListener("click", () => {
    localStorage.setItem("foxtoria-mail-read", "1");
  });
  if (currentPage() === "messages.html") {
    localStorage.setItem("foxtoria-mail-read", "1");
  }
  document.addEventListener("click", () => {
    closeAccount();
    closeNotif();
  });
  hydrateUserLinks();

  function syncHeaderHeight() {
    const h = Math.round(header.getBoundingClientRect().height);
    if (h > 0) document.documentElement.style.setProperty("--header-h", `${h}px`);
  }
  syncHeaderHeight();
  requestAnimationFrame(syncHeaderHeight);
  if (window.ResizeObserver) new ResizeObserver(syncHeaderHeight).observe(header);
  window.addEventListener("resize", syncHeaderHeight);
});

document.addEventListener("DOMContentLoaded", function bindCollapsibleSide() {
  const layout = document.querySelector("[data-side-layout]");
  const panel = document.querySelector("[data-side-panel]");
  const btns = [...document.querySelectorAll("[data-side-toggle]")];
  if (!layout || !panel || !btns.length) return;

  const mq = window.matchMedia("(max-width: 860px)");
  const alwaysOverlay = layout.classList.contains("linear-read");
  const overlay =
    layout.classList.contains("studio-layout") ||
    layout.classList.contains("msg-layout") ||
    layout.classList.contains("editor-layout") ||
    alwaysOverlay;
  let backdrop = layout.querySelector(".side-backdrop");
  if (overlay && !backdrop) {
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "side-backdrop";
    backdrop.setAttribute("aria-label", "Закрыть меню");
    backdrop.hidden = true;
    layout.prepend(backdrop);
  }

  function canOverlay() {
    return alwaysOverlay || mq.matches;
  }

  function setOpen(open) {
    const show = canOverlay() && open;
    layout.classList.toggle("is-side-open", show);
    btns.forEach((btn) => btn.setAttribute("aria-expanded", show ? "true" : "false"));
    if (backdrop) backdrop.hidden = !show;
    if (show) {
      layout.classList.remove("is-props-open");
      document.querySelectorAll("[data-props-toggle]").forEach((btn) => btn.setAttribute("aria-expanded", "false"));
      const propsBack = layout.querySelector(".props-backdrop");
      if (propsBack) propsBack.hidden = true;
    }
  }

  btns.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      setOpen(!layout.classList.contains("is-side-open"));
    });
  });
  if (backdrop) backdrop.addEventListener("click", () => setOpen(false));
  panel.addEventListener("click", (event) => {
    if (!canOverlay()) return;
    if (event.target.closest("[data-side-toggle]")) return;
    if (event.target.closest("[data-view], [data-select], .studio-item, .msg-item, .linear-toc a, .work-chapter-edit, .work-chapter-title")) {
      setOpen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
  mq.addEventListener("change", () => {
    if (!alwaysOverlay) setOpen(false);
  });
  setOpen(false);
});

document.addEventListener("DOMContentLoaded", function bindPropsDrawer() {
  const layout = document.querySelector(".editor-layout");
  const panel = document.querySelector("[data-props-panel]");
  const btn = document.querySelector("[data-props-toggle]");
  if (!layout || !panel || !btn) return;

  const mq = window.matchMedia("(max-width: 1100px)");
  let backdrop = layout.querySelector(".props-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "side-backdrop props-backdrop";
    backdrop.setAttribute("aria-label", "Закрыть панель");
    backdrop.hidden = true;
    layout.prepend(backdrop);
  }

  function setOpen(open) {
    const show = mq.matches && open;
    layout.classList.toggle("is-props-open", show);
    btn.setAttribute("aria-expanded", show ? "true" : "false");
    backdrop.hidden = !show;
    if (show) {
      layout.classList.remove("is-side-open");
      document.querySelectorAll("[data-side-toggle]").forEach((toggle) => toggle.setAttribute("aria-expanded", "false"));
    }
  }

  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(!layout.classList.contains("is-props-open"));
  });
  backdrop.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
  mq.addEventListener("change", () => setOpen(false));
  setOpen(false);
});

function syncInboxDots() {
  const signed = isSignedIn();
  const notifDot = document.querySelector("[data-notif-dot]");
  const mailDot = document.querySelector("[data-mail-dot]");
  if (notifDot) notifDot.hidden = !signed || localStorage.getItem("foxtoria-notif-read") === "1";
  if (mailDot) mailDot.hidden = !signed || localStorage.getItem("foxtoria-mail-read") === "1";
}

function syncAuthChrome() {
  const guest = document.getElementById("header-guest");
  const menu = document.getElementById("account-menu");
  const inbox = document.getElementById("header-inbox");
  const welcome = document.getElementById("welcome-card");
  const signed = isSignedIn();
  if (guest) guest.hidden = signed;
  if (menu) menu.hidden = !signed;
  if (inbox) inbox.hidden = !signed;
  if (welcome) welcome.hidden = signed;
  document.querySelectorAll("[data-owner-only]").forEach((el) => {
    el.hidden = !isSiteOwner();
  });
  applyOwnerAvatar();
  syncInboxDots();
}

document.addEventListener("click", (event) => {
  const signin = event.target.closest("[data-signin]");
  if (signin) {
    localStorage.setItem("foxtoria-signed-in", "1");
    syncAuthChrome();
  }
  const signout = event.target.closest("[data-signout]");
  if (signout) {
    event.preventDefault();
    localStorage.removeItem("foxtoria-signed-in");
    syncAuthChrome();
  }
  const toggle = event.target.closest("#theme-toggle");
  if (!toggle) return;
  const html = document.documentElement;
  const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  localStorage.setItem("foxtoria-theme", next);
});

document.addEventListener("DOMContentLoaded", function workTabs() {
  const tabs = document.querySelectorAll(".chapter-tabs a[data-panel]");
  if (!tabs.length) return;
  tabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      const name = tab.getAttribute("data-panel");
      tabs.forEach((other) => other.classList.toggle("active", other === tab));
      document.querySelectorAll("[data-work-panel]").forEach((panel) => {
        panel.hidden = panel.getAttribute("data-work-panel") !== name;
      });
    });
  });
});

document.addEventListener("DOMContentLoaded", function publicProfile() {
  hydrateUserLinks();
  if (currentPage() !== "profile.html") return;
  const params = new URLSearchParams(location.search);
  const slug = (params.get("u") || "").trim();
  const name = (params.get("n") || "").trim();
  if (!slug && !name) return;
  const display = name || slug.replace(/-/g, " ");
  const handle = slug || profileSlug(display);
  const title = document.querySelector(".profile-name") || document.querySelector(".profile-hero h1");
  const handleEl = document.querySelector(".profile-handle") || document.querySelector(".profile-meta");
  if (title) title.textContent = display;
  if (handleEl) handleEl.textContent = `@${handle}`;
  const bio = document.querySelector(".profile-bio");
  if (bio) bio.textContent = "Публичный профиль появится вместе с аккаунтами.";
  const links = document.getElementById("profile-links");
  if (links) {
    links.innerHTML = "";
    links.hidden = true;
  }
  document.title = `${display} — профиль — FoxStoria`;
  const subnav = document.querySelector(".account-subnav");
  if (subnav) subnav.hidden = true;
  document.querySelector('.sidebar-nav a[href="profile.html"]')?.classList.remove("active");
});

document.addEventListener("DOMContentLoaded", function messagesPage() {
  if (currentPage() !== "messages.html") return;
  const list = document.querySelector(".msg-list");
  if (!list) return;

  function closeMsgMenus(except) {
    document.querySelectorAll(".msg-menu").forEach((menu) => {
      if (menu === except) return;
      menu.classList.remove("open");
      menu.querySelector("[data-msg-menu]")?.setAttribute("aria-expanded", "false");
      const dd = menu.querySelector(".msg-menu-dd");
      if (dd) {
        dd.hidden = true;
        dd.style.position = "";
        dd.style.left = "";
        dd.style.top = "";
        dd.style.right = "";
      }
    });
  }

  function setMsgBtn(btn, src, label) {
    if (!btn) return;
    btn.innerHTML = `<img src="${src}" alt=""> ${label}`;
    hydrateUiIcons(btn);
  }

  function bubbleMenuHTML() {
    return `<div class="msg-menu msg-bubble-menu">
        <button type="button" class="msg-menu-btn" data-msg-menu aria-label="Ещё" aria-expanded="false">
          <img src="assets/ornaments/03_more.svg?v=3" alt="">
        </button>
        <div class="msg-menu-dd" hidden>
          <button type="button" data-msg-bubble-act="edit"><img src="assets/svg/редактировать.svg" alt=""> Редактировать</button>
          <button type="button" data-msg-bubble-act="pin"><img src="assets/svg/кнопка.svg" alt=""> Закрепить</button>
          <button type="button" data-msg-bubble-act="select"><img src="assets/svg/okay.svg" alt=""> Выбрать</button>
          <button type="button" data-msg-bubble-act="reply"><img src="assets/svg/коммент.svg" alt=""> Ответить</button>
          <button type="button" class="is-danger" data-msg-bubble-act="delete"><img src="assets/svg/удалить.svg" alt=""> Удалить</button>
        </div>
      </div>`;
  }

  function ensureBubbleMenus(root = document) {
    const rows = root instanceof Element && root.matches(".msg-row")
      ? [root]
      : [...root.querySelectorAll(".msg-row")];
    rows.forEach((row) => {
      if (!row.querySelector(".msg-pick")) {
        row.insertAdjacentHTML("afterbegin", `<label class="msg-pick"><input type="checkbox" data-msg-pick></label>`);
      }
      const bubble = row.querySelector(".msg-bubble");
      if (!bubble || bubble.querySelector(".msg-bubble-menu")) return;
      bubble.insertAdjacentHTML("beforeend", bubbleMenuHTML());
      hydrateUiIcons(row);
    });
  }

  function placeBubbleDd(menu) {
    const dd = menu.querySelector(".msg-menu-dd");
    const btn = menu.querySelector(".msg-menu-btn");
    if (!dd || !btn || !menu.closest(".msg-row")) return;
    dd.style.position = "fixed";
    dd.style.right = "auto";
    const br = btn.getBoundingClientRect();
    dd.style.left = "0px";
    dd.style.top = "0px";
    const width = dd.getBoundingClientRect().width || 220;
    const height = dd.getBoundingClientRect().height || 210;
    let left = br.right - width;
    let top = br.bottom + 4;
    if (left < 8) left = 8;
    if (left + width > innerWidth - 8) left = Math.max(8, innerWidth - width - 8);
    if (top + height > innerHeight - 8) top = Math.max(8, innerHeight - height - 8);
    dd.style.left = `${left}px`;
    dd.style.top = `${top}px`;
  }

  function rowText(row) {
    const text = (row?.querySelector(".msg-bubble p")?.textContent || "").trim();
    if (text) return text;
    if (row?.querySelector("img.msg-attach-preview, .msg-file-img")) return "Фото";
    if (row?.querySelector(".msg-file")) return "Файл";
    return "";
  }

  function refreshPinMenus(thread) {
    thread?.querySelectorAll(".msg-row").forEach((row) => {
      const pinBtn = row.querySelector("[data-msg-bubble-act=pin]");
      setMsgBtn(pinBtn, "assets/svg/кнопка.svg", row.classList.contains("is-pinned") ? "Открепить" : "Закрепить");
    });
  }

  function flashRow(row) {
    if (!row) return;
    row.classList.remove("is-flash");
    void row.offsetWidth;
    row.classList.add("is-flash");
    window.clearTimeout(row._flashTimer);
    row._flashTimer = window.setTimeout(() => row.classList.remove("is-flash"), 1400);
  }

  function jumpToPinned(thread) {
    const pinned = thread?.querySelector(".msg-row.is-pinned");
    pinned?.scrollIntoView({ block: "center", behavior: "smooth" });
    flashRow(pinned);
  }

  function setPinnedRow(thread, row, on) {
    thread?.querySelectorAll(".msg-row.is-pinned").forEach((el) => el.classList.remove("is-pinned"));
    if (on && row) row.classList.add("is-pinned");
    refreshPinMenus(thread);
    updatePinBar(thread);
  }

  function updatePinBar(thread) {
    const bar = thread?.querySelector("[data-msg-pin-bar]");
    const pinned = thread?.querySelector(".msg-row.is-pinned");
    if (!bar) return;
    bar.hidden = !pinned;
    const span = bar.querySelector("[data-msg-pin-text]");
    if (span) span.textContent = rowText(pinned) || "Сообщение";
    hydrateUiIcons(bar);
  }

  function refreshThreadPreview(thread) {
    const id = thread?.getAttribute("data-thread");
    const preview = list.querySelector(`.msg-item[data-thread="${id}"] .msg-item-preview`);
    const timeEl = list.querySelector(`.msg-item[data-thread="${id}"] time`);
    const last = [...(thread?.querySelectorAll(".msg-row") || [])].at(-1);
    if (preview) preview.textContent = rowText(last) || "Нет сообщений";
    if (timeEl && last) {
      const stamp = last.querySelector("time")?.textContent;
      if (stamp) timeEl.textContent = stamp;
    }
  }

  function updateSelectCount(thread) {
    const n = thread?.querySelectorAll("[data-msg-pick]:checked").length || 0;
    const label = thread?.querySelector("[data-msg-select-count]");
    if (label) label.textContent = `${n} выбрано`;
    thread?.querySelectorAll(".msg-row").forEach((row) => {
      row.classList.toggle("is-picked", !!row.querySelector("[data-msg-pick]:checked"));
    });
  }

  function setSelecting(thread, on, row) {
    thread?.classList.toggle("is-selecting", on);
    const bar = thread?.querySelector("[data-msg-select-bar]");
    if (bar) bar.hidden = !on;
    if (!on) {
      thread?.querySelectorAll("[data-msg-pick]").forEach((box) => {
        box.checked = false;
      });
    } else if (row) {
      const box = row.querySelector("[data-msg-pick]");
      if (box) box.checked = true;
    }
    updateSelectCount(thread);
  }

  function editBubble(row) {
    const bubble = row.querySelector(".msg-bubble");
    const p = bubble?.querySelector("p");
    if (!bubble || bubble.querySelector(".msg-edit-field")) return;
    const field = document.createElement("textarea");
    field.className = "msg-edit-field";
    field.value = p?.textContent || "";
    field.rows = 2;
    (p || bubble.querySelector("time"))?.before(field);
    if (p) p.hidden = true;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
    function save() {
      const text = field.value.trim();
      field.remove();
      if (!text) {
        if (p) p.hidden = false;
        return;
      }
      if (p) {
        p.textContent = text;
        p.hidden = false;
      } else {
        bubble.insertAdjacentHTML("afterbegin", `<p>${escapeMsg(text)}</p>`);
      }
      const time = bubble.querySelector("time");
      if (time && !bubble.querySelector(".msg-edited")) {
        time.insertAdjacentHTML("afterbegin", `<span class="msg-edited">изм.</span>`);
      }
      refreshThreadPreview(row.closest(".msg-thread"));
      updatePinBar(row.closest(".msg-thread"));
    }
    field.addEventListener("blur", save);
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        field.blur();
      }
      if (event.key === "Escape") {
        field.removeEventListener("blur", save);
        field.remove();
        if (p) p.hidden = false;
      }
    });
  }

  function handleBubbleAct(act, row, thread, btn) {
    if (act === "edit") {
      editBubble(row);
    } else if (act === "pin") {
      const on = !row.classList.contains("is-pinned");
      setPinnedRow(thread, row, on);
      if (on) jumpToPinned(thread);
    } else if (act === "select") {
      setSelecting(thread, true, row);
    } else if (act === "reply") {
      const bar = thread.querySelector("[data-msg-reply]");
      const textEl = bar?.querySelector("[data-msg-reply-text]");
      if (textEl) textEl.textContent = rowText(row) || "Вложение";
      if (bar) bar.hidden = false;
      thread.querySelector("textarea")?.focus();
    } else if (act === "delete") {
      if (!confirm("Удалить это сообщение?")) return false;
      const wasPinned = row.classList.contains("is-pinned");
      row.remove();
      if (wasPinned) updatePinBar(thread);
      refreshThreadPreview(thread);
    }
    return true;
  }

  function showThread(id) {
    closeMsgMenus();
    const item = list.querySelector(`.msg-item[data-thread="${id}"]`);
    list.querySelectorAll(".msg-item").forEach((el) => el.classList.toggle("active", el === item));
    document.querySelectorAll(".msg-thread").forEach((pane) => {
      pane.hidden = pane.getAttribute("data-thread") !== id;
    });
  }

  list.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    const item = event.target.closest(".msg-item");
    if (!item) return;
    showThread(item.getAttribute("data-thread"));
  });

  document.addEventListener("click", (event) => {
    const threadFromUi = event.target.closest(".msg-thread");
    if (event.target.closest("[data-msg-select-cancel]")) {
      setSelecting(threadFromUi, false);
      closeMsgMenus();
      return;
    }
    if (event.target.closest("[data-msg-reply-cancel]")) {
      const bar = threadFromUi?.querySelector("[data-msg-reply]");
      if (bar) bar.hidden = true;
      return;
    }
    if (event.target.closest("[data-msg-unpin]")) {
      setPinnedRow(threadFromUi, null, false);
      closeMsgMenus();
      return;
    }
    if (event.target.closest("[data-msg-pin-bar]")) {
      jumpToPinned(threadFromUi);
      return;
    }
    if (event.target.closest("[data-msg-pick]")) {
      updateSelectCount(threadFromUi);
      return;
    }
    if (threadFromUi?.classList.contains("is-selecting")) {
      const row = event.target.closest(".msg-row");
      if (row && !event.target.closest(".msg-menu")) {
        const box = row.querySelector("[data-msg-pick]");
        if (box) box.checked = !box.checked;
        updateSelectCount(threadFromUi);
        return;
      }
    }
    const menu = event.target.closest(".msg-menu");
    if (!menu) {
      closeMsgMenus();
      return;
    }
    const toggle = event.target.closest("[data-msg-menu]");
    if (toggle) {
      const open = !menu.classList.contains("open");
      closeMsgMenus(open ? menu : null);
      menu.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      const dd = menu.querySelector(".msg-menu-dd");
      if (dd) dd.hidden = !open;
      if (open) placeBubbleDd(menu);
      return;
    }
    const bubbleBtn = event.target.closest("[data-msg-bubble-act]");
    if (bubbleBtn) {
      const row = menu.closest(".msg-row");
      const thread = menu.closest(".msg-thread");
      handleBubbleAct(bubbleBtn.getAttribute("data-msg-bubble-act"), row, thread, bubbleBtn);
      closeMsgMenus();
      return;
    }
    const actBtn = event.target.closest("[data-msg-act]");
    if (!actBtn) return;
    const thread = menu.closest(".msg-thread");
    const id = thread?.getAttribute("data-thread");
    const item = id ? list.querySelector(`.msg-item[data-thread="${id}"]`) : null;
    const act = actBtn.getAttribute("data-msg-act");
    if (act === "pin") {
      const on = !item?.classList.contains("is-pinned");
      item?.classList.toggle("is-pinned", on);
      if (on && item) list.prepend(item);
      setMsgBtn(actBtn, "assets/svg/кнопка.svg", on ? "Открепить чат" : "Закрепить чат");
    } else if (act === "clear") {
      if (!confirm("Очистить историю этого чата?")) return;
      const log = thread?.querySelector(".msg-thread-log");
      if (log) log.innerHTML = "";
      ensureBubbleMenus(thread);
      updatePinBar(thread);
      const preview = item?.querySelector(".msg-item-preview");
      if (preview) preview.textContent = "Нет сообщений";
    } else if (act === "mute") {
      const muted = thread?.classList.toggle("is-muted");
      setMsgBtn(
        actBtn,
        muted ? "assets/svg/soundon.svg" : "assets/svg/mute.svg",
        muted ? "Включить уведомления" : "Выключить уведомления"
      );
    } else if (act === "delete") {
      if (!confirm("Удалить этот чат?")) return;
      const next = item?.nextElementSibling || item?.previousElementSibling;
      item?.remove();
      thread?.remove();
      if (next?.hasAttribute("data-thread")) {
        showThread(next.getAttribute("data-thread"));
      } else {
        const panes = document.querySelector(".msg-panes");
        if (panes) panes.innerHTML = `<div class="msg-empty">Нет диалогов</div>`;
      }
    } else if (act === "block") {
      const blocked = thread?.classList.toggle("is-blocked");
      actBtn.classList.toggle("is-danger", !blocked);
      setMsgBtn(actBtn, "assets/svg/warn.svg", blocked ? "Разблокировать" : "Заблокировать");
    }
    closeMsgMenus();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const selecting = document.querySelector(".msg-thread.is-selecting:not([hidden])");
    if (selecting) setSelecting(selecting, false);
    closeMsgMenus();
  });
  ensureBubbleMenus();
  function escapeMsg(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function formatMsgSize(bytes) {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0).replace(".0", "")} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".0", "")} МБ`;
  }

  function isMsgImage(file) {
    return String(file.type || "").startsWith("image/");
  }

  function msgPreviewLabel(text, items) {
    if (text) return text;
    if (items.length === 1) return items[0].file.name;
    return `${items.length} вложения`;
  }

  document.querySelectorAll("[data-msg-composer]").forEach((form) => {
    const field = form.querySelector("textarea");
    const fileInput = form.querySelector("[data-msg-file]");
    const attachBtn = form.querySelector("[data-msg-attach]");
    const attachList = form.querySelector("[data-msg-attach-list]");
    const pending = [];

    function renderAttach() {
      if (!attachList) return;
      attachList.hidden = pending.length === 0;
      attachList.innerHTML = pending
        .map((item) => {
          const thumb = isMsgImage(item.file)
            ? `<img class="msg-attach-thumb" src="${item.url}" alt="">`
            : `<img src="assets/svg/download.svg" alt="">`;
          return `<div class="msg-attach-chip">
            ${thumb}
            <span class="msg-attach-name">${escapeMsg(item.file.name)}</span>
            <button type="button" class="msg-attach-remove" data-remove="${item.id}" aria-label="Убрать файл">
              <img src="assets/svg/удалить.svg" alt="">
            </button>
          </div>`;
        })
        .join("");
      hydrateUiIcons(attachList);
    }

    attachBtn?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", () => {
      [...(fileInput.files || [])].forEach((file) => {
        pending.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          url: URL.createObjectURL(file),
        });
      });
      fileInput.value = "";
      renderAttach();
    });
    attachList?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-remove]");
      if (!btn) return;
      const id = btn.getAttribute("data-remove");
      const index = pending.findIndex((item) => item.id === id);
      if (index < 0) return;
      URL.revokeObjectURL(pending[index].url);
      pending.splice(index, 1);
      renderAttach();
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = (field?.value || "").trim();
      if (!text && !pending.length) return;
      const thread = form.closest(".msg-thread");
      const log = thread?.querySelector(".msg-thread-log");
      const now = new Date();
      const stamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const sent = pending.splice(0, pending.length);
      const replyBar = thread?.querySelector("[data-msg-reply]");
      const replyText = replyBar && !replyBar.hidden
        ? (replyBar.querySelector("[data-msg-reply-text]")?.textContent || "").trim()
        : "";
      const quoteHtml = replyText ? `<blockquote class="msg-quote">${escapeMsg(replyText)}</blockquote>` : "";
      const filesHtml = sent.length
        ? `<div class="msg-bubble-files">${sent
            .map((item) => {
              if (isMsgImage(item.file)) {
                return `<a href="${item.url}" target="_blank" rel="noopener"><img class="msg-bubble-media" src="${item.url}" alt="${escapeMsg(item.file.name)}"></a>`;
              }
              return `<a class="msg-file-card" href="${item.url}" download="${escapeMsg(item.file.name)}" target="_blank" rel="noopener">
                <img src="assets/svg/download.svg" alt="">
                <span><b>${escapeMsg(item.file.name)}</b><span>${formatMsgSize(item.file.size)}</span></span>
              </a>`;
            })
            .join("")}</div>`
        : "";
      const textHtml = text ? `<p>${escapeMsg(text)}</p>` : "";
      log?.insertAdjacentHTML(
        "beforeend",
        `<div class="msg-row is-mine"><div class="msg-bubble mine">${quoteHtml}${filesHtml}${textHtml}<time>${stamp}</time></div></div>`
      );
      if (replyBar) replyBar.hidden = true;
      if (log?.lastElementChild) {
        ensureBubbleMenus(log.lastElementChild);
        hydrateUiIcons(log.lastElementChild);
      }
      if (field) field.value = "";
      renderAttach();
      if (log) log.scrollTop = log.scrollHeight;
      const preview = list.querySelector(`.msg-item[data-thread="${thread?.getAttribute("data-thread")}"] .msg-item-preview`);
      const timeEl = list.querySelector(`.msg-item[data-thread="${thread?.getAttribute("data-thread")}"] time`);
      if (preview) preview.textContent = msgPreviewLabel(text, sent);
      if (timeEl) timeEl.textContent = stamp;
    });
  });
});

document.addEventListener("DOMContentLoaded", function accountTabs() {
  document.querySelectorAll(".account-tabs").forEach((nav) => {
    const tabs = [...nav.querySelectorAll(":scope > [data-tab]")];
    if (!tabs.length) return;
    const syncUrl = nav.hasAttribute("data-account-tabs");
    const names = tabs.map((tab) => tab.getAttribute("data-tab"));
    function show(name, push) {
      tabs.forEach((tab) => tab.classList.toggle("active", tab.getAttribute("data-tab") === name));
      names.forEach((id) => {
        const panel = document.getElementById("tab-" + id);
        if (panel) panel.hidden = id !== name;
      });
      if (syncUrl && push) {
        const url = new URL(location.href);
        url.searchParams.set("tab", name);
        history.replaceState({}, "", url.pathname + url.search + url.hash);
      }
    }
    const fromUrl = syncUrl ? new URLSearchParams(location.search).get("tab") : "";
    const initial = names.includes(fromUrl) ? fromUrl : names[0];
    show(initial, false);
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => show(btn.getAttribute("data-tab"), true));
    });
  });
});

document.addEventListener("DOMContentLoaded", function compactSectionTabs() {
  const roots = [...document.querySelectorAll(".account-tabs, .type-tabs")];
  if (!roots.length) return;

  function prepareItem(item) {
    if (item.dataset.tabPrepared === "1") return;
    item.dataset.tabPrepared = "1";
    const words = [];
    [...item.childNodes].forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) return;
      const text = node.textContent;
      if (!text || !text.trim()) return;
      const label = document.createElement("span");
      label.className = "tab-label";
      label.textContent = text;
      node.replaceWith(label);
      words.push(text.trim());
    });
    if (!item.querySelector("img, .ui-icon, svg, .tab-at")) {
      const initial = document.createElement("span");
      initial.className = "tab-initial";
      initial.setAttribute("aria-hidden", "true");
      initial.textContent = (words[0] || item.textContent || "?").charAt(0).toUpperCase();
      item.prepend(initial);
    }
    if (!item.getAttribute("aria-label")) {
      const name = item.textContent.replace(/\s+/g, " ").trim();
      if (name) item.setAttribute("aria-label", name);
    }
  }

  function fit(root) {
    root.classList.remove("is-icons-only");
    const items = [...root.querySelectorAll(":scope > button, :scope > a")];
    const prev = items.map((el) => {
      const state = { flex: el.style.flex, overflow: el.style.overflow, minWidth: el.style.minWidth };
      el.style.flex = "0 0 auto";
      el.style.overflow = "visible";
      el.style.minWidth = "auto";
      return state;
    });
    const styles = getComputedStyle(root);
    const gap = parseFloat(styles.columnGap || styles.gap) || 0;
    const needed = items.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0) + gap * Math.max(0, items.length - 1);
    items.forEach((el, index) => {
      el.style.flex = prev[index].flex;
      el.style.overflow = prev[index].overflow;
      el.style.minWidth = prev[index].minWidth;
    });
    if (needed > root.clientWidth + 1) root.classList.add("is-icons-only");
  }

  roots.forEach((root) => {
    root.querySelectorAll(":scope > button, :scope > a").forEach(prepareItem);
    const run = () => fit(root);
    run();
    requestAnimationFrame(run);
    if (window.ResizeObserver) new ResizeObserver(run).observe(root);
  });
  document.fonts?.ready?.then(() => roots.forEach(fit));
});

document.addEventListener("DOMContentLoaded", function helpDocs() {
  const root = document.querySelector("[data-help-docs]");
  if (!root) return;
  const buttons = [...root.querySelectorAll("[data-doc]")];
  const panels = [...root.querySelectorAll("[data-doc-panel]")];
  function show(id) {
    buttons.forEach((btn) => btn.classList.toggle("active", btn.getAttribute("data-doc") === id));
    panels.forEach((panel) => {
      panel.hidden = panel.getAttribute("data-doc-panel") !== id;
    });
  }
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => show(btn.getAttribute("data-doc")));
  });
  const fromUrl = new URLSearchParams(location.search).get("doc");
  const initial = buttons.some((btn) => btn.getAttribute("data-doc") === fromUrl)
    ? fromUrl
    : buttons[0]?.getAttribute("data-doc");
  if (initial) show(initial);
});

const READER_KEY = "foxtoria-reader";
const READER_PACKS = [
  { id: "fav", title: "Избранное" },
  { id: "later", title: "На потом" },
  { id: "autumn", title: "Осень 2026" },
];

function loadReaderLibrary() {
  let data = {};
  try {
    data = JSON.parse(localStorage.getItem(READER_KEY) || "{}") || {};
  } catch {
    data = {};
  }
  const packs = Array.isArray(data.packs) && data.packs.length
    ? data.packs.map((pack) => ({
        id: String(pack.id || ""),
        title: String(pack.title || "Сборник"),
        works: Array.isArray(pack.works) ? pack.works.map(String) : [],
      }))
    : READER_PACKS.map((pack) => ({ ...pack, works: [] }));
  return {
    follows: Array.isArray(data.follows) ? data.follows.map(String) : [],
    read: Array.isArray(data.read) ? data.read.map(String) : [],
    likes: Array.isArray(data.likes) ? data.likes.map(String) : [],
    packs,
  };
}

function saveReaderLibrary(data) {
  localStorage.setItem(READER_KEY, JSON.stringify(data));
}

function toggleReaderList(list, id, on) {
  const next = list.filter((item) => item !== id);
  if (on) next.push(id);
  return next;
}

document.addEventListener("DOMContentLoaded", function workPageControls() {
  document.querySelectorAll(".work-split-btn").forEach((wrap) => {
    const toggle = wrap.querySelector(".work-split-btn-toggle");
    const menu = wrap.querySelector(".work-split-menu");
    const main = wrap.querySelector(".work-split-btn-main");
    const icon = wrap.querySelector(".work-split-btn-main .work-btn-icon, .work-split-btn-main .ui-icon");
    const workId = wrap.getAttribute("data-work-id") || currentPage();
    if (!toggle || !menu) return;

    function close() {
      wrap.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      menu.hidden = true;
    }

    function paint() {
      const lib = loadReaderLibrary();
      const followed = lib.follows.includes(workId);
      const read = lib.read.includes(workId);
      wrap.classList.toggle("is-follow", followed);
      if (main) {
        main.setAttribute("aria-pressed", followed ? "true" : "false");
        main.setAttribute("aria-label", followed ? "Отписаться" : "Подписаться");
      }
      if (icon) setUiIcon(icon, followed ? "assets/svg/bookmark.svg" : "assets/svg/bookmark2.svg");
      const readBtn = menu.querySelector("[data-work-read]");
      if (readBtn) {
        readBtn.classList.toggle("is-on", read);
        readBtn.setAttribute("aria-pressed", read ? "true" : "false");
      }
    }

    function packSlug(title) {
      const base = String(title || "")
        .trim()
        .toLowerCase()
        .replace(/ё/g, "е")
        .replace(/[^a-zа-я0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "");
      return `${base || "pack"}-${Date.now().toString(36)}`;
    }

    function openPackDialog() {
      close();
      let dialog = document.querySelector(".work-dialog");
      if (!dialog) {
        dialog = document.createElement("div");
        dialog.className = "work-dialog";
        dialog.hidden = true;
        document.body.append(dialog);
      }

      function hide() {
        dialog.hidden = true;
      }

      function packListHTML(packs) {
        if (!packs.length) return `<p class="work-pack-empty">Пока нет личных сборников.</p>`;
        return `<ul class="work-pack-list">${packs
          .map((pack) => {
            const id = String(pack.id).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
            const title = String(pack.title).replaceAll("&", "&amp;").replaceAll("<", "&lt;");
            const checked = pack.works.includes(workId) ? " checked" : "";
            return `<li><label><input type="checkbox" value="${id}"${checked}> ${title}</label></li>`;
          })
          .join("")}</ul>`;
      }

      function fill() {
        const lib = loadReaderLibrary();
        const packs = lib.packs.filter((pack) => pack.id);
        dialog.innerHTML = `
          <div class="work-dialog-card" role="dialog" aria-modal="true" aria-labelledby="work-pack-title">
            <div class="work-dialog-head">
              <h2 id="work-pack-title">Добавить в сборник</h2>
              <button type="button" class="btn btn-outline work-pack-new" data-pack-new>+ Новый</button>
            </div>
            <form class="work-pack-create" data-pack-create hidden>
              <input type="text" name="title" placeholder="Название сборника" maxlength="80" required>
              <button type="submit" class="btn btn-primary">Создать</button>
            </form>
            ${packListHTML(packs)}
            <div class="work-dialog-actions">
              <button type="button" class="btn btn-outline" data-pack-cancel>Отмена</button>
              <button type="button" class="btn btn-primary" data-pack-save ${packs.length ? "" : "disabled"}>Готово</button>
            </div>
          </div>`;
        dialog.querySelector("[data-pack-cancel]")?.addEventListener("click", hide);
        dialog.querySelector("[data-pack-new]")?.addEventListener("click", () => {
          const form = dialog.querySelector("[data-pack-create]");
          if (!form) return;
          form.hidden = !form.hidden;
          if (!form.hidden) form.querySelector("input")?.focus();
        });
        dialog.querySelector("[data-pack-create]")?.addEventListener("submit", (event) => {
          event.preventDefault();
          const title = String(new FormData(event.target).get("title") || "").trim();
          if (!title) return;
          const next = loadReaderLibrary();
          next.packs = [{ id: packSlug(title), title, works: [workId] }, ...next.packs];
          saveReaderLibrary(next);
          fill();
        });
        dialog.querySelector("[data-pack-save]")?.addEventListener("click", () => {
          const chosen = new Set(
            [...dialog.querySelectorAll(".work-pack-list input:checked")].map((input) => input.value)
          );
          const next = loadReaderLibrary();
          next.packs = next.packs.map((pack) => ({
            ...pack,
            works: toggleReaderList(pack.works, workId, chosen.has(pack.id)),
          }));
          saveReaderLibrary(next);
          hide();
        });
      }

      fill();
      dialog.hidden = false;
      if (!dialog.dataset.backdropBound) {
        dialog.dataset.backdropBound = "1";
        dialog.addEventListener("click", (event) => {
          if (event.target === dialog) hide();
        });
      }
    }

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = menu.hidden;
      document.querySelectorAll(".work-split-btn.open").forEach((other) => {
        if (other === wrap) return;
        other.classList.remove("open");
        other.querySelector(".work-split-btn-toggle")?.setAttribute("aria-expanded", "false");
        const otherMenu = other.querySelector(".work-split-menu");
        if (otherMenu) otherMenu.hidden = true;
      });
      wrap.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      menu.hidden = !open;
    });

    main?.addEventListener("click", (event) => {
      event.stopPropagation();
      close();
      const lib = loadReaderLibrary();
      const on = !lib.follows.includes(workId);
      lib.follows = toggleReaderList(lib.follows, workId, on);
      saveReaderLibrary(lib);
      paint();
    });

    menu.querySelector("[data-work-pack]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      openPackDialog();
    });

    menu.querySelector("[data-work-read]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      const lib = loadReaderLibrary();
      const on = !lib.read.includes(workId);
      lib.read = toggleReaderList(lib.read, workId, on);
      saveReaderLibrary(lib);
      paint();
      close();
    });

    document.addEventListener("click", (event) => {
      if (!wrap.contains(event.target) && !event.target.closest(".work-dialog")) close();
    });

    paint();
  });

  const likeBtn = document.querySelector("[data-work-like]");
  if (likeBtn) {
    const icon = likeBtn.querySelector(".work-like-icon");
    const key = "foxtoria-work-like:" + location.pathname;
    const workId =
      likeBtn.getAttribute("data-work-id") ||
      likeBtn.closest("[data-work-id]")?.getAttribute("data-work-id") ||
      document.querySelector("[data-work-id]")?.getAttribute("data-work-id");

    function setLiked(liked) {
      likeBtn.classList.toggle("is-liked", liked);
      likeBtn.setAttribute("aria-pressed", liked ? "true" : "false");
      likeBtn.setAttribute("aria-label", liked ? "Убрать лайк" : "Нравится");
      if (icon) setUiIcon(icon, liked ? "assets/svg/like.svg" : "assets/svg/heart.svg");
      if (workId) {
        const lib = loadReaderLibrary();
        lib.likes = toggleReaderList(lib.likes, workId, liked);
        saveReaderLibrary(lib);
      }
    }

    const stored = workId ? loadReaderLibrary().likes.includes(workId) : localStorage.getItem(key) === "1";
    setLiked(stored || localStorage.getItem(key) === "1");
    likeBtn.addEventListener("click", () => {
      const liked = !likeBtn.classList.contains("is-liked");
      setLiked(liked);
      localStorage.setItem(key, liked ? "1" : "0");
    });
  }
});

document.addEventListener("DOMContentLoaded", function changesPage() {
  const tabs = document.getElementById("change-tabs");
  const feed = document.querySelector(".changes-feed");
  if (!tabs || !feed) return;
  const cards = [...feed.querySelectorAll(".change-card")];
  function show(name) {
    tabs.querySelectorAll("[data-change-tab]").forEach((tab) => {
      tab.classList.toggle("active", tab.getAttribute("data-change-tab") === name);
    });
    cards.forEach((card) => {
      const kind = card.getAttribute("data-kind");
      card.hidden = name !== "all" && kind !== name;
    });
  }
  tabs.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-change-tab]");
    if (!btn) return;
    show(btn.getAttribute("data-change-tab"));
  });
});

document.addEventListener("click", function storyNavFold(event) {
  const fold = event.target.closest(".story-nav-fold:not(.is-empty)");
  if (!fold || fold.closest("#toc")) return;
  const node = fold.closest(".story-nav-node");
  if (!node) return;
  event.preventDefault();
  node.classList.toggle("is-collapsed");
  const open = !node.classList.contains("is-collapsed");
  fold.setAttribute("aria-expanded", open ? "true" : "false");
  fold.setAttribute("aria-label", open ? "Свернуть уровень" : "Развернуть уровень");
});

document.addEventListener("DOMContentLoaded", function bindChapterToTop() {
  const page = document.querySelector(".work-page, .linear-read-page");
  if (!page || document.querySelector(".page-to-top")) return;
  const wrap = document.createElement("div");
  wrap.className = "page-to-top-wrap";
  wrap.innerHTML = `<button type="button" class="page-to-top" aria-label="Наверх">
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 9.8 8 5.5l4.5 4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    Наверх
  </button>`;
  const footer = document.querySelector(".page-footer");
  if (footer) footer.before(wrap);
  else document.body.appendChild(wrap);
  wrap.querySelector(".page-to-top").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

const FOX_LIBRARY_KEY = "foxtoria-work-library";

window.FoxLibrary = {
  KEY: FOX_LIBRARY_KEY,
  defaults() {
    return {
      characters: [
        { id: "alex", name: "Алекс", age: "28 лет", bio: "Молчит, пока не спросят. Боится кафе на углу. Не носит часов.", traits: "сдержанный, помнит даты, плохо врёт", pinned: "0" },
        { id: "masha", name: "Маша", age: "26 лет", bio: "Пишет письма, которые не отправляет. Рыжие волосы прячет под капюшон.", traits: "резкая, добрая в деталях", pinned: "0" },
        { id: "nikita", name: "Никита", age: "31 год", bio: "Знает адрес, которого нет на карте.", traits: "наблюдательный", pinned: "0" },
      ],
      notes: [
        { id: "n1", title: "Город на скале", text: "Город на скале, где всегда туман. Улицы помнят шаги, которых ещё не было.", created: "2024-05-12" },
        { id: "n2", title: "Фраза для кафе", text: "«Иногда путь выбирает нас». Не ставить в пролог — беречь для развилки.", created: "2024-05-18" },
        { id: "n3", title: "Кулон", text: "Старинный кулон с трещиной. Маша носит его под пальто.", created: "2024-06-03" },
      ],
    };
  },
  load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(FOX_LIBRARY_KEY) || "");
      if (!parsed || !Array.isArray(parsed.characters) || !Array.isArray(parsed.notes)) {
        return window.FoxLibrary.defaults();
      }
      return parsed;
    } catch {
      return window.FoxLibrary.defaults();
    }
  },
  save(lib) {
    localStorage.setItem(
      FOX_LIBRARY_KEY,
      JSON.stringify({
        characters: Array.isArray(lib?.characters) ? lib.characters : [],
        notes: Array.isArray(lib?.notes) ? lib.notes : [],
      })
    );
  },
};

const FOX_WORK_STATUS_KEY = "foxtoria-work-status";

window.FoxWorkStatus = {
  KEY: FOX_WORK_STATUS_KEY,
  labels: {
    draft: "Черновик",
    in_progress: "В процессе",
    completed: "Завершена",
  },
  loadMap() {
    try {
      const raw = localStorage.getItem(FOX_WORK_STATUS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      if (typeof parsed === "string") return { letters: parsed };
      return {};
    } catch {
      return {};
    }
  },
  get(id) {
    const map = window.FoxWorkStatus.loadMap();
    const key = id || "letters";
    return map[key] || "";
  },
  set(id, status) {
    const map = window.FoxWorkStatus.loadMap();
    map[id || "letters"] = status;
    localStorage.setItem(FOX_WORK_STATUS_KEY, JSON.stringify(map));
  },
  fromChapters(chapters) {
    const list = Array.isArray(chapters) ? chapters : [];
    if (list.some((ch) => ch.isEnding && ch.status === "published")) return "completed";
    if (list.some((ch) => ch.status === "published")) return "in_progress";
    return "draft";
  },
};

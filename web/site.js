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

function currentPage() {
  const file = location.pathname.split("/").pop();
  return file && file !== "" ? file : "index.html";
}

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
  return qs ? `search.html?${qs}` : "search.html";
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
    <form class="search-bar" action="search.html" role="search">
      <img src="assets/deco/lupa.svg" alt="">
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
          <div class="header-alert-dd" id="notif-feed" hidden>
            <p class="header-alert-kicker">Оповещения</p>
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
            </a>
          </div>
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
            <a href="feed.html"${ddOn("feed.html")}>Моя лента</a>
            <a href="blog.html"${ddOn("blog.html")}>Мой блог</a>
            <a href="profile.html"${ddOn("profile.html")}>Мой профиль</a>
            <a href="replies.html"${ddOn("replies.html")}>Комментарии</a>
            <span class="dd-sep"></span>
            <a href="studio.html"${ddOn("studio.html")}>Новая история</a>
            <a href="author-home.html"${ddOn("author-home.html")}>Мои истории</a>
            <a href="reviews.html"${ddOn("reviews.html")}>Отзывы</a>
            <a href="changes.html"${ddOn("changes.html")}>Изменения</a>
            <span class="dd-sep"></span>
            <a href="library.html?tab=likes"${ddOn("library.html?tab=likes")}>Понравившиеся</a>
            <a href="library.html?tab=packs"${ddOn("library.html?tab=packs")}>Сборники</a>
            <a href="library.html?tab=authors"${ddOn("library.html?tab=authors")}>Любимые авторы</a>
            <a href="library.html?tab=read"${ddOn("library.html?tab=read")}>Прочитанные работы</a>
          </div>
          <div class="account-dd-foot">
            <a href="support.html"${ddOn("support.html")}>Написать в поддержку</a>
            <a href="settings.html"${ddOn("settings.html")}>Настройки</a>
            <button type="button" class="dd-signout" data-signout>Выйти</button>
          </div>
        </div>
      </div>
    </div>`;
}

document.addEventListener("DOMContentLoaded", function mountHeader() {
  const header = document.querySelector("body > header.header");
  if (!header) return;
  header.innerHTML = headerMarkup();
  syncAuthChrome();
  document.querySelectorAll(".page-corner").forEach((el) => el.remove());

  const footer = document.querySelector(".page-footer");
  if (footer && !footer.querySelector(".footer-inner")) {
    const inner = document.createElement("div");
    inner.className = "footer-inner";
    inner.innerHTML = `
      <div class="footer-links">
        <nav class="footer-col" aria-label="Приложение">
          <span>Приложение</span>
          <a href="#">App Store</a>
          <a href="#">Google Play</a>
        </nav>
        <nav class="footer-col" aria-label="Контакты">
          <span>Контакты</span>
          <a href="#">Почта</a>
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
});

document.addEventListener("DOMContentLoaded", function bindCollapsibleSide() {
  const layout = document.querySelector("[data-side-layout]");
  const panel = document.querySelector("[data-side-panel]");
  const btn = document.querySelector("[data-side-toggle]");
  if (!layout || !panel || !btn) return;

  const mq = window.matchMedia("(max-width: 860px)");
  let backdrop = layout.querySelector(".side-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "side-backdrop";
    backdrop.setAttribute("aria-label", "Закрыть меню");
    backdrop.hidden = true;
    layout.prepend(backdrop);
  }

  function setOpen(open) {
    const mobile = mq.matches;
    const show = mobile && open;
    layout.classList.toggle("is-side-open", show);
    btn.setAttribute("aria-expanded", show ? "true" : "false");
    backdrop.hidden = !show;
  }

  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(!layout.classList.contains("is-side-open"));
  });
  backdrop.addEventListener("click", () => setOpen(false));
  panel.addEventListener("click", (event) => {
    if (!mq.matches) return;
    if (event.target.closest("[data-view], [data-select], .studio-item")) {
      setOpen(false);
    }
  });
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
  const title = document.querySelector(".profile-hero h1");
  const meta = document.querySelector(".profile-meta");
  if (title) title.textContent = display;
  if (meta) meta.textContent = `@${handle}`;
  const bio = document.querySelector(".profile-bio");
  if (bio) bio.textContent = "Публичный профиль появится вместе с аккаунтами.";
  document.title = `${display} — профиль — FoxStoria`;
  const subnav = document.querySelector(".account-subnav");
  if (subnav) subnav.hidden = true;
  document.querySelector('.sidebar-nav a[href="profile.html"]')?.classList.remove("active");
});

document.addEventListener("DOMContentLoaded", function messagesPage() {
  if (currentPage() !== "messages.html") return;
  const list = document.querySelector(".msg-list");
  if (!list) return;
  list.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    const item = event.target.closest(".msg-item");
    if (!item) return;
    const id = item.getAttribute("data-thread");
    list.querySelectorAll(".msg-item").forEach((el) => el.classList.toggle("active", el === item));
    document.querySelectorAll(".msg-thread").forEach((pane) => {
      pane.hidden = pane.getAttribute("data-thread") !== id;
    });
  });
});

document.addEventListener("DOMContentLoaded", function accountTabs() {
  document.querySelectorAll(".account-tabs").forEach((nav) => {
    const tabs = [...nav.querySelectorAll("[data-tab]")];
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

document.addEventListener("DOMContentLoaded", function supportForm() {
  const form = document.querySelector("[data-support-form]");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    form.hidden = true;
    const done = document.querySelector("[data-support-done]");
    if (done) done.hidden = false;
  });
});

document.addEventListener("DOMContentLoaded", function workPageControls() {
  document.querySelectorAll(".work-split-btn").forEach((wrap) => {
    const toggle = wrap.querySelector(".work-split-btn-toggle");
    const menu = wrap.querySelector(".work-split-menu");
    if (!toggle || !menu) return;

    function close() {
      wrap.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      menu.hidden = true;
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

    document.addEventListener("click", (event) => {
      if (!wrap.contains(event.target)) close();
    });
  });

  const likeBtn = document.querySelector("[data-work-like]");
  if (likeBtn) {
    const icon = likeBtn.querySelector(".work-like-icon");
    const key = "foxtoria-work-like:" + location.pathname;

    function setLiked(liked) {
      likeBtn.classList.toggle("is-liked", liked);
      likeBtn.setAttribute("aria-pressed", liked ? "true" : "false");
      likeBtn.setAttribute("aria-label", liked ? "Убрать лайк" : "Нравится");
      if (icon) icon.src = liked ? "assets/svg/like.svg" : "assets/svg/heart.svg";
    }

    setLiked(localStorage.getItem(key) === "1");
    likeBtn.addEventListener("click", () => {
      setLiked(!likeBtn.classList.contains("is-liked"));
      localStorage.setItem(key, likeBtn.classList.contains("is-liked") ? "1" : "0");
    });
  }
});

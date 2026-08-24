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

function headerMarkup() {
  const page = currentPage();
  const on = (href) => (page === href ? " active" : "");
  return `
    <div class="header-lead">
      <a href="index.html" class="logo">
        <img src="assets/deco/fox.svg" alt="">
        <span>FoxStoria</span>
      </a>
      <div class="header-mid">
        <nav class="nav-main">
          <a href="stories-interactive.html"${on("stories-interactive.html")}>Интерактивные</a>
          <a href="stories-linear.html"${on("stories-linear.html")}>Линейные</a>
          <a href="authors.html"${on("authors.html")}>Авторы</a>
          <a href="collections.html"${on("collections.html")}>Сборники</a>
          <a href="news.html"${on("news.html")}>Новости</a>
        </nav>
        <form class="search-bar" action="search.html" role="search">
          <img src="assets/deco/lupa.svg" alt="">
          <input type="text" name="q" placeholder="Найти работу, автора или тэг..." autocomplete="off">
        </form>
      </div>
    </div>
    <div class="header-actions">
      <button type="button" class="theme-btn" id="theme-toggle" aria-label="Переключить тему">
        <img class="theme-moon" src="assets/deco/moon.svg" alt="">
        <img class="theme-day" src="assets/deco/день.svg" alt="">
      </button>
      <div class="header-inbox" id="header-inbox" hidden>
        <div class="header-alert">
          <button type="button" class="header-alert-btn" id="notif-toggle" aria-label="Оповещения" aria-expanded="false">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6.2 9.1c0-3.3 2.6-5.9 5.8-5.9s5.8 2.6 5.8 5.9v1.7c0 1.4.5 2.7 1.3 3.7l.6.7c.5.6.1 1.6-.7 1.6H5c-.8 0-1.2-1-.7-1.6l.6-.7c.8-1 1.3-2.3 1.3-3.7V9.1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
              <path d="M10 18.4a2.1 2.1 0 0 0 4 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              <path d="M12 18.8v1.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
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
            <a href="library.html">
              <strong>Кабинет читателя</strong>
              <span>Работа из подписок вышла из черновика</span>
            </a>
            <a href="author-home.html">
              <strong>Кабинет автора</strong>
              <span>Новый отзыв к вашей истории</span>
            </a>
          </div>
        </div>
        <a class="header-alert-btn" id="mail-toggle" href="messages.html" aria-label="Личные сообщения">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3.4" y="5.8" width="17.2" height="12.4" rx="2.2" stroke="currentColor" stroke-width="1.6"/>
            <path d="M4.2 7.4 12 13.1l7.8-5.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="header-alert-dot" data-mail-dot hidden></span>
        </a>
      </div>
      <div class="header-auth" id="header-guest">
        <a href="profile.html" class="btn btn-ghost" data-signin>Войти</a>
        <a href="profile.html" class="btn btn-primary" data-signin>Регистрация</a>
      </div>
      <div class="account-menu" id="account-menu" hidden>
        <button type="button" class="account-menu-btn" aria-expanded="false" aria-label="Мой профиль">
          <img src="assets/deco/fox.svg" alt="">
        </button>
        <div class="account-dd" hidden>
          <a href="index.html">Главное</a>
          <a href="stories-interactive.html">Интерактивные</a>
          <a href="stories-linear.html">Линейные</a>
          <a href="authors.html">Авторы</a>
          <a href="collections.html">Сборники</a>
          <a href="news.html">Новости</a>
          <a href="news.html?compose=1" data-owner-only hidden>Новый пост</a>
          <span class="dd-sep"></span>
          <a href="profile.html">Мой профиль</a>
          <a href="messages.html">Сообщения</a>
          <a href="author-home.html">Кабинет автора</a>
          <a href="library.html">Кабинет читателя</a>
          <a href="settings.html">Настройки</a>
          <button type="button" class="dd-signout" data-signout>Выйти</button>
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

  function closeAccount() {
    if (!dd) return;
    dd.hidden = true;
    menu?.classList.remove("open");
    btn?.setAttribute("aria-expanded", "false");
  }

  function closeNotif() {
    if (!notifFeed) return;
    notifFeed.hidden = true;
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
    });
  }
  if (notifBtn && notifFeed) {
    notifBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      closeAccount();
      const open = notifFeed.hidden;
      notifFeed.hidden = !open;
      notifBtn.setAttribute("aria-expanded", open ? "true" : "false");
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
  const tabs = document.querySelectorAll(".account-tabs [data-tab]");
  if (!tabs.length) return;
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((other) => other.classList.toggle("active", other === btn));
      [...tabs].forEach((tab) => {
        const name = tab.getAttribute("data-tab");
        const panel = document.getElementById("tab-" + name);
        if (panel) panel.hidden = name !== btn.getAttribute("data-tab");
      });
    });
  });
});

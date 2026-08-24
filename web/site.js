(function restoreTheme() {
  const stored = localStorage.getItem("foxtoria-theme");
  if (stored === "dark" || stored === "light") {
    document.documentElement.setAttribute("data-theme", stored);
  }
})();

function isSignedIn() {
  return localStorage.getItem("foxtoria-signed-in") === "1";
}

function currentPage() {
  const file = location.pathname.split("/").pop();
  return file && file !== "" ? file : "index.html";
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
  if (btn && dd) {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = dd.hidden;
      dd.hidden = !open;
      menu.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  document.addEventListener("click", () => {
    if (!dd) return;
    dd.hidden = true;
    menu?.classList.remove("open");
    btn?.setAttribute("aria-expanded", "false");
  });
});

function syncAuthChrome() {
  const guest = document.getElementById("header-guest");
  const menu = document.getElementById("account-menu");
  const welcome = document.getElementById("welcome-card");
  const signed = isSignedIn();
  if (guest) guest.hidden = signed;
  if (menu) menu.hidden = !signed;
  if (welcome) welcome.hidden = signed;
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

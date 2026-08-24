(function restoreTheme() {
  const stored = localStorage.getItem("foxtoria-theme");
  if (stored === "dark" || stored === "light") {
    document.documentElement.setAttribute("data-theme", stored);
  }
})();

document.addEventListener("DOMContentLoaded", function mountAccountMenu() {
  const actions = document.querySelector(".header-actions") || document.querySelector(".editor-header");
  if (!actions || document.getElementById("account-menu")) return;

  const wrap = document.createElement("div");
  wrap.className = "account-menu";
  wrap.id = "account-menu";
  wrap.innerHTML = `
    <button type="button" class="icon-btn account-menu-btn" aria-expanded="false" aria-label="Профиль">
      <img class="ink" src="assets/brand/profile.png" alt="">
    </button>
    <div class="account-dd" hidden>
      <p class="dd-kicker">Аккаунт</p>
      <a href="profile.html">Профиль</a>
      <a href="messages.html">Сообщения</a>
      <a href="author-home.html">Кабинет автора</a>
      <a href="library.html">Кабинет читателя</a>
      <a href="settings.html">Настройки</a>
    </div>`;
  actions.appendChild(wrap);

  const btn = wrap.querySelector(".account-menu-btn");
  const dd = wrap.querySelector(".account-dd");
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = dd.hidden;
    dd.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.addEventListener("click", () => {
    dd.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  });
});

document.addEventListener("click", (event) => {
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

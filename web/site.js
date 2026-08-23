const ICON_SPRITE = `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden">
  <symbol id="i-fox-head" viewBox="0 0 32 32"><path fill="currentColor" d="M6 11c0-4 3-8 6-9 1 2 2.5 4 4 5 1.5-1 3-3 4-5 3 1 6 5 6 9 0 8-4.5 16-10 16S6 19 6 11z"/><circle cx="12.5" cy="15" r="1.4" fill="#F8F7F4"/><circle cx="19.5" cy="15" r="1.4" fill="#F8F7F4"/><path d="M14 19.5c1.3 1.2 2.7 1.2 4 0" fill="none" stroke="#F8F7F4" stroke-width="1.2" stroke-linecap="round"/></symbol>
  <symbol id="i-fox-sleep" viewBox="0 0 48 32"><path fill="currentColor" d="M8 22c2-10 12-16 24-14 6 1 12 6 12 12 0 6-8 10-18 10H16C10 30 7 27 8 22z"/><path fill="currentColor" d="M6 16c-2-6 1-12 6-13-1 4 0 8 3 11H8z"/><path d="M22 18c2 0 3 .5 4 1.5" fill="none" stroke="#F8F7F4" stroke-width="1.3" stroke-linecap="round"/><ellipse cx="38" cy="18" rx="3" ry="2" fill="#B94C32"/></symbol>
  <symbol id="i-fox-tail" viewBox="0 0 40 24"><path fill="currentColor" d="M2 18c6-2 10-8 12-14 4 6 10 10 18 10 6 0 8 2 8 4-8 2-16 0-22-4-4 4-10 6-16 4z"/></symbol>
  <symbol id="i-paw" viewBox="0 0 24 24"><circle cx="7" cy="7" r="2.2" fill="currentColor"/><circle cx="12" cy="5" r="2.3" fill="currentColor"/><circle cx="17" cy="7" r="2.2" fill="currentColor"/><ellipse cx="12" cy="16" rx="5" ry="4.2" fill="currentColor"/></symbol>
  <symbol id="i-spark" viewBox="0 0 24 24"><path fill="currentColor" d="M12 1.5l1.6 8.9L22.5 12l-8.9 1.6L12 22.5l-1.6-8.9L1.5 12l8.9-1.6z"/></symbol>
  <symbol id="i-moon" viewBox="0 0 24 24"><path fill="currentColor" d="M14 3a9 9 0 1 0 7 13A8 8 0 0 1 14 3z"/></symbol>
  <symbol id="i-leaf" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" d="M12 20c0-8 6-14 10-16-2 8-6 12-10 16zM12 20C12 12 6 6 2 4c2 8 6 12 10 16zM12 20V10"/></symbol>
  <symbol id="i-book" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M4 5.5C6 4.5 9 5 12 6.5 15 5 18 4.5 20 5.5V19c-2-1-5-.5-8 1-3-1.5-6-2-8-1V5.5zM12 6.5V20"/></symbol>
  <symbol id="i-bookmark" viewBox="0 0 16 24"><path fill="currentColor" d="M2 1h12v22l-6-5-6 5V1z"/></symbol>
  <symbol id="i-heart" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M12 20S3 13.5 3 8.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9 1.5C21 13.5 12 20 12 20z"/></symbol>
  <symbol id="i-quill" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M4 20c6-6 12-16 16-16-1 6-8 12-16 16zM8 16l3-3"/></symbol>
  <symbol id="i-share" viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="6" cy="12" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="19" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="none" stroke="currentColor" stroke-width="1.6" d="M8 11l8-5M8 13l8 5"/></symbol>
</svg>`;

(function injectIcons() {
  if (document.getElementById("icon-sprite")) return;
  const wrap = document.createElement("div");
  wrap.id = "icon-sprite";
  wrap.innerHTML = ICON_SPRITE;
  document.documentElement.prepend(wrap);
})();

(function ensureStyles() {
  if (document.querySelector('link[href="styles.css"], link[href$="/styles.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "styles.css";
  document.head.appendChild(link);
})();

(function ensureAccountStyles() {
  if (document.querySelector('link[href="account.css"], link[href$="/account.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "account.css";
  document.head.appendChild(link);
})();

(function ensureOrnamentStyles() {
  if (document.querySelector('link[href="ornaments.css"], link[href$="/ornaments.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "ornaments.css";
  document.head.appendChild(link);
})();

document.addEventListener("DOMContentLoaded", function mountAccountMenu() {
  const actions = document.querySelector(".header-actions") || document.querySelector(".editor-header");
  if (!actions || document.getElementById("account-menu")) return;

  actions.querySelectorAll("a.btn-ghost, a.btn-primary").forEach((el) => {
    const text = el.textContent.replace(/\s+/g, " ").trim();
    if (text === "Войти" || text === "Регистрация") el.hidden = true;
  });

  const wrap = document.createElement("div");
  wrap.className = "account-menu";
  wrap.id = "account-menu";
  wrap.innerHTML = `
    <button type="button" class="account-menu-btn" aria-expanded="false" aria-label="Профиль">
      <span class="header-avatar" aria-hidden="true"></span>
    </button>
    <div class="account-dd">
      <div class="dd-kicker">Аккаунт</div>
      <a href="profile.html">Профиль</a>
      <a href="messages.html">Сообщения</a>
      <a href="author-home.html">Кабинет автора</a>
      <a href="library.html">Кабинет читателя</a>
      <a href="settings.html">Настройки</a>
    </div>`;
  actions.appendChild(wrap);

  const btn = wrap.querySelector(".account-menu-btn");
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = wrap.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.addEventListener("click", () => {
    wrap.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  });
});

document.addEventListener("click", (event) => {
  const toggle = event.target.closest("#theme-toggle");
  if (!toggle) return;
  const html = document.documentElement;
  const isDark = html.getAttribute("data-theme") === "dark";
  html.setAttribute("data-theme", isDark ? "light" : "dark");
});

document.addEventListener("DOMContentLoaded", function decorateOrnaments() {
  if (document.getElementById("ornament-layer")) return;
  const layer = document.createElement("div");
  layer.id = "ornament-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = `
    <img class="orn-corner-tl" src="assets/ornaments/frame-moon-corner.svg" alt="">
    <img class="orn-moon-tr" src="assets/ornaments/moon-stars.svg" alt="">
    <img class="orn-star-tr" src="assets/ornaments/09_star_orange.svg" alt="">
    <img class="orn-spark-bl" src="assets/ornaments/14_sparkle_cluster.svg" alt="">
    <img class="orn-tail-br" src="assets/ornaments/01_fox_tailmark.svg" alt="">
    <img class="orn-leaf-ml" src="assets/ornaments/15_leaves_orange.svg" alt="">`;
  document.body.appendChild(layer);

  document.querySelectorAll(".section-header h2").forEach((heading, index) => {
    if (heading.parentElement.querySelector(".orn-section")) return;
    const img = document.createElement("img");
    img.className = "orn-ico orn-section";
    img.alt = "";
    img.src = index % 2 === 0
      ? "assets/ornaments/09_star_orange.svg"
      : "assets/ornaments/38_feather.svg";
    heading.prepend(img);
  });

  document.querySelectorAll(".divider-tail").forEach((el) => {
    if (el.nextElementSibling && el.nextElementSibling.classList.contains("orn-vine")) return;
    const vine = document.createElement("img");
    vine.className = "orn-vine";
    vine.alt = "";
    vine.src = "assets/ornaments/36_botanical_vine.svg";
    vine.style.cssText = "display:block;width:min(420px,86%);height:36px;margin:0 auto 24px;object-fit:contain;opacity:0.7";
    el.after(vine);
  });

  document.querySelectorAll(".circle-btn[aria-label='Ещё'], button.circle-btn").forEach((btn) => {
    if (btn.id === "theme-toggle") return;
    if (btn.textContent.trim() !== "⋯") return;
    btn.innerHTML = '<img class="orn-ico" src="assets/ornaments/03_more.svg" alt="">';
  });
});

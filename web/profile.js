(function profilePage() {
  const STORE = "foxtoria-profile";
  const DEFAULTS = {
    bio: "Пишу ветвящиеся новеллы о памяти и выборе. Ниже — тестовые работы с разными направленностями, рейтингами и фандомами для проверки макетов.",
    links: [
      { title: "Telegram", url: "https://t.me/foxcavemeit" },
      { title: "VK", url: "https://vk.com" },
    ],
  };

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || "");
      if (!raw || typeof raw !== "object") return { ...DEFAULTS };
      return {
        bio: String(raw.bio || DEFAULTS.bio),
        links: Array.isArray(raw.links) && raw.links.length ? raw.links : DEFAULTS.links.map((item) => ({ ...item })),
      };
    } catch {
      return { ...DEFAULTS, links: DEFAULTS.links.map((item) => ({ ...item })) };
    }
  }

  function save(value) {
    localStorage.setItem(STORE, JSON.stringify(value));
  }

  function isPublicView() {
    const params = new URLSearchParams(location.search);
    return Boolean((params.get("u") || "").trim() || (params.get("n") || "").trim());
  }

  function isOwner() {
    return isSignedIn() && !isPublicView();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function safeUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "";
      return url.href;
    } catch {
      return "";
    }
  }

  function renderLinks(links) {
    const box = document.getElementById("profile-links");
    if (!box) return;
    const items = (links || []).filter((item) => item.title && safeUrl(item.url));
    box.innerHTML = items
      .map(
        (item) =>
          `<a href="${escapeHtml(safeUrl(item.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>`
      )
      .join("");
    box.hidden = !items.length;
  }

  function renderLinkRows(links) {
    const box = document.getElementById("profile-link-rows");
    if (!box) return;
    const rows = links.length ? links : [{ title: "", url: "" }];
    box.innerHTML = rows
      .map(
        (item, index) => `
        <div class="profile-link-row" data-index="${index}">
          <input type="text" data-link-title placeholder="Название" value="${escapeHtml(item.title || "")}">
          <input type="url" data-link-url placeholder="https://" value="${escapeHtml(item.url || "")}">
          <button type="button" class="btn-icon-text" data-remove-link aria-label="Удалить ссылку">×</button>
        </div>`
      )
      .join("");
  }

  function collectLinkRows(keepEmpty = false) {
    const rows = [...document.querySelectorAll(".profile-link-row")].map((row) => ({
      title: row.querySelector("[data-link-title]")?.value.trim() || "",
      url: row.querySelector("[data-link-url]")?.value.trim() || "",
    }));
    if (keepEmpty) return rows.length ? rows : [{ title: "", url: "" }];
    return rows
      .filter((item) => item.title && safeUrl(item.url))
      .map((item) => ({ title: item.title, url: safeUrl(item.url) }));
  }

  function syncChrome() {
    const owner = isOwner();
    document.querySelectorAll("[data-profile-owner]").forEach((el) => {
      el.hidden = !owner;
    });
    document.querySelectorAll("[data-profile-visitor]").forEach((el) => {
      el.hidden = owner;
    });
    if (!owner) {
      const edit = document.getElementById("profile-edit");
      if (edit) edit.hidden = true;
    }
  }

  function applyProfile(data) {
    if (isPublicView()) return;
    const bio = document.querySelector(".profile-bio");
    if (bio) bio.textContent = data.bio;
    renderLinks(data.links);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (currentPage() !== "profile.html") return;
    syncChrome();
    applyProfile(load());

    const edit = document.getElementById("profile-edit");
    const bioInput = document.getElementById("profile-bio-input");

    document.getElementById("profile-edit-btn")?.addEventListener("click", () => {
      if (!edit) return;
      const current = load();
      if (bioInput) bioInput.value = current.bio;
      renderLinkRows(current.links);
      edit.hidden = false;
    });

    document.getElementById("profile-edit-cancel")?.addEventListener("click", () => {
      if (edit) edit.hidden = true;
    });

    document.getElementById("profile-add-link")?.addEventListener("click", () => {
      const rows = collectLinkRows(true);
      rows.push({ title: "", url: "" });
      renderLinkRows(rows);
      const last = document.querySelector(".profile-link-row:last-child [data-link-title]");
      last?.focus();
    });

    document.getElementById("profile-link-rows")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-remove-link]");
      if (!btn) return;
      btn.closest(".profile-link-row")?.remove();
      if (!document.querySelector(".profile-link-row")) renderLinkRows([{ title: "", url: "" }]);
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-signin], [data-signout]")) queueMicrotask(syncChrome);
    });

    document.getElementById("profile-save")?.addEventListener("click", () => {
      const next = {
        bio: bioInput?.value.trim() || DEFAULTS.bio,
        links: collectLinkRows(),
      };
      save(next);
      applyProfile(next);
      if (edit) edit.hidden = true;
    });
  });
})();

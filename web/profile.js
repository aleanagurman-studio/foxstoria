(function profilePage() {
  const STORE = "foxtoria-profile";
  const DEFAULTS = {
    name: "Лунный странник",
    handle: "moonwander",
    bio: "Пишу ветвящиеся новеллы о памяти и выборе. Ниже — тестовые работы с разными направленностями и фандомами для проверки макетов.",
    links: [
      { title: "Telegram", url: "https://t.me/foxcavemeit" },
      { title: "VK", url: "https://vk.com" },
    ],
  };

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || "");
      if (!raw || typeof raw !== "object") return { ...DEFAULTS, links: DEFAULTS.links.map((item) => ({ ...item })) };
      return {
        name: String(raw.name || DEFAULTS.name).trim() || DEFAULTS.name,
        handle: String(raw.handle || DEFAULTS.handle).replace(/^@/, "").trim() || DEFAULTS.handle,
        avatar: String(raw.avatar || "").trim(),
        bio: String(raw.bio || DEFAULTS.bio),
        links: Array.isArray(raw.links) && raw.links.length ? raw.links : DEFAULTS.links.map((item) => ({ ...item })),
      };
    } catch {
      return { ...DEFAULTS, links: DEFAULTS.links.map((item) => ({ ...item })) };
    }
  }

  function save(value) {
    localStorage.setItem(STORE, JSON.stringify(value));
    if (window.FoxApi) {
      FoxApi.request("/api/me/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: value.name,
          display_name: value.name,
          bio: value.bio,
          avatar: value.avatar,
          links: value.links,
        }),
      }).catch(() => {});
    }
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

  function profileHandle() {
    const params = new URLSearchParams(location.search);
    const slug = (params.get("u") || "").trim().replace(/^@/, "");
    if (slug) return slug;
    return load().handle;
  }

  function renderLinks(links, handle) {
    const box = document.getElementById("profile-links");
    if (!box) return;
    const nick = String(handle || profileHandle() || "").replace(/^@/, "").trim();
    const mine = typeof ownerHandle === "function" && nick.toLowerCase() === ownerHandle().toLowerCase();
    const mailHref = mine ? "messages.html" : `messages.html?to=${encodeURIComponent(nick)}`;
    const mail = nick
      ? `<a class="profile-mail" href="${mailHref}"><img src="assets/svg/mail.svg" alt=""> Написать</a>`
      : "";
    const items = (links || []).filter((item) => item.title && safeUrl(item.url));
    const social = items
      .map(
        (item) =>
          `<a href="${escapeHtml(safeUrl(item.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>`
      )
      .join("");
    box.innerHTML = mail + social;
    box.hidden = !mail && !items.length;
    if (typeof hydrateUiIcons === "function") hydrateUiIcons(box);
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
    const nameEl = document.querySelector(".profile-name");
    const handleEl = document.querySelector(".profile-handle");
    const bio = document.querySelector(".profile-bio");
    if (nameEl) nameEl.textContent = data.name;
    if (handleEl) handleEl.textContent = `@${data.handle}`;
    if (bio) bio.textContent = data.bio;
    if (data.name) document.title = `${data.name} — профиль — FoxStoria`;
    if (typeof applyOwnerAvatar === "function") applyOwnerAvatar();
    renderLinks(data.links);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (currentPage() !== "profile.html") return;
    syncChrome();
    if (isPublicView()) {
      renderLinks([], profileHandle());
      return;
    }
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
      const current = load();
      const next = {
        ...current,
        bio: bioInput?.value.trim() || DEFAULTS.bio,
        links: collectLinkRows(),
      };
      save(next);
      applyProfile(next);
      if (edit) edit.hidden = true;
    });
  });
})();

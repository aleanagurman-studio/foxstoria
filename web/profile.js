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
          username: value.handle,
          handle: value.handle,
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
      ? `<a class="profile-mail" href="${mailHref}" aria-label="Написать"><img src="assets/svg/mail.svg" alt=""></a>`
      : "";
    const gift = nick
      ? `<button type="button" class="profile-mail" data-profile-gift aria-label="Подарить подарок"><img src="assets/svg/present.svg" alt=""></button>`
      : "";
    const items = (links || []).filter((item) => item.title && safeUrl(item.url));
    const social = items
      .map(
        (item) =>
          `<a href="${escapeHtml(safeUrl(item.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>`
      )
      .join("");
    box.innerHTML = mail + gift + social;
    box.hidden = !mail && !gift && !items.length;
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

  const GIFT_OPTIONS = [
    { id: "fox", title: "Лисичка", price: 99 },
    { id: "book", title: "Книга", price: 199 },
    { id: "spark", title: "Искорка", price: 349 },
  ];

  function giftsKey(handle) {
    return `foxtoria-gifts:${String(handle || "").replace(/^@/, "").trim().toLowerCase()}`;
  }

  function demoGifts(handle) {
    const nick = String(handle || "").replace(/^@/, "").trim().toLowerCase();
    if (nick !== "moonwander") return [];
    return [
      { id: "demo-1", title: "Лисичка", from: "Звёздная пыль", from_slug: "stardust", at: "2026-08-20T11:00:00" },
      { id: "demo-2", title: "Искорка", from: "Лиса с фонарём", from_slug: "lantern-fox", at: "2026-08-28T14:20:00" },
    ];
  }

  function loadGifts(handle) {
    try {
      const parsed = JSON.parse(localStorage.getItem(giftsKey(handle)) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function giftsFor(handle) {
    const extra = loadGifts(handle);
    const seen = new Set(extra.map((item) => item.id));
    return [...demoGifts(handle).filter((item) => !seen.has(item.id)), ...extra].sort((a, b) =>
      String(b.at || "").localeCompare(String(a.at || ""))
    );
  }

  function giftWhen(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  }

  function renderGifts(handle) {
    const box = document.getElementById("profile-gifts");
    if (!box) return;
    const gifts = giftsFor(handle || profileHandle());
    if (!gifts.length) {
      box.innerHTML = `<div class="empty-feed"><p>Пока нет подарков.</p></div>`;
      return;
    }
    box.innerHTML = gifts
      .map((gift) => {
        const who = gift.from_slug
          ? `<a href="profile.html?u=${encodeURIComponent(gift.from_slug)}">${escapeHtml(gift.from || "Читатель")}</a>`
          : escapeHtml(gift.from || "Читатель");
        const when = giftWhen(gift.at);
        return `<article class="profile-gift-card">
          <img src="assets/svg/present.svg" alt="">
          <div>
            <b>${escapeHtml(gift.title || "Подарок")}</b>
            <span>от ${who}${when ? ` · ${escapeHtml(when)}` : ""}</span>
          </div>
        </article>`;
      })
      .join("");
    if (typeof hydrateUiIcons === "function") hydrateUiIcons(box);
  }

  function senderProfile() {
    const data = load();
    return {
      name: data.name || "Читатель",
      slug: data.handle || (typeof ownerHandle === "function" ? ownerHandle() : ""),
    };
  }

  function openGiftDialog() {
    const dialog = document.getElementById("profile-gift-dialog");
    const picks = document.getElementById("profile-gift-picks");
    if (!dialog || !picks) return;
    picks.innerHTML = GIFT_OPTIONS.map((item) => {
      const money = window.FoxPay ? FoxPay.giftNet(item.price) : { net: item.price };
      const price = window.FoxPay ? FoxPay.formatRub(item.price) : `${item.price} ₽`;
      const net = window.FoxPay ? FoxPay.formatRub(money.net) : "";
      return `<button type="button" class="profile-gift-pick" data-gift-id="${escapeHtml(item.id)}">
          <img src="assets/svg/present.svg" alt="">
          <span>${escapeHtml(item.title)}</span>
          <small>${escapeHtml(price)}${net ? ` · автору ${net}` : ""}</small>
        </button>`;
    }).join("");
    dialog.hidden = false;
    if (typeof hydrateUiIcons === "function") hydrateUiIcons(picks);
  }

  function closeGiftDialog() {
    const dialog = document.getElementById("profile-gift-dialog");
    if (dialog) dialog.hidden = true;
  }

  function sendGift(giftId) {
    const option = GIFT_OPTIONS.find((item) => item.id === giftId);
    if (!option) return;
    const handle = profileHandle();
    const sender = senderProfile();
    const next = [
      {
        id: `g-${Date.now().toString(36)}`,
        title: option.title,
        price: option.price || 0,
        from: sender.name,
        from_slug: sender.slug,
        at: new Date().toISOString(),
      },
      ...loadGifts(handle),
    ];
    localStorage.setItem(giftsKey(handle), JSON.stringify(next));
    if (window.FoxPay) FoxPay.payGift(option.price, `Подарок · ${option.title}`);
    renderGifts(handle);
    closeGiftDialog();
  }

  function renderSubs(handle) {
    const box = document.getElementById("profile-subs");
    if (!box || !window.FoxPay) return;
    const nick = String(handle || profileHandle() || "").replace(/^@/, "").trim();
    const tiers = FoxPay.loadTiers(nick);
    const mine = typeof ownerHandle === "function" && FoxPay.nick(nick) === FoxPay.nick(ownerHandle());
    const current = FoxPay.subTo(nick);
    if (!tiers.length) {
      box.innerHTML = "";
      box.hidden = true;
      return;
    }
    box.hidden = false;
    if (mine) {
      box.innerHTML = `<p class="studio-hint">Платная подписка. Уровни можно править в кабинете автора.</p>${tiers
        .map(
          (tier) =>
            `<div class="sub-tier-card"><b>${escapeHtml(tier.name)}</b><span>${FoxPay.formatRub(tier.price)} / мес · уровень ${tier.level}</span></div>`
        )
        .join("")}`;
      return;
    }
    box.innerHTML =
      `<p class="studio-hint">Платная подписка. Максимальный уровень открывает все платные работы и записи.</p>` +
      tiers
        .map((tier) => {
          const on = current?.level === tier.level;
          return `<button type="button" class="sub-tier-card${on ? " is-on" : ""}" data-sub-tier="${escapeHtml(tier.id)}">
            <b>${escapeHtml(tier.name)}</b>
            <span>${FoxPay.formatRub(tier.price)} / мес · уровень ${tier.level} и выше открывает работы этого уровня</span>
            <small>Комиссия сайта ${Math.round(FoxPay.SUB_FEE * 100)}%</small>
          </button>`;
        })
        .join("") +
      (current ? `<button type="button" class="btn btn-outline" data-sub-cancel>Отменить платную подписку</button>` : "");
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
    renderGifts(data.handle);
    renderSubs(data.handle);
  }

  const worksFeedNow = document.querySelector('[data-feed="profile-works"]');
  if (worksFeedNow) worksFeedNow.setAttribute("data-author", profileHandle());

  document.addEventListener("DOMContentLoaded", () => {
    if (currentPage() !== "profile.html") return;
    syncChrome();
    renderGifts(profileHandle());
    renderSubs(profileHandle());
    const worksFeed = document.querySelector('[data-feed="profile-works"]');
    if (worksFeed) worksFeed.setAttribute("data-author", profileHandle());

    document.getElementById("profile-subs")?.addEventListener("click", (event) => {
      if (!window.FoxPay) return;
      const handle = profileHandle();
      if (event.target.closest("[data-sub-cancel]")) {
        FoxPay.unsubscribe(handle);
        renderSubs(handle);
        return;
      }
      const pick = event.target.closest("[data-sub-tier]");
      if (!pick) return;
      const tier = FoxPay.loadTiers(handle).find((item) => item.id === pick.getAttribute("data-sub-tier"));
      if (tier) FoxPay.subscribe(handle, tier);
      renderSubs(handle);
    });

    document.getElementById("profile-links")?.addEventListener("click", (event) => {
      if (!event.target.closest("[data-profile-gift]")) return;
      event.preventDefault();
      openGiftDialog();
    });
    document.getElementById("profile-gift-picks")?.addEventListener("click", (event) => {
      const pick = event.target.closest("[data-gift-id]");
      if (!pick) return;
      sendGift(pick.getAttribute("data-gift-id"));
    });
    document.getElementById("profile-gift-cancel")?.addEventListener("click", closeGiftDialog);
    document.getElementById("profile-gift-dialog")?.addEventListener("click", (event) => {
      if (event.target.id === "profile-gift-dialog") closeGiftDialog();
    });

    if (isPublicView()) {
      renderLinks([], profileHandle());
      renderSubs(profileHandle());
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

(function collectionsPage() {
  const MINE = [
    { id: "fav", title: "Избранное", cover: "assets/brand/collection-heart.png", private: true, pinned: true, works: 12, updated: "сегодня, 14:20", updatedAt: "2026-08-28T14:20:00", following: false },
    { id: "later", title: "На потом", cover: "assets/brand/collection-chair.png", private: true, pinned: false, works: 5, updated: "вчера, 19:10", updatedAt: "2026-08-27T19:10:00", following: false },
    { id: "autumn", title: "Осень 2026", cover: "assets/brand/collection-castle.png", private: false, pinned: false, works: 8, updated: "2 дня назад", updatedAt: "2026-08-26T12:00:00", following: false },
    { id: "orig", title: "Ориджинал", cover: "assets/deco/fox.svg", private: false, pinned: false, works: 3, updated: "неделю назад", updatedAt: "2026-08-21T10:00:00", following: false },
  ];
  const SUBS = [
    { id: "love", title: "Истории о любви", cover: "assets/brand/collection-heart.png", private: false, pinned: true, works: 24, updated: "сегодня, 11:04", updatedAt: "2026-08-28T11:04:00", following: true },
    { id: "dark", title: "Тёмное фэнтези", cover: "assets/brand/collection-helm.png", private: false, pinned: false, works: 18, updated: "вчера, 08:40", updatedAt: "2026-08-27T08:40:00", following: true },
    { id: "academy", title: "Академия и магия", cover: "assets/deco/bookmark.svg", private: true, pinned: false, works: 9, updated: "3 дня назад", updatedAt: "2026-08-25T16:00:00", following: true },
  ];

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function lockIcon(isPrivate) {
    const src = isPrivate ? "assets/svg/locked.svg" : "assets/svg/unlocked.svg";
    const label = isPrivate ? "Приватный сборник" : "Публичный сборник";
    return `<img class="pack-lock" src="${src}" alt="${label}" title="${label}">`;
  }

  function menuHTML(pack, own) {
    const pinLabel = pack.pinned ? "Открепить" : "Закрепить";
    const shareBtn = `<button type="button" data-pack-act="share"><img src="assets/svg/share.svg" alt=""> Поделиться</button>`;
    const pinBtn = `<button type="button" data-pack-act="pin"><img src="assets/svg/кнопка.svg" alt=""> ${pinLabel}</button>`;
    if (own) {
      const privacyLabel = pack.private ? "Открыть для всех" : "Сделать приватным";
      const privacyIcon = pack.private ? "assets/svg/unlocked.svg" : "assets/svg/locked.svg";
      return `
      <button type="button" class="cabinet-more" aria-label="Ещё" aria-haspopup="menu" aria-expanded="false"><img src="assets/ornaments/03_more.svg?v=3" alt=""></button>
      <div class="cabinet-menu" hidden role="menu">
        ${pinBtn}
        <button type="button" data-pack-act="privacy"><img src="${privacyIcon}" alt=""> ${privacyLabel}</button>
        ${shareBtn}
        <button type="button" data-pack-act="edit"><img src="assets/svg/редактировать.svg" alt=""> Редактировать</button>
        <button type="button" class="is-danger" data-pack-act="delete"><img src="assets/svg/удалить.svg" alt=""> Удалить</button>
      </div>`;
    }
    const followLabel = pack.following ? "Отписаться" : "Подписаться";
    return `
      <button type="button" class="cabinet-more" aria-label="Ещё" aria-haspopup="menu" aria-expanded="false"><img src="assets/ornaments/03_more.svg?v=3" alt=""></button>
      <div class="cabinet-menu" hidden role="menu">
        ${pinBtn}
        <button type="button" data-pack-act="follow"><img src="assets/svg/bookmark2.svg" alt=""> ${followLabel}</button>
        ${shareBtn}
        <button type="button" data-pack-act="report"><img src="assets/svg/флаг.svg" alt=""> Пожаловаться</button>
      </div>`;
  }

  function cardHTML(pack, own) {
    return `
      <article class="pack-card" data-id="${escapeHtml(pack.id)}" data-own="${own ? "1" : "0"}" data-pinned="${pack.pinned ? "1" : "0"}" data-private="${pack.private ? "1" : "0"}" data-following="${pack.following ? "1" : "0"}" data-updated="${escapeHtml(pack.updatedAt)}" data-title="${escapeHtml(pack.title)}" data-cover="${escapeHtml(pack.cover || "")}">
        <a class="pack-cover" href="search.html"><span class="tile-image collection-cover">${pack.cover ? `<img src="${escapeHtml(pack.cover)}" alt="">` : ""}</span></a>
        <div class="pack-info">
          <h3><a href="search.html">${lockIcon(pack.private)} <span class="pack-title">${escapeHtml(pack.title)}</span></a></h3>
          <p>${pack.works} работ · обновлён ${escapeHtml(pack.updated)}</p>
        </div>
        <div class="cabinet-more-wrap">${menuHTML(pack, own)}</div>
      </article>`;
  }

  async function render() {
    const mineRoot = document.querySelector('[data-pack-feed="mine"]');
    const subRoot = document.querySelector('[data-pack-feed="subs"]');
    let mine = MINE;
    try {
      if (window.FoxStore) await FoxStore.hydrate();
      if (window.FoxApi) {
        const data = await FoxApi.request("/api/collections");
        if (Array.isArray(data.collections) && data.collections.length) {
          mine = data.collections.map((pack) => ({
            id: pack.id,
            title: pack.title,
            cover: pack.cover || "",
            private: pack.private,
            pinned: pack.pinned,
            works: pack.works || 0,
            updated: "",
            updatedAt: "",
            following: false,
          }));
        }
      }
    } catch {
      /* local mock */
    }
    if (mineRoot) mineRoot.innerHTML = mine.map((pack) => cardHTML(pack, true)).join("");
    if (subRoot) subRoot.innerHTML = SUBS.map((pack) => cardHTML(pack, false)).join("");
    if (typeof hydrateUiIcons === "function") {
      hydrateUiIcons(document.querySelector(".collections-page"));
    }
    applySort();
  }

  function applySort() {
    const dir = document.querySelector("[data-pack-sort]")?.value || "new";
    document.querySelectorAll(".pack-grid").forEach((grid) => {
      const cards = [...grid.querySelectorAll(".pack-card")];
      cards.sort((a, b) => {
        const pin = Number(b.dataset.pinned) - Number(a.dataset.pinned);
        if (pin) return pin;
        const ta = a.dataset.updated || "";
        const tb = b.dataset.updated || "";
        return dir === "old" ? ta.localeCompare(tb) : tb.localeCompare(ta);
      });
      cards.forEach((card) => grid.appendChild(card));
    });
  }

  function closeMenus(except) {
    document.querySelectorAll(".pack-card .cabinet-menu").forEach((menu) => {
      if (menu === except) return;
      menu.hidden = true;
      menu.closest(".cabinet-more-wrap")?.querySelector(".cabinet-more")?.setAttribute("aria-expanded", "false");
    });
  }

  function setPinned(card, on) {
    card.dataset.pinned = on ? "1" : "0";
    const btn = card.querySelector('[data-pack-act="pin"]');
    if (btn) {
      btn.innerHTML = `<img src="assets/svg/кнопка.svg" alt=""> ${on ? "Открепить" : "Закрепить"}`;
      if (typeof hydrateUiIcons === "function") hydrateUiIcons(btn);
    }
  }

  function setPrivate(card, on) {
    card.dataset.private = on ? "1" : "0";
    const heading = card.querySelector("h3 a");
    const title = card.querySelector(".pack-title");
    if (heading && title) {
      heading.innerHTML = `${lockIcon(on)} <span class="pack-title">${escapeHtml(title.textContent)}</span>`;
      if (typeof hydrateUiIcons === "function") hydrateUiIcons(heading);
    }
    const btn = card.querySelector('[data-pack-act="privacy"]');
    if (btn) {
      btn.innerHTML = `<img src="assets/svg/${on ? "unlocked" : "locked"}.svg" alt=""> ${on ? "Открыть для всех" : "Сделать приватным"}`;
      if (typeof hydrateUiIcons === "function") hydrateUiIcons(btn);
    }
  }

  function sharePack(btn, card) {
    const url = new URL("search.html", location.href);
    url.searchParams.set("pack", card.dataset.id || "");
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url.href);
    btn.innerHTML = `<img src="assets/svg/share.svg" alt=""> Ссылка скопирована`;
    if (typeof hydrateUiIcons === "function") hydrateUiIcons(btn);
    window.setTimeout(() => {
      if (!btn.isConnected) return;
      btn.innerHTML = `<img src="assets/svg/share.svg" alt=""> Поделиться`;
      if (typeof hydrateUiIcons === "function") hydrateUiIcons(btn);
    }, 1600);
  }

  function packId(title) {
    const base = String(title || "")
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^a-zа-я0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");
    return `${base || "pack"}-${Date.now().toString(36)}`;
  }

  function showMineTab() {
    document.querySelector('[data-account-tabs] [data-tab="mine"]')?.click();
  }

  function setCardCover(card, src) {
    card.dataset.cover = src || "";
    const wrap = card.querySelector(".collection-cover");
    if (wrap) wrap.innerHTML = src ? `<img src="${escapeHtml(src)}" alt="">` : "";
    const pack = MINE.find((item) => item.id === card.dataset.id);
    if (pack) pack.cover = src || "";
  }

  function bindCoverField(dialog, initial) {
    let cover = initial || "";
    const preview = dialog.querySelector("[data-pack-cover-preview] img");
    dialog.querySelector("[data-pack-cover]")?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        cover = String(reader.result || "");
        if (preview) {
          preview.hidden = !cover;
          preview.src = cover;
        }
      };
      reader.readAsDataURL(file);
    });
    return () => cover;
  }

  function openCreate() {
    let dialog = document.querySelector(".work-dialog");
    if (!dialog) {
      dialog = document.createElement("div");
      dialog.className = "work-dialog";
      document.body.append(dialog);
    }
    const isPrivate = typeof foxPref === "function" ? foxPref("privacyPacks") === "private" : false;
    dialog.innerHTML = `
      <div class="work-dialog-card" role="dialog" aria-modal="true">
        <h2>Новый сборник</h2>
        <form class="work-pack-create" data-pack-create>
          <input type="text" name="title" placeholder="Название сборника" maxlength="80" required>
          <button type="submit" class="btn btn-primary">Создать</button>
        </form>
        <div class="work-dialog-actions">
          <button type="button" class="btn btn-outline" data-pack-cancel>Отмена</button>
        </div>
      </div>`;
    dialog.hidden = false;
    const hide = () => {
      dialog.hidden = true;
    };
    dialog.querySelector("[data-pack-cancel]")?.addEventListener("click", hide);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) hide();
    });
    dialog.querySelector("[data-pack-create]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const title = String(new FormData(event.target).get("title") || "").trim();
      if (!title) return;
      const pack = {
        id: packId(title),
        title,
        cover: "assets/deco/сборник.svg",
        private: isPrivate,
        pinned: false,
        works: 0,
        updated: "сейчас",
        updatedAt: new Date().toISOString(),
        following: false,
      };
      MINE.unshift(pack);
      const mineRoot = document.querySelector('[data-pack-feed="mine"]');
      if (mineRoot) {
        mineRoot.insertAdjacentHTML("afterbegin", cardHTML(pack, true));
        if (typeof hydrateUiIcons === "function") hydrateUiIcons(mineRoot.firstElementChild);
      }
      showMineTab();
      applySort();
      hide();
    });
    dialog.querySelector("input")?.focus();
  }

  function openEdit(card) {
    let dialog = document.querySelector(".work-dialog");
    if (!dialog) {
      dialog = document.createElement("div");
      dialog.className = "work-dialog";
      document.body.append(dialog);
    }
    const title = card.dataset.title || "";
    const cover = card.dataset.cover || card.querySelector(".collection-cover img")?.getAttribute("src") || "";
    dialog.innerHTML = `
      <div class="work-dialog-card work-dialog-card--pack-edit" role="dialog" aria-modal="true">
        <h2>Редактировать сборник</h2>
        <form class="work-pack-edit" data-pack-edit>
          <div class="pack-cover-edit">
            <div class="pack-cover-preview" data-pack-cover-preview>
              ${cover ? `<img src="${escapeHtml(cover)}" alt="">` : `<img alt="" hidden>`}
            </div>
            <p class="pack-cover-hint">Обложка карточки сборника. Лучше 16:10, не меньше 1280×800. Подойдёт JPG, PNG или WebP.</p>
            <label class="btn btn-outline">
              Загрузить обложку
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden data-pack-cover>
            </label>
          </div>
          <div class="pack-edit-fields">
            <label class="pack-edit-title">
              <span>Название</span>
              <input type="text" name="title" value="${escapeHtml(title)}" maxlength="80" required>
            </label>
            <div class="work-dialog-actions">
              <button type="button" class="btn btn-outline" data-pack-cancel>Отмена</button>
              <button type="submit" class="btn btn-primary">Сохранить</button>
            </div>
          </div>
        </form>
      </div>`;
    dialog.hidden = false;
    const hide = () => {
      dialog.hidden = true;
    };
    const coverValue = bindCoverField(dialog, cover);
    dialog.querySelector("[data-pack-cancel]")?.addEventListener("click", hide);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) hide();
    });
    dialog.querySelector("[data-pack-edit]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const next = String(new FormData(event.target).get("title") || "").trim();
      if (!next) return;
      card.dataset.title = next;
      const label = card.querySelector(".pack-title");
      if (label) label.textContent = next;
      setCardCover(card, coverValue());
      hide();
    });
    dialog.querySelector("input[name='title']")?.focus();
  }

  document.querySelector("[data-pack-create-open]")?.addEventListener("click", openCreate);
  document.querySelector("[data-pack-sort]")?.addEventListener("change", applySort);
  document.querySelectorAll("[data-pack-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.getAttribute("data-pack-view");
      document.querySelector(".collections-page")?.classList.toggle("is-list", view === "list");
      document.querySelectorAll("[data-pack-view]").forEach((other) => {
        other.classList.toggle("is-active", other === btn);
      });
    });
  });
  document.addEventListener("click", (event) => {
    const more = event.target.closest(".pack-card .cabinet-more");
    if (more) {
      event.preventDefault();
      const menu = more.parentElement.querySelector(".cabinet-menu");
      const open = menu.hidden;
      closeMenus(open ? menu : null);
      menu.hidden = !open;
      more.setAttribute("aria-expanded", open ? "true" : "false");
      return;
    }
    const act = event.target.closest("[data-pack-act]");
    if (act) {
      event.preventDefault();
      const card = act.closest(".pack-card");
      if (!card) return;
      const kind = act.getAttribute("data-pack-act");
      if (kind === "pin") setPinned(card, card.dataset.pinned !== "1");
      if (kind === "privacy") {
        setPrivate(card, card.dataset.private !== "1");
        return;
      }
      if (kind === "share") {
        sharePack(act, card);
        closeMenus();
        return;
      }
      if (kind === "report") {
        act.innerHTML = `<img src="assets/svg/флаг.svg" alt=""> Жалоба отправлена`;
        if (typeof hydrateUiIcons === "function") hydrateUiIcons(act);
        closeMenus();
        return;
      }
      if (kind === "delete") card.remove();
      if (kind === "follow") {
        const on = card.dataset.following !== "1";
        card.dataset.following = on ? "1" : "0";
        const btn = card.querySelector('[data-pack-act="follow"]');
        if (btn) {
          btn.innerHTML = `<img src="assets/svg/bookmark2.svg" alt=""> ${on ? "Отписаться" : "Подписаться"}`;
          if (typeof hydrateUiIcons === "function") hydrateUiIcons(btn);
        }
        if (!on && card.dataset.own !== "1") card.remove();
      }
      if (kind === "edit") openEdit(card);
      closeMenus();
      applySort();
      return;
    }
    if (!event.target.closest(".cabinet-more-wrap")) closeMenus();
  });

  render();
})();

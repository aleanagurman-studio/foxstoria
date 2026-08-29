(function settingsApp() {
  const BLOCK_KEY = "foxtoria-blocklist";
  const PEOPLE = [
    { name: "Лиса с фонарём", handle: "foxlantern", avatar: "assets/test/avatar-3.png" },
    { name: "Никита", handle: "nikita", avatar: "assets/test/avatar-7.png" },
    { name: "Аля", handle: "alya", avatar: "assets/test/avatar-5.png" },
    { name: "Звёздная пыль", handle: "stardust", avatar: "assets/test/avatar-2.png" },
    { name: "Алиса", handle: "alisa", avatar: "assets/test/avatar-4.png" },
    { name: "Мара", handle: "mara", avatar: "assets/test/avatar-6.png" },
    { name: "Север", handle: "sever", avatar: "assets/test/avatar-8.png" },
    { name: "Ирис", handle: "iris", avatar: "assets/test/avatar-1.png" },
    { name: "Чайная соня", handle: "teasleep", avatar: "assets/test/avatar-4.png" },
    { name: "Лиса в книгах", handle: "bookfox", avatar: "assets/test/avatar-2.png" },
  ];

  function personKey(person) {
    return String(person.handle || person.name || "")
      .replace(/^@/, "")
      .trim()
      .toLowerCase();
  }

  function matchPerson(query, loose) {
    const key = String(query || "")
      .replace(/^@/, "")
      .trim()
      .toLowerCase();
    if (!key) return null;
    const exact =
      PEOPLE.find((person) => personKey(person) === key) ||
      PEOPLE.find((person) => person.name.toLowerCase() === key);
    if (exact || !loose) return exact || null;
    return PEOPLE.find(
      (person) => person.name.toLowerCase().includes(key) || person.handle.toLowerCase().includes(key)
    );
  }

  function normalizeBlocked(item) {
    if (item && typeof item === "object") {
      const found = matchPerson(item.handle || item.name, false) || item;
      return {
        name: found.name || String(item.name || ""),
        handle: String(found.handle || item.handle || "").replace(/^@/, ""),
        avatar: found.avatar || item.avatar || "",
      };
    }
    const found = matchPerson(item, false);
    const raw = String(item || "").replace(/^@/, "").trim();
    return found || { name: raw, handle: raw, avatar: "" };
  }

  function loadBlocklist() {
    try {
      const raw = JSON.parse(localStorage.getItem(BLOCK_KEY) || "[]");
      return Array.isArray(raw) ? raw.map(normalizeBlocked).filter((item) => item.name || item.handle) : [];
    } catch {
      return [];
    }
  }

  function saveBlocklist(list) {
    localStorage.setItem(BLOCK_KEY, JSON.stringify(list));
  }

  function isBlocked(list, person) {
    const key = personKey(person);
    return list.some((item) => personKey(item) === key);
  }

  function renderBlocklist() {
    const root = document.querySelector("[data-block-list]");
    if (!root) return;
    const list = loadBlocklist();
    if (!list.length) {
      root.innerHTML = `<article class="account-card"><strong>Пока пусто</strong><p class="profile-meta">Скрытые аккаунты появятся здесь</p></article>`;
      return;
    }
    root.innerHTML = list
      .map((person) => {
        const handle = person.handle ? `@${person.handle}` : "";
        const ava = person.avatar
          ? `<img src="${escapeText(person.avatar)}" alt="">`
          : "";
        return `<article class="account-card settings-block-user">
        <div class="settings-block-user-who">
          ${ava}
          <div>
            <strong data-user-name="${escapeText(person.name)}">${escapeText(person.name)}</strong>
            ${handle ? `<p class="profile-meta">${escapeText(handle)}</p>` : ""}
          </div>
        </div>
        <button type="button" class="btn btn-ghost" data-unblock="${escapeText(personKey(person))}">Убрать</button>
      </article>`;
      })
      .join("");
    if (typeof hydrateUserNames === "function") hydrateUserNames(root);
  }

  const prefs = loadFoxPrefs();
  document.querySelectorAll("[data-pref]").forEach((el) => {
    const key = el.getAttribute("data-pref");
    if (!(key in prefs)) return;
    if (el.type === "checkbox") el.checked = Boolean(prefs[key]);
    else el.value = prefs[key];
    el.addEventListener("change", () => {
      const next = loadFoxPrefs();
      next[key] = el.type === "checkbox" ? el.checked : el.value;
      saveFoxPrefs(next);
      if (key === "notifMentions" && typeof fillNotifFeed === "function") fillNotifFeed();
    });
  });

  const PROFILE_STORE = "foxtoria-profile";
  const IDENTITY = { name: "Лунный странник", handle: "moonwander" };

  function loadIdentity() {
    try {
      const raw = JSON.parse(localStorage.getItem(PROFILE_STORE) || "{}") || {};
      return {
        name: String(raw.name || IDENTITY.name).trim() || IDENTITY.name,
        handle: String(raw.handle || IDENTITY.handle).replace(/^@/, "").trim() || IDENTITY.handle,
      };
    } catch {
      return { ...IDENTITY };
    }
  }

  function saveIdentity(patch) {
    let raw = {};
    try {
      raw = JSON.parse(localStorage.getItem(PROFILE_STORE) || "{}") || {};
    } catch {
      raw = {};
    }
    localStorage.setItem(PROFILE_STORE, JSON.stringify({ ...raw, ...patch }));
  }

  function cleanHandle(value) {
    return String(value || "")
      .replace(/^@/, "")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 24);
  }

  const nameInput = document.querySelector("[data-profile-name]");
  const handleInput = document.querySelector("[data-profile-handle]");
  const identity = loadIdentity();
  if (nameInput) nameInput.value = identity.name;
  if (handleInput) handleInput.value = identity.handle;
  nameInput?.addEventListener("change", () => {
    const name = nameInput.value.trim() || IDENTITY.name;
    nameInput.value = name;
    saveIdentity({ name });
  });
  handleInput?.addEventListener("input", () => {
    const caret = handleInput.selectionStart;
    const cleaned = cleanHandle(handleInput.value);
    if (handleInput.value !== cleaned) {
      handleInput.value = cleaned;
      const pos = Math.min(caret, cleaned.length);
      handleInput.setSelectionRange(pos, pos);
    }
  });
  handleInput?.addEventListener("change", () => {
    const handle = cleanHandle(handleInput.value) || IDENTITY.handle;
    handleInput.value = handle;
    saveIdentity({ handle });
    if (typeof fillNotifFeed === "function") fillNotifFeed();
  });

  const avatarPreview = document.querySelector("[data-settings-avatar]");
  const avatarFile = document.querySelector("[data-avatar-file]");
  if (avatarPreview && typeof ownerAvatarSrc === "function") avatarPreview.src = ownerAvatarSrc();

  function showAvatar(src) {
    if (avatarPreview) avatarPreview.src = src;
    if (typeof applyOwnerAvatar === "function") applyOwnerAvatar();
  }

  function readAvatarFile(file, done) {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const side = Math.min(image.width, image.height) || 1;
      const sx = (image.width - side) / 2;
      const sy = (image.height - side) / 2;
      ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      done(canvas.toDataURL("image/jpeg", 0.88));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = () => done(String(reader.result || ""));
      reader.readAsDataURL(file);
    };
    image.src = url;
  }

  document.querySelector("[data-avatar-pick]")?.addEventListener("click", () => avatarFile?.click());
  document.querySelector("[data-avatar-reset]")?.addEventListener("click", () => {
    saveIdentity({ avatar: "" });
    showAvatar(typeof OWNER_AVATAR_DEFAULT === "string" ? OWNER_AVATAR_DEFAULT : "assets/test/avatar-1.png");
  });
  avatarFile?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    readAvatarFile(file, (data) => {
      if (!data) return;
      try {
        saveIdentity({ avatar: data });
      } catch {
        return;
      }
      showAvatar(data);
    });
  });

  document.querySelector("[data-settings-save]")?.addEventListener("click", (event) => {
    const btn = event.currentTarget;
    btn.textContent = "Сохранено";
    setTimeout(() => {
      btn.textContent = "Сохранить пароль";
    }, 1600);
  });

  const SESSION_KEY = "foxtoria-sessions";
  const DEVICE_KEY = "foxtoria-device-id";

  function escapeText(value) {
    return String(value || "").replace(/[<>&"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[ch]));
  }

  function currentDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `dev-${Date.now()}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function guessDevice() {
    const ua = navigator.userAgent || "";
    let browser = "Браузер";
    if (/Edg\//.test(ua)) browser = "Edge";
    else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = "Chrome";
    else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
    else if (/Firefox\//.test(ua)) browser = "Firefox";
    let device = "это устройство";
    if (/iPhone/.test(ua)) device = "iPhone";
    else if (/iPad/.test(ua)) device = "iPad";
    else if (/Android/.test(ua)) device = "Android";
    else if (/Mac/.test(ua)) device = "Mac";
    else if (/Windows/.test(ua)) device = "Windows";
    else if (/Linux/.test(ua)) device = "Linux";
    return { title: `${browser} · ${device}`, place: "Это устройство" };
  }

  function demoSessions() {
    return [
      { id: "seed-iphone", title: "Safari · iPhone", place: "Москва", seen: "2 часа назад" },
      { id: "seed-app", title: "Приложение FoxStoria", place: "iOS · Санкт-Петербург", seen: "вчера" },
      { id: "seed-win", title: "Chrome · Windows", place: "Новосибирск", seen: "5 дней назад" },
    ];
  }

  function currentSession() {
    const device = guessDevice();
    return {
      id: currentDeviceId(),
      title: device.title,
      place: device.place,
      seen: "сейчас",
      current: true,
    };
  }

  function loadSessions() {
    const mine = currentSession();
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      stored = null;
    }
    const others = Array.isArray(stored)
      ? stored.filter((item) => item && item.id && item.id !== mine.id && !item.current)
      : demoSessions();
    const list = [mine, ...others];
    localStorage.setItem(SESSION_KEY, JSON.stringify(list));
    return list;
  }

  function saveSessions(list) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(list));
  }

  function renderSessions() {
    const root = document.querySelector("[data-session-list]");
    const revoke = document.querySelector("[data-sessions-revoke]");
    const empty = document.querySelector("[data-sessions-empty]");
    if (!root) return;
    const list = loadSessions();
    const others = list.filter((item) => !item.current);
    root.innerHTML = list
      .map((item) => {
        const action = item.current
          ? `<span class="settings-session-badge">Текущая</span>`
          : `<button type="button" class="btn btn-ghost" data-end-session="${escapeText(item.id)}">Завершить</button>`;
        return `<article class="account-card settings-session${item.current ? " is-current" : ""}">
          <div>
            <strong>${escapeText(item.title)}</strong>
            <p class="profile-meta">${escapeText(item.place)} · ${escapeText(item.seen)}</p>
          </div>
          ${action}
        </article>`;
      })
      .join("");
    if (revoke) revoke.hidden = !others.length;
    if (empty) empty.hidden = Boolean(others.length);
  }

  document.querySelector("[data-session-list]")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-end-session]");
    if (!btn) return;
    const id = btn.getAttribute("data-end-session");
    saveSessions(loadSessions().filter((item) => item.id !== id || item.current));
    renderSessions();
  });

  const revokeDialog = document.getElementById("sessions-revoke-dialog");
  function closeRevokeDialog() {
    if (revokeDialog) revokeDialog.hidden = true;
  }
  document.querySelector("[data-sessions-revoke]")?.addEventListener("click", () => {
    if (revokeDialog) revokeDialog.hidden = false;
  });
  document.querySelector("[data-sessions-revoke-cancel]")?.addEventListener("click", closeRevokeDialog);
  revokeDialog?.addEventListener("click", (event) => {
    if (event.target === revokeDialog) closeRevokeDialog();
  });
  document.querySelector("[data-sessions-revoke-confirm]")?.addEventListener("click", () => {
    saveSessions(loadSessions().filter((item) => item.current));
    closeRevokeDialog();
    renderSessions();
  });

  renderSessions();

  const blockForm = document.querySelector("[data-block-form]");
  const blockInput = blockForm?.querySelector("[data-block-query]");
  const blockSuggest = document.querySelector("[data-block-suggest]");
  let suggestIndex = -1;

  function addBlocked(person) {
    if (!person?.name && !person?.handle) return;
    const list = loadBlocklist();
    if (isBlocked(list, person)) return;
    list.push({
      name: person.name,
      handle: String(person.handle || "").replace(/^@/, ""),
      avatar: person.avatar || "",
    });
    saveBlocklist(list);
    renderBlocklist();
  }

  function closeSuggest() {
    if (!blockSuggest) return;
    blockSuggest.hidden = true;
    blockSuggest.innerHTML = "";
    suggestIndex = -1;
  }

  function visibleSuggest() {
    return [...(blockSuggest?.querySelectorAll("[data-block-pick]") || [])];
  }

  function paintSuggestActive() {
    visibleSuggest().forEach((btn, index) => btn.classList.toggle("is-on", index === suggestIndex));
  }

  function renderSuggest(query) {
    if (!blockSuggest) return;
    const key = String(query || "").replace(/^@/, "").trim().toLowerCase();
    const blocked = loadBlocklist();
    const matches = PEOPLE.filter((person) => {
      if (isBlocked(blocked, person)) return false;
      if (!key) return true;
      return person.name.toLowerCase().includes(key) || person.handle.toLowerCase().includes(key);
    }).slice(0, 8);
    if (!matches.length) {
      blockSuggest.hidden = false;
      blockSuggest.innerHTML = `<p class="settings-user-empty">${key ? "Никого не нашли" : "Начните вводить имя или юзернейм"}</p>`;
      suggestIndex = -1;
      return;
    }
    blockSuggest.hidden = false;
    blockSuggest.innerHTML = matches
      .map(
        (person) => `<button type="button" class="settings-user-opt" data-block-pick="${escapeText(person.handle)}">
          <img src="${escapeText(person.avatar)}" alt="">
          <span>
            <b>${escapeText(person.name)}</b>
            <span class="settings-user-handle">@${escapeText(person.handle)}</span>
          </span>
        </button>`
      )
      .join("");
    suggestIndex = 0;
    paintSuggestActive();
  }

  function pickFromSuggest(handle) {
    const person = matchPerson(handle, false);
    if (!person) return;
    addBlocked(person);
    if (blockInput) blockInput.value = "";
    closeSuggest();
  }

  blockInput?.addEventListener("focus", () => renderSuggest(blockInput.value));
  blockInput?.addEventListener("input", () => renderSuggest(blockInput.value));
  blockInput?.addEventListener("keydown", (event) => {
    const items = visibleSuggest();
    if (event.key === "ArrowDown" && items.length) {
      event.preventDefault();
      suggestIndex = (suggestIndex + 1) % items.length;
      paintSuggestActive();
      items[suggestIndex]?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "ArrowUp" && items.length) {
      event.preventDefault();
      suggestIndex = (suggestIndex - 1 + items.length) % items.length;
      paintSuggestActive();
      items[suggestIndex]?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Escape") {
      closeSuggest();
    } else if (event.key === "Enter" && !blockSuggest?.hidden && items[suggestIndex]) {
      event.preventDefault();
      pickFromSuggest(items[suggestIndex].getAttribute("data-block-pick"));
    }
  });
  blockSuggest?.addEventListener("mousedown", (event) => event.preventDefault());
  blockSuggest?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-block-pick]");
    if (!btn) return;
    pickFromSuggest(btn.getAttribute("data-block-pick"));
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest(".settings-user-pick")) return;
    closeSuggest();
  });

  blockForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = String(blockInput?.value || "").trim();
    if (!name) return;
    const person = matchPerson(name, false) || matchPerson(name, true) || {
      name: name.replace(/^@/, ""),
      handle: name.replace(/^@/, ""),
      avatar: "",
    };
    addBlocked(person);
    if (blockInput) blockInput.value = "";
    closeSuggest();
  });

  document.querySelector("[data-block-list]")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-unblock]");
    if (!btn) return;
    const key = btn.getAttribute("data-unblock");
    saveBlocklist(loadBlocklist().filter((item) => personKey(item) !== key));
    renderBlocklist();
  });

  renderBlocklist();

  function bindHidePickers() {
    document.querySelectorAll("#tab-privacy .tax-picker input[type='hidden']").forEach((input) => {
      if (input.dataset.hideBound === "1") return;
      input.dataset.hideBound = "1";
      input.addEventListener("change", () => {
        const next = loadFoxPrefs();
        next[input.name] = String(input.value || "")
          .split(",")
          .map((slug) => slug.trim())
          .filter(Boolean);
        saveFoxPrefs(next);
      });
    });
  }

  document.addEventListener("taxonomy:ready", bindHidePickers);
  bindHidePickers();

  const deleteDialog = document.getElementById("account-delete-dialog");
  function closeDeleteDialog() {
    if (deleteDialog) deleteDialog.hidden = true;
  }
  document.querySelector("[data-account-delete]")?.addEventListener("click", () => {
    if (deleteDialog) deleteDialog.hidden = false;
  });
  document.querySelector("[data-account-delete-cancel]")?.addEventListener("click", closeDeleteDialog);
  deleteDialog?.addEventListener("click", (event) => {
    if (event.target === deleteDialog) closeDeleteDialog();
  });
  document.querySelector("[data-account-delete-confirm]")?.addEventListener("click", () => {
    const theme = localStorage.getItem("foxtoria-theme");
    Object.keys(localStorage)
      .filter((key) => key.startsWith("foxtoria-"))
      .forEach((key) => localStorage.removeItem(key));
    if (theme) localStorage.setItem("foxtoria-theme", theme);
    location.href = "index.html";
  });
})();

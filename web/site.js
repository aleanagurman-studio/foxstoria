(function restoreTheme() {
  const stored = localStorage.getItem("foxtoria-theme");
  if (stored === "dark" || stored === "light") {
    document.documentElement.setAttribute("data-theme", stored);
  }
})();

function isSignedIn() {
  return Boolean(activeDemoUser());
}

const FOX_DEMO_USERS = [
  {
    name: "Фокс",
    handle: "fox",
    password: "1111",
    role: "admin",
    is_staff: true,
    bio: "Администратор FoxStoria. Полный доступ к кабинету, модерации и настройкам сайта.",
    avatar: "assets/brand/лисичка.png",
  },
  {
    name: "Лис",
    handle: "lis",
    password: "2222",
    role: "author",
    is_staff: false,
    bio: "Пишу новеллы и проверяю кабинет автора. Тестовые работы живут здесь.",
    avatar: "assets/test/avatar-2.png",
  },
  {
    name: "Хвостик",
    handle: "hvostik",
    password: "3333",
    role: "reader",
    is_staff: false,
    bio: "Читаю истории, собираю закладки и оставляю отзывы.",
    avatar: "assets/test/avatar-3.png",
  },
];

const FOX_AUTHOR_PAGES = new Set([
  "author-home.html",
  "work-new.html",
  "studio.html",
  "editor.html",
  "editor-linear.html",
  "editor-messenger.html",
  "reviews.html",
  "changes.html",
  "limits.html",
]);

const FOX_ADMIN_PAGES = new Set([
  "admin.html",
  "admin-reports.html",
  "admin-messages.html",
  "admin-content.html",
  "admin-fandoms.html",
  "admin-fandom.html",
]);

function loadProfileStore() {
  try {
    const raw = JSON.parse(localStorage.getItem("foxtoria-profile") || "{}") || {};
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function activeDemoUser() {
  if (localStorage.getItem("foxtoria-signed-in") !== "1") return null;
  const raw = loadProfileStore();
  const handle = String(raw.handle || "")
    .replace(/^@/, "")
    .trim()
    .toLowerCase();
  const role = String(raw.role || "");
  return (
    FOX_DEMO_USERS.find((user) => user.handle === handle && user.role === role) || null
  );
}

function currentUserRole() {
  return activeDemoUser()?.role || "";
}

function canUseAuthorTools() {
  const role = currentUserRole();
  return role === "author" || role === "admin";
}

function isSiteAdmin() {
  if (!isSignedIn()) return false;
  const raw = loadProfileStore();
  if (raw.is_staff || raw.role === "admin") return true;
  return ["fox", "foxstoria", "foxstoria-support"].includes(ownerHandle());
}

function isSiteOwner() {
  return isSiteAdmin();
}

function findDemoUser(login, password) {
  const key = String(login || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
  const pass = String(password || "");
  return FOX_DEMO_USERS.find(
    (user) => pass === user.password && (user.handle === key || user.name.toLowerCase() === key)
  );
}

function applyDemoSession(user) {
  localStorage.setItem("foxtoria-signed-in", "1");
  const prev = loadProfileStore();
  localStorage.setItem(
    "foxtoria-profile",
    JSON.stringify({
      ...prev,
      name: user.name,
      handle: user.handle,
      bio: user.bio,
      avatar: user.avatar,
      role: user.role,
      is_staff: Boolean(user.is_staff),
      links: Array.isArray(prev.links) ? prev.links : [],
    })
  );
}

function clearDemoSession() {
  localStorage.removeItem("foxtoria-signed-in");
  localStorage.removeItem("foxtoria-profile");
}

function afterLoginPath(user) {
  const next = String(sessionStorage.getItem("foxtoria-after-login") || "").trim();
  sessionStorage.removeItem("foxtoria-after-login");
  if (next && user.role === "reader" && FOX_AUTHOR_PAGES.has(next.split("?")[0])) return "404.html";
  if (next && user.role !== "admin" && FOX_ADMIN_PAGES.has(next.split("?")[0])) return "404.html";
  if (next) return next;
  if (user.role === "admin") return "admin.html";
  if (user.role === "author") return "author-home.html";
  return "library.html";
}

function ensureLoginDialog() {
  let box = document.getElementById("login-dialog");
  if (box) return box;
  box = document.createElement("dialog");
  box.id = "login-dialog";
  box.className = "login-dialog";
  box.innerHTML = `
    <form class="login-form" data-login-form>
      <h2>Вход</h2>
      <p class="login-hint">Пробные аккаунты: Фокс / 1111 · Лис / 2222 · Хвостик / 3333</p>
      <label>Имя пользователя
        <input type="text" name="login" autocomplete="username" required>
      </label>
      <label>Пароль
        <input type="password" name="password" autocomplete="current-password" required>
      </label>
      <p class="login-error" data-login-error hidden></p>
      <div class="login-acts">
        <button type="submit" class="btn btn-primary">Войти</button>
        <button type="button" class="btn btn-outline" data-login-cancel>Отмена</button>
      </div>
    </form>`;
  document.body.appendChild(box);
  box.querySelector("[data-login-cancel]")?.addEventListener("click", () => box.close());
  box.addEventListener("close", () => {
    const page = currentPage();
    if (!isSignedIn() && (FOX_AUTHOR_PAGES.has(page) || FOX_ADMIN_PAGES.has(page))) {
      location.href = "index.html";
    }
  });
  box.querySelector("[data-login-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    const err = box.querySelector("[data-login-error]");
    const user = findDemoUser(form.login.value, form.password.value);
    if (!user) {
      if (err) {
        err.hidden = false;
        err.textContent = "Неверное имя или пароль.";
      }
      return;
    }
    applyDemoSession(user);
    const dest = afterLoginPath(user);
    box.close();
    location.href = dest;
  });
  return box;
}

function openLoginDialog() {
  const box = ensureLoginDialog();
  const form = box.querySelector("[data-login-form]");
  const err = box.querySelector("[data-login-error]");
  if (form) form.reset();
  if (err) err.hidden = true;
  if (typeof box.showModal === "function") box.showModal();
}

function enforcePageAccess() {
  const page = currentPage();
  const signed = isSignedIn();
  const role = currentUserRole();
  if (FOX_ADMIN_PAGES.has(page) && !isSiteAdmin()) {
    if (!signed) {
      sessionStorage.setItem("foxtoria-after-login", page);
      openLoginDialog();
      return;
    }
    location.replace("404.html");
    return;
  }
  if (FOX_AUTHOR_PAGES.has(page) && (!signed || role === "reader")) {
    if (!signed) {
      sessionStorage.setItem("foxtoria-after-login", page);
      openLoginDialog();
      return;
    }
    location.replace("404.html");
  }
}

function canDeletePostedItem(item) {
  if (typeof isSiteAdmin === "function" && isSiteAdmin()) return true;
  if (item?.own) return true;
  const id = String(item?.id || "");
  if (id.startsWith("local-") || id.startsWith("demo-")) return true;
  const handle = String(item?.username || item?.handle || "")
    .replace(/^@/, "")
    .toLowerCase();
  const name = String(item?.author || "").trim().toLowerCase();
  const meH = String(typeof ownerHandle === "function" ? ownerHandle() : "").toLowerCase();
  const meN = String(typeof ownerDisplayName === "function" ? ownerDisplayName() : "").toLowerCase();
  if (handle && handle === meH) return true;
  if (name && (name === meN || name === "вы")) return true;
  return false;
}

const FOX_PREFS_KEY = "foxtoria-prefs";
const FOX_PREFS_DEFAULTS = {
  autosave: true,
  notifComments: true,
  notifReplies: true,
  notifReviews: true,
  notifFollowers: true,
  notifAuthors: true,
  notifWorks: true,
  notifCollections: true,
  notifBlog: true,
  notifMentions: true,
  privacyMessages: "followers",
  privacyProfile: "all",
  privacyPacks: "public",
  privacyOnline: true,
  adultBlur: false,
  hideGenres: [],
  hideFormats: [],
  hideWarnings: [],
  hideKinks: [],
};

function loadFoxPrefs() {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(FOX_PREFS_KEY) || "{}") || {};
  } catch {
    stored = {};
  }
  return { ...FOX_PREFS_DEFAULTS, ...stored };
}

function saveFoxPrefs(prefs) {
  localStorage.setItem(FOX_PREFS_KEY, JSON.stringify({ ...FOX_PREFS_DEFAULTS, ...prefs }));
}

function foxPref(key) {
  const prefs = loadFoxPrefs();
  return prefs[key];
}

const OWNER_AVATAR_DEFAULT = "assets/test/avatar-1.png";

function ownerHandle() {
  if (!isSignedIn()) return "guest";
  const raw = loadProfileStore();
  return String(raw.handle || "").replace(/^@/, "").trim() || "guest";
}

function ownerDisplayName() {
  if (!isSignedIn()) return "Гость";
  const raw = loadProfileStore();
  return String(raw.name || "").trim() || "Вы";
}

function ownerAvatarSrc() {
  const raw = loadProfileStore();
  const src = String(raw.avatar || "").trim();
  return src || OWNER_AVATAR_DEFAULT;
}

function foxEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function mentionHtml(text) {
  const me = ownerHandle().toLowerCase();
  return foxEscape(text).replace(/@([a-zA-Z0-9_]{1,24})/g, (_, handle) => {
    const href = handle.toLowerCase() === me ? "profile.html" : `profile.html?u=${encodeURIComponent(handle)}`;
    return `<a class="user-link text-mention" href="${href}">@${handle}</a>`;
  });
}

function applyOwnerAvatar(root = document) {
  const src = ownerAvatarSrc();
  root.querySelectorAll(".header-avatar, .profile-ava img, [data-owner-avatar]").forEach((img) => {
    if (img instanceof HTMLImageElement) img.src = src;
  });
}

function currentPage() {
  const file = location.pathname.split("/").pop();
  return file && file !== "" ? file : "index.html";
}

function isUiIconImg(img) {
  if (!(img instanceof HTMLImageElement)) return false;
  const src = img.getAttribute("src") || "";
  if (!/assets\/(svg|deco)\//.test(src)) return false;
  if (/\.(png|jpe?g|webp)(\?|$)/i.test(src)) return false;
  if (/уголок|corner\.svg|ramka|разделитель1|hfpltkbntkm|дуфа2|lupa\.svg|lupa1/.test(src)) {
    return false;
  }
  if (/flower\.svg|книга\.svg/.test(src) && !img.closest(".feature-item")) {
    return false;
  }
  if (
    img.closest(
      ".logo, .profile-ava, .header-avatar, .sidebar-ornament, .studio-nav-art, .feed-corner, .work-cover, .story-cover, .linear-work-cover, .cabinet-cover-frame, .cabinet-fox, .blog-post-cover, .news-cover, .news-hero-art, .tile-image, .collection-cover, .featured-cover, .author-avatar, .cover-fallback, .footer-art, .news-editor, .news-comment-ava, .lost-art, .lost-art-wrap, .msg-ava, .help-msg-ava, .help-chat-head, .help-ava, .linear-inline-art"
    )
  ) {
    return false;
  }
  return true;
}

const ICON_CACHE = "99";

function paintUiIcon(img) {
  const src = (img.getAttribute("src") || "").split("?")[0];
  const el = document.createElement("span");
  el.className = ["ui-icon", img.className].filter(Boolean).join(" ");
  if (/(?:^|\/)(?:share|флаг|delete|удалить)\.svg$/i.test(src)) el.classList.add("ui-icon-accent");
  el.setAttribute("aria-hidden", "true");
  el.style.setProperty("--icon", `url("${encodeURI(src)}?v=${ICON_CACHE}")`);
  img.replaceWith(el);
  return el;
}

function hydrateUiIcons(root = document) {
  const nodes = [];
  if (root instanceof HTMLImageElement) nodes.push(root);
  if (root.querySelectorAll) nodes.push(...root.querySelectorAll("img"));
  nodes.filter(isUiIconImg).forEach(paintUiIcon);
}

function setUiIcon(el, src) {
  if (!el) return;
  const clean = String(src || "").split("?")[0];
  if (el.tagName === "IMG") {
    el.setAttribute("src", src);
    if (isUiIconImg(el)) paintUiIcon(el);
    return;
  }
  el.style.setProperty("--icon", `url("${encodeURI(clean)}?v=${ICON_CACHE}")`);
}

document.addEventListener("DOMContentLoaded", function paintIcons() {
  hydrateUiIcons(document);
  if (!document.body) return;
  new MutationObserver((records) => {
    records.forEach((rec) => {
      rec.addedNodes.forEach((node) => {
        if (node.nodeType === 1) hydrateUiIcons(node);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
});

window.FoxAudio = (function foxAudio() {
  const DB_NAME = "foxstoria-audio";
  const STORE = "tracks";
  const MAX_BYTES = 8 * 1024 * 1024;

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function withStore(mode, fn) {
    return openDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, mode);
          const store = tx.objectStore(STORE);
          const req = fn(store);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        })
    );
  }

  function key(workId, partId) {
    return `${String(workId || "local")}:${String(partId || "")}`;
  }

  function validate(file) {
    if (!file) return { ok: false, error: "Выберите аудиофайл." };
    const name = String(file.name || "");
    const type = String(file.type || "");
    const byExt = /\.(mp3|ogg|oga|m4a|aac)$/i.test(name);
    if (!byExt && !/^audio\//i.test(type)) {
      return { ok: false, error: "Подходят MP3, OGG, M4A или AAC." };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, error: "Файл больше 8 МБ. Сожмите трек или выберите другой." };
    }
    return { ok: true };
  }

  function put(id, file) {
    return withStore("readwrite", (store) =>
      store.put({ name: file.name, type: file.type, blob: file }, id)
    );
  }

  function get(id) {
    if (!id) return Promise.resolve(null);
    return withStore("readonly", (store) => store.get(id)).then((row) => row || null);
  }

  function remove(id) {
    if (!id) return Promise.resolve();
    return withStore("readwrite", (store) => store.delete(id));
  }

  function listAll() {
    return openDb().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readonly");
          const store = tx.objectStore(STORE);
          const out = [];
          const req = store.openCursor();
          req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
              const row = cursor.value || {};
              out.push({
                id: String(cursor.key || ""),
                name: row.name || "",
                bytes: row.blob && typeof row.blob.size === "number" ? row.blob.size : 0,
              });
              cursor.continue();
            } else resolve(out);
          };
          req.onerror = () => reject(req.error);
        })
    );
  }

  return { MAX_BYTES, key, validate, put, get, remove, listAll };
})();

window.FoxMusicLink = (function foxMusicLink() {
  function parse(raw) {
    const text = String(raw || "").trim();
    if (!text) return null;
    const fromIframe = text.match(/\bsrc=["']([^"']+)["']/i);
    let href = fromIframe ? fromIframe[1] : text;
    if (href.startsWith("//")) href = "https:" + href;
    if (/^spotify:/i.test(href)) {
      const spot = href.match(/^spotify:(track|album|playlist|episode|show|artist):([a-zA-Z0-9]+)/i);
      if (!spot) return null;
      href = `https://open.spotify.com/${spot[1]}/${spot[2]}`;
    }
    let url;
    try {
      url = new URL(href.includes("://") ? href : `https://${href}`);
    } catch {
      return null;
    }
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host.endsWith("spotify.com")) {
      const match = url.pathname.match(/(?:intl-[a-z]{2}\/)?(?:embed\/)?(track|album|playlist|episode|show|artist)\/([a-zA-Z0-9]+)/i);
      if (!match) return null;
      const kind = match[1].toLowerCase();
      return {
        provider: "spotify",
        label: "Spotify",
        kind,
        href: url.href,
        embed: `https://open.spotify.com/embed/${kind}/${match[2]}?utm_source=generator`,
        height: kind === "track" || kind === "episode" ? 152 : 352,
      };
    }

    if (host === "vk.com" || host === "m.vk.com" || host === "vk.ru") {
      const path = url.pathname.match(/\/music\/(playlist|album)\/(-?\d+)_(\d+)/);
      const z = url.searchParams.get("z") || "";
      const zList = z.match(/audio_playlist(-?\d+)_(\d+)/);
      const zTrack = z.match(/^audio(-?\d+)_(\d+)$/);
      if (path || zList) {
        const oid = path ? path[2] : zList[1];
        const pid = path ? path[3] : zList[2];
        return {
          provider: "vk",
          label: "ВКонтакте",
          kind: path ? path[1] : "playlist",
          href: url.href,
          embed: `https://vk.com/widget_playlist.php?oid=${oid}&pid=${pid}`,
          height: 360,
        };
      }
      if (zTrack) {
        return {
          provider: "vk",
          label: "ВКонтакте",
          kind: "track",
          href: `https://vk.com/audio?z=audio${zTrack[1]}_${zTrack[2]}`,
          embed: "",
          height: 72,
          external: true,
        };
      }
      return null;
    }

    if (host.includes("music.yandex")) {
      const albumTrack = url.pathname.match(/\/album\/(\d+)(?:\/track\/(\d+))?/);
      if (albumTrack?.[2]) {
        return {
          provider: "yandex",
          label: "Яндекс Музыка",
          kind: "track",
          href: url.href,
          embed: `https://music.yandex.ru/iframe/#track/${albumTrack[2]}/${albumTrack[1]}`,
          height: 180,
        };
      }
      if (albumTrack?.[1]) {
        return {
          provider: "yandex",
          label: "Яндекс Музыка",
          kind: "album",
          href: url.href,
          embed: `https://music.yandex.ru/iframe/#album/${albumTrack[1]}`,
          height: 400,
        };
      }
      const list = url.pathname.match(/\/users\/([^/]+)\/playlists\/(\d+)/);
      if (list) {
        return {
          provider: "yandex",
          label: "Яндекс Музыка",
          kind: "playlist",
          href: url.href,
          embed: `https://music.yandex.ru/iframe/#playlist/${list[1]}/${list[2]}`,
          height: 400,
        };
      }
    }
    return null;
  }

  function ensureDialog() {
    let box = document.getElementById("music-link-dialog");
    if (box) return box;
    box = document.createElement("dialog");
    box.id = "music-link-dialog";
    box.className = "music-link-dialog";
    box.innerHTML = `<form method="dialog" class="music-link-form">
      <h2>Музыка главы</h2>
      <p>Файл занимает лимит кабинета. Ссылка на Spotify, ВКонтакте или Яндекс Музыку — нет, можно целый плейлист.</p>
      <label>Ссылка на трек, альбом или плейлист
        <input type="url" name="embed" placeholder="https://open.spotify.com/playlist/…">
      </label>
      <p class="music-link-status profile-meta" data-music-status></p>
      <div class="admin-reason-acts">
        <button type="submit" class="btn btn-primary" value="link">Подключить</button>
        <button type="submit" class="btn btn-outline" value="file">Файл с компьютера</button>
        <button type="submit" class="btn btn-ghost" value="clear">Убрать</button>
        <button type="button" class="btn btn-ghost" data-music-cancel>Отмена</button>
      </div>
    </form>`;
    document.body.appendChild(box);
    box.querySelector("[data-music-cancel]")?.addEventListener("click", () => box.close());
    return box;
  }

  function ask(part, opts) {
    const box = ensureDialog();
    const form = box.querySelector("form");
    const status = box.querySelector("[data-music-status]");
    const heading = form.querySelector("h2");
    const field = form.embed;
    if (heading) heading.textContent = opts?.title || "Музыка главы";
    field.value = part?.audioEmbed || "";
    const bits = [];
    if (part?.audioEmbed) {
      const info = parse(part.audioEmbed);
      bits.push(info ? `${info.label}: ${info.kind}` : "Внешний плеер подключён");
    }
    if (part?.audioKey) bits.push(part.audioName ? `Файл: ${part.audioName}` : "Загружен файл");
    if (status) status.textContent = bits.join(" · ") || "Пока ничего не прикреплено.";
    return new Promise((resolve) => {
      const onClose = () => {
        box.removeEventListener("close", onClose);
        resolve(box.returnValue || "cancel");
      };
      box.addEventListener("close", onClose);
      form.onsubmit = (event) => {
        const submitter = event.submitter;
        const action = submitter?.value || "link";
        if (action === "link") {
          event.preventDefault();
          const info = parse(field.value);
          if (!info) {
            window.alert("Нужна ссылка Spotify, ВКонтакте или Яндекс Музыки.");
            return;
          }
          box._picked = field.value.trim();
          box.returnValue = "link";
          box.close();
          return;
        }
        box.returnValue = action;
      };
      box._picked = "";
      box.returnValue = "cancel";
      if (typeof box.showModal === "function") box.showModal();
      else resolve("cancel");
    }).then((action) => ({ action, url: box._picked || field.value.trim() }));
  }

  async function apply(part, result, opts) {
    if (!part || !result) return false;
    if (result.action === "cancel") return false;
    if (result.action === "file") return "file";
    if (result.action === "clear") {
      if (part.audioKey && window.FoxAudio) FoxAudio.remove(part.audioKey);
      part.audioKey = "";
      part.audioName = "";
      part.audioEmbed = "";
      opts?.onChange?.();
      return true;
    }
    if (result.action === "link") {
      const info = parse(result.url);
      if (!info) return false;
      if (part.audioKey && window.FoxAudio) {
        const drop = window.confirm("Файл в кабинете больше не нужен — удалить его и освободить место?");
        if (drop) {
          FoxAudio.remove(part.audioKey);
          part.audioKey = "";
        }
      }
      part.audioEmbed = info.href;
      part.audioName = info.label + (info.kind ? ` · ${info.kind}` : "");
      opts?.onChange?.();
      return true;
    }
    return false;
  }

  return { parse, ask, apply };
})();

window.FoxQuota = (function foxQuota() {
  const FILE_MAX = 8 * 1024 * 1024;
  const PLANS = {
    free: {
      id: "free",
      name: "FoxStoria Free",
      storage: 500 * 1024 * 1024,
      chapterImages: 5,
      workCovers: 1,
    },
    plus: {
      id: "plus",
      name: "FoxStoria+",
      storage: 5 * 1024 * 1024 * 1024,
      chapterImages: 10,
      workCovers: 1,
    },
    pro: {
      id: "pro",
      name: "FoxStoria Pro",
      storage: 10 * 1024 * 1024 * 1024,
      chapterImages: 20,
      workCovers: 1,
    },
  };

  function planId() {
    try {
      const profile = JSON.parse(localStorage.getItem("foxtoria-profile") || "{}") || {};
      const id = String(profile.plan || "free").toLowerCase();
      return PLANS[id] ? id : "free";
    } catch {
      return "free";
    }
  }

  function limits() {
    return PLANS[planId()];
  }

  function allPlans() {
    return [PLANS.free, PLANS.plus, PLANS.pro];
  }

  function formatBytes(n) {
    const value = Math.max(0, Number(n) || 0);
    if (value < 1024) return `${Math.round(value)} Б`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1).replace(".0", "")} КБ`;
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1).replace(".0", "")} МБ`;
    return `${(value / (1024 * 1024 * 1024)).toFixed(2).replace(/\.?0+$/, "")} ГБ`;
  }

  function dataUrlBytes(src) {
    const text = String(src || "");
    if (!text.startsWith("data:")) return 0;
    const b64 = text.split(",")[1] || "";
    const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
    return Math.max(0, Math.floor((b64.length * 3) / 4) - pad);
  }

  function imgsInHtml(html) {
    const match = String(html || "").match(/<img\b/gi);
    return match ? match.length : 0;
  }

  function eachDataUrl(src, visit) {
    const text = String(src || "");
    if (text.startsWith("data:")) visit(text);
  }

  function eachHtmlDataUrls(html, visit) {
    String(html || "").replace(/<img\b[^>]*src=["']([^"']+)["']/gi, (_, src) => {
      eachDataUrl(src, visit);
      return "";
    });
  }

  function chapterImageCount(kind, part, story) {
    if (kind === "messenger") {
      return (part?.cover ? 1 : 0) + (Array.isArray(part?.images) ? part.images.length : 0);
    }
    if (kind === "linear") {
      return (part?.cover ? 1 : 0) + imgsInHtml(part?.html);
    }
    const scene = part;
    if (!scene) return 0;
    const cid = scene.chapterId;
    const scenes = (story?.scenes || []).filter((item) =>
      cid ? item.chapterId === cid : item.id === scene.id
    );
    return scenes.reduce((sum, item) => {
      const blocks = Array.isArray(item.blocks) ? item.blocks : [];
      const blockImgs = blocks.filter((block) => block.image || block.type === "image").length;
      return sum + (item.background ? 1 : 0) + imgsInHtml(item.html) + blockImgs;
    }, 0);
  }

  function parseJson(raw) {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async function usage() {
    const covers = { bytes: 0 };
    const art = { bytes: 0 };
    const music = { bytes: 0 };
    const mine = window.FoxWorks ? FoxWorks.load() : [];
    const ids = new Set(mine.map((work) => String(work.id || "")));

    function addCover(src) {
      covers.bytes += dataUrlBytes(src);
    }
    function addArt(src) {
      art.bytes += dataUrlBytes(src);
    }

    for (const work of mine) {
      addCover(work.cover);
      const type = window.FoxWorks
        ? FoxWorks.normalizeStoryType(work.story_type)
        : String(work.story_type || "");
      let store = null;
      try {
        if (type === "linear") store = parseJson(localStorage.getItem(FoxWorks.linearStore(work.id)));
        else if (type === "messenger") store = parseJson(localStorage.getItem(FoxWorks.messengerStore(work.id)));
        else store = parseJson(localStorage.getItem(FoxWorks.mapStore(work.id)));
      } catch {
        store = null;
      }
      if (!store) continue;
      if (type === "linear") {
        (store.chapters || []).forEach((chapter) => {
          addCover(chapter.cover);
          eachHtmlDataUrls(chapter.html, addArt);
        });
      } else if (type === "messenger") {
        (store.chapters || []).forEach((chapter) => {
          addCover(chapter.cover);
          (chapter.images || []).forEach(addArt);
        });
      } else {
        (store.scenes || []).forEach((scene) => {
          addCover(scene.background);
          eachHtmlDataUrls(scene.html, addArt);
          (scene.blocks || []).forEach((block) => addArt(block.image));
        });
      }
    }

    if (window.FoxAudio?.listAll) {
      try {
        const tracks = await FoxAudio.listAll();
        tracks.forEach((track) => {
          const workId = String(track.id || "").split(":")[0];
          if (ids.has(workId)) music.bytes += track.bytes || 0;
        });
      } catch {
        /* ignore */
      }
    }

    const total = covers.bytes + art.bytes + music.bytes;
    const cap = limits().storage;
    return {
      covers: covers.bytes,
      art: art.bytes,
      music: music.bytes,
      total,
      cap,
      pct: cap ? Math.min(100, (total / cap) * 100) : 0,
      share: {
        covers: total ? (covers.bytes / total) * 100 : 0,
        art: total ? (art.bytes / total) * 100 : 0,
        music: total ? (music.bytes / total) * 100 : 0,
      },
      ofCap: {
        covers: cap ? (covers.bytes / cap) * 100 : 0,
        art: cap ? (art.bytes / cap) * 100 : 0,
        music: cap ? (music.bytes / cap) * 100 : 0,
      },
    };
  }

  function checkFile(file) {
    if (!file) return { ok: false, error: "Выберите файл." };
    if (file.size > FILE_MAX) {
      return { ok: false, error: "Файл больше 8 МБ. Сожмите его или выберите другой." };
    }
    return { ok: true };
  }

  function compress(file, role) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve("");
      reader.onload = () => {
        const fallback = String(reader.result || "");
        const img = new Image();
        img.onload = () => {
          const maxEdge = role === "art" ? 1400 : 1600;
          const scale = Math.min(1, maxEdge / img.width, maxEdge / img.height);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          try {
            resolve(canvas.toDataURL("image/jpeg", 0.82));
          } catch {
            resolve(fallback);
          }
        };
        img.onerror = () => resolve(fallback);
        img.src = fallback;
      };
      reader.readAsDataURL(file);
    });
  }

  async function ensureStorage(addBytes, replaceBytes) {
    const used = await usage();
    const next = used.total - (replaceBytes || 0) + (addBytes || 0);
    if (next > used.cap) {
      return {
        ok: false,
        error: `Не хватает места в хранилище автора (${formatBytes(used.cap)} на тарифе ${limits().name}).`,
      };
    }
    return { ok: true };
  }

  async function take(file, opts) {
    const options = opts || {};
    const role = options.role || "art";
    const lim = limits();
    if (!file || !String(file.type || "").startsWith("image/")) {
      return { ok: false, error: "Нужно изображение." };
    }
    const fileCheck = checkFile(file);
    if (!fileCheck.ok) return fileCheck;
    const replacing = Boolean(options.replaceSrc);
    if (role !== "work-cover" && !replacing && (options.currentCount || 0) >= lim.chapterImages) {
      return {
        ok: false,
        error: `На главу можно до ${lim.chapterImages} изображений вместе с обложкой главы (${lim.name}).`,
      };
    }
    const data = await compress(file, role);
    if (!data) return { ok: false, error: "Не удалось обработать изображение." };
    const space = await ensureStorage(dataUrlBytes(data), dataUrlBytes(options.replaceSrc));
    if (!space.ok) return space;
    return { ok: true, data };
  }

  async function takeAudio(file, replaceBytes) {
    if (!window.FoxAudio) return { ok: false, error: "Аудио недоступно." };
    const check = FoxAudio.validate(file);
    if (!check.ok) return check;
    return ensureStorage(file.size, replaceBytes || 0);
  }

  return {
    FILE_MAX,
    PLANS,
    planId,
    limits,
    allPlans,
    formatBytes,
    dataUrlBytes,
    chapterImageCount,
    usage,
    take,
    takeAudio,
  };
})();

window.FoxChapterPlayer = (function foxChapterPlayer() {
  let root = null;
  let audio = null;
  let objectUrl = "";

  function els() {
    if (!root) return {};
    return {
      play: root.querySelector("[data-player-play]"),
      pause: root.querySelector("[data-player-pause]"),
      stop: root.querySelector("[data-player-stop]"),
      name: root.querySelector("[data-player-name]"),
      acts: root.querySelector(".chapter-player-acts"),
      embed: root.querySelector("[data-player-embed]"),
    };
  }

  function paint() {
    if (!root || !audio) return;
    const playing = !audio.paused && !audio.ended;
    const { play, pause } = els();
    if (play) play.hidden = playing;
    if (pause) pause.hidden = !playing;
  }

  function showNative(on) {
    const { acts, embed, name } = els();
    if (acts) acts.hidden = !on;
    if (name) name.hidden = !on;
    if (embed) {
      embed.hidden = on;
      if (on) embed.innerHTML = "";
    }
    root?.classList.toggle("is-embed", !on);
  }

  function clear() {
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = "";
    }
    if (root) root.hidden = true;
    showNative(true);
    const { name } = els();
    if (name) name.textContent = "";
    paint();
  }

  function bind(node) {
    root = node;
    if (!root) return;
    audio = root.querySelector("audio");
    if (!root.querySelector("[data-player-embed]")) {
      const box = document.createElement("div");
      box.className = "chapter-player-embed";
      box.setAttribute("data-player-embed", "");
      box.hidden = true;
      root.appendChild(box);
    }
    if (!audio) return;
    audio.loop = true;
    const { play, pause, stop } = els();
    play?.addEventListener("click", () => audio.play().catch(() => {}));
    pause?.addEventListener("click", () => audio.pause());
    stop?.addEventListener("click", () => {
      audio.pause();
      audio.currentTime = 0;
      paint();
    });
    audio.addEventListener("play", paint);
    audio.addEventListener("pause", paint);
    audio.addEventListener("ended", paint);
    paint();
  }

  function loadEmbed(info, label) {
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = "";
    }
    showNative(false);
    root.hidden = false;
    const { embed, name } = els();
    if (name) name.textContent = label || info.label;
    if (!embed) return;
    embed.replaceChildren();
    if (info.external || !info.embed) {
      const link = document.createElement("a");
      link.className = "chapter-player-ext";
      link.href = info.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = `Слушать ${info.label}`;
      embed.appendChild(link);
      return;
    }
    const frame = document.createElement("iframe");
    frame.title = info.label;
    frame.src = info.embed;
    frame.height = String(info.height || 152);
    frame.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    frame.loading = "lazy";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    embed.appendChild(frame);
  }

  async function load(key, label, embedUrl) {
    if (!root) return;
    const info = window.FoxMusicLink ? FoxMusicLink.parse(embedUrl) : null;
    if (info) {
      loadEmbed(info, label);
      return;
    }
    if (!audio || !window.FoxAudio) {
      if (!key) clear();
      return;
    }
    if (!key) {
      clear();
      return;
    }
    const row = await FoxAudio.get(key);
    if (!row?.blob) {
      clear();
      return;
    }
    showNative(true);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(row.blob);
    const wasPlaying = !audio.paused && audio.src;
    audio.src = objectUrl;
    audio.loop = true;
    root.hidden = false;
    const { name } = els();
    if (name) name.textContent = label || row.name || "Музыка главы";
    if (wasPlaying) audio.play().catch(() => {});
    else {
      audio.pause();
      audio.currentTime = 0;
    }
    paint();
  }

  return { bind, load, clear };
})();

window.FoxPay = (function foxPay() {
  const TIERS_KEY = "foxtoria-sub-tiers";
  const SUBS_KEY = "foxtoria-my-subs";
  const MONEY_KEY = "foxtoria-author-money";
  const CHANGES_KEY = "foxtoria-card-changes";
  const WALLET_KEY = "foxtoria-wallet";
  const MAX_TIERS = 5;
  const MIN_RUB = 50;
  const SUB_FEE = 0.1;
  const GIFT_FEE = 0.2;

  function nick(value) {
    return String(value || "")
      .replace(/^@/, "")
      .trim()
      .toLowerCase();
  }

  function splitSlugs(value) {
    return String(value || "")
      .split(",")
      .map(nick)
      .filter(Boolean);
  }

  function loadJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function demoTiers(handle) {
    if (nick(handle) !== "moonwander") return [];
    return [
      { id: "t1", name: "Лиса", price: 50 },
      { id: "t2", name: "Хвост", price: 150 },
      { id: "t3", name: "Костёр", price: 400 },
    ];
  }

  function loadTiers(handle) {
    const map = loadJson(TIERS_KEY, {});
    const saved = Array.isArray(map[nick(handle)]) ? map[nick(handle)] : [];
    const list = saved.length ? saved : demoTiers(handle);
    return list.slice(0, MAX_TIERS).map((tier, index) => ({
      id: String(tier.id || `t${index + 1}`),
      name: String(tier.name || `Уровень ${index + 1}`).trim() || `Уровень ${index + 1}`,
      price: Math.max(MIN_RUB, Math.round(Number(tier.price) || MIN_RUB)),
      level: index + 1,
    }));
  }

  function saveTiers(handle, tiers) {
    const map = loadJson(TIERS_KEY, {});
    map[nick(handle)] = (tiers || []).slice(0, MAX_TIERS).map((tier, index) => ({
      id: String(tier.id || `t${Date.now().toString(36)}${index}`),
      name: String(tier.name || "").trim() || `Уровень ${index + 1}`,
      price: Math.max(MIN_RUB, Math.round(Number(tier.price) || MIN_RUB)),
    }));
    saveJson(TIERS_KEY, map);
    return loadTiers(handle);
  }

  function mySubs() {
    const map = loadJson(SUBS_KEY, {});
    return map && typeof map === "object" ? map : {};
  }

  function subTo(handle) {
    const row = mySubs()[nick(handle)];
    if (!row) return null;
    return { level: Number(row.level) || 0, name: row.name || "", price: Number(row.price) || 0 };
  }

  function levelOn(handle) {
    return subTo(handle)?.level || 0;
  }

  function authorNet(price) {
    const gross = Math.max(MIN_RUB, Math.round(Number(price) || 0));
    const fee = Math.round(gross * SUB_FEE);
    return { gross, fee, net: gross - fee };
  }

  function giftNet(price) {
    const gross = Math.max(0, Math.round(Number(price) || 0));
    const fee = Math.round(gross * GIFT_FEE);
    return { gross, fee, net: gross - fee };
  }

  function chargeWallet(amount, title, kind) {
    const data = loadJson(WALLET_KEY, null) || { balance: 0, ops: [], methods: [] };
    const n = Math.round(Number(amount) || 0);
    data.balance = (Number(data.balance) || 0) + n;
    data.ops = [
      {
        id: `op-${Date.now().toString(36)}`,
        kind: kind || (n < 0 ? "buy" : "topup"),
        title,
        when: new Date().toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }),
        at: new Date().toISOString(),
        amount: n,
      },
      ...(Array.isArray(data.ops) ? data.ops : []),
    ];
    saveJson(WALLET_KEY, data);
    return data.balance;
  }

  function actor() {
    const slug = nick(typeof ownerHandle === "function" ? ownerHandle() : "") || "reader";
    const display = String(typeof ownerDisplayName === "function" ? ownerDisplayName() : "").trim() || "Читатель";
    return { slug, display };
  }

  function emptyMoney() {
    return { fans: {}, events: [] };
  }

  function demoMoney() {
    const fans = {
      ivyreads: { slug: "ivyreads", display: "Плющ", level: 1, name: "Лиса", price: 50, since: "2026-06-02T12:00:00" },
      nightowl: { slug: "nightowl", display: "Ночная сова", level: 2, name: "Хвост", price: 150, since: "2026-06-18T19:10:00" },
      tealeaf: { slug: "tealeaf", display: "Чайный лист", level: 3, name: "Костёр", price: 400, since: "2026-07-04T09:40:00" },
      frostbite: { slug: "frostbite", display: "Иней", level: 1, name: "Лиса", price: 50, since: "2026-07-11T16:22:00" },
      paperfox: { slug: "paperfox", display: "Бумажная лиса", level: 2, name: "Хвост", price: 150, since: "2026-07-21T11:05:00" },
      emberkin: { slug: "emberkin", display: "Уголёк", level: 3, name: "Костёр", price: 400, since: "2026-08-01T08:30:00" },
      quietbay: { slug: "quietbay", display: "Тихая бухта", level: 1, name: "Лиса", price: 50, since: "2026-08-08T14:18:00" },
      goldthread: { slug: "goldthread", display: "Золотая нить", level: 2, name: "Хвост", price: 150, since: "2026-08-14T20:02:00" },
      mossroom: { slug: "mossroom", display: "Мох", level: 1, name: "Лиса", price: 50, since: "2026-08-19T10:44:00" },
      starwell: { slug: "starwell", display: "Колодец звёзд", level: 2, name: "Хвост", price: 150, since: "2026-08-22T17:55:00" },
      riverink: { slug: "riverink", display: "Речные чернила", level: 1, name: "Лиса", price: 50, since: "2026-08-25T12:12:00" },
      duskbell: { slug: "duskbell", display: "Вечерний колокол", level: 3, name: "Костёр", price: 400, since: "2026-08-27T21:08:00" },
      paleoak: { slug: "paleoak", display: "Бледный дуб", level: 1, name: "Лиса", price: 50, since: "2026-08-28T09:16:00" },
      softloom: { slug: "softloom", display: "Мягкий стан", level: 2, name: "Хвост", price: 150, since: "2026-08-29T18:40:00" },
      lanternjay: { slug: "lanternjay", display: "Фонарный сой", level: 1, name: "Лиса", price: 50, since: "2026-08-30T07:28:00" },
      copperash: { slug: "copperash", display: "Медная зола", level: 2, name: "Хвост", price: 150, since: "2026-08-30T15:03:00" },
      wildhearth: { slug: "wildhearth", display: "Дикий очаг", level: 3, name: "Костёр", price: 400, since: "2026-08-31T11:20:00" },
      maplesong: { slug: "maplesong", display: "Кленовый мотив", level: 1, name: "Лиса", price: 50, since: "2026-08-31T16:45:00" },
    };
    const events = [
      { id: "ev-18", kind: "subscribe", slug: "maplesong", display: "Кленовый мотив", price: 50, net: 45, name: "Лиса", at: "2026-08-31T16:45:00" },
      { id: "ev-17", kind: "gift", slug: "emberkin", display: "Уголёк", price: 199, net: 159, title: "Лисья свеча", at: "2026-08-31T13:10:00" },
      { id: "ev-16", kind: "subscribe", slug: "wildhearth", display: "Дикий очаг", price: 400, net: 360, name: "Костёр", at: "2026-08-31T11:20:00" },
      { id: "ev-15", kind: "renew", slug: "tealeaf", display: "Чайный лист", price: 400, net: 360, name: "Костёр", at: "2026-08-30T19:00:00" },
      { id: "ev-14", kind: "subscribe", slug: "copperash", display: "Медная зола", price: 150, net: 135, name: "Хвост", at: "2026-08-30T15:03:00" },
      { id: "ev-13", kind: "cancel", slug: "oldpine", display: "Старая сосна", price: 50, net: 0, name: "Лиса", at: "2026-08-30T12:22:00" },
      { id: "ev-12", kind: "subscribe", slug: "lanternjay", display: "Фонарный сой", price: 50, net: 45, name: "Лиса", at: "2026-08-30T07:28:00" },
      { id: "ev-11", kind: "gift", slug: "nightowl", display: "Ночная сова", price: 99, net: 79, title: "Чашка какао", at: "2026-08-29T21:14:00" },
      { id: "ev-10", kind: "subscribe", slug: "softloom", display: "Мягкий стан", price: 150, net: 135, name: "Хвост", at: "2026-08-29T18:40:00" },
      { id: "ev-9", kind: "renew", slug: "paperfox", display: "Бумажная лиса", price: 150, net: 135, name: "Хвост", at: "2026-08-28T18:00:00" },
      { id: "ev-8", kind: "subscribe", slug: "paleoak", display: "Бледный дуб", price: 50, net: 45, name: "Лиса", at: "2026-08-28T09:16:00" },
      { id: "ev-7", kind: "subscribe", slug: "duskbell", display: "Вечерний колокол", price: 400, net: 360, name: "Костёр", at: "2026-08-27T21:08:00" },
      { id: "ev-6", kind: "gift", slug: "ivyreads", display: "Плющ", price: 349, net: 279, title: "Золотой листок", at: "2026-08-26T16:40:00" },
      { id: "ev-5", kind: "subscribe", slug: "riverink", display: "Речные чернила", price: 50, net: 45, name: "Лиса", at: "2026-08-25T12:12:00" },
      { id: "ev-4", kind: "cancel", slug: "drywell", display: "Сухой колодец", price: 150, net: 0, name: "Хвост", at: "2026-08-24T10:05:00" },
      { id: "ev-3", kind: "renew", slug: "nightowl", display: "Ночная сова", price: 150, net: 135, name: "Хвост", at: "2026-08-18T19:10:00" },
      { id: "ev-2", kind: "subscribe", slug: "goldthread", display: "Золотая нить", price: 150, net: 135, name: "Хвост", at: "2026-08-14T20:02:00" },
      { id: "ev-1", kind: "subscribe", slug: "quietbay", display: "Тихая бухта", price: 50, net: 45, name: "Лиса", at: "2026-08-08T14:18:00" },
    ];
    return { fans, events };
  }

  function loadMoney(handle) {
    const all = loadJson(MONEY_KEY, {});
    const key = nick(handle);
    if (!key) return emptyMoney();
    if (all[key] && typeof all[key] === "object") {
      return {
        fans: all[key].fans && typeof all[key].fans === "object" ? all[key].fans : {},
        events: Array.isArray(all[key].events) ? all[key].events : [],
      };
    }
    const pack = key === "moonwander" ? demoMoney() : emptyMoney();
    all[key] = pack;
    saveJson(MONEY_KEY, all);
    return pack;
  }

  function saveMoney(handle, pack) {
    const all = loadJson(MONEY_KEY, {});
    all[nick(handle)] = pack;
    saveJson(MONEY_KEY, all);
  }

  function logAuthorEvent(handle, row) {
    const key = nick(handle);
    if (!key || !row) return;
    const pack = loadMoney(key);
    pack.events = [row, ...(pack.events || [])].slice(0, 80);
    saveMoney(key, pack);
  }

  function eventWhen(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  }

  function eventLabel(kind) {
    if (kind === "gift") return "Новый подарок";
    if (kind === "cancel") return "Отмена подписки";
    if (kind === "renew") return "Продление подписки";
    return "Новая подписка";
  }

  function paidSubscriberCount(handle) {
    return Object.keys(loadMoney(handle).fans || {}).length;
  }

  function authorEvents(handle) {
    return loadMoney(handle).events || [];
  }

  function authorEarnings(handle) {
    const pack = loadMoney(handle);
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    let total = 0;
    let monthTotal = 0;
    let subs = 0;
    let gifts = 0;
    (pack.events || []).forEach((row) => {
      if (row.kind === "cancel") return;
      const net = Math.max(0, Math.round(Number(row.net) || 0));
      total += net;
      const at = new Date(row.at);
      if (!Number.isNaN(at.getTime()) && at.getMonth() === month && at.getFullYear() === year) monthTotal += net;
      if (row.kind === "gift") gifts += net;
      else subs += net;
    });
    return { total, month: monthTotal, subs, gifts, paid: Object.keys(pack.fans || {}).length };
  }

  function subscribe(handle, tier) {
    if (!tier) return false;
    const money = authorNet(tier.price);
    const prev = subTo(handle);
    const map = mySubs();
    map[nick(handle)] = { level: Number(tier.level) || 1, name: tier.name, price: money.gross };
    saveJson(SUBS_KEY, map);
    chargeWallet(-money.gross, `Подписка · ${tier.name}`, "sub");
    const who = actor();
    const pack = loadMoney(handle);
    pack.fans = pack.fans || {};
    pack.fans[who.slug] = {
      slug: who.slug,
      display: who.display,
      level: Number(tier.level) || 1,
      name: tier.name,
      price: money.gross,
      since: prev ? pack.fans[who.slug]?.since || new Date().toISOString() : new Date().toISOString(),
    };
    saveMoney(handle, pack);
    logAuthorEvent(handle, {
      id: `ev-${Date.now().toString(36)}`,
      kind: prev ? "renew" : "subscribe",
      slug: who.slug,
      display: who.display,
      price: money.gross,
      net: money.net,
      name: tier.name,
      at: new Date().toISOString(),
    });
    return true;
  }

  function payGift(amount, title, authorHandle) {
    const money = giftNet(amount);
    chargeWallet(-money.gross, title || "Подарок", "gift");
    if (authorHandle) {
      const who = actor();
      logAuthorEvent(authorHandle, {
        id: `ev-${Date.now().toString(36)}`,
        kind: "gift",
        slug: who.slug,
        display: who.display,
        price: money.gross,
        net: money.net,
        title: title || "Подарок",
        at: new Date().toISOString(),
      });
    }
    return money;
  }

  function unsubscribe(handle) {
    const prev = subTo(handle);
    const who = actor();
    const map = mySubs();
    delete map[nick(handle)];
    saveJson(SUBS_KEY, map);
    const pack = loadMoney(handle);
    const fan = pack.fans?.[who.slug];
    if (pack.fans) delete pack.fans[who.slug];
    saveMoney(handle, pack);
    const price = Number(prev?.price || fan?.price) || 0;
    logAuthorEvent(handle, {
      id: `ev-${Date.now().toString(36)}`,
      kind: "cancel",
      slug: who.slug,
      display: who.display,
      price,
      net: 0,
      name: prev?.name || fan?.name || "",
      at: new Date().toISOString(),
    });
  }

  function accessSlugs(work) {
    const slugs = [nick(work?.author_slug), ...splitSlugs(work?.coauthor)];
    return [...new Set(slugs.filter(Boolean))];
  }

  function isPaid(work) {
    return Boolean(work?.paid);
  }

  function minLevel(work) {
    const n = Math.round(Number(work?.paid_min_level) || 1);
    return Math.min(MAX_TIERS, Math.max(1, n));
  }

  function bestLevelFor(work) {
    return Math.max(0, ...accessSlugs(work).map(levelOn));
  }

  function canReadPaid(work) {
    if (!isPaid(work)) return true;
    const me = nick(typeof ownerHandle === "function" ? ownerHandle() : "");
    if (me && (accessSlugs(work).includes(me) || splitSlugs(work?.editor).includes(me))) return true;
    return bestLevelFor(work) >= minLevel(work);
  }

  function chapterUnlocked(work, index) {
    if (!isPaid(work) || Number(index) === 0) return true;
    return canReadPaid(work);
  }

  function sceneUnlocked(work, scene, start) {
    if (!isPaid(work)) return true;
    if (!scene) return canReadPaid(work);
    if (scene.isStart) return true;
    if (start && scene.chapterId && scene.chapterId === start.chapterId) return true;
    return canReadPaid(work);
  }

  function postUnlocked(authorHandle, post) {
    if (!post?.paid) return true;
    const me = nick(typeof ownerHandle === "function" ? ownerHandle() : "");
    if (me && me === nick(authorHandle)) return true;
    return levelOn(authorHandle) >= (Number(post.paid_min_level) || 1);
  }

  function markHTML(item) {
    if (!item?.paid && !item?.is_paid) return "";
    return `<span class="paid-mark" title="Платный доступ"><img src="assets/svg/деньга.svg" alt=""></span>`;
  }

  function logCardChange(work, text) {
    const rows = loadJson(CHANGES_KEY, []);
    rows.unshift({
      id: `chg-${Date.now().toString(36)}`,
      workId: work?.id || "",
      title: work?.title || "Работа",
      who: typeof ownerDisplayName === "function" ? ownerDisplayName() : "Соавтор",
      text: text || "Изменена карточка работы.",
      at: new Date().toISOString(),
    });
    saveJson(CHANGES_KEY, rows.slice(0, 40));
  }

  function cardChanges() {
    return loadJson(CHANGES_KEY, []);
  }

  function canEditCard(work) {
    if (!work) return false;
    if (typeof isSiteAdmin === "function" && isSiteAdmin()) return true;
    const me = nick(typeof ownerHandle === "function" ? ownerHandle() : "");
    if (!me) return false;
    if (nick(work.author_slug) === me) return true;
    if (splitSlugs(work.coauthor).includes(me)) return true;
    return false;
  }

  function canEditChapters(work) {
    if (!work) return false;
    if (typeof isSiteAdmin === "function" && isSiteAdmin()) return true;
    const me = nick(typeof ownerHandle === "function" ? ownerHandle() : "");
    if (!me) return false;
    if (canEditCard(work)) return true;
    return splitSlugs(work.editor).includes(me);
  }

  function formatRub(value) {
    return `${new Intl.NumberFormat("ru-RU").format(Math.round(Number(value) || 0))} ₽`;
  }

  function esc(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function fillLevelSelect(select, handle, selected) {
    if (!select) return;
    const tiers = loadTiers(handle);
    const max = Math.max(1, tiers.length || MAX_TIERS);
    const sel = Math.min(max, Math.max(1, Number(selected) || 1));
    select.innerHTML = Array.from({ length: max }, (_, index) => {
      const n = index + 1;
      const name = tiers[index]?.name || `Уровень ${n}`;
      return `<option value="${n}"${n === sel ? " selected" : ""}>${n} и выше · ${esc(name)}</option>`;
    }).join("");
  }

  function bindPaidFields(root, handle) {
    const form = root?.elements ? root : root?.querySelector?.("form") || root;
    if (!form) return;
    const paid = form.querySelector?.('[name="paid"]') || form.elements?.paid;
    const level = form.querySelector?.('[name="paid_min_level"]') || form.elements?.paid_min_level;
    fillLevelSelect(level, handle, level?.value);
    if (form.dataset && form.dataset.paidBound === "1") {
      if (level) level.disabled = !paid?.checked;
      return;
    }
    if (form.dataset) form.dataset.paidBound = "1";
    function sync() {
      if (level) level.disabled = !paid?.checked;
    }
    paid?.addEventListener("change", sync);
    sync();
  }

  function gateHTML(work) {
    const handle = accessSlugs(work)[0] || "";
    const min = minLevel(work);
    const tier = loadTiers(handle)[min - 1];
    const label = tier?.name || `уровень ${min}`;
    const href = handle ? `profile.html?u=${encodeURIComponent(handle)}` : "profile.html";
    return `<div class="paid-gate">
      ${markHTML({ paid: true })}
      <h2>Доступ по подписке</h2>
      <p>Карточка и первая глава открыты всем. Дальше нужен уровень «${esc(label)}» или выше. Подписка на редактора работу не открывает — достаточно автора или соавтора.</p>
      <a class="btn btn-primary" href="${esc(href)}">Выбрать подписку</a>
    </div>`;
  }

  function postGateHTML(authorHandle, post) {
    const min = Math.max(1, Number(post?.paid_min_level) || 1);
    const tier = loadTiers(authorHandle)[min - 1];
    const label = tier?.name || `уровень ${min}`;
    const href = authorHandle ? `profile.html?u=${encodeURIComponent(nick(authorHandle))}` : "profile.html";
    return `<div class="paid-gate">
      ${markHTML({ paid: true })}
      <h2>Запись для подписчиков</h2>
      <p>Текст откроется с уровня «${esc(label)}» и выше.</p>
      <a class="btn btn-primary" href="${esc(href)}">Оформить подписку</a>
    </div>`;
  }

  return {
    MAX_TIERS,
    MIN_RUB,
    SUB_FEE,
    GIFT_FEE,
    nick,
    splitSlugs,
    loadTiers,
    saveTiers,
    subTo,
    levelOn,
    authorNet,
    giftNet,
    subscribe,
    payGift,
    unsubscribe,
    paidSubscriberCount,
    authorEvents,
    authorEarnings,
    eventLabel,
    eventWhen,
    accessSlugs,
    isPaid,
    minLevel,
    canReadPaid,
    chapterUnlocked,
    sceneUnlocked,
    postUnlocked,
    markHTML,
    logCardChange,
    cardChanges,
    canEditCard,
    canEditChapters,
    formatRub,
    fillLevelSelect,
    bindPaidFields,
    gateHTML,
    postGateHTML,
  };
})();

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
  return qs ? `catalog.html?${qs}` : "catalog.html";
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
  root.querySelectorAll("[data-mention-text]").forEach((el) => {
    el.innerHTML = mentionHtml(el.getAttribute("data-mention-text") || "");
  });
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
  if (file === "collections.html") return "mine";
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

function ddOnLibrary(tabs) {
  if (currentPage() !== "library.html") return "";
  return tabs.includes(currentTab("library.html")) ? " class=\"active\"" : "";
}

function ddOnAdmin() {
  return String(currentPage() || "").startsWith("admin") ? " class=\"active\"" : "";
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
    <form class="search-bar" action="catalog.html" role="search">
      <img src="assets/svg/search.svg" alt="">
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
          <div class="header-alert-dd" id="notif-feed" hidden></div>
        </div>
        <a class="header-alert-btn" id="mail-toggle" href="messages.html" aria-label="Личные сообщения">
          <img src="assets/svg/mail.svg" alt="">
          <span class="header-alert-dot" data-mail-dot hidden></span>
        </a>
      </div>
      <div class="header-auth" id="header-guest">
        <a href="#login" class="btn btn-ghost" data-signin>Войти</a>
        <a href="#login" class="btn btn-primary" data-signin>Регистрация</a>
      </div>
      <div class="account-menu" id="account-menu" hidden>
        <button type="button" class="account-menu-btn" aria-expanded="false" aria-label="Мой профиль">
          <img class="header-avatar" src="assets/test/avatar-1.png" alt="">
        </button>
        <div class="account-dd" hidden>
          <div class="account-dd-scroll">
            <a href="feed.html"${ddOn("feed.html")}><img src="assets/deco/paw.svg" alt=""> Моя лента</a>
            <a href="blog.html"${ddOn("blog.html")}><img src="assets/deco/блог.svg" alt=""> Мой блог</a>
            <a href="profile.html"${ddOn("profile.html")}><img src="assets/svg/profile.svg" alt=""> Мой профиль</a>
            <a href="replies.html"${ddOn("replies.html")}><img src="assets/deco/heartcomm.svg" alt=""> Обсуждения</a>
            <span class="dd-sep"></span>
            <a href="work-new.html"${ddOn("work-new.html")} data-author-nav><img src="assets/deco/plus.svg" alt=""> Новая история</a>
            <a href="author-home.html"${ddOn("author-home.html")} data-author-nav><img src="assets/svg/читать.svg" alt=""> Мои истории</a>
            <a href="reviews.html"${ddOn("reviews.html")} data-author-nav><img src="assets/svg/коммент.svg" alt=""> Отзывы</a>
            <a href="changes.html"${ddOn("changes.html")} data-author-nav><img src="assets/deco/календарь.svg" alt=""> Изменения</a>
            <a href="limits.html"${ddOn("limits.html")} data-author-nav><img src="assets/svg/память.svg" alt=""> Мои лимиты</a>
            <span class="dd-sep"></span>
            <a href="library.html?tab=likes"${ddOnLibrary(["likes", "read", "follows"])}><img src="assets/svg/bookmark2.svg" alt=""> Закладки</a>
            <a href="collections.html"${ddOn("collections.html")}><img src="assets/deco/сборник.svg" alt=""> Сборники</a>
          </div>
          <div class="account-dd-foot">
            <a href="admin.html"${ddOnAdmin()} data-admin-link hidden><img src="assets/deco/настройки.svg" alt=""> Кабинет администратора</a>
            <a href="support.html"${ddOn("support.html")}><img src="assets/svg/info.svg" alt=""> Помощь</a>
            <a href="wallet.html"${ddOn("wallet.html")}><img src="assets/svg/кошелек.svg" alt=""> Кошелёк</a>
            <a href="settings.html"${ddOn("settings.html")}><img src="assets/deco/настройки.svg" alt=""> Настройки</a>
            <button type="button" class="dd-signout" data-signout><img src="assets/svg/Traced Image.svg" alt=""> Выйти</button>
          </div>
        </div>
      </div>
    </div>`;
}

function loadBranchWaits(workId) {
  try {
    const raw = JSON.parse(localStorage.getItem("foxtoria-wait-branches:" + workId) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveBranchWaits(workId, waits) {
  localStorage.setItem("foxtoria-wait-branches:" + workId, JSON.stringify(waits));
  localStorage.setItem("foxtoria-wait-work:" + workId, waits.length ? "1" : "0");
}

function loadBranchNews(workId) {
  try {
    const raw = JSON.parse(localStorage.getItem("foxtoria-branch-news:" + workId) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function branchWaitNotifs() {
  if (!foxPref("notifWorks")) return "";
  const hrefByWork = { shadows: "read-interactive.html", letters: "read-linear.html" };
  const parts = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("foxtoria-wait-branches:")) continue;
    const workId = key.slice("foxtoria-wait-branches:".length);
    const news = loadBranchNews(workId);
    loadBranchWaits(workId).forEach((wait) => {
      if (!news.includes(wait.next)) return;
      const href = hrefByWork[workId] || "feed.html";
      parts.push(`<a href="${href}">
              <strong>Новая глава</strong>
              <span>В выбранной ветке: ${foxEscape(wait.label || "продолжение")}</span>
            </a>`);
    });
  }
  return parts.join("");
}

function fillNotifFeed() {
  const feed = document.getElementById("notif-feed");
  if (!feed) return;
  const handle = foxEscape(ownerHandle());
  const mention = foxPref("notifMentions")
    ? `<a href="replies.html?tab=mention">
              <strong>Упоминание</strong>
              <span>Вас отметили как @${handle}</span>
            </a>`
    : "";
  feed.innerHTML = `
            <p class="header-alert-kicker">Оповещения</p>
            ${mention}
            ${branchWaitNotifs()}
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
            </a>`;
}

document.addEventListener("DOMContentLoaded", function mountHeader() {
  const header = document.querySelector("body > header.header");
  if (!header) return;
  header.innerHTML = headerMarkup();
  hydrateUiIcons(header);
  fillNotifFeed();
  syncAuthChrome();
  applyOwnerAvatar(header);
  enforcePageAccess();
  if (location.hash === "#login" && !isSignedIn()) openLoginDialog();
  document.querySelectorAll(".page-corner").forEach((el) => el.remove());

  const footer = document.querySelector(".page-footer");
  if (footer && !footer.querySelector(".footer-inner")) {
    const inner = document.createElement("div");
    inner.className = "footer-inner";
    inner.innerHTML = `
      <div class="footer-links">
        <nav class="footer-col" aria-label="Приложение">
          <span>Приложение</span>
          <a href="404.html">App Store</a>
          <a href="404.html">Google Play</a>
        </nav>
        <nav class="footer-col" aria-label="Контакты">
          <span>Контакты</span>
          <a href="404.html">Почта</a>
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

  function syncHeaderHeight() {
    const h = Math.round(header.getBoundingClientRect().height);
    if (h > 0) document.documentElement.style.setProperty("--header-h", `${h}px`);
  }
  syncHeaderHeight();
  requestAnimationFrame(syncHeaderHeight);
  if (window.ResizeObserver) new ResizeObserver(syncHeaderHeight).observe(header);
  window.addEventListener("resize", syncHeaderHeight);
});

document.addEventListener("DOMContentLoaded", function bindCollapsibleSide() {
  const layout = document.querySelector("[data-side-layout]");
  const panel = document.querySelector("[data-side-panel]");
  const btns = [...document.querySelectorAll("[data-side-toggle]")];
  if (!layout || !panel || !btns.length) return;

  const mq = window.matchMedia("(max-width: 860px)");
  const alwaysOverlay = layout.classList.contains("linear-read");
  const overlay =
    layout.classList.contains("studio-layout") ||
    layout.classList.contains("msg-layout") ||
    layout.classList.contains("editor-layout") ||
    alwaysOverlay;
  let backdrop = layout.querySelector(".side-backdrop");
  if (overlay && !backdrop) {
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "side-backdrop";
    backdrop.setAttribute("aria-label", "Закрыть меню");
    backdrop.hidden = true;
    layout.prepend(backdrop);
  }

  function canOverlay() {
    return alwaysOverlay || mq.matches;
  }

  function setOpen(open) {
    const show = canOverlay() && open;
    layout.classList.toggle("is-side-open", show);
    btns.forEach((btn) => btn.setAttribute("aria-expanded", show ? "true" : "false"));
    if (backdrop) backdrop.hidden = !show;
    if (show) {
      layout.classList.remove("is-props-open");
      document.querySelectorAll("[data-props-toggle]").forEach((btn) => btn.setAttribute("aria-expanded", "false"));
      const propsBack = layout.querySelector(".props-backdrop");
      if (propsBack) propsBack.hidden = true;
    }
  }

  btns.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      setOpen(!layout.classList.contains("is-side-open"));
    });
  });
  if (backdrop) backdrop.addEventListener("click", () => setOpen(false));
  panel.addEventListener("click", (event) => {
    if (!canOverlay()) return;
    if (event.target.closest("[data-side-toggle]")) return;
    if (event.target.closest("[data-view], [data-select], .studio-item, .msg-item, .linear-toc a, .work-chapter-edit, .work-chapter-title")) {
      setOpen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
  mq.addEventListener("change", () => {
    if (!alwaysOverlay) setOpen(false);
  });
  setOpen(false);
});

document.addEventListener("DOMContentLoaded", function bindPropsDrawer() {
  const layout = document.querySelector(".editor-layout");
  const panel = document.querySelector("[data-props-panel]");
  const btn = document.querySelector("[data-props-toggle]");
  if (!layout || !panel || !btn) return;

  const mq = window.matchMedia("(max-width: 1100px)");
  let backdrop = layout.querySelector(".props-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "side-backdrop props-backdrop";
    backdrop.setAttribute("aria-label", "Закрыть панель");
    backdrop.hidden = true;
    layout.prepend(backdrop);
  }

  function setOpen(open) {
    const show = mq.matches && open;
    layout.classList.toggle("is-props-open", show);
    btn.setAttribute("aria-expanded", show ? "true" : "false");
    backdrop.hidden = !show;
    if (show) {
      layout.classList.remove("is-side-open");
      document.querySelectorAll("[data-side-toggle]").forEach((toggle) => toggle.setAttribute("aria-expanded", "false"));
    }
  }

  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(!layout.classList.contains("is-props-open"));
  });
  backdrop.addEventListener("click", () => setOpen(false));
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
  document.querySelectorAll("[data-admin-link]").forEach((el) => {
    el.hidden = !isSiteAdmin();
  });
  document.querySelectorAll("[data-author-nav]").forEach((el) => {
    el.hidden = !canUseAuthorTools();
  });
  document.querySelectorAll("[data-become-author]").forEach((el) => {
    if (!signed) {
      el.setAttribute("href", "#login");
      el.setAttribute("data-signin", "");
    } else if (canUseAuthorTools()) {
      el.setAttribute("href", "author-home.html");
      el.removeAttribute("data-signin");
    } else {
      el.setAttribute("href", "404.html");
      el.removeAttribute("data-signin");
    }
  });
  applyOwnerAvatar();
  syncInboxDots();
}

document.addEventListener(
  "click",
  (event) => {
    const signin = event.target.closest("[data-signin]");
    if (signin) {
      event.preventDefault();
      event.stopPropagation();
      if (signin.hasAttribute("data-become-author")) {
        sessionStorage.setItem("foxtoria-after-login", "author-home.html");
      } else {
        sessionStorage.setItem("foxtoria-after-login", currentPage() || "index.html");
      }
      openLoginDialog();
      return;
    }
    const signout = event.target.closest("[data-signout]");
    if (signout) {
      event.preventDefault();
      clearDemoSession();
      if (currentPage() === "index.html" || location.pathname === "/") location.reload();
      else location.href = "index.html";
      return;
    }
    const link = event.target.closest("a[href]");
    if (link && !link.hasAttribute("data-signin")) {
      const page = String(link.getAttribute("href") || "")
        .split("?")[0]
        .split("#")[0]
        .split("/")
        .pop();
      if (FOX_ADMIN_PAGES.has(page) && !isSiteAdmin()) {
        event.preventDefault();
        if (!isSignedIn()) {
          sessionStorage.setItem("foxtoria-after-login", page);
          openLoginDialog();
        } else location.href = "404.html";
        return;
      }
      if (FOX_AUTHOR_PAGES.has(page) && (!isSignedIn() || currentUserRole() === "reader")) {
        event.preventDefault();
        if (!isSignedIn()) {
          sessionStorage.setItem("foxtoria-after-login", page);
          openLoginDialog();
        } else location.href = "404.html";
        return;
      }
    }
    const toggle = event.target.closest("#theme-toggle");
    if (!toggle) return;
  const html = document.documentElement;
  const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  localStorage.setItem("foxtoria-theme", next);
},
  true
);

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
  const title = document.querySelector(".profile-name") || document.querySelector(".profile-hero h1");
  const handleEl = document.querySelector(".profile-handle") || document.querySelector(".profile-meta");
  if (title) title.textContent = display;
  if (handleEl) handleEl.textContent = `@${handle}`;
  const bio = document.querySelector(".profile-bio");
  if (bio) bio.textContent = "Публичный профиль появится вместе с аккаунтами.";
  document.title = `${display} — профиль — FoxStoria`;
  const subnav = document.querySelector(".account-subnav");
  if (subnav) subnav.hidden = true;
  document.querySelector('.sidebar-nav a[href="profile.html"]')?.classList.remove("active");
});

document.addEventListener("DOMContentLoaded", function messagesPage() {
  if (currentPage() !== "messages.html") return;
  const boot = window.FoxMessagesReady || Promise.resolve();
  boot.then(initMessagesPage).catch(() => initMessagesPage());

  function initMessagesPage() {
  const list = document.querySelector(".msg-list");
  if (!list) return;

  function closeMsgMenus(except) {
    document.querySelectorAll(".msg-menu").forEach((menu) => {
      if (menu === except) return;
      menu.classList.remove("open");
      menu.querySelector("[data-msg-menu]")?.setAttribute("aria-expanded", "false");
      const dd = menu.querySelector(".msg-menu-dd");
      if (dd) {
        dd.hidden = true;
        dd.style.position = "";
        dd.style.left = "";
        dd.style.top = "";
        dd.style.right = "";
      }
    });
  }

  function setMsgBtn(btn, src, label) {
    if (!btn) return;
    btn.innerHTML = `<img src="${src}" alt=""> ${label}`;
    hydrateUiIcons(btn);
  }

  function bubbleMenuHTML(mine) {
    const own = `
          <button type="button" data-msg-bubble-act="edit"><img src="assets/svg/редактировать.svg" alt=""> Редактировать</button>
          <button type="button" data-msg-bubble-act="pin"><img src="assets/svg/кнопка.svg" alt=""> Закрепить</button>
          <button type="button" data-msg-bubble-act="select"><img src="assets/svg/okay.svg" alt=""> Выбрать</button>
          <button type="button" data-msg-bubble-act="reply"><img src="assets/svg/коммент.svg" alt=""> Ответить</button>
          <button type="button" class="is-danger" data-msg-bubble-act="delete"><img src="assets/svg/удалить.svg" alt=""> Удалить</button>`;
    const other = `
          <button type="button" data-msg-bubble-act="reply"><img src="assets/svg/коммент.svg" alt=""> Ответить</button>
          <button type="button" data-msg-bubble-act="report"><img src="assets/svg/флаг.svg" alt=""> Пожаловаться</button>`;
    return `<div class="msg-menu msg-bubble-menu">
        <button type="button" class="msg-menu-btn" data-msg-menu aria-label="Ещё" aria-expanded="false">
          <img src="assets/ornaments/03_more.svg?v=3" alt="">
        </button>
        <div class="msg-menu-dd" hidden>
          ${mine ? own : other}
        </div>
      </div>`;
  }

  function ensureBubbleMenus(root = document) {
    const rows = root instanceof Element && root.matches(".msg-row")
      ? [root]
      : [...root.querySelectorAll(".msg-row")];
    rows.forEach((row) => {
      if (!row.querySelector(".msg-pick")) {
        row.insertAdjacentHTML("afterbegin", `<label class="msg-pick"><input type="checkbox" data-msg-pick></label>`);
      }
      const bubble = row.querySelector(".msg-bubble");
      if (!bubble || bubble.querySelector(".msg-bubble-menu")) return;
      bubble.insertAdjacentHTML("beforeend", bubbleMenuHTML(row.classList.contains("is-mine") || bubble.classList.contains("mine")));
      hydrateUiIcons(row);
    });
  }

  function placeBubbleDd(menu) {
    const dd = menu.querySelector(".msg-menu-dd");
    const btn = menu.querySelector(".msg-menu-btn");
    if (!dd || !btn || !menu.closest(".msg-row")) return;
    dd.style.position = "fixed";
    dd.style.right = "auto";
    const br = btn.getBoundingClientRect();
    dd.style.left = "0px";
    dd.style.top = "0px";
    const width = dd.getBoundingClientRect().width || 220;
    const height = dd.getBoundingClientRect().height || 210;
    let left = br.right - width;
    let top = br.bottom + 4;
    if (left < 8) left = 8;
    if (left + width > innerWidth - 8) left = Math.max(8, innerWidth - width - 8);
    if (top + height > innerHeight - 8) top = Math.max(8, innerHeight - height - 8);
    dd.style.left = `${left}px`;
    dd.style.top = `${top}px`;
  }

  function rowText(row) {
    const text = (row?.querySelector(".msg-bubble p")?.textContent || "").trim();
    if (text) return text;
    if (row?.querySelector("img.msg-attach-preview, .msg-file-img")) return "Фото";
    if (row?.querySelector(".msg-file")) return "Файл";
    return "";
  }

  function refreshPinMenus(thread) {
    thread?.querySelectorAll(".msg-row").forEach((row) => {
      const pinBtn = row.querySelector("[data-msg-bubble-act=pin]");
      setMsgBtn(pinBtn, "assets/svg/кнопка.svg", row.classList.contains("is-pinned") ? "Открепить" : "Закрепить");
    });
  }

  function flashRow(row) {
    if (!row) return;
    row.classList.remove("is-flash");
    void row.offsetWidth;
    row.classList.add("is-flash");
    window.clearTimeout(row._flashTimer);
    row._flashTimer = window.setTimeout(() => row.classList.remove("is-flash"), 1400);
  }

  function jumpToPinned(thread) {
    const pinned = thread?.querySelector(".msg-row.is-pinned");
    pinned?.scrollIntoView({ block: "center", behavior: "smooth" });
    flashRow(pinned);
  }

  function setPinnedRow(thread, row, on) {
    thread?.querySelectorAll(".msg-row.is-pinned").forEach((el) => el.classList.remove("is-pinned"));
    if (on && row) row.classList.add("is-pinned");
    refreshPinMenus(thread);
    updatePinBar(thread);
  }

  function updatePinBar(thread) {
    const bar = thread?.querySelector("[data-msg-pin-bar]");
    const pinned = thread?.querySelector(".msg-row.is-pinned");
    if (!bar) return;
    bar.hidden = !pinned;
    const span = bar.querySelector("[data-msg-pin-text]");
    if (span) span.textContent = rowText(pinned) || "Сообщение";
    hydrateUiIcons(bar);
  }

  function refreshThreadPreview(thread) {
    const id = thread?.getAttribute("data-thread");
    const preview = list.querySelector(`.msg-item[data-thread="${id}"] .msg-item-preview`);
    const timeEl = list.querySelector(`.msg-item[data-thread="${id}"] time`);
    const last = [...(thread?.querySelectorAll(".msg-row") || [])].at(-1);
    if (preview) preview.textContent = rowText(last) || "Нет сообщений";
    if (timeEl && last) {
      const stamp = last.querySelector("time")?.textContent;
      if (stamp) timeEl.textContent = stamp;
    }
  }

  function updateSelectCount(thread) {
    const n = thread?.querySelectorAll("[data-msg-pick]:checked").length || 0;
    const label = thread?.querySelector("[data-msg-select-count]");
    if (label) label.textContent = `${n} выбрано`;
    thread?.querySelectorAll(".msg-row").forEach((row) => {
      row.classList.toggle("is-picked", !!row.querySelector("[data-msg-pick]:checked"));
    });
  }

  function setSelecting(thread, on, row) {
    thread?.classList.toggle("is-selecting", on);
    const bar = thread?.querySelector("[data-msg-select-bar]");
    if (bar) bar.hidden = !on;
    if (!on) {
      thread?.querySelectorAll("[data-msg-pick]").forEach((box) => {
        box.checked = false;
      });
    } else if (row) {
      const box = row.querySelector("[data-msg-pick]");
      if (box) box.checked = true;
    }
    updateSelectCount(thread);
  }

  function editBubble(row) {
    const bubble = row.querySelector(".msg-bubble");
    const p = bubble?.querySelector("p");
    if (!bubble || bubble.querySelector(".msg-edit-field")) return;
    const field = document.createElement("textarea");
    field.className = "msg-edit-field";
    field.value = p?.textContent || "";
    field.rows = 2;
    (p || bubble.querySelector("time"))?.before(field);
    if (p) p.hidden = true;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
    function save() {
      const text = field.value.trim();
      field.remove();
      if (!text) {
        if (p) p.hidden = false;
        return;
      }
      if (p) {
        p.textContent = text;
        p.hidden = false;
      } else {
        bubble.insertAdjacentHTML("afterbegin", `<p>${escapeMsg(text)}</p>`);
      }
      const time = bubble.querySelector("time");
      if (time && !bubble.querySelector(".msg-edited")) {
        time.insertAdjacentHTML("afterbegin", `<span class="msg-edited">изм.</span>`);
      }
      refreshThreadPreview(row.closest(".msg-thread"));
      updatePinBar(row.closest(".msg-thread"));
    }
    field.addEventListener("blur", save);
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        field.blur();
      }
      if (event.key === "Escape") {
        field.removeEventListener("blur", save);
        field.remove();
        if (p) p.hidden = false;
      }
    });
  }

  function handleBubbleAct(act, row, thread, btn) {
    if (act === "edit") {
      editBubble(row);
    } else if (act === "pin") {
      const on = !row.classList.contains("is-pinned");
      setPinnedRow(thread, row, on);
      if (on) jumpToPinned(thread);
    } else if (act === "select") {
      setSelecting(thread, true, row);
    } else if (act === "reply") {
      const bar = thread.querySelector("[data-msg-reply]");
      const textEl = bar?.querySelector("[data-msg-reply-text]");
      if (textEl) textEl.textContent = rowText(row) || "Вложение";
      if (bar) bar.hidden = false;
      thread.querySelector("textarea")?.focus();
    } else if (act === "report") {
      return false;
    } else if (act === "delete") {
      if (!confirm("Удалить это сообщение?")) return false;
      const wasPinned = row.classList.contains("is-pinned");
      row.remove();
      if (wasPinned) updatePinBar(thread);
      refreshThreadPreview(thread);
    }
    return true;
  }

  function showThread(id) {
    closeMsgMenus();
    const item = list.querySelector(`.msg-item[data-thread="${id}"]`);
    list.querySelectorAll(".msg-item").forEach((el) => el.classList.toggle("active", el === item));
    document.querySelectorAll(".msg-thread").forEach((pane) => {
      pane.hidden = pane.getAttribute("data-thread") !== id;
    });
  }

  list.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    const item = event.target.closest(".msg-item");
    if (!item) return;
    showThread(item.getAttribute("data-thread"));
  });

  document.addEventListener("click", (event) => {
    const threadFromUi = event.target.closest(".msg-thread");
    if (event.target.closest("[data-msg-select-cancel]")) {
      setSelecting(threadFromUi, false);
      closeMsgMenus();
      return;
    }
    if (event.target.closest("[data-msg-reply-cancel]")) {
      const bar = threadFromUi?.querySelector("[data-msg-reply]");
      if (bar) bar.hidden = true;
      return;
    }
    if (event.target.closest("[data-msg-unpin]")) {
      setPinnedRow(threadFromUi, null, false);
      closeMsgMenus();
      return;
    }
    if (event.target.closest("[data-msg-pin-bar]")) {
      jumpToPinned(threadFromUi);
      return;
    }
    if (event.target.closest("[data-msg-pick]")) {
      updateSelectCount(threadFromUi);
      return;
    }
    if (threadFromUi?.classList.contains("is-selecting")) {
      const row = event.target.closest(".msg-row");
      if (row && !event.target.closest(".msg-menu")) {
        const box = row.querySelector("[data-msg-pick]");
        if (box) box.checked = !box.checked;
        updateSelectCount(threadFromUi);
        return;
      }
    }
    const menu = event.target.closest(".msg-menu");
    if (!menu) {
      closeMsgMenus();
      return;
    }
    const toggle = event.target.closest("[data-msg-menu]");
    if (toggle) {
      const open = !menu.classList.contains("open");
      closeMsgMenus(open ? menu : null);
      menu.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      const dd = menu.querySelector(".msg-menu-dd");
      if (dd) dd.hidden = !open;
      if (open) placeBubbleDd(menu);
      return;
    }
    const bubbleBtn = event.target.closest("[data-msg-bubble-act]");
    if (bubbleBtn) {
      const row = menu.closest(".msg-row");
      const thread = menu.closest(".msg-thread");
      handleBubbleAct(bubbleBtn.getAttribute("data-msg-bubble-act"), row, thread, bubbleBtn);
      closeMsgMenus();
      return;
    }
    const actBtn = event.target.closest("[data-msg-act]");
    if (!actBtn) return;
    const thread = menu.closest(".msg-thread");
    const id = thread?.getAttribute("data-thread");
    const item = id ? list.querySelector(`.msg-item[data-thread="${id}"]`) : null;
    const act = actBtn.getAttribute("data-msg-act");
    if (act === "pin") {
      const on = !item?.classList.contains("is-pinned");
      item?.classList.toggle("is-pinned", on);
      if (on && item) list.prepend(item);
      setMsgBtn(actBtn, "assets/svg/кнопка.svg", on ? "Открепить чат" : "Закрепить чат");
    } else if (act === "clear") {
      if (!confirm("Очистить историю этого чата?")) return;
      const log = thread?.querySelector(".msg-thread-log");
      if (log) log.innerHTML = "";
      ensureBubbleMenus(thread);
      updatePinBar(thread);
      const preview = item?.querySelector(".msg-item-preview");
      if (preview) preview.textContent = "Нет сообщений";
    } else if (act === "mute") {
      const muted = thread?.classList.toggle("is-muted");
      setMsgBtn(
        actBtn,
        muted ? "assets/svg/soundon.svg" : "assets/svg/mute.svg",
        muted ? "Включить уведомления" : "Выключить уведомления"
      );
    } else if (act === "delete") {
      if (!confirm("Удалить этот чат?")) return;
      const next = item?.nextElementSibling || item?.previousElementSibling;
      item?.remove();
      thread?.remove();
      if (next?.hasAttribute("data-thread")) {
        showThread(next.getAttribute("data-thread"));
      } else {
        const panes = document.querySelector(".msg-panes");
        if (panes) panes.innerHTML = `<div class="msg-empty">Нет диалогов</div>`;
      }
    } else if (act === "block") {
      const blocked = thread?.classList.toggle("is-blocked");
      actBtn.classList.toggle("is-danger", !blocked);
      setMsgBtn(actBtn, "assets/svg/warn.svg", blocked ? "Разблокировать" : "Заблокировать");
    }
    closeMsgMenus();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const selecting = document.querySelector(".msg-thread.is-selecting:not([hidden])");
    if (selecting) setSelecting(selecting, false);
    closeMsgMenus();
  });
  ensureBubbleMenus();
  function escapeMsg(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function formatMsgSize(bytes) {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0).replace(".0", "")} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".0", "")} МБ`;
  }

  function isMsgImage(file) {
    return String(file.type || "").startsWith("image/");
  }

  function msgPreviewLabel(text, items) {
    if (text) return text;
    if (items.length === 1) return items[0].file.name;
    return `${items.length} вложения`;
  }

  document.querySelectorAll("[data-msg-composer]").forEach((form) => {
    const field = form.querySelector("textarea");
    const fileInput = form.querySelector("[data-msg-file]");
    const attachBtn = form.querySelector("[data-msg-attach]");
    const attachList = form.querySelector("[data-msg-attach-list]");
    const pending = [];

    function renderAttach() {
      if (!attachList) return;
      attachList.hidden = pending.length === 0;
      attachList.innerHTML = pending
        .map((item) => {
          const thumb = isMsgImage(item.file)
            ? `<img class="msg-attach-thumb" src="${item.url}" alt="">`
            : `<img src="assets/svg/download.svg" alt="">`;
          return `<div class="msg-attach-chip">
            ${thumb}
            <span class="msg-attach-name">${escapeMsg(item.file.name)}</span>
            <button type="button" class="msg-attach-remove" data-remove="${item.id}" aria-label="Убрать файл">
              <img src="assets/svg/удалить.svg" alt="">
            </button>
          </div>`;
        })
        .join("");
      hydrateUiIcons(attachList);
    }

    attachBtn?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", () => {
      [...(fileInput.files || [])].forEach((file) => {
        pending.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          url: URL.createObjectURL(file),
        });
      });
      fileInput.value = "";
      renderAttach();
    });
    attachList?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-remove]");
      if (!btn) return;
      const id = btn.getAttribute("data-remove");
      const index = pending.findIndex((item) => item.id === id);
      if (index < 0) return;
      URL.revokeObjectURL(pending[index].url);
      pending.splice(index, 1);
      renderAttach();
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = (field?.value || "").trim();
      if (!text && !pending.length) return;
      const thread = form.closest(".msg-thread");
      const threadId = thread?.getAttribute("data-thread");
      const kind = thread?.getAttribute("data-kind") || "";
      if (kind === "system" && text && threadId && window.FoxApi) {
        if (field) field.value = "";
        FoxApi.request(`/api/messages/threads/${encodeURIComponent(threadId)}`, {
          method: "POST",
          body: JSON.stringify({ body: text }),
        })
          .then(() => {
            location.search = `?thread=${encodeURIComponent(threadId)}`;
          })
          .catch((err) => alert(err.message || "Рассылка не прошла"));
        return;
      }
      const log = thread?.querySelector(".msg-thread-log");
      const now = new Date();
      const stamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const sent = pending.splice(0, pending.length);
      const replyBar = thread?.querySelector("[data-msg-reply]");
      const replyText = replyBar && !replyBar.hidden
        ? (replyBar.querySelector("[data-msg-reply-text]")?.textContent || "").trim()
        : "";
      const quoteHtml = replyText ? `<blockquote class="msg-quote">${escapeMsg(replyText)}</blockquote>` : "";
      const filesHtml = sent.length
        ? `<div class="msg-bubble-files">${sent
            .map((item) => {
              if (isMsgImage(item.file)) {
                return `<a href="${item.url}" target="_blank" rel="noopener"><img class="msg-bubble-media" src="${item.url}" alt="${escapeMsg(item.file.name)}"></a>`;
              }
              return `<a class="msg-file-card" href="${item.url}" download="${escapeMsg(item.file.name)}" target="_blank" rel="noopener">
                <img src="assets/svg/download.svg" alt="">
                <span><b>${escapeMsg(item.file.name)}</b><span>${formatMsgSize(item.file.size)}</span></span>
              </a>`;
            })
            .join("")}</div>`
        : "";
      const textHtml = text ? `<p>${escapeMsg(text)}</p>` : "";
      log?.insertAdjacentHTML(
        "beforeend",
        `<div class="msg-row is-mine"><div class="msg-bubble mine">${quoteHtml}${filesHtml}${textHtml}<time>${stamp}</time></div></div>`
      );
      if (replyBar) replyBar.hidden = true;
      if (log?.lastElementChild) {
        ensureBubbleMenus(log.lastElementChild);
        hydrateUiIcons(log.lastElementChild);
      }
      if (field) field.value = "";
      renderAttach();
      if (log) log.scrollTop = log.scrollHeight;
      const preview = list.querySelector(`.msg-item[data-thread="${thread?.getAttribute("data-thread")}"] .msg-item-preview`);
      const timeEl = list.querySelector(`.msg-item[data-thread="${thread?.getAttribute("data-thread")}"] time`);
      if (preview) preview.textContent = msgPreviewLabel(text, sent);
      if (timeEl) timeEl.textContent = stamp;
      if (text && threadId && /^\d+$/.test(threadId) && window.FoxApi) {
        FoxApi.request(`/api/messages/threads/${encodeURIComponent(threadId)}`, {
          method: "POST",
          body: JSON.stringify({ body: text }),
        }).catch(() => {});
      }
    });
  });
  }
});

document.addEventListener("DOMContentLoaded", function accountTabs() {
  document.querySelectorAll(".account-tabs").forEach((nav) => {
    const tabs = [...nav.querySelectorAll(":scope > [data-tab]")];
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
    const hash = (location.hash || "").replace(/^#/, "");
    const fromHash = hash.startsWith("faq-") ? "faq" : hash.startsWith("rule-") ? "docs" : "";
    const initial = names.includes(fromUrl) ? fromUrl : names.includes(fromHash) ? fromHash : names[0];
    show(initial, false);
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => show(btn.getAttribute("data-tab"), true));
    });
  });
});

document.addEventListener("DOMContentLoaded", function compactSectionTabs() {
  const roots = [...document.querySelectorAll(".account-tabs, .type-tabs")];
  if (!roots.length) return;

  function prepareItem(item) {
    if (item.dataset.tabPrepared === "1") return;
    item.dataset.tabPrepared = "1";
    const words = [];
    [...item.childNodes].forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) return;
      const text = node.textContent;
      if (!text || !text.trim()) return;
      const label = document.createElement("span");
      label.className = "tab-label";
      label.textContent = text;
      node.replaceWith(label);
      words.push(text.trim());
    });
    if (!item.querySelector("img, .ui-icon, svg, .tab-at")) {
      const initial = document.createElement("span");
      initial.className = "tab-initial";
      initial.setAttribute("aria-hidden", "true");
      initial.textContent = (words[0] || item.textContent || "?").charAt(0).toUpperCase();
      item.prepend(initial);
    }
    if (!item.getAttribute("aria-label")) {
      const name = item.textContent.replace(/\s+/g, " ").trim();
      if (name) item.setAttribute("aria-label", name);
    }
  }

  function fit(root) {
    root.classList.remove("is-icons-only");
    const items = [...root.querySelectorAll(":scope > button, :scope > a")];
    const prev = items.map((el) => {
      const state = { flex: el.style.flex, overflow: el.style.overflow, minWidth: el.style.minWidth };
      el.style.flex = "0 0 auto";
      el.style.overflow = "visible";
      el.style.minWidth = "auto";
      return state;
    });
    const styles = getComputedStyle(root);
    const gap = parseFloat(styles.columnGap || styles.gap) || 0;
    const needed = items.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0) + gap * Math.max(0, items.length - 1);
    items.forEach((el, index) => {
      el.style.flex = prev[index].flex;
      el.style.overflow = prev[index].overflow;
      el.style.minWidth = prev[index].minWidth;
    });
    if (needed > root.clientWidth + 1) root.classList.add("is-icons-only");
  }

  roots.forEach((root) => {
    root.querySelectorAll(":scope > button, :scope > a").forEach(prepareItem);
    const run = () => fit(root);
    run();
    requestAnimationFrame(run);
    if (window.ResizeObserver) new ResizeObserver(run).observe(root);
  });
  document.fonts?.ready?.then(() => roots.forEach(fit));
});

document.addEventListener("DOMContentLoaded", function helpDocs() {
  const root = document.querySelector("[data-help-docs]");
  if (!root) return;
  const buttons = [...root.querySelectorAll("[data-doc]")];
  const panels = [...root.querySelectorAll("[data-doc-panel]")];
  const ALIAS = { publish: "rules" };
  const SECTION = { publish: "rule-2" };

  function panelId(id) {
    return ALIAS[id] || id;
  }

  function show(id) {
    const mapped = panelId(id);
    buttons.forEach((btn) => btn.classList.toggle("active", btn.getAttribute("data-doc") === id));
    panels.forEach((panel) => {
      panel.hidden = panel.getAttribute("data-doc-panel") !== mapped;
    });
    const jump = SECTION[id] || (location.hash || "").replace(/^#/, "");
    if (mapped === "rules" && jump) {
      requestAnimationFrame(() => {
        document.getElementById(jump)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-doc");
      const url = new URL(location.href);
      url.searchParams.set("tab", "docs");
      url.searchParams.set("doc", id);
      url.hash = SECTION[id] ? SECTION[id] : "";
      history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      show(id);
    });
  });
  const fromUrl = new URLSearchParams(location.search).get("doc");
  const initial = buttons.some((btn) => btn.getAttribute("data-doc") === fromUrl)
    ? fromUrl
    : buttons[0]?.getAttribute("data-doc");
  if (initial) show(initial);
});

document.addEventListener("DOMContentLoaded", function helpSectionToc() {
  document.querySelectorAll(".rules-toc").forEach((toc) => {
    toc.addEventListener("click", (event) => {
      const link = event.target.closest("a[href^='#']");
      if (!link) return;
      const id = link.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      history.replaceState({}, "", `${location.pathname}${location.search}#${id}`);
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
});

const READER_KEY = "foxtoria-reader";
const READER_PACKS = [
  { id: "fav", title: "Избранное" },
  { id: "later", title: "На потом" },
  { id: "autumn", title: "Осень 2026" },
];

function loadReaderLibrary() {
  let data = {};
  try {
    data = JSON.parse(localStorage.getItem(READER_KEY) || "{}") || {};
  } catch {
    data = {};
  }
  const packs = Array.isArray(data.packs) && data.packs.length
    ? data.packs.map((pack) => ({
        id: String(pack.id || ""),
        title: String(pack.title || "Сборник"),
        works: Array.isArray(pack.works) ? pack.works.map(String) : [],
      }))
    : READER_PACKS.map((pack) => ({ ...pack, works: [] }));
  return {
    follows: Array.isArray(data.follows) ? data.follows.map(String) : [],
    read: Array.isArray(data.read) ? data.read.map(String) : [],
    likes: Array.isArray(data.likes) ? data.likes.map(String) : [],
    packs,
  };
}

function saveReaderLibrary(data) {
  localStorage.setItem(READER_KEY, JSON.stringify(data));
}

window.FoxStore = {
  _p: null,
  hydrate() {
    if (this._p) return this._p;
    this._p = this._run();
    return this._p;
  },
  async _run() {
    if (!window.FoxApi) return null;
    try {
      const state = await FoxApi.request("/api/me/state");
      if (state.profile) {
        let prev = {};
        try {
          prev = JSON.parse(localStorage.getItem("foxtoria-profile") || "{}") || {};
        } catch {
          prev = {};
        }
        localStorage.setItem(
          "foxtoria-profile",
          JSON.stringify({
            ...prev,
            name: state.profile.display_name || prev.name,
            handle: state.profile.username || prev.handle,
            avatar: state.profile.avatar || prev.avatar || "",
            bio: state.profile.bio || prev.bio || "",
            plan: state.profile.plan || prev.plan || "free",
            is_staff: Boolean(state.profile.is_staff),
            links: state.profile.links || prev.links || [],
          })
        );
        if (state.profile.blocked && !document.getElementById("blocked-banner")) {
          const bar = document.createElement("p");
          bar.id = "blocked-banner";
          bar.className = "blocked-banner";
          bar.innerHTML =
            "Профиль заблокирован после предупреждений. Работы не удалены. Обжаловать можно в <a href=\"support.html\">поддержке</a>.";
          document.body.prepend(bar);
        }
      }
      if (state.library) {
        const followIds = (state.library.follows || [])
          .map((item) => (item && item.story_id != null ? String(item.story_id) : ""))
          .filter(Boolean);
        saveReaderLibrary({
          follows: followIds,
          read: (state.library.read || []).map((item) => String(item.story_id || item)),
          likes: state.library.likes || [],
          packs: (state.collections || []).map((pack) => ({
            id: pack.id,
            title: pack.title,
            works: pack.works || [],
          })),
        });
      }
      if (state.wallet) {
        localStorage.setItem(
          "foxtoria-wallet",
          JSON.stringify({
            balance: state.wallet.balance,
            methods: state.wallet.methods,
            ops: state.wallet.ops,
          })
        );
      }
      return state;
    } catch {
      return null;
    }
  },
  like(storyId, on) {
    if (!window.FoxApi) return;
    FoxApi.request("/api/me/library/like", {
      method: "POST",
      body: JSON.stringify({ story_id: storyId, on }),
    }).catch(() => {});
  },
  follow(storyId, on) {
    if (!window.FoxApi) return;
    FoxApi.request("/api/me/library/follow", {
      method: "POST",
      body: JSON.stringify({ type: "story", story_id: storyId, on }),
    }).catch(() => {});
  },
  progress(payload) {
    if (!window.FoxApi) return;
    FoxApi.request("/api/me/library/progress", {
      method: "POST",
      body: JSON.stringify(payload),
    }).catch(() => {});
  },
};
FoxStore.hydrate();

function toggleReaderList(list, id, on) {
  const next = list.filter((item) => item !== id);
  if (on) next.push(id);
  return next;
}

document.addEventListener("DOMContentLoaded", function workPageControls() {
  document.querySelectorAll(".work-split-btn").forEach((wrap) => {
    const toggle = wrap.querySelector(".work-split-btn-toggle");
    const menu = wrap.querySelector(".work-split-menu");
    const main = wrap.querySelector(".work-split-btn-main");
    const icon = wrap.querySelector(".work-split-btn-main .work-btn-icon, .work-split-btn-main .ui-icon");
    const workId = wrap.getAttribute("data-work-id") || currentPage();
    if (!toggle || !menu) return;

    function closeSplit() {
      wrap.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      menu.hidden = true;
    }

    function bindToggle() {
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
        if (!wrap.contains(event.target) && !event.target.closest(".work-dialog")) closeSplit();
      });
    }

    if (wrap.hasAttribute("data-cabinet-new")) {
      bindToggle();
      menu.querySelector("[data-ficbook-import]")?.addEventListener("click", (event) => {
        event.stopPropagation();
        closeSplit();
        if (window.FoxFicbook) FoxFicbook.openDialog();
      });
      return;
    }

    function close() {
      closeSplit();
    }

    bindToggle();

    function paint() {
      const lib = loadReaderLibrary();
      const followed = lib.follows.includes(workId);
      const read = lib.read.includes(workId);
      wrap.classList.toggle("is-follow", followed);
      if (main) {
        main.setAttribute("aria-pressed", followed ? "true" : "false");
        main.setAttribute("aria-label", followed ? "Отписаться" : "Подписаться");
      }
      if (icon) setUiIcon(icon, followed ? "assets/svg/bookmark.svg" : "assets/svg/bookmark2.svg");
      const readBtn = menu.querySelector("[data-work-read]");
      if (readBtn) {
        readBtn.classList.toggle("is-on", read);
        readBtn.setAttribute("aria-pressed", read ? "true" : "false");
      }
    }

    function packSlug(title) {
      const base = String(title || "")
        .trim()
        .toLowerCase()
        .replace(/ё/g, "е")
        .replace(/[^a-zа-я0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "");
      return `${base || "pack"}-${Date.now().toString(36)}`;
    }

    function openPackDialog() {
      close();
      let dialog = document.querySelector(".work-dialog");
      if (!dialog) {
        dialog = document.createElement("div");
        dialog.className = "work-dialog";
        dialog.hidden = true;
        document.body.append(dialog);
      }

      function hide() {
        dialog.hidden = true;
      }

      function packListHTML(packs) {
        if (!packs.length) return `<p class="work-pack-empty">Пока нет личных сборников.</p>`;
        return `<ul class="work-pack-list">${packs
          .map((pack) => {
            const id = String(pack.id).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
            const title = String(pack.title).replaceAll("&", "&amp;").replaceAll("<", "&lt;");
            const checked = pack.works.includes(workId) ? " checked" : "";
            return `<li><label><input type="checkbox" value="${id}"${checked}> ${title}</label></li>`;
          })
          .join("")}</ul>`;
      }

      function fill() {
        const lib = loadReaderLibrary();
        const packs = lib.packs.filter((pack) => pack.id);
        dialog.innerHTML = `
          <div class="work-dialog-card" role="dialog" aria-modal="true" aria-labelledby="work-pack-title">
            <div class="work-dialog-head">
              <h2 id="work-pack-title">Добавить в сборник</h2>
              <button type="button" class="btn btn-outline work-pack-new" data-pack-new>+ Новый</button>
            </div>
            <form class="work-pack-create" data-pack-create hidden>
              <input type="text" name="title" placeholder="Название сборника" maxlength="80" required>
              <button type="submit" class="btn btn-primary">Создать</button>
            </form>
            ${packListHTML(packs)}
            <div class="work-dialog-actions">
              <button type="button" class="btn btn-outline" data-pack-cancel>Отмена</button>
              <button type="button" class="btn btn-primary" data-pack-save ${packs.length ? "" : "disabled"}>Готово</button>
            </div>
          </div>`;
        dialog.querySelector("[data-pack-cancel]")?.addEventListener("click", hide);
        dialog.querySelector("[data-pack-new]")?.addEventListener("click", () => {
          const form = dialog.querySelector("[data-pack-create]");
          if (!form) return;
          form.hidden = !form.hidden;
          if (!form.hidden) form.querySelector("input")?.focus();
        });
        dialog.querySelector("[data-pack-create]")?.addEventListener("submit", (event) => {
          event.preventDefault();
          const title = String(new FormData(event.target).get("title") || "").trim();
          if (!title) return;
          const next = loadReaderLibrary();
          next.packs = [{ id: packSlug(title), title, works: [workId] }, ...next.packs];
          saveReaderLibrary(next);
          fill();
        });
        dialog.querySelector("[data-pack-save]")?.addEventListener("click", () => {
          const chosen = new Set(
            [...dialog.querySelectorAll(".work-pack-list input:checked")].map((input) => input.value)
          );
          const next = loadReaderLibrary();
          next.packs = next.packs.map((pack) => ({
            ...pack,
            works: toggleReaderList(pack.works, workId, chosen.has(pack.id)),
          }));
          saveReaderLibrary(next);
          hide();
        });
      }

      fill();
      dialog.hidden = false;
      if (!dialog.dataset.backdropBound) {
        dialog.dataset.backdropBound = "1";
        dialog.addEventListener("click", (event) => {
          if (event.target === dialog) hide();
        });
      }
    }

    main?.addEventListener("click", (event) => {
      event.stopPropagation();
      close();
      const lib = loadReaderLibrary();
      const on = !lib.follows.includes(workId);
      lib.follows = toggleReaderList(lib.follows, workId, on);
      saveReaderLibrary(lib);
      if (window.FoxStore) FoxStore.follow(workId, on);
      paint();
    });

    menu.querySelector("[data-work-pack]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      openPackDialog();
    });

    menu.querySelector("[data-work-read]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      const lib = loadReaderLibrary();
      const on = !lib.read.includes(workId);
      lib.read = toggleReaderList(lib.read, workId, on);
      saveReaderLibrary(lib);
      if (window.FoxStore) FoxStore.progress({ story_id: workId, completed: on });
      paint();
      close();
    });

    paint();
  });

  const likeBtn = document.querySelector("[data-work-like]");
  if (likeBtn) {
    const icon = likeBtn.querySelector(".work-like-icon");
    const key = "foxtoria-work-like:" + location.pathname;
    const workId =
      likeBtn.getAttribute("data-work-id") ||
      likeBtn.closest("[data-work-id]")?.getAttribute("data-work-id") ||
      document.querySelector("[data-work-id]")?.getAttribute("data-work-id");

    function setLiked(liked) {
      likeBtn.classList.toggle("is-liked", liked);
      likeBtn.setAttribute("aria-pressed", liked ? "true" : "false");
      likeBtn.setAttribute("aria-label", liked ? "Убрать лайк" : "Нравится");
      if (icon) setUiIcon(icon, liked ? "assets/svg/like.svg" : "assets/svg/heart.svg");
      if (workId) {
        const lib = loadReaderLibrary();
        lib.likes = toggleReaderList(lib.likes, workId, liked);
        saveReaderLibrary(lib);
        if (window.FoxStore) FoxStore.like(workId, liked);
      }
    }

    const stored = workId ? loadReaderLibrary().likes.includes(workId) : localStorage.getItem(key) === "1";
    setLiked(stored || localStorage.getItem(key) === "1");
    likeBtn.addEventListener("click", () => {
      const liked = !likeBtn.classList.contains("is-liked");
      setLiked(liked);
      localStorage.setItem(key, liked ? "1" : "0");
    });
  }
});

document.addEventListener("DOMContentLoaded", function changesPage() {
  const tabs = document.getElementById("change-tabs");
  const feed = document.querySelector(".changes-feed");
  if (!tabs || !feed) return;
  const cards = [...feed.querySelectorAll(".change-card")];
  function show(name) {
    tabs.querySelectorAll("[data-change-tab]").forEach((tab) => {
      tab.classList.toggle("active", tab.getAttribute("data-change-tab") === name);
    });
    cards.forEach((card) => {
      const kind = card.getAttribute("data-kind");
      card.hidden = name !== "all" && kind !== name;
    });
  }
  tabs.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-change-tab]");
    if (!btn) return;
    show(btn.getAttribute("data-change-tab"));
  });
});

document.addEventListener("click", function storyNavFold(event) {
  const fold = event.target.closest(".story-nav-fold:not(.is-empty)");
  if (!fold || fold.closest("#toc")) return;
  const node = fold.closest(".story-nav-node");
  if (!node) return;
  event.preventDefault();
  node.classList.toggle("is-collapsed");
  const open = !node.classList.contains("is-collapsed");
  fold.setAttribute("aria-expanded", open ? "true" : "false");
  fold.setAttribute("aria-label", open ? "Свернуть уровень" : "Развернуть уровень");
});

document.addEventListener("DOMContentLoaded", function bindChapterToTop() {
  const page = document.querySelector(".work-page, .linear-read-page");
  if (!page || document.querySelector(".page-to-top")) return;
  const wrap = document.createElement("div");
  wrap.className = "page-to-top-wrap";
  wrap.innerHTML = `<button type="button" class="page-to-top" aria-label="Наверх">
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 9.8 8 5.5l4.5 4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    Наверх
  </button>`;
  const footer = document.querySelector(".page-footer");
  if (footer) footer.before(wrap);
  else document.body.appendChild(wrap);
  wrap.querySelector(".page-to-top").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

const FOX_LIBRARY_KEY = "foxtoria-work-library";

window.FoxLibrary = {
  KEY: FOX_LIBRARY_KEY,
  defaults() {
    return {
      characters: [
        { id: "alex", name: "Алекс", age: "28 лет", bio: "Молчит, пока не спросят. Боится кафе на углу. Не носит часов.", traits: "сдержанный, помнит даты, плохо врёт", pinned: "0" },
        { id: "masha", name: "Маша", age: "26 лет", bio: "Пишет письма, которые не отправляет. Рыжие волосы прячет под капюшон.", traits: "резкая, добрая в деталях", pinned: "0" },
        { id: "nikita", name: "Никита", age: "31 год", bio: "Знает адрес, которого нет на карте.", traits: "наблюдательный", pinned: "0" },
      ],
      notes: [
        { id: "n1", title: "Город на скале", text: "Город на скале, где всегда туман. Улицы помнят шаги, которых ещё не было.", created: "2024-05-12" },
        { id: "n2", title: "Фраза для кафе", text: "«Иногда путь выбирает нас». Не ставить в пролог — беречь для развилки.", created: "2024-05-18" },
        { id: "n3", title: "Кулон", text: "Старинный кулон с трещиной. Маша носит его под пальто.", created: "2024-06-03" },
      ],
    };
  },
  load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(FOX_LIBRARY_KEY) || "");
      if (!parsed || !Array.isArray(parsed.characters) || !Array.isArray(parsed.notes)) {
        return window.FoxLibrary.defaults();
      }
      return parsed;
    } catch {
      return window.FoxLibrary.defaults();
    }
  },
  save(lib) {
    localStorage.setItem(
      FOX_LIBRARY_KEY,
      JSON.stringify({
        characters: Array.isArray(lib?.characters) ? lib.characters : [],
        notes: Array.isArray(lib?.notes) ? lib.notes : [],
      })
    );
  },
};

const FOX_WORK_STATUS_KEY = "foxtoria-work-status";

const FOX_WORKS_KEY = "foxtoria-user-works";

window.FoxApi = {
  base() {
    const custom = String(window.FOXSTORIA_API || localStorage.getItem("foxtoria-api") || "").replace(/\/$/, "");
    if (custom) return custom;
    if (location.protocol === "http:" && location.port === "8000") return location.origin;
    return "http://127.0.0.1:8000";
  },
  headers() {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Fox-Author": encodeURIComponent(ownerHandle()),
      "X-Fox-Name": encodeURIComponent(ownerDisplayName()),
    };
  },
  async request(path, options) {
    const response = await fetch(`${this.base()}${path}`, {
      ...options,
      headers: { ...this.headers(), ...(options?.headers || {}) },
    });
    if (response.status === 204) return null;
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { detail: text.slice(0, 200) };
      }
    }
    if (!response.ok) {
      const detail = data?.detail || response.statusText;
      const err = new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      err.status = response.status;
      throw err;
    }
    return data;
  },
};

window.FoxRules = {
  FORBIDDEN: [
    { id: "abuse", group: "Поведение", label: "Оскорбления, травля, преследование" },
    { id: "threats", group: "Поведение", label: "Угрозы и призывы к насилию" },
    { id: "impersonation", group: "Поведение", label: "Выдача себя за другого или за администрацию" },
    { id: "scam", group: "Безопасность", label: "Мошенничество, фишинг, запрос паролей" },
    { id: "ban-evasion", group: "Безопасность", label: "Обход блокировок" },
    { id: "exploit", group: "Безопасность", label: "Эксплуатация ошибок сайта" },
    { id: "malware", group: "Безопасность", label: "Вредоносные файлы и ссылки" },
    { id: "minors", group: "Контент", label: "Сексуальный контент с несовершеннолетними" },
    { id: "extremism", group: "Контент", label: "Экстремизм" },
    { id: "crime", group: "Контент", label: "Инструкции для преступлений" },
    { id: "illegal", group: "Контент", label: "Запрещено законом РФ" },
    { id: "privacy", group: "Данные и права", label: "Чужие персональные данные, деанон" },
    { id: "stolen", group: "Данные и права", label: "Чужая работа, перевод или медиа" },
    { id: "rating", group: "Данные и права", label: "Неверный рейтинг или метки" },
    { id: "spam", group: "Площадка", label: "Спам и навязчивая реклама" },
    { id: "stats", group: "Площадка", label: "Накрутка статистики" },
    { id: "false-report", group: "Площадка", label: "Ложные или массовые жалобы" },
    { id: "other", group: "Другое", label: "Другое — опишу сам" },
  ],
  reasonsHTML() {
    const groups = [];
    this.FORBIDDEN.forEach((item) => {
      const name = item.group || "";
      if (!groups.length || groups[groups.length - 1].name !== name) groups.push({ name, items: [] });
      groups[groups.length - 1].items.push(item);
    });
    let index = 0;
    return groups
      .map(
        (group) => `<fieldset class="report-reason-group">
        <legend>${group.name}</legend>
        <div class="report-reason-chips">${group.items
          .map((item) => {
            const required = index++ === 0 ? " required" : "";
            return `<label class="report-chip"><input type="radio" name="reason_code" value="${item.id}"${required}><span>${item.label}</span></label>`;
          })
          .join("")}</div>
      </fieldset>`
      )
      .join("");
  },
};

window.FoxReport = {
  ensure() {
    let box = document.getElementById("report-dialog");
    if (box) return box;
    box = document.createElement("dialog");
    box.id = "report-dialog";
    box.className = "report-dialog";
    box.innerHTML = `<form method="dialog" class="report-form">
      <h2>Пожаловаться</h2>
      <p class="profile-meta" data-report-target></p>
      <div class="report-reasons">${FoxRules.reasonsHTML()}</div>
      <textarea name="reason" rows="3" placeholder="Если выбрали «Другое» — опишите коротко"></textarea>
      <div class="admin-reason-acts">
        <button type="submit" class="btn btn-primary" value="ok">Отправить</button>
        <button type="button" class="btn btn-outline" data-report-cancel>Отмена</button>
      </div>
    </form>`;
    document.body.appendChild(box);
    box.querySelector("[data-report-cancel]")?.addEventListener("click", () => box.close());
    return box;
  },
  isControl(el) {
    if (!el || el.closest("#report-dialog, [data-skip-report], [data-report-done], [data-report-cancel]")) return false;
    if (el.matches?.("[data-report-done], [data-report-cancel]")) return false;
    const aria = (el.getAttribute("aria-label") || "").trim();
    if (aria === "Пожаловаться") return true;
    if (el.classList.contains("linear-read-report")) return true;
    if (el.hasAttribute("data-reply-report")) return true;
    if (el.hasAttribute("data-report") && el.getAttribute("data-report") !== "done") return true;
    const named =
      el.getAttribute("data-review-act") ||
      el.getAttribute("data-pack-act") ||
      el.getAttribute("data-comment-act") ||
      el.getAttribute("data-act") ||
      el.getAttribute("data-msg-bubble-act") ||
      el.getAttribute("data-msg-act");
    if (named === "report") return true;
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    return text === "Пожаловаться";
  },
  payload(btn) {
    const comment = btn.closest("[data-comment-id], .linear-comment, .news-comment");
    const review = btn.closest(".review-card");
    const pack = btn.closest(".pack-card, [data-pack-id]");
    const reply = btn.closest(".reply-card, [data-reply-id]");
    const post = btn.closest(".blog-post, .news-post");
    const msg = btn.closest(".msg-row");
    const workNode = btn.closest("[data-work-id]") || document.querySelector("[data-work-id]");
    const workId =
      workNode?.getAttribute("data-work-id") || new URLSearchParams(location.search).get("id") || "";
    const href = location.pathname + location.search;
    if (comment) {
      const id = comment.getAttribute("data-comment-id") || comment.getAttribute("data-id") || "";
      const who = comment.querySelector(".user-link, strong, a")?.textContent?.trim() || "Комментарий";
      return { type: "comment", key: id || href, title: `Комментарий · ${who}`, href };
    }
    if (review) {
      const name = review.querySelector("[data-user-name], strong")?.textContent?.trim() || "Отзыв";
      return { type: "review", key: review.getAttribute("data-id") || href, title: `Отзыв · ${name}`, href };
    }
    if (pack) {
      const title = pack.querySelector("h2, h3, .pack-card-title")?.textContent?.trim() || "Сборник";
      return { type: "collection", key: pack.getAttribute("data-pack-id") || pack.dataset.id || href, title, href };
    }
    if (reply) {
      return { type: "reply", key: reply.getAttribute("data-reply-id") || href, title: "Обсуждение", href };
    }
    if (post) {
      const title = post.querySelector("h2")?.textContent?.trim() || "Запись";
      const kind = post.classList.contains("news-post") ? "news" : "blog";
      return { type: kind, key: post.getAttribute("data-id") || post.id || href, title, href };
    }
    if (msg) {
      const preview = (msg.querySelector("p")?.textContent || "").trim().slice(0, 80) || "Сообщение";
      return { type: "message", key: msg.getAttribute("data-msg-id") || href, title: preview, href };
    }
    if (btn.hasAttribute("data-report") && btn.getAttribute("data-report") === "user") {
      const handle =
        document.querySelector(".profile-handle")?.textContent?.replace(/^@/, "").trim() ||
        new URLSearchParams(location.search).get("u") ||
        "";
      const name = document.querySelector(".profile-name")?.textContent?.trim() || handle;
      return { type: "profile", key: handle, title: name, href: handle ? `profile.html?u=${encodeURIComponent(handle)}` : href };
    }
    if (workId) {
      return { type: "work", key: workId, title: document.getElementById("work-title")?.textContent || document.title, href };
    }
    return { type: "page", key: href, title: document.title, href };
  },
  mark(btn) {
    if (!btn) return;
    btn.classList.add("is-reported");
    btn.disabled = true;
    const card = btn.closest(".review-card, .pack-card, .reply-card, .linear-comment, .news-comment");
    card?.classList.add("is-reported");
    if (btn.matches("[data-review-act], [data-pack-act], [data-reply-report], [data-comment-act], [data-act], [data-msg-bubble-act]")) {
      btn.innerHTML = `<img src="assets/svg/флаг.svg" alt=""> Жалоба отправлена`;
      if (typeof hydrateUiIcons === "function") hydrateUiIcons(btn);
    } else if (btn.getAttribute("aria-label") === "Пожаловаться") {
      btn.setAttribute("aria-label", "Жалоба отправлена");
    }
  },
  open(payload) {
    const box = this.ensure();
    const form = box.querySelector("form");
    const target = box.querySelector("[data-report-target]");
    if (target) target.textContent = payload.title || document.title || "Объект жалобы";
    form.reason.value = "";
    const first = form.querySelector('input[name="reason_code"]');
    if (first) first.checked = true;
    return new Promise((resolve) => {
      const onClose = () => {
        box.removeEventListener("close", onClose);
        resolve(box.returnValue === "ok");
      };
      box.addEventListener("close", onClose);
      form.onsubmit = (event) => {
        event.preventDefault();
        const code = form.reason_code.value;
        const custom = String(form.reason.value || "").trim();
        const item = FoxRules.FORBIDDEN.find((row) => row.id === code);
        const reason = code === "other" ? custom || "Другое" : [item?.label, custom].filter(Boolean).join(". ");
        if (window.FoxApi) {
          FoxApi.request("/api/reports", {
            method: "POST",
            body: JSON.stringify({
              target_type: payload.type || "page",
              target_key: payload.key || "",
              target_title: payload.title || document.title,
              target_url: payload.href || location.pathname + location.search,
              reason_code: code,
              reason,
            }),
          }).catch(() => {});
        }
        box.returnValue = "ok";
        box.close();
      };
      box.returnValue = "";
      if (typeof box.showModal === "function") box.showModal();
      else box.close();
    });
  },
};

window.FoxAdmin = {
  isAdmin() {
    return typeof isSiteAdmin === "function" ? isSiteAdmin() : false;
  },
  ensureDialog() {
    let box = document.getElementById("admin-reason-dialog");
    if (box) return box;
    box = document.createElement("dialog");
    box.id = "admin-reason-dialog";
    box.className = "admin-reason-dialog";
    box.innerHTML = `
      <form method="dialog" class="admin-reason-form">
        <h2 id="admin-reason-title">Причина удаления</h2>
        <p>Автор получит это в личные сообщения от поддержки.</p>
        <textarea id="admin-reason-text" required minlength="3" rows="5" placeholder="Почему контент удаляется"></textarea>
        <div class="admin-reason-acts">
          <button type="submit" class="btn btn-primary" value="ok">Удалить</button>
          <button type="button" class="btn btn-outline" data-admin-reason-cancel>Отмена</button>
        </div>
      </form>`;
    document.body.appendChild(box);
    box.querySelector("[data-admin-reason-cancel]")?.addEventListener("click", () => box.close());
    return box;
  },
  promptReason(title) {
    const box = this.ensureDialog();
    const heading = box.querySelector("#admin-reason-title");
    const field = box.querySelector("#admin-reason-text");
    if (heading) heading.textContent = title || "Причина удаления";
    if (field) field.value = "";
    return new Promise((resolve) => {
      const onClose = () => {
        box.removeEventListener("close", onClose);
        if (box.returnValue === "ok") resolve(String(field?.value || "").trim());
        else resolve("");
      };
      box.addEventListener("close", onClose);
      box.returnValue = "";
      if (typeof box.showModal === "function") box.showModal();
      else {
        const text = window.prompt(title || "Причина удаления", "");
        resolve(String(text || "").trim());
      }
    });
  },
  async remove(payload) {
    const reason = await this.promptReason(payload.title || "Причина удаления");
    if (!reason) return null;
    return FoxApi.request("/api/admin/remove", {
      method: "POST",
      body: JSON.stringify({ ...payload, reason }),
    });
  },
};

document.addEventListener("DOMContentLoaded", function foxAdminChrome() {
  if (window.FoxApi) {
    FoxApi.request("/api/stats/hit", {
      method: "POST",
      body: JSON.stringify({ path: location.pathname || "/" }),
    }).catch(() => {});
  }
  document.addEventListener(
    "click",
    (event) => {
      const btn = event.target.closest("button, a, [role='menuitem']");
      if (!btn || !FoxReport.isControl(btn) || btn.classList.contains("is-reported")) return;
      event.preventDefault();
      const payload = FoxReport.payload(btn);
      FoxReport.open(payload).then((ok) => {
        if (ok) FoxReport.mark(btn);
      });
    },
    true
  );
});

window.FoxIdentity = {
  RESERVED: ["foxstoria", "foxstoria-support", "admin", "support", "moderator", "help"],
  cleanHandle(value) {
    return String(value || "")
      .replace(/^@/, "")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 24)
      .toLowerCase();
  },
  cleanName(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 48);
  },
  _localPeople() {
    const rows = [];
    const seen = new Set();
    const push = (handle, name) => {
      const nick = this.cleanHandle(handle);
      const label = this.cleanName(name);
      const key = `${nick}|${label.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({ handle: nick, name: label });
    };
    const bags = [];
    if (window.FoxWorks) bags.push(FoxWorks.load(), FoxWorks.publicWorks || [], FoxWorks.fileWorks || []);
    bags.flat().forEach((work) => {
      if (work?.author_slug || work?.author) push(work.author_slug, work.author);
    });
    return rows;
  },
  async available(handle, name) {
    const mineHandle = this.cleanHandle(typeof ownerHandle === "function" ? ownerHandle() : "");
    const mineName = this.cleanName(typeof ownerDisplayName === "function" ? ownerDisplayName() : "");
    const nick = handle == null ? "" : this.cleanHandle(handle);
    const label = name == null ? "" : this.cleanName(name);
    try {
      const params = new URLSearchParams();
      if (handle != null) params.set("username", nick);
      if (name != null) params.set("name", label);
      return await FoxApi.request(`/api/identity/available?${params}`);
    } catch {
      const people = this._localPeople();
      const usernameOk =
        handle == null ||
        (nick.length >= 3 &&
          !this.RESERVED.includes(nick) &&
          (nick === mineHandle || !people.some((row) => row.handle && row.handle === nick)));
      const nameOk =
        name == null ||
        (Boolean(label) && (label.toLowerCase() === mineName.toLowerCase() || !people.some((row) => row.name.toLowerCase() === label.toLowerCase())));
      return {
        username: usernameOk,
        name: nameOk,
        username_error: usernameOk
          ? ""
          : nick.length < 3
            ? "Юзернейм от 3 символов: латиница, цифры и _."
            : this.RESERVED.includes(nick)
              ? "Этот юзернейм зарезервирован."
              : "Такой юзернейм уже занят.",
        name_error: nameOk ? "" : label ? "Такое имя уже занято." : "Введите имя.",
      };
    }
  },
  persist(patch) {
    let raw = {};
    try {
      raw = JSON.parse(localStorage.getItem("foxtoria-profile") || "{}") || {};
    } catch {
      raw = {};
    }
    const next = { ...raw, ...patch };
    localStorage.setItem("foxtoria-profile", JSON.stringify(next));
    if (window.FoxApi) {
      FoxApi.request("/api/me/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: next.name,
          display_name: next.name,
          username: next.handle,
          handle: next.handle,
          bio: next.bio,
          avatar: next.avatar,
          links: next.links,
        }),
      }).catch(() => {});
    }
  },
};

window.FoxWorks = {
  KEY: FOX_WORKS_KEY,
  publicWorks: [],
  fileWorks: [],
  _hydrate: null,
  load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(FOX_WORKS_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      const dest = {
        formats: new Set([
          "povestvovanie-ot-pervogo-litsa",
          "propuschennaya-stsena",
          "zanavesochnaya-istoriya",
          "nelinejnoe-povestvovanie",
          "sbornik-drabblov",
          "atmosfernaya-zarisovka",
          "lapslok",
          "povestvovanie-ot-neskolkih-lits",
          "character-study",
          "povestvovanie-v-nastoyaschem-vremeni",
          "nenadezhnyj-rasskazchik",
          "netoroplivoe-povestvovanie",
          "povestvovanie-vo-vtorom-litse",
          "povestvovanie-ot-tretego-litsa",
          "mikrofikshen",
          "novellizatsiya",
          "tajmskip",
          "pwp",
          "seks-v-poslednej-glave",
          "drabbl",
          "eksperiment",
          "sbornik-mini",
          "novella",
        ]),
        warnings: new Set([
          "otkrytyj-final",
          "neschastlivyj-final",
          "nameki-na-seks",
          "poshlyj-yumor",
          "upominaniya-seksa",
          "prostitutsiya",
          "seks-so-smertelnym-ishodom",
          "seks-industriya",
          "seks-s-ispolzovaniem-odurmanivayuschih-veschestv",
        ]),
        genres: new Set([
          "omegavers",
          "ust",
          "muzhskaya-beremennost",
          "rst",
          "druzya-s-privilegiyami",
          "seks-bez-obyazatelstv",
          "ot-seksualnyh-partnerov-k-vozlyublennym",
          "gnezdovanie",
          "vragi-s-privilegiyami",
          "ot-vragov-k-seksualnym-partn-ram",
        ]),
      };
      const targetOf = (slug) => {
        if (dest.formats.has(slug)) return "formats";
        if (dest.warnings.has(slug)) return "warnings";
        if (dest.genres.has(slug)) return "genres";
        return "";
      };
      return parsed.map((work) => {
        const bags = {
          genres: [...(Array.isArray(work.genres) ? work.genres : [])],
          formats: [...(Array.isArray(work.formats) ? work.formats : [])],
          warnings: [...(Array.isArray(work.warnings) ? work.warnings : [])],
          kinks: [...(Array.isArray(work.kinks) ? work.kinks : [])],
        };
        let changed = false;
        for (const from of Object.keys(bags)) {
          const keep = [];
          for (const slug of bags[from]) {
            const to = targetOf(slug);
            if (!to || to === from) {
              keep.push(slug);
              continue;
            }
            changed = true;
            if (!bags[to].includes(slug)) bags[to].push(slug);
          }
          bags[from] = keep;
        }
        return changed ? { ...work, ...bags } : work;
      });
    } catch {
      return [];
    }
  },
  save(list) {
    localStorage.setItem(FOX_WORKS_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  },
  sameId(a, b) {
    return String(a || "") === String(b || "");
  },
  get(id) {
    if (!id) return null;
    return (
      this.load().find((work) => this.sameId(work.id, id)) ||
      this.publicWorks.find((work) => this.sameId(work.id, id)) ||
      this.fileWorks.find((work) => this.sameId(work.id, id)) ||
      null
    );
  },
  upsertLocal(work) {
    if (!work || !work.id) return work;
    const list = this.load().filter((item) => !this.sameId(item.id, work.id));
    list.unshift(work);
    this.save(list);
    if (this.isListed(work)) {
      this.publicWorks = [work, ...this.publicWorks.filter((item) => !this.sameId(item.id, work.id))];
    } else {
      this.publicWorks = this.publicWorks.filter((item) => !this.sameId(item.id, work.id));
    }
    return work;
  },
  migrateId(fromId, toId) {
    if (!fromId || !toId || this.sameId(fromId, toId)) return;
    try {
      const linear = localStorage.getItem(this.linearStore(fromId));
      if (linear && !localStorage.getItem(this.linearStore(toId))) {
        localStorage.setItem(this.linearStore(toId), linear);
      }
      const messenger = localStorage.getItem(this.messengerStore(fromId));
      if (messenger && !localStorage.getItem(this.messengerStore(toId))) {
        localStorage.setItem(this.messengerStore(toId), messenger);
      }
      const map = localStorage.getItem(this.mapStore(fromId));
      if (map && !localStorage.getItem(this.mapStore(toId))) {
        localStorage.setItem(this.mapStore(toId), map);
      }
    } catch {
      /* ignore */
    }
    this.save(this.load().filter((item) => !this.sameId(item.id, fromId)));
  },
  isServerId(id) {
    return /^\d+$/.test(String(id || ""));
  },
  async hydrate() {
    if (this._hydrate) return this._hydrate;
    this._hydrate = (async () => {
      try {
        const mine = await FoxApi.request("/api/works");
        if (Array.isArray(mine?.works)) this.save(mine.works);
      } catch {
        /* offline: keep localStorage */
      }
      try {
        const catalog = await FoxApi.request("/api/catalog");
        this.publicWorks = Array.isArray(catalog?.works) ? catalog.works : [];
      } catch {
        this.publicWorks = [];
      }
      try {
        const res = await fetch("works.json", { cache: "no-store" });
        const data = res.ok ? await res.json() : { works: [] };
        this.fileWorks = Array.isArray(data.works) ? data.works : [];
      } catch {
        this.fileWorks = [];
      }
      const byId = new Map();
      this.fileWorks.forEach((work) => byId.set(String(work.id), work));
      this.publicWorks.forEach((work) => byId.set(String(work.id), work));
      this.publicWorks = [...byId.values()];
      return true;
    })();
    return this._hydrate;
  },
  async fetchOne(id) {
    if (!this.isServerId(id)) return this.get(id);
    try {
      const work = await FoxApi.request(`/api/works/${encodeURIComponent(id)}`);
      if (work?.id) this.upsertLocal(work);
      return work;
    } catch {
      return this.get(id);
    }
  },
  async upsert(work) {
    if (!work) return work;
    if (work.id) this.upsertLocal(work);
    this.seed(work);
    const createBody = { ...work, id: undefined, created_local: undefined };
    try {
      let saved = null;
      const canPut = this.isServerId(work.id) && !work.created_local;
      if (canPut) {
        try {
          saved = await FoxApi.request(`/api/works/${encodeURIComponent(work.id)}`, {
            method: "PUT",
            body: JSON.stringify(work),
          });
        } catch (err) {
          if (err.status !== 404) throw err;
        }
      }
      if (!saved) {
        saved = await FoxApi.request("/api/works", { method: "POST", body: JSON.stringify(createBody) });
      }
      if (saved?.id) {
        if (work.id && !this.sameId(work.id, saved.id)) this.migrateId(work.id, saved.id);
        delete saved.created_local;
        this.upsertLocal(saved);
        this.seed(saved);
        return saved;
      }
    } catch {
      /* keep local copy */
    }
    if (!work.id) {
      work.id = this.newId();
      work.created_local = true;
      work.href = `story.html?id=${encodeURIComponent(work.id)}`;
      this.upsertLocal(work);
      this.seed(work);
    }
    return work;
  },
  async remove(id) {
    if (!window.confirm("Удалить работу? Она сразу исчезнет с сайта. Файлы на сервере хранятся ещё 3 дня, потом стираются без восстановления.")) {
      return;
    }
    this.save(this.load().filter((work) => !this.sameId(work.id, id)));
    if (!this.isServerId(id)) return;
    try {
      await FoxApi.request(`/api/works/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
      /* ignore */
    }
  },
  async pullContent(work) {
    const id = work?.id;
    if (!this.isServerId(id)) return;
    const key = this.contentStore(work);
    try {
      if (localStorage.getItem(key)) return;
      const remote = await FoxApi.request(`/api/works/${encodeURIComponent(id)}/content`);
      if (remote && typeof remote === "object" && Object.keys(remote).length) {
        localStorage.setItem(key, JSON.stringify(remote));
      }
    } catch {
      /* ignore */
    }
  },
  pushContent(id, data) {
    if (!this.isServerId(id) || !data) return;
    FoxApi.request(`/api/works/${encodeURIComponent(id)}/content`, {
      method: "PUT",
      body: JSON.stringify(data),
    }).catch(() => {});
  },
  newId() {
    const key = "foxtoria-work-seq";
    const nums = [...this.load(), ...(this.publicWorks || []), ...(this.fileWorks || [])]
      .map((work) => Number(work.id))
      .filter((n) => Number.isInteger(n) && n > 0 && n < 1e9);
    const stored = Number(localStorage.getItem(key) || 0);
    const next = Math.max(stored, ...nums, 0) + 1;
    localStorage.setItem(key, String(next));
    return String(next);
  },
  isListed(work) {
    if (!work) return false;
    if (work.listed === true) return work.status !== "draft";
    if (work.listed === false || work.status === "draft") return false;
    return true;
  },
  CURRENT_KEY: "foxtoria-current-work",
  EDITOR_LINEAR: "foxtoria-editor-linear",
  EDITOR_MESSENGER: "foxtoria-editor-messenger",
  EDITOR_MAP: "foxtoria-editor",
  MESSENGER_MAX_IMAGES: 20,
  idFromUrl() {
    return String(new URLSearchParams(location.search).get("id") || "").trim();
  },
  remember(id) {
    try {
      if (id) sessionStorage.setItem(this.CURRENT_KEY, id);
    } catch {
      /* ignore */
    }
  },
  linearStore(id) {
    return id ? `${this.EDITOR_LINEAR}:${id}` : this.EDITOR_LINEAR;
  },
  messengerStore(id) {
    return id ? `${this.EDITOR_MESSENGER}:${id}` : this.EDITOR_MESSENGER;
  },
  mapStore(id) {
    return id ? `${this.EDITOR_MAP}:${id}` : this.EDITOR_MAP;
  },
  normalizeStoryType(value) {
    const type = String(value || "").trim();
    if (type === "linear" || type === "messenger") return type;
    return "interactive";
  },
  storyTypeLabel(workOrType, long) {
    const type = typeof workOrType === "object" ? this.normalizeStoryType(workOrType?.story_type) : this.normalizeStoryType(workOrType);
    if (long) {
      return { interactive: "Интерактивная история", linear: "Линейная история", messenger: "Мессенджеры" }[type] || type;
    }
    return { interactive: "Интерактивная", linear: "Линейная", messenger: "Мессенджеры" }[type] || type;
  },
  contentStore(workOrId) {
    const work = workOrId && typeof workOrId === "object" ? workOrId : this.get(workOrId);
    const id = work?.id || (typeof workOrId === "string" ? workOrId : "");
    const type = this.normalizeStoryType(work?.story_type);
    if (type === "linear") return this.linearStore(id);
    if (type === "messenger") return this.messengerStore(id);
    return this.mapStore(id);
  },
  urls(workOrId) {
    const work = workOrId && typeof workOrId === "object" ? workOrId : this.get(workOrId);
    const id = work?.id || (typeof workOrId === "string" ? workOrId : "");
    const q = id ? `?id=${encodeURIComponent(id)}` : "";
    const type = this.normalizeStoryType(work?.story_type);
    const editorPage = type === "linear" ? "editor-linear.html" : type === "messenger" ? "editor-messenger.html" : "editor.html";
    const readPage = type === "linear" ? "read-linear.html" : type === "messenger" ? "read-messenger.html" : "read-interactive.html";
    return {
      id,
      studio: id ? `studio.html${q}` : "work-new.html",
      editor: `${editorPage}${q}`,
      public: id ? `story.html${q}` : "catalog.html",
      read: `${readPage}${q}`,
    };
  },
  emptyLinear(work) {
    const ch = `ch-${Date.now().toString(36)}`;
    return {
      workId: work?.id || "",
      title: work?.title || "Без названия",
      selectedId: ch,
      characters: [],
      notes: [],
      chapters: [
        {
          id: ch,
          title: "Глава 1",
          summary: "",
          notes: "",
          status: "draft",
          html: "",
          cover: "",
          audioKey: "",
          audioName: "",
          audioEmbed: "",
          isEnding: false,
        },
      ],
    };
  },
  messengerDemo(work) {
    if (String(work?.id || "") !== "kinder-locker") return null;
    const images = Array.from({ length: 10 }, (_, i) => `assets/test/messenger/${String(i + 1).padStart(2, "0")}.jpg`);
    const ch = "ch-kinder-1";
    return {
      workId: work.id,
      title: work.title || "Без названия",
      selectedId: ch,
      characters: [],
      notes: [],
      chapters: [
        {
          id: ch,
          title: "24–25 марта",
          summary: "",
          notes: "",
          status: "published",
          images,
          cover: images[0],
          isEnding: true,
        },
      ],
    };
  },
  emptyMessenger(work) {
    const demo = this.messengerDemo(work);
    if (demo) return demo;
    const ch = `ch-${Date.now().toString(36)}`;
    return {
      workId: work?.id || "",
      title: work?.title || "Без названия",
      selectedId: ch,
      characters: [],
      notes: [],
      chapters: [
        {
          id: ch,
          title: "Глава 1",
          summary: "",
          notes: "",
          status: "draft",
          images: [],
          cover: "",
          isEnding: false,
        },
      ],
    };
  },
  emptyInteractive(work) {
    const chapterId = `ch-${Date.now().toString(36)}`;
    const sceneId = `sc-${Date.now().toString(36)}`;
    return {
      workId: work?.id || "",
      title: work?.title || "Без названия",
      chapters: [{ id: chapterId, title: "Глава 1" }],
      scenes: [
        {
          id: sceneId,
          chapterId,
          title: "Начало",
          description: "",
          notes: "",
          background: "",
          isStart: true,
          isEnding: false,
          published: false,
          audioKey: "",
          audioName: "",
          audioEmbed: "",
          blocks: [],
          choices: [],
        },
      ],
      selectedId: sceneId,
      characters: [],
      notes: [],
    };
  },
  seed(work) {
    if (!work?.id) return;
    const writeEmpty = () => {
      try {
        const type = this.normalizeStoryType(work.story_type);
        if (type === "linear") {
          const key = this.linearStore(work.id);
          if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(this.emptyLinear(work)));
        } else if (type === "messenger") {
          const key = this.messengerStore(work.id);
          const demo = this.messengerDemo(work);
          let existing = null;
          try {
            existing = JSON.parse(localStorage.getItem(key) || "null");
          } catch {
            existing = null;
          }
          const empty =
            !existing ||
            !(existing.chapters || []).some((chapter) => (chapter.images || []).length);
          if (empty) localStorage.setItem(key, JSON.stringify(demo || this.emptyMessenger(work)));
        } else {
          const key = this.mapStore(work.id);
          if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(this.emptyInteractive(work)));
        }
      } catch {
        /* quota */
      }
    };
    return Promise.resolve(this.pullContent(work)).then(writeEmpty, writeEmpty);
  },
  csv(form, name) {
    const raw = form?.elements?.[name]?.value;
    return String(raw || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  },
  pickerNames(form, picker) {
    const root = form?.querySelector?.(`[data-tax-picker="${picker}"]`);
    if (!root) return [];
    return [...root.querySelectorAll(".tax-chip")]
      .map((chip) => chip.textContent.replace(/\s*×\s*$/, "").trim())
      .filter(Boolean);
  },
  fromForm(form, existing, intent) {
    const prev = existing && typeof existing === "object" ? existing : {};
    const title = String(form.elements.title?.value || "").trim();
    const storyType = this.normalizeStoryType(form.elements.story_type?.value);
    const publish = intent === "publish";
    let status = String(form.elements.status?.value || prev.status || "draft");
    if (publish && status === "draft") status = "in_progress";
    if (intent === "draft") status = "draft";
    const listed = publish || (status !== "draft" && intent !== "draft");
    const fandoms = this.csv(form, "fandoms");
    const fandomNames = this.pickerNames(form, "fandoms");
    const id = prev.id || "";
    const fandomLabel = fandomNames[0] || (fandoms.includes("original") || fandoms[0] === "original" ? "Ориджинал" : prev.fandom || "");
    return {
      ...prev,
      id,
      title: title || "Без названия",
      story_type: storyType,
      romance: String(form.elements.romance?.value || "").trim(),
      age: String(form.querySelector('[name="age"]:checked')?.value || form.elements.age?.value || "").trim(),
      description: String(form.elements.description?.value || "").trim(),
      author_notes: String(form.elements.author_notes?.value || "").trim(),
      status,
      listed,
      is_completed: status === "completed",
      planned_size: String(form.elements.planned_size?.value || prev.planned_size || "mini"),
      work_size: status === "completed" ? String(form.elements.planned_size?.value || prev.work_size || "mini") : prev.work_size,
      fandoms,
      fandom_names: fandomNames.length ? fandomNames : prev.fandom_names,
      fandom: fandomLabel,
      genres: this.csv(form, "genres"),
      formats: this.csv(form, "formats"),
      warnings: this.csv(form, "warnings"),
      kinks: this.csv(form, "kinks"),
      characters: this.csv(form, "characters"),
      character_names: this.pickerNames(form, "characters"),
      pairings: String(form.elements.pairings?.value || "").trim(),
      cover: prev.cover || "",
      author: prev.author || ownerDisplayName(),
      author_slug: prev.author_slug || ownerHandle(),
      coauthor: String(form.elements.coauthor?.value || prev.coauthor || "").trim(),
      editor: String(form.elements.editor?.value || prev.editor || "").trim(),
      paid: Boolean(form.elements.paid?.checked),
      paid_min_level: Math.max(1, Math.round(Number(form.elements.paid_min_level?.value) || prev.paid_min_level || 1)),
      href: id ? `story.html?id=${encodeURIComponent(id)}` : "story.html",
      likes: Number(prev.likes) || 0,
      likesWeek: Number(prev.likesWeek ?? prev.likes_week) || 0,
      plays: Number(prev.plays) || 0,
      role: prev.role || "author",
      createdAt: prev.createdAt || new Date().toISOString(),
      publishedAt: listed ? prev.publishedAt || new Date().toISOString() : prev.publishedAt || "",
      updatedAt: new Date().toISOString(),
    };
  },
};

window.FoxFicbook = {
  fold(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[«»""]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  },
  itemKeys(item) {
    const keys = [item?.name, item?.slug, ...(item?.synonyms || [])];
    String(item?.name || "")
      .split(/\s*[\/|]\s*/)
      .forEach((part) => keys.push(part));
    return keys.map((key) => this.fold(key)).filter(Boolean);
  },
  matchOne(items, label) {
    const q = this.fold(label);
    if (!q) return null;
    const exact = items.find((item) => this.itemKeys(item).includes(q));
    if (exact) return exact;
    if (q.startsWith("ориджинал") || q.startsWith("оригинал")) {
      return items.find((item) => item.slug === "original") || null;
    }
    if (q.length < 4) return null;
    return (
      items.find((item) =>
        this.itemKeys(item).some((key) => {
          if (key === q) return true;
          if (q.length >= 6 && (key.includes(q) || q.includes(key) && key.length >= 6)) return true;
          return false;
        })
      ) || null
    );
  },
  charSlug(fandomSlug, name) {
    const base = String(name || "")
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^a-zа-я0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");
    return `${fandomSlug || "char"}-${base || "name"}`;
  },
  async loadTax() {
    if (this._tax) return this._tax;
    const [tax, fandoms, chars] = await Promise.all([
      fetch("taxonomy.json").then((res) => (res.ok ? res.json() : {})),
      fetch("fandoms.json").then((res) => (res.ok ? res.json() : [])),
      fetch("characters-by-fandom.json").then((res) => (res.ok ? res.json() : {})),
    ]);
    const list = Array.isArray(fandoms) ? fandoms : [];
    if (!list.some((item) => item.slug === "original")) {
      list.unshift({ name: "Ориджинал", slug: "original", synonyms: ["оригинал", "ориджиналы", "свой мир"] });
    }
    this._tax = {
      genres: tax.genres || [],
      formats: tax.formats || [],
      warnings: tax.warnings || [],
      kinks: tax.kinks || [],
      fandoms: list,
      characters: chars && typeof chars === "object" ? chars : {},
    };
    return this._tax;
  },
  mapCard(data, tax) {
    const unmatched = [];
    const buckets = { genres: [], formats: [], warnings: [], kinks: [] };
    const used = new Set();
    function take(kind, item) {
      if (!item || used.has(`${kind}:${item.slug}`)) return;
      used.add(`${kind}:${item.slug}`);
      buckets[kind].push(item.slug);
    }
    (data.tags || []).forEach((tag) => {
      const warn = this.matchOne(tax.warnings, tag);
      if (warn) {
        take("warnings", warn);
        return;
      }
      const kink = this.matchOne(tax.kinks, tag);
      if (kink) {
        take("kinks", kink);
        return;
      }
      const genre = this.matchOne(tax.genres, tag);
      if (genre) {
        take("genres", genre);
        return;
      }
      const format = this.matchOne(tax.formats, tag);
      if (format) {
        take("formats", format);
        return;
      }
      unmatched.push(tag);
    });
    if ((data.fandoms || []).length > 1) {
      const cross = this.matchOne(tax.genres, "Кроссовер");
      if (cross) take("genres", cross);
      else {
        const crossFmt = this.matchOne(tax.formats, "Кроссовер");
        if (crossFmt) take("formats", crossFmt);
      }
    }
    const fandomItems = [];
    (data.fandoms || []).forEach((name) => {
      const item = this.matchOne(tax.fandoms, name);
      if (item) fandomItems.push(item);
      else unmatched.push(name);
    });
    if (!fandomItems.length) {
      const original = tax.fandoms.find((item) => item.slug === "original");
      if (original) fandomItems.push(original);
    }
    const fandomSlugs = fandomItems.map((item) => item.slug);
    const charNames = [];
    const charSlugs = [];
    (data.characters || []).forEach((name) => {
      let slug = "";
      for (const fan of fandomSlugs) {
        const list = tax.characters[fan] || [];
        const hit = list.find((item) => this.fold(item) === this.fold(name) || this.fold(item).includes(this.fold(name)));
        if (hit) {
          slug = this.charSlug(fan, typeof hit === "string" ? hit : hit.name);
          charNames.push(typeof hit === "string" ? hit : hit.name);
          break;
        }
      }
      if (!slug) {
        charNames.push(name);
        slug = this.charSlug(fandomSlugs[0] || "original", name);
      }
      charSlugs.push(slug);
    });
    const notes = [
      data.author_notes,
      data.fb_author ? `Автор на ФБ: ${data.fb_author}` : "",
      data.url ? `Импорт с ФБ: ${data.url}` : "",
      unmatched.length ? `Метки с ФБ без точного совпадения: ${unmatched.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    return {
      title: data.title || "Без названия",
      story_type: "linear",
      romance: data.romance || "gen",
      age: data.age || "0+",
      description: data.description || "",
      author_notes: notes,
      status: "draft",
      listed: false,
      fandoms: fandomSlugs,
      fandom_names: fandomItems.map((item) => item.name),
      fandom: fandomItems[0]?.name || "",
      genres: buckets.genres,
      formats: buckets.formats,
      warnings: buckets.warnings,
      kinks: data.age === "18+" ? buckets.kinks : [],
      characters: charSlugs,
      character_names: [...new Set(charNames)],
      pairings: (data.pairings || []).join("\n"),
    };
  },
  openDialog() {
    let dialog = document.querySelector(".work-dialog");
    if (!dialog) {
      dialog = document.createElement("div");
      dialog.className = "work-dialog";
      dialog.hidden = true;
      document.body.append(dialog);
    }
    dialog.innerHTML = `
      <form class="work-dialog-card work-dialog-card--import" data-ficbook-form>
        <h2>Импорт с ФБ</h2>
        <p class="work-dialog-lead">Вставьте ссылку на свою работу на ficbook.net. Мы заберём шапку и главы в линейный черновик и разложим совпавшие метки.</p>
        <label class="work-dialog-field">
          <span>Ссылка</span>
          <input type="url" name="url" required placeholder="https://ficbook.net/readfic/…">
        </label>
        <label class="work-dialog-check">
          <input type="checkbox" name="confirm_author" required>
          <span>Подтверждаю, что я автор этой работы</span>
        </label>
        <p class="work-dialog-error" data-ficbook-error hidden></p>
        <div class="work-dialog-actions">
          <button type="button" class="btn btn-outline" data-ficbook-cancel>Отмена</button>
          <button type="submit" class="btn btn-primary" data-ficbook-submit>Импортировать</button>
        </div>
      </form>`;
    const form = dialog.querySelector("[data-ficbook-form]");
    const errorEl = dialog.querySelector("[data-ficbook-error]");
    const submit = dialog.querySelector("[data-ficbook-submit]");
    const hide = () => {
      dialog.hidden = true;
    };
    dialog.querySelector("[data-ficbook-cancel]")?.addEventListener("click", hide);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) hide();
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const url = String(new FormData(form).get("url") || "").trim();
      const confirmAuthor = form.querySelector('[name="confirm_author"]')?.checked;
      errorEl.hidden = true;
      if (!confirmAuthor) {
        errorEl.hidden = false;
        errorEl.textContent = "Нужно подтверждение авторства.";
        return;
      }
      submit.disabled = true;
      submit.textContent = "Загружаем…";
      try {
        const data = await FoxApi.request("/api/import/ficbook", {
          method: "POST",
          body: JSON.stringify({ url, confirm_author: true }),
        });
        const tax = await this.loadTax();
        const card = this.mapCard(data, tax);
        const saved = await FoxWorks.upsert(card);
        const chapters = (data.chapters || []).map((chap, index) => ({
          id: `ch-${Date.now().toString(36)}-${index}`,
          title: chap.title || `Глава ${index + 1}`,
          summary: "",
          notes: chap.notes || "",
          status: "draft",
          html: chap.html || "",
          cover: "",
          audioKey: "",
          audioName: "",
          audioEmbed: "",
          isEnding: false,
        }));
        if (!chapters.length) {
          const empty = FoxWorks.emptyLinear(saved);
          chapters.push(empty.chapters[0]);
        }
        const linear = {
          workId: saved.id,
          title: saved.title,
          selectedId: chapters[0].id,
          characters: [],
          notes: [],
          chapters,
        };
        localStorage.setItem(FoxWorks.linearStore(saved.id), JSON.stringify(linear));
        FoxWorks.pushContent(saved.id, linear);
        location.href = FoxWorks.urls(saved).editor;
      } catch (err) {
        errorEl.hidden = false;
        errorEl.textContent = err.message || "Не получилось импортировать.";
        submit.disabled = false;
        submit.textContent = "Импортировать";
      }
    });
    dialog.hidden = false;
    form.querySelector("input[name=url]")?.focus();
  },
};

window.FoxWorkStatus = {
  KEY: FOX_WORK_STATUS_KEY,
  labels: {
    draft: "Черновик",
    in_progress: "В процессе",
    completed: "Завершена",
  },
  loadMap() {
    try {
      const raw = localStorage.getItem(FOX_WORK_STATUS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      if (typeof parsed === "string") return { letters: parsed };
      return {};
    } catch {
      return {};
    }
  },
  get(id) {
    const map = window.FoxWorkStatus.loadMap();
    const key = id || "letters";
    return map[key] || "";
  },
  set(id, status) {
    const map = window.FoxWorkStatus.loadMap();
    map[id || "letters"] = status;
    localStorage.setItem(FOX_WORK_STATUS_KEY, JSON.stringify(map));
  },
  fromChapters(chapters, workId) {
    const list = Array.isArray(chapters) ? chapters : [];
    const live = (ch) =>
      window.FoxChapterStatus ? FoxChapterStatus.isLive(ch, workId) : ch.status === "published";
    if (list.some((ch) => ch.isEnding && live(ch))) return "completed";
    if (list.some((ch) => live(ch))) return "in_progress";
    return "draft";
  },
};

window.FoxChapterStatus = {
  OPTIONS: [
    { id: "published", label: "Опубликовано" },
    { id: "draft", label: "Черновик" },
    { id: "scheduled", label: "Отложить" },
  ],
  label(status) {
    return this.OPTIONS.find((item) => item.id === status)?.label || "Черновик";
  },
  toLocalInput(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },
  fromLocalInput(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : "";
  },
  waitCount(workId, partId) {
    const waits = loadBranchWaits(workId);
    if (partId) {
      const matched = waits.filter((wait) => wait.next === partId);
      if (matched.length) return matched.length;
    }
    if (waits.length) return waits.length;
    return localStorage.getItem("foxtoria-wait-work:" + workId) === "1" ? 1 : 0;
  },
  normalize(part, fallback) {
    if (!part) return part;
    if (part.status === "hidden") part.status = "draft";
    if (!["published", "draft", "scheduled"].includes(part.status)) {
      if (typeof part.published === "boolean") part.status = part.published ? "published" : "draft";
      else part.status = fallback || "draft";
    }
    if (part.scheduleMode !== "wait") part.scheduleMode = "date";
    part.publishAt = part.publishAt || "";
    const need = Number(part.publishWait);
    part.publishWait = Number.isFinite(need) && need > 0 ? Math.floor(need) : 10;
    part.published = part.status === "published";
    return part;
  },
  isDue(part, workId) {
    if (!part || part.status !== "scheduled") return false;
    if (part.scheduleMode === "wait") {
      const need = Number(part.publishWait) || 0;
      return need > 0 && this.waitCount(workId, part.id) >= need;
    }
    if (!part.publishAt) return false;
    const at = Date.parse(part.publishAt);
    return Number.isFinite(at) && Date.now() >= at;
  },
  applyDue(part, workId, fallback) {
    this.normalize(part, fallback);
    if (this.isDue(part, workId)) {
      part.status = "published";
      part.published = true;
    }
    return part;
  },
  isLive(part, workId) {
    if (!part) return false;
    const status = part.status === "hidden" ? "draft" : part.status;
    if (status === "published") return true;
    if (status === "scheduled") return this.isDue(part, workId);
    if (!status && typeof part.published === "boolean") return part.published;
    return false;
  },
  bind(opts) {
    const btn = document.getElementById("chapter-status-btn");
    const menu = document.getElementById("chapter-status-menu");
    const label = document.getElementById("chapter-status-label");
    const schedule = document.getElementById("chapter-status-schedule");
    const saveBtns = [...document.querySelectorAll(".editor-save-btn")];
    if (!btn || !menu || !opts?.getPart) return { paint() {} };
    const close = () => {
      menu.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    };
    const paint = () => {
      const part = opts.getPart();
      if (!part) return;
      this.normalize(part, opts.fallback);
      const status = part.status || "draft";
      if (label) label.textContent = "Статус: " + this.label(status);
      menu.querySelectorAll("[data-status]").forEach((item) => {
        const on = item.getAttribute("data-status") === status;
        item.setAttribute("aria-checked", on ? "true" : "false");
      });
      if (schedule) {
        schedule.hidden = status !== "scheduled";
        schedule.querySelectorAll('input[name="chapter-sched-mode"]').forEach((radio) => {
          radio.checked = radio.value === (part.scheduleMode || "date");
        });
        const at = document.getElementById("chapter-publish-at");
        const wait = document.getElementById("chapter-publish-wait");
        const hint = document.getElementById("chapter-wait-now");
        if (at && document.activeElement !== at) at.value = this.toLocalInput(part.publishAt);
        if (wait && document.activeElement !== wait) wait.value = String(part.publishWait || 10);
        if (hint) hint.textContent = "Сейчас ждут: " + this.waitCount(opts.workId, part.id);
      }
    };
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", (event) => {
      const item = event.target.closest("[data-status]");
      if (!item) return;
      const part = opts.getPart();
      const next = item.getAttribute("data-status");
      if (opts.canPublish && opts.canPublish(part, next) === false) {
        close();
        return;
      }
      this.normalize(part, opts.fallback);
      part.status = next;
      part.published = next === "published";
      close();
      paint();
      opts.onChange?.(part);
    });
    const fromLocal = (value) => this.fromLocalInput(value);
    schedule?.addEventListener("change", (event) => {
      const part = opts.getPart();
      if (!part || part.status !== "scheduled") return;
      const target = event.target;
      if (target.name === "chapter-sched-mode") part.scheduleMode = target.value === "wait" ? "wait" : "date";
      if (target.id === "chapter-publish-at") part.publishAt = fromLocal(target.value);
      if (target.id === "chapter-publish-wait") {
        const n = Number(target.value);
        part.publishWait = Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
      }
      paint();
      opts.onChange?.(part);
    });
    document.addEventListener("click", (event) => {
      if (event.target.closest("#chapter-status")) return;
      close();
    });
    saveBtns.forEach((saveBtn) => {
      saveBtn.addEventListener("click", () => {
        opts.onSave?.();
        const prev = saveBtn.textContent;
        saveBtn.textContent = "Сохранено";
        saveBtn.classList.add("is-saved");
        window.setTimeout(() => {
          saveBtn.textContent = prev || "Сохранить";
          saveBtn.classList.remove("is-saved");
        }, 1200);
      });
    });
    paint();
    return { paint };
  },
};

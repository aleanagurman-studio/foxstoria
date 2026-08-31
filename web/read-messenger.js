(async function messengerReader() {
  if (window.FoxWorks) await FoxWorks.hydrate();
  const params = new URLSearchParams(location.search);
  const workId = window.FoxWorks ? FoxWorks.idFromUrl() : params.get("id") || "";
  if (window.FoxWorks && workId && !FoxWorks.get(workId)) await FoxWorks.fetchOne(workId);
  const work = window.FoxWorks && workId ? FoxWorks.get(workId) : null;
  if (!work) {
    const title = document.getElementById("chapter-title");
    title.hidden = false;
    title.textContent = "Работа не найдена";
    document.getElementById("gallery-empty").hidden = false;
    document.getElementById("gallery-frame").hidden = true;
    const commentsBox = document.getElementById("chapter-comments");
    if (commentsBox) commentsBox.hidden = true;
    return;
  }
  if (work.story_type !== "messenger") {
    location.replace(FoxWorks.urls(work).read);
    return;
  }
  FoxWorks.remember(work.id);
  await FoxWorks.seed(work);

  let story = { chapters: [] };
  try {
    story = JSON.parse(localStorage.getItem(FoxWorks.messengerStore(work.id)) || "null") || story;
  } catch {
    story = FoxWorks.emptyMessenger(work);
  }
  const chapters = (story.chapters || []).filter((chapter) => {
    if (!(chapter.images || []).length) return false;
    return window.FoxChapterStatus ? FoxChapterStatus.isLive(chapter, work.id) : chapter.status === "published" || !chapter.status;
  });
  if (!chapters.length) {
    const title = document.getElementById("chapter-title");
    title.hidden = false;
    title.textContent = "Глав пока нет";
    document.getElementById("gallery-empty").hidden = false;
    document.getElementById("gallery-empty").textContent = "Автор ещё не добавил скриншоты.";
    document.getElementById("gallery-frame").hidden = true;
    const commentsBox = document.getElementById("chapter-comments");
    if (commentsBox) commentsBox.hidden = true;
  }

  const WORK_ID = work.id;
  const CHAPTER_READ_KEY = "foxtoria-chapter-read:" + WORK_ID;
  const WAIT_KEY = "foxtoria-wait-work:" + WORK_ID;
  let i = 0;
  let slide = 0;
  const requested = Number(params.get("chapter"));
  if (Number.isFinite(requested) && requested >= 1 && chapters.length) {
    i = Math.min(chapters.length, Math.floor(requested)) - 1;
  }

  const urls = FoxWorks.urls(work);
  const workCard = document.getElementById("work-card");
  if (workCard) workCard.href = urls.public;
  const cardTitle = document.getElementById("work-card-title");
  if (cardTitle) cardTitle.textContent = work.title || "Без названия";
  const cardAuthor = document.getElementById("work-card-author");
  if (cardAuthor) cardAuthor.textContent = work.author || "";
  const coverSlot = document.querySelector(".linear-work-cover");
  const coverImg = document.getElementById("work-card-cover");
  if (work.cover && coverSlot) {
    if (coverImg) {
      coverImg.src = work.cover;
    } else {
      const img = document.createElement("img");
      img.id = "work-card-cover";
      img.alt = "";
      img.src = work.cover;
      coverSlot.replaceChildren(img);
    }
  }
  document.getElementById("crumb-work").textContent = work.title || "Работа";
  document.getElementById("crumb-work").href = urls.public;
  document.getElementById("edit-chapter").href = `${urls.editor}${urls.editor.includes("?") ? "&" : "?"}chapter=1`;
  document.getElementById("follow-btn").setAttribute("data-work-id", WORK_ID);

  function loadReadSet() {
    try {
      const raw = JSON.parse(localStorage.getItem(CHAPTER_READ_KEY) || "[]");
      return new Set(Array.isArray(raw) ? raw.map(Number) : []);
    } catch {
      return new Set();
    }
  }

  function saveReadSet(set) {
    localStorage.setItem(CHAPTER_READ_KEY, JSON.stringify([...set]));
  }

  const toc = document.getElementById("toc");
  const followBtn = document.getElementById("follow-btn");
  const readBtn = document.getElementById("read-btn");
  const waitBtn = document.getElementById("wait");
  const nextBtn = document.getElementById("next");

  function chapterRead(index) {
    return loadReadSet().has(index);
  }

  function paintFollow() {
    if (!window.loadReaderLibrary) return;
    const followed = loadReaderLibrary().follows.includes(WORK_ID);
    followBtn.setAttribute("aria-pressed", followed ? "true" : "false");
    followBtn.classList.toggle("is-on", followed);
    document.getElementById("follow-label").textContent = followed ? "Вы подписаны" : "Подписаться";
  }

  function paintWait() {
    const on = localStorage.getItem(WAIT_KEY) === "1";
    waitBtn.setAttribute("aria-pressed", on ? "true" : "false");
    waitBtn.classList.toggle("is-on", on);
    waitBtn.querySelector("b").textContent = on ? "Вы ждёте продолжения" : "Жду продолжения";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function commentKey() {
    const chapter = chapters[i];
    return `${WORK_ID}:${chapter?.id || i + 1}`;
  }

  function commentsStore(kind) {
    return `foxtoria-chapter-${kind}:${commentKey()}`;
  }

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "");
      return parsed == null ? fallback : parsed;
    } catch {
      return fallback;
    }
  }

  function demoComments() {
    if (String(WORK_ID) !== "kinder-locker" || i !== 0) return [];
    return [
      {
        id: "demo-1",
        body: "Два киндера — это уже заявление. Юнни в ярости, а я смеюсь в голосовые.",
        author: "Звёздная пыль",
        username: "stardust",
        created_at: "2026-03-24T14:40:00",
        parent_id: "",
      },
      {
        id: "demo-2",
        body: "Записка в шкафчике без записки. Классика.",
        author: "Лиса с фонарём",
        username: "lantern-fox",
        created_at: "2026-03-24T15:10:00",
        parent_id: "",
      },
    ];
  }

  function commentWhen(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "только что";
    const diff = Date.now() - date.getTime();
    if (diff < 60 * 1000) return "только что";
    if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.floor(diff / 60000))} мин`;
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  }

  let replyTo = null;
  const commentsBox = document.getElementById("chapter-comments");
  const commentsList = document.getElementById("comments-list");
  const commentsCount = document.getElementById("comments-count");
  const commentsSort = document.getElementById("comments-sort");
  const commentForm = document.getElementById("comment-form");
  const commentText = document.getElementById("comment-text");
  const replyHint = document.getElementById("comment-reply-hint");
  const commentAva = document.getElementById("comment-ava");
  if (commentAva && typeof ownerAvatarSrc === "function") commentAva.src = ownerAvatarSrc();

  function setReply(comment) {
    replyTo = comment;
    if (!replyHint) return;
    if (!comment) {
      replyHint.hidden = true;
      return;
    }
    replyHint.hidden = false;
    const name = replyHint.querySelector("strong");
    if (name) name.textContent = comment.author || "читатель";
    commentText?.focus();
  }

  async function loadComments() {
    const deleted = new Set(readJson(commentsStore("deleted"), []));
    let remote = [];
    try {
      if (window.FoxApi) {
        const data = await FoxApi.request(
          `/api/comments?target_type=chapter&target_key=${encodeURIComponent(commentKey())}`
        );
        remote = Array.isArray(data?.comments) ? data.comments : [];
      }
    } catch {
      remote = [];
    }
    const local = readJson(commentsStore("comments"), []);
    const byId = new Map();
    [...demoComments(), ...remote, ...local].forEach((item) => {
      if (!item?.id || deleted.has(String(item.id))) return;
      byId.set(String(item.id), item);
    });
    const items = [...byId.values()];
    const newest = (commentsSort?.value || "new") === "new";
    items.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")) * (newest ? -1 : 1));
    return items;
  }

  function commentHtml(item) {
    const name = item.author || item.username || "Читатель";
    const href = typeof profileHref === "function" ? profileHref(name) : "profile.html";
    const ava = item.avatar || "assets/test/avatar-2.png";
    const canDelete = typeof canDeletePostedItem === "function" ? canDeletePostedItem(item) : String(item.username || "") === (typeof ownerHandle === "function" ? ownerHandle() : "");
    const liked = new Set(readJson(commentsStore("likes"), [])).has(String(item.id));
    return `<article class="linear-comment${item.parent_id ? " is-reply" : ""}" data-comment-id="${escapeHtml(item.id)}">
      <img class="linear-comment-ava" src="${escapeHtml(ava)}" alt="">
      <div class="linear-comment-main">
        <header>
          <a href="${escapeHtml(href)}" class="user-link" data-user-name="${escapeHtml(name)}">${escapeHtml(name)}</a>
          <time>${escapeHtml(commentWhen(item.created_at))}</time>
          <div class="linear-comment-menu">
            <button type="button" class="review-menu-btn" aria-label="Ещё" aria-expanded="false" aria-haspopup="menu">
              <img src="assets/ornaments/03_more.svg?v=3" alt="">
            </button>
            <div class="review-menu-dd" hidden>
              <button type="button"><img src="assets/svg/флаг.svg" alt=""> Пожаловаться</button>
              ${canDelete ? `<button type="button" class="is-danger" data-comment-act="delete"><img src="assets/svg/удалить.svg" alt=""> Удалить</button>` : ""}
            </div>
          </div>
        </header>
        <p>${escapeHtml(item.body)}</p>
        <footer>
          <button type="button" data-comment-act="reply">Ответить</button>
          <button type="button" class="linear-comment-like${liked ? " is-on" : ""}" data-comment-act="like" aria-pressed="${liked ? "true" : "false"}">
            <img src="assets/svg/heart.svg" alt=""> <span>${liked ? 1 : 0}</span>
          </button>
        </footer>
      </div>
    </article>`;
  }

  async function paintComments() {
    if (!commentsBox || !commentsList) return;
    if (!chapters.length) {
      commentsBox.hidden = true;
      return;
    }
    commentsBox.hidden = false;
    const items = await loadComments();
    if (commentsCount) commentsCount.textContent = String(items.length);
    commentsList.innerHTML = items.length
      ? items.map(commentHtml).join("")
      : `<p class="linear-comments-empty">Пока нет комментариев.</p>`;
    if (typeof hydrateUiIcons === "function") hydrateUiIcons(commentsList);
  }

  function paintRead() {
    const on = chapterRead(i);
    readBtn.setAttribute("aria-pressed", on ? "true" : "false");
    readBtn.classList.toggle("is-on", on);
    toc.querySelectorAll(".story-nav-link").forEach((link, index) => {
      link.classList.toggle("is-read", chapterRead(index));
    });
  }

  function renderToc() {
    const chevron = `<svg class="story-nav-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 6.2 8 10.5l4.5-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    toc.innerHTML = chapters
      .map(
        (chapter, index) =>
          `<li class="story-nav-node">
          <button type="button" class="story-nav-fold is-empty" aria-hidden="true">${chevron}</button>
          <a class="story-nav-link${index === i ? " is-current" : ""}${chapterRead(index) ? " is-read" : ""}${window.FoxPay && !FoxPay.chapterUnlocked(work, index) ? " is-paid-lock" : ""}" href="read-messenger.html?id=${encodeURIComponent(WORK_ID)}&chapter=${index + 1}" data-chapter="${index}"${index === i ? " aria-current=\"page\"" : ""}>
            <span class="story-nav-title">${chapter.title || "Без названия"}</span>
            <img class="linear-toc-check" src="assets/svg/okay.svg" alt="">
          </a>
        </li>`
      )
      .join("");
  }

  function paintSlide() {
    const chapter = chapters[i];
    if (!chapter) return;
    const images = chapter.images || [];
    slide = Math.max(0, Math.min(slide, Math.max(0, images.length - 1)));
    const empty = !images.length;
    document.getElementById("gallery-empty").hidden = !empty;
    document.getElementById("gallery-frame").hidden = empty;
    if (!empty) document.getElementById("gallery-image").src = images[slide];
    document.getElementById("slide-count").textContent = empty ? "0/0" : `${slide + 1}/${images.length}`;
    document.getElementById("img-prev").disabled = empty || slide === 0;
    document.getElementById("img-next").disabled = empty || slide >= images.length - 1;
  }

  function render() {
    const chapter = chapters[i];
    if (!chapter) return;
    document.title = `${chapter.title || "Глава"} — ${work.title} — FoxStoria`;
    document.getElementById("crumb-chapter").textContent = chapter.title.trim() || "Глава";
    document.getElementById("edit-chapter").href = `${urls.editor}${urls.editor.includes("?") ? "&" : "?"}chapter=${i + 1}`;
    toc.querySelectorAll(".story-nav-link").forEach((link, index) => {
      link.classList.toggle("is-current", index === i);
      if (index === i) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
      link.classList.toggle("is-read", chapterRead(index));
    });

    const last = i === chapters.length - 1;
    document.getElementById("prev").disabled = i === 0;
    document.getElementById("prev-name").textContent = i === 0 ? "" : chapters[i - 1].title || "";
    nextBtn.hidden = last;
    waitBtn.hidden = !last;
    if (!last) {
      document.getElementById("next-name").textContent = chapters[i + 1].title || "";
    }
    paintSlide();
    const locked = window.FoxPay && !FoxPay.chapterUnlocked(work, i);
    const gate = document.getElementById("paid-gate");
    const gallery = document.getElementById("gallery");
    if (gate) {
      gate.hidden = !locked;
      gate.innerHTML = locked ? FoxPay.gateHTML(work) : "";
    }
    if (gallery) gallery.hidden = Boolean(locked);
    paintRead();
    paintWait();
    paintComments();
  }

  renderToc();
  render();
  paintFollow();

  toc.addEventListener("click", (event) => {
    const link = event.target.closest("[data-chapter]");
    if (!link) return;
    event.preventDefault();
    i = Number(link.getAttribute("data-chapter"));
    slide = 0;
    render();
    history.replaceState(null, "", `read-messenger.html?id=${encodeURIComponent(WORK_ID)}&chapter=${i + 1}`);
  });

  document.getElementById("prev").addEventListener("click", () => {
    if (i === 0) return;
    i -= 1;
    slide = 0;
    render();
  });
  nextBtn.addEventListener("click", () => {
    if (i >= chapters.length - 1) return;
    i += 1;
    slide = 0;
    render();
  });
  document.getElementById("img-prev").addEventListener("click", () => {
    if (slide > 0) {
      slide -= 1;
      paintSlide();
    }
  });
  document.getElementById("img-next").addEventListener("click", () => {
    const images = chapters[i]?.images || [];
    if (slide < images.length - 1) {
      slide += 1;
      paintSlide();
    }
  });

  const gallery = document.getElementById("gallery");
  const fitBtn = document.getElementById("fit-screen");

  function fitScreenOn() {
    return gallery.classList.contains("is-fit-screen");
  }

  function setFitScreen(on) {
    gallery.classList.toggle("is-fit-screen", on);
    document.body.classList.toggle("messenger-fit-open", on);
    if (on) gallery.scrollTop = 0;
    fitBtn?.setAttribute("aria-pressed", on ? "true" : "false");
    fitBtn?.setAttribute("aria-label", on ? "Свернуть" : "Растянуть картинку");
  }

  fitBtn?.addEventListener("click", () => setFitScreen(!fitScreenOn()));
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") document.getElementById("img-prev").click();
    if (event.key === "ArrowRight") document.getElementById("img-next").click();
    if (event.key === "Escape" && fitScreenOn()) setFitScreen(false);
  });

  readBtn.addEventListener("click", () => {
    const set = loadReadSet();
    if (set.has(i)) set.delete(i);
    else set.add(i);
    saveReadSet(set);
    paintRead();
  });
  waitBtn.addEventListener("click", () => {
    const on = localStorage.getItem(WAIT_KEY) === "1";
    localStorage.setItem(WAIT_KEY, on ? "0" : "1");
    paintWait();
  });
  followBtn.addEventListener("click", () => {
    if (!window.loadReaderLibrary || !window.saveReaderLibrary) return;
    const lib = loadReaderLibrary();
    const idx = lib.follows.indexOf(WORK_ID);
    if (idx >= 0) lib.follows.splice(idx, 1);
    else lib.follows.push(WORK_ID);
    saveReaderLibrary(lib);
    paintFollow();
  });

  commentsSort?.addEventListener("change", () => paintComments());
  document.getElementById("comment-reply-cancel")?.addEventListener("click", () => setReply(null));
  commentForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = String(commentText?.value || "").trim();
    if (!body || !chapters.length) return;
    const item = {
      id: `local-${Date.now().toString(36)}`,
      body,
      parent_id: replyTo?.id || "",
      created_at: new Date().toISOString(),
      author: typeof ownerDisplayName === "function" ? ownerDisplayName() : "Вы",
      username: typeof ownerHandle === "function" ? ownerHandle() : "",
      avatar: typeof ownerAvatarSrc === "function" ? ownerAvatarSrc() : "",
    };
    let savedRemote = false;
    try {
      if (window.FoxApi) {
        await FoxApi.request("/api/comments", {
          method: "POST",
          body: JSON.stringify({
            target_type: "chapter",
            target_key: commentKey(),
            body,
            parent_id: replyTo?.id && /^\d+$/.test(String(replyTo.id)) ? replyTo.id : undefined,
          }),
        });
        savedRemote = true;
      }
    } catch {
      savedRemote = false;
    }
    if (!savedRemote) {
      const stored = readJson(commentsStore("comments"), []);
      localStorage.setItem(commentsStore("comments"), JSON.stringify([item, ...stored]));
    }
    if (commentText) commentText.value = "";
    setReply(null);
    paintComments();
  });
  commentsList?.addEventListener("click", (event) => {
    const del = event.target.closest('[data-comment-act="delete"]');
    const reply = event.target.closest('[data-comment-act="reply"]');
    const like = event.target.closest('[data-comment-act="like"]');
    const more = event.target.closest(".linear-comment-menu .review-menu-btn");
    const card = event.target.closest(".linear-comment");
    if (del && card) {
      event.preventDefault();
      if (!window.confirm("Удалить комментарий? После обновления страницы его не будет.")) return;
      const id = card.getAttribute("data-comment-id");
      if (id && window.FoxApi && /^\d+$/.test(String(id))) {
        FoxApi.request(`/api/comments/${id}`, { method: "DELETE" }).catch(() => {});
      }
      const deleted = readJson(commentsStore("deleted"), []);
      localStorage.setItem(commentsStore("deleted"), JSON.stringify([...new Set([...deleted, id])]));
      const stored = readJson(commentsStore("comments"), []).filter((item) => String(item.id) !== id);
      localStorage.setItem(commentsStore("comments"), JSON.stringify(stored));
      paintComments();
      return;
    }
    if (reply && card) {
      const name = card.querySelector("[data-user-name]")?.getAttribute("data-user-name") || "";
      setReply({ id: card.getAttribute("data-comment-id"), author: name });
      return;
    }
    if (like && card) {
      const id = card.getAttribute("data-comment-id");
      const likes = new Set(readJson(commentsStore("likes"), []).map(String));
      if (likes.has(id)) likes.delete(id);
      else likes.add(id);
      localStorage.setItem(commentsStore("likes"), JSON.stringify([...likes]));
      paintComments();
      return;
    }
    commentsList.querySelectorAll(".linear-comment-menu").forEach((menu) => {
      const dd = menu.querySelector(".review-menu-dd");
      const btn = menu.querySelector(".review-menu-btn");
      if (more && menu.contains(more)) {
        const open = dd.hidden;
        dd.hidden = !open;
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      } else if (!event.target.closest(".review-menu-dd")) {
        dd.hidden = true;
        btn.setAttribute("aria-expanded", "false");
      }
    });
  });
})();

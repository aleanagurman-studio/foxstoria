(async function messengerReader() {
  if (window.FoxWorks) await FoxWorks.hydrate();
  const params = new URLSearchParams(location.search);
  const workId = window.FoxWorks ? FoxWorks.idFromUrl() : params.get("id") || "";
  if (window.FoxWorks && workId && !FoxWorks.get(workId)) await FoxWorks.fetchOne(workId);
  const work = window.FoxWorks && workId ? FoxWorks.get(workId) : null;
  if (!work) {
    document.getElementById("chapter-title").textContent = "Работа не найдена";
    document.getElementById("gallery-empty").hidden = false;
    document.getElementById("gallery-frame").hidden = true;
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
  const chapters = (story.chapters || []).filter((chapter) => (chapter.images || []).length);
  if (!chapters.length) {
    document.getElementById("chapter-title").textContent = "Глав пока нет";
    document.getElementById("gallery-empty").hidden = false;
    document.getElementById("gallery-empty").textContent = "Автор ещё не добавил скриншоты.";
    document.getElementById("gallery-frame").hidden = true;
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
  document.getElementById("work-card").href = urls.public;
  document.getElementById("work-card-title").textContent = work.title || "Без названия";
  document.getElementById("work-card-author").textContent = work.author || "";
  if (work.cover) document.getElementById("work-card-cover").src = work.cover;
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
          <a class="story-nav-link${index === i ? " is-current" : ""}${chapterRead(index) ? " is-read" : ""}" href="read-messenger.html?id=${encodeURIComponent(WORK_ID)}&chapter=${index + 1}" data-chapter="${index}"${index === i ? " aria-current=\"page\"" : ""}>
            <span class="story-nav-num">${index + 1}</span>
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
    document.getElementById("chapter-title").textContent = chapter.title.trim() || "Без названия";
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
    paintRead();
    paintWait();
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
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") document.getElementById("img-prev").click();
    if (event.key === "ArrowRight") document.getElementById("img-next").click();
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
})();

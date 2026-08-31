(async function messengerEditorApp() {
  if (window.FoxWorks) await FoxWorks.hydrate();
  const workId = window.FoxWorks ? FoxWorks.idFromUrl() : new URLSearchParams(location.search).get("id") || "";
  if (window.FoxWorks && workId && !FoxWorks.get(workId)) await FoxWorks.fetchOne(workId);
  const work = window.FoxWorks && workId ? FoxWorks.get(workId) : null;
  if (window.FoxWorks) {
    if (!work) {
      location.replace("author-home.html");
      return;
    }
    FoxWorks.remember(work.id);
    if (work.story_type !== "messenger") {
      location.replace(FoxWorks.urls(work).editor);
      return;
    }
    FoxWorks.seed(work);
  }
  const STORE = window.FoxWorks ? FoxWorks.messengerStore(workId) : "foxtoria-editor-messenger";
  const MAX = window.FoxWorks?.MESSENGER_MAX_IMAGES || 15;
  const $ = (id) => document.getElementById(id);

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function emptyStory() {
    if (work && window.FoxWorks) return FoxWorks.emptyMessenger(work);
    const ch1 = uid("ch");
    return {
      title: "Без названия",
      selectedId: ch1,
      characters: [],
      notes: [],
      chapters: [{ id: ch1, title: "Глава 1", status: "draft", images: [], cover: "", isEnding: false }],
    };
  }

  function normalizeChapter(chapter) {
    if (!Array.isArray(chapter.images)) chapter.images = [];
    chapter.images = chapter.images.filter(Boolean).slice(0, MAX);
    if (chapter.status === "hidden" || chapter.status !== "published") chapter.status = "draft";
    chapter.isEnding = Boolean(chapter.isEnding);
    return chapter;
  }

  function loadStory() {
    try {
      const raw = localStorage.getItem(STORE);
      if (!raw) return emptyStory();
      const parsed = JSON.parse(raw);
      if (!parsed?.chapters?.length) return emptyStory();
      parsed.chapters.forEach(normalizeChapter);
      if (!Array.isArray(parsed.characters)) parsed.characters = [];
      if (!Array.isArray(parsed.notes)) parsed.notes = [];
      return parsed;
    } catch {
      return emptyStory();
    }
  }

  let story = loadStory();
  if (window.FoxLibrary) {
    if (localStorage.getItem(FoxLibrary.KEY)) {
      const lib = FoxLibrary.load();
      story.characters = lib.characters;
      story.notes = lib.notes;
    } else {
      FoxLibrary.save({ characters: story.characters || [], notes: story.notes || [] });
    }
  }
  if (work?.title) {
    story.title = work.title;
    const titleEl = $("story-title");
    if (titleEl) titleEl.textContent = work.title;
  }
  const studioLink = document.getElementById("studio-link");
  if (studioLink && window.FoxWorks && work) studioLink.href = FoxWorks.urls(work).studio;
  const requestedChapter = Number(new URLSearchParams(location.search).get("chapter"));
  if (Number.isFinite(requestedChapter) && requestedChapter >= 1) {
    const chapter = story.chapters[Math.min(story.chapters.length, Math.floor(requestedChapter)) - 1];
    if (chapter) story.selectedId = chapter.id;
  }
  let previewIndex = 0;
  let slideIndex = 0;
  const history = [];
  let historyIndex = -1;

  function selected() {
    return story.chapters.find((ch) => ch.id === story.selectedId) || story.chapters[0];
  }

  function persist(force) {
    if (!force && foxPref("autosave") === false) return;
    syncWorkStatus();
    localStorage.setItem(STORE, JSON.stringify(story));
    if (window.FoxWorks) FoxWorks.pushContent(workId, story);
    if (window.FoxLibrary) {
      FoxLibrary.save({ characters: story.characters || [], notes: story.notes || [] });
    }
  }

  function snapshot() {
    history.splice(historyIndex + 1);
    history.push(JSON.stringify(story));
    historyIndex = history.length - 1;
    if (history.length > 40) {
      history.shift();
      historyIndex -= 1;
    }
    renderAll();
  }

  function renderChapterList() {
    const root = $("chapter-list");
    const query = ($("chapter-search").value || "").trim().toLowerCase();
    const only = story.chapters.length <= 1;
    root.innerHTML = story.chapters
      .map((chapter, index) => {
        if (query && !chapter.title.toLowerCase().includes(query)) return "";
        const active = chapter.id === story.selectedId;
        return `
          <div class="scene-item${active ? " active" : ""}">
            <button type="button" class="scene-item-pick" data-select="${chapter.id}">
              <span class="scene-num">${index + 1}</span>
              <span class="scene-item-name">${escapeHtml(chapter.title.trim() || "Без названия")}</span>
            </button>
            <button type="button" class="scene-item-del" data-delete="${chapter.id}" ${only ? "disabled" : ""} aria-label="Удалить главу">
              <img src="assets/svg/удалить.svg" alt="">
            </button>
          </div>`;
      })
      .join("");
  }

  function renderLibrary() {
    const chars = $("character-list");
    const notes = $("note-list");
    chars.innerHTML = (story.characters || []).length
      ? story.characters.map((person) => libRow("char", person.id, person.name || "Без имени")).join("")
      : `<p class="linear-lib-empty">Пока нет карточек</p>`;
    notes.innerHTML = (story.notes || []).length
      ? story.notes.map((note) => libRow("note", note.id, note.title || "Без названия")).join("")
      : `<p class="linear-lib-empty">Пока нет заметок</p>`;
  }

  function libRow(kind, id, label) {
    const safeId = escapeHtml(id);
    return `
      <div class="linear-lib-item">
        <button type="button" class="linear-lib-item-name" data-peek="${kind}" data-id="${safeId}">${escapeHtml(label)}</button>
        <button type="button" class="linear-lib-item-act" data-lib-edit="${kind}" data-id="${safeId}" aria-label="Редактировать">
          <img src="assets/svg/редактировать.svg" alt="">
        </button>
        <button type="button" class="linear-lib-item-act is-danger" data-lib-del="${kind}" data-id="${safeId}" aria-label="Удалить">
          <img src="assets/svg/удалить.svg" alt="">
        </button>
      </div>`;
  }

  function openPeek(kind, id) {
    const body = $("peek-body");
    if (kind === "char") {
      const person = (story.characters || []).find((item) => item.id === id);
      if (!person) return;
      body.innerHTML = `
        <h3>${escapeHtml(person.name)}</h3>
        <p class="linear-peek-meta">${escapeHtml(person.age || "")}</p>
        <p>${escapeHtml(person.bio || "")}</p>
        <p class="linear-peek-meta">${escapeHtml(person.traits || "")}</p>`;
    } else {
      const note = (story.notes || []).find((item) => item.id === id);
      if (!note) return;
      body.innerHTML = `
        <h3>${escapeHtml(note.title)}</h3>
        <p>${escapeHtml(note.text || "")}</p>`;
    }
    $("linear-peek").hidden = false;
  }

  function closePeek() {
    $("linear-peek").hidden = true;
  }

  let libModalKind = "char";
  let libModalId = null;

  function todayIso() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function closeLibModal() {
    $("lib-modal").hidden = true;
    libModalId = null;
    if ($("lib-modal-delete")) $("lib-modal-delete").hidden = true;
  }

  function openLibModal(kind, id) {
    libModalKind = kind === "note" ? "note" : "char";
    libModalId = id || null;
    closePeek();
    const editing = Boolean(libModalId);
    $("lib-modal-heading").textContent = libModalKind === "note"
      ? (editing ? "Заметка" : "Новая заметка")
      : (editing ? "Персонаж" : "Новый персонаж");
    $("lib-fields-char").hidden = libModalKind !== "char";
    $("lib-fields-note").hidden = libModalKind !== "note";
    $("lib-char-name").value = "";
    $("lib-char-age").value = "";
    $("lib-char-bio").value = "";
    $("lib-char-traits").value = "";
    $("lib-note-title").value = "";
    $("lib-note-text").value = "";
    if (libModalKind === "note" && editing) {
      const note = (story.notes || []).find((item) => item.id === libModalId);
      if (note) {
        $("lib-note-title").value = note.title || "";
        $("lib-note-text").value = note.text || "";
      }
    } else if (libModalKind === "char" && editing) {
      const person = (story.characters || []).find((item) => item.id === libModalId);
      if (person) {
        $("lib-char-name").value = person.name || "";
        $("lib-char-age").value = person.age || "";
        $("lib-char-bio").value = person.bio || "";
        $("lib-char-traits").value = person.traits || "";
      }
    }
    if ($("lib-modal-delete")) $("lib-modal-delete").hidden = !editing;
    $("lib-modal").hidden = false;
    if (libModalKind === "note") $("lib-note-title").focus();
    else $("lib-char-name").focus();
  }

  function saveLibModal() {
    if (libModalKind === "note") {
      const title = ($("lib-note-title").value || "").trim() || "Новая заметка";
      const text = ($("lib-note-text").value || "").trim();
      story.notes = story.notes || [];
      const existing = libModalId ? story.notes.find((item) => item.id === libModalId) : null;
      if (existing) {
        existing.title = title;
        existing.text = text;
      } else {
        story.notes.push({ id: uid("note"), title, text, created: todayIso() });
      }
    } else {
      const name = ($("lib-char-name").value || "").trim() || "Новый персонаж";
      const age = ($("lib-char-age").value || "").trim();
      const bio = ($("lib-char-bio").value || "").trim();
      const traits = ($("lib-char-traits").value || "").trim();
      story.characters = story.characters || [];
      const existing = libModalId ? story.characters.find((item) => item.id === libModalId) : null;
      if (existing) {
        existing.name = name;
        existing.age = age;
        existing.bio = bio;
        existing.traits = traits;
      } else {
        story.characters.push({ id: uid("char"), name, age, bio, traits, pinned: "0" });
      }
    }
    persist(true);
    renderLibrary();
    closeLibModal();
  }

  function deleteLibItem(kind, id) {
    if (!id) return;
    if (kind === "note") story.notes = (story.notes || []).filter((item) => item.id !== id);
    else story.characters = (story.characters || []).filter((item) => item.id !== id);
    persist(true);
    renderLibrary();
    closeLibModal();
    closePeek();
  }

  function onLibListClick(event) {
    const edit = event.target.closest("[data-lib-edit]");
    if (edit) {
      event.preventDefault();
      openLibModal(edit.getAttribute("data-lib-edit"), edit.getAttribute("data-id"));
      return;
    }
    const del = event.target.closest("[data-lib-del]");
    if (del) {
      event.preventDefault();
      deleteLibItem(del.getAttribute("data-lib-del"), del.getAttribute("data-id"));
      return;
    }
    const peek = event.target.closest("[data-peek]");
    if (peek) openPeek(peek.getAttribute("data-peek"), peek.getAttribute("data-id"));
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxW = 1400;
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.84));
        };
        img.onerror = () => resolve(String(reader.result));
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  function renderSlots() {
    const chapter = selected();
    const images = chapter.images || [];
    $("image-count").textContent = `${images.length} / ${MAX}`;
    $("add-images-btn").disabled = images.length >= MAX;
    $("image-slots").innerHTML = images
      .map(
        (src, index) => `
        <div class="messenger-slot">
          <img src="${escapeHtml(src)}" alt="">
          <div class="messenger-slot-meta">Скрин ${index + 1}</div>
          <div class="messenger-slot-acts">
            <button type="button" data-img-up="${index}" ${index === 0 ? "disabled" : ""} aria-label="Выше">↑</button>
            <button type="button" data-img-down="${index}" ${index === images.length - 1 ? "disabled" : ""} aria-label="Ниже">↓</button>
            <button type="button" data-img-del="${index}" aria-label="Удалить"><img src="assets/svg/удалить.svg" alt=""></button>
          </div>
        </div>`
      )
      .join("");
  }

  function syncEditorFromChapter() {
    const chapter = selected();
    $("sheet-title").textContent = chapter.title || "";
    $("story-title").textContent = (story.title || "").trim() || "Без названия";
    renderSlots();
    syncStatus(chapter.status === "published" ? "published" : "draft");
    const box = $("chapter-ending");
    if (box) box.checked = Boolean(chapter.isEnding);
  }

  function paintPreviewSlide() {
    const chapter = story.chapters[previewIndex] || selected();
    const images = chapter.images || [];
    slideIndex = Math.max(0, Math.min(slideIndex, Math.max(0, images.length - 1)));
    const empty = !images.length;
    $("preview-empty").hidden = !empty;
    $("preview-frame").hidden = empty;
    if (!empty) $("preview-image").src = images[slideIndex];
    $("preview-count").textContent = empty ? "0/0" : `${slideIndex + 1}/${images.length}`;
    $("preview-img-prev").disabled = empty || slideIndex === 0;
    $("preview-img-next").disabled = empty || slideIndex >= images.length - 1;
  }

  function renderPreview() {
    previewIndex = Math.max(0, story.chapters.findIndex((ch) => ch.id === story.selectedId));
    const chapter = story.chapters[previewIndex];
    if (!chapter) return;
    $("preview-title").textContent = chapter.title.trim() || "Без названия";
    $("preview-prev").disabled = previewIndex === 0;
    $("preview-prev-name").textContent =
      previewIndex === 0 ? "" : story.chapters[previewIndex - 1].title.trim() || "Без названия";
    if (previewIndex === story.chapters.length - 1) {
      $("preview-next").querySelector("b").textContent = "К редактору";
      $("preview-next-name").textContent = "";
    } else {
      $("preview-next").querySelector("b").textContent = "Следующая";
      $("preview-next-name").textContent = story.chapters[previewIndex + 1].title.trim() || "Без названия";
    }
    paintPreviewSlide();
  }

  function renderAll() {
    renderChapterList();
    renderLibrary();
    syncEditorFromChapter();
    renderPreview();
    persist();
  }

  function addChapter() {
    const chapter = {
      id: uid("ch"),
      title: "",
      summary: "",
      notes: "",
      status: "draft",
      images: [],
      cover: "",
      isEnding: false,
    };
    story.chapters.push(chapter);
    story.selectedId = chapter.id;
    slideIndex = 0;
    snapshot();
  }

  function deleteChapter(id) {
    if (story.chapters.length <= 1) return;
    const index = story.chapters.findIndex((ch) => ch.id === id);
    if (index < 0) return;
    story.chapters.splice(index, 1);
    if (story.selectedId === id) story.selectedId = story.chapters[Math.max(0, index - 1)].id;
    snapshot();
  }

  async function addFiles(files) {
    const chapter = selected();
    chapter.images = chapter.images || [];
    const room = MAX - chapter.images.length;
    const batch = [...files].filter((file) => file?.type?.startsWith("image/")).slice(0, room);
    for (const file of batch) {
      chapter.images.push(await readImageFile(file));
    }
    snapshot();
  }

  function setMode(mode) {
    const edit = mode === "edit";
    $("edit-surface").hidden = !edit;
    $("linear-chapter-bar").hidden = !edit;
    $("preview").hidden = edit;
    document.querySelectorAll(".mode-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.getAttribute("data-mode") === mode);
    });
    if (!edit) {
      slideIndex = 0;
      renderPreview();
    }
  }

  function syncStatus(status) {
    const live = status === "published";
    const btn = $("chapter-status-btn");
    if (!btn) return;
    btn.textContent = live ? "Скрыть" : "Опубликовать";
    btn.classList.toggle("linear-pub-btn--hide", live);
    btn.classList.toggle("linear-pub-btn--publish", !live);
    btn.setAttribute("aria-pressed", live ? "true" : "false");
  }

  function setStatus(status) {
    selected().status = status === "published" ? "published" : "draft";
    syncStatus(selected().status);
    persist(true);
  }

  function syncWorkStatus() {
    const status = window.FoxWorkStatus
      ? FoxWorkStatus.fromChapters(story.chapters)
      : selected()?.status === "published"
        ? "in_progress"
        : "draft";
    story.workStatus = status;
    if (window.FoxWorkStatus && workId) FoxWorkStatus.set(workId, status);
  }

  $("add-chapter").addEventListener("click", addChapter);

  document.querySelectorAll(".linear-lib-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.getAttribute("data-lib");
      document.querySelectorAll(".linear-lib-tab").forEach((other) => {
        const on = other === tab;
        other.classList.toggle("active", on);
        other.setAttribute("aria-selected", on ? "true" : "false");
      });
      document.querySelectorAll("[data-lib-panel]").forEach((panel) => {
        panel.hidden = panel.getAttribute("data-lib-panel") !== name;
      });
    });
  });

  $("chapter-list").addEventListener("click", (event) => {
    const del = event.target.closest("[data-delete]");
    if (del) {
      event.stopPropagation();
      deleteChapter(del.getAttribute("data-delete"));
      return;
    }
    const btn = event.target.closest("[data-select]");
    if (!btn) return;
    story.selectedId = btn.getAttribute("data-select");
    slideIndex = 0;
    snapshot();
  });

  $("chapter-search").addEventListener("input", renderChapterList);

  $("character-list").addEventListener("click", onLibListClick);
  $("note-list").addEventListener("click", onLibListClick);
  $("lib-add-char").addEventListener("click", () => openLibModal("char"));
  $("lib-add-note").addEventListener("click", () => openLibModal("note"));
  $("lib-modal-dismiss").addEventListener("click", closeLibModal);
  $("lib-modal-delete")?.addEventListener("click", () => {
    if (libModalId) deleteLibItem(libModalKind, libModalId);
  });
  $("lib-modal-form").addEventListener("submit", (event) => {
    event.preventDefault();
    saveLibModal();
  });
  $("peek-close").addEventListener("click", closePeek);
  $("linear-peek").addEventListener("click", (event) => {
    if (event.target === $("linear-peek")) closePeek();
  });

  $("sheet-title").addEventListener("input", () => {
    selected().title = $("sheet-title").textContent.trim();
    persist();
    renderChapterList();
  });

  $("add-images-btn").addEventListener("click", () => $("image-file").click());
  $("image-file").addEventListener("change", async (event) => {
    await addFiles(event.target.files || []);
    event.target.value = "";
  });

  $("image-slots").addEventListener("click", (event) => {
    const images = selected().images || [];
    const up = event.target.closest("[data-img-up]");
    const down = event.target.closest("[data-img-down]");
    const del = event.target.closest("[data-img-del]");
    if (up) {
      const i = Number(up.getAttribute("data-img-up"));
      if (i > 0) [images[i - 1], images[i]] = [images[i], images[i - 1]];
      snapshot();
      return;
    }
    if (down) {
      const i = Number(down.getAttribute("data-img-down"));
      if (i < images.length - 1) [images[i + 1], images[i]] = [images[i], images[i + 1]];
      snapshot();
      return;
    }
    if (del) {
      const i = Number(del.getAttribute("data-img-del"));
      images.splice(i, 1);
      snapshot();
    }
  });

  document.querySelectorAll(".mode-tab").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.getAttribute("data-mode")));
  });

  $("preview-prev").addEventListener("click", () => {
    if (previewIndex > 0) {
      previewIndex -= 1;
      story.selectedId = story.chapters[previewIndex].id;
      slideIndex = 0;
      renderAll();
    }
  });

  $("preview-next").addEventListener("click", () => {
    if (previewIndex < story.chapters.length - 1) {
      previewIndex += 1;
      story.selectedId = story.chapters[previewIndex].id;
      slideIndex = 0;
      renderAll();
    } else {
      setMode("edit");
    }
  });

  $("preview-img-prev").addEventListener("click", () => {
    if (slideIndex > 0) {
      slideIndex -= 1;
      paintPreviewSlide();
    }
  });
  $("preview-img-next").addEventListener("click", () => {
    const images = (story.chapters[previewIndex] || selected()).images || [];
    if (slideIndex < images.length - 1) {
      slideIndex += 1;
      paintPreviewSlide();
    }
  });

  $("chapter-status-btn").addEventListener("click", () => {
    if (selected().status !== "published" && !(selected().images || []).length) {
      window.alert("В главу нужно добавить хотя бы одну картинку.");
      return;
    }
    setStatus(selected().status === "published" ? "draft" : "published");
  });

  $("chapter-ending").addEventListener("change", (event) => {
    selected().isEnding = Boolean(event.target.checked);
    persist(true);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePeek();
      closeLibModal();
    }
    if ($("preview").hidden) return;
    if (event.key === "ArrowLeft") $("preview-img-prev").click();
    if (event.key === "ArrowRight") $("preview-img-next").click();
  });

  history.push(JSON.stringify(story));
  historyIndex = 0;
  renderAll();
})();

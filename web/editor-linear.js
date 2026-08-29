(function linearEditorApp() {
  const STORE = "foxtoria-editor-linear";
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

  function demoLibrary() {
    return {
      characters: [
        { id: "alex", name: "Алекс", age: "28 лет", bio: "Молчит, пока не спросят. Боится кафе на углу. Не носит часов.", traits: "сдержанный, помнит даты, плохо врёт" },
        { id: "masha", name: "Маша", age: "26 лет", bio: "Пишет письма, которые не отправляет. Рыжие волосы прячет под капюшон.", traits: "резкая, добрая в деталях" },
        { id: "nikita", name: "Никита", age: "31 год", bio: "Знает адрес, которого нет на карте.", traits: "наблюдательный" },
      ],
      notes: [
        { id: "n1", title: "Город на скале", text: "Город на скале, где всегда туман. Улицы помнят шаги, которых ещё не было." },
        { id: "n2", title: "Фраза для кафе", text: "«Иногда путь выбирает нас». Не ставить в пролог — беречь для развилки." },
        { id: "n3", title: "Кулон", text: "Старинный кулон с трещиной. Маша носит его под пальто." },
      ],
    };
  }

  function emptyStory() {
    const ch1 = uid("ch");
    const ch2 = uid("ch");
    const lib = demoLibrary();
    return {
      title: "Письма из прошлого",
      selectedId: ch1,
      characters: lib.characters,
      notes: lib.notes,
      chapters: [
        {
          id: ch1,
          title: "Конверт",
          summary: "Письмо без марки — только имя выцветшими чернилами.",
          notes: "",
          status: "draft",
          html: `<p>Письмо пришло без марки — только имя, выведенное чернилами, которые уже выцвели. Вы открываете его на кухне, где ещё пахнет утром.</p>
<img src="assets/brand/banner-hero.jpg" alt="">
<p>«Если ты это читаешь, значит, я всё-таки решилась написать». Дальше — три страницы чужого почерка и один адрес.</p>`,
          cover: "",
          isEnding: false,
        },
        {
          id: ch2,
          title: "Адрес, которого нет",
          summary: "Дом на карте есть. На улице — пустырь.",
          notes: "",
          status: "draft",
          html: `<p>Дом на карте есть. На улице — пустырь и старая липа. Соседка говорит, что здесь когда-то жила женщина с рыжими волосами.</p>
<p>Вы находите в корнях липы второй конверт. Он адресован вам.</p>`,
          cover: "",
          isEnding: false,
        },
      ],
    };
  }

  function loadStory() {
    try {
      const raw = localStorage.getItem(STORE);
      if (!raw) return emptyStory();
      const parsed = JSON.parse(raw);
      if (!parsed?.chapters?.length) return emptyStory();
      parsed.chapters.forEach((chapter) => {
        if (chapter.status === "hidden" || chapter.status !== "published") chapter.status = "draft";
        chapter.isEnding = Boolean(chapter.isEnding);
      });
      if (!Array.isArray(parsed.characters)) {
        parsed.characters = demoLibrary().characters;
      }
      if (!Array.isArray(parsed.notes)) {
        parsed.notes = demoLibrary().notes;
      }
      if (!(parsed.title || "").trim() || parsed.title === "Тени прошлого") {
        parsed.title = "Письма из прошлого";
      }
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
  const workId = new URLSearchParams(location.search).get("id") || "";
  fetch("works.json")
    .then((res) => res.json())
    .then((data) => {
      const works = data.works || [];
      const requested = workId ? works.find((work) => work.id === workId) : null;
      const linear = requested?.story_type === "linear"
        ? requested
        : works.find((work) => work.id === "letters") || works.find((work) => work.story_type === "linear");
      if (linear?.title) {
        story.title = linear.title;
        $("story-title").textContent = linear.title;
        persist();
      }
    })
    .catch(() => {});
  const requestedChapter = Number(new URLSearchParams(location.search).get("chapter"));
  if (Number.isFinite(requestedChapter) && requestedChapter >= 1) {
    const chapter = story.chapters[Math.min(story.chapters.length, Math.floor(requestedChapter)) - 1];
    if (chapter) story.selectedId = chapter.id;
  }
  let previewIndex = 0;
  const history = [];
  let historyIndex = -1;

  function selected() {
    return story.chapters.find((ch) => ch.id === story.selectedId) || story.chapters[0];
  }

  function persist(force) {
    if (!force && foxPref("autosave") === false) return;
    syncWorkStatus();
    localStorage.setItem(STORE, JSON.stringify(story));
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

  function wordCount(html) {
    const text = html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return 0;
    return text.split(" ").filter(Boolean).length;
  }

  function pluralWords(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return "слово";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "слова";
    return "слов";
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
        story.notes.push({
          id: uid("note"),
          title,
          text,
          created: todayIso(),
        });
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
        story.characters.push({
          id: uid("char"),
          name,
          age,
          bio,
          traits,
          pinned: "0",
        });
      }
    }
    persist(true);
    renderLibrary();
    closeLibModal();
  }

  function deleteLibItem(kind, id) {
    if (!id) return;
    if (kind === "note") {
      story.notes = (story.notes || []).filter((item) => item.id !== id);
    } else {
      story.characters = (story.characters || []).filter((item) => item.id !== id);
    }
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

  function normalizeBreaks(root, withDelete) {
    root.querySelectorAll(".linear-break").forEach((el) => {
      el.classList.add("linear-read-ornament");
      el.contentEditable = "false";
      el.classList.remove("is-selected");
      const img = el.querySelector("img:not(.linear-break-del img)");
      const src = img?.getAttribute("src") || "";
      if (!/перо1\.svg/.test(src)) {
        el.querySelectorAll(":scope > :not(.linear-break-del)").forEach((child) => child.remove());
        const feather = document.createElement("img");
        feather.src = "assets/deco/перо1.svg";
        feather.alt = "";
        el.prepend(feather);
      }
      el.querySelectorAll(".linear-break-del").forEach((btn) => btn.remove());
      if (withDelete) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "linear-break-del";
        del.setAttribute("aria-label", "Удалить разделитель");
        del.innerHTML = '<img src="assets/svg/удалить.svg" alt="">';
        el.appendChild(del);
      }
    });
  }

  function editorHtml() {
    const clone = $("chapter-editor").cloneNode(true);
    clone.querySelectorAll(".linear-break-del").forEach((el) => el.remove());
    clone.querySelectorAll(".linear-break.is-selected").forEach((el) => el.classList.remove("is-selected"));
    return clone.innerHTML;
  }

  function normalizeFootnotes(root) {
    root.querySelectorAll(".linear-fn").forEach((el) => {
      const note = el.getAttribute("data-note") || "";
      if (el.tagName === "SPAN" && el.textContent === "*" && el.getAttribute("contenteditable") === "false") {
        return;
      }
      const span = document.createElement("span");
      span.className = "linear-fn";
      span.contentEditable = "false";
      span.setAttribute("data-note", note);
      span.textContent = "*";
      el.replaceWith(span);
    });
  }

  function syncEditorFromChapter() {
    hideFnPop();
    const chapter = selected();
    const editor = $("chapter-editor");
    editor.innerHTML = chapter.html || "";
    normalizeFootnotes(editor);
    normalizeBreaks(editor, true);
    $("sheet-title").textContent = chapter.title || "";
    $("word-count").textContent = `${wordCount(chapter.html || "")} ${pluralWords(wordCount(chapter.html || ""))}`;
    $("story-title").textContent = (story.title || "").trim() || "Письма из прошлого";
    syncCoverPreview(chapter);
    syncStatus(chapter.status === "published" ? "published" : "draft");
    syncEnding(chapter);
  }

  function syncCoverPreview(chapter) {
    const box = $("cover-preview");
    const img = box.querySelector("img");
    const remove = $("cover-remove-btn");
    if (chapter.cover) {
      img.src = chapter.cover;
      box.hidden = false;
      remove.hidden = false;
      $("cover-upload-btn").textContent = "Изменить обложку";
    } else {
      img.removeAttribute("src");
      box.hidden = true;
      remove.hidden = true;
      $("cover-upload-btn").textContent = "Добавить обложку";
    }
  }

  function renderPreview() {
    previewIndex = Math.max(0, story.chapters.findIndex((ch) => ch.id === story.selectedId));
    const chapter = story.chapters[previewIndex];
    if (!chapter) return;
    $("preview-title").textContent = chapter.title.trim() || "Без названия";
    $("preview-body").innerHTML = chapter.html || "<p class=\"empty-hint\">Текст главы пока пуст.</p>";
    normalizeFootnotes($("preview-body"));
    normalizeBreaks($("preview-body"), false);
    const hero = $("preview-hero");
    if (chapter.cover) {
      hero.style.setProperty("--chapter-cover", `url("${chapter.cover}")`);
    } else {
      hero.style.removeProperty("--chapter-cover");
    }
    $("preview-prev").disabled = previewIndex === 0;
    $("preview-prev-name").textContent =
      previewIndex === 0 ? "" : story.chapters[previewIndex - 1].title.trim() || "Без названия";
    if (previewIndex === story.chapters.length - 1) {
      $("preview-next").querySelector("b").textContent = "К редактору";
      $("preview-next-name").textContent = "";
    } else {
      $("preview-next").querySelector("b").textContent = "Следующая";
      $("preview-next-name").textContent =
        story.chapters[previewIndex + 1].title.trim() || "Без названия";
    }
  }

  function renderAll() {
    renderChapterList();
    renderLibrary();
    syncEditorFromChapter();
    renderPreview();
    persist();
  }

  function saveEditorHtml(force) {
    const chapter = selected();
    chapter.html = editorHtml();
    $("word-count").textContent = `${wordCount(chapter.html)} ${pluralWords(wordCount(chapter.html))}`;
    persist(force);
  }

  function addChapter() {
    const chapter = {
      id: uid("ch"),
      title: "",
      summary: "",
      notes: "",
      status: "draft",
      html: "<p></p>",
      cover: "",
      isEnding: false,
    };
    story.chapters.push(chapter);
    story.selectedId = chapter.id;
    snapshot();
  }

  function deleteChapter(id) {
    if (story.chapters.length <= 1) return;
    const index = story.chapters.findIndex((ch) => ch.id === id);
    if (index < 0) return;
    story.chapters.splice(index, 1);
    if (story.selectedId === id) {
      story.selectedId = story.chapters[Math.max(0, index - 1)].id;
    }
    snapshot();
  }

  function insertImage(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const editor = $("chapter-editor");
      editor.focus();
      const img = document.createElement("img");
      img.src = String(reader.result);
      img.alt = "";
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.collapse(false);
        range.insertNode(img);
        const spacer = document.createElement("p");
        spacer.innerHTML = "<br>";
        img.after(spacer);
        range.setStart(spacer, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        editor.appendChild(img);
        editor.appendChild(document.createElement("p"));
      }
      saveEditorHtml();
      snapshot();
    };
    reader.readAsDataURL(file);
  }

  function setMode(mode) {
    const edit = mode === "edit";
    $("edit-surface").hidden = !edit;
    $("linear-toolbar").hidden = !edit;
    $("linear-chapter-bar").hidden = !edit;
    const toolbarRule = $("linear-toolbar-rule");
    const barRule = $("linear-bar-rule");
    if (toolbarRule) toolbarRule.hidden = !edit;
    const sheetRule = $("linear-sheet-rule");
    if (sheetRule) sheetRule.hidden = !edit;
    if (barRule) barRule.hidden = !edit;
    $("preview").hidden = edit;
    document.querySelectorAll(".mode-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.getAttribute("data-mode") === mode);
    });
    if (!edit) renderPreview();
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

  function syncEnding(chapter) {
    const box = $("chapter-ending");
    if (!box) return;
    box.checked = Boolean(chapter.isEnding);
  }

  function setEnding(isEnding) {
    selected().isEnding = Boolean(isEnding);
    persist(true);
  }

  function syncWorkStatus() {
    const status = window.FoxWorkStatus
      ? FoxWorkStatus.fromChapters(story.chapters)
      : selected()?.status === "published"
        ? "in_progress"
        : "draft";
    story.workStatus = status;
    if (window.FoxWorkStatus) FoxWorkStatus.set(workId || "letters", status);
  }

  function removeBreak(el) {
    if (!el) return;
    el.remove();
    saveEditorHtml();
    snapshot();
  }

  function breakBesideCaret(range, backwards) {
    if (!range) return null;
    const node = range.startContainer;
    const offset = range.startOffset;
    const asBreak = (item) => {
      if (!item) return null;
      if (item.nodeType === 1 && item.classList.contains("linear-break")) return item;
      return item.nodeType === 1 ? item.closest(".linear-break") : item.parentElement?.closest(".linear-break") || null;
    };
    if (!range.collapsed) return null;
    if (backwards) {
      if (node.nodeType === Node.TEXT_NODE && offset === 0) return asBreak(node.previousSibling) || asBreak(node.parentElement?.previousSibling);
      if (node.nodeType === Node.ELEMENT_NODE && offset > 0) return asBreak(node.childNodes[offset - 1]);
      if (node.nodeType === Node.ELEMENT_NODE && offset === 0) return asBreak(node.previousSibling);
    } else {
      if (node.nodeType === Node.TEXT_NODE && offset === node.length) return asBreak(node.nextSibling) || asBreak(node.parentElement?.nextSibling);
      if (node.nodeType === Node.ELEMENT_NODE) return asBreak(node.childNodes[offset]);
    }
    return null;
  }

  function insertNode(node) {
    const editor = $("chapter-editor");
    editor.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.collapse(false);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editor.appendChild(node);
    }
    saveEditorHtml();
    snapshot();
  }

  let fnTarget = null;
  let fnHideTimer = 0;

  function commitFnPop() {
    if (!fnTarget || !document.contains(fnTarget)) return;
    fnTarget.setAttribute("data-note", $("fn-text").value.trim());
    saveEditorHtml();
  }

  function hideFnPop() {
    clearTimeout(fnHideTimer);
    commitFnPop();
    $("fn-pop").hidden = true;
    fnTarget = null;
  }

  function showFnPop(mark, focus) {
    clearTimeout(fnHideTimer);
    if (fnTarget && fnTarget !== mark) commitFnPop();
    fnTarget = mark;
    const pop = $("fn-pop");
    $("fn-text").value = mark.getAttribute("data-note") || "";
    pop.hidden = false;
    const r = mark.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - Math.max(pop.offsetWidth, 200) - 8));
    let top = r.bottom + 8;
    if (top + pop.offsetHeight > window.innerHeight - 8) {
      top = Math.max(8, r.top - pop.offsetHeight - 8);
    }
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    if (focus) $("fn-text").focus();
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
    saveEditorHtml();
    story.selectedId = btn.getAttribute("data-select");
    snapshot();
  });

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
  window.addEventListener("storage", (event) => {
    if (!window.FoxLibrary || event.key !== FoxLibrary.KEY || !event.newValue) return;
    const lib = FoxLibrary.load();
    story.characters = lib.characters;
    story.notes = lib.notes;
    renderLibrary();
  });
  $("linear-peek").addEventListener("click", (event) => {
    if (event.target === $("linear-peek")) closePeek();
  });

  $("chapter-editor").addEventListener("input", saveEditorHtml);
  $("chapter-editor").addEventListener("click", (event) => {
    const editor = $("chapter-editor");
    const del = event.target.closest(".linear-break-del");
    if (del) {
      event.preventDefault();
      event.stopPropagation();
      removeBreak(del.closest(".linear-break"));
      return;
    }
    const br = event.target.closest(".linear-break");
    editor.querySelectorAll(".linear-break.is-selected").forEach((el) => el.classList.remove("is-selected"));
    if (br && editor.contains(br)) br.classList.add("is-selected");
  });
  $("chapter-editor").addEventListener("keydown", (event) => {
    if (event.key !== "Backspace" && event.key !== "Delete") return;
    const editor = $("chapter-editor");
    const selectedBreak = editor.querySelector(".linear-break.is-selected");
    if (selectedBreak) {
      event.preventDefault();
      removeBreak(selectedBreak);
      return;
    }
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const nearby = breakBesideCaret(sel.getRangeAt(0), event.key === "Backspace");
    if (!nearby || !editor.contains(nearby)) return;
    event.preventDefault();
    removeBreak(nearby);
  });
  $("chapter-editor").addEventListener("mouseover", (event) => {
    const mark = event.target.closest(".linear-fn");
    if (mark && $("chapter-editor").contains(mark)) showFnPop(mark, false);
  });
  $("chapter-editor").addEventListener("mouseout", (event) => {
    const mark = event.target.closest(".linear-fn");
    if (!mark) return;
    const next = event.relatedTarget;
    if (next && (mark.contains(next) || next.closest("#fn-pop"))) return;
    fnHideTimer = window.setTimeout(hideFnPop, 220);
  });
  $("fn-pop").addEventListener("mouseenter", () => clearTimeout(fnHideTimer));
  $("fn-pop").addEventListener("mouseleave", (event) => {
    const next = event.relatedTarget;
    if (next && next.closest && next.closest(".linear-fn")) return;
    fnHideTimer = window.setTimeout(hideFnPop, 220);
  });
  $("fn-text").addEventListener("input", () => {
    if (fnTarget) fnTarget.setAttribute("data-note", $("fn-text").value);
  });
  $("fn-done").addEventListener("click", hideFnPop);

  $("sheet-title").addEventListener("input", () => {
    selected().title = ($("sheet-title").textContent || "").slice(0, 100);
    renderChapterList();
    persist();
  });

  $("chapter-search").addEventListener("input", renderChapterList);

  document.querySelectorAll(".linear-tool-btn[data-cmd]").forEach((btn) => {
    btn.addEventListener("click", () => {
      $("chapter-editor").focus();
      document.execCommand(btn.getAttribute("data-cmd"), false);
      saveEditorHtml();
    });
  });

  $("insert-break").addEventListener("click", () => {
    const wrap = document.createElement("div");
    wrap.className = "linear-break linear-read-ornament";
    wrap.contentEditable = "false";
    wrap.innerHTML = '<img src="assets/deco/перо1.svg" alt="">';
    const editor = $("chapter-editor");
    editor.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.collapse(false);
      const host =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? range.startContainer.closest("p")
          : range.startContainer.parentElement?.closest("p");
      if (host && editor.contains(host)) host.after(wrap);
      else range.insertNode(wrap);
    } else {
      editor.appendChild(wrap);
    }
    if (!wrap.nextElementSibling) {
      const spacer = document.createElement("p");
      spacer.innerHTML = "<br>";
      wrap.after(spacer);
    }
    saveEditorHtml();
    snapshot();
  });

  $("insert-note").addEventListener("click", () => {
    const mark = document.createElement("span");
    mark.className = "linear-fn";
    mark.contentEditable = "false";
    mark.setAttribute("data-note", "");
    mark.textContent = "*";
    insertNode(mark);
    const live = [...$("chapter-editor").querySelectorAll(".linear-fn")].at(-1);
    if (live) showFnPop(live, true);
  });

  $("insert-image").addEventListener("click", () => $("image-file").click());
  $("image-file").addEventListener("change", (event) => {
    insertImage(event.target.files?.[0]);
    event.target.value = "";
  });

  $("cover-upload-btn").addEventListener("click", () => $("cover-file").click());
  $("cover-file").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      selected().cover = String(reader.result);
      snapshot();
    };
    reader.readAsDataURL(file);
  });
  $("cover-remove-btn").addEventListener("click", () => {
    selected().cover = "";
    snapshot();
  });

  document.querySelectorAll(".mode-tab").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.getAttribute("data-mode")));
  });

  $("preview-prev").addEventListener("click", () => {
    if (previewIndex > 0) {
      previewIndex -= 1;
      story.selectedId = story.chapters[previewIndex].id;
      renderAll();
    }
  });

  $("preview-next").addEventListener("click", () => {
    if (previewIndex < story.chapters.length - 1) {
      previewIndex += 1;
      story.selectedId = story.chapters[previewIndex].id;
      renderAll();
    } else {
      setMode("edit");
    }
  });

  $("undo-btn").addEventListener("click", () => {
    if (historyIndex <= 0) return;
    historyIndex -= 1;
    story = JSON.parse(history[historyIndex]);
    renderAll();
  });

  $("redo-btn").addEventListener("click", () => {
    if (historyIndex >= history.length - 1) return;
    historyIndex += 1;
    story = JSON.parse(history[historyIndex]);
    renderAll();
  });

  $("chapter-status-btn").addEventListener("click", () => {
    setStatus(selected().status === "published" ? "draft" : "published");
  });

  $("chapter-ending").addEventListener("change", (event) => {
    setEnding(event.target.checked);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideFnPop();
      closePeek();
      closeLibModal();
    }
  });

  history.push(JSON.stringify(story));
  historyIndex = 0;
  renderAll();
})();

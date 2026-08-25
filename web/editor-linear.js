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

  function emptyStory() {
    const ch1 = uid("ch");
    const ch2 = uid("ch");
    return {
      title: "",
      selectedId: ch1,
      chapters: [
        {
          id: ch1,
          title: "Конверт",
          summary: "Письмо без марки — только имя выцветшими чернилами.",
          notes: "",
          html: `<p>Письмо пришло без марки — только имя, выведенное чернилами, которые уже выцвели. Вы открываете его на кухне, где ещё пахнет утром.</p>
<p>«Если ты это читаешь, значит, я всё-таки решилась написать». Дальше — три страницы чужого почерка и один адрес.</p>`,
        },
        {
          id: ch2,
          title: "Адрес, которого нет",
          summary: "Дом на карте есть. На улице — пустырь.",
          notes: "",
          html: `<p>Дом на карте есть. На улице — пустырь и старая липа. Соседка говорит, что здесь когда-то жила женщина с рыжими волосами.</p>
<p>Вы находите в корнях липы второй конверт. Он адресован вам.</p>`,
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
      return parsed;
    } catch {
      return emptyStory();
    }
  }

  let story = loadStory();
  let previewIndex = 0;
  const history = [];
  let historyIndex = -1;

  function selected() {
    return story.chapters.find((ch) => ch.id === story.selectedId) || story.chapters[0];
  }

  function persist() {
    localStorage.setItem(STORE, JSON.stringify(story));
    $("save-status").textContent = `Линейная · сохранено ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
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

  function renderChapterList() {
    const root = $("chapter-list");
    const query = ($("chapter-search").value || "").trim().toLowerCase();
    root.innerHTML = story.chapters
      .map((chapter, index) => {
        if (query && !chapter.title.toLowerCase().includes(query)) return "";
        const active = chapter.id === story.selectedId;
        const count = wordCount(chapter.html || "");
        return `
          <button type="button" class="scene-item${active ? " active" : ""}" data-select="${chapter.id}">
            <span class="scene-num">${index + 1}</span>
            <span class="scene-item-name">${escapeHtml(chapter.title.trim() || "Без названия")}</span>
            <span class="scene-item-badge">${count || "—"}</span>
          </button>`;
      })
      .join("");
  }

  function syncEditorFromChapter() {
    const chapter = selected();
    $("chapter-editor").innerHTML = chapter.html || "";
    $("chapter-title").value = chapter.title || "";
    $("chapter-summary").value = chapter.summary || "";
    $("chapter-notes").value = chapter.notes || "";
    $("right-label").textContent = chapter.title.trim() || `Глава ${story.chapters.indexOf(chapter) + 1}`;
    $("word-count").textContent = `${wordCount(chapter.html || "")} ${pluralWords(wordCount(chapter.html || ""))}`;
    $("story-title").value = story.title || "";
  }

  function pluralWords(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return "слово";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "слова";
    return "слов";
  }

  function renderPreview() {
    previewIndex = Math.max(0, story.chapters.findIndex((ch) => ch.id === story.selectedId));
    const chapter = story.chapters[previewIndex];
    if (!chapter) return;
    $("preview-kicker").textContent = `Просмотр · глава ${previewIndex + 1} из ${story.chapters.length}`;
    $("preview-title").textContent = chapter.title.trim() || `Глава ${previewIndex + 1}`;
    $("preview-body").innerHTML = chapter.html || "<p class=\"empty-hint\">Текст главы пока пуст.</p>";
    $("preview-prev").disabled = previewIndex === 0;
    $("preview-next").textContent =
      previewIndex === story.chapters.length - 1 ? "К редактору" : "Следующая";
  }

  function renderAll() {
    renderChapterList();
    syncEditorFromChapter();
    renderPreview();
    persist();
  }

  function saveEditorHtml() {
    const chapter = selected();
    chapter.html = $("chapter-editor").innerHTML;
    $("word-count").textContent = `${wordCount(chapter.html)} ${pluralWords(wordCount(chapter.html))}`;
    renderChapterList();
    persist();
  }

  function addChapter() {
    const chapter = {
      id: uid("ch"),
      title: `Глава ${story.chapters.length + 1}`,
      summary: "",
      notes: "",
      html: "<p></p>",
    };
    story.chapters.push(chapter);
    story.selectedId = chapter.id;
    snapshot();
  }

  function deleteChapter() {
    if (story.chapters.length <= 1) return;
    const index = story.chapters.findIndex((ch) => ch.id === story.selectedId);
    story.chapters.splice(index, 1);
    story.selectedId = story.chapters[Math.max(0, index - 1)].id;
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
    $("preview").hidden = edit;
    document.querySelectorAll(".mode-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.getAttribute("data-mode") === mode);
    });
    if (!edit) renderPreview();
  }

  $("add-chapter").addEventListener("click", addChapter);
  $("add-chapter-bottom").addEventListener("click", addChapter);
  $("delete-chapter").addEventListener("click", deleteChapter);

  $("chapter-list").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-select]");
    if (!btn) return;
    saveEditorHtml();
    story.selectedId = btn.getAttribute("data-select");
    snapshot();
  });

  $("chapter-editor").addEventListener("input", saveEditorHtml);

  $("chapter-title").addEventListener("input", (event) => {
    selected().title = event.target.value;
    $("right-label").textContent = event.target.value.trim() || "Без названия";
    renderChapterList();
    persist();
  });

  $("chapter-summary").addEventListener("input", (event) => {
    selected().summary = event.target.value;
    persist();
  });

  $("chapter-notes").addEventListener("input", (event) => {
    selected().notes = event.target.value;
    persist();
  });

  $("story-title").addEventListener("input", (event) => {
    story.title = event.target.value;
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

  $("insert-image").addEventListener("click", () => $("image-file").click());
  $("image-file").addEventListener("change", (event) => {
    insertImage(event.target.files?.[0]);
    event.target.value = "";
  });

  document.querySelectorAll(".mode-tab, [data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.getAttribute("data-mode")));
  });

  $("preview-prev").addEventListener("click", () => {
    if (previewIndex > 0) {
      previewIndex -= 1;
      renderPreview();
    }
  });

  $("preview-next").addEventListener("click", () => {
    if (previewIndex < story.chapters.length - 1) {
      previewIndex += 1;
      renderPreview();
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

  document.querySelectorAll(".right-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.getAttribute("data-right");
      document.querySelectorAll(".right-tab").forEach((other) => {
        other.classList.toggle("active", other === tab);
      });
      document.querySelectorAll("[data-right-panel]").forEach((panel) => {
        panel.hidden = panel.getAttribute("data-right-panel") !== name;
      });
    });
  });

  $("publish-btn").addEventListener("click", () => {
    saveEditorHtml();
    $("save-status").textContent = "Линейная · готово к публикации (макет)";
  });

  history.push(JSON.stringify(story));
  historyIndex = 0;
  renderAll();
})();

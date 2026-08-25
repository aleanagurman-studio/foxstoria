(function editorApp() {
  const STORE = "foxtoria-editor";
  const CARD_W = 180;
  const CARD_H = 92;
  const HGAP = 56;
  const VGAP = 108;
  const START = 40;

  const $ = (id) => document.getElementById(id);

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function emptyStory() {
    const chapterId = uid("ch");
    const sceneId = uid("sc");
    const scene2 = uid("sc");
    const scene3 = uid("sc");
    const scene4 = uid("sc");
    return {
      title: "",
      chapters: [{ id: chapterId, title: "Глава 1" }],
      scenes: [
        {
          id: sceneId,
          chapterId,
          title: "Пролог",
          description: "Главный герой просыпается в незнакомом месте...",
          notes: "",
          background: "",
          isStart: true,
          isEnding: false,
          blocks: [],
          choices: [
            { id: uid("chc"), label: "Согласиться", targetId: scene2 },
            { id: uid("chc"), label: "Отказать", targetId: scene3 },
          ],
        },
        {
          id: scene2,
          chapterId,
          title: "Путь согласия",
          description: "Герой принимает предложение и идёт дальше.",
          notes: "",
          background: "",
          isStart: false,
          isEnding: false,
          blocks: [],
          choices: [{ id: uid("chc"), label: "Продолжить", targetId: scene4 }],
        },
        {
          id: scene3,
          chapterId,
          title: "Путь отказа",
          description: "Герой отказывается и ищет другой выход.",
          notes: "",
          background: "",
          isStart: false,
          isEnding: false,
          blocks: [],
          choices: [{ id: uid("chc"), label: "Продолжить", targetId: scene4 }],
        },
        {
          id: scene4,
          chapterId,
          title: "Развилка",
          description: "Два пути снова сходятся у старого моста.",
          notes: "",
          background: "",
          isStart: false,
          isEnding: false,
          blocks: [],
          choices: [],
        },
      ],
      selectedId: sceneId,
    };
  }

  function loadStory() {
    try {
      const raw = localStorage.getItem(STORE);
      if (!raw) return emptyStory();
      const data = JSON.parse(raw);
      if (!data.scenes || !data.scenes.length) return emptyStory();
      return data;
    } catch {
      return emptyStory();
    }
  }

  let story = loadStory();
  let tool = "select";
  let zoom = 1;
  let history = [JSON.stringify(story)];
  let histIndex = 0;

  function sceneById(id) {
    return story.scenes.find((scene) => scene.id === id);
  }

  function selected() {
    return sceneById(story.selectedId) || story.scenes[0];
  }

  function persist() {
    try {
      localStorage.setItem(STORE, JSON.stringify(story));
    } catch {
      /* quota */
    }
    const filled = story.scenes.some((scene) => scene.title || scene.description || scene.blocks.length);
    $("save-status").textContent = filled ? "Черновик сохранён на этом устройстве" : "Черновик · пустой шаблон";
  }

  function snapshot() {
    history = history.slice(0, histIndex + 1);
    history.push(JSON.stringify(story));
    if (history.length > 40) history.shift();
    histIndex = history.length - 1;
    persist();
    render();
  }

  function restore(index) {
    if (index < 0 || index >= history.length) return;
    histIndex = index;
    story = JSON.parse(history[histIndex]);
    persist();
    render();
  }

  function currentChapterId() {
    const scene = selected();
    return scene ? scene.chapterId : story.chapters[0].id;
  }

  function addChapter() {
    const n = story.chapters.length + 1;
    story.chapters.push({ id: uid("ch"), title: `Глава ${n}` });
    snapshot();
  }

  function addScene(asChild) {
    const parent = selected();
    const scene = {
      id: uid("sc"),
      chapterId: currentChapterId(),
      title: "",
      description: "",
      notes: "",
      background: "",
      isStart: false,
      isEnding: false,
      blocks: [],
      choices: [],
    };
    story.scenes.push(scene);
    if (asChild && parent) {
      parent.choices.push({
        id: uid("chc"),
        label: `Вариант ${parent.choices.length + 1}`,
        targetId: scene.id,
      });
    } else {
      story.selectedId = scene.id;
    }
    snapshot();
  }

  function deleteScene(id) {
    if (story.scenes.length === 1) return;
    const scene = sceneById(id);
    if (!scene) return;
    story.scenes = story.scenes.filter((item) => item.id !== id);
    story.scenes.forEach((item) => {
      item.choices = item.choices.filter((choice) => choice.targetId !== id);
    });
    if (scene.isStart && story.scenes[0]) story.scenes[0].isStart = true;
    story.selectedId = story.scenes[0].id;
    snapshot();
  }

  function addChoice(fromId, toId, label) {
    const from = sceneById(fromId);
    if (!from || fromId === toId) return;
    from.choices.push({
      id: uid("chc"),
      label: label || `Вариант ${from.choices.length + 1}`,
      targetId: toId,
    });
  }

  function addBlock(type) {
    const scene = selected();
    if (!scene) return;
    if (type === "choice") {
      addScene(true);
      return;
    }
    scene.blocks.push({
      id: uid("bl"),
      type,
      text: "",
      image: "",
    });
    snapshot();
  }

  function layout() {
    const start = story.scenes.find((scene) => scene.isStart) || story.scenes[0];
    const pos = {};
    function widthOf(id, seen) {
      if (seen.has(id)) return CARD_W;
      seen.add(id);
      const scene = sceneById(id);
      const kids = (scene?.choices || []).map((choice) => choice.targetId).filter((target) => sceneById(target));
      if (!kids.length) return CARD_W;
      return Math.max(
        CARD_W,
        kids.reduce((sum, kid) => sum + widthOf(kid, new Set(seen)) + HGAP, -HGAP)
      );
    }
    function place(id, x, y, seen) {
      if (seen.has(id) || !sceneById(id)) return;
      seen.add(id);
      pos[id] = { x, y };
      const scene = sceneById(id);
      const kids = scene.choices.map((choice) => choice.targetId).filter((target) => sceneById(target));
      const widths = kids.map((kid) => widthOf(kid, new Set(seen)));
      const total = widths.reduce((sum, w) => sum + w, 0) + HGAP * Math.max(0, kids.length - 1);
      let cursor = x + CARD_W / 2 - total / 2;
      kids.forEach((kid, index) => {
        place(kid, cursor + widths[index] / 2 - CARD_W / 2, y + CARD_H + VGAP, seen);
        cursor += widths[index] + HGAP;
      });
    }
    place(start.id, 80, 88, new Set());
    story.scenes.forEach((scene) => {
      if (pos[scene.id]) return;
      const extras = Object.keys(pos).length;
      pos[scene.id] = { x: 80 + (extras % 4) * (CARD_W + HGAP), y: 88 + Math.floor(extras / 4) * (CARD_H + VGAP) };
    });
    let minX = Infinity;
    let maxX = 0;
    let maxY = 0;
    Object.values(pos).forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x + CARD_W);
      maxY = Math.max(maxY, point.y + CARD_H + 16);
    });
    const shift = 48 - minX;
    Object.values(pos).forEach((point) => {
      point.x += shift;
    });
    return {
      pos,
      start,
      width: Math.max(640, maxX - minX + 96),
      height: Math.max(420, maxY + 48),
      startX: pos[start.id].x + CARD_W / 2 - START / 2,
    };
  }

  function path(x1, y1, x2, y2) {
    const r = 12;
    const mid = Math.round((y1 + y2) / 2);
    if (Math.abs(x1 - x2) < 2) return `M ${x1} ${y1} L ${x2} ${y2}`;
    const dir = x2 >= x1 ? 1 : -1;
    if (Math.abs(x2 - x1) < r * 2 || Math.abs(y2 - y1) < r * 2) {
      return `M ${x1} ${y1} L ${x1} ${mid} L ${x2} ${mid} L ${x2} ${y2}`;
    }
    return `M ${x1} ${y1} L ${x1} ${mid - r} Q ${x1} ${mid} ${x1 + dir * r} ${mid} L ${x2 - dir * r} ${mid} Q ${x2} ${mid} ${x2} ${mid + r} L ${x2} ${y2}`;
  }

  function renderMap() {
    const graph = $("canvas-graph");
    const { pos, start, width, height, startX } = layout();
    graph.style.width = `${width}px`;
    graph.style.height = `${height}px`;
    graph.style.transform = `scale(${zoom})`;
    graph.style.transformOrigin = "top left";

    const edges = [];
    const choiceLabels = [];
    const startPos = pos[start.id];
    edges.push({
      d: path(startX + START / 2, START + 8, startPos.x + CARD_W / 2, startPos.y),
    });
    story.scenes.forEach((scene) => {
      scene.choices.forEach((choice, choiceIndex) => {
        const from = pos[scene.id];
        const to = pos[choice.targetId];
        if (!from || !to) return;
        edges.push({
          d: path(from.x + CARD_W / 2, from.y + CARD_H, to.x + CARD_W / 2, to.y),
        });
        const labelX = (from.x + CARD_W / 2 + to.x + CARD_W / 2) / 2;
        const labelY = from.y + CARD_H + Math.max(18, (to.y - from.y - CARD_H) / 2);
        choiceLabels.push({
          x: labelX,
          y: labelY,
          text: choice.label.trim() || `Вариант ${choiceIndex + 1}`,
          tone: choiceIndex % 2,
        });
      });
    });

    const svg = `
      <svg class="graph-lines" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <marker id="map-arrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="var(--editor-line)"/>
          </marker>
        </defs>
        ${edges
          .map(
            (edge) =>
              `<path d="${edge.d}" fill="none" stroke="var(--editor-line)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" marker-end="url(#map-arrow)"/>`
          )
          .join("")}
      </svg>`;

    const startHtml = `
      <button type="button" class="map-start" data-select="${start.id}" style="left:${startX}px;top:8px" aria-label="Начало">
        <span class="map-start-dot"></span>
      </button>`;

    let sceneIndex = 0;
    const nodes = story.scenes
      .map((scene) => {
        sceneIndex += 1;
        const point = pos[scene.id];
        const title = scene.title.trim() || "Без названия";
        const desc = scene.description.trim() || "Краткое описание сцены";
        return `
          <button type="button" class="map-node${scene.id === story.selectedId ? " selected" : ""}${scene.isStart ? " is-start" : ""}${scene.isEnding ? " ending" : ""}" data-select="${scene.id}" style="left:${point.x}px;top:${point.y}px">
            ${scene.isStart ? `<span class="map-node-crown" aria-hidden="true"><img src="assets/deco/sparcle.svg" alt=""></span>` : ""}
            <span class="map-node-head">
              <span class="map-node-title">${sceneIndex}. ${escapeHtml(title)}</span>
              <span class="map-node-menu" aria-hidden="true">⋯</span>
            </span>
            <span class="map-node-desc">${escapeHtml(desc.slice(0, 72))}${desc.length > 72 ? "…" : ""}</span>
          </button>`;
      })
      .join("");

    const labels = choiceLabels
      .map(
        (label) =>
          `<span class="map-choice-label tone-${label.tone}" style="left:${label.x}px;top:${label.y}px">${escapeHtml(label.text)}</span>`
      )
      .join("");

    graph.innerHTML = svg + startHtml + nodes + labels;
    renderMinimap(pos, width, height);
  }

  function renderMinimap(pos, width, height) {
    const root = $("minimap");
    const dots = Object.values(pos)
      .map((point) => {
        const left = (point.x / width) * 100;
        const top = (point.y / height) * 100;
        return `<span class="minimap-dot" style="left:${left}%;top:${top}%"></span>`;
      })
      .join("");
    root.innerHTML = `<div class="minimap-viewport"></div>${dots}`;
  }

  function renderTree() {
    const query = ($("scene-search").value || "").trim().toLowerCase();
    $("structure-tree").innerHTML = story.chapters
      .map((chapter) => {
        const scenes = story.scenes.filter((scene) => scene.chapterId === chapter.id);
        const items = scenes
          .filter((scene) => !query || (scene.title || "без названия").toLowerCase().includes(query))
          .map((scene, index) => {
            const name = scene.title.trim() || "Без названия";
            return `
              <button type="button" class="scene-item${scene.id === story.selectedId ? " active" : ""}" data-select="${scene.id}">
                <span class="scene-num">${index + 1}</span>
                <span class="scene-item-name">${escapeHtml(name)}</span>
                ${scene.isStart ? `<span class="scene-item-badge">Начало</span>` : ""}
                ${scene.isEnding ? `<span class="scene-item-badge">Финал</span>` : ""}
              </button>`;
          })
          .join("");
        return `
          <div class="chapter-group">
            <input class="chapter-label" data-chapter="${chapter.id}" value="${escapeAttr(chapter.title)}">
            ${items || `<p class="empty-hint">В главе пока нет сцен</p>`}
          </div>`;
      })
      .join("");
  }

  function renderRight() {
    const scene = selected();
    if (!scene) return;
    $("right-label").textContent = scene.title.trim() || "Новая сцена";
    $("scene-name").value = scene.title;
    $("scene-desc").value = scene.description;
    $("scene-notes").value = scene.notes;
    $("start-toggle").classList.toggle("on", scene.isStart);
    $("end-toggle").classList.toggle("on", scene.isEnding);
    $("scene-bg").style.backgroundImage = scene.background ? `url("${scene.background}")` : "";
    $("scene-bg").classList.toggle("empty-bg", !scene.background);
    $("transitions-list").innerHTML = scene.choices.length
      ? scene.choices
          .map((choice) => {
            const target = sceneById(choice.targetId);
            return `
              <div class="transition-item" data-choice="${choice.id}">
                <input type="text" value="${escapeAttr(choice.label)}" data-choice-label="${choice.id}" placeholder="Текст выбора">
                <span class="arrow">→</span>
                <span class="target">${escapeHtml(target?.title.trim() || "Новая сцена")}</span>
                <button type="button" class="icon-btn-sm" data-remove-choice="${choice.id}" aria-label="Удалить переход">×</button>
              </div>`;
          })
          .join("")
      : `<p class="empty-hint">Переходов нет. Добавьте выбор — появится новая сцена на карте.</p>`;
  }

  function renderBlocks() {
    const scene = selected();
    const strip = $("blocks-strip");
    if (!scene.blocks.length) {
      strip.innerHTML = `<div class="empty-feed"><p>Здесь будут текст, изображения и выборы сцены. Добавьте блок кнопками справа.</p></div>`;
      return;
    }
    strip.innerHTML = scene.blocks
      .map((block) => {
        if (block.type === "image") {
          return `
            <div class="content-block type-image" data-block-id="${block.id}">
              <div class="block-type-label"><span class="block-type-icon">▢</span> Изображение</div>
              ${
                block.image
                  ? `<img class="block-image-preview" src="${block.image}" alt="">`
                  : `<label class="block-image-empty">Добавить изображение<input type="file" accept="image/*" data-block-image="${block.id}" hidden></label>`
              }
            </div>`;
        }
        return `
          <div class="content-block type-text" data-block-id="${block.id}">
            <div class="block-type-label"><span class="block-type-icon">T</span> Текст</div>
            <textarea data-block-text="${block.id}" placeholder="Напишите текст сцены…">${escapeHtml(block.text)}</textarea>
          </div>`;
      })
      .join("");
  }

  function renderPreview() {
    const scene = selected();
    const textBlock = scene.blocks.find((block) => block.type === "text" && block.text.trim());
    $("preview-kicker").textContent = scene.isStart ? "Начало" : scene.isEnding ? "Финал" : "Сцена";
    $("preview-title").textContent = scene.title.trim() || "Без названия";
    $("preview-text").textContent =
      textBlock?.text.trim() || scene.description.trim() || "Текст сцены пока пуст. Вернитесь в редактор и заполните поля.";
    $("preview-choices").innerHTML = scene.choices
      .map((choice) => `<button type="button" class="choice-btn" data-preview-to="${choice.targetId}">${escapeHtml(choice.label || "Дальше")}</button>`)
      .join("");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll('"', "&quot;");
  }

  function render() {
    $("story-title").value = story.title;
    $("zoom-label").textContent = `${Math.round(zoom * 100)}%`;
    renderMap();
    renderTree();
    renderRight();
    renderBlocks();
    document.querySelectorAll("[data-tool]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-tool") === tool);
    });
    $("tool-link").classList.toggle("active", tool === "link");
    $("canvas-wrap").dataset.tool = tool;
  }

  function selectScene(id) {
    if (tool === "link" && story.selectedId && story.selectedId !== id) {
      addChoice(story.selectedId, id);
      tool = "select";
      snapshot();
      return;
    }
    story.selectedId = id;
    persist();
    render();
  }

  document.addEventListener("click", (event) => {
    const previewTo = event.target.closest("[data-preview-to]");
    if (previewTo) {
      const id = previewTo.getAttribute("data-preview-to");
      if (sceneById(id)) {
        story.selectedId = id;
        persist();
        renderPreview();
      }
      return;
    }
    const select = event.target.closest("[data-select]");
    if (select) {
      selectScene(select.getAttribute("data-select"));
      return;
    }
    const mode = event.target.closest("[data-mode]");
    if (mode) {
      const value = mode.getAttribute("data-mode");
      document.querySelectorAll(".mode-tab").forEach((tab) => tab.classList.toggle("active", tab.getAttribute("data-mode") === value));
      $("preview").hidden = value !== "preview";
      $("bottom-panel").hidden = value === "preview";
      if (value === "preview") renderPreview();
      return;
    }
    const toolBtn = event.target.closest("[data-tool]");
    if (toolBtn) {
      const next = toolBtn.getAttribute("data-tool");
      tool = tool === next && next !== "select" ? "select" : next;
      render();
      return;
    }
    const bottom = event.target.closest("[data-bottom]");
    if (bottom) {
      const name = bottom.getAttribute("data-bottom");
      document.querySelectorAll(".bottom-tab").forEach((tab) => tab.classList.toggle("active", tab.getAttribute("data-bottom") === name));
      $("blocks-strip").hidden = name !== "content";
      $("notes-panel").hidden = name !== "notes";
      return;
    }
    const right = event.target.closest("[data-right]");
    if (right) {
      const name = right.getAttribute("data-right");
      document.querySelectorAll(".right-tab").forEach((tab) => tab.classList.toggle("active", tab.getAttribute("data-right") === name));
      $("right-settings").hidden = name !== "settings";
      return;
    }
    const blockType = event.target.closest("[data-block]");
    if (blockType) {
      addBlock(blockType.getAttribute("data-block"));
      return;
    }
    const remove = event.target.closest("[data-remove-choice]");
    if (remove) {
      const scene = selected();
      scene.choices = scene.choices.filter((choice) => choice.id !== remove.getAttribute("data-remove-choice"));
      snapshot();
    }
  });

  $("add-chapter").addEventListener("click", addChapter);
  $("add-scene").addEventListener("click", () => addScene(false));
  $("tool-center").addEventListener("click", () => {
    $("canvas-area").scrollTo({ top: 0, left: 0, behavior: "smooth" });
  });
  $("tool-delete").addEventListener("click", () => deleteScene(story.selectedId));
  $("delete-scene").addEventListener("click", () => deleteScene(story.selectedId));
  $("add-transition").addEventListener("click", () => addScene(true));
  $("undo-btn").addEventListener("click", () => restore(histIndex - 1));
  $("redo-btn").addEventListener("click", () => restore(histIndex + 1));
  $("zoom-in").addEventListener("click", () => {
    zoom = Math.min(1.6, zoom + 0.1);
    render();
  });
  $("zoom-out").addEventListener("click", () => {
    zoom = Math.max(0.6, zoom - 0.1);
    render();
  });
  $("preview-restart").addEventListener("click", () => {
    const start = story.scenes.find((scene) => scene.isStart) || story.scenes[0];
    story.selectedId = start.id;
    persist();
    renderPreview();
  });
  $("publish-btn").addEventListener("click", () => {
    $("save-status").textContent = "Публикация появится позже. Черновик уже сохранён здесь.";
  });
  $("toggle-start").addEventListener("click", () => {
    story.scenes.forEach((scene) => {
      scene.isStart = scene.id === story.selectedId;
    });
    snapshot();
  });
  $("toggle-end").addEventListener("click", () => {
    const scene = selected();
    scene.isEnding = !scene.isEnding;
    snapshot();
  });
  $("scene-bg-file").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      selected().background = String(reader.result);
      snapshot();
    };
    reader.readAsDataURL(file);
  });
  $("scene-bg-clear").addEventListener("click", () => {
    selected().background = "";
    snapshot();
  });

  $("story-title").addEventListener("input", (event) => {
    story.title = event.target.value;
    persist();
  });
  function onSceneName(event) {
    selected().title = event.target.value;
    persist();
    renderMap();
    renderTree();
    $("right-label").textContent = event.target.value.trim() || "Новая сцена";
  }
  $("scene-name").addEventListener("input", onSceneName);
  $("scene-name").addEventListener("change", onSceneName);
  $("scene-desc").addEventListener("input", (event) => {
    selected().description = event.target.value;
    persist();
  });
  $("scene-notes").addEventListener("input", (event) => {
    selected().notes = event.target.value;
    persist();
  });
  $("scene-search").addEventListener("input", renderTree);
  $("structure-tree").addEventListener("input", (event) => {
    const chapterId = event.target.getAttribute("data-chapter");
    if (chapterId) {
      const chapter = story.chapters.find((item) => item.id === chapterId);
      if (chapter) chapter.title = event.target.value;
      persist();
    }
  });
  $("transitions-list").addEventListener("input", (event) => {
    const choiceId = event.target.getAttribute("data-choice-label");
    if (!choiceId) return;
    const choice = selected().choices.find((item) => item.id === choiceId);
    if (choice) choice.label = event.target.value;
    persist();
  });
  $("blocks-strip").addEventListener("input", (event) => {
    const id = event.target.getAttribute("data-block-text");
    if (!id) return;
    const block = selected().blocks.find((item) => item.id === id);
    if (block) block.text = event.target.value;
    persist();
  });
  $("blocks-strip").addEventListener("change", (event) => {
    const id = event.target.getAttribute("data-block-image");
    const file = event.target.files?.[0];
    if (!id || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const block = selected().blocks.find((item) => item.id === id);
      if (block) block.image = String(reader.result);
      snapshot();
    };
    reader.readAsDataURL(file);
  });

  let panning = false;
  let panX = 0;
  let panY = 0;
  $("canvas-area").addEventListener("mousedown", (event) => {
    if (tool !== "pan") return;
    panning = true;
    panX = event.clientX;
    panY = event.clientY;
  });
  window.addEventListener("mousemove", (event) => {
    if (!panning) return;
    $("canvas-area").scrollBy(panX - event.clientX, panY - event.clientY);
    panX = event.clientX;
    panY = event.clientY;
  });
  window.addEventListener("mouseup", () => {
    panning = false;
  });

  render();
})();

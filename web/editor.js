(function editorApp() {
  const STORE = "foxtoria-editor";
  const CARD_W = FoxStoryMap.CARD_W;
  const CARD_H = FoxStoryMap.CARD_H;
  const HGAP = FoxStoryMap.HGAP;
  const VGAP = FoxStoryMap.VGAP;
  const START = FoxStoryMap.START;
  const uid = FoxStoryMap.uid;
  const $ = (id) => document.getElementById(id);

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
          background: "assets/test/cover-1.png",
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
          background: "assets/test/cover-2.png",
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
          background: "assets/test/cover-3.png",
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
          background: "assets/test/cover-4.png",
          isStart: false,
          isEnding: false,
          blocks: [],
          choices: [],
        },
      ],
      selectedId: sceneId,
      characters: window.FoxLibrary ? FoxLibrary.load().characters : [],
      notes: window.FoxLibrary ? FoxLibrary.load().notes : [],
    };
  }

  function loadStory() {
    try {
      const raw = localStorage.getItem(STORE);
      if (!raw) return emptyStory();
      const data = JSON.parse(raw);
      if (!data.scenes || !data.scenes.length) return emptyStory();
      if (window.FoxLibrary) {
        const lib = FoxLibrary.load();
        data.characters = lib.characters;
        data.notes = lib.notes;
      }
      data.characters = data.characters || [];
      data.notes = data.notes || [];
      return data;
    } catch {
      return emptyStory();
    }
  }

  let story = loadStory();
  persist(true);
  let tool = "pan";
  let zoom = 1;
  let lastLayout = null;
  let linkFromId = null;
  let skipNodeClick = false;
  let previewPath = [];
  const GRIP = `<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true"><circle cx="2" cy="2" r="1.4"/><circle cx="8" cy="2" r="1.4"/><circle cx="2" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="2" cy="14" r="1.4"/><circle cx="8" cy="14" r="1.4"/></svg>`;
  const expanded = new Set();
  const startScene = story.scenes.find((scene) => scene.isStart) || story.scenes[0];
  if (startScene) expanded.add(startScene.id);
  if (story.selectedId) expanded.add(story.selectedId);
  let history = [JSON.stringify(story)];
  let histIndex = 0;

  function sceneById(id) {
    return story.scenes.find((scene) => scene.id === id);
  }

  function selected() {
    return sceneById(story.selectedId) || story.scenes[0];
  }

  let workspaceOpen = false;
  let fnTarget = null;
  let fnHideTimer = 0;

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

  function scenePlain(scene) {
    const fromHtml = String(scene.html || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return fromHtml || String(scene.description || "").trim();
  }

  function sceneBodyHtml(scene) {
    if (scene.html) return scene.html;
    const parts = [];
    (scene.blocks || []).forEach((block) => {
      if (block.type === "text" && block.text) {
        String(block.text)
          .split(/\n+/)
          .forEach((line) => parts.push(`<p>${escapeHtml(line)}</p>`));
      }
      if (block.type === "image" && block.image) {
        parts.push(`<img src="${escapeAttr(block.image)}" alt="">`);
      }
    });
    if (!parts.length && scene.description) parts.push(`<p>${escapeHtml(scene.description)}</p>`);
    return parts.join("") || "<p></p>";
  }

  function editorHtml() {
    const editor = $("scene-editor");
    if (!editor) return "";
    const clone = editor.cloneNode(true);
    clone.querySelectorAll(".linear-break-del").forEach((el) => el.remove());
    clone.querySelectorAll(".linear-break.is-selected").forEach((el) => el.classList.remove("is-selected"));
    return clone.innerHTML;
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

  function saveSceneHtml(force) {
    const scene = selected();
    if (!scene || !workspaceOpen) return;
    scene.html = editorHtml();
    scene.description = scenePlain(scene).slice(0, 220);
    const count = wordCount(scene.html);
    if ($("scene-word-count")) $("scene-word-count").textContent = `${count} ${pluralWords(count)}`;
    persist(force);
  }

  function syncWorkspaceCover(scene) {
    const hero = $("scene-cover-hero");
    const box = $("scene-cover-preview");
    const img = box?.querySelector("img");
    const remove = $("scene-cover-remove");
    const btn = $("scene-cover-btn");
    if (hero) {
      if (scene.background) {
        hero.hidden = false;
        hero.style.setProperty("--chapter-cover", `url("${scene.background}")`);
      } else {
        hero.hidden = true;
        hero.style.removeProperty("--chapter-cover");
      }
    }
    if (!box || !img || !remove || !btn) return;
    if (scene.background) {
      img.src = scene.background;
      box.hidden = false;
      remove.hidden = false;
      btn.textContent = "Изменить обложку";
    } else {
      img.removeAttribute("src");
      box.hidden = true;
      remove.hidden = true;
      btn.textContent = "Добавить обложку";
    }
  }

  function fillWorkspace() {
    const scene = selected();
    if (!scene) return;
    const editor = $("scene-editor");
    hideFnPop();
    if (editor) {
      editor.innerHTML = sceneBodyHtml(scene);
      normalizeFootnotes(editor);
      normalizeBreaks(editor, true);
    }
    if ($("scene-sheet-title")) $("scene-sheet-title").textContent = scene.title || "";
    const count = wordCount(scene.html || sceneBodyHtml(scene));
    if ($("scene-word-count")) $("scene-word-count").textContent = `${count} ${pluralWords(count)}`;
    $("scene-end-toggle")?.classList.toggle("on", scene.isEnding);
    syncWorkspaceCover(scene);
  }

  function persist(force) {
    if (!force && foxPref("autosave") === false) return;
    try {
      localStorage.setItem(STORE, JSON.stringify(story));
    } catch {
      /* quota */
    }
  }

  function persistLibrary() {
    if (!window.FoxLibrary) return;
    FoxLibrary.save({ characters: story.characters || [], notes: story.notes || [] });
  }

  function snapshot(scope) {
    history = history.slice(0, histIndex + 1);
    history.push(JSON.stringify(story));
    if (history.length > 40) history.shift();
    histIndex = history.length - 1;
    persist();
    if (scope === "graph") {
      renderMap();
      renderTree();
      return;
    }
    render();
  }

  function restore(index) {
    if (index < 0 || index >= history.length) return;
    histIndex = index;
    story = JSON.parse(history[histIndex]);
    persist();
    render();
    if (workspaceOpen) fillWorkspace();
  }

  function addScene(asChild, parentId) {
    const parent = asChild ? sceneById(parentId) : null;
    if (asChild && !parent) return;
    const scene = {
      id: uid("sc"),
      title: "",
      description: "",
      notes: "",
      background: "",
      isStart: false,
      isEnding: false,
      blocks: [],
      html: "",
      choices: [],
    };
    story.scenes.push(scene);
    if (asChild) {
      parent.choices.push({
        id: uid("chc"),
        label: `Вариант ${parent.choices.length + 1}`,
        targetId: scene.id,
      });
      const points = layout().pos;
      const parentPos = points[parent.id] || { x: 80, y: 88 };
      const siblings = parent.choices
        .map((choice) => choice.targetId)
        .filter((id) => id !== scene.id)
        .map((id) => points[id])
        .filter(Boolean);
      let x = parentPos.x;
      let y = parentPos.y + CARD_H + VGAP;
      if (siblings.length) {
        const right = siblings.reduce((max, point) => (point.x > max.x ? point : max), siblings[0]);
        x = right.x + CARD_W + HGAP;
        y = right.y;
      }
      const spot = emptyMapSpot(x, y, scene.id, points);
      scene.mapX = spot.x;
      scene.mapY = spot.y;
      story.selectedId = parent.id;
      expanded.add(parent.id);
      snapshot("graph");
      requestAnimationFrame(() => revealScene(scene.id));
      return;
    }
    story.selectedId = scene.id;
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

  function setStart(id) {
    const scene = sceneById(id);
    if (!scene || scene.isStart) return;
    story.scenes.forEach((item) => {
      item.isStart = item.id === id;
    });
    snapshot("graph");
  }

  function addChoice(fromId, toId, label) {
    const from = sceneById(fromId);
    if (!from || fromId === toId) return;
    if ((from.choices || []).some((choice) => choice.targetId === toId)) return;
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
      addScene(true, selected()?.id);
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
    return FoxStoryMap.layout(story);
  }

  function emptyMapSpot(x, y, skipId, points) {
    const used = points || layout().pos;
    let nx = Math.max(16, x);
    let ny = Math.max(88, y);
    for (let step = 0; step < 48; step += 1) {
      const hit = story.scenes.some((item) => {
        if (item.id === skipId) return false;
        const point = used[item.id];
        if (!point) return false;
        return Math.abs(point.x - nx) < CARD_W - 12 && Math.abs(point.y - ny) < CARD_H - 12;
      });
      if (!hit) return { x: nx, y: ny };
      nx += CARD_W + HGAP;
    }
    return { x: nx, y: ny };
  }

  function revealScene(id) {
    const node = document.querySelector(`.canvas-graph .map-node[data-select="${id}"]`);
    node?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function path(x1, y1, x2, y2) {
    return FoxStoryMap.edgePath(x1, y1, x2, y2);
  }

  function setZoom(next) {
    zoom = Math.min(1.6, Math.max(0.5, next));
    render();
  }

  function fitView() {
    const area = $("canvas-area");
    if (!area) return;
    const { width, height } = layout();
    const pad = 96;
    const sx = (area.clientWidth - pad) / Math.max(width, 1);
    const sy = (area.clientHeight - pad) / Math.max(height, 1);
    setZoom(Math.min(1, sx, sy));
  }

  function renderMap() {
    const graph = $("canvas-graph");
    lastLayout = layout();
    const { pos, start, width, height, startX } = lastLayout;
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
          id: choice.id,
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
        const desc = scenePlain(scene) || "Краткое описание сцены";
        return `
          <div class="map-node${scene.id === story.selectedId ? " selected" : ""}${scene.id === linkFromId ? " is-link-from" : ""}${scene.isStart ? " is-start" : ""}${scene.isEnding ? " ending" : ""}${scene.background ? " has-cover" : ""}" data-select="${scene.id}" style="left:${point.x}px;top:${point.y}px">
            ${scene.background ? `<span class="map-node-cover" aria-hidden="true" style="background-image:url(&quot;${escapeAttr(scene.background)}&quot;)"></span>` : ""}
            <span class="map-node-head">
              <span class="map-node-title">${sceneIndex}. ${escapeHtml(title)}</span>
              <button type="button" class="map-node-menu" data-node-menu="${scene.id}" aria-label="Меню сцены">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
              </button>
            </span>
            <span class="map-node-body">
              <span class="map-node-desc">${escapeHtml(desc.slice(0, 72))}${desc.length > 72 ? "…" : ""}</span>
            </span>
            <div class="map-node-pop" data-node-pop="${scene.id}">
              <button type="button" data-node-act="edit" data-scene="${scene.id}">Редактировать</button>
              <button type="button" data-node-act="choice" data-scene="${scene.id}">Добавить выбор</button>
              <button type="button" data-node-act="start" data-scene="${scene.id}" ${scene.isStart ? "disabled" : ""}>Сделать началом</button>
              <button type="button" class="is-danger" data-node-act="delete" data-scene="${scene.id}">Удалить</button>
            </div>
          </div>`;
      })
      .join("");

    const labels = choiceLabels
      .map(
        (label) =>
          `<button type="button" class="map-choice-label tone-${label.tone}" data-edit-choice="${label.id}" style="left:${label.x}px;top:${label.y}px">${escapeHtml(label.text)}</button>`
      )
      .join("");

    graph.innerHTML = svg + startHtml + nodes + labels;
  }

  function branchKids(scene) {
    const seen = new Set();
    const kids = [];
    (scene.choices || []).forEach((choice) => {
      const target = sceneById(choice.targetId);
      if (!target || target.id === scene.id || seen.has(target.id)) return;
      seen.add(target.id);
      kids.push(target);
    });
    return kids;
  }

  function renderTree() {
    const query = ($("scene-search").value || "").trim().toLowerCase();
    const tree = $("structure-tree");
    if (!tree) return;
    if (!story.scenes.length) {
      tree.innerHTML = `<p class="empty-hint">Сцен пока нет</p>`;
      return;
    }
    if (query) {
      const scenes = story.scenes.filter((scene) => (scene.title || "без названия").toLowerCase().includes(query));
      tree.innerHTML = scenes
        .map((scene, index) => tocRow(scene, index + 1, 0, []))
        .join("") || `<p class="empty-hint">Ничего не найдено</p>`;
      return;
    }
    const reachable = new Set();
    function markReachable(scene) {
      if (!scene || reachable.has(scene.id)) return;
      reachable.add(scene.id);
      branchKids(scene).forEach(markReachable);
    }
    const placed = new Set();
    let index = 0;
    function walk(scene, depth) {
      if (!scene || placed.has(scene.id)) return "";
      placed.add(scene.id);
      const kids = branchKids(scene).filter((kid) => !placed.has(kid.id));
      index += 1;
      const row = tocRow(scene, index, depth, kids);
      const nested = kids.length && expanded.has(scene.id) ? kids.map((kid) => walk(kid, depth + 1)).join("") : "";
      return row + nested;
    }
    function tocRow(scene, num, depth, kids) {
      const name = scene.title.trim() || "Без названия";
      const hasKids = kids.length > 0;
      const open = expanded.has(scene.id);
      return `
        <div class="toc-group" data-scene-row="${scene.id}" style="--toc-depth:${depth}">
          <div class="toc-row${scene.id === story.selectedId ? " is-active" : ""}" data-drop="${scene.id}">
            <button type="button" class="toc-caret" data-toggle-toc="${scene.id}" aria-expanded="${open ? "true" : "false"}" ${hasKids ? "" : "disabled"} aria-label="Ветки">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m9 6 6 6-6 6"/></svg>
            </button>
            <button type="button" class="scene-item-pick" data-select="${scene.id}">
              <span class="scene-num">${num}</span>
              <span class="scene-item-name">${escapeHtml(name)}</span>
              ${scene.isStart ? `<span class="scene-item-badge">Начало</span>` : ""}
              ${scene.isEnding ? `<span class="scene-item-badge">Финал</span>` : ""}
            </button>
            <button type="button" class="scene-grip" draggable="true" data-grip="${scene.id}" aria-label="Перетащить сцену">${GRIP}</button>
            <button type="button" class="scene-item-del" data-del-scene="${scene.id}" ${story.scenes.length === 1 ? "disabled" : ""} aria-label="Удалить сцену">
              <img src="assets/svg/удалить.svg" alt="">
            </button>
          </div>
        </div>`;
    }
    const start = story.scenes.find((scene) => scene.isStart) || story.scenes[0];
    markReachable(start);
    let html = walk(start, 0);
    story.scenes.forEach((scene) => {
      if (!reachable.has(scene.id)) html += walk(scene, 0);
    });
    tree.innerHTML = html;
  }

  function renderRight() {
    if (workspaceOpen) {
      $("scene-end-toggle")?.classList.toggle("on", Boolean(selected()?.isEnding));
      syncWorkspaceCover(selected());
    }
  }

  function renderBlocks() {}

  function renderPreview() {
    const scene = selected();
    if (!scene || !$("preview")) return;
    $("preview-title").textContent = scene.title.trim() || "Без названия";
    const html = scene.html || sceneBodyHtml(scene);
    const body = $("preview-body");
    body.innerHTML = html && html.replace(/\s/g, "") ? html : `<p class="empty-hint">Текст сцены пока пуст.</p>`;
    normalizeFootnotes(body);
    normalizeBreaks(body, false);
    const hero = $("preview-hero");
    if (scene.background) {
      hero.style.setProperty("--chapter-cover", `url("${scene.background}")`);
    } else {
      hero.style.removeProperty("--chapter-cover");
    }
    const choices = scene.choices || [];
    const prevId = previewPath.length > 1 ? previewPath[previewPath.length - 2] : null;
    const prevBtn = $("preview-prev");
    if (prevBtn) {
      prevBtn.hidden = !prevId;
      prevBtn.disabled = !prevId;
    }
    if ($("preview-prev-name")) {
      $("preview-prev-name").textContent = prevId ? sceneById(prevId)?.title.trim() || "Без названия" : "";
    }
    if ($("preview-choice-head")) $("preview-choice-head").hidden = !choices.length;
    if ($("preview-random")) $("preview-random").hidden = !choices.length;
    if ($("preview-choice-block")) $("preview-choice-block").hidden = !choices.length && !prevId;
    $("preview-choices").innerHTML = choices
      .map(
        (choice) => `
        <button type="button" class="scene-choice" data-preview-to="${choice.targetId}">
          <span class="scene-choice-text"><b>${escapeHtml(choice.label || "Дальше")}</b><small></small></span>
        </button>`
      )
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
    $("story-title").textContent = (story.title || "").trim() || "Тени прошлого";
    const zoomLabel = $("zoom-label");
    if (zoomLabel) zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    renderMap();
    renderTree();
    renderRight();
    renderBlocks();
    renderLibrary();
    document.querySelectorAll("[data-tool]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-tool") === tool);
    });
    $("canvas-wrap").dataset.tool = tool;
    $("canvas-wrap").classList.toggle("is-linking", tool === "link");
  }

  function findChoice(id) {
    for (const scene of story.scenes) {
      const choice = (scene.choices || []).find((item) => item.id === id);
      if (choice) return choice;
    }
    return null;
  }

  let menuSceneId = null;

  function closeNodeMenus() {
    document.querySelectorAll(".map-node-pop.open").forEach((pop) => pop.classList.remove("open"));
  }

  function beginChoiceEdit(label) {
    if (label.querySelector("input")) return;
    const id = label.getAttribute("data-edit-choice");
    const choice = findChoice(id);
    if (!choice) return;
    const input = document.createElement("input");
    input.className = "map-choice-input";
    input.value = choice.label || "";
    label.replaceChildren(input);
    input.focus();
    input.select();
    const commit = () => {
      choice.label = input.value.trim() || choice.label;
      snapshot();
    };
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
    });
  }

  function renderLibrary() {
    const chars = $("character-list");
    const notes = $("note-list");
    if (!chars || !notes) return;
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
    if (!body) return;
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
    if ($("linear-peek")) $("linear-peek").hidden = true;
  }

  let libModalKind = "char";
  let libModalId = null;

  function todayIso() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function closeLibModal() {
    if ($("lib-modal")) $("lib-modal").hidden = true;
    libModalId = null;
    if ($("lib-modal-delete")) $("lib-modal-delete").hidden = true;
  }

  function openLibModal(kind, id) {
    if (!$("lib-modal")) return;
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
    persistLibrary();
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
    persistLibrary();
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

  function moveScene(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    const from = story.scenes.findIndex((scene) => scene.id === fromId);
    const to = story.scenes.findIndex((scene) => scene.id === toId);
    if (from < 0 || to < 0) return;
    const [item] = story.scenes.splice(from, 1);
    story.scenes.splice(to, 0, item);
    snapshot();
  }

  function openSettings() {
    workspaceOpen = true;
    document.body.classList.add("is-scene-workspace");
    $("scene-workspace").hidden = false;
    fillWorkspace();
    requestAnimationFrame(() => $("scene-sheet-title")?.focus());
  }

  function closeSettings() {
    if (!workspaceOpen) return;
    saveSceneHtml(true);
    hideFnPop();
    workspaceOpen = false;
    document.body.classList.remove("is-scene-workspace");
    $("scene-workspace").hidden = true;
    renderMap();
    renderTree();
  }

  function selectScene(id) {
    if (tool === "link") {
      if (!linkFromId) {
        linkFromId = id;
        story.selectedId = id;
        persist();
        render();
        return;
      }
      if (linkFromId !== id) {
        addChoice(linkFromId, id);
        expanded.add(linkFromId);
        linkFromId = null;
        tool = "pan";
        snapshot();
      }
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
        if (previewPath[previewPath.length - 1] !== id) previewPath.push(id);
        story.selectedId = id;
        persist();
        renderPreview();
        renderTree();
      }
      return;
    }
    const editChoice = event.target.closest("[data-edit-choice]");
    if (editChoice) {
      event.stopPropagation();
      beginChoiceEdit(editChoice);
      return;
    }
    const nodeAct = event.target.closest("[data-node-act]");
    if (nodeAct) {
      event.preventDefault();
      event.stopPropagation();
      const sceneId = nodeAct.getAttribute("data-scene") || menuSceneId;
      const act = nodeAct.getAttribute("data-node-act");
      closeNodeMenus();
      if (act === "edit") {
        story.selectedId = sceneId;
        persist();
        render();
        openSettings();
      } else if (act === "choice") {
        setTimeout(() => addScene(true, sceneId), 0);
      } else if (act === "start") {
        setStart(sceneId);
      } else if (act === "delete") {
        deleteScene(sceneId);
      }
      return;
    }
    const nodeMenu = event.target.closest("[data-node-menu]");
    if (nodeMenu) {
      event.preventDefault();
      event.stopPropagation();
      const id = nodeMenu.getAttribute("data-node-menu");
      menuSceneId = id;
      const pop = document.querySelector(`[data-node-pop="${id}"]`);
      const wasOpen = pop?.classList.contains("open");
      closeNodeMenus();
      if (pop && !wasOpen) pop.classList.add("open");
      return;
    }
    const tocDel = event.target.closest("[data-del-scene]");
    if (tocDel) {
      event.preventDefault();
      event.stopPropagation();
      if (!tocDel.disabled) deleteScene(tocDel.getAttribute("data-del-scene"));
      return;
    }
    const tocToggle = event.target.closest("[data-toggle-toc]");
    if (tocToggle && !tocToggle.disabled) {
      event.preventDefault();
      event.stopPropagation();
      const id = tocToggle.getAttribute("data-toggle-toc");
      if (expanded.has(id)) expanded.delete(id);
      else expanded.add(id);
      renderTree();
      return;
    }
    if (!event.target.closest(".map-node-pop")) closeNodeMenus();
    const select = event.target.closest("[data-select]");
    if (select) {
      if (skipNodeClick) {
        skipNodeClick = false;
        return;
      }
      if (tool === "link" && !select.classList.contains("map-node")) return;
      selectScene(select.getAttribute("data-select"));
      return;
    }
    const mode = event.target.closest("[data-mode]");
    if (mode) {
      const value = mode.getAttribute("data-mode");
      if (workspaceOpen && value === "preview") closeSettings();
      document.querySelectorAll(".mode-tab").forEach((tab) => tab.classList.toggle("active", tab.getAttribute("data-mode") === value));
      $("preview").hidden = value !== "preview";
      if (value === "preview") {
        previewPath = [selected()?.id].filter(Boolean);
        renderPreview();
      }
      return;
    }
    const toolBtn = event.target.closest("[data-tool]");
    if (toolBtn) {
      const next = toolBtn.getAttribute("data-tool");
      if (next === "link") {
        tool = tool === "link" ? "pan" : "link";
        linkFromId = null;
      } else {
        tool = next;
        linkFromId = null;
      }
      render();
      return;
    }
    const zoomBtn = event.target.closest("[data-zoom]");
    if (zoomBtn) {
      const action = zoomBtn.getAttribute("data-zoom");
      if (action === "in") setZoom(zoom + 0.1);
      else if (action === "out") setZoom(zoom - 0.1);
      else fitView();
      return;
    }
    const right = event.target.closest("[data-right]");
    if (right && $("right-settings")) {
      const name = right.getAttribute("data-right");
      document.querySelectorAll(".right-tab").forEach((tab) => tab.classList.toggle("active", tab.getAttribute("data-right") === name));
      $("right-settings").hidden = name !== "settings";
      if ($("right-blocks")) $("right-blocks").hidden = name !== "blocks";
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

  $("add-scene")?.addEventListener("click", () => addScene(false));
  $("undo-btn").addEventListener("click", () => restore(histIndex - 1));
  $("redo-btn").addEventListener("click", () => restore(histIndex + 1));
  $("tool-new-scene")?.addEventListener("click", () => addScene(false));
  $("tool-choice")?.addEventListener("click", () => addScene(true, selected()?.id));
  $("zoom-in")?.addEventListener("click", () => setZoom(zoom + 0.1));
  $("zoom-out")?.addEventListener("click", () => setZoom(zoom - 0.1));
  $("preview-prev")?.addEventListener("click", () => {
    if (previewPath.length < 2) return;
    previewPath.pop();
    const id = previewPath[previewPath.length - 1];
    if (!sceneById(id)) return;
    story.selectedId = id;
    persist();
    renderPreview();
    renderTree();
  });
  $("preview-random")?.addEventListener("click", () => {
    const choices = selected()?.choices || [];
    if (!choices.length) return;
    const pick = choices[Math.floor(Math.random() * choices.length)];
    if (!pick?.targetId || !sceneById(pick.targetId)) return;
    if (previewPath[previewPath.length - 1] !== pick.targetId) previewPath.push(pick.targetId);
    story.selectedId = pick.targetId;
    persist();
    renderPreview();
    renderTree();
  });

  function commitFnPop() {
    if (!fnTarget || !document.contains(fnTarget)) return;
    fnTarget.setAttribute("data-note", $("fn-text").value.trim());
    saveSceneHtml();
  }

  function hideFnPop() {
    clearTimeout(fnHideTimer);
    commitFnPop();
    if ($("fn-pop")) $("fn-pop").hidden = true;
    fnTarget = null;
  }

  function showFnPop(mark, focus) {
    clearTimeout(fnHideTimer);
    if (fnTarget && fnTarget !== mark) commitFnPop();
    fnTarget = mark;
    const pop = $("fn-pop");
    if (!pop) return;
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

  function removeBreak(el) {
    if (!el) return;
    el.remove();
    saveSceneHtml();
    snapshot("graph");
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

  function insertSceneNode(node) {
    const editor = $("scene-editor");
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
    saveSceneHtml();
    snapshot("graph");
  }

  function insertSceneImage(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const editor = $("scene-editor");
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
      saveSceneHtml();
      snapshot("graph");
    };
    reader.readAsDataURL(file);
  }

  $("scene-workspace-close")?.addEventListener("click", closeSettings);
  $("scene-ws-undo")?.addEventListener("click", () => restore(histIndex - 1));
  $("scene-ws-redo")?.addEventListener("click", () => restore(histIndex + 1));
  $("scene-end-switch")?.addEventListener("click", () => {
    const scene = selected();
    scene.isEnding = !scene.isEnding;
    $("scene-end-toggle")?.classList.toggle("on", scene.isEnding);
    snapshot("graph");
  });
  $("scene-cover-btn")?.addEventListener("click", () => $("scene-cover-file").click());
  $("scene-cover-file")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      selected().background = String(reader.result);
      snapshot("graph");
      syncWorkspaceCover(selected());
    };
    reader.readAsDataURL(file);
  });
  $("scene-cover-remove")?.addEventListener("click", () => {
    selected().background = "";
    snapshot("graph");
    syncWorkspaceCover(selected());
  });
  $("scene-sheet-title")?.addEventListener("input", () => {
    selected().title = ($("scene-sheet-title").textContent || "").slice(0, 100);
    persist();
    renderTree();
    renderMap();
  });
  document.querySelectorAll("[data-scene-cmd]").forEach((btn) => {
    btn.addEventListener("click", () => {
      $("scene-editor")?.focus();
      document.execCommand(btn.getAttribute("data-scene-cmd"), false);
      saveSceneHtml();
    });
  });
  $("scene-insert-break")?.addEventListener("click", () => {
    const wrap = document.createElement("div");
    wrap.className = "linear-break linear-read-ornament";
    wrap.contentEditable = "false";
    wrap.innerHTML = '<img src="assets/deco/перо1.svg" alt="">';
    const editor = $("scene-editor");
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
    saveSceneHtml();
    snapshot("graph");
  });
  $("scene-insert-note")?.addEventListener("click", () => {
    const mark = document.createElement("span");
    mark.className = "linear-fn";
    mark.contentEditable = "false";
    mark.setAttribute("data-note", "");
    mark.textContent = "*";
    insertSceneNode(mark);
    const live = [...$("scene-editor").querySelectorAll(".linear-fn")].at(-1);
    if (live) showFnPop(live, true);
  });
  $("scene-insert-image")?.addEventListener("click", () => $("scene-image-file").click());
  $("scene-image-file")?.addEventListener("change", (event) => {
    insertSceneImage(event.target.files?.[0]);
    event.target.value = "";
  });
  $("scene-editor")?.addEventListener("input", () => saveSceneHtml());
  $("scene-editor")?.addEventListener("click", (event) => {
    const editor = $("scene-editor");
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
  $("scene-editor")?.addEventListener("keydown", (event) => {
    if (event.key !== "Backspace" && event.key !== "Delete") return;
    const editor = $("scene-editor");
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
  $("scene-editor")?.addEventListener("mouseover", (event) => {
    const mark = event.target.closest(".linear-fn");
    if (mark && $("scene-editor").contains(mark)) showFnPop(mark, false);
  });
  $("scene-editor")?.addEventListener("mouseout", (event) => {
    const mark = event.target.closest(".linear-fn");
    if (!mark) return;
    const next = event.relatedTarget;
    if (next && (mark.contains(next) || next.closest("#fn-pop"))) return;
    fnHideTimer = window.setTimeout(hideFnPop, 220);
  });
  $("fn-pop")?.addEventListener("mouseenter", () => clearTimeout(fnHideTimer));
  $("fn-pop")?.addEventListener("mouseleave", (event) => {
    const next = event.relatedTarget;
    if (next && next.closest && next.closest(".linear-fn")) return;
    fnHideTimer = window.setTimeout(hideFnPop, 220);
  });
  $("fn-text")?.addEventListener("input", () => {
    if (fnTarget) fnTarget.setAttribute("data-note", $("fn-text").value);
  });
  $("fn-done")?.addEventListener("click", hideFnPop);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !workspaceOpen) return;
    if ($("fn-pop") && !$("fn-pop").hidden) {
      hideFnPop();
      return;
    }
    if ($("lib-modal") && !$("lib-modal").hidden) return;
    if ($("linear-peek") && !$("linear-peek").hidden) return;
    closeSettings();
  });
  $("scene-search").addEventListener("input", renderTree);
  $("structure-tree").addEventListener("dragstart", (event) => {
    const grip = event.target.closest("[data-grip]");
    if (!grip) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/plain", grip.getAttribute("data-grip"));
    event.dataTransfer.effectAllowed = "move";
    grip.closest(".toc-row")?.classList.add("is-dragging");
  });
  $("structure-tree").addEventListener("dragend", (event) => {
    event.target.closest(".toc-row")?.classList.remove("is-dragging");
  });
  $("structure-tree").addEventListener("dragover", (event) => {
    if (!event.target.closest("[data-drop]")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  });
  $("structure-tree").addEventListener("drop", (event) => {
    const row = event.target.closest("[data-drop]");
    if (!row) return;
    event.preventDefault();
    moveScene(event.dataTransfer.getData("text/plain"), row.getAttribute("data-drop"));
  });
  $("transitions-list")?.addEventListener("input", (event) => {
    const choiceId = event.target.getAttribute("data-choice-label");
    if (!choiceId) return;
    const choice = selected().choices.find((item) => item.id === choiceId);
    if (choice) choice.label = event.target.value;
    persist();
    renderMap();
    renderTree();
  });
  $("right-blocks")?.addEventListener("input", (event) => {
    const id = event.target.getAttribute("data-block-text");
    if (!id) return;
    const block = selected().blocks.find((item) => item.id === id);
    if (block) block.text = event.target.value;
    persist();
  });
  $("right-blocks")?.addEventListener("change", (event) => {
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
  let dragId = null;
  let dragMoved = false;
  let dragStart = { x: 0, y: 0 };
  let nodeStart = { x: 0, y: 0 };
  $("canvas-area").addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    if (event.target.closest(".canvas-toolbar, .map-node-menu, .map-node-pop, .map-choice-label")) return;
    if (tool === "link") return;
    if (tool !== "pan") return;
    const node = event.target.closest(".map-node[data-select]");
    if (node) {
      const id = node.getAttribute("data-select");
      const point = lastLayout?.pos?.[id];
      if (!point) return;
      dragId = id;
      dragMoved = false;
      skipNodeClick = false;
      dragStart = { x: event.clientX, y: event.clientY };
      nodeStart = { x: point.x, y: point.y };
      return;
    }
    panning = true;
    panX = event.clientX;
    panY = event.clientY;
  });
  window.addEventListener("mousemove", (event) => {
    if (dragId) {
      const dx = (event.clientX - dragStart.x) / zoom;
      const dy = (event.clientY - dragStart.y) / zoom;
      if (Math.hypot(dx, dy) > 4) dragMoved = true;
      const scene = sceneById(dragId);
      if (!scene) return;
      scene.mapX = Math.max(16, nodeStart.x + dx);
      scene.mapY = Math.max(16, nodeStart.y + dy);
      renderMap();
      return;
    }
    if (!panning) return;
    $("canvas-area").scrollBy(panX - event.clientX, panY - event.clientY);
    panX = event.clientX;
    panY = event.clientY;
  });
  window.addEventListener("mouseup", () => {
    if (dragId) {
      if (dragMoved) {
        skipNodeClick = true;
        snapshot("graph");
      }
      dragId = null;
      dragMoved = false;
    }
    panning = false;
  });

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
  $("character-list")?.addEventListener("click", onLibListClick);
  $("note-list")?.addEventListener("click", onLibListClick);
  $("lib-add-char")?.addEventListener("click", () => openLibModal("char"));
  $("lib-add-note")?.addEventListener("click", () => openLibModal("note"));
  $("lib-modal-dismiss")?.addEventListener("click", closeLibModal);
  $("lib-modal-delete")?.addEventListener("click", () => {
    if (libModalId) deleteLibItem(libModalKind, libModalId);
  });
  $("lib-modal-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveLibModal();
  });
  $("peek-close")?.addEventListener("click", closePeek);
  $("linear-peek")?.addEventListener("click", (event) => {
    if (event.target === $("linear-peek")) closePeek();
  });
  window.addEventListener("storage", (event) => {
    if (!window.FoxLibrary || event.key !== FoxLibrary.KEY || !event.newValue) return;
    const lib = FoxLibrary.load();
    story.characters = lib.characters;
    story.notes = lib.notes;
    renderLibrary();
  });

  render();
})();

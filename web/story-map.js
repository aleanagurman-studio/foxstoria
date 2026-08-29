window.FoxStoryMap = (function foxStoryMap() {
  const STORE = "foxtoria-editor";
  const CARD_W = 200;
  const CARD_H = 118;
  const HGAP = 56;
  const VGAP = 124;
  const START = 40;
  const NODE_W = 48;
  const NODE_H = 28;

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function demoShadows() {
    const chapterId = "ch-shadows";
    return {
      title: "Тени прошлого",
      chapters: [
        { id: chapterId, title: "Глава 1" },
        { id: "ch-cafe", title: "Ветка: кафе" },
        { id: "ch-park", title: "Ветка: парк" },
      ],
      scenes: [
        {
          id: "start",
          chapterId,
          title: "Пролог. Перекрёсток",
          description:
            "Дождь стих, но мостовая ещё блестит. Слева — тёплый свет кафе. Справа — тёмный силуэт парка. Позади — шаги, которые вы уже слышали однажды.",
          isStart: true,
          isEnding: false,
          published: true,
          blocks: [],
          choices: [
            { id: "c-cafe", label: "Пойти в кафе", targetId: "cafe" },
            { id: "c-park", label: "Пойти в парк", targetId: "park" },
          ],
        },
        {
          id: "cafe",
          chapterId: "ch-cafe",
          title: "Ветка: кафе",
          description:
            "За стойкой кипит кофе. Человек из прошлого поднимает взгляд — и улыбается так, будто вы не пропадали все эти годы.",
          isStart: false,
          isEnding: false,
          published: true,
          blocks: [],
          choices: [
            { id: "c-truth", label: "Спросить, что его беспокоит", targetId: "truth" },
            { id: "c-leave-c", label: "Сказать, что вам пора уходить", targetId: "leave" },
            { id: "c-hold", label: "Просто взять его за руку", targetId: "hold" },
          ],
        },
        {
          id: "park",
          chapterId: "ch-park",
          title: "Ветка: парк",
          description:
            "Фонари качаются на ветру. На лавке лежит раскрытая книга — та самая, которую вы потеряли зимой.",
          isStart: false,
          isEnding: false,
          published: true,
          blocks: [],
          choices: [
            { id: "c-cafe-2", label: "Всё равно пойти в кафе", targetId: "cafe" },
            { id: "c-leave-p", label: "Уйти, не оборачиваясь", targetId: "leave" },
          ],
        },
        {
          id: "truth",
          chapterId: "ch-cafe",
          title: "Концовка: правда",
          description: "Он рассказывает всё. Не красиво — честно.",
          isStart: false,
          isEnding: true,
          published: false,
          blocks: [],
          choices: [],
        },
        {
          id: "leave",
          chapterId: "ch-park",
          title: "Концовка: уход",
          description: "Вы выходите на улицу. Дождь начинается снова.",
          isStart: false,
          isEnding: true,
          published: false,
          blocks: [],
          choices: [],
        },
        {
          id: "hold",
          chapterId: "ch-cafe",
          title: "Концовка: рука",
          description: "Пальцы смыкаются раньше, чем находятся слова.",
          isStart: false,
          isEnding: true,
          published: false,
          blocks: [],
          choices: [],
        },
      ],
      selectedId: "start",
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data.scenes || !data.scenes.length) return null;
      return data;
    } catch {
      return null;
    }
  }

  function getStory() {
    return load() || demoShadows();
  }

  function sceneById(story, id) {
    return story.scenes.find((scene) => scene.id === id);
  }

  function isPublished(scene) {
    if (!scene) return false;
    if (typeof scene.published === "boolean") return scene.published;
    return !scene.isEnding;
  }

  function publishedStory(story) {
    if (!story?.scenes?.length) return story;
    const start = story.scenes.find((scene) => scene.isStart) || story.scenes[0];
    const allow = new Set(
      story.scenes.filter((scene) => isPublished(scene) || scene.id === start?.id).map((scene) => scene.id)
    );
    return {
      ...story,
      scenes: story.scenes
        .filter((scene) => allow.has(scene.id))
        .map((scene) => ({
          ...scene,
          choices: (scene.choices || []).filter((choice) => allow.has(choice.targetId)),
        })),
    };
  }

  function layout(story) {
    const start = story.scenes.find((scene) => scene.isStart) || story.scenes[0];
    const pos = {};
    function widthOf(id, seen) {
      if (seen.has(id)) return CARD_W;
      seen.add(id);
      const scene = sceneById(story, id);
      const kids = (scene?.choices || []).map((choice) => choice.targetId).filter((target) => sceneById(story, target));
      if (!kids.length) return CARD_W;
      return Math.max(
        CARD_W,
        kids.reduce((sum, kid) => sum + widthOf(kid, new Set(seen)) + HGAP, -HGAP)
      );
    }
    function place(id, x, y, seen) {
      if (seen.has(id) || !sceneById(story, id)) return;
      seen.add(id);
      pos[id] = { x, y };
      const scene = sceneById(story, id);
      const kids = (scene.choices || []).map((choice) => choice.targetId).filter((target) => sceneById(story, target));
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
    story.scenes.forEach((scene) => {
      if (Number.isFinite(scene.mapX) && Number.isFinite(scene.mapY)) {
        pos[scene.id] = { x: scene.mapX, y: scene.mapY };
      }
    });
    let minX = Infinity;
    let minY = Infinity;
    let maxX = 0;
    let maxY = 0;
    Object.values(pos).forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x + CARD_W);
      maxY = Math.max(maxY, point.y + CARD_H + 16);
    });
    const padX = 48;
    const padY = 56;
    const shiftX = Number.isFinite(minX) && minX < padX ? padX - minX : 0;
    const shiftY = Number.isFinite(minY) && minY < padY ? padY - minY : 0;
    if (shiftX || shiftY) {
      Object.values(pos).forEach((point) => {
        point.x += shiftX;
        point.y += shiftY;
      });
      minX += shiftX;
      maxX += shiftX;
      minY += shiftY;
      maxY += shiftY;
    }
    return {
      pos,
      start,
      width: Math.max(640, maxX + 96),
      height: Math.max(420, maxY + 48),
      startX: pos[start.id].x + CARD_W / 2 - START / 2,
    };
  }

  function edgePath(x1, y1, x2, y2) {
    const r = 12;
    const mid = Math.round((y1 + y2) / 2);
    if (Math.abs(x1 - x2) < 2) return `M ${x1} ${y1} L ${x2} ${y2}`;
    const dir = x2 >= x1 ? 1 : -1;
    if (Math.abs(x2 - x1) < r * 2 || Math.abs(y2 - y1) < r * 2) {
      return `M ${x1} ${y1} L ${x1} ${mid} L ${x2} ${mid} L ${x2} ${y2}`;
    }
    return `M ${x1} ${y1} L ${x1} ${mid - r} Q ${x1} ${mid} ${x1 + dir * r} ${mid} L ${x2 - dir * r} ${mid} Q ${x2} ${mid} ${x2} ${mid + r} L ${x2} ${y2}`;
  }

  function nodeBox(point) {
    return {
      x: point.x + (CARD_W - NODE_W) / 2,
      y: point.y + (CARD_H - NODE_H) / 2,
    };
  }

  function renderSidebar(root, story, state) {
    if (!root || !story) return;
    const graph = publishedStory(story);
    const { pos, start, width, height, startX } = layout(graph);
    const currentId = state.currentId;
    const visited = new Set(state.visited || []);
    const edges = [];
    if (!pos[start.id]) return;
    const startNode = nodeBox(pos[start.id]);
    edges.push({
      d: edgePath(startX + START / 2, START + 8, startNode.x + NODE_W / 2, startNode.y),
    });
    graph.scenes.forEach((scene) => {
      (scene.choices || []).forEach((choice) => {
        const from = pos[scene.id];
        const to = pos[choice.targetId];
        if (!from || !to) return;
        const a = nodeBox(from);
        const b = nodeBox(to);
        edges.push({
          d: edgePath(a.x + NODE_W / 2, a.y + NODE_H, b.x + NODE_W / 2, b.y),
        });
      });
    });
    const svg = `
      <svg class="graph-lines" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <marker id="path-map-arrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="var(--sand)"/>
          </marker>
        </defs>
        ${edges
          .map(
            (edge) =>
              `<path d="${edge.d}" fill="none" stroke="var(--sand)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" marker-end="url(#path-map-arrow)"/>`
          )
          .join("")}
      </svg>`;
    const startHtml = `<span class="map-start path-map-start" style="left:${startX}px;top:8px"><span class="map-start-dot"></span></span>`;
    const nodes = graph.scenes
      .filter((scene) => pos[scene.id])
      .map((scene, index) => {
        const point = pos[scene.id];
        const here = scene.id === currentId;
        const seen = visited.has(scene.id);
        const cls = ["path-map-node", here ? "is-current" : "", seen && !here ? "is-done" : "", !seen && !here ? "is-locked" : "", seen || here ? "is-jump" : ""]
          .filter(Boolean)
          .join(" ");
        const inner = here || seen
          ? `${index + 1}<img src="assets/svg/unlocked.svg" alt="">`
          : `<img src="assets/svg/locked.svg" alt="">`;
        const box = nodeBox(point);
        return `<button type="button" class="${cls}" data-map="${scene.id}" style="left:${box.x}px;top:${box.y}px" ${seen || here ? "" : "disabled"}>${inner}</button>`;
      })
      .join("");
    const avail = root.clientWidth || 248;
    const scale = Math.min(1, avail / width);
    const fitW = Math.ceil(width * scale);
    const fitH = Math.ceil(height * scale);
    root.innerHTML = `<div class="path-map-fit" style="width:${fitW}px;height:${fitH}px"><div class="path-map-graph" style="width:${width}px;height:${height}px;transform:scale(${scale});transform-origin:top left">${svg}${startHtml}${nodes}</div></div>`;
    root.style.height = `${fitH}px`;
  }

  const NAV_CHEVRON = `<svg class="story-nav-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 6.2 8 10.5l4.5-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function walkTree(story) {
    const start = story.scenes.find((scene) => scene.isStart) || story.scenes[0];
    const placed = new Set();
    let n = 0;
    function build(id) {
      if (!id || placed.has(id) || !sceneById(story, id)) return null;
      placed.add(id);
      n += 1;
      const index = n;
      const scene = sceneById(story, id);
      const seenKid = new Set();
      const children = [];
      (scene.choices || []).forEach((choice) => {
        const target = choice.targetId;
        if (!target || seenKid.has(target) || placed.has(target) || !sceneById(story, target)) return;
        seenKid.add(target);
        const child = build(target);
        if (child) children.push(child);
      });
      return {
        id,
        n: index,
        title: (scene.title || "").trim() || "Без названия",
        children,
      };
    }
    const roots = [];
    const first = build(start.id);
    if (first) roots.push(first);
    story.scenes.forEach((scene) => {
      const extra = build(scene.id);
      if (extra) roots.push(extra);
    });
    return roots;
  }

  function flattenTree(nodes, out) {
    const list = out || [];
    (nodes || []).forEach((node) => {
      list.push(node);
      flattenTree(node.children, list);
    });
    return list;
  }

  function pathTo(story, id) {
    const start = story.scenes.find((scene) => scene.isStart) || story.scenes[0];
    if (!start || !id) return [];
    const parent = { [start.id]: null };
    const queue = [start.id];
    while (queue.length) {
      const cur = queue.shift();
      const scene = sceneById(story, cur);
      (scene?.choices || []).forEach((choice) => {
        const target = choice.targetId;
        if (!target || Object.prototype.hasOwnProperty.call(parent, target) || !sceneById(story, target)) return;
        parent[target] = cur;
        queue.push(target);
      });
    }
    if (!Object.prototype.hasOwnProperty.call(parent, id) && id !== start.id) return [start.id, id];
    const chain = [];
    let cur = id;
    while (cur) {
      chain.unshift(cur);
      cur = parent[cur];
    }
    return chain;
  }

  function escapeNav(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderNav(root, story, state) {
    if (!root || !story) return;
    const currentId = state.currentId;
    const visited = new Set(state.visited || []);
    const collapsed = state.collapsed || new Set();
    const unlockAll = Boolean(state.unlockAll);
    const hrefOf = state.hrefOf || ((node) => `read-interactive.html?scene=${encodeURIComponent(node.id)}`);
    const readSet = state.readSet || new Set();
    const start = story.scenes.find((scene) => scene.isStart) || story.scenes[0];

    function nodeHTML(node) {
      const hasKids = node.children.length > 0;
      const folded = collapsed.has(node.id);
      const here = node.id === currentId;
      const seen = unlockAll || visited.has(node.id) || here || node.id === start?.id;
      const fold = `<button type="button" class="story-nav-fold${hasKids ? "" : " is-empty"}" data-fold="${escapeNav(node.id)}" aria-label="${folded ? "Развернуть уровень" : "Свернуть уровень"}" aria-expanded="${folded ? "false" : "true"}">${NAV_CHEVRON}</button>`;
      const mark = readSet.has(node.id)
        ? `<img class="linear-toc-check" src="assets/svg/okay.svg" alt="" aria-hidden="true">`
        : seen
          ? `<img class="story-nav-lock" src="assets/svg/unlocked.svg" alt="" aria-hidden="true">`
          : `<img class="story-nav-lock" src="assets/svg/locked.svg" alt="" aria-hidden="true">`;
      const label = `<span class="story-nav-num">${node.n}</span><span class="story-nav-title">${escapeNav(node.title)}</span>${mark}`;
      const link = seen
        ? `<a class="story-nav-link${here ? " is-current" : ""}${readSet.has(node.id) ? " is-read" : ""}" href="${hrefOf(node)}" data-scene="${escapeNav(node.id)}"${here ? " aria-current=\"page\"" : ""}>${label}</a>`
        : `<span class="story-nav-link is-locked">${label}</span>`;
      const kids = hasKids ? `<ol class="story-nav-kids">${node.children.map(nodeHTML).join("")}</ol>` : "";
      return `<li class="story-nav-node${folded ? " is-collapsed" : ""}" data-nav-id="${escapeNav(node.id)}">${fold}${link}${kids}</li>`;
    }

    root.classList.add("story-nav");
    root.innerHTML = walkTree(story).map(nodeHTML).join("");
  }

  return {
    STORE,
    CARD_W,
    CARD_H,
    HGAP,
    VGAP,
    START,
    uid,
    demoShadows,
    load,
    getStory,
    isPublished,
    publishedStory,
    layout,
    edgePath,
    renderSidebar,
    walkTree,
    flattenTree,
    pathTo,
    renderNav,
  };
})();

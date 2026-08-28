(function studioCabinet() {
  const views = document.querySelectorAll(".studio-view");
  const navButtons = document.querySelectorAll(".studio-nav [data-view]");
  const typeSelect = document.getElementById("studio-type");
  const interactive = document.getElementById("timeline-interactive");
  const linear = document.getElementById("timeline-linear");
  const timelineLead = document.getElementById("timeline-lead");
  const publicPage = document.getElementById("studio-public-page");
  const continueBtn = document.getElementById("studio-continue");
  const resumePlace = document.getElementById("studio-resume-place");

  const workId = new URLSearchParams(location.search).get("id") || "";

  function showView(name) {
    views.forEach((view) => {
      view.hidden = view.id !== `view-${name}`;
    });
    document.querySelectorAll(".studio-nav .studio-item[data-view]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-view") === name);
    });
  }

  function applyStoryType(isLinear) {
    const page = isLinear ? "editor-linear.html" : "editor.html";
    const editorHref = workId ? `${page}?id=${encodeURIComponent(workId)}` : page;
    if (continueBtn) continueBtn.href = editorHref;
    document.querySelectorAll(".work-chapter-title, .work-chapter-edit").forEach((link) => {
      link.href = editorHref;
    });
    if (resumePlace) {
      resumePlace.textContent = isLinear ? "Глава 2 · Ветки" : "Глава 2 · Сцена 4 · Перекрёсток";
    }
    const scenes = document.querySelector("[data-studio-scenes]");
    if (scenes) scenes.hidden = isLinear;
    document.querySelectorAll(".work-chapter-scenes").forEach((el) => {
      el.hidden = isLinear;
    });
    if (interactive) interactive.hidden = isLinear;
    if (linear) linear.hidden = !isLinear;
    if (timelineLead) {
      timelineLead.textContent = isLinear
        ? "Для линейной истории шкала одна: события идут по времени мира."
        : "Для интерактивной истории шкала ветвится: это время мира, а не порядок чтения.";
    }
    if (publicPage) {
      publicPage.href = isLinear ? "story-linear.html" : "story-interactive.html";
    }
  }

  navButtons.forEach((btn) => {
    if (btn.tagName === "A") return;
    btn.addEventListener("click", () => showView(btn.getAttribute("data-view")));
  });

  document.querySelector(".work-dash-edit")?.addEventListener("click", () => showView("settings"));
  document.querySelector("[data-open-cover]")?.addEventListener("click", () => showView("settings"));

  typeSelect?.addEventListener("change", () => {
    applyStoryType(typeSelect.value === "linear");
    refreshSize();
  });

  applyStoryType(typeSelect?.value === "linear");
  showView("work");

  fetch("works.json", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!workId || !data) return;
      const work = (data.works || []).find((item) => item.id === workId);
      if (!work) return;
      const titleEl = document.querySelector(".work-dash-title h2");
      if (titleEl) titleEl.textContent = work.title;
      document.querySelectorAll("[data-work-cover]").forEach((img) => {
        if (work.cover) img.src = work.cover;
      });
      const titleInput = document.getElementById("work-title");
      if (titleInput) titleInput.value = work.title;
      const desc = document.getElementById("work-desc");
      if (desc && work.description) desc.value = work.description;
      const author = document.getElementById("work-author");
      if (author && work.author) author.value = work.author;
      if (typeSelect) typeSelect.value = work.story_type === "linear" ? "linear" : "interactive";
      const idLine = document.querySelector(".work-dash-id");
      if (idLine) idLine.textContent = `ID: #${work.id}`;
      applyStoryType(work.story_type === "linear");
      if (publicPage && work.href) publicPage.href = work.href;
      document.title = `${work.title} — кабинет — FoxStoria`;
    })
    .catch(() => {});

  const form = document.getElementById("work-card-form");
  const sizeBox = document.getElementById("work-size");

  function chapterCount() {
    const isLinear = document.getElementById("studio-type")?.value === "linear";
    try {
      const key = isLinear ? "foxtoria-editor-linear" : "foxtoria-editor";
      const raw = localStorage.getItem(key);
      if (!raw) return 0;
      const data = JSON.parse(raw);
      if (Array.isArray(data.chapters)) return data.chapters.length;
    } catch {
      return 0;
    }
    return 0;
  }

  function sizeLabel(count) {
    if (!count || count < 1) return null;
    if (count <= 20) return "мини";
    if (count <= 50) return "миди";
    return "макси";
  }

  function chapterWord(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return "глава";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "главы";
    return "глав";
  }

  function refreshSize() {
    if (!sizeBox || !form) return;
    const completed = form.status.value === "completed";
    const count = chapterCount();
    if (!completed) {
      sizeBox.textContent = "Размер появится после завершения. Мини — до 20 глав, миди — до 50, макси — дальше.";
      return;
    }
    if (!count) {
      sizeBox.textContent = "Добавьте главы в редакторе — число и размер посчитаются сами.";
      return;
    }
    sizeBox.textContent = `${sizeLabel(count)} · ${count} ${chapterWord(count)}`;
  }

  form?.addEventListener("change", refreshSize);
  form?.addEventListener("input", refreshSize);
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    refreshSize();
  });
  refreshSize();

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function parsePairingLine(line) {
    const raw = String(line || "").trim();
    if (!raw) return null;
    if (raw.includes("|")) {
      const [left, right] = raw.split("|").map((part) => part.trim());
      if (left && right) return { left, right, mode: "equal" };
    }
    if (raw.includes("/")) {
      const [left, right] = raw.split("/").map((part) => part.trim());
      if (left && right) return { left, right, mode: "domsub" };
    }
    return null;
  }

  function formatPairing(pairing) {
    if (pairing.mode === "equal") return `${pairing.left} | ${pairing.right}`;
    return `${pairing.left}/${pairing.right}`;
  }

  function pairingTitle(pairing) {
    if (pairing.mode === "equal") return `${pairing.left} и ${pairing.right} — равные роли`;
    return `${pairing.left} — доминант, ${pairing.right} — пассив`;
  }

  function initPairingBuilder(container) {
    const hidden = document.getElementById("work-pairings-value");
    const listEl = container.querySelector(".pairing-list");
    const leftSel = container.querySelector(".pairing-char-left");
    const sepSel = container.querySelector(".pairing-sep");
    const rightSel = container.querySelector(".pairing-char-right");
    const addBtn = container.querySelector(".pairing-add");
    if (!hidden || !listEl || !leftSel || !sepSel || !rightSel || !addBtn) return null;

    let pairings = (container.getAttribute("data-initial") || hidden.value || "")
      .split("\n")
      .map(parsePairingLine)
      .filter(Boolean);

    function workCharacters() {
      const picker = document.querySelector('[data-tax-picker="characters"]');
      if (!picker) return [];
      return [...picker.querySelectorAll(".tax-chip")]
        .map((chip) => chip.textContent.replace(/\s*×\s*$/, "").trim())
        .filter(Boolean);
    }

    function syncHidden() {
      hidden.value = pairings.map(formatPairing).join("\n");
    }

    function updateAddButton() {
      addBtn.disabled = !(leftSel.value && sepSel.value && rightSel.value);
    }

    function fillSelect(select, placeholder) {
      const chars = workCharacters();
      const prev = select.value;
      select.innerHTML =
        `<option value="">${escapeHtml(placeholder)}</option>` +
        chars.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
      select.value = chars.includes(prev) ? prev : "";
    }

    function refreshOptions() {
      fillSelect(leftSel, "Первый");
      fillSelect(rightSel, "Второй");
      const chars = new Set(workCharacters());
      const before = pairings.length;
      pairings = pairings.filter((pairing) => chars.has(pairing.left) && chars.has(pairing.right));
      if (pairings.length !== before) renderList();
      updateAddButton();
    }

    function renderList() {
      listEl.innerHTML = pairings
        .map(
          (pairing, index) =>
            `<span class="pairing-chip" title="${escapeHtml(pairingTitle(pairing))}">${escapeHtml(formatPairing(pairing))}<button type="button" class="pairing-chip-remove" data-index="${index}" aria-label="Удалить пейринг">×</button></span>`
        )
        .join("");
      syncHidden();
      updateAddButton();
    }

    function resetDraft() {
      leftSel.value = "";
      sepSel.value = "";
      rightSel.value = "";
      updateAddButton();
    }

    leftSel.addEventListener("change", updateAddButton);
    sepSel.addEventListener("change", updateAddButton);
    rightSel.addEventListener("change", updateAddButton);

    addBtn.addEventListener("click", () => {
      if (addBtn.disabled) return;
      pairings.push({
        left: leftSel.value,
        right: rightSel.value,
        mode: sepSel.value === "|" ? "equal" : "domsub",
      });
      resetDraft();
      renderList();
    });

    listEl.addEventListener("click", (event) => {
      const btn = event.target.closest(".pairing-chip-remove");
      if (!btn) return;
      pairings.splice(Number(btn.getAttribute("data-index")), 1);
      renderList();
    });

    const charPicker = document.querySelector('[data-tax-picker="characters"]');
    charPicker?.querySelector('input[type="hidden"]')?.addEventListener("change", refreshOptions);

    renderList();
    refreshOptions();
    return { refreshOptions };
  }

  const pairingBuilder = document.getElementById("work-pairings-builder");
  if (pairingBuilder) {
    document.addEventListener(
      "taxonomy:ready",
      () => {
        initPairingBuilder(pairingBuilder);
      },
      { once: true }
    );
  }

  const CHAPTER_GRIP = `<button type="button" class="work-chapter-grip" aria-label="Перетащить главу"><svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true"><circle cx="2" cy="2" r="1.4"/><circle cx="8" cy="2" r="1.4"/><circle cx="2" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="2" cy="14" r="1.4"/><circle cx="8" cy="14" r="1.4"/></svg></button>`;

  function editorHref() {
    const editorPage = document.getElementById("studio-type")?.value === "linear" ? "editor-linear.html" : "editor.html";
    return workId ? `${editorPage}?id=${encodeURIComponent(workId)}` : editorPage;
  }

  function chapterActionsHTML(href) {
    return `<div class="work-chapter-actions">
      <a href="${href}" class="work-chapter-edit" aria-label="Редактировать главу"><img src="assets/svg/редактировать.svg" alt=""></a>
      <button type="button" class="work-chapter-delete" aria-label="Удалить главу"><img src="assets/svg/delete.svg" alt=""></button>
    </div>`;
  }

  function chapterAfterElement(container, y) {
    const items = [...container.querySelectorAll(".work-chapter:not(.is-dragging)")];
    return items.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: child };
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
  }

  function renumberChapters(list) {
    [...list.querySelectorAll(".work-chapter")].forEach((item, index) => {
      const title = item.querySelector(".work-chapter-title strong");
      if (!title) return;
      title.textContent = title.textContent.replace(/^Глава\s+\d+/, `Глава ${index + 1}`);
    });
  }

  function bindChapterSort(list) {
    if (!list || list.dataset.sortBound === "1") return;
    list.dataset.sortBound = "1";
    let dragging = null;
    list.addEventListener("pointerdown", (event) => {
      const grip = event.target.closest(".work-chapter-grip");
      if (!grip) return;
      event.preventDefault();
      dragging = grip.closest(".work-chapter");
      if (!dragging) return;
      dragging.classList.add("is-dragging");
      grip.setPointerCapture(event.pointerId);
    });
    list.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const after = chapterAfterElement(list, event.clientY);
      if (after) list.insertBefore(dragging, after);
      else list.appendChild(dragging);
    });
    function endDrag() {
      if (!dragging) return;
      dragging.classList.remove("is-dragging");
      dragging = null;
      renumberChapters(list);
    }
    list.addEventListener("pointerup", endDrag);
    list.addEventListener("pointercancel", endDrag);
  }

  const chapterList = document.getElementById("work-chapters");
  bindChapterSort(chapterList);
  chapterList?.addEventListener("click", (event) => {
    const remove = event.target.closest(".work-chapter-delete");
    if (!remove) return;
    event.preventDefault();
    const item = remove.closest(".work-chapter");
    if (!item || !chapterList) return;
    item.remove();
    renumberChapters(chapterList);
  });

  document.getElementById("add-chapter")?.addEventListener("click", () => {
    const list = document.getElementById("work-chapters");
    if (!list) return;
    const n = list.children.length + 1;
    const href = editorHref();
    const item = document.createElement("li");
    item.className = "work-chapter";
    item.innerHTML = `
      ${CHAPTER_GRIP}
      <div>
        <a href="${href}" class="work-chapter-title"><strong>Глава ${n} · Без названия</strong></a>
        <span>не начата</span>
      </div>
      <span class="work-chapter-status">Черновик</span>
      ${chapterActionsHTML(href)}`;
    list.appendChild(item);
  });

  document.getElementById("add-character")?.addEventListener("click", () => {
    const layout = document.querySelector(".char-layout");
    if (!layout) return;
    const card = document.createElement("article");
    card.className = "studio-card char-card";
    card.innerHTML = `
      <h3>Новый персонаж</h3>
      <p class="muted">Черновик</p>
      <p>Краткое описание, черты и заметки — только для вас.</p>`;
    layout.appendChild(card);
  });

  const COVER_KEY = "foxtoria-work-cover";
  const DEFAULT_COVER = "assets/test/cover-1.png";

  function applyCover(src) {
    document.querySelectorAll("[data-work-cover]").forEach((img) => {
      img.src = src;
    });
  }

  try {
    applyCover(localStorage.getItem(COVER_KEY) || DEFAULT_COVER);
  } catch {
    applyCover(DEFAULT_COVER);
  }

  document.getElementById("work-cover-input")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      try {
        localStorage.setItem(COVER_KEY, data);
      } catch {
        /* ignore quota */
      }
      applyCover(data);
    };
    reader.readAsDataURL(file);
  });
})();

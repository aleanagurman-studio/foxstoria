(function studioCabinet() {
  const views = document.querySelectorAll(".studio-view");
  const navButtons = document.querySelectorAll(".studio-nav [data-view]");
  const typeButtons = document.querySelectorAll(".studio-type-btn");
  const interactive = document.getElementById("timeline-interactive");
  const linear = document.getElementById("timeline-linear");
  const timelineLead = document.getElementById("timeline-lead");
  const publicPage = document.getElementById("studio-public-page");
  const openEditor = document.getElementById("studio-open-editor");
  const editorLead = document.getElementById("studio-editor-lead");

  function showView(name) {
    views.forEach((view) => {
      view.hidden = view.id !== `view-${name}`;
    });
    document.querySelectorAll(".studio-nav .studio-item[data-view]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-view") === name);
    });
  }

  function applyStoryType(isLinear) {
    const editorHref = isLinear ? "editor-linear.html" : "editor.html";
    if (openEditor) openEditor.href = editorHref;
    if (editorLead) {
      editorLead.textContent = isLinear
        ? "Главы идут по порядку — один текст, картинки в любых местах. Хронология и персонажи остаются в кабинете."
        : "Главы и сцены — это то, что пойдёт в публикацию. Хронология и персонажи живут рядом, но остаются в кабинете.";
    }
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

  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      typeButtons.forEach((other) => other.classList.remove("active"));
      btn.classList.add("active");
      applyStoryType(btn.getAttribute("data-type") === "linear");
      refreshSize();
    });
  });

  const initialLinear = document.querySelector(".studio-type-btn[data-type='linear']")?.classList.contains("active");
  applyStoryType(initialLinear);
  showView("editor");

  const form = document.getElementById("work-card-form");
  const sizeBox = document.getElementById("work-size");

  function chapterCount() {
    const isLinear = document.querySelector(".studio-type-btn[data-type='linear']")?.classList.contains("active");
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
})();

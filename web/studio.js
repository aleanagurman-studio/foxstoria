(async function studioCabinet() {
  const views = document.querySelectorAll(".studio-view");
  const navButtons = document.querySelectorAll(".studio-nav [data-view]");
  const typeSelects = () => [...document.querySelectorAll("[data-story-type]")];
  const interactive = document.getElementById("timeline-interactive");
  const linear = document.getElementById("timeline-linear");
  const timelineLead = document.getElementById("timeline-lead");
  const publicPage = document.getElementById("studio-public-page");
  const continueBtn = document.getElementById("studio-continue");
  const resumePlace = document.getElementById("studio-resume-place");
  const addChronoBars = [...document.querySelectorAll("[data-chrono-add-bar]")];
  const chronoHelp = document.getElementById("chrono-help");
  const chronoHelpInteractive = document.getElementById("chrono-help-interactive");

  const workId = new URLSearchParams(location.search).get("id") || "";
  if (!workId) {
    location.replace("work-new.html");
    return;
  }
  if (window.FoxWorks) {
    await FoxWorks.hydrate();
    if (!FoxWorks.get(workId)) await FoxWorks.fetchOne(workId);
    if (!FoxWorks.get(workId)) {
      location.replace("author-home.html");
      return;
    }
  }

  const WORK_STATUS_LABELS = {
    draft: "Черновик",
    in_progress: "В процессе",
    completed: "Завершена",
  };

  function applyWorkStatus(status) {
    if (!status || !WORK_STATUS_LABELS[status]) return;
    const select = document.getElementById("work-status");
    if (select) select.value = status;
    const badge = document.querySelector(".work-dash-badge");
    if (badge) badge.textContent = WORK_STATUS_LABELS[status];
  }

  if (workId && window.FoxWorks) FoxWorks.remember(workId);
  if (workId && window.FoxWorkStatus) {
    applyWorkStatus(FoxWorkStatus.get(workId));
  }

  document.getElementById("work-status")?.addEventListener("change", (event) => {
    const status = event.target.value;
    const key = workId;
    if (window.FoxWorkStatus && key) FoxWorkStatus.set(key, status);
    applyWorkStatus(status);
  });

  const charModalApi = { close() {} };

  function showView(name) {
    views.forEach((view) => {
      view.hidden = view.id !== `view-${name}`;
    });
    document.querySelectorAll(".studio-nav .studio-item[data-view]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-view") === name);
    });
    charModalApi.close();
  }

  function applyStoryType(typeValue) {
    const type = window.FoxWorks ? FoxWorks.normalizeStoryType(typeValue) : typeValue === "linear" || typeValue === "messenger" ? typeValue : "interactive";
    const chapterBased = type === "linear" || type === "messenger";
    const urls = window.FoxWorks ? FoxWorks.urls({ id: workId, story_type: type }) : null;
    const editorHref = urls ? urls.editor : type === "linear" ? "editor-linear.html" : type === "messenger" ? "editor-messenger.html" : "editor.html";
    if (continueBtn) continueBtn.href = editorHref;
    document.querySelectorAll(".work-chapter-title, .work-chapter-edit").forEach((link) => {
      link.href = editorHref;
    });
    document.querySelectorAll(".review-chapter").forEach((link) => {
      const ch = link.getAttribute("data-chapter") || "";
      const readHref = urls ? urls.read : type === "linear" ? "read-linear.html" : type === "messenger" ? "read-messenger.html" : "read-interactive.html";
      link.href = ch ? `${readHref}${readHref.includes("?") ? "&" : "?"}chapter=${encodeURIComponent(ch)}` : readHref;
    });
    if (resumePlace) {
      resumePlace.textContent =
        type === "linear" ? "Глава 2 · Ветки" : type === "messenger" ? "Глава 1 · скрин 1" : "Глава 2 · Сцена 4 · Перекрёсток";
    }
    const scenes = document.querySelector("[data-studio-scenes]");
    if (scenes) scenes.hidden = chapterBased;
    document.querySelectorAll(".work-chapter-scenes").forEach((el) => {
      el.hidden = chapterBased;
    });
    if (interactive) interactive.hidden = chapterBased;
    if (linear) linear.hidden = !chapterBased;
    addChronoBars.forEach((bar) => {
      const caret = bar.querySelector(".chrono-add-caret");
      const menu = bar.querySelector(".chrono-add-menu");
      if (caret) {
        caret.hidden = chapterBased;
        caret.setAttribute("aria-expanded", "false");
      }
      if (menu) menu.hidden = true;
      bar.classList.remove("is-open");
    });
    if (chronoHelp) chronoHelp.hidden = !chapterBased;
    if (chronoHelpInteractive) chronoHelpInteractive.hidden = chapterBased;
    if (timelineLead) {
      timelineLead.hidden = chapterBased;
      if (type === "interactive") {
        timelineLead.textContent = "Интерактивная история — это история с выбором. Выстраивайте события и развилки, чтобы видеть все возможные пути.";
      }
    }
    if (publicPage) {
      publicPage.href = urls ? urls.public : "story.html";
    }
  }

  navButtons.forEach((btn) => {
    if (btn.tagName === "A") return;
    btn.addEventListener("click", () => showView(btn.getAttribute("data-view")));
  });

  document.querySelector(".work-dash-edit")?.addEventListener("click", () => showView("settings"));
  document.querySelector("[data-open-cover]")?.addEventListener("click", () => showView("settings"));

  function storyTypeValue() {
    return typeSelects().find((el) => el.value)?.value || "interactive";
  }

  function persistStoryType(type) {
    if (!window.FoxWorks || !workId) return;
    const existing = FoxWorks.get(workId);
    if (!existing) return;
    if (window.FoxPay && !FoxPay.canEditCard(existing)) return;
    if (FoxWorks.normalizeStoryType(existing.story_type) === type) return;
    existing.story_type = type;
    FoxWorks.upsert(existing);
  }

  function setStoryType(value, persist) {
    const next = window.FoxWorks ? FoxWorks.normalizeStoryType(value) : value === "linear" || value === "messenger" ? value : "interactive";
    typeSelects().forEach((el) => {
      el.value = next;
    });
    applyStoryType(next);
    if (persist) persistStoryType(next);
  }

  document.addEventListener("change", (event) => {
    if (event.target.matches?.("[data-story-type]")) setStoryType(event.target.value, true);
  });

  applyStoryType(storyTypeValue());
  showView("work");

  fetch("works.json", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      initUserPickers(data);
      const work = (window.FoxWorks && FoxWorks.get(workId)) || (data?.works || []).find((item) => item.id === workId);
      if (!work) return;
      fillStudioWork(work);
    })
    .catch(() => {
      initUserPickers(null);
      const work = window.FoxWorks && FoxWorks.get(workId);
      if (work) fillStudioWork(work);
    });

  function fillStudioWork(work) {
    const titleEl = document.querySelector(".work-dash-title h2");
    if (titleEl) titleEl.textContent = work.title || "Без названия";
    document.querySelectorAll("[data-work-cover]").forEach((img) => {
      if (work.cover) img.src = work.cover;
    });
    const titleInput = document.getElementById("work-title");
    if (titleInput) titleInput.value = work.title || "";
    const desc = document.getElementById("work-desc");
    if (desc) desc.value = work.description || "";
    const notes = document.getElementById("work-notes");
    if (notes) notes.value = work.author_notes || "";
    const paid = document.getElementById("work-paid");
    if (paid) paid.checked = Boolean(work.paid);
    if (window.FoxPay) {
      const handle = work.author_slug || (typeof ownerHandle === "function" ? ownerHandle() : "");
      FoxPay.fillLevelSelect(document.getElementById("work-paid-level"), handle, work.paid_min_level);
      FoxPay.bindPaidFields(document.getElementById("work-card-form"), handle);
      const canCard = FoxPay.canEditCard(work);
      const lockNote = document.getElementById("studio-card-lock");
      if (lockNote) lockNote.hidden = canCard;
      const cardForm = document.getElementById("work-card-form");
      if (cardForm) {
        if (canCard) cardForm.removeAttribute("data-card-locked");
        else cardForm.setAttribute("data-card-locked", "");
      }
      document.getElementById("studio-type")?.toggleAttribute("disabled", !canCard);
    }
    setStoryType(work.story_type);
    const storedStatus = window.FoxWorkStatus ? FoxWorkStatus.get(work.id) : "";
    applyWorkStatus(storedStatus || work.status || (work.is_completed ? "completed" : "draft"));
    const idLine = document.querySelector(".work-dash-id");
    if (idLine) idLine.textContent = `ID: #${work.id}`;
    applyStoryType(work.story_type);
    if (publicPage) publicPage.href = window.FoxWorks ? FoxWorks.urls(work).public : work.href || publicPage.href;
    document.title = `${work.title || "История"} — кабинет — FoxStoria`;
    const romance = document.getElementById("work-romance");
    if (romance && work.romance) romance.value = work.romance;
    if (work.age) {
      const age = document.querySelector(`[name="age"][value="${work.age}"]`);
      if (age) age.checked = true;
    }
    const updated = document.querySelector(".work-dash-updated");
    if (updated && work.updatedAt) {
      const date = new Date(work.updatedAt);
      if (!Number.isNaN(date.getTime())) updated.textContent = date.toLocaleString("ru-RU");
    }
    const pairHidden = document.getElementById("work-pairings-value");
    if (pairHidden) pairHidden.value = work.pairings || "";
    const applyPickers = () => {
      document.querySelector('[data-tax-picker="genres"]')?.taxSet?.(work.genres);
      document.querySelector('[data-tax-picker="formats"]')?.taxSet?.(work.formats);
      document.querySelector('[data-tax-picker="warnings"]')?.taxSet?.(work.warnings);
      document.querySelector('[data-tax-picker="kinks"]')?.taxSet?.(work.kinks);
      document.querySelector('[data-tax-picker="fandoms"]')?.taxSet?.(work.fandoms);
      document.querySelector('[data-tax-picker="characters"]')?.taxSet?.(work.characters, work.character_names);
      document.getElementById("work-pairings-builder")?.reloadPairings?.();
    };
    applyPickers();
    document.addEventListener("taxonomy:ready", applyPickers, { once: true });
  }

  const form = document.getElementById("work-card-form");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!window.FoxWorks) return;
    const existing = FoxWorks.get(workId) || { id: workId };
    if (window.FoxPay && !FoxPay.canEditCard(existing)) return;
    const preview = document.getElementById("work-cover-preview");
    if (preview?.src && preview.src.startsWith("data:")) existing.cover = preview.src;
    const work = FoxWorks.fromForm(form, existing);
    const saved = await FoxWorks.upsert(work);
    if (window.FoxPay && FoxPay.nick(saved.author_slug) !== FoxPay.nick(typeof ownerHandle === "function" ? ownerHandle() : "")) {
      FoxPay.logCardChange(saved, "Соавтор обновил карточку работы.");
    }
    fillStudioWork(saved);
  });

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function initUserPickers(data) {
    const extraUsers = [];
    const selfKeys = new Set(["лунный странник", "moonwander"]);
    const seen = new Set();
    const users = [...(data?.authors || []), ...extraUsers].filter((user) => {
      const slug = String(user.slug || "").toLowerCase();
      const name = String(user.display_name || user.name || "").toLowerCase();
      const key = slug || name;
      if (!key || seen.has(key) || selfKeys.has(slug) || selfKeys.has(name)) return false;
      seen.add(key);
      return true;
    });

    function matchesUser(user, query) {
      const q = query.trim().toLowerCase().replace(/^@/, "");
      if (!q) return true;
      const name = String(user.display_name || user.name || "").toLowerCase();
      const slug = String(user.slug || "").toLowerCase();
      return name.includes(q) || slug.includes(q);
    }

    document.querySelectorAll("[data-user-picker]").forEach((root) => {
      const search = root.querySelector(".user-pick-search");
      const menu = root.querySelector(".user-pick-menu");
      const chips = root.querySelector(".user-pick-chips");
      const hidden = root.querySelector('input[type="hidden"]');
      if (!search || !menu || !chips || !hidden) return;
      const selected = new Map();

      function syncHidden() {
        hidden.value = [...selected.keys()].join(",");
      }

      function renderChips() {
        chips.innerHTML = [...selected.values()]
          .map(
            (user) => `
            <span class="user-pick-chip">
              <a href="profile.html" class="user-pick-link">
                <img src="${escapeHtml(user.avatar || "assets/test/avatar-3.png")}" alt="">
                <span>${escapeHtml(user.display_name || user.name)}</span>
              </a>
              <button type="button" class="user-pick-remove" data-slug="${escapeHtml(user.slug)}" aria-label="Убрать">×</button>
            </span>`
          )
          .join("");
        chips.hidden = selected.size === 0;
        syncHidden();
      }

      function renderMenu(query) {
        const available = users.filter((user) => !selected.has(user.slug) && matchesUser(user, query)).slice(0, 12);
        menu.hidden = false;
        if (!available.length) {
          menu.innerHTML = `<p class="tax-check-empty">${query.trim() ? "Никого не найдено" : "Начните вводить ник"}</p>`;
          return;
        }
        menu.innerHTML = available
          .map(
            (user) => `
            <button type="button" class="user-pick-option" data-slug="${escapeHtml(user.slug)}">
              <img src="${escapeHtml(user.avatar || "assets/test/avatar-3.png")}" alt="">
              <span>
                <b>${escapeHtml(user.display_name || user.name)}</b>
                <small>@${escapeHtml(user.slug)}</small>
              </span>
            </button>`
          )
          .join("");
      }

      function add(slug) {
        const user = users.find((item) => item.slug === slug);
        if (!user || selected.has(user.slug)) return;
        selected.set(user.slug, user);
        search.value = "";
        renderChips();
        renderMenu("");
      }

      search.addEventListener("focus", () => renderMenu(search.value));
      search.addEventListener("input", () => renderMenu(search.value));
      search.addEventListener("keydown", (event) => {
        if (event.key === "Escape") menu.hidden = true;
        if (event.key !== "Enter") return;
        event.preventDefault();
        const first = menu.querySelector(".user-pick-option");
        if (first) add(first.getAttribute("data-slug"));
      });
      menu.addEventListener("click", (event) => {
        const option = event.target.closest(".user-pick-option");
        if (option) add(option.getAttribute("data-slug"));
      });
      chips.addEventListener("click", (event) => {
        const btn = event.target.closest(".user-pick-remove");
        if (!btn) return;
        selected.delete(btn.getAttribute("data-slug"));
        renderChips();
        if (document.activeElement === search) renderMenu(search.value);
      });
      document.addEventListener("click", (event) => {
        if (!root.contains(event.target)) menu.hidden = true;
      });
      renderChips();
    });
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

  const CHAPTER_GRIP = `<button type="button" class="work-chapter-grip" aria-label="Перетащить главу"><svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true"><circle cx="2" cy="2" r="1.4"/><circle cx="8" cy="2" r="1.4"/><circle cx="2" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="2" cy="14" r="1.4"/><circle cx="8" cy="14" r="1.4"/></svg></button>`;

  function editorHref() {
    if (window.FoxWorks) return FoxWorks.urls({ id: workId, story_type: storyTypeValue() }).editor;
    const type = storyTypeValue();
    const editorPage = type === "linear" ? "editor-linear.html" : type === "messenger" ? "editor-messenger.html" : "editor.html";
    return workId ? `${editorPage}?id=${encodeURIComponent(workId)}` : editorPage;
  }

  function chapterActionsHTML(href) {
    return `<div class="work-chapter-actions">
      <a href="${href}" class="work-chapter-edit" aria-label="Редактировать главу"><img src="assets/svg/редактировать.svg" alt=""></a>
      <button type="button" class="work-chapter-delete" aria-label="Удалить главу"><img src="assets/svg/удалить.svg" alt=""></button>
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
    if (!window.confirm("Удалить главу? После подтверждения её не вернуть.")) return;
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

  const CHRONO_CHEVRON = `<svg class="chrono-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 6.2 8 10.5l4.5-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const CHRONO_GRIP = `<button type="button" class="chrono-grip" aria-label="Перетащить событие"><svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true"><circle cx="2" cy="2" r="1.4"/><circle cx="8" cy="2" r="1.4"/><circle cx="2" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="2" cy="14" r="1.4"/><circle cx="8" cy="14" r="1.4"/></svg></button>`;

  function chronoCardHTML(title, text) {
    const safeTitle = String(title || "").replace(/"/g, "&quot;");
    const safeText = String(text || "");
    return `
      <div class="chrono-card">
        <div class="chrono-card-head">
          <input type="text" class="chrono-title" value="${safeTitle}" readonly>
          <div class="chrono-card-actions">
            ${CHRONO_GRIP}
            <button type="button" class="chrono-edit" aria-label="Редактировать событие"><img src="assets/svg/редактировать.svg" alt=""></button>
            <button type="button" class="chrono-delete" aria-label="Удалить событие"><img src="assets/svg/удалить.svg" alt=""></button>
          </div>
        </div>
        <textarea class="chrono-text" rows="2" readonly placeholder="Краткое содержание события, сцены или ключевые моменты...">${safeText}</textarea>
        <div class="chrono-card-foot">
          <button type="button" class="btn btn-primary chrono-save">Сохранить</button>
        </div>
      </div>`;
  }

  function chronoEventHTML(n, title) {
    return `<span class="chrono-num">${n}</span>${chronoCardHTML(title, "")}`;
  }

  function makeChronoNode(title, text) {
    const node = document.createElement("article");
    node.className = "chrono-node";
    node.innerHTML = `
      <div class="chrono-event">
        <button type="button" class="chrono-fold is-empty" aria-label="Свернуть ветку" aria-expanded="true">${CHRONO_CHEVRON}</button>
        ${chronoCardHTML(title, text)}
      </div>
      <div class="chrono-kids" hidden></div>`;
    return node;
  }

  function nodeKids(node) {
    return node?.querySelector(":scope > .chrono-kids") || null;
  }

  function syncFold(node) {
    if (!node) return;
    const kids = nodeKids(node);
    const fold = node.querySelector(":scope > .chrono-event .chrono-fold");
    const hasKids = Boolean(kids && kids.querySelector(":scope > .chrono-node"));
    if (kids) kids.hidden = !hasKids || node.classList.contains("is-collapsed");
    if (!fold) return;
    fold.classList.toggle("is-empty", !hasKids);
    const collapsed = node.classList.contains("is-collapsed");
    fold.setAttribute("aria-expanded", collapsed ? "false" : "true");
    fold.setAttribute("aria-label", collapsed ? "Развернуть ветку" : "Свернуть ветку");
  }

  function parentListOf(node) {
    const parent = node?.parentElement;
    if (parent && (parent.classList.contains("chrono-kids") || parent.classList.contains("chrono-tree"))) return parent;
    return null;
  }

  function selectedChronoNode() {
    return interactive?.querySelector(".chrono-node.is-selected") || null;
  }

  function selectChronoNode(node) {
    interactive?.querySelectorAll(".chrono-node.is-selected").forEach((item) => {
      item.classList.remove("is-selected");
    });
    node?.classList.add("is-selected");
  }

  function closeChronoAddMenus() {
    addChronoBars.forEach((bar) => {
      const menu = bar.querySelector(".chrono-add-menu");
      const caret = bar.querySelector(".chrono-add-caret");
      if (menu) menu.hidden = true;
      if (caret) caret.setAttribute("aria-expanded", "false");
      bar.classList.remove("is-open");
    });
  }

  function toggleChronoAddMenu(bar) {
    const menu = bar?.querySelector(".chrono-add-menu");
    const caret = bar?.querySelector(".chrono-add-caret");
    if (!menu) return;
    const open = menu.hidden;
    closeChronoAddMenus();
    if (!open) return;
    menu.hidden = false;
    if (caret) caret.setAttribute("aria-expanded", "true");
    bar.classList.add("is-open");
  }

  function addLinearEvent() {
    if (!chronoList) return;
    const n = chronoList.querySelectorAll(".chrono-event").length + 1;
    const item = document.createElement("article");
    item.className = "chrono-event";
    item.innerHTML = chronoEventHTML(n, "Новое событие");
    chronoList.appendChild(item);
    openItemModal(item.querySelector(".chrono-card"));
  }

  function addInteractiveNode(mode) {
    if (!interactive) return;
    const selected = selectedChronoNode();
    const node = makeChronoNode("Новое событие", "");
    if (mode === "child") {
      const parent = selected || interactive.querySelector(":scope > .chrono-node:last-child") || null;
      if (!parent) {
        interactive.appendChild(node);
      } else {
        const kids = nodeKids(parent);
        kids.hidden = false;
        kids.appendChild(node);
        parent.classList.remove("is-collapsed");
        syncFold(parent);
      }
    } else if (selected) {
      const list = parentListOf(selected) || interactive;
      selected.after(node);
    } else {
      interactive.appendChild(node);
    }
    syncFold(node);
    selectChronoNode(node);
    openItemModal(node.querySelector(".chrono-card"));
  }

  function startChronoEdit(card) {
    const title = card?.querySelector(".chrono-title");
    const text = card?.querySelector(".chrono-text");
    if (!card || !title || !text) return;
    card.classList.add("is-editing");
    title.readOnly = false;
    text.readOnly = false;
    title.focus();
    title.select();
  }

  function stopChronoEdit(card) {
    const title = card?.querySelector(".chrono-title");
    const text = card?.querySelector(".chrono-text");
    if (!card || !title || !text) return;
    title.readOnly = true;
    text.readOnly = true;
    card.classList.remove("is-editing");
  }

  const itemModal = document.getElementById("studio-item-modal");
  const itemFrame = document.getElementById("studio-item-modal-frame");
  const studioMain = document.querySelector(".studio-main");
  let itemSlot = null;

  function startItemFields(item) {
    if (!item) return;
    if (item.classList.contains("char-card")) startCharEditFields(item);
    else if (item.classList.contains("note-card")) startNoteEdit(item);
    else if (item.classList.contains("chrono-card")) startChronoEdit(item);
  }

  function stopItemFields(item) {
    if (!item) return;
    if (item.classList.contains("char-card")) stopCharEdit(item);
    else if (item.classList.contains("note-card")) stopNoteEdit(item);
    else if (item.classList.contains("chrono-card")) stopChronoEdit(item);
  }

  function hideItemModalShell() {
    itemSlot = null;
    if (itemModal) {
      itemModal.hidden = true;
      itemModal.classList.remove("is-editing");
    }
    studioMain?.classList.remove("item-modal-open");
  }

  function closeItemModal() {
    const item = itemFrame?.firstElementChild;
    if (item) {
      stopItemFields(item);
      if (itemSlot?.parentNode) itemSlot.replaceWith(item);
      else if (item.classList.contains("char-card")) document.getElementById("char-layout")?.appendChild(item);
      else if (item.classList.contains("note-card")) document.getElementById("notes-list")?.appendChild(item);
    } else {
      itemSlot?.remove();
    }
    hideItemModalShell();
    persistWorkLibrary();
  }

  function discardItemModal() {
    itemFrame?.replaceChildren();
    itemSlot?.remove();
    hideItemModalShell();
    persistWorkLibrary();
  }

  charModalApi.close = closeItemModal;

  function openItemModal(item) {
    if (!item || !itemModal || !itemFrame) return;
    if (item.parentElement === itemFrame) {
      itemModal.classList.add("is-editing");
      startItemFields(item);
      return;
    }
    closeItemModal();
    itemSlot = document.createElement("div");
    itemSlot.className = item.classList.contains("char-card") ? "char-card-slot" : "item-slot";
    itemSlot.style.minHeight = `${Math.round(item.getBoundingClientRect().height)}px`;
    item.after(itemSlot);
    itemFrame.appendChild(item);
    itemModal.hidden = false;
    itemModal.classList.add("is-editing");
    studioMain?.classList.add("item-modal-open");
    startItemFields(item);
  }

  function renumberChrono(list) {
    [...list.querySelectorAll(".chrono-event")].forEach((item, index) => {
      const num = item.querySelector(".chrono-num");
      if (num) num.textContent = String(index + 1);
    });
  }

  function bindChronoSort(root, itemSelector) {
    if (!root || root.dataset.sortBound === "1") return;
    root.dataset.sortBound = "1";
    let dragging = null;
    let list = null;
    root.addEventListener("pointerdown", (event) => {
      const grip = event.target.closest(".chrono-grip, .note-grip");
      if (!grip || !root.contains(grip)) return;
      event.preventDefault();
      dragging = grip.closest(itemSelector);
      list = dragging ? parentListOf(dragging) || root : null;
      if (!dragging || !list) return;
      dragging.classList.add("is-dragging");
      grip.setPointerCapture(event.pointerId);
    });
    root.addEventListener("pointermove", (event) => {
      if (!dragging || !list) return;
      const items = [...list.children].filter((child) => child.matches(itemSelector) && child !== dragging);
      const after = items.reduce(
        (closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = event.clientY - box.top - box.height / 2;
          if (offset < 0 && offset > closest.offset) return { offset, element: child };
          return closest;
        },
        { offset: Number.NEGATIVE_INFINITY, element: null }
      ).element;
      if (after) list.insertBefore(dragging, after);
      else list.appendChild(dragging);
    });
    function endDrag() {
      if (!dragging) return;
      dragging.classList.remove("is-dragging");
      dragging = null;
      list = null;
      if (itemSelector === ".chrono-event") renumberChrono(root);
    }
    root.addEventListener("pointerup", endDrag);
    root.addEventListener("pointercancel", endDrag);
  }

  function handleChronoCardClick(event, listRoot, onRemove) {
    const save = event.target.closest(".chrono-save");
    if (save) {
      stopChronoEdit(save.closest(".chrono-card"));
      closeItemModal();
      return true;
    }
    const edit = event.target.closest(".chrono-edit");
    if (edit) {
      openItemModal(edit.closest(".chrono-card"));
      return true;
    }
    const remove = event.target.closest(".chrono-delete");
    if (!remove) return false;
    const card = remove.closest(".chrono-card");
    if (card?.parentElement === itemFrame) {
      const host = itemSlot?.closest(".chrono-node") || itemSlot?.closest(".chrono-event");
      discardItemModal();
      host?.remove();
      if (listRoot?.id === "timeline-linear" || listRoot?.classList.contains("chrono-list")) {
        renumberChrono(listRoot);
      }
      return true;
    }
    const item = onRemove(remove);
    if (!item || !listRoot) return true;
    item.remove();
    return true;
  }

  const chronoList = document.getElementById("timeline-linear");
  bindChronoSort(chronoList, ".chrono-event");
  chronoList?.addEventListener("click", (event) => {
    handleChronoCardClick(event, chronoList, (remove) => remove.closest(".chrono-event"));
    if (event.target.closest(".chrono-delete")) renumberChrono(chronoList);
  });

  bindChronoSort(interactive, ".chrono-node");
  interactive?.addEventListener("click", (event) => {
    const fold = event.target.closest(".chrono-fold");
    if (fold && !fold.classList.contains("is-empty")) {
      const node = fold.closest(".chrono-node");
      node.classList.toggle("is-collapsed");
      syncFold(node);
      return;
    }
    if (handleChronoCardClick(event, interactive, (remove) => {
      const node = remove.closest(".chrono-node");
      const parent = node?.parentElement?.closest(".chrono-node") || null;
      node?.remove();
      if (parent) syncFold(parent);
      return null;
    })) return;
    const node = event.target.closest(".chrono-node");
    if (node) selectChronoNode(node);
  });

  function seedInteractiveTree() {
    if (!interactive || interactive.dataset.seeded === "1") return;
    interactive.dataset.seeded = "1";
    const root = makeChronoNode("Начало пути", "Конверт без марки. Утро, с которого всё начинается.");
    const cafe = makeChronoNode("Неожиданная встреча", "Адрес, которого нет. День путает следы.");
    const park = makeChronoNode("Последняя строка", "Вечер. Последняя строка письма.");
    const rootKids = nodeKids(root);
    rootKids.hidden = false;
    rootKids.append(cafe, park);
    nodeKids(cafe).hidden = false;
    nodeKids(cafe).append(
      makeChronoNode("Кафе", "Разговор с Машей."),
      makeChronoNode("Правда о прошлом", "Письмо, которое нельзя отправить.")
    );
    nodeKids(park).hidden = false;
    nodeKids(park).append(
      makeChronoNode("Книга на лавке", "Имя на форзаце."),
      makeChronoNode("Уход без ответа", "Дождь не спрашивает.")
    );
    interactive.appendChild(root);
    interactive.querySelectorAll(".chrono-node").forEach(syncFold);
    selectChronoNode(root);
  }
  seedInteractiveTree();

  function isLinearStory() {
    return storyTypeValue() === "linear";
  }

  addChronoBars.forEach((bar) => {
    bar.querySelector(".chrono-add-main")?.addEventListener("click", () => {
      if (isLinearStory()) {
        addLinearEvent();
        return;
      }
      toggleChronoAddMenu(bar);
    });
    bar.querySelector(".chrono-add-caret")?.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleChronoAddMenu(bar);
    });
    bar.querySelector(".chrono-add-menu")?.addEventListener("click", (event) => {
      const choice = event.target.closest("[role='menuitem']");
      if (!choice) return;
      addInteractiveNode(choice.getAttribute("data-chrono-add"));
      closeChronoAddMenus();
    });
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-chrono-add-bar]")) return;
    closeChronoAddMenus();
  });

  function charCardInnerHTML(name, age, bio, traits) {
    const safe = (value) => String(value || "").replace(/"/g, "&quot;");
    const text = (value) => String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `
      <div class="char-card-head">
        <input type="text" class="char-name" value="${safe(name)}" readonly>
        <div class="char-card-actions">
          <button type="button" class="char-edit" aria-label="Редактировать персонажа"><img src="assets/svg/редактировать.svg" alt=""></button>
          <div class="char-menu">
            <button type="button" class="char-menu-btn" aria-label="Ещё" aria-expanded="false"><img src="assets/ornaments/03_more.svg?v=3" alt=""></button>
            <div class="char-menu-dd" hidden>
              <button type="button" data-char-act="pin"><img src="assets/svg/кнопка.svg" alt=""> Закрепить</button>
              <button type="button" class="is-danger" data-char-act="delete"><img src="assets/svg/удалить.svg" alt=""> Удалить</button>
            </div>
          </div>
        </div>
      </div>
      <dl class="char-facts">
        <div>
          <img src="assets/deco/календарь.svg" alt="">
          <div><dt>Возраст</dt><dd><textarea class="char-age" rows="1" placeholder="—" readonly>${text(age)}</textarea></dd></div>
        </div>
        <div>
          <img src="assets/svg/заметки.svg" alt="">
          <div><dt>Кратко о персонаже</dt><dd><textarea class="char-bio" rows="2" readonly>${text(bio)}</textarea></dd></div>
        </div>
        <div>
          <img src="assets/svg/heart.svg" alt="">
          <div><dt>Черты</dt><dd><textarea class="char-traits" rows="2" readonly>${text(traits)}</textarea></dd></div>
        </div>
      </dl>
      <div class="char-card-foot">
        <button type="button" class="btn btn-primary char-save">Сохранить</button>
      </div>`;
  }

  function charFields(card) {
    return [...card.querySelectorAll(".char-name, .char-age, .char-bio, .char-traits")];
  }

  function startCharEditFields(card) {
    if (!card) return;
    card.classList.add("is-editing");
    charFields(card).forEach((field) => {
      field.readOnly = false;
    });
    card.querySelector(".char-name")?.focus();
    card.querySelector(".char-name")?.select();
  }

  function stopCharEdit(card) {
    if (!card) return;
    charFields(card).forEach((field) => {
      field.readOnly = true;
    });
    card.classList.remove("is-editing");
  }

  function closeCharMenus(except) {
    document.querySelectorAll(".char-menu").forEach((menu) => {
      if (menu === except) return;
      menu.classList.remove("open");
      menu.querySelector(".char-menu-btn")?.setAttribute("aria-expanded", "false");
      const dd = menu.querySelector(".char-menu-dd");
      if (dd) dd.hidden = true;
    });
  }

  function syncCharPinButton(card) {
    const pinned = card.dataset.pinned === "1";
    const btn = card.querySelector("[data-char-act='pin']");
    if (!btn) return;
    btn.innerHTML = `<img src="assets/svg/кнопка.svg" alt=""> ${pinned ? "Открепить" : "Закрепить"}`;
  }

  function applyCharFilters() {
    const layout = document.getElementById("char-layout");
    if (!layout) return;
    const query = (document.getElementById("char-search")?.value || "").trim().toLowerCase();
    const sort = document.getElementById("char-sort")?.value || "name-asc";
    const cards = [...layout.querySelectorAll(".char-card")];
    cards.forEach((card) => {
      const hay = charFields(card).map((field) => field.value).join(" ").toLowerCase();
      card.hidden = Boolean(query) && !hay.includes(query);
    });
    cards.sort((a, b) => {
      const pin = Number(b.dataset.pinned === "1") - Number(a.dataset.pinned === "1");
      if (pin) return pin;
      const nameA = a.querySelector(".char-name")?.value || "";
      const nameB = b.querySelector(".char-name")?.value || "";
      return sort === "name-desc" ? nameB.localeCompare(nameA, "ru") : nameA.localeCompare(nameB, "ru");
    });
    cards.forEach((card) => layout.appendChild(card));
  }

  const charLayout = document.getElementById("char-layout");
  document.getElementById("char-search")?.addEventListener("input", applyCharFilters);
  document.getElementById("char-sort")?.addEventListener("change", applyCharFilters);
  document.querySelector(".chars-view")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-char-view]");
    if (!btn || !charLayout) return;
    const view = btn.getAttribute("data-char-view");
    charLayout.classList.toggle("is-list", view === "list");
    document.querySelectorAll("[data-char-view]").forEach((item) => {
      const on = item === btn;
      item.classList.toggle("is-on", on);
      item.setAttribute("aria-pressed", on ? "true" : "false");
    });
  });
  function handleCharCardClick(event) {
    const menuBtn = event.target.closest(".char-menu-btn");
    if (menuBtn) {
      const menu = menuBtn.closest(".char-menu");
      const dd = menu?.querySelector(".char-menu-dd");
      const open = Boolean(dd?.hidden);
      closeCharMenus(menu);
      if (dd) dd.hidden = !open;
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      return;
    }
    const act = event.target.closest("[data-char-act]");
    if (act) {
      const card = act.closest(".char-card");
      if (!card) return;
      if (act.getAttribute("data-char-act") === "pin") {
        card.dataset.pinned = card.dataset.pinned === "1" ? "0" : "1";
        card.classList.toggle("is-pinned", card.dataset.pinned === "1");
        syncCharPinButton(card);
        applyCharFilters();
      } else if (act.getAttribute("data-char-act") === "delete") {
        if (card.parentElement === itemFrame) discardItemModal();
        else card.remove();
        persistWorkLibrary();
      }
      closeCharMenus();
      return;
    }
    if (event.target.closest(".char-edit")) {
      openItemModal(event.target.closest(".char-card"));
      return;
    }
    if (event.target.closest(".char-save")) {
      stopCharEdit(event.target.closest(".char-card"));
      closeItemModal();
      applyCharFilters();
      persistWorkLibrary();
    }
  }

  charLayout?.addEventListener("click", handleCharCardClick);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && itemModal && !itemModal.hidden) closeItemModal();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".char-menu")) closeCharMenus();
  });

  document.getElementById("add-character")?.addEventListener("click", () => {
    const layout = document.getElementById("char-layout") || document.querySelector(".char-layout");
    if (!layout) return;
    const card = document.createElement("article");
    card.className = "char-card";
    card.dataset.charCard = `new-${Date.now()}`;
    card.dataset.pinned = "0";
    card.innerHTML = charCardInnerHTML("Новый персонаж", "", "", "");
    layout.appendChild(card);
    openItemModal(card);
  });

  const NOTE_GRIP = `<button type="button" class="note-grip" aria-label="Перетащить заметку"><svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true"><circle cx="2" cy="2" r="1.4"/><circle cx="8" cy="2" r="1.4"/><circle cx="2" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="2" cy="14" r="1.4"/><circle cx="8" cy="14" r="1.4"/></svg></button>`;

  function formatNoteCreated(iso) {
    const parts = String(iso || "").split("-");
    if (parts.length !== 3) return "Создана —";
    return `Создана ${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  function todayIso() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function noteCardHTML(title, text, created) {
    const safeTitle = String(title || "").replace(/"/g, "&quot;");
    const safeText = String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `
      ${NOTE_GRIP}
      <div class="note-card-main">
        <div class="note-card-head">
          <input type="text" class="note-title" value="${safeTitle}" readonly>
          <div class="note-card-actions">
            <button type="button" class="note-edit" aria-label="Редактировать заметку"><img src="assets/svg/редактировать.svg" alt=""></button>
            <button type="button" class="note-delete" aria-label="Удалить заметку"><img src="assets/svg/удалить.svg" alt=""></button>
          </div>
        </div>
        <textarea class="note-text" rows="2" readonly placeholder="Текст заметки…">${safeText}</textarea>
        <p class="note-date">${formatNoteCreated(created)}</p>
        <div class="note-card-foot">
          <button type="button" class="btn btn-primary note-save">Сохранить</button>
        </div>
      </div>`;
  }

  function startNoteEdit(card) {
    const title = card?.querySelector(".note-title");
    const text = card?.querySelector(".note-text");
    if (!card || !title || !text) return;
    card.classList.add("is-editing");
    title.readOnly = false;
    text.readOnly = false;
    title.focus();
    title.select();
  }

  function stopNoteEdit(card) {
    const title = card?.querySelector(".note-title");
    const text = card?.querySelector(".note-text");
    if (!card || !title || !text) return;
    title.readOnly = true;
    text.readOnly = true;
    card.classList.remove("is-editing");
  }

  function applyNoteFilters() {
    const layout = document.getElementById("notes-list");
    if (!layout) return;
    const query = (document.getElementById("note-search")?.value || "").trim().toLowerCase();
    const sort = document.getElementById("note-sort")?.value || "created-asc";
    const cards = [...layout.querySelectorAll(".note-card")];
    cards.forEach((card) => {
      const hay = `${card.querySelector(".note-title")?.value || ""} ${card.querySelector(".note-text")?.value || ""}`.toLowerCase();
      card.hidden = Boolean(query) && !hay.includes(query);
    });
    cards.sort((a, b) => {
      const titleA = a.querySelector(".note-title")?.value || "";
      const titleB = b.querySelector(".note-title")?.value || "";
      const dateA = a.dataset.created || "";
      const dateB = b.dataset.created || "";
      if (sort === "title-asc") return titleA.localeCompare(titleB, "ru");
      if (sort === "title-desc") return titleB.localeCompare(titleA, "ru");
      if (sort === "created-desc") return dateB.localeCompare(dateA);
      return dateA.localeCompare(dateB);
    });
    cards.forEach((card) => layout.appendChild(card));
  }

  function persistWorkLibrary() {
    if (!window.FoxLibrary) return;
    FoxLibrary.save({
      characters: [...document.querySelectorAll("#char-layout .char-card")].map((card) => ({
        id: card.dataset.charCard || `char-${Date.now()}`,
        name: card.querySelector(".char-name")?.value || "",
        age: card.querySelector(".char-age")?.value || "",
        bio: card.querySelector(".char-bio")?.value || "",
        traits: card.querySelector(".char-traits")?.value || "",
        pinned: card.dataset.pinned === "1" ? "1" : "0",
      })),
      notes: [...document.querySelectorAll("#notes-list .note-card")].map((card, index) => ({
        id: card.dataset.noteId || `note-${card.dataset.created || index}`,
        title: card.querySelector(".note-title")?.value || "",
        text: card.querySelector(".note-text")?.value || "",
        created: card.dataset.created || "",
      })),
    });
  }

  function hydrateWorkLibrary() {
    if (!window.FoxLibrary) return;
    if (!localStorage.getItem(FoxLibrary.KEY)) {
      persistWorkLibrary();
      return;
    }
    const lib = FoxLibrary.load();
    const charLayout = document.getElementById("char-layout");
    const notesRoot = document.getElementById("notes-list");
    if (charLayout) {
      charLayout.innerHTML = (lib.characters || [])
        .map(
          (person) => `
        <article class="char-card${person.pinned === "1" ? " is-pinned" : ""}" data-char-card="${String(person.id || "").replace(/"/g, "")}" data-pinned="${person.pinned === "1" ? "1" : "0"}">
          ${charCardInnerHTML(person.name, person.age, person.bio, person.traits)}
        </article>`
        )
        .join("");
      charLayout.querySelectorAll(".char-card").forEach((card) => syncCharPinButton(card));
    }
    if (notesRoot) {
      notesRoot.innerHTML = (lib.notes || [])
        .map(
          (note) => `
        <article class="note-card" data-note-id="${String(note.id || "").replace(/"/g, "")}" data-created="${String(note.created || "").replace(/"/g, "")}">
          ${noteCardHTML(note.title, note.text, note.created)}
        </article>`
        )
        .join("");
    }
    applyCharFilters();
    applyNoteFilters();
  }

  const notesList = document.getElementById("notes-list");
  bindChronoSort(notesList, ".note-card");
  document.getElementById("note-search")?.addEventListener("input", applyNoteFilters);
  document.getElementById("note-sort")?.addEventListener("change", applyNoteFilters);
  document.querySelector(".notes-view")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-note-view]");
    if (!btn || !notesList) return;
    const view = btn.getAttribute("data-note-view");
    notesList.classList.toggle("is-list", view === "list");
    document.querySelectorAll("[data-note-view]").forEach((item) => {
      const on = item === btn;
      item.classList.toggle("is-on", on);
      item.setAttribute("aria-pressed", on ? "true" : "false");
    });
  });
  notesList?.addEventListener("click", (event) => {
    if (event.target.closest(".note-edit")) {
      openItemModal(event.target.closest(".note-card"));
      return;
    }
    if (event.target.closest(".note-save")) {
      stopNoteEdit(event.target.closest(".note-card"));
      closeItemModal();
      applyNoteFilters();
      persistWorkLibrary();
      return;
    }
    if (event.target.closest(".note-delete")) {
      const card = event.target.closest(".note-card");
      if (card?.parentElement === itemFrame) discardItemModal();
      else card?.remove();
      persistWorkLibrary();
    }
  });
  document.getElementById("add-note")?.addEventListener("click", () => {
    if (!notesList) return;
    const created = todayIso();
    const card = document.createElement("article");
    card.className = "note-card";
    card.dataset.created = created;
    card.innerHTML = noteCardHTML("Новая заметка", "", created);
    notesList.prepend(card);
    openItemModal(card);
  });
  applyNoteFilters();
  hydrateWorkLibrary();
  window.addEventListener("storage", (event) => {
    if (event.key === FoxLibrary?.KEY) hydrateWorkLibrary();
  });

  itemModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-item-modal-close]")) {
      closeItemModal();
      return;
    }
    const item = itemFrame?.firstElementChild;
    if (!item) return;
    if (item.classList.contains("char-card")) {
      handleCharCardClick(event);
      return;
    }
    if (item.classList.contains("note-card")) {
      if (event.target.closest(".note-edit")) {
        openItemModal(item);
        return;
      }
      if (event.target.closest(".note-save")) {
        stopNoteEdit(item);
        closeItemModal();
        applyNoteFilters();
        persistWorkLibrary();
        return;
      }
      if (event.target.closest(".note-delete")) discardItemModal();
      return;
    }
    if (item.classList.contains("chrono-card")) {
      const listRoot = itemSlot?.closest(".chrono-tree") || itemSlot?.closest(".chrono-list") || chronoList;
      handleChronoCardClick(event, listRoot, () => itemSlot?.closest(".chrono-node") || itemSlot?.closest(".chrono-event"));
    }
  });

  const reviewLayout = document.getElementById("review-layout");
  function closeReviewMenus(except) {
    document.querySelectorAll(".review-menu").forEach((menu) => {
      if (menu === except) return;
      menu.querySelector(".review-menu-btn")?.setAttribute("aria-expanded", "false");
      const dd = menu.querySelector(".review-menu-dd");
      if (dd) dd.hidden = true;
    });
  }
  function applyReviewSort() {
    if (!reviewLayout) return;
    const dir = document.getElementById("review-sort")?.value || "new";
    const cards = [...reviewLayout.querySelectorAll(".review-card")];
    cards.sort((a, b) => {
      const ta = a.dataset.time || "";
      const tb = b.dataset.time || "";
      return dir === "old" ? ta.localeCompare(tb) : tb.localeCompare(ta);
    });
    cards.forEach((card) => reviewLayout.appendChild(card));
  }
  document.getElementById("review-sort")?.addEventListener("change", applyReviewSort);
  document.querySelector(".reviews-view")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-review-view]");
    if (!btn || !reviewLayout) return;
    const view = btn.getAttribute("data-review-view");
    reviewLayout.classList.toggle("is-grid", view === "grid");
    document.querySelectorAll("[data-review-view]").forEach((item) => {
      const on = item === btn;
      item.classList.toggle("is-on", on);
      item.setAttribute("aria-pressed", on ? "true" : "false");
    });
  });
  reviewLayout?.addEventListener("click", (event) => {
    const menuBtn = event.target.closest(".review-menu-btn");
    if (menuBtn) {
      const menu = menuBtn.closest(".review-menu");
      const dd = menu?.querySelector(".review-menu-dd");
      const open = Boolean(dd?.hidden);
      closeReviewMenus(menu);
      if (dd) dd.hidden = !open;
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      return;
    }
    const act = event.target.closest("[data-review-act]");
    if (!act) return;
    const card = act.closest(".review-card");
    if (!card) return;
    const kind = act.getAttribute("data-review-act");
    if (kind === "delete") card.remove();
    else if (kind === "report") {
      closeReviewMenus();
      return;
    } else if (kind === "reward") {
      card.classList.add("is-rewarded");
      act.innerHTML = `<img src="assets/deco/present.svg" alt=""> Награждено`;
      act.disabled = true;
    }
    closeReviewMenus();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".review-menu")) closeReviewMenus();
  });
  applyReviewSort();

  const COVER_PLACEHOLDER = "assets/deco/paw.svg";

  function applyCover(src) {
    document.querySelectorAll("[data-work-cover]").forEach((img) => {
      img.src = src || COVER_PLACEHOLDER;
    });
    const existing = window.FoxWorks && workId ? FoxWorks.get(workId) : null;
    if (existing && src && src !== COVER_PLACEHOLDER) {
      existing.cover = src;
      FoxWorks.upsert(existing);
    }
  }

  document.getElementById("work-cover-input")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const existing = window.FoxWorks && workId ? FoxWorks.get(workId) : null;
    if (window.FoxQuota) {
      const res = await FoxQuota.take(file, { role: "work-cover", replaceSrc: existing?.cover || "" });
      if (!res.ok) {
        window.alert(res.error);
        event.target.value = "";
        return;
      }
      applyCover(res.data);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        applyCover(String(reader.result || ""));
      };
      reader.readAsDataURL(file);
    }
  });

  const studioMore = document.querySelector(".work-dash-title .cabinet-more");
  const studioMenu = document.querySelector(".work-dash-title .cabinet-menu");
  studioMore?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!studioMenu) return;
    const open = studioMenu.hidden;
    studioMenu.hidden = !open;
    studioMore.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.addEventListener("click", (event) => {
    if (!studioMenu || studioMenu.hidden) return;
    if (event.target.closest(".work-dash-title .cabinet-more-wrap")) return;
    studioMenu.hidden = true;
    studioMore?.setAttribute("aria-expanded", "false");
  });
  document.getElementById("studio-delete-work")?.addEventListener("click", async () => {
    if (!window.FoxWorks) return;
    await FoxWorks.remove(workId);
    if (!FoxWorks.get(workId)) location.href = "author-home.html";
  });

  (function bindWorkStats() {
    const range = document.getElementById("stats-range");
    const label = document.getElementById("stats-range-label");
    const dates = document.getElementById("stats-range-dates");
    const tableBody = document.getElementById("stats-table-body");
    if (!range) return;
    const periods = {
      7: {
        label: "За 7 дней",
        dates: "18 — 24 авг. 2026",
        views: [2140, "12,4%"],
        uniques: [980, "9,1%"],
        reads: [1512, "14,8%"],
        likes: [146, "8,2%"],
        comments: [41, "11,0%"],
        downloads: [312, "10,4%"],
        dlUniques: [188, "7,6%"],
      },
      30: {
        label: "За 30 дней",
        dates: "26 июл. — 24 авг. 2026",
        views: [6840, "16,2%"],
        uniques: [3012, "13,5%"],
        reads: [4720, "19,4%"],
        likes: [428, "11,8%"],
        comments: [118, "18,6%"],
        downloads: [940, "14,1%"],
        dlUniques: [540, "10,9%"],
      },
      90: {
        label: "За 90 дней",
        dates: "27 мая — 24 авг. 2026",
        views: [18742, "24,6%"],
        uniques: [7945, "18,3%"],
        reads: [12581, "27,1%"],
        likes: [1263, "15,7%"],
        comments: [342, "31,4%"],
        downloads: [2856, "21,3%"],
        dlUniques: [1562, "16,8%"],
      },
      365: {
        label: "За год",
        dates: "25 авг. 2025 — 24 авг. 2026",
        views: [47684, "41,2%"],
        uniques: [20940, "33,8%"],
        reads: [32110, "38,6%"],
        likes: [3388, "22,4%"],
        comments: [845, "44,1%"],
        downloads: [7402, "29,0%"],
        dlUniques: [4296, "24,7%"],
      },
    };
    function ruNum(n) {
      return n.toLocaleString("ru-RU");
    }
    function paint() {
      const row = periods[range.value] || periods[90];
      if (label) label.textContent = row.label;
      if (dates) dates.textContent = row.dates;
      Object.entries(row).forEach(([key, value]) => {
        if (!Array.isArray(value)) return;
        document.querySelectorAll(`[data-kpi="${key}"]`).forEach((el) => {
          el.textContent = ruNum(value[0]);
        });
        document.querySelectorAll(`[data-kpi-delta="${key}"]`).forEach((el) => {
          el.textContent = `↑ ${value[1]}`;
        });
      });
      const first = tableBody?.rows[0];
      if (first) {
        first.cells[0].textContent = row.dates;
        const keys = ["views", "uniques", "reads", "likes", "comments", "downloads"];
        keys.forEach((key, i) => {
          const cell = first.cells[i + 1];
          if (!cell) return;
          cell.innerHTML = `${ruNum(row[key][0])} <span class="stats-delta is-up">↑ ${row[key][1]}</span>`;
        });
      }
    }
    range.addEventListener("change", paint);
    document.getElementById("stats-export")?.addEventListener("click", () => {
      const row = periods[range.value] || periods[90];
      const lines = [
        "Показатель;Значение;К прошлому периоду",
        `Просмотры;${row.views[0]};${row.views[1]}`,
        `Уникальные посетители;${row.uniques[0]};${row.uniques[1]}`,
        `Прочтения глав;${row.reads[0]};${row.reads[1]}`,
        `Лайки;${row.likes[0]};${row.likes[1]}`,
        `Комментарии;${row.comments[0]};${row.comments[1]}`,
        `Офлайн-загрузки;${row.downloads[0]};${row.downloads[1]}`,
      ];
      const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "statistika-raboty.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    });
    paint();
  })();
})();

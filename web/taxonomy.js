(function taxonomyUI() {
  const SCRIPT_SRC = document.currentScript?.src || "";
  const KEYS = { genres: "genres", formats: "formats", warnings: "warnings", kinks: "kinks" };

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function taxonomyUrl() {
    if (SCRIPT_SRC) return new URL("taxonomy.json", SCRIPT_SRC).href;
    return "taxonomy.json";
  }

  const dataPromise = fetch(taxonomyUrl()).then((res) => {
    if (!res.ok) throw new Error("taxonomy.json");
    return res.json();
  });

  function fillSelect(select, items) {
    const empty = select.getAttribute("data-empty") || "Любой";
    const current = select.value;
    select.innerHTML =
      `<option value="">${escapeHtml(empty)}</option>` +
      items
        .map((item) => `<option value="${escapeHtml(item.slug)}">${escapeHtml(item.name)}</option>`)
        .join("");
    if (current) select.value = current;
  }

  function matchItem(item, query) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    if (item.name.toLowerCase().includes(q)) return true;
    return (item.synonyms || []).some((syn) => syn.toLowerCase().includes(q));
  }

  function slugsFromUrl(name) {
    const params = new URLSearchParams(location.search);
    const collected = [];
    params.getAll(name).forEach((value) => collected.push(value));
    const singular = name.endsWith("s") ? name.slice(0, -1) : name;
    if (singular !== name) params.getAll(singular).forEach((value) => collected.push(value));
    return collected
      .flatMap((value) => String(value).split(","))
      .map((slug) => slug.trim())
      .filter(Boolean);
  }

  function presetSlugs(root) {
    const name = root.getAttribute("data-name") || root.getAttribute("data-tax-picker");
    const fromAttr = (root.getAttribute("data-selected") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return [...new Set([...fromAttr, ...slugsFromUrl(name)])];
  }

  function mountPicker(root, items) {
    if (root.getAttribute("data-list") === "all") {
      mountChecklist(root, items);
      return;
    }

    const name = root.getAttribute("data-name") || root.getAttribute("data-tax-picker");
    const selected = new Map();
    presetSlugs(root).forEach((slug) => {
      const item = items.find((it) => it.slug === slug);
      if (item) selected.set(slug, item);
    });

    root.innerHTML = `
      <div class="tax-chips"></div>
      <input class="tax-search" type="search" autocomplete="off" placeholder="${escapeHtml(root.getAttribute("data-placeholder") || "Найти…")}">
      <div class="tax-menu" hidden></div>
      <input type="hidden" name="${escapeHtml(name)}" value="">
    `;

    const chips = root.querySelector(".tax-chips");
    const search = root.querySelector(".tax-search");
    const menu = root.querySelector(".tax-menu");
    const hidden = root.querySelector('input[type="hidden"]');

    function syncHidden() {
      hidden.value = [...selected.keys()].join(",");
    }

    function renderChips() {
      chips.innerHTML = [...selected.values()]
        .map(
          (item) =>
            `<button type="button" class="tax-chip" data-slug="${escapeHtml(item.slug)}" title="${escapeHtml(item.description || item.name)}">${escapeHtml(item.name)} <span aria-hidden="true">×</span></button>`
        )
        .join("");
      syncHidden();
    }

    function renderMenu(query) {
      const available = items.filter((item) => !selected.has(item.slug) && matchItem(item, query));
      if (!available.length) {
        menu.hidden = true;
        menu.innerHTML = "";
        return;
      }
      menu.hidden = false;
      menu.innerHTML = available
        .map(
          (item) =>
            `<button type="button" class="tax-option" data-slug="${escapeHtml(item.slug)}" title="${escapeHtml(item.description || "")}">${escapeHtml(item.name)}</button>`
        )
        .join("");
    }

    function add(slug) {
      const item = items.find((it) => it.slug === slug);
      if (!item || selected.has(slug)) return;
      selected.set(slug, item);
      search.value = "";
      renderChips();
      renderMenu("");
    }

    function remove(slug) {
      selected.delete(slug);
      renderChips();
      if (document.activeElement === search) renderMenu(search.value);
    }

    chips.addEventListener("click", (event) => {
      const chip = event.target.closest(".tax-chip");
      if (chip) remove(chip.getAttribute("data-slug"));
    });
    menu.addEventListener("click", (event) => {
      const option = event.target.closest(".tax-option");
      if (option) add(option.getAttribute("data-slug"));
    });
    search.addEventListener("focus", () => renderMenu(search.value));
    search.addEventListener("input", () => renderMenu(search.value));
    search.addEventListener("keydown", (event) => {
      if (event.key === "Escape") menu.hidden = true;
    });
    document.addEventListener("click", (event) => {
      if (!root.contains(event.target)) menu.hidden = true;
    });

    renderChips();
  }

  function mountChecklist(root, items) {
    const name = root.getAttribute("data-name") || root.getAttribute("data-tax-picker");
    const selected = new Set(presetSlugs(root));
    const count = items.length;

    root.innerHTML = `
      <div class="tax-check-toolbar">
        <input class="tax-search" type="search" autocomplete="off" placeholder="${escapeHtml(root.getAttribute("data-placeholder") || "Найти…")}">
        <button type="button" class="tax-check-all">Все ${count}</button>
        <button type="button" class="tax-check-none">Сбросить</button>
      </div>
      <div class="tax-check-list" role="group"></div>
      <p class="tax-check-meta"><span data-picked>0</span> из ${count}</p>
      <input type="hidden" name="${escapeHtml(name)}" value="">
    `;

    const list = root.querySelector(".tax-check-list");
    const search = root.querySelector(".tax-search");
    const hidden = root.querySelector('input[type="hidden"]');
    const picked = root.querySelector("[data-picked]");

    function syncHidden() {
      hidden.value = [...selected].join(",");
      if (picked) picked.textContent = String(selected.size);
    }

    function render(query) {
      const visible = items.filter((item) => matchItem(item, query));
      if (!visible.length) {
        list.innerHTML = `<p class="tax-check-empty">Ничего не найдено</p>`;
        syncHidden();
        return;
      }
      list.innerHTML = visible
        .map(
          (item) => `
          <label class="tax-check" title="${escapeHtml(item.description || item.name)}">
            <input type="checkbox" value="${escapeHtml(item.slug)}" ${selected.has(item.slug) ? "checked" : ""}>
            <span>${escapeHtml(item.name)}</span>
          </label>`
        )
        .join("");
      syncHidden();
    }

    list.addEventListener("change", (event) => {
      const input = event.target.closest("input[type='checkbox']");
      if (!input) return;
      if (input.checked) selected.add(input.value);
      else selected.delete(input.value);
      syncHidden();
    });
    search.addEventListener("input", () => render(search.value));
    root.querySelector(".tax-check-all")?.addEventListener("click", () => {
      items.forEach((item) => selected.add(item.slug));
      render(search.value);
    });
    root.querySelector(".tax-check-none")?.addEventListener("click", () => {
      selected.clear();
      render(search.value);
    });

    render("");
  }

  function syncKinkFields() {
    const age = document.querySelector('input[name="age"]:checked')?.value;
    const block = document.getElementById("kink-fields");
    if (block) block.hidden = age !== "18+";
  }

  function restoreSimpleFields() {
    const params = new URLSearchParams(location.search);
    document.querySelectorAll(".filter-panel [name]").forEach((field) => {
      if (field.type === "hidden" || field.closest(".tax-picker")) return;
      const value = params.get(field.name);
      if (value != null && "value" in field && field.type !== "checkbox" && field.type !== "radio") {
        field.value = value;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    let data;
    try {
      data = await dataPromise;
    } catch {
      return;
    }

    restoreSimpleFields();

    document.querySelectorAll("[data-tax-select]").forEach((select) => {
      const kind = select.getAttribute("data-tax-select");
      fillSelect(select, data[KEYS[kind] || kind] || []);
    });

    document.querySelectorAll("[data-tax-picker]").forEach((root) => {
      const kind = root.getAttribute("data-tax-picker");
      mountPicker(root, data[KEYS[kind] || kind] || []);
    });

    document.querySelectorAll(".filter-panel").forEach((form) => {
      form.addEventListener("submit", () => {
        form.querySelectorAll('input[type="hidden"]').forEach((input) => {
          input.disabled = !input.value;
        });
      });
    });

    document.querySelectorAll('input[name="age"]').forEach((input) => {
      input.addEventListener("change", syncKinkFields);
    });
    syncKinkFields();
  });
})();

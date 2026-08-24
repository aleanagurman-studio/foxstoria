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

  function itemsFor(kind) {
    return dataPromise.then((data) => data[KEYS[kind] || kind] || []);
  }

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

  function mountPicker(root, items) {
    const name = root.getAttribute("data-name") || root.getAttribute("data-tax-picker");
    const selected = new Map();
    (root.getAttribute("data-selected") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((slug) => {
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
        .slice(0, 40)
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
      if (event.key === "Escape") {
        menu.hidden = true;
      }
    });
    document.addEventListener("click", (event) => {
      if (!root.contains(event.target)) menu.hidden = true;
    });

    renderChips();
  }

  function syncKinkFields() {
    const age = document.querySelector('input[name="age"]:checked')?.value;
    const block = document.getElementById("kink-fields");
    if (block) block.hidden = age !== "18+";
    const filter = document.getElementById("kink-filter");
    if (filter) {
      const wrap = filter.closest(".filter-group");
      if (wrap) wrap.hidden = false;
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    let data;
    try {
      data = await dataPromise;
    } catch {
      return;
    }

    document.querySelectorAll("[data-tax-select]").forEach((select) => {
      const kind = select.getAttribute("data-tax-select");
      fillSelect(select, data[kind] || []);
    });

    document.querySelectorAll("[data-tax-picker]").forEach((root) => {
      const kind = root.getAttribute("data-tax-picker");
      mountPicker(root, data[kind] || []);
    });

    document.querySelectorAll('input[name="age"]').forEach((input) => {
      input.addEventListener("change", syncKinkFields);
    });
    const ageSelect = document.getElementById("age");
    ageSelect?.addEventListener("change", () => {
      const wrap = document.getElementById("kink-filter")?.closest(".filter-group");
      if (wrap) wrap.hidden = ageSelect.value !== "" && ageSelect.value !== "18+";
    });
    syncKinkFields();
  });
})();

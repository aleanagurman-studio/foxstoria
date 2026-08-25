(function taxonomyUI() {
  const SCRIPT_SRC = document.currentScript?.src || "";
  const KEYS = {
    genres: "genres",
    formats: "formats",
    warnings: "warnings",
    kinks: "kinks",
    categories: "categories",
  };

  function assetUrl(file) {
    if (SCRIPT_SRC) return new URL(file, SCRIPT_SRC).href;
    return file;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  const dataPromise = fetch(assetUrl("taxonomy.json")).then((res) => {
    if (!res.ok) throw new Error("taxonomy.json");
    return res.json();
  });

  const fandomsPromise = fetch(assetUrl("fandoms.json")).then((res) => {
    if (!res.ok) throw new Error("fandoms.json");
    return res.json();
  });

  const charactersPromise = fetch(assetUrl("characters-by-fandom.json")).then((res) => {
    if (!res.ok) throw new Error("characters-by-fandom.json");
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

  function characterSlug(fandomSlug, name) {
    const base = String(name || "")
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^a-zа-я0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");
    return `${fandomSlug}-${base}`;
  }

  function hiddenSlugs(root) {
    const hidden = root?.querySelector('input[type="hidden"]');
    if (!hidden?.value) return [];
    return hidden.value
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean);
  }

  function withOriginalFandom(fandoms) {
    if (!Array.isArray(fandoms)) return fandoms;
    if (fandoms.some((item) => item.slug === "original")) return fandoms;
    return [{ name: "Ориджинал", slug: "original", category: "no_fandom" }, ...fandoms];
  }

  function presetEntries(root) {
    const slugs = presetSlugs(root);
    const labels = (root.getAttribute("data-selected-labels") || "")
      .split(",")
      .map((value) => value.trim());
    return slugs.map((slug, index) => ({ slug, label: labels[index] || "" }));
  }

  function mountPicker(root, items, options = {}) {
    const name = root.getAttribute("data-name") || root.getAttribute("data-tax-picker");
    const single = root.hasAttribute("data-single");
    const selected = new Map();

    presetEntries(root).forEach(({ slug, label }) => {
      let item = items.find((it) => it.slug === slug);
      if (!item && typeof options.getItems === "function") {
        item = options.getItems().find((it) => it.slug === slug);
      }
      if (!item && options.resolvePreset) item = options.resolvePreset(slug, label);
      if (!item && label) item = { slug, name: label };
      if (item) selected.set(slug, item);
    });

    root.innerHTML = `
      <div class="tax-field">
        <input class="tax-search" type="search" autocomplete="off" placeholder="${escapeHtml(root.getAttribute("data-placeholder") || "Найти…")}">
        <div class="tax-menu" hidden></div>
      </div>
      <div class="tax-chips"></div>
      <input type="hidden" name="${escapeHtml(name)}" value="">
    `;

    const chips = root.querySelector(".tax-chips");
    const search = root.querySelector(".tax-search");
    const menu = root.querySelector(".tax-menu");
    const hidden = root.querySelector('input[type="hidden"]');

    function sourceItems() {
      return typeof options.getItems === "function" ? options.getItems() : items;
    }

    function syncHidden() {
      hidden.value = [...selected.keys()].join(",");
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
      options.onChange?.([...selected.keys()], root);
    }

    function renderChips() {
      chips.innerHTML = [...selected.values()]
        .map(
          (item) =>
            `<button type="button" class="tax-chip" data-slug="${escapeHtml(item.slug)}" title="${escapeHtml(item.description || item.name)}">${escapeHtml(item.name)} <span aria-hidden="true">×</span></button>`
        )
        .join("");
      chips.hidden = chips.innerHTML === "";
      syncHidden();
    }

    function renderMenu(query) {
      const source = sourceItems();
      const available = source.filter((item) => !selected.has(item.slug) && matchItem(item, query)).slice(0, 60);
      menu.hidden = false;
      if (!available.length) {
        const hint =
          options.allowCustom && query.trim()
            ? `Enter — добавить «${escapeHtml(query.trim())}»`
            : escapeHtml(options.emptyText || "Ничего не найдено");
        menu.innerHTML = `<p class="tax-check-empty">${hint}</p>`;
        return;
      }
      menu.innerHTML = available
        .map(
          (item) =>
            `<button type="button" class="tax-option" data-slug="${escapeHtml(item.slug)}" title="${escapeHtml(item.description || "")}">${escapeHtml(item.name)}</button>`
        )
        .join("");
    }

    function addItem(item) {
      if (!item || selected.has(item.slug)) return;
      if (single) selected.clear();
      selected.set(item.slug, item);
      search.value = "";
      renderChips();
      renderMenu("");
    }

    function add(slug) {
      const item = sourceItems().find((it) => it.slug === slug);
      if (item) addItem(item);
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
        return;
      }
      if (event.key !== "Enter") return;
      event.preventDefault();
      const query = search.value.trim();
      if (!query) return;
      const source = sourceItems();
      const exact = source.find((item) => item.name.toLowerCase() === query.toLowerCase());
      if (exact) {
        addItem(exact);
        return;
      }
      const first = source.find((item) => !selected.has(item.slug) && matchItem(item, query));
      if (first) {
        addItem(first);
        return;
      }
      if (!options.allowCustom) return;
      const slug = options.customSlug ? options.customSlug(query) : query;
      addItem({ slug, name: query });
    });
    document.addEventListener("click", (event) => {
      if (!root.contains(event.target)) menu.hidden = true;
    });

    renderChips();
    root.taxRefresh = () => renderMenu(search.value);
  }

  function mountChecklist(root, items) {
    const name = root.getAttribute("data-name") || root.getAttribute("data-tax-picker");
    const selected = new Set(presetSlugs(root));
    let listItems = items;

    root.innerHTML = `
      <div class="tax-check-toolbar">
        <input class="tax-search" type="search" autocomplete="off" placeholder="${escapeHtml(root.getAttribute("data-placeholder") || "Найти…")}">
        <button type="button" class="tax-check-all">Все <span data-count>${listItems.length}</span></button>
        <button type="button" class="tax-check-none">Сбросить</button>
      </div>
      <div class="tax-check-list" role="group"></div>
      <p class="tax-check-meta"><span data-picked>0</span> из <span data-total>${listItems.length}</span></p>
      <input type="hidden" name="${escapeHtml(name)}" value="">
    `;

    const list = root.querySelector(".tax-check-list");
    const search = root.querySelector(".tax-search");
    const hidden = root.querySelector('input[type="hidden"]');
    const picked = root.querySelector("[data-picked]");
    const total = root.querySelector("[data-total]");
    const countBtn = root.querySelector("[data-count]");

    function syncHidden() {
      hidden.value = [...selected].join(",");
      if (picked) picked.textContent = String(selected.size);
    }

    function render(query) {
      const visible = listItems.filter((item) => matchItem(item, query));
      if (total) total.textContent = String(listItems.length);
      if (countBtn) countBtn.textContent = String(listItems.length);
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
      listItems.forEach((item) => selected.add(item.slug));
      render(search.value);
    });
    root.querySelector(".tax-check-none")?.addEventListener("click", () => {
      selected.clear();
      render(search.value);
    });

    render("");
  }

  function mountCharacterPicker(root, fandomRoot, charactersByFandom) {
    const extraCharacters = ["ОЖП", "ОМП"];

    mountPicker(root, [], {
      allowCustom: true,
      emptyText: "Выберите фандом или начните вводить имя",
      getItems() {
        const fandomSlugs = hiddenSlugs(fandomRoot);
        const items = [];
        const seen = new Set();
        fandomSlugs.forEach((fandomSlug) => {
          (charactersByFandom[fandomSlug] || []).forEach((name) => {
            const slug = characterSlug(fandomSlug, name);
            if (seen.has(slug)) return;
            seen.add(slug);
            items.push({ name, slug, fandom: fandomSlug });
          });
          extraCharacters.forEach((name) => {
            const slug = characterSlug(fandomSlug, name);
            if (seen.has(slug)) return;
            seen.add(slug);
            items.push({ name, slug, fandom: fandomSlug });
          });
        });
        return items;
      },
      resolvePreset(slug, label) {
        if (label) return { slug, name: label };
        const dash = slug.indexOf("-");
        if (dash === -1) return { slug, name: slug };
        return { slug, name: slug.slice(dash + 1).replace(/-/g, " ") };
      },
      customSlug(name) {
        const fandomSlugs = hiddenSlugs(fandomRoot);
        const fandom = fandomSlugs[0] || "original";
        return characterSlug(fandom, name);
      },
    });

    fandomRoot?.addEventListener("change", () => root.taxRefresh?.());
    fandomRoot?.querySelector('input[type="hidden"]')?.addEventListener("change", () => root.taxRefresh?.());
  }

  function syncKinkFields() {
    const age = document.querySelector('select[name="age"]')?.value || document.querySelector('input[name="age"]:checked')?.value;
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
    let fandoms;
    let charactersByFandom;
    try {
      [data, fandoms, charactersByFandom] = await Promise.all([dataPromise, fandomsPromise, charactersPromise]);
    } catch {
      try {
        data = await dataPromise;
      } catch {
        return;
      }
    }

    restoreSimpleFields();

    document.querySelectorAll("[data-tax-select]").forEach((select) => {
      const kind = select.getAttribute("data-tax-select");
      fillSelect(select, data[KEYS[kind] || kind] || fandoms || []);
    });

    const fandomRoot = document.querySelector('[data-tax-picker="fandoms"]');

    document.querySelectorAll("[data-tax-picker]").forEach((root) => {
      const kind = root.getAttribute("data-tax-picker");
      if (kind === "fandoms" && fandoms) {
        mountPicker(root, withOriginalFandom(fandoms));
        return;
      }
      if (kind === "characters" && charactersByFandom && fandomRoot) {
        mountCharacterPicker(root, fandomRoot, charactersByFandom);
        return;
      }
      mountPicker(root, data[KEYS[kind] || kind] || []);
    });

    document.querySelectorAll(".filter-panel").forEach((form) => {
      form.addEventListener("submit", () => {
        form.querySelectorAll('input[type="hidden"]').forEach((input) => {
          input.disabled = !input.value;
        });
      });
    });

    document.querySelectorAll('input[name="age"], select[name="age"]').forEach((input) => {
      input.addEventListener("change", syncKinkFields);
    });
    syncKinkFields();
    document.dispatchEvent(new CustomEvent("taxonomy:ready"));
  });
})();

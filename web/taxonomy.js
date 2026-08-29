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

  const CYR_TO_LAT = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "i",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  function foldText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^a-zа-я0-9]+/gi, " ")
      .trim()
      .replace(/[а-я]/g, (ch) => CYR_TO_LAT[ch] || ch)
      .replace(/\s+/g, " ");
  }

  function uniqueAliases(values, primary) {
    const seen = new Set();
    const out = [];
    const primaryFold = foldText(primary);
    values.forEach((raw) => {
      const value = String(raw || "").trim();
      if (!value) return;
      const key = foldText(value);
      if (!key || key === primaryFold || seen.has(key)) return;
      seen.add(key);
      out.push(value);
    });
    return out;
  }

  function fandomSynonyms(item) {
    const name = String(item.name || "");
    const primary = name.replace(/\s*\([^)]+\)/g, "").trim() || name;
    const found = [...(item.synonyms || [])];
    for (const match of name.matchAll(/\(([^)]+)\)/g)) {
      match[1].split(/[,;/|]+/).forEach((part) => found.push(part.trim()));
    }
    for (const match of name.matchAll(/«([^»]+)»/g)) found.push(match[1].trim());
    for (const match of name.matchAll(/"([^"]+)"/g)) found.push(match[1].trim());
    if (name.includes("/")) {
      name.split("/").forEach((part) => found.push(part.replace(/\s*\([^)]+\)/g, "").trim()));
    }
    return uniqueAliases(found, primary);
  }

  function enrichFandoms(list) {
    return (Array.isArray(list) ? list : []).map((item) => {
      const synonyms = fandomSynonyms(item);
      return { ...item, synonyms, description: synonyms.join(", ") };
    });
  }

  function itemSearchParts(item) {
    const parts = [item.name, item.slug, String(item.slug || "").replace(/[_-]+/g, " ")];
    (item.synonyms || []).forEach((syn) => parts.push(syn));
    const name = String(item.name || "");
    for (const match of name.matchAll(/\(([^)]+)\)/g)) {
      match[1].split(/[,;/|]+/).forEach((part) => parts.push(part.trim()));
    }
    for (const match of name.matchAll(/«([^»]+)»/g)) parts.push(match[1].trim());
    if (name.includes("/")) name.split("/").forEach((part) => parts.push(part.trim()));
    const stripped = name.replace(/\s*\([^)]+\)/g, "").trim();
    if (stripped) parts.push(stripped);
    return parts.filter(Boolean);
  }

  function matchItem(item, query) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const qFold = foldText(q);
    return itemSearchParts(item).some((part) => {
      const text = String(part).toLowerCase();
      return text.includes(q) || (qFold && foldText(part).includes(qFold));
    });
  }

  function sortByName(items) {
    return [...items].sort((a, b) => String(a.name || "").localeCompare(b.name || "", "ru", { sensitivity: "base" }));
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
    return [{ name: "Ориджинал", slug: "original", category: "no_fandom", synonyms: ["оригинал", "свой мир"] }, ...fandoms];
  }

  function presetEntries(root) {
    const slugs = presetSlugs(root);
    const labels = (root.getAttribute("data-selected-labels") || "")
      .split(",")
      .map((value) => value.trim());
    return slugs.map((slug, index) => ({ slug, label: labels[index] || "" }));
  }

  function bindDescribedSelects(data) {
    [
      ["work-type", "story_types"],
      ["work-romance", "romances"],
    ].forEach(([id, key]) => {
      const select = document.getElementById(id);
      const hint = document.getElementById(`${id}-hint`);
      if (!select || !hint) return;
      const items = data[key] || [];
      const paint = () => {
        hint.textContent = items.find((item) => item.slug === select.value)?.description || "";
      };
      select.addEventListener("change", paint);
      paint();
    });
  }

  function mountFandomPair(root, fandoms, categories) {
    const name = root.getAttribute("data-name") || "fandoms";
    const items = enrichFandoms(withOriginalFandom(fandoms));
    const cats = sortByName(categories || []);
    const selected = new Map();

    presetEntries(root).forEach(({ slug, label }) => {
      const item = items.find((it) => it.slug === slug) || (label ? { slug, name: label, synonyms: [] } : null);
      if (item) selected.set(slug, item);
    });

    root.innerHTML = `
      <div class="tax-fandom-step">
        <select class="tax-cat-select" aria-label="Категория">
          <option value="">Категория</option>
          ${cats
            .map((item) => `<option value="${escapeHtml(item.slug)}">${escapeHtml(item.name)}</option>`)
            .join("")}
        </select>
        <div class="tax-field">
          <input class="tax-search" type="search" autocomplete="off" placeholder="Название или другое написание…" disabled aria-label="Фандом">
          <div class="tax-menu" hidden></div>
        </div>
      </div>
      <div class="tax-chips"></div>
      <input type="hidden" name="${escapeHtml(name)}" value="">
    `;

    const catSelect = root.querySelector(".tax-cat-select");
    const search = root.querySelector(".tax-search");
    const menu = root.querySelector(".tax-menu");
    const chips = root.querySelector(".tax-chips");
    const hidden = root.querySelector('input[type="hidden"]');

    function syncHidden() {
      hidden.value = [...selected.keys()].join(",");
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function renderChips() {
      chips.innerHTML = [...selected.values()]
        .map(
          (item) =>
            `<button type="button" class="tax-chip" data-slug="${escapeHtml(item.slug)}">${escapeHtml(item.name)} <span aria-hidden="true">×</span></button>`
        )
        .join("");
      chips.hidden = chips.innerHTML === "";
      syncHidden();
    }

    function optionHTML(item) {
      const desc = (item.synonyms || []).join(", ");
      const descHtml = desc ? `<span class="tax-option-desc">${escapeHtml(desc)}</span>` : "";
      return `<button type="button" class="tax-option" data-slug="${escapeHtml(item.slug)}"><span class="tax-option-name">${escapeHtml(item.name)}</span>${descHtml}</button>`;
    }

    function available() {
      const cat = catSelect.value;
      if (!cat) return [];
      return sortByName(items.filter((item) => item.category === cat && !selected.has(item.slug) && matchItem(item, search.value)));
    }

    function renderMenu() {
      if (!catSelect.value) {
        menu.hidden = true;
        menu.innerHTML = "";
        return;
      }
      menu.hidden = false;
      const list = available();
      if (!list.length) {
        menu.innerHTML = `<p class="tax-check-empty">${search.value.trim() ? "Ничего не найдено" : "В этой категории пока нет фандомов"}</p>`;
        return;
      }
      menu.innerHTML = list.map(optionHTML).join("");
    }

    function resetCategory() {
      catSelect.value = "";
      search.value = "";
      search.disabled = true;
      menu.hidden = true;
      menu.innerHTML = "";
    }

    function addBySlug(slug) {
      const item = items.find((it) => it.slug === slug);
      if (!item || selected.has(item.slug)) return;
      selected.set(item.slug, item);
      renderChips();
      resetCategory();
    }

    catSelect.addEventListener("change", () => {
      const on = Boolean(catSelect.value);
      search.disabled = !on;
      search.value = "";
      if (on) {
        search.focus();
        renderMenu();
      } else {
        menu.hidden = true;
      }
    });
    search.addEventListener("focus", () => {
      if (!search.disabled) renderMenu();
    });
    search.addEventListener("input", renderMenu);
    search.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        menu.hidden = true;
        return;
      }
      if (event.key !== "Enter") return;
      event.preventDefault();
      const first = available()[0];
      if (first) addBySlug(first.slug);
    });
    menu.addEventListener("click", (event) => {
      const option = event.target.closest(".tax-option[data-slug]");
      if (option) addBySlug(option.getAttribute("data-slug"));
    });
    chips.addEventListener("click", (event) => {
      const chip = event.target.closest(".tax-chip");
      if (!chip) return;
      selected.delete(chip.getAttribute("data-slug"));
      renderChips();
      if (catSelect.value) renderMenu();
    });
    document.addEventListener("click", (event) => {
      if (!root.contains(event.target)) menu.hidden = true;
    });

    renderChips();
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

    const showDescs = root.hasAttribute("data-tax-quotes");
    const categoryFirst = Boolean(options.categoryFirst);
    const categories = sortByName(options.categories || []);
    let categoryFilter = "";

    root.innerHTML = `
      <div class="tax-field">
        <input class="tax-search" type="search" autocomplete="off" placeholder="${escapeHtml(root.getAttribute("data-placeholder") || "Найти…")}">
        <div class="tax-menu" hidden></div>
      </div>
      <div class="tax-cat-bar" hidden></div>
      <div class="tax-chips"></div>
      <input type="hidden" name="${escapeHtml(name)}" value="">
    `;

    const chips = root.querySelector(".tax-chips");
    const catBar = root.querySelector(".tax-cat-bar");
    const search = root.querySelector(".tax-search");
    const menu = root.querySelector(".tax-menu");
    const hidden = root.querySelector('input[type="hidden"]');
    const defaultPlaceholder = root.getAttribute("data-placeholder") || "Найти…";
    let pendingRole = "";

    function sourceItems() {
      const all = typeof options.getItems === "function" ? options.getItems() : items;
      if (categoryFirst && categoryFilter) {
        return all.filter((item) => item.category === categoryFilter);
      }
      return all;
    }

    function categoryName(slug) {
      return categories.find((item) => item.slug === slug)?.name || slug;
    }

    function renderCatBar() {
      if (!catBar) return;
      if (!categoryFilter) {
        catBar.hidden = true;
        catBar.innerHTML = "";
        return;
      }
      catBar.hidden = false;
      catBar.innerHTML = `<button type="button" class="tax-chip" data-category-clear>${escapeHtml(categoryName(categoryFilter))} <span aria-hidden="true">×</span></button>`;
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
            `<button type="button" class="tax-chip" data-slug="${escapeHtml(item.slug)}">${escapeHtml(item.name)} <span aria-hidden="true">×</span></button>`
        )
        .join("");
      chips.hidden = chips.innerHTML === "";
      syncHidden();
    }

    function renderMenu(query) {
      if (pendingRole) {
        menu.hidden = false;
        const typed = query.trim();
        const preview = typed ? `${typed} (${pendingRole})` : `(${pendingRole})`;
        menu.innerHTML = `<p class="tax-check-empty">${typed ? `Enter — добавить «${escapeHtml(preview)}»` : `Введите имя — к нему добавится (${escapeHtml(pendingRole)})`}</p>`;
        return;
      }
      menu.hidden = false;
      renderCatBar();
      if (categoryFirst && !query.trim() && !categoryFilter) {
        menu.innerHTML = sortByName(categories)
          .map(
            (item) =>
              `<button type="button" class="tax-option" data-category="${escapeHtml(item.slug)}"><span class="tax-option-name">${escapeHtml(item.name)}</span></button>`
          )
          .join("");
        return;
      }
      const source = sourceItems();
      const available = sortByName(source.filter((item) => !selected.has(item.slug) && matchItem(item, query)));
      if (!available.length) {
        const hint =
          options.allowCustom && query.trim()
            ? `Enter — добавить «${escapeHtml(query.trim())}»`
            : escapeHtml(options.emptyText || "Ничего не найдено");
        const back =
          categoryFirst && categoryFilter
            ? `<button type="button" class="tax-option" data-category-clear><span class="tax-option-name">← Все категории</span></button>`
            : "";
        menu.innerHTML = `${back}<p class="tax-check-empty">${hint}</p>`;
        return;
      }
      const back =
        categoryFirst && categoryFilter && !query.trim()
          ? `<button type="button" class="tax-option" data-category-clear><span class="tax-option-name">← Все категории</span></button>`
          : "";
      menu.innerHTML =
        back +
        available
          .map((item) => {
            const descText = showDescs && item.description ? item.description : (item.synonyms || []).join(", ");
            const desc = descText ? `<span class="tax-option-desc">${escapeHtml(descText)}</span>` : "";
            return `<button type="button" class="tax-option" data-slug="${escapeHtml(item.slug)}"><span class="tax-option-name">${escapeHtml(item.name)}</span>${desc}</button>`;
          })
          .join("");
    }

    function addItem(item) {
      if (item?.namedRole) {
        pendingRole = item.namedRole;
        search.placeholder = `Имя (${item.namedRole})`;
        search.value = "";
        renderMenu("");
        search.focus();
        return;
      }
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
    catBar?.addEventListener("click", (event) => {
      if (!event.target.closest("[data-category-clear]")) return;
      categoryFilter = "";
      renderMenu(search.value);
    });
    menu.addEventListener("click", (event) => {
      const clear = event.target.closest("[data-category-clear]");
      if (clear) {
        categoryFilter = "";
        renderMenu("");
        return;
      }
      const cat = event.target.closest("[data-category]");
      if (cat) {
        categoryFilter = cat.getAttribute("data-category") || "";
        search.value = "";
        renderMenu("");
        search.focus();
        return;
      }
      const option = event.target.closest(".tax-option[data-slug]");
      if (option) add(option.getAttribute("data-slug"));
    });
    search.addEventListener("focus", () => renderMenu(search.value));
    search.addEventListener("input", () => renderMenu(search.value));
    search.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        pendingRole = "";
        search.placeholder = defaultPlaceholder;
        menu.hidden = true;
        return;
      }
      if (event.key !== "Enter") return;
      event.preventDefault();
      const query = search.value.trim();
      if (!query) return;
      if (pendingRole) {
        const suffix = `(${pendingRole})`;
        const name = query.includes(suffix) ? query : `${query} ${suffix}`;
        const slug = options.customSlug ? options.customSlug(name) : name;
        pendingRole = "";
        search.placeholder = defaultPlaceholder;
        addItem({ slug, name });
        return;
      }
      const source = sourceItems();
      const q = query.toLowerCase();
      const exact = source.find((item) => itemSearchParts(item).some((part) => String(part).toLowerCase() === q));
      if (exact) {
        addItem(exact);
        return;
      }
      const first = sortByName(source.filter((item) => !selected.has(item.slug) && matchItem(item, query)))[0];
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
      const visible = sortByName(listItems.filter((item) => matchItem(item, query)));
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
    const namedRoles = root.hasAttribute("data-named-roles");

    mountPicker(root, [], {
      allowCustom: true,
      emptyText: "Выберите фандом или начните вводить имя",
      getItems() {
        const fandomSlugs = hiddenSlugs(fandomRoot);
        const items = [];
        const seen = new Set();
        const hasCanon = fandomSlugs.some((slug) => slug && slug !== "original");
        fandomSlugs.forEach((fandomSlug) => {
          (charactersByFandom[fandomSlug] || []).forEach((name) => {
            const slug = characterSlug(fandomSlug, name);
            if (seen.has(slug)) return;
            seen.add(slug);
            items.push({ name, slug, fandom: fandomSlug });
          });
          if (!namedRoles) {
            extraCharacters.forEach((name) => {
              const slug = characterSlug(fandomSlug, name);
              if (seen.has(slug)) return;
              seen.add(slug);
              items.push({ name, slug, fandom: fandomSlug });
            });
          }
        });
        if (namedRoles && hasCanon) {
          items.push(
            { name: "ОЖП", slug: "__named-ojp", namedRole: "ОЖП" },
            { name: "ОМП", slug: "__named-omp", namedRole: "ОМП" }
          );
        }
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
    bindDescribedSelects(data);

    document.querySelectorAll("[data-tax-select]").forEach((select) => {
      const kind = select.getAttribute("data-tax-select");
      fillSelect(select, data[KEYS[kind] || kind] || fandoms || []);
    });

    const fandomRoot = document.querySelector('[data-tax-picker="fandoms"]');

    document.querySelectorAll("[data-tax-picker]").forEach((root) => {
      const kind = root.getAttribute("data-tax-picker");
      if (kind === "fandoms" && fandoms) {
        if (root.hasAttribute("data-fandom-step")) {
          mountFandomPair(root, fandoms, data.categories || []);
        } else {
          mountPicker(root, enrichFandoms(withOriginalFandom(fandoms)));
        }
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

(async function publicWorkPage() {
  const id = window.FoxWorks ? FoxWorks.idFromUrl() : new URLSearchParams(location.search).get("id") || "";
  document.getElementById("work-page")?.setAttribute("data-work-id", id);
  document.getElementById("work-like")?.setAttribute("data-work-id", id);
  document.getElementById("work-follow-wrap")?.setAttribute("data-work-id", id);
  if (window.FoxWorks) {
    await FoxWorks.hydrate();
    if (id && !FoxWorks.get(id)) await FoxWorks.fetchOne(id);
  }
  const work = window.FoxWorks ? FoxWorks.get(id) : null;
  const nav = document.getElementById("work-nav");
  if (!work) {
    document.getElementById("work-title").textContent = "Работа не найдена";
    document.getElementById("work-desc").textContent = "Этой карточки нет в каталоге. Если API выключен, откройте сайт с http://127.0.0.1:8000/";
    if (nav) nav.innerHTML = "";
    return;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  async function loadMaps() {
    const empty = { genres: {}, formats: {}, warnings: {}, kinks: {}, fandoms: {} };
    try {
      const [tax, fandoms] = await Promise.all([
        fetch("taxonomy.json", { cache: "no-store" }).then((res) => (res.ok ? res.json() : null)),
        fetch("fandoms.json", { cache: "no-store" }).then((res) => (res.ok ? res.json() : null)),
      ]);
      const maps = { ...empty };
      ["genres", "formats", "warnings", "kinks"].forEach((key) => {
        (tax?.[key] || []).forEach((item) => {
          if (item?.slug) maps[key][item.slug] = item.name;
        });
      });
      (Array.isArray(fandoms) ? fandoms : []).forEach((item) => {
        if (item?.slug) maps.fandoms[item.slug] = item.name;
      });
      return maps;
    } catch {
      return empty;
    }
  }

  function labelOf(map, slug) {
    return map[slug] || slug;
  }

  function characterLabel(slug, names, index, fandoms) {
    if (names && names[index]) return names[index];
    const value = String(slug || "");
    for (const fandom of fandoms || []) {
      const prefix = `${fandom}-`;
      if (value.startsWith(prefix)) return value.slice(prefix.length).replace(/-/g, " ");
    }
    const dash = value.indexOf("-");
    return dash >= 0 ? value.slice(dash + 1).replace(/-/g, " ") : value;
  }

  function formatCount(value) {
    const n = Number(value) || 0;
    if (n >= 1000) {
      const k = n / 1000;
      const text = k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "");
      return `${text}K`;
    }
    return String(n);
  }

  const maps = await loadMaps();
  const type = FoxWorks.normalizeStoryType(work.story_type);
  const typeLabel = FoxWorks.storyTypeLabel(work);
  const romance = work.romance || "";
  const romanceMeta = {
    slash: { label: "Слэш", icon: "assets/svg/слэш.svg", cls: "work-badge--slash" },
    femslash: { label: "Фемслэш", icon: "assets/svg/фемслэш.svg", cls: "work-badge--femslash" },
    het: { label: "Гет", icon: "assets/svg/гет.svg", cls: "work-badge--het" },
    gen: { label: "Джен", icon: "assets/svg/джен.svg?v=2", cls: "work-badge--gen" },
    mixed: { label: "Смешанный", icon: "assets/svg/смешанная.svg", cls: "work-badge--mixed" },
  }[romance];
  const age = !work.age || work.age === "none" ? "0+" : work.age;
  const ageCls = age === "18+" ? "work-badge--age-18" : age === "16+" ? "work-badge--age-16" : "work-badge--age-0";
  const completed = work.status === "completed" || work.is_completed;
  const likes = Number(work.likes ?? work.plays ?? 0) || 0;
  const plays = Number(work.plays || 0) || 0;
  const comments = Number(work.comments || 0) || 0;
  const own =
    (typeof isOwnUserName === "function" && isOwnUserName(work.author)) ||
    String(work.author_slug || "").toLowerCase() === String(ownerHandle()).toLowerCase();

  document.title = `${work.title} — FoxStoria`;
  document.getElementById("crumb-title").textContent = work.title;
  document.getElementById("work-title").textContent = work.title;
  const typeEl = document.getElementById("work-type");
  typeEl.textContent = typeLabel;
  typeEl.href = `catalog.html?type=${encodeURIComponent(type)}`;
  document.getElementById("work-desc").textContent = work.description || "Описание появится, когда автор его напишет.";
  if (work.author_notes) {
    document.getElementById("work-notes-block").hidden = false;
    document.getElementById("work-notes").textContent = work.author_notes;
  }
  const cover = document.getElementById("work-cover");
  if (cover) {
    if (work.cover) cover.innerHTML = `<img src="${work.cover.replace(/"/g, "")}" alt="">`;
    if (window.FoxPay) cover.insertAdjacentHTML("afterbegin", FoxPay.markHTML(work));
  }

  const badges = [];
  if (romanceMeta) {
    badges.push(
      `<a href="catalog.html?romance=${encodeURIComponent(romance)}" class="work-badge ${romanceMeta.cls}"><img src="${romanceMeta.icon}" class="work-badge-icon" alt=""> ${romanceMeta.label}</a>`
    );
  }
  badges.push(`<a href="catalog.html?age=${encodeURIComponent(age)}" class="work-badge work-badge--age ${ageCls}">${escapeHtml(age)}</a>`);
  badges.push(
    `<a href="catalog.html?status=${completed ? "completed" : "in_progress"}" class="work-badge work-badge--status ${
      completed ? "work-badge--status-done" : "work-badge--status-progress"
    }">${completed ? "Завершена" : "В процессе"}</a>`
  );
  badges.push(`<span class="work-badge work-badge--likes"><img src="assets/svg/heart.svg" class="work-icon" alt=""> ${formatCount(likes)}</span>`);
  if (work.paid) {
    badges.push(
      `<span class="work-paid-icon" title="Платный доступ"><img src="assets/svg/fillsparkle.svg" alt=""></span>`
    );
  }
  document.getElementById("work-badges").innerHTML = badges.join("");

  const authorName = work.author || "Автор";
  const authorHref = typeof profileHref === "function" ? profileHref(authorName) : "profile.html";
  const avatar = own && typeof ownerAvatarSrc === "function" ? ownerAvatarSrc() : "assets/test/avatar-1.png";
  document.getElementById("work-people").innerHTML = `<a href="${escapeHtml(authorHref)}" class="work-person" data-user-name="${escapeHtml(authorName)}">
      <img class="work-person-ava" src="${escapeHtml(avatar)}" alt="">
      <span class="work-person-body">
        <span class="work-person-name">${escapeHtml(authorName)}</span>
        <span class="work-person-role">автор</span>
      </span>
    </a>`;

  const tagHtml = [
    ...(work.genres || []).map((slug) => tagLink(labelOf(maps.genres, slug), "genres", slug, "work-tag-tile")),
    ...(work.formats || []).map((slug) => tagLink(labelOf(maps.formats, slug), "formats", slug, "work-tag-tile")),
    ...(work.warnings || []).map((slug) => tagLink(labelOf(maps.warnings, slug), "warnings", slug, "work-tag-tile work-tag-tile--warning")),
    ...(work.age === "18+" ? work.kinks || [] : []).map((slug) => tagLink(labelOf(maps.kinks, slug), "kinks", slug, "work-tag-tile")),
  ].filter(Boolean);
  const tags = document.getElementById("work-tags");
  tags.innerHTML = tagHtml.join("");
  tags.hidden = !tagHtml.length;

  const fandomSlugs = work.fandoms?.length ? work.fandoms : work.fandom ? ["original"] : [];
  const fandomNames = work.fandom_names || [];
  const fandomHtml = fandomSlugs
    .map((slug, index) => tagLink(fandomNames[index] || maps.fandoms[slug] || work.fandom || slug, "fandoms", slug, "tag-link"))
    .join("");
  document.getElementById("work-fandoms").innerHTML = fandomHtml || `<span class="tag-link">Ориджинал</span>`;

  const pairingLines = String(work.pairings || "")
    .split(/\n|,/)
    .map((line) => (typeof parsePairingLine === "function" ? parsePairingLine(line) : null))
    .filter(Boolean);
  const charSlugs = work.characters || [];
  const charNames = work.character_names || [];
  const cast = [
    ...pairingLines.map((pairing) => pairingLink(pairing, "tag-link pairing-tag")),
    ...charSlugs.map((slug, index) =>
      tagLink(characterLabel(slug, charNames, index, fandomSlugs), "characters", slug, "tag-link")
    ),
  ].filter(Boolean);
  document.getElementById("work-cast").innerHTML = cast.join("") || "—";
  document.getElementById("work-cast-block").hidden = !cast.length && !charSlugs.length && !pairingLines.length;

  FoxWorks.remember(work.id);
  await FoxWorks.seed(work);
  const urls = FoxWorks.urls(work);
  const manage = (window.FoxPay && FoxPay.canEditCard(work)) || own;
  const studio = document.getElementById("work-studio");
  if (studio) {
    studio.hidden = !manage;
    studio.href = urls.studio;
  }
  const read = document.getElementById("work-read");
  if (read) {
    read.hidden = false;
    read.href = urls.read;
    read.innerHTML = `<img src="assets/svg/читать.svg" class="work-btn-icon" alt=""> Читать`;
  }
  const follow = document.getElementById("work-follow-wrap");
  if (follow) {
    follow.hidden = false;
    follow.setAttribute("data-work-id", work.id);
  }
  document.getElementById("work-like")?.setAttribute("data-work-id", work.id);
  document.getElementById("work-page")?.setAttribute("data-work-id", work.id);

  let chapters = [];
  try {
    if (type === "linear" || type === "messenger") {
      const data = JSON.parse(localStorage.getItem(FoxWorks.contentStore(work)) || "null");
      chapters = (data?.chapters || []).map((chapter, index) => ({
        id: chapter.id || "",
        n: index + 1,
        title: chapter.title || `Глава ${index + 1}`,
        href: `${urls.read}${urls.read.includes("?") ? "&" : "?"}chapter=${index + 1}`,
      }));
    } else {
      const data = JSON.parse(localStorage.getItem(FoxWorks.mapStore(work.id)) || "null");
      chapters = (data?.scenes || []).map((scene, index) => ({
        id: scene.id || "",
        n: index + 1,
        title: scene.title || `Сцена ${index + 1}`,
        href: urls.read,
      }));
    }
  } catch {
    chapters = [];
  }

  const sizeKey = completed ? work.work_size || work.planned_size : "";
  const sizeWord = { mini: "мини", midi: "миди", maxi: "макси" }[sizeKey] || "";
  const sizeText = completed && sizeWord
    ? `${sizeWord} · ${chapters.length || 0} ${chapters.length === 1 ? "глава" : "глав"}`
    : chapters.length
      ? `в процессе · ${chapters.length} ${chapters.length === 1 ? "глава" : "глав"}`
      : "в процессе";
  document.getElementById("work-size").innerHTML = `<a href="catalog.html?size=${encodeURIComponent(sizeKey || "mini")}" class="tag-link">${escapeHtml(sizeText)}</a>`;

  document.getElementById("stat-plays").textContent = formatCount(plays);
  document.getElementById("stat-likes").textContent = formatCount(likes);
  document.getElementById("stat-comments").textContent = formatCount(comments);
  document.getElementById("stat-chapters").textContent = String(chapters.length);

  const chevron = `<svg class="story-nav-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 6.2 8 10.5l4.5-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (nav) {
    nav.innerHTML = chapters.length
      ? chapters
          .map(
            (chapter, index) => {
              const locked = window.FoxPay && !FoxPay.chapterUnlocked(work, index);
              return `<li class="story-nav-node">
              <button type="button" class="story-nav-fold is-empty" aria-hidden="true">${chevron}</button>
              <a class="story-nav-link${locked ? " is-paid-lock" : ""}" href="${chapter.href.replace(/"/g, "")}">
                <span class="story-nav-title"></span>
              </a>
            </li>`;
            }
          )
          .join("")
      : `<li class="story-nav-node"><span class="story-nav-link is-locked"><span class="story-nav-title">Глав пока нет</span></span></li>`;
    nav.querySelectorAll(".story-nav-title").forEach((el, index) => {
      if (chapters[index]) el.textContent = chapters[index].title;
    });
  }
})();

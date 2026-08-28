(function repliesPage() {
  const feed = document.getElementById("reply-feed");
  const empty = document.getElementById("reply-empty");
  const sortEl = document.getElementById("reply-sort");
  const statusEl = document.getElementById("reply-status");
  const searchEl = document.getElementById("reply-search");
  const tabs = document.getElementById("reply-tabs");
  if (!feed || !tabs) return;

  function cards() {
    return [...feed.querySelectorAll(".reply-card")];
  }

  function closeMenus(except) {
    document.querySelectorAll(".reply-more").forEach((wrap) => {
      if (wrap === except) return;
      wrap.classList.remove("is-open");
      wrap.querySelector(".reply-more-btn")?.setAttribute("aria-expanded", "false");
      const dd = wrap.querySelector(".reply-more-dd");
      if (dd) dd.hidden = true;
    });
  }

  function apply() {
    const tab = tabs.querySelector(".active")?.getAttribute("data-reply-tab") || "all";
    const status = statusEl?.value || "all";
    const query = (searchEl?.value || "").trim().toLowerCase();
    const newest = (sortEl?.value || "new") !== "old";
    const list = cards().sort((a, b) => {
      const da = Date.parse(a.getAttribute("data-time") || 0);
      const db = Date.parse(b.getAttribute("data-time") || 0);
      return newest ? db - da : da - db;
    });
    list.forEach((card) => feed.append(card));
    let shown = 0;
    list.forEach((card) => {
      const kind = card.getAttribute("data-kind");
      const st = card.getAttribute("data-status");
      const text = card.textContent.toLowerCase();
      const okTab = tab === "all" || kind === tab;
      const okStatus = status === "all" || st === status;
      const okQuery = !query || text.includes(query);
      const visible = okTab && okStatus && okQuery;
      card.hidden = !visible;
      if (visible) shown += 1;
    });
    if (empty) empty.hidden = shown > 0;
  }

  function setStatus(card, status) {
    card.setAttribute("data-status", status);
    const badge = card.querySelector(".reply-status");
    if (!badge) return;
    badge.className = "reply-status";
    if (status === "new") {
      badge.classList.add("is-new");
      badge.textContent = "Новый";
    } else if (status === "moderation") {
      badge.classList.add("is-wait");
      badge.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.5 4.5h11M6.5 19.5h11M8 4.5 12 12 8 19.5M16 4.5 12 12 16 19.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg> На модерации';
    } else {
      badge.classList.add("is-live");
      badge.textContent = "Опубликован";
    }
  }

  tabs.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-reply-tab]");
    if (!btn) return;
    tabs.querySelectorAll("[data-reply-tab]").forEach((tab) => {
      tab.classList.toggle("active", tab === btn);
    });
    const url = new URL(location.href);
    url.searchParams.set("tab", btn.getAttribute("data-reply-tab"));
    history.replaceState({}, "", url.pathname + url.search + url.hash);
    apply();
  });

  sortEl?.addEventListener("change", apply);
  statusEl?.addEventListener("change", apply);
  searchEl?.addEventListener("input", apply);

  feed.addEventListener("click", (event) => {
    const moreBtn = event.target.closest(".reply-more-btn");
    if (moreBtn) {
      const wrap = moreBtn.closest(".reply-more");
      const dd = wrap?.querySelector(".reply-more-dd");
      const open = dd?.hidden;
      closeMenus(wrap);
      if (wrap && dd) {
        wrap.classList.toggle("is-open", open);
        moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
        dd.hidden = !open;
      }
      return;
    }
    const card = event.target.closest(".reply-card");
    if (!card) return;
    if (event.target.closest("[data-reply-read]")) {
      setStatus(card, "published");
      closeMenus();
      apply();
      return;
    }
    if (event.target.closest("[data-reply-report]")) {
      card.classList.add("is-reported");
      closeMenus();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".reply-more")) closeMenus();
  });

  const fromUrl = new URLSearchParams(location.search).get("tab");
  const tabAlias = { works: "work", blogs: "blog" };
  const startTab = tabAlias[fromUrl] || fromUrl;
  if (startTab && tabs.querySelector(`[data-reply-tab="${startTab}"]`)) {
    tabs.querySelectorAll("[data-reply-tab]").forEach((tab) => {
      tab.classList.toggle("active", tab.getAttribute("data-reply-tab") === startTab);
    });
  }
  apply();
})();

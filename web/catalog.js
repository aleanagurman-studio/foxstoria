/* Feeds fill from works.json. Empty arrays keep empty states until works appear. */

const ROMANCE = {
  slash: "Слэш",
  femslash: "Фемслэш",
  het: "Гет",
  gen: "Джен",
};

const SIZE = { mini: "мини", midi: "миди", maxi: "макси" };

function ageLabel(age) {
  if (!age || age === "none") return "без рейтинга";
  return age;
}

function workHref(work) {
  if (work.href) return work.href;
  if (work.story_type === "linear") return "story-linear.html";
  return "story-interactive.html";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cardHTML(work, rank, isNew) {
  const meta = [work.fandom, ROMANCE[work.romance] || work.romance].filter(Boolean).join(" · ");
  const size = work.is_completed && work.work_size ? SIZE[work.work_size] : work.is_completed ? "" : "в процессе";
  const cover = work.cover
    ? `<img src="${escapeHtml(work.cover)}" alt="">`
    : `<span class="cover-fallback"><img src="assets/deco/paw.svg" alt=""></span>`;
  const rankBadge = rank ? `<span class="story-rank">${rank}</span>` : "";
  const newBadge = isNew ? `<span class="badge-new">New</span>` : "";

  return `
    <article class="story-card">
      <a href="${escapeHtml(workHref(work))}">
        <div class="story-cover">${rankBadge}${newBadge}${cover}</div>
        <h3 class="story-title">${escapeHtml(work.title)}</h3>
        <p class="story-meta">${escapeHtml(meta)}</p>
        <p class="story-stats">
          <span class="rating"><img src="assets/deco/sparcle.svg" alt=""> ${Number(work.rating || 0).toFixed(1)}</span>
          <span class="age-badge">${escapeHtml(ageLabel(work.age))}</span>
          ${size ? `<span class="status-badge">${escapeHtml(size)}</span>` : ""}
        </p>
      </a>
    </article>`;
}

function emptyHTML(text) {
  return `<div class="empty-feed"><p>${escapeHtml(text)}</p></div>`;
}

function renderFeed(id, items, emptyText) {
  const root = document.querySelector(`[data-feed="${id}"]`);
  if (!root) return;
  if (!items.length) {
    root.innerHTML = emptyHTML(emptyText);
    return;
  }
  const ranked = id === "popular";
  const isNew = id === "latest";
  root.innerHTML = items.map((work, index) => cardHTML(work, ranked ? index + 1 : 0, isNew)).join("");
}

function renderFeatured(works) {
  const root = document.querySelector("[data-feed='featured']");
  if (!root) return;
  const work = [...works].sort((a, b) => (b.plays || 0) - (a.plays || 0))[0];
  if (!work) {
    root.innerHTML = emptyHTML("Выбор читателей появится, когда у работ наберутся прохождения.");
    return;
  }
  const meta = [work.fandom, ROMANCE[work.romance] || work.romance].filter(Boolean).join(" · ");
  root.innerHTML = `
    <a class="featured-card" href="${escapeHtml(workHref(work))}">
      <div class="featured-cover">${work.cover ? `<img src="${escapeHtml(work.cover)}" alt="">` : ""}</div>
      <div class="featured-info">
        <h3>${escapeHtml(work.title)}</h3>
        <p>${escapeHtml(work.description || meta)}</p>
        <div class="featured-stats">
          <span>${escapeHtml(meta)}</span>
          <span><strong>${work.plays || 0}</strong> прохождений</span>
          <span class="rating"><img src="assets/deco/sparcle.svg" alt=""> ${Number(work.rating || 0).toFixed(1)}</span>
          <span class="age-badge">${escapeHtml(ageLabel(work.age))}</span>
        </div>
      </div>
    </a>`;
}

function renderAuthors(authors) {
  const root = document.querySelector("[data-feed='authors']");
  if (!root) return;
  if (!authors.length) {
    root.innerHTML = emptyHTML("Авторы появятся вместе с первыми работами.");
    return;
  }
  root.innerHTML = authors
    .slice(0, 5)
    .map(
      (author, index) => `
      <a class="author-item" href="${escapeHtml(author.href || "authors.html")}">
        <span class="author-rank">${index + 1}</span>
        <span class="author-avatar">${author.avatar ? `<img src="${escapeHtml(author.avatar)}" alt="">` : ""}</span>
        <span class="author-info">
          <span class="author-name">${escapeHtml(author.display_name)}</span>
          <span class="author-stats">${author.rating_avg ? Number(author.rating_avg).toFixed(1) : "—"} · ${author.story_count || 0} работ</span>
        </span>
      </a>`
    )
    .join("");
}

async function loadCatalog() {
  try {
    const response = await fetch("works.json", { cache: "no-store" });
    if (!response.ok) throw new Error("catalog");
    const data = await response.json();
    const works = Array.isArray(data.works) ? data.works : [];
    const popular = [...works].sort(
      (a, b) => (b.plays || 0) - (a.plays || 0) || (b.rating || 0) - (a.rating || 0)
    );
    const latest = [...works].sort(
      (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
    );
    renderFeed(
      "popular",
      popular.slice(0, 6),
      "Популярные работы появятся здесь сами, как только их начнут читать."
    );
    renderFeed(
      "latest",
      latest.slice(0, 4),
      "Новые работы появятся здесь сразу после публикации."
    );
    renderFeatured(works);
    renderAuthors(data.authors || []);
    renderCatalogGrid(works);
    renderAuthorsGrid(data.authors || []);
    window.__foxWorks = works;
    window.__foxAuthors = data.authors || [];
  } catch (error) {
    renderFeed("popular", [], "Каталог пока не загрузился.");
    renderFeed("latest", [], "Каталог пока не загрузился.");
    renderFeatured([]);
    renderAuthors([]);
    renderCatalogGrid([]);
    renderAuthorsGrid([]);
  }
}

function sortWorks(works, sort) {
  const copy = [...works];
  if (sort === "rating") return copy.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (sort === "latest") return copy.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  if (sort === "name") return copy.sort((a, b) => String(a.title || "").localeCompare(b.title || "", "ru"));
  return copy.sort((a, b) => (b.plays || 0) - (a.plays || 0) || (b.rating || 0) - (a.rating || 0));
}

function renderCatalogGrid(allWorks) {
  const root = document.querySelector("[data-feed='catalog']");
  if (!root) return;
  const type = root.getAttribute("data-type");
  const sort = document.querySelector(".sort-bar .sort-btn.active")?.getAttribute("data-sort") || "popular";
  let works = type ? allWorks.filter((work) => work.story_type === type) : allWorks;
  const params = new URLSearchParams(location.search);
  const query = (params.get("q") || "").trim().toLowerCase();
  if (query) {
    works = works.filter((work) =>
      [work.title, work.author, work.fandom, work.description].join(" ").toLowerCase().includes(query)
    );
  }
  const typeFilter = params.get("type");
  if (typeFilter) works = works.filter((work) => work.story_type === typeFilter);
  ["romance", "age", "fandom"].forEach((key) => {
    const value = params.get(key);
    if (!value) return;
    works = works.filter((work) => String(work[key] || "") === value);
  });
  const status = params.get("status");
  if (status === "completed") works = works.filter((work) => work.is_completed);
  if (status === "in_progress") works = works.filter((work) => !work.is_completed);
  const size = params.get("size");
  if (size) works = works.filter((work) => work.work_size === size);
  const empty =
    type === "linear"
      ? "Линейные истории появятся здесь после публикации."
      : type === "interactive"
        ? "Интерактивные работы появятся здесь после публикации."
        : "Работы появятся здесь, как только авторы начнут публиковать.";
  renderFeed("catalog", sortWorks(works, sort), empty);
}

function renderAuthorsGrid(authors) {
  const root = document.querySelector("[data-feed='authors-grid']");
  if (!root) return;
  if (!authors.length) {
    root.innerHTML = emptyHTML("Авторы появятся вместе с первыми работами.");
    return;
  }
  root.innerHTML = authors
    .map(
      (author) => `
      <a class="author-card" href="${escapeHtml(author.href || "profile.html")}">
        <span class="author-avatar">${author.avatar ? `<img src="${escapeHtml(author.avatar)}" alt="">` : ""}</span>
        <span>
          <span class="author-name">${escapeHtml(author.display_name)}</span>
          <p class="author-stats">${author.rating_avg ? Number(author.rating_avg).toFixed(1) : "—"} · ${author.story_count || 0} работ</p>
        </span>
      </a>`
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", () => {
  loadCatalog();
  document.querySelectorAll(".sort-bar .sort-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      document.querySelectorAll(".sort-bar .sort-btn").forEach((other) => other.classList.toggle("active", other === btn));
      renderCatalogGrid(window.__foxWorks || []);
    });
  });
  document.querySelectorAll("[data-scroll]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.querySelector(btn.getAttribute("data-scroll"));
      if (!target) return;
      const dir = btn.getAttribute("data-dir") === "prev" ? -1 : 1;
      target.scrollBy({ left: dir * 260, behavior: "smooth" });
    });
  });
});

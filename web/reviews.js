(function authorReviews() {
  const REVIEWS = [
    {
      role: "author",
      time: "2026-08-31T18:22:00",
      when: "31 августа 2026 в 18:22",
      name: "Хвостик",
      avatar: "assets/test/avatar-3.png",
      text: "На уровне «Хвост» третья глава «Микрофон и монохром» наконец открылась. Сцена в гримёрке стоит подписки — особенно когда зал стихает.",
      work: "Микрофон и монохром",
      workId: "mic-mono",
      workHref: "story-mic-mono.html",
      chapter: "Глава 3. Зал",
      chapterHref: "read-interactive.html?id=mic-mono&chapter=3",
    },
    {
      role: "author",
      time: "2024-05-24T18:42:00",
      when: "24 мая 2024 в 18:42",
      name: "Алиса",
      avatar: "assets/test/avatar-1.png",
      text: "Третья концовка стоит того, чтобы пройти заново. Кафе и парк читаются по-разному, но оба пути цепляют — особенно сцена у окна, когда Алекс молчит дольше, чем нужно.",
      work: "Тени прошлого",
      workId: "shadows",
      workHref: "story-shadows.html",
      chapter: "Глава 5. Признание",
      chapterHref: "read-interactive.html?id=shadows&chapter=5",
    },
    {
      role: "author",
      time: "2024-05-18T12:10:00",
      when: "18 мая 2024 в 12:10",
      name: "Никита",
      avatar: "assets/test/avatar-2.png",
      text: "Кафе или парк — всё равно возвращаюсь к прологу. Хочется увидеть ветку с Никитой раньше, а не только намёками в письмах.",
      work: "Тени прошлого",
      workId: "shadows",
      workHref: "story-shadows.html",
      chapter: "Глава 2. Ветки",
      chapterHref: "read-interactive.html?id=shadows&chapter=2",
    },
    {
      role: "author",
      time: "2024-05-12T09:03:00",
      when: "12 мая 2024 в 9:03",
      name: "Мария",
      avatar: "assets/test/avatar-4.png",
      text: "Перекрёсток держит. Правда одна, пути разные — это чувствуется уже с первой сцены.",
      work: "Перекрёсток проклятий",
      workId: "crossroads",
      workHref: "story-crossroads.html",
      chapter: "Глава 1. Перекрёсток",
      chapterHref: "read-interactive.html?id=crossroads&chapter=1",
    },
    {
      role: "author",
      time: "2024-04-30T21:14:00",
      when: "30 апреля 2024 в 21:14",
      name: "Север",
      avatar: "assets/test/avatar-7.png",
      text: "После сорванного концерта голоса звучат иначе. Хочется ещё одну ветку с залом и тишиной.",
      work: "Микрофон и монохром",
      workId: "mic-mono",
      workHref: "story-mic-mono.html",
      chapter: "Глава 3. Зал",
      chapterHref: "read-interactive.html?id=mic-mono&chapter=3",
    },
    {
      role: "coauthor",
      time: "2024-05-08T16:40:00",
      when: "8 мая 2024 в 16:40",
      name: "Ирис",
      avatar: "assets/test/avatar-8.png",
      text: "Письма лучше читать подряд. Третья глава тихая, но без неё первая кажется слишком резкой.",
      work: "Письма из прошлого",
      workId: "letters",
      workHref: "story-letters.html",
      chapter: "Глава 3. Последняя строка",
      chapterHref: "read-linear.html?id=letters&chapter=3",
    },
    {
      role: "editor",
      time: "2024-05-02T11:22:00",
      when: "2 мая 2024 в 11:22",
      name: "Мара",
      avatar: "assets/test/avatar-6.png",
      text: "После войны чай кажется слишком спокойным — и в этом как раз сила. Хочется перечитать диалог на кухне.",
      work: "Чай с мятой и шрамами",
      workId: "tea-scars",
      workHref: "story-tea-scars.html",
      chapter: "Глава 2. Кухня",
      chapterHref: "read-linear.html?id=tea-scars&chapter=2",
    },
  ];

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function cardHTML(item) {
    return `
      <article class="review-card" data-time="${escapeHtml(item.time)}" data-role="${escapeHtml(item.role)}">
        <img class="review-ava" src="${escapeHtml(item.avatar)}" alt="">
        <div class="review-who">
          <strong data-user-name="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong>
          <time datetime="${escapeHtml(item.time)}">${escapeHtml(item.when)}</time>
        </div>
        <div class="review-menu">
          <button type="button" class="review-menu-btn" aria-label="Ещё" aria-expanded="false"><img src="assets/ornaments/03_more.svg?v=3" alt=""></button>
          <div class="review-menu-dd" hidden>
            <button type="button" data-review-act="report"><img src="assets/svg/флаг.svg" alt=""> Пожаловаться</button>
            <button type="button" data-review-act="reward"><img src="assets/deco/present.svg" alt=""> Наградить</button>
            <button type="button" class="is-danger" data-review-act="delete"><img src="assets/svg/удалить.svg" alt=""> Удалить</button>
          </div>
        </div>
        <p class="review-text">${escapeHtml(item.text)}</p>
        <div class="review-refs">
          <a class="review-work" href="${escapeHtml(item.workHref)}">${escapeHtml(item.work)}</a>
          <a class="review-chapter" href="${escapeHtml(item.chapterHref)}"><img src="assets/deco/книга.svg" alt=""> ${escapeHtml(item.chapter)}</a>
        </div>
      </article>`;
  }

  function paint(root, items, emptyText) {
    if (!root) return;
    if (!items.length) {
      root.innerHTML = `<div class="empty-feed"><p>${escapeHtml(emptyText)}</p></div>`;
      return;
    }
    root.innerHTML = items.map(cardHTML).join("");
    if (typeof hydrateUserLinks === "function") hydrateUserLinks(root);
    if (typeof hydrateUiIcons === "function") hydrateUiIcons(root);
  }

  const groups = {
    author: REVIEWS.filter((item) => item.role === "author"),
    coauthor: REVIEWS.filter((item) => item.role === "coauthor"),
    editor: REVIEWS.filter((item) => item.role === "editor"),
  };
  groups.all = [...REVIEWS];

  paint(document.querySelector('[data-review-feed="all"]'), groups.all, "Отзывы появятся, когда читатели начнут оставлять их к историям.");
  paint(document.querySelector('[data-review-feed="author"]'), groups.author, "Отзывы к работам, где вы автор, появятся здесь.");
  paint(document.querySelector('[data-review-feed="coauthor"]'), groups.coauthor, "Отзывы к работам, где вы соавтор, появятся здесь.");
  paint(document.querySelector('[data-review-feed="editor"]'), groups.editor, "Отзывы к работам, которые вы редактируете, появятся здесь.");

  const counts = {
    all: groups.all.length,
    author: groups.author.length,
    coauthor: groups.coauthor.length,
    editor: groups.editor.length,
  };
  Object.entries(counts).forEach(([key, value]) => {
    document.querySelectorAll(`[data-cabinet-count="${key}"]`).forEach((el) => {
      el.textContent = String(value);
    });
  });

  function layouts() {
    return [...document.querySelectorAll(".review-layout")];
  }

  function closeReviewMenus(except) {
    document.querySelectorAll(".review-menu").forEach((menu) => {
      if (menu === except) return;
      menu.querySelector(".review-menu-btn")?.setAttribute("aria-expanded", "false");
      const dd = menu.querySelector(".review-menu-dd");
      if (dd) dd.hidden = true;
    });
  }

  function applyReviewSort() {
    const dir = document.getElementById("review-sort")?.value || "new";
    layouts().forEach((layout) => {
      const cards = [...layout.querySelectorAll(".review-card")];
      cards.sort((a, b) => {
        const ta = a.dataset.time || "";
        const tb = b.dataset.time || "";
        return dir === "old" ? ta.localeCompare(tb) : tb.localeCompare(ta);
      });
      cards.forEach((card) => layout.appendChild(card));
    });
  }

  document.getElementById("review-sort")?.addEventListener("change", applyReviewSort);
  document.querySelector(".reviews-view")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-review-view]");
    if (!btn) return;
    const view = btn.getAttribute("data-review-view");
    layouts().forEach((layout) => layout.classList.toggle("is-grid", view === "grid"));
    document.querySelectorAll("[data-review-view]").forEach((item) => {
      const on = item === btn;
      item.classList.toggle("is-on", on);
      item.classList.toggle("is-active", on);
      item.setAttribute("aria-pressed", on ? "true" : "false");
    });
  });
  document.addEventListener("click", (event) => {
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
    if (act) {
      const card = act.closest(".review-card");
      if (!card) return;
      const kind = act.getAttribute("data-review-act");
      if (kind === "delete") {
        if (!window.confirm("Удалить отзыв безвозвратно?")) return;
        card.remove();
      }
      else if (kind === "report") {
        closeReviewMenus();
        return;
      } else if (kind === "reward") {
        card.classList.add("is-rewarded");
        act.innerHTML = `<img src="assets/deco/present.svg" alt=""> Награждено`;
        act.disabled = true;
      }
      closeReviewMenus();
      return;
    }
    if (!event.target.closest(".review-menu")) closeReviewMenus();
  });
  applyReviewSort();
})();

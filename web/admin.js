(function adminCabinet() {
  const page = document.body.getAttribute("data-admin") || "";
  if (!page) return;

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function money(cents) {
    const n = Number(cents || 0) / 100;
    return `${n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽`;
  }

  function bytes(n) {
    if (window.FoxQuota?.formatBytes) return FoxQuota.formatBytes(n);
    const value = Math.max(0, Number(n) || 0);
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} КБ`;
    return `${(value / (1024 * 1024)).toFixed(1)} МБ`;
  }

  function navHtml(current) {
    const items = [
      ["admin.html", "home", "Обзор"],
      ["admin-reports.html", "reports", "Жалобы"],
      ["admin-messages.html", "messages", "Сообщения"],
      ["admin-content.html", "content", "Контент"],
      ["admin-fandoms.html", "fandoms", "Фандомы"],
    ];
    return `<nav class="admin-tabs">${items
      .map(
        ([href, id, label]) =>
          `<a href="${href}" class="${id === current ? "active" : ""}">${escapeHtml(label)}</a>`
      )
      .join("")}</nav>`;
  }

  async function gate() {
    if (!window.FoxApi) return false;
    try {
      await FoxApi.request("/api/admin/me");
      return true;
    } catch {
      const main = document.querySelector("[data-admin-root]");
      if (main) {
        main.innerHTML = `<p class="profile-meta">Кабинет администратора доступен только персоналу. Войдите как moonwander.</p>`;
      }
      return false;
    }
  }

  function barList(entries, maxHits) {
    const max = Math.max(1, maxHits || 0);
    return (entries || [])
      .map(([name, hits]) => {
        const pct = Math.round((Number(hits) / max) * 100);
        return `<li class="admin-bar">
          <span>${escapeHtml(name)}</span>
          <b>${hits}</b>
          <i style="width:${pct}%"></i>
        </li>`;
      })
      .join("");
  }

  function donut(subs, gifts) {
    const a = Math.abs(Number(subs) || 0);
    const b = Math.abs(Number(gifts) || 0);
    const total = a + b;
    const p = total ? Math.round((a / total) * 100) : 50;
    return `<div class="admin-donut" style="background:conic-gradient(var(--fox) 0 ${p}%, color-mix(in srgb, var(--sand) 55%, var(--fox)) ${p}% 100%)">
      <div class="admin-donut-hole">
        <b>${total ? Math.round(total / 100).toLocaleString("ru-RU") : 0} ₽</b>
        <span>оборот</span>
      </div>
    </div>
    <ul class="admin-legend">
      <li><i class="is-sub"></i> Подписки ${money(a)}</li>
      <li><i class="is-gift"></i> Подарки ${money(b)}</li>
    </ul>`;
  }

  async function home() {
    const data = await FoxApi.request("/api/admin/stats");
    const today = data.today || {};
    const sections = Object.entries(data.traffic?.sections || {});
    const sectionsToday = Object.entries(data.traffic?.sections_today || {});
    const maxSec = Math.max(1, ...sections.map((row) => Number(row[1]) || 0));
    const maxToday = Math.max(1, ...sectionsToday.map((row) => Number(row[1]) || 0));
    document.getElementById("admin-home").innerHTML = `
      <section class="settings-block admin-block">
        <h2>Сегодня</h2>
        <div class="admin-kpis">
          <article><p>Новые пользователи</p><b>${today.users || 0}</b></article>
          <article><p>Новые работы</p><b>${today.works || 0}</b><span>${today.published || 0} публикаций</span></article>
          <article><p>Посты в блогах</p><b>${today.blogs || 0}</b></article>
          <article><p>Сборники</p><b>${today.collections || 0}</b></article>
          <article><p>Комментарии</p><b>${today.comments || 0}</b></article>
          <article><p>Жалобы</p><b>${today.reports || 0}</b></article>
          <article><p>Доход за день</p><b>${money(today.income)}</b><span>подписки ${money(today.subs)} · подарки ${money(today.gifts)}</span></article>
          <article><p>Сейчас онлайн</p><b>${data.online || 0}</b></article>
        </div>
      </section>
      <section class="settings-block admin-block">
        <h2>Всего</h2>
        <div class="admin-kpis">
          <article><p>Пользователи</p><b>${data.users}</b></article>
          <article><p>Работы</p><b>${data.works}</b><span>${data.published} в каталоге</span></article>
          <article><p>Посты в блогах</p><b>${data.blogs || 0}</b></article>
          <article><p>Сборники</p><b>${data.collections || 0}</b></article>
          <article><p>Комментарии</p><b>${data.comments}</b></article>
          <article><p>Жалобы</p><b>${data.reports_total || 0}</b><span>${data.reports_open} без ответа</span></article>
          <article><p>Сообщения</p><b>${data.messages}</b></article>
          <article><p>Фандомы / персонажи</p><b>${data.fandoms} / ${data.characters}</b></article>
        </div>
      </section>
      <div class="admin-split">
        <section class="settings-block admin-block">
          <h2>Монетизация</h2>
          <div class="admin-money-chart">${donut(data.money?.subs, data.money?.gifts)}</div>
          <ul class="admin-money">
            <li>Подписки <b>${money(data.money?.subs)}</b></li>
            <li>Подарки <b>${money(data.money?.gifts)}</b></li>
            <li>Прочие покупки <b>${money(data.money?.other || data.money?.buy)}</b></li>
            <li>Пополнения <b>${money(data.money?.topup)}</b></li>
            <li>Возвраты <b>${money(data.money?.refund)}</b></li>
            <li>Выводы <b>${money(data.money?.payout)}</b></li>
          </ul>
        </section>
        <section class="settings-block admin-block">
          <h2>Активность · просмотры сегодня</h2>
          <ul class="admin-bars">${barList(sectionsToday, maxToday) || "<li>Пока тихо</li>"}</ul>
        </section>
      </div>
      <section class="settings-block admin-block">
        <h2>Просмотры по разделам</h2>
        <p class="profile-meta">Всего просмотров страниц: ${data.traffic?.total || 0}</p>
        <ul class="admin-bars">${barList(sections, maxSec)}</ul>
      </section>
      <section class="settings-block admin-block">
        <h2>Хранилище</h2>
        <p>Оценка по карточкам и тексту работ: ${bytes(data.storage?.bytes_est)}. Ключей музыки в главах: ${data.storage?.audio_keys || 0}.</p>
      </section>
      <section class="settings-block admin-block">
        <h2>Страницы</h2>
        <ul class="admin-list">${(data.traffic?.pages || [])
          .map((row) => `<li>${escapeHtml(row.path)} <b>${row.hits}</b></li>`)
          .join("") || "<li>Пусто</li>"}</ul>
      </section>`;
  }

  async function reports() {
    const data = await FoxApi.request("/api/admin/reports");
    const root = document.getElementById("admin-reports");
    root.innerHTML = (data.reports || [])
      .map((row) => {
        const href = row.target_url || "#";
        return `<article class="admin-row" data-report="${row.id}">
          <div>
            <p><b>${escapeHtml(row.target_title || row.target_type)}</b> · ${escapeHtml(row.status)}</p>
            <p class="profile-meta">${escapeHtml(row.reporter || row.username)} · ${escapeHtml(row.reason_code || row.target_type)}</p>
            <p>${escapeHtml(row.reason)}</p>
            <p class="admin-report-card"><a href="${escapeHtml(href)}">Открыть объект жалобы</a></p>
          </div>
          <div class="admin-row-acts">
            ${row.status === "open" ? `<button type="button" class="btn btn-outline" data-report-done="${row.id}">Закрыть</button>` : ""}
            ${row.username ? `<button type="button" class="btn btn-outline" data-warn="${escapeHtml(row.username)}">Предупреждение</button>` : ""}
          </div>
        </article>`;
      })
      .join("") || "<p class='profile-meta'>Жалоб пока нет.</p>";
    root.querySelectorAll("[data-report-done]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await FoxApi.request(`/api/admin/reports/${btn.getAttribute("data-report-done")}`, {
          method: "POST",
          body: JSON.stringify({ status: "done" }),
        });
        reports();
      });
    });
    bindWarn(root);
  }

  function bindWarn(root) {
    root.querySelectorAll("[data-warn]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const username = btn.getAttribute("data-warn");
        const reason = window.prompt(`Предупреждение для @${username}. Причина:`, "");
        if (!reason) return;
        const res = await FoxApi.request(`/api/admin/authors/${encodeURIComponent(username)}/warn`, {
          method: "POST",
          body: JSON.stringify({ reason }),
        });
        window.alert(res.blocked ? "Третье предупреждение: профиль заблокирован. Работы на месте." : `Предупреждение ${res.strikes} из ${res.limit}.`);
      });
    });
  }

  async function messages() {
    const root = document.getElementById("admin-messages");
    const data = await FoxApi.request("/api/admin/messages");
    const threads = data.threads || [];
    root.innerHTML = `<div class="admin-chat">
      <aside class="admin-chat-list" id="admin-chat-list"></aside>
      <section class="admin-chat-pane">
        <header class="admin-chat-head" id="admin-chat-head">Выберите чат</header>
        <div class="admin-chat-log" id="admin-chat-log"></div>
        <form class="admin-chat-form" id="admin-chat-form" hidden>
          <textarea name="body" rows="2" required placeholder="Ответ в директ…"></textarea>
          <button type="submit" class="btn btn-primary">Отправить</button>
        </form>
      </section>
    </div>`;
    const list = document.getElementById("admin-chat-list");
    list.innerHTML = threads
      .map(
        (thread) => `<button type="button" class="admin-chat-user" data-thread="${thread.id}">
          <b>${escapeHtml(thread.peer?.display_name || thread.title)}</b>
          <span>${escapeHtml(thread.preview || "")}</span>
          <time>${escapeHtml(thread.time || "")}</time>
        </button>`
      )
      .join("") || "<p class='profile-meta'>Пока никто не писал.</p>";
    let current = null;
    async function openThread(id) {
      current = id;
      list.querySelectorAll(".admin-chat-user").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-thread") === String(id));
      });
      const thread = await FoxApi.request(`/api/admin/messages/${id}`);
      document.getElementById("admin-chat-head").textContent =
        thread.peer?.display_name || thread.title || "Чат";
      document.getElementById("admin-chat-log").innerHTML = (thread.messages || [])
        .map(
          (msg) => `<div class="admin-chat-msg${msg.mine ? " is-mine" : ""}">
            <p>${escapeHtml(msg.body).replaceAll("\n", "<br>")}</p>
            <time>${escapeHtml(msg.time || "")}</time>
          </div>`
        )
        .join("") || "<p class='profile-meta'>Пусто</p>";
      const form = document.getElementById("admin-chat-form");
      form.hidden = false;
      const log = document.getElementById("admin-chat-log");
      log.scrollTop = log.scrollHeight;
    }
    list.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-thread]");
      if (btn) openThread(btn.getAttribute("data-thread"));
    });
    document.getElementById("admin-chat-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!current) return;
      const field = event.target.querySelector("[name=body]");
      const body = field.value.trim();
      if (!body) return;
      field.value = "";
      await FoxApi.request(`/api/admin/messages/${current}`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      openThread(current);
      const first = list.querySelector(`[data-thread="${current}"]`);
      if (first) list.prepend(first);
    });
    if (threads[0]) openThread(threads[0].id);
  }

  async function content() {
    const q = document.getElementById("admin-content-q")?.value || "";
    const data = await FoxApi.request(`/api/admin/content?q=${encodeURIComponent(q)}`);
    const works = document.getElementById("admin-works");
    const comments = document.getElementById("admin-comments");
    works.innerHTML = (data.works || [])
      .map(
        (work) => `<article class="admin-row">
          <div>
            <p><a href="${escapeHtml(work.href)}">${escapeHtml(work.title)}</a></p>
            <p class="profile-meta">${escapeHtml(work.author)} · ${escapeHtml(work.type)} · ${escapeHtml(work.status)}</p>
          </div>
          <div class="admin-row-acts">
            <a class="btn btn-outline" href="${escapeHtml(work.studio)}">Карточка</a>
            ${work.username ? `<button type="button" class="btn btn-outline" data-warn="${escapeHtml(work.username)}">Предупреждение</button>` : ""}
            <button type="button" class="btn btn-outline" data-del-work="${work.id}" data-title="${escapeHtml(work.title)}">Удалить работу</button>
          </div>
        </article>`
      )
      .join("") || "<p class='profile-meta'>Работ нет.</p>";
    comments.innerHTML = (data.comments || [])
      .map(
        (row) => `<article class="admin-row">
          <div>
            <p>${escapeHtml(row.body)}</p>
            <p class="profile-meta">${escapeHtml(row.author)} · ${escapeHtml(row.target_type)} ${escapeHtml(row.target_key)}</p>
          </div>
          <button type="button" class="btn btn-outline" data-del-comment="${row.id}">Удалить</button>
        </article>`
      )
      .join("") || "<p class='profile-meta'>Комментариев нет.</p>";
    works.querySelectorAll("[data-del-work]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const done = await FoxAdmin.remove({ kind: "work", work_id: Number(btn.getAttribute("data-del-work")), title: "Удалить работу" });
        if (done) content();
      });
    });
    comments.querySelectorAll("[data-del-comment]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const done = await FoxAdmin.remove({ kind: "comment", id: Number(btn.getAttribute("data-del-comment")), title: "Удалить комментарий" });
        if (done) content();
      });
    });
    bindWarn(works);
  }

  async function fandoms() {
    const params = new URLSearchParams(location.search);
    const category = params.get("category") || "";
    const q = document.getElementById("admin-fandom-q")?.value || "";
    if (!category) {
      const data = await FoxApi.request("/api/admin/fandoms/categories");
      document.getElementById("admin-fandoms-lead").textContent = "Категории фандомов. Нажмите, чтобы открыть список.";
      document.getElementById("admin-fandoms").innerHTML = (data.categories || [])
        .map(
          (cat) => `<a class="admin-cat" href="admin-fandoms.html?category=${encodeURIComponent(cat.slug)}">
            <b>${escapeHtml(cat.name)}</b>
            <span>${cat.count}</span>
          </a>`
        )
        .join("");
      document.getElementById("admin-fandom-add")?.setAttribute("hidden", "");
      return;
    }
    document.getElementById("admin-fandom-add")?.removeAttribute("hidden");
    const data = await FoxApi.request(
      `/api/admin/fandoms?category=${encodeURIComponent(category)}&q=${encodeURIComponent(q)}`
    );
    const catName = new URLSearchParams(location.search).get("category");
    document.getElementById("admin-fandoms-lead").innerHTML =
      `<a href="admin-fandoms.html">Категории</a> · ${escapeHtml(catName)}`;
    document.getElementById("admin-fandoms").innerHTML = (data.fandoms || [])
      .map(
        (row) => `<article class="admin-row">
          <div>
            <p><a href="admin-fandom.html?slug=${encodeURIComponent(row.slug)}">${escapeHtml(row.name)}</a></p>
            <p class="profile-meta">${row.characters} персонажей · ${escapeHtml(row.slug)}</p>
          </div>
          <div class="admin-row-acts">
            <button type="button" class="btn btn-outline" data-edit-fandom="${row.id}" data-name="${escapeHtml(row.name)}">Править</button>
            <button type="button" class="btn btn-outline" data-del-fandom="${row.id}">Удалить</button>
          </div>
        </article>`
      )
      .join("") || "<p class='profile-meta'>В этой категории пока нет фандомов.</p>";
    document.querySelectorAll("[data-edit-fandom]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const name = window.prompt("Название фандома", btn.getAttribute("data-name") || "");
        if (!name) return;
        await FoxApi.request(`/api/admin/fandoms/${btn.getAttribute("data-edit-fandom")}`, {
          method: "PUT",
          body: JSON.stringify({ name }),
        });
        fandoms();
      });
    });
    document.querySelectorAll("[data-del-fandom]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!window.confirm("Удалить фандом из базы?")) return;
        try {
          await FoxApi.request(`/api/admin/fandoms/${btn.getAttribute("data-del-fandom")}`, { method: "DELETE" });
          fandoms();
        } catch (err) {
          window.alert(err.message || "Не удалось удалить");
        }
      });
    });
  }

  async function fandom() {
    const slug = new URLSearchParams(location.search).get("slug") || "";
    const data = await FoxApi.request(`/api/admin/fandoms/${encodeURIComponent(slug)}/characters`);
    document.getElementById("admin-fandom-title").textContent = data.fandom?.name || slug;
    document.getElementById("admin-fandom-lead").innerHTML =
      `<a href="admin-fandoms.html">Категории</a> · <a href="admin-fandoms.html?category=${encodeURIComponent(data.fandom?.category || "")}">${escapeHtml(data.fandom?.category || "")}</a>`;
    document.getElementById("admin-characters").innerHTML = (data.characters || [])
      .map(
        (row) => `<article class="admin-row">
          <p>${escapeHtml(row.name)}</p>
          <div class="admin-row-acts">
            <button type="button" class="btn btn-outline" data-edit-char="${row.id}" data-name="${escapeHtml(row.name)}">Править</button>
            <button type="button" class="btn btn-outline" data-del-char="${row.id}">Удалить</button>
          </div>
        </article>`
      )
      .join("") || "<p class='profile-meta'>Персонажей нет.</p>";
    document.querySelectorAll("[data-edit-char]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const name = window.prompt("Имя персонажа", btn.getAttribute("data-name") || "");
        if (!name) return;
        await FoxApi.request(`/api/admin/characters/${btn.getAttribute("data-edit-char")}`, {
          method: "PUT",
          body: JSON.stringify({ name }),
        });
        fandom();
      });
    });
    document.querySelectorAll("[data-del-char]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!window.confirm("Удалить персонажа?")) return;
        await FoxApi.request(`/api/admin/characters/${btn.getAttribute("data-del-char")}`, { method: "DELETE" });
        fandom();
      });
    });
  }

  async function start() {
    if (!(await gate())) return;
    if (page === "home") await home();
    if (page === "reports") await reports();
    if (page === "messages") await messages();
    if (page === "content") {
      document.getElementById("admin-content-search")?.addEventListener("submit", (event) => {
        event.preventDefault();
        content();
      });
      await content();
    }
    if (page === "fandoms") {
      document.getElementById("admin-fandom-search")?.addEventListener("submit", (event) => {
        event.preventDefault();
        fandoms();
      });
      document.getElementById("admin-fandom-add")?.addEventListener("click", async () => {
        const category = new URLSearchParams(location.search).get("category") || "";
        const name = window.prompt("Название нового фандома");
        if (!name) return;
        await FoxApi.request("/api/admin/fandoms", {
          method: "POST",
          body: JSON.stringify({ name, category }),
        });
        fandoms();
      });
      await fandoms();
    }
    if (page === "fandom") {
      document.getElementById("admin-char-add")?.addEventListener("click", async () => {
        const slug = new URLSearchParams(location.search).get("slug") || "";
        const name = window.prompt("Имя персонажа");
        if (!name) return;
        await FoxApi.request(`/api/admin/fandoms/${encodeURIComponent(slug)}/characters`, {
          method: "POST",
          body: JSON.stringify({ name }),
        });
        fandom();
      });
      await fandom();
    }
  }

  document.querySelectorAll("[data-admin-nav]").forEach((el) => {
    el.innerHTML = navHtml(page);
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

(function foxMessagesBoot() {
  const page = (location.pathname.split("/").pop() || "").toLowerCase();
  if (page !== "messages.html") {
    window.FoxMessagesReady = Promise.resolve();
    return;
  }

  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function rowHTML(msg) {
    const ava = esc(msg.sender?.avatar || "assets/deco/fox.svg");
    const body = `<p>${esc(msg.body).replace(/\n/g, "<br>")}</p>`;
    if (msg.mine) {
      return `<div class="msg-row is-mine" data-msg-id="${msg.id || ""}"><div class="msg-bubble mine">${body}<time>${esc(msg.time)}</time></div></div>`;
    }
    return `<div class="msg-row" data-msg-id="${msg.id || ""}"><img class="msg-ava" src="${ava}" alt=""><div class="msg-bubble">${body}<time>${esc(msg.time)}</time></div></div>`;
  }

  function composerHTML(thread) {
    if (thread.can_reply === false) {
      return `<p class="msg-thread-status" style="padding:12px 16px">На системные письма ответить нельзя. Вопросы — в чат «Поддержка».</p>`;
    }
    const placeholder = thread.kind === "system" ? "Сообщение всем как системное" : "Сообщение";
    return `<form class="msg-composer" data-msg-composer>
      <div class="msg-reply-bar" data-msg-reply hidden>
        <div><b>Ответ</b><span data-msg-reply-text></span></div>
        <button type="button" data-msg-reply-cancel aria-label="Отменить ответ">×</button>
      </div>
      <div class="msg-attach-list" data-msg-attach-list hidden></div>
      <div class="msg-composer-row">
        <button type="button" class="icon-btn" data-msg-attach aria-label="Прикрепить файл">
          <img src="assets/svg/скрепка.svg" alt="">
        </button>
        <input type="file" hidden multiple data-msg-file accept="image/*,.pdf,.txt,.doc,.docx,.zip,.epub">
        <textarea name="text" rows="1" placeholder="${esc(placeholder)}"></textarea>
        <button type="submit" class="btn btn-primary">Отправить</button>
      </div>
    </form>`;
  }

  function itemHTML(thread, activeId) {
    const kind = thread.kind || "direct";
    const ava = esc(thread.peer?.avatar || "assets/deco/fox.svg");
    return `<button type="button" class="msg-item${String(thread.id) === String(activeId) ? " active" : ""}" data-thread="${thread.id}" data-kind="${esc(kind)}">
      <img class="msg-ava" src="${ava}" alt="">
      <span class="msg-item-text">
        <span class="msg-item-top">
          <b>${esc(thread.title)}</b>
          <time datetime="${esc(thread.updated_at)}">${esc(thread.time)}</time>
        </span>
        <span class="msg-item-preview">${esc(thread.preview || "Нет сообщений")}</span>
      </span>
    </button>`;
  }

  function paneHTML(thread) {
    const ava = esc(thread.peer?.avatar || "assets/deco/fox.svg");
    const status = thread.kind === "system" ? "системная рассылка" : thread.kind === "support" ? "чат с поддержкой" : "";
    const messages = (thread.messages || []).map(rowHTML).join("");
    return `<div class="msg-thread" data-thread="${thread.id}" data-kind="${esc(thread.kind || "")}" hidden>
      <div class="msg-thread-head">
        <button type="button" class="side-toggle msg-chats-toggle" data-side-toggle aria-controls="msg-chats" aria-expanded="false" aria-label="Чаты">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <img class="msg-ava" src="${ava}" alt="">
        <div class="msg-thread-who">
          <b data-user-name="${esc(thread.title)}">${esc(thread.title)}</b>
          <span class="msg-thread-status">${esc(status)}</span>
        </div>
        <div class="msg-menu">
          <button type="button" class="msg-menu-btn" data-msg-menu aria-label="Ещё" aria-expanded="false">
            <img src="assets/ornaments/03_more.svg?v=3" alt="">
          </button>
          <div class="msg-menu-dd" hidden>
            <button type="button" data-msg-act="pin"><img src="assets/svg/кнопка.svg" alt=""> Закрепить чат</button>
            <button type="button" data-msg-act="clear"><img src="assets/svg/none.svg" alt=""> Очистить историю</button>
            <button type="button" data-msg-act="mute"><img src="assets/svg/mute.svg" alt=""> Выключить уведомления</button>
            <button type="button" class="is-danger" data-msg-act="delete"><img src="assets/svg/удалить.svg" alt=""> Удалить чат</button>
            <button type="button" data-msg-act="block"><img src="assets/svg/warn.svg" alt=""> Заблокировать</button>
          </div>
        </div>
      </div>
      <div class="msg-select-bar" data-msg-select-bar hidden>
        <span data-msg-select-count>0 выбрано</span>
        <button type="button" data-msg-select-cancel>Отмена</button>
      </div>
      <div class="msg-pin-bar" data-msg-pin-bar hidden>
        <img src="assets/svg/кнопка.svg" alt="">
        <div class="msg-pin-copy"><b>Закреплено</b><span data-msg-pin-text></span></div>
        <button type="button" class="msg-pin-off" data-msg-unpin aria-label="Открепить">×</button>
      </div>
      <div class="msg-thread-log">${messages}</div>
      ${composerHTML(thread)}
    </div>`;
  }

  async function loadList() {
    if (!window.FoxApi) return { threads: [] };
    return FoxApi.request("/api/messages/threads");
  }

  async function loadOne(id) {
    if (!window.FoxApi || !id) return null;
    return FoxApi.request(`/api/messages/threads/${encodeURIComponent(id)}`);
  }

  function pickOpen(threads) {
    const params = new URLSearchParams(location.search);
    const want = params.get("thread") || "";
    if (want === "support") return threads.find((t) => t.kind === "support");
    if (want === "system") return threads.find((t) => t.kind === "system");
    if (want) return threads.find((t) => String(t.id) === want);
    const to = (params.get("to") || "").replace(/^@/, "").trim().toLowerCase();
    if (to) {
      return threads.find((t) => String(t.peer?.username || "").toLowerCase() === to) || threads[0] || null;
    }
    return threads[0] || null;
  }

  async function render() {
    const list = document.getElementById("msg-chats");
    const panes = document.querySelector(".msg-panes");
    const empty = document.getElementById("msg-empty");
    let data = { threads: [] };
    try {
      data = await loadList();
    } catch {
      if (empty) empty.textContent = "Не удалось открыть сообщения. Запустите backend: cd backend && ./run.sh";
      return;
    }
    const threads = Array.isArray(data.threads) ? data.threads : [];
    const open = pickOpen(threads);
    if (list) list.innerHTML = threads.map((thread) => itemHTML(thread, open?.id)).join("");
    const details = [];
    for (const thread of threads) {
      try {
        details.push(await loadOne(thread.id));
      } catch {
        details.push(thread);
      }
    }
    if (panes) {
      panes.innerHTML = (empty ? empty.outerHTML : "") + details.filter(Boolean).map(paneHTML).join("");
    }
    const emptyEl = document.getElementById("msg-empty");
    if (open) {
      if (emptyEl) emptyEl.hidden = true;
      document.querySelectorAll(".msg-thread").forEach((pane) => {
        pane.hidden = String(pane.getAttribute("data-thread")) !== String(open.id);
      });
    } else if (emptyEl) {
      emptyEl.hidden = false;
    }
  }

  window.FoxMessagesReady = (async () => {
    if (document.readyState === "loading") {
      await new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
    }
    const to = new URLSearchParams(location.search).get("to") || "";
    const handle = to.replace(/^@/, "").trim();
    if (handle && window.FoxApi && !new URLSearchParams(location.search).get("thread")) {
      try {
        const thread = await FoxApi.request("/api/messages", {
          method: "POST",
          body: JSON.stringify({ to: handle }),
        });
        if (thread?.id) {
          location.replace(`messages.html?thread=${encodeURIComponent(thread.id)}`);
          return;
        }
      } catch (err) {
        const empty = document.getElementById("msg-empty");
        if (empty) empty.textContent = err.message || "Не удалось открыть диалог";
      }
    }
    await render();
  })();
})();

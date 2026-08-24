(function newsPage() {
  const SCRIPT_SRC = document.currentScript?.src || "";
  const STORE = "foxtoria-news";
  const COMMENTS = "foxtoria-news-comments";
  const VIEWS = "foxtoria-news-views";
  const SAVED = "foxtoria-news-saved";
  const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const COLLAPSE_AT = 220;

  const ico = {
    bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.2L6 20V5.5a1 1 0 0 1 1-1Z"/></svg>',
    comment: '<img src="assets/deco/news-comments.png" alt="">',
    eye: '<img src="assets/deco/news-views.png" alt="">',
  };

  function newsUrl() {
    if (SCRIPT_SRC) return new URL("news.json", SCRIPT_SRC).href;
    return "news.json";
  }

  function loadJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || "") || fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function sanitize(html) {
    const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    doc.querySelectorAll("script,iframe,object,style,link").forEach((el) => el.remove());
    const allowed = new Set(["P", "BR", "IMG", "STRONG", "EM", "B", "I", "A", "UL", "OL", "LI", "BLOCKQUOTE", "H3", "H4", "SPAN", "DIV"]);
    doc.body.querySelectorAll("*").forEach((el) => {
      [...el.attributes].forEach((attr) => {
        if (/^on/i.test(attr.name) || (attr.name === "href" && /^\s*javascript:/i.test(attr.value))) {
          el.removeAttribute(attr.name);
        }
      });
      if (!allowed.has(el.tagName)) el.replaceWith(...el.childNodes);
    });
    doc.querySelectorAll("img").forEach((img) => {
      img.removeAttribute("srcset");
      if (!img.getAttribute("src")) img.remove();
    });
    return doc.body.innerHTML;
  }

  function plainText(html) {
    const doc = new DOMParser().parseFromString(html || "", "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }

  function formatCommentWhen(date = new Date()) {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  function displayCommentWhen(item) {
    const stamp = normalizeCommentDate(item.when);
    return item.edited ? `изм. ${stamp}` : stamp;
  }

  function normalizeCommentDate(when) {
    const value = String(when || "").trim();
    if (/^\d{2}\/\d{2}\/\d{2}$/.test(value)) return value;
    const named = value.match(/(\d{1,2})\s+([а-яё]+)/i);
    if (named) {
      const month = MONTHS.findIndex((name) => name === named[2] || name.startsWith(named[2].slice(0, 3)));
      const year = Number((value.match(/20\d{2}/) || ["2026"])[0]);
      if (month >= 0) return formatCommentWhen(new Date(year, month, Number(named[1])));
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return formatCommentWhen(parsed);
    return value || formatCommentWhen();
  }

  function formatCount(n) {
    const value = Number(n) || 0;
    if (value >= 1000) return `${(value / 1000).toFixed(1).replace(".0", "")}K`;
    return String(value);
  }

  function slugify(title) {
    return String(title || "post")
      .toLowerCase()
      .replace(/[^a-zа-я0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || `post-${Date.now()}`;
  }

  function mergePosts(base) {
    const overlay = loadJson(STORE, { extras: [], edits: {}, deleted: [] });
    const deleted = new Set(overlay.deleted || []);
    const edits = overlay.edits || {};
    const extras = overlay.extras || [];
    const fromFile = (base || [])
      .filter((post) => !deleted.has(post.id))
      .map((post) => ({ ...post, ...(edits[post.id] || {}) }));
    const extra = extras.filter((post) => !deleted.has(post.id)).map((post) => ({ ...post, ...(edits[post.id] || {}) }));
    return [...extra, ...fromFile].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function commentId() {
    return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function localComments(postId) {
    const all = loadJson(COMMENTS, {});
    const list = all[postId] || [];
    let dirty = false;
    const next = list.map((item) => {
      if (item.id) return item;
      dirty = true;
      return { ...item, id: commentId() };
    });
    if (dirty) {
      all[postId] = next;
      saveJson(COMMENTS, all);
    }
    return next;
  }

  function commentsFor(id) {
    const seed = (posts.find((post) => post.id === id)?.comments || []).map((item, index) => ({
      ...item,
      id: item.id || `seed-${id}-${index}`,
    }));
    return [...seed, ...localComments(id)];
  }

  function isOwnComment(item) {
    return signed() && item.author === "Вы";
  }

  function saveLocalComments(postId, list) {
    const all = loadJson(COMMENTS, {});
    all[postId] = list;
    saveJson(COMMENTS, all);
  }

  function refreshComments(card, id) {
    const list = card.querySelector("[data-comment-list]");
    if (list) list.innerHTML = renderComments(id);
    const count = card.querySelector("[data-open-comments] span");
    if (count) count.textContent = String(commentCount(id));
  }

  function commentAvatar(item) {
    return item.avatar || "assets/deco/fox.svg";
  }

  function viewsFor(post) {
    const seen = loadJson(VIEWS, {});
    return (Number(post.views) || 0) + (Number(seen[post.id]) || 0);
  }

  function markView(id) {
    const seen = loadJson(VIEWS, {});
    if (seen[`${id}::once`]) return;
    seen[`${id}::once`] = 1;
    seen[id] = (Number(seen[id]) || 0) + 1;
    saveJson(VIEWS, seen);
  }

  function savedSet() {
    return new Set(loadJson(SAVED, []));
  }

  function toggleSaved(id) {
    const list = loadJson(SAVED, []);
    const next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
    saveJson(SAVED, next);
  }

  async function fileToDataUrl(file) {
    if (!file) return "";
    try {
      const bitmap = await createImageBitmap(file);
      const max = 1400;
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.86);
    } catch {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  }

  function insertHtml(editor, html) {
    editor.focus();
    const ok = document.execCommand("insertHTML", false, html);
    if (ok) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      editor.insertAdjacentHTML("beforeend", html);
      return;
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const node = range.createContextualFragment(html);
    range.insertNode(node);
  }

  let posts = [];

  function saveOverlay(mutator) {
    const overlay = loadJson(STORE, { extras: [], edits: {}, deleted: [] });
    mutator(overlay);
    saveJson(STORE, overlay);
  }

  function owner() {
    return typeof isSiteOwner === "function" ? isSiteOwner() : false;
  }

  function signed() {
    return typeof isSignedIn === "function" ? isSignedIn() : false;
  }

  function renderHome(list) {
    const root = document.querySelector("[data-news-home]");
    if (!root) return;
    root.innerHTML = list
      .slice(0, 3)
      .map(
        (post) => `
        <a href="news.html#${escapeHtml(post.id)}" class="tile-card news-home-card">
          <div class="tile-image">${post.cover ? `<img src="${escapeHtml(post.cover)}" alt="">` : ""}</div>
          <div>
            <h3>${escapeHtml(post.title)}</h3>
            <p>${escapeHtml(plainText(post.body).slice(0, 90))}</p>
          </div>
        </a>`
      )
      .join("");
  }

  function commentCount(id) {
    return commentsFor(id).length;
  }

  function truncateComment(text, max = 72) {
    const value = String(text || "").replace(/\s+/g, " ").trim();
    return value.length > max ? `${value.slice(0, max).trim()}…` : value;
  }

  function commentTools(item) {
    const buttons = [];
    if (signed()) buttons.push(`<button type="button" data-comment-reply>Ответить</button>`);
    if (isOwnComment(item)) {
      buttons.push(`<button type="button" data-comment-edit>Изменить</button>`);
      buttons.push(`<button type="button" data-comment-delete>Удалить</button>`);
    }
    return buttons.length ? `<span class="news-comment-tools">${buttons.join("")}</span>` : "";
  }

  function renderCommentItem(item, byId, children, depth) {
    const own = isOwnComment(item);
    const parent = item.replyTo ? byId.get(item.replyTo) : null;
    const replies = children.get(item.id) || [];
    return `
      <article class="news-comment${own ? " is-own" : ""}${depth ? " is-reply" : ""}" data-comment-id="${escapeHtml(item.id)}" style="--reply-depth:${Math.min(depth, 2)}">
        <img class="news-comment-ava" src="${escapeHtml(commentAvatar(item))}" alt="">
        <div class="news-comment-bubble">
          <div class="news-comment-head">
            <strong>${escapeHtml(item.author || "Читатель")}</strong>
            ${commentTools(item)}
          </div>
          ${
            parent
              ? `<div class="news-comment-quote">
                  <strong>${escapeHtml(parent.author || "Читатель")}</strong>
                  <span>${escapeHtml(truncateComment(parent.text))}</span>
                </div>`
              : ""
          }
          <p>${escapeHtml(item.text)}</p>
          <time>${escapeHtml(displayCommentWhen(item))}</time>
        </div>
      </article>
      ${replies.map((reply) => renderCommentItem(reply, byId, children, depth + 1)).join("")}`;
  }

  function renderComments(id) {
    const items = commentsFor(id);
    if (!items.length) return `<p class="news-comment-empty">Пока нет комментариев. Напишите первый.</p>`;
    const byId = new Map(items.map((item) => [item.id, item]));
    const children = new Map();
    const roots = [];
    items.forEach((item) => {
      if (item.replyTo && byId.has(item.replyTo)) {
        const list = children.get(item.replyTo) || [];
        list.push(item);
        children.set(item.replyTo, list);
      } else {
        roots.push(item);
      }
    });
    return `<div class="news-comment-list">${roots.map((item) => renderCommentItem(item, byId, children, 0)).join("")}</div>`;
  }

  function clearReply(form) {
    if (!form) return;
    delete form.dataset.replyTo;
    delete form.dataset.replyAuthor;
    form.querySelector("[data-reply-hint]")?.remove();
  }

  function beginReply(card, article) {
    const form = card.querySelector("[data-comment-form]");
    if (!form) {
      card.querySelector("[data-signin]")?.click();
      return;
    }
    const replyId = article.getAttribute("data-comment-id");
    const author = article.querySelector(".news-comment-head strong")?.textContent || "Читатель";
    form.dataset.replyTo = replyId;
    form.dataset.replyAuthor = author;
    let hint = form.querySelector("[data-reply-hint]");
    if (!hint) {
      hint = document.createElement("div");
      hint.className = "news-comment-reply-hint";
      hint.setAttribute("data-reply-hint", "");
      form.prepend(hint);
    }
    hint.innerHTML = `<span>Ответ для <strong></strong></span><button type="button" class="news-text-link" data-reply-cancel>Отмена</button>`;
    hint.querySelector("strong").textContent = author;
    const ta = form.querySelector("textarea");
    ta?.focus();
    form.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function removeCommentTree(list, targetId) {
    const drop = new Set([targetId]);
    let grew = true;
    while (grew) {
      grew = false;
      list.forEach((item) => {
        if (item.replyTo && drop.has(item.replyTo) && !drop.has(item.id)) {
          drop.add(item.id);
          grew = true;
        }
      });
    }
    return list.filter((item) => !drop.has(item.id));
  }

  function beginCommentEdit(article) {
    if (article.querySelector("[data-comment-save]")) return;
    const bubble = article.querySelector(".news-comment-bubble");
    const p = bubble?.querySelector("p");
    const tools = bubble?.querySelector(".news-comment-tools");
    const time = bubble?.querySelector("time");
    if (!p || !bubble) return;
    p.hidden = true;
    if (tools) tools.hidden = true;
    if (time) time.hidden = true;
    article.classList.add("is-editing");
    const form = document.createElement("form");
    form.setAttribute("data-comment-save", "");
    form.className = "news-comment-edit";
    const ta = document.createElement("textarea");
    ta.name = "text";
    ta.required = true;
    ta.rows = 3;
    ta.value = p.textContent || "";
    const actions = document.createElement("div");
    actions.className = "news-comment-edit-actions";
    actions.innerHTML = `
      <button type="submit" class="news-text-link">Сохранить</button>
      <button type="button" class="news-text-link" data-comment-cancel>Отмена</button>`;
    form.append(ta, actions);
    p.after(form);
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  function cardHTML(post) {
    const text = plainText(post.body);
    const long = text.length > COLLAPSE_AT;
    const excerpt = long ? `${text.slice(0, COLLAPSE_AT).trim()}…` : text;
    const saved = savedSet().has(post.id);
    const comments = commentCount(post.id);
    return `
      <article class="news-post" id="${escapeHtml(post.id)}" data-id="${escapeHtml(post.id)}">
        <div class="news-cover">${post.cover ? `<img src="${escapeHtml(post.cover)}" alt="">` : ""}</div>
        <div class="news-copy">
          <div class="news-top">
            <span class="news-cat">${escapeHtml((post.category || "Обновления").toUpperCase())}</span>
            <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time>
            <button type="button" class="news-icon-btn news-save${saved ? " is-on" : ""}" data-save aria-label="В закладки">${ico.bookmark}</button>
          </div>
          <h2>${escapeHtml(post.title)}</h2>
          <p class="news-excerpt">${escapeHtml(excerpt)}</p>
          <div class="news-full" hidden>${sanitize(post.body)}</div>
          <div class="news-foot">
            <button type="button" class="news-stat" data-open-comments>${ico.comment} <span>${comments}</span></button>
            <span class="news-stat">${ico.eye} <span data-views>${formatCount(viewsFor(post))}</span></span>
            ${long ? `<button type="button" class="news-more" data-expand>Читать далее →</button>` : `<button type="button" class="news-more" data-open-comments>Комментировать</button>`}
          </div>
          ${
            owner()
              ? `<div class="news-admin">
                  <button type="button" class="btn btn-ghost" data-edit>Редактировать</button>
                  <button type="button" class="btn btn-ghost" data-delete>Удалить</button>
                </div>`
              : ""
          }
          <div class="news-comments" hidden>
            <div data-comment-list>${renderComments(post.id)}</div>
            ${
              signed()
                ? `<form class="news-comment-form" data-comment-form>
                    <textarea name="text" rows="3" required placeholder="Ваш комментарий…"></textarea>
                    <button type="submit" class="btn btn-primary">Отправить</button>
                  </form>`
                : `<p class="news-comment-empty">Чтобы оставить комментарий, <button type="button" class="news-text-link" data-signin>войдите</button>.</p>`
            }
          </div>
        </div>
      </article>`;
  }

  function renderFeed() {
    const feed = document.getElementById("news-feed");
    if (!feed) return;
    if (!posts.length) {
      feed.innerHTML = `<div class="empty-feed"><p>Пока нет записей.</p></div>`;
      return;
    }
    feed.innerHTML = posts.map(cardHTML).join("");
  }

  function openCompose(post) {
    const formWrap = document.getElementById("news-compose");
    const feed = document.getElementById("news-feed");
    if (!formWrap) return;
    formWrap.hidden = false;
    if (feed) feed.hidden = true;
    const form = formWrap.querySelector("form");
    form.dataset.id = post?.id || "";
    form.category.value = post?.category || "Обновления";
    form.title.value = post?.title || "";
    form.cover.value = "";
    form.querySelector("[data-cover-preview]").src = post?.cover || "";
    form.querySelector("[data-cover-preview]").hidden = !post?.cover;
    form.dataset.cover = post?.cover || "";
    document.getElementById("news-editor").innerHTML = post?.body || "";
    formWrap.querySelector("h2").textContent = post ? "Редактировать пост" : "Новый пост";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeCompose() {
    const formWrap = document.getElementById("news-compose");
    const feed = document.getElementById("news-feed");
    if (formWrap) formWrap.hidden = true;
    if (feed) feed.hidden = false;
    const url = new URL(location.href);
    url.searchParams.delete("compose");
    url.searchParams.delete("edit");
    history.replaceState({}, "", url.pathname + url.hash);
  }

  function expandCard(card, withComments) {
    const full = card.querySelector(".news-full");
    const excerpt = card.querySelector(".news-excerpt");
    const comments = card.querySelector(".news-comments");
    const more = card.querySelector("[data-expand]");
    const id = card.getAttribute("data-id");
    if (full) {
      full.hidden = false;
      if (excerpt) excerpt.hidden = true;
    }
    if (withComments && comments) comments.hidden = false;
    if (more) more.textContent = "Свернуть";
    more?.setAttribute("data-collapse", "1");
    markView(id);
    const views = card.querySelector("[data-views]");
    const post = posts.find((item) => item.id === id);
    if (views && post) views.textContent = formatCount(viewsFor(post));
  }

  function collapseCard(card) {
    const full = card.querySelector(".news-full");
    const excerpt = card.querySelector(".news-excerpt");
    const comments = card.querySelector(".news-comments");
    const more = card.querySelector("[data-expand]");
    if (full && excerpt && excerpt.textContent.endsWith("…")) {
      full.hidden = true;
      excerpt.hidden = false;
    }
    if (comments) comments.hidden = true;
    if (more) {
      more.textContent = "Читать далее →";
      more.removeAttribute("data-collapse");
    }
  }

  function bindFeed() {
    const feed = document.getElementById("news-feed");
    if (!feed) return;
    feed.addEventListener("click", (event) => {
      const card = event.target.closest(".news-post");
      if (!card) return;
      const id = card.getAttribute("data-id");
      if (event.target.closest("[data-save]")) {
        toggleSaved(id);
        event.target.closest("[data-save]").classList.toggle("is-on");
        return;
      }
      if (event.target.closest("[data-expand]")) {
        const btn = event.target.closest("[data-expand]");
        if (btn.hasAttribute("data-collapse")) collapseCard(card);
        else expandCard(card, false);
        return;
      }
      if (event.target.closest("[data-open-comments]")) {
        expandCard(card, true);
        return;
      }
      if (event.target.closest("[data-comment-reply]")) {
        beginReply(card, event.target.closest(".news-comment"));
        return;
      }
      if (event.target.closest("[data-reply-cancel]")) {
        clearReply(card.querySelector("[data-comment-form]"));
        return;
      }
      if (event.target.closest("[data-comment-edit]")) {
        beginCommentEdit(event.target.closest(".news-comment"));
        return;
      }
      if (event.target.closest("[data-comment-cancel]")) {
        refreshComments(card, id);
        return;
      }
      if (event.target.closest("[data-comment-delete]")) {
        const commentId = event.target.closest(".news-comment")?.getAttribute("data-comment-id");
        if (!commentId || !confirm("Удалить комментарий?")) return;
        saveLocalComments(id, removeCommentTree(localComments(id), commentId));
        refreshComments(card, id);
        return;
      }
      if (event.target.closest("[data-edit]")) {
        const post = posts.find((item) => item.id === id);
        openCompose(post);
        return;
      }
      if (event.target.closest("[data-delete]")) {
        if (!confirm("Удалить эту новость?")) return;
        saveOverlay((overlay) => {
          overlay.deleted = [...new Set([...(overlay.deleted || []), id])];
          overlay.extras = (overlay.extras || []).filter((item) => item.id !== id);
          delete (overlay.edits || {})[id];
        });
        posts = posts.filter((item) => item.id !== id);
        renderFeed();
      }
    });
    feed.addEventListener("submit", (event) => {
      const editForm = event.target.closest("[data-comment-save]");
      if (editForm) {
        event.preventDefault();
        const card = editForm.closest(".news-post");
        const article = editForm.closest(".news-comment");
        const id = card.getAttribute("data-id");
        const commentId = article?.getAttribute("data-comment-id");
        const text = editForm.text.value.trim();
        if (!text || !commentId) return;
        saveLocalComments(
          id,
          localComments(id).map((item) =>
            item.id === commentId ? { ...item, text, edited: true, when: formatCommentWhen() } : item
          )
        );
        refreshComments(card, id);
        return;
      }
      const form = event.target.closest("[data-comment-form]");
      if (!form) return;
      event.preventDefault();
      const card = form.closest(".news-post");
      const id = card.getAttribute("data-id");
      const text = form.text.value.trim();
      if (!text) return;
      const replyTo = form.dataset.replyTo || "";
      saveLocalComments(id, [
        ...localComments(id),
        {
          id: commentId(),
          author: "Вы",
          own: true,
          avatar: "assets/deco/fox.svg",
          text,
          when: formatCommentWhen(),
          ...(replyTo ? { replyTo } : {}),
        },
      ]);
      refreshComments(card, id);
      clearReply(form);
      form.reset();
    });
  }

  function bindCompose() {
    const wrap = document.getElementById("news-compose");
    if (!wrap) return;
    const form = wrap.querySelector("form");
    const editor = document.getElementById("news-editor");
    wrap.querySelector("[data-cancel]")?.addEventListener("click", closeCompose);
    wrap.querySelector("[data-cover-input]")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const data = await fileToDataUrl(file);
      form.dataset.cover = data;
      const preview = wrap.querySelector("[data-cover-preview]");
      preview.src = data;
      preview.hidden = false;
    });
    wrap.querySelector("[data-insert-image]")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      const data = await fileToDataUrl(file);
      insertHtml(editor, `<p><img src="${data}" alt=""></p>`);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const title = form.title.value.trim();
      const body = sanitize(editor.innerHTML);
      if (!title || !plainText(body)) {
        alert("Нужны название и текст.");
        return;
      }
      const id = form.dataset.id || `${slugify(title)}-${Date.now()}`;
      const current = posts.find((item) => item.id === id);
      const payload = {
        id,
        title,
        category: form.category.value,
        date: form.dataset.id ? current?.date || new Date().toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        cover: form.dataset.cover || "",
        body,
        views: current?.views || 0,
        comments: current?.comments || [],
      };
      saveOverlay((overlay) => {
        overlay.deleted = (overlay.deleted || []).filter((item) => item !== id);
        if (posts.some((item) => item.id === id) && !(overlay.extras || []).some((item) => item.id === id)) {
          overlay.edits[id] = payload;
        } else {
          overlay.extras = [payload, ...(overlay.extras || []).filter((item) => item.id !== id)];
        }
      });
      closeCompose();
      const existed = posts.findIndex((item) => item.id === id);
      if (existed >= 0) posts[existed] = payload;
      else posts.unshift(payload);
      posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
      renderFeed();
    });
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-signin], [data-signout]")) return;
    setTimeout(() => {
      if (document.getElementById("news-feed") && document.getElementById("news-compose")?.hidden !== false) {
        renderFeed();
      }
    }, 0);
  });

  document.addEventListener("DOMContentLoaded", async () => {
    if (!localStorage.getItem(COMMENTS)) {
      saveJson(COMMENTS, {
        "editor-update": [
          { author: "Лиса с фонарём", text: "Ветки наконец не путаются. Спасибо.", when: "24 августа, 18:40" },
          { author: "Никита", text: "Автосохранение спасло черновик дважды за вечер.", when: "24 августа, 19:12" },
          { author: "Маша", text: "Жду шаблоны сцен.", when: "25 августа, 09:04" },
        ],
      });
    }
    let data = { posts: [] };
    try {
      const res = await fetch(newsUrl(), { cache: "no-store" });
      if (res.ok) data = await res.json();
    } catch {
      data = { posts: [] };
    }
    posts = mergePosts(data.posts || []);
    renderHome(posts);
    if (!document.getElementById("news-feed")) return;
    renderFeed();
    bindFeed();
    bindCompose();
    document.querySelector("[data-open-compose]")?.addEventListener("click", () => openCompose(null));
    const params = new URLSearchParams(location.search);
    if (params.get("compose") === "1" && owner()) openCompose(null);
    const editId = params.get("edit");
    if (editId && owner()) {
      const post = posts.find((item) => item.id === editId);
      if (post) openCompose(post);
    }
    const hash = location.hash.replace("#", "");
    if (hash) {
      const card = document.getElementById(hash);
      if (card) {
        expandCard(card, false);
        card.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });
})();

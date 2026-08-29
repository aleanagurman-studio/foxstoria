(function walletPage() {
  const STORE = "foxtoria-wallet";
  const TOPUP = 500;
  const CASHOUT = 300;

  const SPARK = `<img class="wallet-spark" src="assets/deco/sparcle.svg" alt="">`;

  const SEED_OPS = [
    { id: "op-seed-topup", kind: "topup", title: "Карта · •• 4242", when: "1 июля, 10:00", at: "2026-07-01T10:00:00", amount: 480 },
    { id: "op-p5", kind: "payout", title: "СБП · +7 •• 15-32", when: "12 июля, 11:20", at: "2026-07-12T11:20:00", amount: -180 },
    { id: "op-p6", kind: "payout", title: "Карта · •• 4242", when: "3 августа, 16:05", at: "2026-08-03T16:05:00", amount: -90 },
    { id: "op-p7", kind: "payout", title: "Карта · •• 4242", when: "10 августа, 09:40", at: "2026-08-10T09:40:00", amount: -140 },
    { id: "op-p8", kind: "payout", title: "СБП · +7 •• 15-32", when: "18 августа, 19:12", at: "2026-08-18T19:12:00", amount: -70 },
    { id: "op-1", kind: "topup", title: "Карта · •• 4242", when: "28 августа, 12:40", at: "2026-08-28T12:40:00", amount: 500 },
    { id: "op-2", kind: "buy", title: "Тени прошлого, глава 3", when: "28 августа, 13:02", at: "2026-08-28T13:02:00", amount: -79 },
    { id: "op-3", kind: "refund", title: "Тени прошлого, глава 3", when: "28 августа, 18:15", at: "2026-08-28T18:15:00", amount: 79 },
    { id: "op-4", kind: "payout", title: "Карта · •• 4242", when: "26 августа, 10:11", at: "2026-08-26T10:11:00", amount: -200 },
  ];

  const SEED_METHODS = [
    { id: "pay-1", kind: "card", title: "Карта", hint: "•• 4242" },
    { id: "pay-2", kind: "sbp", title: "СБП", hint: "+7 •• 15-32" },
  ];

  function coins(value, signed) {
    const n = Number(value) || 0;
    const num = new Intl.NumberFormat("ru-RU").format(Math.abs(n));
    const sign = signed ? (n > 0 ? "+" : n < 0 ? "−" : "") : "";
    return `${sign}${num}${SPARK}`;
  }

  function escapeText(value) {
    return String(value || "").replace(/[<>&"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[ch]));
  }

  function normalizeMethod(item) {
    const blob = `${item.kind || ""} ${item.title || ""} ${item.hint || ""}`;
    const kind = item.kind === "sbp" || /сбп|\+7/i.test(blob) ? "sbp" : "card";
    return {
      id: item.id,
      kind,
      title: kind === "sbp" ? "СБП" : "Карта",
      hint: item.hint || "",
    };
  }

  function maskHint(kind, value) {
    const raw = String(value || "").replace(/\s/g, "");
    if (kind === "sbp") {
      const digits = raw.replace(/\D/g, "");
      const tail = digits.slice(-4) || "0000";
      return `+7 •• ${tail.slice(0, 2)}-${tail.slice(2)}`;
    }
    const digits = raw.replace(/\D/g, "");
    return `•• ${digits.slice(-4).padStart(4, "0")}`;
  }

  function methodLine(item) {
    return `${item.title} · ${item.hint}`;
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || "null");
      if (raw && typeof raw === "object") {
        const methods = Array.isArray(raw.methods) ? raw.methods.map(normalizeMethod) : SEED_METHODS.map((item) => ({ ...item }));
        return {
          balance: Number(raw.balance) || 0,
          ops: Array.isArray(raw.ops) ? raw.ops : SEED_OPS,
          methods,
        };
      }
    } catch {
      /* ignore */
    }
    const balance = SEED_OPS.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    return {
      balance,
      ops: SEED_OPS.map((item) => ({ ...item })),
      methods: SEED_METHODS.map((item) => ({ ...item })),
    };
  }

  function save(data) {
    localStorage.setItem(STORE, JSON.stringify(data));
  }

  let state = load();
  if (!state.methods) {
    state.methods = SEED_METHODS.map((item) => ({ ...item }));
    save(state);
  }

  const EXTRA_PAYOUTS = SEED_OPS.filter((item) => item.id.startsWith("op-p"));
  (function fillPayoutHistory() {
    const ids = new Set((state.ops || []).map((item) => item.id));
    const add = EXTRA_PAYOUTS.filter((item) => !ids.has(item.id));
    if (!add.length) return;
    const extra = add.reduce((sum, item) => sum + Math.abs(Number(item.amount) || 0), 0);
    state.ops = state.ops.concat(add);
    if (!ids.has("op-seed-topup")) {
      state.ops.push({
        id: "op-seed-topup",
        kind: "topup",
        title: "Карта · •• 4242",
        when: "1 июля, 10:00",
        at: "2026-07-01T10:00:00",
        amount: extra,
      });
    }
    save(state);
  })();

  const KIND = {
    topup: "Пополнение",
    buy: "Покупка",
    refund: "Возврат",
    payout: "Вывод",
  };

  const MONTHS = {
    января: 0,
    февраля: 1,
    марта: 2,
    апреля: 3,
    мая: 4,
    июня: 5,
    июля: 6,
    августа: 7,
    сентября: 8,
    октября: 9,
    ноября: 10,
    декабря: 11,
  };

  function parseWhen(when) {
    const text = String(when || "");
    if (text === "только что") return Date.now();
    const match = text.match(/(\d{1,2})\s+([а-яё]+),\s*(\d{1,2}):(\d{2})/i);
    if (!match) return 0;
    const month = MONTHS[match[2].toLowerCase()];
    if (month == null) return 0;
    return new Date(2026, month, Number(match[1]), Number(match[3]), Number(match[4])).getTime();
  }

  function opTime(item) {
    const at = Date.parse(item.at || "") || Number(item.at) || 0;
    return at || parseWhen(item.when);
  }

  function opDetail(item) {
    const kindLabel = KIND[item.kind] || "";
    let title = String(item.title || "").trim();
    if (kindLabel && title.startsWith(kindLabel)) {
      title = title.replace(new RegExp(`^${kindLabel}\\s*[·•]\\s*`), "").trim();
    }
    return title;
  }

  function renderSum() {
    const el = document.querySelector("[data-wallet-sum]");
    if (el) el.innerHTML = coins(state.balance, false);
  }

  function renderOps() {
    const root = document.querySelector("[data-wallet-ops]");
    if (!root) return;
    const filter = document.querySelector("[data-wallet-op-filter]")?.value || "all";
    const sort = document.querySelector("[data-wallet-op-sort]")?.value || "new";
    const list = (state.ops || [])
      .filter((item) => filter === "all" || item.kind === filter)
      .slice()
      .sort((a, b) => (sort === "old" ? opTime(a) - opTime(b) : opTime(b) - opTime(a)));
    if (!list.length) {
      root.innerHTML = `<p class="profile-meta">${(state.ops || []).length ? "Нет операций этого типа." : "Операций пока нет."}</p>`;
      return;
    }
    root.innerHTML = list
      .map((item) => {
        const plus = Number(item.amount) > 0;
        const kindLabel = KIND[item.kind] || "Операция";
        const detail = opDetail(item);
        const meta = [detail, item.when].filter(Boolean).join(" · ");
        return `<article class="account-card wallet-op${plus ? " is-in" : " is-out"}">
          <div>
            <strong>${escapeText(kindLabel)}</strong>
            <p class="profile-meta">${escapeText(meta)}</p>
          </div>
          <span>${coins(item.amount, true)}</span>
        </article>`;
      })
      .join("");
  }

  const MONTH_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

  function startOfDay(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function addDays(value, count) {
    const date = startOfDay(value);
    date.setDate(date.getDate() + count);
    return date;
  }

  function startOfWeek(value) {
    const date = startOfDay(value);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return date;
  }

  function startOfMonth(value) {
    const date = startOfDay(value);
    date.setDate(1);
    return date;
  }

  function ymd(value) {
    const date = startOfDay(value);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function parseYmd(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return startOfDay(new Date());
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  function weekLabel(start) {
    return `${start.getDate()}.${String(start.getMonth() + 1).padStart(2, "0")}`;
  }

  const MONTH_FULL = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
  const MONTH_PICK = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

  function bindRangeCalendar() {
    const pop = document.querySelector("[data-wallet-cal]");
    const daysBox = pop?.querySelector("[data-cal-days]");
    const pickBox = pop?.querySelector("[data-cal-pick]");
    const titleBtn = pop?.querySelector("[data-cal-title]");
    const fromInput = document.querySelector("[data-wallet-chart-from]");
    const toInput = document.querySelector("[data-wallet-chart-to]");
    if (!pop || !daysBox || !pickBox || !titleBtn || !fromInput || !toInput) return;

    const state = { input: fromInput, cursor: startOfMonth(new Date()), picking: false };

    function close() {
      pop.hidden = true;
      state.picking = false;
    }

    function titleText() {
      return `${MONTH_FULL[state.cursor.getMonth()]} ${state.cursor.getFullYear()}`;
    }

    function renderDays() {
      const today = ymd(new Date());
      const selected = state.input.value;
      const year = state.cursor.getFullYear();
      const month = state.cursor.getMonth();
      const first = new Date(year, month, 1);
      const start = startOfWeek(first);
      const cells = [];
      for (let i = 0; i < 42; i += 1) {
        const date = addDays(start, i);
        const value = ymd(date);
        const muted = date.getMonth() !== month ? " is-muted" : "";
        const on = value === selected ? " is-on" : "";
        const now = value === today ? " is-today" : "";
        cells.push(`<button type="button" data-cal-day="${value}" class="${(muted + on + now).trim()}">${date.getDate()}</button>`);
      }
      daysBox.hidden = false;
      pickBox.hidden = true;
      titleBtn.textContent = titleText();
      daysBox.innerHTML = `<div class="wallet-cal-week">${WEEKDAYS.map((d) => `<span>${d}</span>`).join("")}</div>
        <div class="wallet-cal-grid">${cells.join("")}</div>`;
    }

    function renderPick() {
      const year = state.cursor.getFullYear();
      const month = state.cursor.getMonth();
      const nowYear = new Date().getFullYear();
      const years = [];
      for (let y = nowYear - 6; y <= nowYear + 4; y += 1) years.push(y);
      daysBox.hidden = true;
      pickBox.hidden = false;
      titleBtn.textContent = String(year);
      pickBox.innerHTML = `<div class="wallet-cal-months">${MONTH_PICK.map(
        (name, index) => `<button type="button" data-cal-month="${index}" class="${index === month ? "is-on" : ""}">${name}</button>`
      ).join("")}</div>
        <div class="wallet-cal-year-row">${years
          .map((y) => `<button type="button" data-cal-year="${y}" class="${y === year ? "is-on" : ""}">${y}</button>`)
          .join("")}</div>`;
    }

    function paint() {
      if (state.picking) renderPick();
      else renderDays();
    }

    function open(input) {
      state.input = input;
      state.cursor = startOfMonth(parseYmd(input.value));
      state.picking = false;
      const box = document.querySelector("[data-wallet-chart-range]");
      const left = input.getBoundingClientRect().left - box.getBoundingClientRect().left;
      pop.style.left = `${Math.max(0, left)}px`;
      pop.hidden = false;
      paint();
    }

    [fromInput, toInput].forEach((input) => {
      input.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        input.blur();
        if (!pop.hidden && state.input === input) close();
        else open(input);
      });
      input.addEventListener("click", (event) => event.preventDefault());
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open(input);
        }
        if (event.key === "Escape") close();
      });
    });

    pop.querySelector("[data-cal-prev]")?.addEventListener("click", () => {
      if (state.picking) state.cursor = new Date(state.cursor.getFullYear() - 1, state.cursor.getMonth(), 1);
      else state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() - 1, 1);
      paint();
    });
    pop.querySelector("[data-cal-next]")?.addEventListener("click", () => {
      if (state.picking) state.cursor = new Date(state.cursor.getFullYear() + 1, state.cursor.getMonth(), 1);
      else state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + 1, 1);
      paint();
    });
    titleBtn.addEventListener("click", () => {
      state.picking = !state.picking;
      paint();
    });
    pop.addEventListener("click", (event) => {
      const day = event.target.closest("[data-cal-day]");
      if (day) {
        state.input.value = day.getAttribute("data-cal-day");
        close();
        renderChart();
        return;
      }
      const monthBtn = event.target.closest("[data-cal-month]");
      if (monthBtn) {
        state.cursor = new Date(state.cursor.getFullYear(), Number(monthBtn.getAttribute("data-cal-month")), 1);
        state.picking = false;
        paint();
        return;
      }
      const yearBtn = event.target.closest("[data-cal-year]");
      if (yearBtn) {
        state.cursor = new Date(Number(yearBtn.getAttribute("data-cal-year")), state.cursor.getMonth(), 1);
        paint();
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (pop.hidden) return;
      if (pop.contains(event.target) || event.target === fromInput || event.target === toInput) return;
      close();
    });
  }

  function chartRange(grain) {
    const today = startOfDay(new Date());
    if (grain === "day") return { from: addDays(today, -13), to: today, bucket: "day" };
    if (grain === "week") return { from: startOfWeek(addDays(today, -49)), to: today, bucket: "week" };
    if (grain === "month") return { from: startOfMonth(new Date(today.getFullYear(), today.getMonth() - 5, 1)), to: today, bucket: "month" };
    const fromInput = document.querySelector("[data-wallet-chart-from]");
    const toInput = document.querySelector("[data-wallet-chart-to]");
    let from = fromInput?.value ? parseYmd(fromInput.value) : addDays(today, -29);
    let to = toInput?.value ? parseYmd(toInput.value) : today;
    if (from > to) {
      const swap = from;
      from = to;
      to = swap;
    }
    const span = Math.round((to - from) / 86400000) + 1;
    const bucket = span <= 21 ? "day" : span <= 90 ? "week" : "month";
    return { from, to, bucket };
  }

  function makeBuckets(from, to, bucket) {
    const items = [];
    if (bucket === "day") {
      for (let date = startOfDay(from); date <= to; date = addDays(date, 1)) {
        items.push({
          start: new Date(date),
          end: addDays(date, 1),
          label: `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`,
        });
      }
      return items;
    }
    if (bucket === "week") {
      let date = startOfWeek(from);
      const last = startOfWeek(to);
      while (date <= last) {
        const next = addDays(date, 7);
        items.push({ start: new Date(date), end: next, label: weekLabel(date) });
        date = next;
      }
      return items;
    }
    let date = startOfMonth(from);
    const last = startOfMonth(to);
    while (date <= last) {
      const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      items.push({ start: new Date(date), end: next, label: MONTH_SHORT[date.getMonth()] });
      date = next;
    }
    return items;
  }

  function renderChart() {
    const root = document.querySelector("[data-wallet-chart]");
    const totalEl = document.querySelector("[data-wallet-chart-total]");
    const rangeBox = document.querySelector("[data-wallet-chart-range]");
    const grain = document.querySelector("[data-wallet-chart-grain]")?.value || "day";
    if (rangeBox) rangeBox.hidden = grain !== "range";
    if (!root) return;
    const today = startOfDay(new Date());
    const fromInput = document.querySelector("[data-wallet-chart-from]");
    const toInput = document.querySelector("[data-wallet-chart-to]");
    if (fromInput && !fromInput.value) fromInput.value = ymd(addDays(today, -29));
    if (toInput && !toInput.value) toInput.value = ymd(today);
    const { from, to, bucket } = chartRange(grain);
    const rangeEnd = addDays(to, 1);
    const rows = makeBuckets(from, to, bucket);
    const payouts = (state.ops || []).filter((item) => item.kind === "payout");
    const values = rows.map((row) =>
      payouts.reduce((sum, item) => {
        const time = opTime(item);
        return time >= row.start.getTime() && time < row.end.getTime() ? sum + Math.abs(Number(item.amount) || 0) : sum;
      }, 0)
    );
    const total = payouts.reduce((sum, item) => {
      const time = opTime(item);
      return time >= from.getTime() && time < rangeEnd.getTime() ? sum + Math.abs(Number(item.amount) || 0) : sum;
    }, 0);
    if (totalEl) totalEl.innerHTML = coins(total, false);
    const max = Math.max(...values, 1);
    root.innerHTML = `<div class="wallet-chart-bars">${rows
      .map((row, index) => {
        const value = values[index];
        const height = value ? Math.max(10, Math.round((value / max) * 132)) : 8;
        return `<div class="wallet-chart-col" title="${escapeText(row.label)} · ${new Intl.NumberFormat("ru-RU").format(value)}">
            <span class="wallet-chart-bar${value ? "" : " is-empty"}" style="height:${height}px"></span>
            <time class="wallet-chart-label">${escapeText(row.label)}</time>
          </div>`;
      })
      .join("")}</div>`;
  }

  function renderMethods() {
    const root = document.querySelector("[data-wallet-methods]");
    if (!root) return;
    const list = state.methods || [];
    if (!list.length) {
      root.innerHTML = `<p class="profile-meta">Реквизитов пока нет. Добавьте карту или счёт СБП.</p>`;
      return;
    }
    root.innerHTML = list
      .map(
        (item) => `<article class="account-card settings-block-user">
          <div>
            <strong>${escapeText(item.title)}</strong>
            <p class="profile-meta">${escapeText(item.hint || "")}</p>
          </div>
          <div class="wallet-method-acts">
            <button type="button" class="wallet-method-act" data-pay-edit="${escapeText(item.id)}" aria-label="Редактировать"><img src="assets/svg/редактировать.svg" alt=""></button>
            <button type="button" class="wallet-method-act is-danger" data-pay-remove="${escapeText(item.id)}" aria-label="Удалить"><img src="assets/svg/удалить.svg" alt=""></button>
          </div>
        </article>`
      )
      .join("");
  }

  function pushOp(kind, title, amount) {
    state.balance += amount;
    state.ops.unshift({
      id: `op-${Date.now()}`,
      kind,
      title,
      when: "только что",
      at: new Date().toISOString(),
      amount,
    });
    save(state);
    renderSum();
    renderOps();
    renderChart();
  }

  function showTab(name) {
    document.querySelector(`.account-tabs [data-tab="${name}"]`)?.click();
  }

  const pickDialog = document.getElementById("wallet-pick-dialog");
  const pickList = document.querySelector("[data-wallet-pick-list]");
  const pickEmpty = document.querySelector("[data-wallet-pick-empty]");
  const pickGo = document.querySelector("[data-wallet-pick-go]");
  const pickTitle = document.getElementById("wallet-pick-title");
  let pickMode = "topup";

  function hidePick() {
    pickDialog.hidden = true;
  }

  function openPick(mode) {
    pickMode = mode;
    const methods = state.methods || [];
    const empty = !methods.length;
    if (mode === "payout" && !empty && state.balance < CASHOUT) return;
    pickTitle.textContent = mode === "topup" ? "Пополнить" : "Вывести";
    pickEmpty.hidden = !empty;
    pickGo.hidden = !empty;
    pickList.hidden = empty;
    pickList.innerHTML = empty
      ? ""
      : methods
          .map(
            (item) => `<button type="button" class="wallet-pick-item" data-pick-id="${escapeText(item.id)}">
              <strong>${escapeText(item.title)}</strong>
              <span>${escapeText(item.hint)}</span>
            </button>`
          )
          .join("");
    pickDialog.hidden = false;
  }

  function applyPick(id) {
    const method = (state.methods || []).find((item) => item.id === id);
    if (!method) return;
    if (pickMode === "topup") {
      pushOp("topup", methodLine(method), TOPUP);
    } else {
      if (state.balance < CASHOUT) return;
      pushOp("payout", methodLine(method), -CASHOUT);
    }
    hidePick();
  }

  const addDialog = document.getElementById("wallet-add-dialog");
  const addForm = document.querySelector("[data-wallet-add-form]");
  const addLabel = document.querySelector("[data-wallet-add-label]");
  const addTitle = document.getElementById("wallet-add-title");
  const addSubmit = document.querySelector("[data-wallet-add-submit]");
  let addKind = "card";
  let editingId = null;

  function hideAdd() {
    addDialog.hidden = true;
    editingId = null;
  }

  function openAdd(kind, id) {
    const item = id ? (state.methods || []).find((row) => row.id === id) : null;
    addKind = item ? item.kind : kind === "sbp" ? "sbp" : "card";
    editingId = item ? item.id : null;
    addTitle.textContent = item
      ? addKind === "sbp"
        ? "Изменить СБП"
        : "Изменить карту"
      : addKind === "sbp"
        ? "Счёт СБП"
        : "Карта";
    addLabel.textContent = addKind === "sbp" ? "Телефон" : "Номер карты";
    if (addSubmit) addSubmit.textContent = item ? "Сохранить" : "Добавить";
    const input = addForm.elements.namedItem("detail");
    input.placeholder = item
      ? item.hint
      : addKind === "sbp"
        ? "+7 900 000-00-00"
        : "•••• •••• •••• 4242";
    input.value = "";
    addDialog.hidden = false;
    input.focus();
  }

  document.querySelector("[data-wallet-topup]")?.addEventListener("click", () => openPick("topup"));
  document.querySelector("[data-wallet-cashout]")?.addEventListener("click", () => openPick("payout"));
  document.querySelector("[data-wallet-pick-cancel]")?.addEventListener("click", hidePick);
  document.querySelector("[data-wallet-pick-go]")?.addEventListener("click", () => {
    hidePick();
    showTab("balance");
  });
  pickDialog?.addEventListener("click", (event) => {
    if (event.target === pickDialog) hidePick();
  });
  pickList?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-pick-id]");
    if (!btn) return;
    applyPick(btn.getAttribute("data-pick-id"));
  });

  document.querySelectorAll("[data-wallet-add]").forEach((btn) => {
    btn.addEventListener("click", () => openAdd(btn.getAttribute("data-wallet-add")));
  });
  document.querySelector("[data-wallet-add-cancel]")?.addEventListener("click", hideAdd);
  addDialog?.addEventListener("click", (event) => {
    if (event.target === addDialog) hideAdd();
  });
  addForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = String(addForm.elements.namedItem("detail").value || "").trim();
    if (!value) return;
    state.methods = state.methods || [];
    const next = {
      id: editingId || `pay-${Date.now()}`,
      kind: addKind,
      title: addKind === "sbp" ? "СБП" : "Карта",
      hint: maskHint(addKind, value),
    };
    if (editingId) {
      state.methods = state.methods.map((item) => (item.id === editingId ? next : item));
    } else {
      state.methods.push(next);
    }
    save(state);
    renderMethods();
    hideAdd();
  });

  document.querySelector("[data-wallet-methods]")?.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-pay-edit]");
    if (edit) {
      openAdd(null, edit.getAttribute("data-pay-edit"));
      return;
    }
    const btn = event.target.closest("[data-pay-remove]");
    if (!btn) return;
    const id = btn.getAttribute("data-pay-remove");
    state.methods = (state.methods || []).filter((item) => item.id !== id);
    save(state);
    renderMethods();
  });

  document.querySelector("[data-wallet-op-filter]")?.addEventListener("change", renderOps);
  document.querySelector("[data-wallet-op-sort]")?.addEventListener("change", renderOps);
  document.querySelector("[data-wallet-chart-grain]")?.addEventListener("change", renderChart);
  document.querySelector("[data-wallet-chart-from]")?.addEventListener("change", renderChart);
  document.querySelector("[data-wallet-chart-to]")?.addEventListener("change", renderChart);

  bindRangeCalendar();
  renderSum();
  renderOps();
  renderChart();
  renderMethods();
})();

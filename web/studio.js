(function studioCabinet() {
  const views = document.querySelectorAll(".studio-view");
  const navButtons = document.querySelectorAll("[data-view]");
  const typeButtons = document.querySelectorAll(".studio-type-btn");
  const interactive = document.getElementById("timeline-interactive");
  const linear = document.getElementById("timeline-linear");
  const timelineLead = document.getElementById("timeline-lead");

  function showView(name, char, folder) {
    views.forEach((view) => {
      view.hidden = view.id !== `view-${name}`;
    });
    navButtons.forEach((btn) => {
      const on =
        btn.getAttribute("data-view") === name &&
        (btn.getAttribute("data-char") || null) === (char || null) &&
        (btn.getAttribute("data-folder") || null) === (folder || null);
      btn.classList.toggle("active", on);
    });
    document.querySelectorAll(".studio-item").forEach((item) => {
      if (item.getAttribute("data-view") === name) item.classList.add("active");
    });
    document.querySelectorAll("[data-char-card]").forEach((card) => {
      card.classList.toggle("highlight", Boolean(char) && card.getAttribute("data-char-card") === char);
    });
    document.querySelectorAll("[data-note]").forEach((card) => {
      card.classList.toggle("highlight", Boolean(folder) && card.getAttribute("data-note") === folder);
    });
  }

  navButtons.forEach((btn) => {
    if (btn.tagName === "A") return;
    btn.addEventListener("click", () => {
      showView(btn.getAttribute("data-view"), btn.getAttribute("data-char"), btn.getAttribute("data-folder"));
    });
  });

  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      typeButtons.forEach((other) => other.classList.remove("active"));
      btn.classList.add("active");
      const isLinear = btn.getAttribute("data-type") === "linear";
      interactive.hidden = isLinear;
      linear.hidden = !isLinear;
      timelineLead.textContent = isLinear
        ? "Для линейной истории шкала одна: события идут по времени мира."
        : "Для интерактивной истории шкала ветвится: это время мира, а не порядок чтения.";
    });
  });

  showView("editor");

  const form = document.getElementById("work-card-form");
  const sizeBox = document.getElementById("work-size");
  const chapterInput = document.getElementById("work-chapters");

  function sizeLabel(count) {
    if (!count || count < 1) return "укажите число глав";
    if (count <= 20) return "мини";
    if (count <= 50) return "миди";
    return "макси";
  }

  function refreshSize() {
    if (!sizeBox || !form) return;
    const completed = form.status.value === "completed";
    const count = Number(chapterInput.value);
    if (!completed) {
      sizeBox.textContent = "Размер появится после завершения. Мини — до 20 глав, миди — до 50, макси — дальше.";
      return;
    }
    sizeBox.textContent = `${sizeLabel(count)} · ${count || 0} ${count === 1 ? "глава" : "глав"}`;
  }

  form?.addEventListener("change", refreshSize);
  form?.addEventListener("input", refreshSize);
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    refreshSize();
  });
  refreshSize();
})();

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
})();

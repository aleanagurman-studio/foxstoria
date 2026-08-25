(function studioCabinet() {
  const views = document.querySelectorAll(".studio-view");
  const navButtons = document.querySelectorAll(".studio-nav [data-view]");
  const typeButtons = document.querySelectorAll(".studio-type-btn");
  const interactive = document.getElementById("timeline-interactive");
  const linear = document.getElementById("timeline-linear");
  const timelineLead = document.getElementById("timeline-lead");
  const publicPage = document.getElementById("studio-public-page");
  const openEditor = document.getElementById("studio-open-editor");
  const editorSub = document.getElementById("studio-editor-sub");
  const editorCta = document.getElementById("studio-editor-cta");
  const editorLead = document.getElementById("studio-editor-lead");

  function showView(name) {
    views.forEach((view) => {
      view.hidden = view.id !== `view-${name}`;
    });
    document.querySelectorAll(".studio-nav .studio-item[data-view]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-view") === name);
    });
  }

  function applyStoryType(isLinear) {
    const editorHref = isLinear ? "editor-linear.html" : "editor.html";
    if (openEditor) openEditor.href = editorHref;
    if (editorSub) editorSub.href = editorHref;
    if (editorCta) {
      editorCta.href = editorHref;
      editorCta.textContent = isLinear ? "Текстовый редактор" : "Граф сцен";
    }
    if (editorLead) {
      editorLead.textContent = isLinear
        ? "Главы идут по порядку — один текст, картинки в любых местах. Хронология и персонажи остаются в кабинете."
        : "Главы и сцены — это то, что пойдёт в публикацию. Хронология и персонажи живут рядом, но остаются в кабинете.";
    }
    if (interactive) interactive.hidden = isLinear;
    if (linear) linear.hidden = !isLinear;
    if (timelineLead) {
      timelineLead.textContent = isLinear
        ? "Для линейной истории шкала одна: события идут по времени мира."
        : "Для интерактивной истории шкала ветвится: это время мира, а не порядок чтения.";
    }
    if (publicPage) {
      publicPage.href = isLinear ? "story-linear.html" : "story-interactive.html";
    }
  }

  navButtons.forEach((btn) => {
    if (btn.tagName === "A") return;
    btn.addEventListener("click", () => showView(btn.getAttribute("data-view")));
  });

  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      typeButtons.forEach((other) => other.classList.remove("active"));
      btn.classList.add("active");
      applyStoryType(btn.getAttribute("data-type") === "linear");
    });
  });

  const initialLinear = document.querySelector(".studio-type-btn[data-type='linear']")?.classList.contains("active");
  applyStoryType(initialLinear);
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

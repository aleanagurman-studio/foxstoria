(async function workNewPage() {
  const form = document.getElementById("work-card-form");
  if (!form || !window.FoxWorks) return;
  await FoxWorks.hydrate();

  const preview = document.getElementById("work-cover-preview");
  let cover = "";

  document.getElementById("work-cover-input")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      cover = String(reader.result || "");
      if (preview) preview.src = cover;
    };
    reader.readAsDataURL(file);
  });

  async function save(intent) {
    if (!form.elements.story_type?.value) {
      form.elements.story_type?.focus();
      return;
    }
    if (!form.elements.romance?.value) {
      form.elements.romance?.focus();
      return;
    }
    if (!form.querySelector('[name="age"]:checked')) {
      form.querySelector('[name="age"]')?.focus();
      return;
    }
    const work = FoxWorks.fromForm(form, cover ? { cover } : {}, intent);
    if (cover) work.cover = cover;
    const saved = await FoxWorks.upsert(work);
    if (window.FoxWorkStatus) FoxWorkStatus.set(saved.id, saved.status);
    location.href = `studio.html?id=${encodeURIComponent(saved.id)}`;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const intent = event.submitter?.value === "publish" ? "publish" : "draft";
    save(intent);
  });
  form.querySelectorAll("button[name='intent']").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      save(btn.value);
    });
  });
})();

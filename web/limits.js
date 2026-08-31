(async function limitsPage() {
  if (!window.FoxQuota) return;
  if (window.FoxWorks) await FoxWorks.hydrate();
  if (window.FoxStore) await FoxStore.hydrate();

  const lim = FoxQuota.limits();
  const used = await FoxQuota.usage();
  const pct = (n) => `${Math.round(n * 10) / 10}%`.replace(".0%", "%");

  const planName = document.getElementById("limits-plan-name");
  const lead = document.getElementById("limits-plan-lead");
  const usedLabel = document.getElementById("limits-used-label");
  if (planName) planName.textContent = lim.name;
  if (lead) {
    lead.textContent = `Тариф ${lim.name}: хранилище ${FoxQuota.formatBytes(lim.storage)}, до ${lim.chapterImages} изображений на главу.`;
  }
  if (usedLabel) {
    usedLabel.textContent = `${FoxQuota.formatBytes(used.total)} из ${FoxQuota.formatBytes(used.cap)} · ${pct(used.pct)}`;
  }

  const setSeg = (id, width) => {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.max(0, width)}%`;
  };
  setSeg("limits-seg-covers", used.ofCap.covers);
  setSeg("limits-seg-art", used.ofCap.art);
  setSeg("limits-seg-music", used.ofCap.music);

  const setLine = (kind, ofCap, bytes) => {
    const pctEl = document.getElementById(`limits-pct-${kind}`);
    const bytesEl = document.getElementById(`limits-bytes-${kind}`);
    if (pctEl) pctEl.textContent = pct(ofCap);
    if (bytesEl) bytesEl.textContent = FoxQuota.formatBytes(bytes);
  };
  setLine("covers", used.ofCap.covers, used.covers);
  setLine("art", used.ofCap.art, used.art);
  setLine("music", used.ofCap.music, used.music);

  const rules = document.getElementById("limits-rules");
  if (rules) {
    rules.innerHTML = `
      <li>Обложка произведения — ${lim.workCovers} шт.</li>
      <li>Внутри главы — до ${lim.chapterImages} изображений вместе с обложкой главы (линейная и интерактивная).</li>
      <li>Максимальный размер одного файла — 8 МБ. FoxStoria сжимает картинки автоматически.</li>
      <li>Общий лимит хранилища автора — ${FoxQuota.formatBytes(lim.storage)} на обложки, иллюстрации и музыку.</li>
      <li>Ссылки на Spotify, ВКонтакте и Яндекс Музыку (трек, альбом, плейлист) место в кабинете не занимают.</li>`;
  }

  const plans = document.getElementById("limits-plans");
  if (plans) {
    plans.innerHTML = FoxQuota.allPlans()
      .map((plan) => {
        const current = plan.id === lim.id;
        return `<article class="limits-plan-card${current ? " is-current" : ""}">
          <h3>${plan.name}${current ? " <span>сейчас</span>" : ""}</h3>
          <p>До ${plan.chapterImages} изображений на главу</p>
          <p>Хранилище ${FoxQuota.formatBytes(plan.storage)}</p>
        </article>`;
      })
      .join("");
  }
})();

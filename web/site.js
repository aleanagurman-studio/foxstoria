document.addEventListener("click", (event) => {
  const toggle = event.target.closest("#theme-toggle");
  if (!toggle) return;
  const html = document.documentElement;
  const isDark = html.getAttribute("data-theme") === "dark";
  html.setAttribute("data-theme", isDark ? "light" : "dark");
});

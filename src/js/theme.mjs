// Theme toggle: reads/writes localStorage, syncs data-theme on <html>.
// Anti-flash read happens earlier, inline in <head> (see theme-head.njk).
const STORAGE_KEY = "theme";
const root = document.documentElement;

function apply(theme) {
  if (theme === "light" || theme === "dark") {
    root.setAttribute("data-theme", theme);
  } else {
    root.removeAttribute("data-theme");
  }
}

function current() {
  return (
    root.getAttribute("data-theme") ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
}

document.querySelectorAll("[data-theme-toggle]").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const next = current() === "dark" ? "light" : "dark";
    apply(next);
    localStorage.setItem(STORAGE_KEY, next);
  });
});

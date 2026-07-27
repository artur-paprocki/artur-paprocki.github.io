// Reading in sync with the recording: the spoken sentence is lit and the text
// follows the voice. The key takeaways are a separate, deliberate act — the
// reader presses the button in the bar; finishing the recording does not reveal
// them (Artur, 26.07). Enhances spans baked at build time; without them only the
// pinned bar and the takeaways button remain.
const article = document.querySelector("article");
const audio = document.querySelector(".player audio");
const slot = document.querySelector(".player-slot");
const sentinel = document.querySelector(".sticky-sentinel");
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

// The zero-height sentinel leaves the viewport exactly when the bar pins itself.
if (slot && sentinel) {
  new IntersectionObserver(([entry]) => {
    const pinned = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    slot.classList.toggle("stuck", pinned);
  }).observe(sentinel);
}

// The slug, not the address: theses uncovered in preview survive publication.
const store = "ap:tezy:" + (article?.dataset.slug || location.pathname);
const toggle = document.querySelector(".tezy-toggle");
const shown = () => article.classList.contains("tezy-on");

function tezy(on, remember) {
  if (!article || shown() === on) return;
  article.classList.toggle("tezy-on", on);
  if (toggle) toggle.setAttribute("aria-pressed", on ? "true" : "false");
  // Private mode throws: the reveal then simply does not survive the visit.
  if (remember) try { localStorage.setItem(store, on ? "1" : "0"); } catch {}
}

if (article && article.querySelector(".teza")) {
  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener("click", () => tezy(!shown(), true));
  }
  try { if (localStorage.getItem(store) === "1") tezy(true); } catch {}
}

const zs = article ? [...article.querySelectorAll(".z[data-t]")] : [];

if (audio && zs.length) {
  zs.sort((a, b) => a.dataset.t - b.dataset.t);
  const starts = zs.map((z) => Number(z.dataset.t));
  let at = -1;
  let lit = true;
  let hold = 0;

  // Scrolling by hand keeps the page for five seconds.
  const defer = () => { hold = Date.now() + 5000; };
  addEventListener("wheel", defer, { passive: true });
  addEventListener("touchmove", defer, { passive: true });
  addEventListener("keydown", (e) => { if (/^(Arrow|Page|Home|End)/.test(e.key)) defer(); });

  // Binary search: seeking lands right, no `timeupdate` walks the whole list.
  const locate = (t) => {
    let lo = 0, hi = starts.length - 1, found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] <= t) { found = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return found;
  };

  // `on` false leaves the sentence read but unlit — past its data-e the voice
  // has moved on, and the closing silence must not keep the last one burning.
  const paint = (i, on = true) => {
    if (i === at && on === lit) return;
    at = i, lit = on;
    zs.forEach((z, k) => {
      z.classList.toggle("zz", k === i && on);
      z.classList.toggle("said", k < i || (k === i && !on));
    });
    if (i < 0 || !on || calm || audio.paused || Date.now() < hold) return;
    zs[i].scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const follow = (t) => {
    const i = locate(t);
    paint(i, !(i >= 0 && Number(zs[i].dataset.e) < t));
  };

  const seek = (z) => { audio.currentTime = Number(z.dataset.t); follow(audio.currentTime); };

  audio.addEventListener("timeupdate", () => follow(audio.currentTime));
  audio.addEventListener("play", () => article.classList.add("reading", "audio-on"));
  // No `ended` handler: reaching the end pauses first, so this covers both.
  audio.addEventListener("pause", () => article.classList.remove("reading"));

  // A click in a sentence rewinds the recording — links and selections untouched.
  article.addEventListener("click", (e) => {
    if (!article.classList.contains("audio-on")) return;
    const z = e.target.closest(".z[data-t]");
    const picked = getSelection();
    if (!z || e.target.closest("a") || (picked && picked.toString())) return;
    seek(z);
  });

  // Deep link, and `hashchange` too: an anchor clicked on the open page moves
  // the voice, not just the light (CSS `:target`). Never autoplay.
  const cue = () => {
    const z = /^#z\d+$/.test(location.hash) && article.querySelector(location.hash + "[data-t]");
    if (z) seek(z);
  };
  addEventListener("hashchange", cue);
  audio.addEventListener("loadedmetadata", cue, { once: true });
  cue();
}

// Minimal audio player: play/pause button + progress bar + time.
// Progressively enhances a native <audio preload="none">; without JS the
// browser's own controls are shown instead (see markup in Wave 3b).
function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function enhance(root) {
  const audio = root.querySelector("audio");
  const playButton = root.querySelector(".play");
  const bar = root.querySelector(".bar");
  const time = root.querySelector(".time");
  if (!audio || !playButton || !bar || !time) return;

  audio.removeAttribute("controls");
  root.hidden = false;

  playButton.addEventListener("click", () => {
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  });

  audio.addEventListener("play", () => {
    playButton.setAttribute("aria-label", "Pauza");
    playButton.textContent = "⏸";
  });

  audio.addEventListener("pause", () => {
    playButton.setAttribute("aria-label", "Odtwórz");
    playButton.textContent = "▶";
  });

  audio.addEventListener("loadedmetadata", () => {
    bar.max = String(audio.duration);
    time.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    bar.value = String(audio.currentTime);
    time.textContent = formatTime(audio.duration - audio.currentTime);
  });

  bar.addEventListener("input", () => {
    audio.currentTime = Number(bar.value);
  });
}

document.querySelectorAll(".player").forEach(enhance);

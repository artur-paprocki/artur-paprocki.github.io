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

  // While the listener drags the thumb, `timeupdate` must not write the bar back
  // to the audio's own position — otherwise the thumb is yanked out from under
  // the cursor and the recording cannot be scrubbed.
  let scrubbing = false;
  const startScrub = () => {
    scrubbing = true;
  };
  const endScrub = () => {
    scrubbing = false;
  };
  bar.addEventListener("pointerdown", startScrub);
  bar.addEventListener("keydown", startScrub);
  window.addEventListener("pointerup", endScrub);
  bar.addEventListener("keyup", endScrub);
  bar.addEventListener("blur", endScrub);

  audio.addEventListener("timeupdate", () => {
    if (!scrubbing) bar.value = String(audio.currentTime);
    time.textContent = formatTime(audio.duration - audio.currentTime);
  });

  bar.addEventListener("input", () => {
    // With preload="none" the duration is unknown until the first play, and the
    // bar still carries its default 0-100 range — seeking then would jump to an
    // arbitrary second.
    if (!Number.isFinite(audio.duration)) return;
    audio.currentTime = Number(bar.value);
    time.textContent = formatTime(audio.duration - audio.currentTime);
  });
}

document.querySelectorAll(".player").forEach(enhance);

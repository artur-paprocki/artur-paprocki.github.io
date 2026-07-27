import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Time maps of the essays, read once at build start (spec 0051, SYNC-1).
//
// The maps live next to the audio they describe (`src/assets/audio/
// <slug>-<lang>.sync.json`) and are produced outside this repository. They are
// optional by design: a fresh clone, an essay without audio and an essay whose
// audio has not been aligned yet all have to build. So this file never throws —
// a missing directory gives an empty dictionary, a damaged map is skipped with
// a warning and the rest of the build carries on.
//
// Templates use the dictionary to say two things a listener already knows but
// a machine cannot guess: how long the recording is (`durationIso`, for the
// `AudioObject` in JSON-LD) and that a timestamped transcript exists at all
// (`href`, for `<link rel="alternate">` and /llms.txt).

const AUDIO_DIR = fileURLToPath(new URL("../assets/audio", import.meta.url));

// Everything below stays private: Eleventy ignores the default export of a
// data file that also has named exports (verified on 3.1.6 — the function was
// never called and the dictionary came out empty), so this module exports
// exactly one thing.
//
// Seconds → ISO-8601 duration ("PT11M13S"). Zero-length parts are dropped,
// except when everything is zero — "PT0S" is still a duration, "PT" is not.
function isoDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const parts = [];
  if (hours) parts.push(`${hours}H`);
  if (minutes) parts.push(`${minutes}M`);
  if (rest || parts.length === 0) parts.push(`${rest}S`);
  return `PT${parts.join("")}`;
}

function readMap(file) {
  const map = JSON.parse(fs.readFileSync(path.join(AUDIO_DIR, file), "utf8"));
  const sentences = Array.isArray(map.sentences) ? map.sentences : [];
  const last = sentences[sentences.length - 1];
  const duration = Number(map.duration) || Number(last?.end) || 0;
  const key = file.slice(0, -".sync.json".length);
  return [
    key,
    {
      duration,
      durationIso: duration > 0 ? isoDuration(duration) : null,
      sentences: sentences.length,
      source: typeof map.source === "string" ? map.source : null,
      href: `/assets/audio/${file}`,
    },
  ];
}

export default function () {
  let files = [];
  try {
    files = fs.readdirSync(AUDIO_DIR).filter((name) => name.endsWith(".sync.json"));
  } catch {
    return {};
  }

  const maps = {};
  for (const file of files.sort()) {
    try {
      const [key, entry] = readMap(file);
      maps[key] = entry;
    } catch (error) {
      console.log(`WARN [sync] ${file}: pominięto — ${error.message}`);
    }
  }
  return maps;
}

import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";

// Paper matching: every illustration is painted on its own paper, and no two
// papers match the page (#F0EBDF beige on a #FDFCF9 page, #2D2C3E violet on a
// #16181D night), so each one sat in a visible rectangle. At build time the
// illustration's measured paper is moved onto the page's paper with one
// straight curve per channel, pinned at the end the drawing lives in: black
// stays black on light paper, white stays white on dark. Sources in git are
// untouched; only the built copies change. Values mirror src/css/tokens.css.
const PAGE = {
  light: [0xfd, 0xfc, 0xf9],
  dark: [0x16, 0x18, 0x1d],
};

// Drawn illustrations only. The monogram and the brush stroke already blend
// into the page with mix-blend-mode; stills and photos are not on paper.
export function isPaperIllustration(src) {
  const norm = src.replace(/\\/g, "/");
  const m = /\/assets\/ill\/(light|dark)\/(d?ill-[^/]+)$/.exec(norm);
  return Boolean(m) && !/-(monogram|stroke)-/.test(m[2]);
}

export function paperCurve(paper, theme) {
  const page = PAGE[theme];
  const a = [], b = [];
  for (let i = 0; i < 3; i++) {
    if (theme === "light") {
      a.push(page[i] / Math.max(paper[i], 1));
      b.push(0);
    } else {
      const k = (255 - page[i]) / Math.max(255 - paper[i], 1);
      a.push(k);
      b.push(255 - 255 * k);
    }
  }
  return { a, b };
}

// Paper colour = per-channel median of a thin band along all four edges, so a
// hand or a wash that runs off the frame does not pull the measurement.
async function measurePaper(src) {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.02));
  const ch = [[], [], []];
  const take = (x, y) => {
    const i = (y * w + x) * 3;
    ch[0].push(data[i]); ch[1].push(data[i + 1]); ch[2].push(data[i + 2]);
  };
  for (let y = 0; y < h; y += 4) for (let d = 0; d < band; d += 2) { take(d, y); take(w - 1 - d, y); }
  for (let x = 0; x < w; x += 4) for (let d = 0; d < band; d += 2) { take(x, d); take(x, h - 1 - d); }
  return ch.map((v) => v.sort((p, q) => p - q)[v.length >> 1]);
}

// Returns the path eleventy-img should read: the matched copy for a drawn
// illustration, the original for anything else. Cached by name, so repeated
// builds are byte-identical and cheap.
//
// Pages render in parallel and several ask for the same illustration at once
// (a hero sits on the home page and on its essay). One promise per file makes
// them all wait for the single conversion, and the copy is written under a
// temporary name and renamed when complete — on a fresh CI build a second
// caller otherwise found the half-written file and read an empty buffer.
const inFlight = new Map();

export function paperMatched(src, cacheDir = "_cache/paper") {
  if (!isPaperIllustration(src)) return Promise.resolve(src);
  const theme = /\/dark\//.test(src.replace(/\\/g, "/")) ? "dark" : "light";
  const out = path.join(cacheDir, theme, path.basename(src));
  if (!inFlight.has(out)) inFlight.set(out, convert(src, out, theme));
  return inFlight.get(out);
}

async function convert(src, out, theme) {
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) return out;
  const { a, b } = paperCurve(await measurePaper(src), theme);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmp = `${out}.${process.pid}.tmp`;
  await sharp(src).removeAlpha().linear(a, b).jpeg({ quality: 92, mozjpeg: true }).toFile(tmp);
  fs.renameSync(tmp, out);
  return out;
}

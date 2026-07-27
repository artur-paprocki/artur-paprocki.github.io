import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Chinese typography — contract FONT-CJK (spec 0052).
//
// A full CJK serif is ~11 MB; even as woff2 it is an order of magnitude over
// the page budget. So the Chinese pages get a font cut to the characters they
// actually print: this step reads the *built* HTML, collects every codepoint
// inside the CJK unicode ranges below, and asks harfbuzz (subset-font) for a
// woff2 holding just those glyphs.
//
// Runs as a build-lifecycle hook rather than a shortcode — the charset is a
// property of the finished page, not of any single render. Same shape as
// `favicon.mjs`: a plain async function plus a thin plugin wrapper.
//
// Source font: Noto Serif SC Regular, googlefonts/noto-cjk, release Serif2.003,
// file `Serif/SubsetOTF/SC/NotoSerifSC-Regular.otf`, SIL Open Font License 1.1
// (licence copied to `src/assets/fonts/OFL-Noto-Serif-SC.txt`). The 11 MB
// original is NOT in the repository: it is fetched once into `_cache/` (git
// ignored) and verified by hash. What lands in git is the subset — tens to a
// few hundred kilobytes per essay.
//
// Nothing here may break a build. A missing source font, no network, a
// harfbuzz failure: the step logs, leaves the page without the webfont, and
// the `:lang(zh)` stack in `fonts.css` falls through to the system CJK serif.
// `subset-font` is therefore imported lazily, inside the try: a top-level
// import turns a missing dependency into a crash while Eleventy is still
// reading its configuration, which is the one failure this module promises
// not to cause.

const SOURCE_URL =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@Serif2.003/Serif/SubsetOTF/SC/NotoSerifSC-Regular.otf";
const SOURCE_SHA256 =
  "e8f396decc1f0963a016a989c3d8852e863d1350996f573860a80767c83a1cd3";
const SOURCE_CACHE = "_cache/fonts/NotoSerifSC-Regular.otf";
// Charset that produced a given subset — a build note, not a source file, so it
// lives in `_cache/` like the source font. It must NOT sit next to the woff2:
// `src/assets` goes passthrough to `_site`, so a sidecar there would publish
// the raw character list under a public address (same reason the alignment
// cache lives outside `src/`, see .gitignore). Price of moving it: a fresh
// clone has no note, so the first build with a Chinese page re-cuts the subset
// and needs the pinned source font once. If that fetch fails, the page falls
// back to the system CJK serif — it never fails the build.
const CHARS_CACHE_DIR = "_cache/fonts/charsets";

const SRC_FONT_DIR = "src/assets/fonts/zh";
const PUBLIC_DIR = "/assets/fonts/zh";
const FAMILY = "Noto Serif SC";

// Ranges the Chinese page may pull from this font. Latin, Polish diacritics and
// general punctuation are deliberately outside: those keep coming from
// Newsreader and Fraunces, so the subset carries no duplicate Latin glyphs and
// a Chinese sentence with "Gaussian splatting" in it still reads in the house
// typeface. Fullwidth punctuation (，！？：；（）) lives in U+FF00-FFEF, the
// full stop 。 in U+2E80-303F — both are mandatory for Chinese prose.
const RANGES = [
  [0x2e80, 0x303f], // CJK radicals, Kangxi, CJK symbols and punctuation
  [0x3400, 0x4dbf], // CJK Extension A
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0xf900, 0xfaff], // CJK Compatibility Ideographs
  [0xfe30, 0xfe4f], // CJK Compatibility Forms
  [0xff00, 0xffef], // Halfwidth and Fullwidth Forms
];
export const UNICODE_RANGE = RANGES.map(
  ([a, b]) => `U+${a.toString(16).toUpperCase()}-${b.toString(16).toUpperCase()}`
).join(", ");

const MARKER = "<!-- cjk-font -->";
const ZH_HTML = /<html[^>]*\slang=["']?zh/i;

/** True when the codepoint belongs to a range this font serves. */
export function inCjkRange(codePoint) {
  return RANGES.some(([a, b]) => codePoint >= a && codePoint <= b);
}

/**
 * Sorted, deduplicated CJK characters of a built page. The whole file is
 * scanned, markup included: `alt`, `title` and the JSON-LD block carry text
 * that a reader can see or a screen reader can speak, and filtering by range
 * already throws away everything that is not Chinese.
 */
export function collectCjkChars(html) {
  const seen = new Set();
  for (const ch of html) {
    if (inCjkRange(ch.codePointAt(0))) seen.add(ch);
  }
  return [...seen].sort().join("");
}

/**
 * Slug of a built page: the directory holding `index.html`, or the file name.
 * `_site/zh/eseje/hui-sikao-de-guang/index.html` → `hui-sikao-de-guang`, which
 * is the same string Eleventy exposes as `page.fileSlug` for that source file,
 * so the preload in the layout and the file written here agree by construction.
 */
export function slugForPage(relPath) {
  // Both separators on purpose: `path.relative` yields backslashes here and
  // forward slashes on the Linux runner.
  const parts = relPath.split(/[\\/]/).filter(Boolean);
  const file = parts.pop();
  if (path.basename(file, ".html") !== "index") return path.basename(file, ".html");
  return parts.pop() || "index";
}

/** The `@font-face` a Chinese page carries inline. */
export function fontFaceCss(slug) {
  return (
    `@font-face{font-family:"${FAMILY}";font-style:normal;font-weight:400 700;` +
    `font-display:swap;src:url("${PUBLIC_DIR}/${slug}.woff2") format("woff2");` +
    `unicode-range:${UNICODE_RANGE}}`
  );
}

function walkHtml(dir, base = dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, base, out);
    else if (entry.name.endsWith(".html")) out.push(path.relative(base, full));
  }
  return out;
}

/**
 * The source font, cached under `_cache/`. Downloaded on first use and checked
 * against a pinned hash — a font swapped under our feet would silently change
 * every glyph on the page.
 */
async function readSourceFont(log) {
  if (fs.existsSync(SOURCE_CACHE)) return fs.readFileSync(SOURCE_CACHE);

  log.log(`[cjk-font] pobieram krój źródłowy: ${SOURCE_URL}`);
  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status} przy pobieraniu kroju`);
  const buffer = Buffer.from(await response.arrayBuffer());

  const digest = crypto.createHash("sha256").update(buffer).digest("hex");
  if (digest !== SOURCE_SHA256) {
    throw new Error(`suma kontrolna kroju się nie zgadza (${digest})`);
  }
  fs.mkdirSync(path.dirname(SOURCE_CACHE), { recursive: true });
  fs.writeFileSync(SOURCE_CACHE, buffer);
  return buffer;
}

/**
 * Builds (or reuses) the subset for one page. Returns the number of bytes
 * written, or null when no subset could be produced.
 *
 * The charset that produced a file is stored next to it. An unchanged charset
 * means an unchanged subset, so a rebuild neither touches git nor needs the
 * 11 MB source — which is what keeps CI off the network in the normal case.
 */
async function subsetFor(slug, chars, siteDir, loadSource, log) {
  const woff2Path = path.join(SRC_FONT_DIR, `${slug}.woff2`);
  const charsPath = path.join(CHARS_CACHE_DIR, `${slug}.txt`);

  const fresh =
    fs.existsSync(woff2Path) &&
    fs.existsSync(charsPath) &&
    fs.readFileSync(charsPath, "utf8") === chars;

  if (!fresh) {
    const { default: subsetFont } = await import("subset-font");
    const source = await loadSource();
    const subset = await subsetFont(source, chars, { targetFormat: "woff2" });
    fs.mkdirSync(SRC_FONT_DIR, { recursive: true });
    fs.writeFileSync(woff2Path, subset);
    fs.mkdirSync(CHARS_CACHE_DIR, { recursive: true });
    fs.writeFileSync(charsPath, chars, "utf8");
    log.log(
      `[cjk-font] ${slug}: ${[...chars].length} znaków → ${subset.length} B (${(
        subset.length / 1024
      ).toFixed(1)} kB)`
    );
  }

  const siteFontDir = path.join(siteDir, "assets", "fonts", "zh");
  fs.mkdirSync(siteFontDir, { recursive: true });
  const target = path.join(siteFontDir, `${slug}.woff2`);
  fs.copyFileSync(woff2Path, target);
  return fs.statSync(target).size;
}

/**
 * Drops a preload pointing at a subset that was not produced. Without this a
 * failed subset would leave the layout preloading a 404 — a broken link the
 * CI link checker turns into a red build, which is exactly the coupling the
 * fallback is supposed to avoid.
 */
export function stripPreload(html, slug) {
  const re = new RegExp(
    `\\s*<link[^>]*${PUBLIC_DIR}/${slug}\\.woff2[^>]*>`,
    "gi"
  );
  return html.replace(re, "");
}

export async function buildCjkSubsets({ siteDir = "_site", log = console } = {}) {
  const pages = walkHtml(siteDir).filter((rel) =>
    ZH_HTML.test(fs.readFileSync(path.join(siteDir, rel), "utf8"))
  );
  if (pages.length === 0) return [];

  // One source read per build, shared by every page and skipped entirely when
  // all subsets are already fresh.
  let sourcePromise = null;
  const loadSource = () => (sourcePromise ??= readSourceFont(log));

  const results = [];
  for (const rel of pages) {
    const full = path.join(siteDir, rel);
    let html = fs.readFileSync(full, "utf8");
    if (html.includes(MARKER)) continue;

    const slug = slugForPage(rel);
    const chars = collectCjkChars(html);

    let bytes = null;
    if (chars.length > 0) {
      try {
        bytes = await subsetFor(slug, chars, siteDir, loadSource, log);
      } catch (error) {
        log.warn(
          `[cjk-font] ${slug}: podzbiór nieutworzony (${error.message}) — ` +
            "strona zejdzie na systemowy krój CJK"
        );
      }
    }

    html =
      bytes === null
        ? stripPreload(html, slug)
        : html.replace("</head>", `${MARKER}<style>${fontFaceCss(slug)}</style></head>`);
    fs.writeFileSync(full, html);
    results.push({ page: rel, slug, chars: [...chars].length, bytes });
  }
  return results;
}

// Named on purpose: the hook is registered as a function with a stable name,
// so a test can inspect the handlers a built configuration carries and prove
// this step is actually wired in (`lib/eleventy-config.test.mjs`). Unit tests
// of the functions above cannot see that — the module passed every one of them
// while nothing in the build ever called it.
export function cjkSubsetsAfterBuild() {
  return buildCjkSubsets();
}

export function cjkFontsPlugin(eleventyConfig) {
  eleventyConfig.on("eleventy.after", cjkSubsetsAfterBuild);
}

if (import.meta.filename === process.argv[1]) {
  await buildCjkSubsets({ siteDir: process.argv[2] || "_site" });
}

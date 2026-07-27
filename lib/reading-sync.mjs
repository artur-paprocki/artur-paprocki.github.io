import fs from "node:fs";
import path from "node:path";

// Synchronous reading ("karaoke") — spec 0051.
//
// This transform bakes sentence spans and their audio timecodes into the
// static HTML, so search engines and agents see the same anchors a listener
// sees. Contracts: SEG-1 (segmentation), SYNC-1 (time map file), HTML-1
// (output markup), MATCH-1 (matching), FM-1 (theses in front matter).
//
// The SEG-1 segmenter below is a deliberate copy of the one in the vault
// helper (`.claude/lib/esej/sync.mjs`, which produces the time map). Two
// repositories, one contract: no shared package, no build-time coupling.
// A drift between the two implementations surfaces as a low MATCH-1 score
// in the build log — that is the intended detector, do not "fix" it by
// loosening the matching.

// ---------------------------------------------------------------- SEG-1

// Abbreviations are stored without the trailing dot, lowercased.
const ABBR_PL = new Set([
  "np", "m.in", "tzn", "tj", "itd", "itp", "ok", "prof", "dr", "hab", "inż",
  "mgr", "red", "ul", "św", "nr", "str", "ws", "r", "w", "min", "godz",
]);
const ABBR_EN = new Set([
  "mr", "mrs", "ms", "dr", "prof", "st", "vs", "e.g", "i.e", "etc", "inc",
  "fig", "no",
]);

const TERMINATORS = new Set([".", "!", "?", "…"]);
// Characters allowed to trail a terminator: `."`, `.”`, `.)`, `?!`, `…`.
const CLOSERS = new Set(['"', "”", ")", "»", "!", "?", ".", "…"]);
// Opening characters, taken literally from SEG-1: uppercase, digit, „ » — (
const OPENING_RE = /[\p{Lu}0-9„»—(]/u;
const MIN_SENTENCE_LENGTH = 3;

// ------------------------------------------------------------- SEG-1-ZH
// Chinese sentence terminators. The Latin full stop is deliberately absent:
// inside Chinese prose it only shows up in numbers, versions ("Sora 2.0") and
// domains, while the sentence itself is closed by 。 — the essay's language
// decides, not the contents of the sentence.
const ZH_TERMINATORS = new Set(["。", "！", "？", "…"]);
// Characters allowed to trail a Chinese terminator. OPENING quotes (“, 「) stay
// out on purpose: in `他说。“我来了。”` the quote sits right after a terminator
// yet opens the next sentence — pulling it back would shift karaoke by a char.
const ZH_CLOSERS = new Set(["」", "』", "”", '"', "）", "》"]);
// zh, zh-Hans, zh-CN, zh_Hant — the variant does not change segmentation.
const ZH_LANG = /^zh(?:[-_].*)?$/i;
// A two-character Chinese sentence ("是。") carries a full statement, so the
// three-character floor of SEG-1 would swallow it. Measured on a 292-sentence
// Chinese corpus (prose, the essay translation, edge cases): floor 3 lost 6
// genuine sentences (292 → 286), floor 2 lost none while still gluing
// one-character orphans (a terminator left alone after an inline strip).
const MIN_SENTENCE_LENGTH_ZH = 2;

/** True when this essay version follows the Chinese branch (SEG-1-ZH). */
export function isChineseLang(lang) {
  return ZH_LANG.test(String(lang || ""));
}

function abbreviationsFor(lang) {
  return lang === "en" ? ABBR_EN : ABBR_PL;
}

// True when the dot at `dotIndex` closes an abbreviation, an initial or a
// number, and therefore does not end a sentence.
function isNonBreakingDot(text, dotIndex, abbr) {
  let start = dotIndex;
  while (start > 0 && !/\s/.test(text[start - 1])) start--;
  const token = text.slice(start, dotIndex).replace(/^[^\p{L}\p{N}]+/u, "");
  if (!token) return false;
  if (/^\p{N}[\p{N}.,]*$/u.test(token)) return true; // 35,7 · 3.5 · 2026.
  if (token.length === 1 && /\p{Lu}/u.test(token)) return true; // E. B. Bratner
  return abbr.has(token.toLowerCase());
}

// Raw Chinese sentence ranges (SEG-1-ZH). Differences from the Latin scan: a
// boundary needs neither a space after the terminator (Chinese writes none) nor
// an opening character after it, and there are no abbreviations, initials or
// dotted numbers to protect. Kept 1:1 with `spansZh` in the vault helper.
function zhRanges(text) {
  const len = text.length;
  const ranges = [];
  let start = 0;
  let i = 0;

  while (i < len) {
    if (!ZH_TERMINATORS.has(text[i])) {
      i++;
      continue;
    }
    // Close the run of terminators and closers: `……`, `？！`, `。」`, `。”`
    let j = i + 1;
    while (j < len && (ZH_TERMINATORS.has(text[j]) || ZH_CLOSERS.has(text[j]))) j++;
    ranges.push([start, j]);
    start = j;
    i = j;
  }
  if (start < len) ranges.push([start, len]);
  return ranges;
}

// Sentence ranges as [start, end) offsets into `text`.
export function sentenceRanges(text, lang = "pl") {
  if (isChineseLang(lang)) {
    return mergeShortRanges(trimRanges(zhRanges(text), text), text, MIN_SENTENCE_LENGTH_ZH);
  }

  const abbr = abbreviationsFor(lang);
  const len = text.length;
  const ranges = [];
  let start = 0;

  for (let i = 0; i < len; i++) {
    if (!TERMINATORS.has(text[i])) continue;

    let last = i;
    while (last + 1 < len && CLOSERS.has(text[last + 1])) last++;

    let next = last + 1;
    if (next >= len || !/\s/.test(text[next])) continue;
    while (next < len && /\s/.test(text[next])) next++;
    if (next >= len || !OPENING_RE.test(text[next])) continue;
    if (text[i] === "." && isNonBreakingDot(text, i, abbr)) continue;

    ranges.push([start, last + 1]);
    start = next;
    i = next - 1;
  }
  if (start < len) ranges.push([start, len]);

  return mergeShortRanges(trimRanges(ranges, text), text);
}

function trimRanges(ranges, text) {
  const trimmed = [];
  for (let [start, end] of ranges) {
    while (start < end && /\s/.test(text[start])) start++;
    while (end > start && /\s/.test(text[end - 1])) end--;
    if (end > start) trimmed.push([start, end]);
  }
  return trimmed;
}

// SEG-1: a fragment shorter than three characters glues to the previous
// sentence (or to the next one, when it opens the block). SEG-1-ZH passes two.
function mergeShortRanges(ranges, text, minLength = MIN_SENTENCE_LENGTH) {
  const out = [];
  let carry = null;
  for (const [start, end] of ranges) {
    const from = carry === null ? start : carry;
    carry = null;
    if (end - from < minLength) {
      if (out.length > 0) out[out.length - 1][1] = end;
      else carry = from;
      continue;
    }
    out.push([from, end]);
  }
  if (carry !== null && out.length === 0) out.push([carry, text.length]);
  return out;
}

export function splitSentences(text, lang = "pl") {
  return sentenceRanges(text, lang).map(([start, end]) => text.slice(start, end));
}

// --------------------------------------------------------------- MATCH-1

const ZERO_WIDTH_RE = /[\u200B-\u200D\u2060\uFEFF]/g;
const KEY_LENGTH = 24;

export function normalizeText(value) {
  return String(value)
    .normalize("NFC")
    .replace(ZERO_WIDTH_RE, "")
    .replace(/[„“”«»]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/[—–−]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function matchKey(value) {
  return normalizeText(value).slice(0, KEY_LENGTH);
}

// ------------------------------------------------------------ HTML scan

const TOKEN_RE =
  /<!--[\s\S]*?-->|<\/([a-zA-Z][^\s/>]*)\s*>|<([a-zA-Z][^\s/>]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "param", "source", "track", "wbr",
]);

// Subtrees never wrapped in sentence spans (HTML-1).
const SKIP_TAGS = new Set([
  "figure", "figcaption", "aside", "nav", "header", "footer", "script",
  "style", "svg", "noscript", "iframe",
]);
const SKIP_CLASS_RE =
  /class\s*=\s*["'][^"']*\b(?:draft-banner|essay-head|monogram-zone|subscribe|player|banner|essay-meta)\b/i;

// Elements whose text becomes sentences. `blockquote > p` is covered by `p`.
const TARGET_TAGS = new Set(["p", "h2", "h3", "li"]);

function scanTokens(html) {
  const tokens = [];
  TOKEN_RE.lastIndex = 0;
  let match;
  while ((match = TOKEN_RE.exec(html)) !== null) {
    const raw = match[0];
    if (raw.startsWith("<!--")) continue;
    const closeName = match[1];
    const openName = match[2];
    if (closeName) {
      tokens.push({ type: "close", name: closeName.toLowerCase(), start: match.index, end: match.index + raw.length, raw });
      continue;
    }
    const name = openName.toLowerCase();
    const selfClosing = VOID_TAGS.has(name) || /\/\s*$/.test(match[3] || "");
    tokens.push({
      type: selfClosing ? "void" : "open",
      name,
      start: match.index,
      end: match.index + raw.length,
      raw,
    });
  }
  return tokens;
}

// Innermost target blocks inside [from, to), skipping figure/banner subtrees.
// A target containing another target (or a skipped block) is left alone —
// its children get wrapped instead, so a span never swallows a block element.
function collectBlocks(html, from, to) {
  const tokens = scanTokens(html).filter((t) => t.start >= from && t.end <= to);
  const stack = [];
  const blocks = [];
  let structural = 0;

  for (const token of tokens) {
    if (token.type === "open") {
      const skipped =
        SKIP_TAGS.has(token.name) ||
        SKIP_CLASS_RE.test(token.raw) ||
        (stack.length > 0 && stack[stack.length - 1].skipped);
      const entry = {
        name: token.name,
        skipped,
        contentStart: token.end,
        mark: structural,
        isTarget: TARGET_TAGS.has(token.name),
      };
      if (entry.isTarget || SKIP_TAGS.has(token.name)) structural++;
      stack.push(entry);
      continue;
    }
    if (token.type !== "close") continue;

    const index = findLastIndex(stack, (entry) => entry.name === token.name);
    if (index === -1) continue;
    const [entry] = stack.splice(index, stack.length - index);
    if (!entry.isTarget || entry.skipped) continue;
    if (structural !== entry.mark + 1) continue; // contains nested blocks
    blocks.push({ name: entry.name, contentStart: entry.contentStart, contentEnd: token.start });
  }

  return blocks.sort((a, b) => a.contentStart - b.contentStart);
}

function findLastIndex(list, predicate) {
  for (let i = list.length - 1; i >= 0; i--) {
    if (predicate(list[i])) return i;
  }
  return -1;
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00A0" };

// Plain text projection of a block's inner HTML, with each character mapped
// back to its [start, end) range in the HTML string.
function projectText(inner) {
  const tokens = scanTokens(inner);
  const chars = [];
  let text = "";
  let cursor = 0;

  const pushText = (from, to) => {
    let i = from;
    while (i < to) {
      if (inner[i] === "&") {
        const semicolon = inner.indexOf(";", i);
        if (semicolon !== -1 && semicolon - i <= 10) {
          const body = inner.slice(i + 1, semicolon);
          let decoded = null;
          if (body.startsWith("#")) {
            const code = body.startsWith("#x") || body.startsWith("#X")
              ? Number.parseInt(body.slice(2), 16)
              : Number.parseInt(body.slice(1), 10);
            if (Number.isFinite(code)) decoded = String.fromCodePoint(code);
          } else if (Object.hasOwn(ENTITIES, body.toLowerCase())) {
            decoded = ENTITIES[body.toLowerCase()];
          }
          if (decoded !== null) {
            text += decoded[0];
            chars.push({ start: i, end: semicolon + 1 });
            i = semicolon + 1;
            continue;
          }
        }
      }
      text += inner[i];
      chars.push({ start: i, end: i + 1 });
      i++;
    }
  };

  for (const token of tokens) {
    if (token.start > cursor) pushText(cursor, token.start);
    cursor = token.end;
  }
  if (cursor < inner.length) pushText(cursor, inner.length);

  return { text, chars, tokens };
}

// Tag depth after every token, so cuts can be restricted to depth zero.
function depthTable(tokens) {
  const depths = [];
  let depth = 0;
  for (const token of tokens) {
    if (token.type === "open") depth++;
    else if (token.type === "close") depth = Math.max(0, depth - 1);
    depths.push(depth);
  }
  return depths;
}

function depthAt(tokens, depths, position) {
  let depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].end > position) break;
    depth = depths[i];
  }
  return depth;
}

// HTML-1: a cut is only legal where every inline element opened inside the
// block is closed. From the end of a sentence we may walk forward across
// closing tags and whitespace; anything else means the sentence boundary
// falls inside <a>/<em>/<strong> and must be dissolved.
function findCut(inner, tokens, depths, position) {
  let depth = depthAt(tokens, depths, position);
  if (depth === 0) return position;

  let cursor = position;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.start < position) continue;
    if (inner.slice(cursor, token.start).trim() !== "") return null;
    if (token.type !== "close") return null;
    depth--;
    cursor = token.end;
    if (depth === 0) return cursor;
  }
  return null;
}

// Mirror of findCut for the opening side: walk backwards across opening tags
// so a sentence starting inside <a> takes the whole element with it.
function findStart(inner, tokens, depths, position) {
  let depth = depthAt(tokens, depths, position);
  if (depth === 0) return position;

  let cursor = position;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (token.end > position) continue;
    if (inner.slice(token.end, cursor).trim() !== "") return null;
    if (token.type !== "open") return null;
    depth--;
    cursor = token.start;
    if (depth === 0) return cursor;
  }
  return null;
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function renderSentence(body, { id, teza, timing }) {
  const tag = teza ? "mark" : "span";
  let attrs = `class="${teza ? "z teza" : "z"}" id="z${id}"`;
  if (timing) {
    attrs += ` data-t="${timing.start.toFixed(2)}" data-e="${timing.end.toFixed(2)}"`;
  }
  return `<${tag} ${attrs}>${body}</${tag}>`;
}

function wrapBlock(inner, tagName, ctx) {
  const { text, chars, tokens } = projectText(inner);
  if (!text.trim() || chars.length === 0) return inner;

  const depths = depthTable(tokens);
  // SEG-1: a heading is always exactly one sentence.
  const ranges =
    tagName === "h2" || tagName === "h3"
      ? trimRanges([[0, text.length]], text)
      : sentenceRanges(text, ctx.lang);
  if (ranges.length === 0) return inner;

  const groups = [];
  let pending = null;

  for (const [rangeStart, rangeEnd] of ranges) {
    if (pending === null) {
      const startHtml = findStart(inner, tokens, depths, chars[rangeStart].start);
      if (startHtml === null) {
        pending = groups.pop() ?? { startHtml: 0, textStart: rangeStart };
      } else {
        pending = { startHtml, textStart: rangeStart };
      }
    }
    const cutHtml = findCut(inner, tokens, depths, chars[rangeEnd - 1].end);
    if (cutHtml === null) continue; // boundary sits inside a tag — keep going
    groups.push({ startHtml: pending.startHtml, cutHtml, textStart: pending.textStart, textEnd: rangeEnd });
    pending = null;
  }
  if (pending !== null) {
    groups.push({
      startHtml: pending.startHtml,
      cutHtml: inner.length,
      textStart: pending.textStart,
      textEnd: text.length,
    });
  }

  let out = "";
  let cursor = 0;
  for (const group of groups) {
    const sentenceText = text.slice(group.textStart, group.textEnd).trim();
    if (!sentenceText) continue;
    out += inner.slice(cursor, group.startHtml);
    out += renderSentence(inner.slice(group.startHtml, group.cutHtml), ctx.take(sentenceText));
    cursor = group.cutHtml;
  }
  out += inner.slice(cursor);
  return out;
}

// ---------------------------------------------------------- annotation

function articleRange(html) {
  const tokens = scanTokens(html);
  const openIndex = tokens.findIndex((t) => t.type === "open" && t.name === "article");
  if (openIndex === -1) return null;
  let depth = 0;
  for (let i = openIndex; i < tokens.length; i++) {
    if (tokens[i].name !== "article") continue;
    if (tokens[i].type === "open") depth++;
    else if (tokens[i].type === "close") {
      depth--;
      if (depth === 0) return { start: tokens[openIndex].end, end: tokens[i].start };
    }
  }
  return null;
}

/**
 * Wraps sentences of an already rendered page in HTML-1 spans and attaches
 * times from a SYNC-1 map.
 *
 * The map is not a precondition. Sentence anchors and theses are what search
 * engines and agents read; times are what a listener needs. An essay whose
 * audio has no map still gets full segmentation, `id="zN"` anchors and
 * `<mark class="z teza">` — only `data-t`/`data-e` are absent (HTML-1 allows
 * exactly that). With neither map nor theses there is nothing to say about the
 * page and the HTML comes back byte for byte.
 */
export function annotateHtml(html, options = {}) {
  const { sync = null, theses = [], lang = "pl", slug = "", onLog = () => {} } = options;
  const mapped = sync && Array.isArray(sync.sentences) ? sync.sentences : [];
  if (mapped.length === 0 && theses.length === 0) return html;

  const range = articleRange(html);
  if (!range) return html;

  const mapKeys = mapped.map((sentence) => matchKey(sentence.text ?? ""));
  const thesisKeys = new Map();
  for (const thesis of theses) {
    const key = matchKey(thesis);
    if (key) thesisKeys.set(key, { text: thesis, used: false });
  }

  let pointer = 0;
  let matched = 0;
  let total = 0;

  const ctx = {
    lang,
    take(sentenceText) {
      const key = matchKey(sentenceText);
      let timing = null;
      // MATCH-1: sequential pointer, may skip up to three map sentences
      // (audio omits figure/rule blocks that the HTML still carries).
      for (let step = 0; step <= 3; step++) {
        const candidate = mapped[pointer + step];
        if (!candidate) break;
        if (mapKeys[pointer + step] !== key) continue;
        timing = { start: Number(candidate.start) || 0, end: Number(candidate.end) || 0 };
        pointer += step + 1;
        matched++;
        break;
      }
      const thesis = thesisKeys.get(key);
      if (thesis) thesis.used = true;
      total++;
      return { id: ctx.counter++, teza: Boolean(thesis), timing };
    },
    counter: 0,
  };

  const blocks = collectBlocks(html, range.start, range.end);
  let out = html.slice(0, range.start);
  let cursor = range.start;
  for (const block of blocks) {
    out += html.slice(cursor, block.contentStart);
    out += wrapBlock(html.slice(block.contentStart, block.contentEnd), block.name, ctx);
    cursor = block.contentEnd;
  }
  out += html.slice(cursor);

  const label = `${slug}-${lang}`;
  if (mapKeys.length > 0) {
    const ratio = total === 0 ? 0 : matched / total;
    const prefix = ratio < 0.8 ? "WARN " : "";
    onLog(`${prefix}[sync] ${label}: dopasowano ${matched}/${total} zdań`);
  } else {
    const marked = [...thesisKeys.values()].filter((thesis) => thesis.used).length;
    onLog(`[sync] ${label}: bez mapy czasów — ${total} zdań, ${marked} tez`);
  }
  for (const [, thesis] of thesisKeys) {
    if (!thesis.used) {
      onLog(`WARN [sync] ${label}: teza bez dopasowania — "${thesis.text}"`);
    }
  }

  return out;
}

// ------------------------------------------------------- front matter

// Minimal reader for the two fields this transform needs (`audio`, `theses`).
// Eleventy does not hand full page data to transforms, so the source file is
// read again here; a full YAML parser would be a dependency for two fields.
export function readFrontMatterFields(source) {
  // Essays are sometimes saved with a BOM, and `core.autocrlf=true` hands a
  // fresh clone CRLF files. A stray `\r` at the end of every line silently
  // defeated both patterns below (`.` does not match it, `$` without the `m`
  // flag anchors at the end of the string), so the reader returned an essay
  // with no audio and no theses \u2014 the whole feature off, without a warning.
  const raw = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (!raw.startsWith("---")) return {};
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return {};
  const lines = raw.slice(raw.indexOf("\n") + 1, end).split("\n");

  const fields = {};
  let listKey = null;
  for (const line of lines) {
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (listKey && item) {
      fields[listKey].push(unquote(item[1]));
      continue;
    }
    const pair = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!pair) continue;
    listKey = null;
    const [, key, value] = pair;
    if (value.trim() === "") {
      fields[key] = [];
      listKey = key;
    } else {
      fields[key] = unquote(value.trim());
    }
  }
  return fields;
}

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length > 1) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

// Języki rozpoznawane po ścieżce. Chiński stoi PIERWSZY i ma tylko jeden wzorzec,
// bo cała sekcja ZH mieszka pod jednym segmentem (`src/zh/…` → `/zh/…`) —
// angielska jest starsza i rozsypana na trzy nazwy (`essays`, `preview`, `en`).
//
// Do 26.07 tej gałęzi tu nie było i funkcja zwracała WYŁĄCZNIE `pl`/`en`.
// Segmentacja chińska (SEG-1-ZH) istniała i była przetestowana, ale nikt jej
// z produkcji nie wołał: strona ZH dostawała język `pl`, a że chiński nie stawia
// spacji po kropce, żadna granica zdania nie spełniała warunku łacińskiego
// i CAŁY AKAPIT wychodził jako jedno zdanie — bez błędu i bez ostrzeżenia
// (zmierzone: 14 spanów na esej zamiast 49). Stąd test parytetu niżej.
const ZH_PATH = /\/zh\//;
const EN_PATH = /\/(essays|preview|en)\//;

export function resolveLang(inputPath = "", url = "") {
  const haystack = `${inputPath} ${url}`.replace(/\\/g, "/");
  if (ZH_PATH.test(haystack)) return "zh";
  return EN_PATH.test(haystack) ? "en" : "pl";
}

// Ile katalogów w górę wolno szukać `assets/audio`. Cztery wystarczają na
// `src/zh/yulan/<kod>/…` i zatrzymują wędrówkę, zanim wyjdzie poza repo.
const AUDIO_LOOKUP_DEPTH = 4;

export function syncPathFor(inputPath, slug, lang) {
  // Mapa czasów leży przy nagraniu, które opisuje: `<katalog wejściowy>/assets/audio`
  // — jedno miejsce dla wszystkich języków. Liczone dotąd „jeden katalog w górę"
  // działało tylko dopóki każdy esej siedział dokładnie jeden poziom pod `src/`;
  // sekcja chińska jest głębiej (`src/zh/wenzhang/`) i dawała `src/zh/assets/audio`
  // — ścieżkę, która nie istnieje, więc esej ZH wychodziłby bez czasów i bez
  // ostrzeżenia. Dlatego katalog audio jest szukany w górę, a nie odliczany.
  const from = path.dirname(path.resolve(inputPath));
  let dir = from;
  for (let up = 0; up <= AUDIO_LOOKUP_DEPTH; up++) {
    const audioDir = path.join(dir, "assets", "audio");
    if (fs.existsSync(audioDir)) return path.join(audioDir, `${slug}-${lang}.sync.json`);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Bez katalogu audio nie ma i tak czego czytać — zwracamy dawną ścieżkę,
  // żeby ewentualny komunikat wskazywał miejsce, w którym mapy się spodziewamy.
  return path.join(from, "..", "assets", "audio", `${slug}-${lang}.sync.json`);
}

// ---------------------------------------------------------- transform

export function readingSyncTransform(eleventyConfig, options = {}) {
  const log = options.log ?? console.log;

  eleventyConfig.addTransform("reading-sync", function (content) {
    const page = this.page || {};
    const outputPath = page.outputPath || "";
    if (typeof content !== "string" || !outputPath.endsWith(".html")) return content;
    if (!content.includes("<article")) return content;
    if (!page.inputPath || !page.inputPath.endsWith(".md")) return content;

    try {
      const raw = fs.readFileSync(page.inputPath, "utf8");
      const fields = readFrontMatterFields(raw);

      const slug = page.fileSlug || path.parse(page.inputPath).name;
      const lang = resolveLang(page.inputPath, page.url);
      const syncPath = syncPathFor(page.inputPath, slug, lang);
      // A broken time map may only cost the times: theses and sentence anchors do
      // not depend on it (W2), so its failure is caught here rather than swallowing
      // the annotation as a whole.
      let sync = null;
      if (fs.existsSync(syncPath)) {
        try {
          sync = JSON.parse(fs.readFileSync(syncPath, "utf8"));
        } catch (error) {
          log(`WARN [sync] ${syncPath}: ${error.message}`);
          sync = null;
        }
      }
      const theses = Array.isArray(fields.theses) ? fields.theses.filter(Boolean) : [];
      // Theses do not wait for the machine: an essay carrying them is annotated
      // whether or not its audio has a time map (and a page with neither is
      // left exactly as it was).
      if (!sync && theses.length === 0) return content;

      return annotateHtml(content, { sync, theses, lang, slug, onLog: log });
    } catch (error) {
      // A broken map must never break the build — degrade to plain HTML.
      log(`WARN [sync] ${page.inputPath}: ${error.message}`);
      return content;
    }
  });
}

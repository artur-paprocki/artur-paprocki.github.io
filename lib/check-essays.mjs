// Gate for published essays: the reading layer must be complete, or the build fails.
//
// Why a separate check and not a build warning: the transform deliberately
// degrades — a missing timing map only logs, a missing `theses:` is not an error
// at all, so a half-finished essay ships green. That is right for drafts and
// wrong for anything public. This runs on the built site, i.e. on the artifact
// readers and crawlers actually get, not on the intent expressed in source.
//
// Two layers are checked: the reading one (sentences, times, theses) page by
// page, and the language set (LANG-SET, spec 0052) — that one needs the whole
// site at once, because a preview address leaking into public metadata is
// visible only when the page that advertises it and the draft it points at are
// read together (`checkSite`).
//
// Usage: node lib/check-essays.mjs [_site]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.argv[2] || "_site";

const MIN_TIMED_RATIO = 0.95;
const MIN_THESES = 2;
const MAX_THESES = 4;

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* htmlFiles(full);
    } else if (entry.endsWith(".html")) {
      yield full;
    }
  }
}

const count = (html, re) => (html.match(re) || []).length;

/**
 * Reads the essay marker out of a built page: the slug and whether the page is
 * a draft. Null means the page is not an essay.
 *
 * Draft state is taken from the page itself (`data-draft`, written by
 * essay.njk out of the `draft:` flag), never from its address. Until 26.07 the
 * gate skipped whole top-level directories — `/podglad/` and `/preview/` —
 * which quietly stopped covering the Chinese section, whose drafts live one
 * level deeper (`/zh/yulan/<code>/<slug>/`). A Chinese draft with no theses
 * would have failed the build while a Polish one in the same state passed.
 * Nesting and language now make no difference.
 * @param {string} html
 * @returns {{ slug: string, draft: boolean } | null}
 */
export function essayMarker(html) {
  const article = /<article([^>]*\sdata-slug="([^"]+)"[^>]*)>/.exec(html);
  if (!article) return null;
  return { slug: article[2], draft: /\sdata-draft\b/.test(article[1]) };
}

/**
 * The address the site gives a built page: `_site/eseje/x/index.html` → `/eseje/x/`.
 * Separators are normalised, so a Windows path reads the same as a POSIX one.
 * @param {string} file
 * @param {string} root
 * @returns {string}
 */
export function pageUrl(file, root = ROOT) {
  // Separatory normalizujemy PRZED `relative`, nie po. Na Windowsie `relative`
  // rozumie backslash i kolejność nie ma znaczenia; na Linuksie backslash jest
  // zwykłym znakiem nazwy, więc `_site\zh\…` nie leży pod `_site` i wychodzi
  // z tego `/../_site/zh/…`. Ten sam test przechodził lokalnie i wywracał CI.
  const norm = (p) => String(p).replace(/\\/g, "/");
  const rel = relative(norm(root), norm(file)).replace(/\\/g, "/").replace(/^\/+/, "");
  return "/" + rel.replace(/(^|\/)index\.html$/, "$1");
}

/**
 * Every address this page advertises as another version of itself: the
 * `hreflang` alternates and the URLs inside JSON-LD (`translationOfWork`,
 * `workTranslation`, and the page's own `url`). Absolute addresses are cut down
 * to a path, so they compare with what `pageUrl` returns.
 * @param {string} html
 * @returns {string[]}
 */
export function advertisedUrls(html) {
  const urls = [];
  for (const tag of html.match(/<link\b[^>]*>/g) || []) {
    if (!/\shreflang="/.test(tag)) continue;
    const href = /\shref="([^"]+)"/.exec(tag);
    if (href) urls.push(href[1]);
  }
  for (const [, block] of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  )) {
    for (const [, url] of block.matchAll(/"(https?:\/\/[^"]+)"/g)) urls.push(url);
  }
  return urls.map((u) => u.replace(/^https?:\/\/[^/]+/, "")).filter((u) => u.startsWith("/"));
}

/**
 * Checks one built page. Returns a list of problems; empty means the page is
 * fine, a draft, or not an essay at all.
 * @param {string} file
 * @param {string} html
 * @returns {string[]}
 */
export function checkPage(file, html) {
  const marker = essayMarker(html);
  if (!marker || marker.draft) return [];
  const { slug } = marker;
  const problems = [];

  // A published essay with no `hreflang` at all is the quiet half of the
  // publication step: `draft:` comes off, the commented-out `work:` key stays
  // commented out (kontrakt stylu §2), and the essay ships with an empty
  // language set — no alternates, no `translationOfWork`, and a switcher
  // pointing at home pages instead of the other versions. Nothing else notices:
  // the build is green and the page looks finished.
  //
  // The gate reads the artifact, and in the artifact an essay published without
  // `work:` is indistinguishable from one that genuinely has no counterpart.
  // Today every published essay is one of a pair (the `/esej` pipeline ships
  // PL+EN together), so this is a hard error. A first essay published in one
  // language only would need this rule relaxed — and that decision belongs to
  // whoever publishes it, not to a silent default.
  if (!/<link\b[^>]*\shreflang="/.test(html)) {
    problems.push(
      `${slug}: opublikowany esej bez ani jednego hreflang — brakuje klucza work: we frontmatterze` +
        " (żadna wersja językowa nie wiąże się z tym tekstem, przełącznik prowadzi na strony główne)"
    );
  }

  const spans = count(html, /class="z[ "]/g);
  const timed = count(html, /\sdata-t="/g);
  const theses = count(html, /<mark class="z teza"/g);
  const hasAudio = /<audio[^>]+src="[^"]+\.mp3"/.test(html);

  if (spans === 0) {
    problems.push(`${slug}: brak podziału na zdania — transform nie objął tej strony`);
    return problems;
  }

  if (hasAudio) {
    const ratio = timed / spans;
    if (ratio < MIN_TIMED_RATIO) {
      problems.push(
        `${slug}: tylko ${timed} z ${spans} zdań ma czasy (${Math.round(ratio * 100)} %, próg ${MIN_TIMED_RATIO * 100} %)` +
          " — brakuje mapy czasów albo rozjechała się z tekstem"
      );
    }
  }

  if (theses < MIN_THESES || theses > MAX_THESES) {
    problems.push(`${slug}: ${theses} tez w tekście, wymagane od ${MIN_THESES} do ${MAX_THESES} (pole theses: we frontmatterze)`);
  }

  const ids = html.match(/\sid="z\d+"/g) || [];
  if (new Set(ids).size !== ids.length) {
    problems.push(`${slug}: powtórzone identyfikatory zdań — kotwice #zN przestają być jednoznaczne`);
  }

  return problems;
}

/**
 * Checks the whole built site for the other half of the publication mistake:
 * a public page pointing readers and crawlers at a preview address.
 *
 * It happens when `work:` gets uncommented while `draft: true` is still there —
 * then the secret address enters the `hreflang` block and the JSON-LD of every
 * OTHER version of that text, plus `/llms.txt`, which two sections lower says
 * that this very address must not be quoted.
 *
 * There is no list of preview directories here on purpose. `/podglad/`,
 * `/preview/` and `/zh/yulan/` are three names for one mechanism, a fourth
 * language would add a fourth, and a list is exactly the thing nobody updates.
 * Instead the set of draft addresses is read out of the build itself: a page
 * says it is a draft (`data-draft`), so its own address is a preview address,
 * whatever it is called and however deep it sits.
 * @param {{ url: string, html: string }[]} pages
 * @returns {string[]}
 */
export function checkSite(pages) {
  const drafts = new Map();
  for (const { url, html } of pages) {
    const marker = essayMarker(html);
    if (marker && marker.draft) drafts.set(url, marker.slug);
  }

  const problems = [];
  for (const { url, html } of pages) {
    const marker = essayMarker(html);
    // A draft page names its own preview address in canonical and JSON-LD —
    // that is the point of a preview, and it carries `noindex` anyway.
    if (marker && marker.draft) continue;
    for (const target of new Set(advertisedUrls(html))) {
      if (!drafts.has(target)) continue;
      problems.push(
        `${url}: wskazuje adres podglądu ${target} (wersja robocza „${drafts.get(target)}")` +
          " w hreflang albo JSON-LD — sekretny adres wychodzi wtedy do wyszukiwarek i /llms.txt;" +
          " zdejmij draft: z tamtej wersji albo zakomentuj jej work:"
      );
    }
  }
  return problems;
}

function main() {
  const problems = [];
  const pages = [];
  let checked = 0;
  for (const file of htmlFiles(ROOT)) {
    const html = readFileSync(file, "utf8");
    const marker = essayMarker(html);
    if (marker && !marker.draft) checked++;
    pages.push({ url: pageUrl(file, ROOT), html });
    problems.push(...checkPage(file, html));
  }
  problems.push(...checkSite(pages));

  if (problems.length) {
    console.error(`\nNiedokończone eseje (${problems.length}):`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    console.error("\nEsej publikowany musi mieć mapę czasów i tezy — patrz kontrakt stylu §5b.\n");
    process.exitCode = 1;
    return;
  }
  console.log(
    `[check] ${checked} opublikowanych esejów: mapy czasów, tezy i zestaw językowy na miejscu`
  );
}

if (process.argv[1] && process.argv[1].endsWith("check-essays.mjs")) main();

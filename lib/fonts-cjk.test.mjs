import { test } from "node:test";
import assert from "node:assert/strict";
import {
  collectCjkChars,
  inCjkRange,
  slugForPage,
  fontFaceCss,
  stripPreload,
  UNICODE_RANGE,
} from "./fonts-cjk.mjs";

const cp = (ch) => ch.codePointAt(0);

test("zakresy obejmuja ideogramy i pelnoszerokosciowa interpunkcje", () => {
  assert.ok(inCjkRange(cp("在")));
  assert.ok(inCjkRange(cp("。"))); // U+3002
  assert.ok(inCjkRange(cp("，"))); // U+FF0C
  assert.ok(inCjkRange(cp("《")));
});

test("lacina, polskie znaki i cudzyslowy zostaja poza podzbiorem", () => {
  for (const ch of ["a", "Z", "7", "ł", "ą", "—", "“", "„", " "]) {
    assert.equal(inCjkRange(cp(ch)), false, ch);
  }
});

test("zbiera unikalne znaki CJK z calego pliku, posortowane", () => {
  const html = '<html lang="zh-Hans"><h1>光光</h1><p>在光。</p><img alt="河">';
  assert.equal(collectCjkChars(html), ["光", "在", "河", "。"].sort().join(""));
});

test("znaki z atrybutow i JSON-LD tez wchodza", () => {
  const html = '<meta content="南极"><script type="application/ld+json">{"name":"河"}</script>';
  assert.equal([...collectCjkChars(html)].sort().join(""), ["南", "极", "河"].sort().join(""));
});

test("strona bez chinskiego daje pusty zbior", () => {
  assert.equal(collectCjkChars("<p>Rzeka, ktorej nie ma.</p>"), "");
});

test("slug bierze sie z katalogu strony", () => {
  assert.equal(slugForPage("zh/eseje/hui-sikao-de-guang/index.html"), "hui-sikao-de-guang");
  assert.equal(slugForPage("zh\\eseje\\hui-sikao-de-guang\\index.html".split("\\").join("/")), "hui-sikao-de-guang");
  assert.equal(slugForPage("zh/index.html"), "zh");
  assert.equal(slugForPage("zh/o-mnie.html"), "o-mnie");
});

test("deklaracja @font-face niesie swap, sciezke slugu i zakres", () => {
  const css = fontFaceCss("hui-sikao-de-guang");
  assert.match(css, /font-display:swap/);
  assert.match(css, /\/assets\/fonts\/zh\/hui-sikao-de-guang\.woff2/);
  assert.ok(css.includes(UNICODE_RANGE));
  // Zakres CJK nie moze zachodzic na latin/latin-ext Fraunces i Newsreadera.
  assert.equal(/U\+0[0-9A-F]{3}/.test(UNICODE_RANGE), false);
});

test("brak podzbioru usuwa preload, zeby nie zostal link do 404", () => {
  const html =
    '<head><link rel="preload" as="font" type="font/woff2" crossorigin ' +
    'href="/assets/fonts/zh/x.woff2"><link rel="stylesheet" href="/css/fonts.css"></head>';
  const out = stripPreload(html, "x");
  assert.equal(out.includes("zh/x.woff2"), false);
  assert.ok(out.includes('href="/css/fonts.css"'));
});

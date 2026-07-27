import { test } from "node:test";
import assert from "node:assert/strict";
import { advertisedUrls, checkPage, checkSite, essayMarker, pageUrl } from "./check-essays.mjs";

const AUDIO = '<audio preload="none" src="/assets/audio/x-pl.mp3"></audio>';
const SITE = "https://arturpaprocki.com";

/** The `hreflang` block head.njk writes for a language set. */
function alternates(urls) {
  const codes = ["pl", "en", "zh-Hans"];
  return urls
    .map((u, i) => `<link rel="alternate" hreflang="${codes[i] || "xx"}" href="${SITE}${u}">`)
    .join("\n");
}

/** Builds a page with `n` sentences, `timed` of them carrying times, `theses` marks. */
function page({
  n = 10,
  timed = 10,
  theses = 3,
  audio = true,
  dupId = false,
  draft = false,
  slug = "test-essay",
  text = "Zdanie",
  alts = ["/eseje/test-essay/", "/en/essays/test-essay/"],
} = {}) {
  let body = "";
  for (let i = 0; i < n; i++) {
    const tag = i < theses ? "mark" : "span";
    const cls = i < theses ? 'class="z teza"' : 'class="z"';
    const id = dupId && i === 1 ? 0 : i;
    const t = i < timed ? ` data-t="${i}.00" data-e="${i}.90"` : "";
    body += `<${tag} ${cls} id="z${id}"${t}>${text} ${i}.</${tag}> `;
  }
  const draftAttr = draft ? ' data-draft="true"' : "";
  return (
    alternates(alts) +
    `<article data-slug="${slug}"${draftAttr}>${audio ? AUDIO : ""}<p>${body}</p></article>`
  );
}

test("kompletny esej nie zglasza problemow", () => {
  assert.deepEqual(checkPage("x.html", page()), []);
});

test("strona bez artykulu jest pomijana", () => {
  assert.deepEqual(checkPage("x.html", "<main><p>O mnie</p></main>"), []);
});

test("brak podzialu na zdania to blad", () => {
  const html =
    alternates(["/eseje/pusty/", "/en/essays/pusty/"]) +
    '<article data-slug="pusty"><p>Tekst bez spanow.</p></article>';
  const p = checkPage("x.html", html);
  assert.equal(p.length, 1);
  assert.match(p[0], /brak podziału na zdania/);
});

test("braki w czasach ponizej progu to blad", () => {
  const p = checkPage("x.html", page({ n: 20, timed: 18 })); // 90 %
  assert.equal(p.length, 1);
  assert.match(p[0], /18 z 20 zdań ma czasy/);
});

test("drobne braki w czasach powyzej progu przechodza", () => {
  assert.deepEqual(checkPage("x.html", page({ n: 100, timed: 96 })), []);
});

test("brak czasow bez audio nie jest bledem", () => {
  assert.deepEqual(checkPage("x.html", page({ n: 10, timed: 0, audio: false })), []);
});

test("brak tez to blad", () => {
  const p = checkPage("x.html", page({ theses: 0 }));
  assert.equal(p.length, 1);
  assert.match(p[0], /0 tez w tekście/);
});

test("za duzo tez to blad", () => {
  const p = checkPage("x.html", page({ theses: 5 }));
  assert.match(p[0], /5 tez w tekście/);
});

test("powtorzone identyfikatory zdan to blad", () => {
  const p = checkPage("x.html", page({ dupId: true }));
  assert.equal(p.length, 1);
  assert.match(p[0], /powtórzone identyfikatory/);
});

// ————— Drafty: wyjęcie spod bramki idzie ze strony, nie z jej adresu —————
//
// Do 26.07 bramka pomijała katalogi `podglad` i `preview` na PIERWSZYM poziomie
// `_site`. Chiński draft leży pod `/zh/yulan/<kod>/<slug>/`, czyli poziom
// głębiej i pod inną nazwą — przechodził wyłącznie dlatego, że akurat miał tezy
// i komplet czasów. Pierwszy chiński draft bez tez wywaliłby build, podczas gdy
// polski w tym samym stanie przechodził. Poniższe testy pilnują symetrii.

test("draft bez tez i bez czasow nie wyzwala bramki", () => {
  assert.deepEqual(checkPage("x.html", page({ theses: 0, timed: 0, draft: true })), []);
});

test("draft chinski w zagniezdzonym adresie jest wyjety tak samo jak polski", () => {
  const zh = page({ theses: 0, timed: 0, draft: true, slug: "bu-cunzai-de-he", text: "这是一句话" });
  assert.deepEqual(checkPage("_site/zh/yulan/108271eb/bu-cunzai-de-he/index.html", zh), []);
  const pl = page({ theses: 0, timed: 0, draft: true, slug: "proba-podgladu" });
  assert.deepEqual(checkPage("_site/podglad/proba-podgladu-311984d1/index.html", pl), []);
});

test("opublikowany esej chinski bez tez to blad — tak samo jak polski", () => {
  const zh = page({ theses: 0, slug: "bu-cunzai-de-he", text: "这是一句话" });
  const p = checkPage("_site/zh/wenzhang/bu-cunzai-de-he/index.html", zh);
  assert.equal(p.length, 1);
  assert.match(p[0], /^bu-cunzai-de-he: 0 tez w tekście/);
});

test("opublikowany esej chinski bez mapy czasow to blad", () => {
  const zh = page({ n: 49, timed: 0, slug: "bu-cunzai-de-he", text: "这是一句话" });
  const p = checkPage("_site/zh/wenzhang/bu-cunzai-de-he/index.html", zh);
  assert.equal(p.length, 1);
  assert.match(p[0], /0 z 49 zdań ma czasy/);
});

// ————— Zestaw językowy: moment publikacji myli się w OBIE strony —————
//
// Wersje jednego eseju spina klucz `work:`, odkomentowywany ręcznie przy
// publikacji. Pomyłka w jedną stronę (zdjęty `draft:`, `work:` wciąż
// zakomentowany) daje esej publiczny bez ani jednego hreflang; w drugą
// (odkomentowany `work:` przy wciąż aktywnym `draft:`) wpuszcza sekretny adres
// podglądu do publicznych metadanych. Oba stany budowały się na zielono.

test("opublikowany esej bez hreflang to blad — brak klucza work:", () => {
  const p = checkPage("_site/zh/wenzhang/bu-cunzai-de-he/index.html", page({ alts: [] }));
  assert.equal(p.length, 1);
  assert.match(p[0], /bez ani jednego hreflang/);
  assert.match(p[0], /work:/);
});

test("draft bez hreflang nie wyzwala bramki", () => {
  assert.deepEqual(checkPage("x.html", page({ alts: [], draft: true })), []);
});

test("pageUrl czyta adres strony ze sciezki pliku, tez po windowsowemu", () => {
  assert.equal(pageUrl("_site/eseje/swiatlo-ktore-mysli/index.html", "_site"), "/eseje/swiatlo-ktore-mysli/");
  assert.equal(pageUrl("_site\\zh\\yulan\\108271eb\\bu-cunzai-de-he\\index.html", "_site"), "/zh/yulan/108271eb/bu-cunzai-de-he/");
  assert.equal(pageUrl("_site/index.html", "_site"), "/");
  assert.equal(pageUrl("_site/llms.html", "_site"), "/llms.html");
});

test("advertisedUrls bierze hreflang i adresy z JSON-LD, jako sciezki", () => {
  const html =
    alternates(["/eseje/a/", "/en/essays/a/"]) +
    '<link rel="alternate" type="application/json" href="/assets/audio/a-pl.sync.json" title="x">' +
    '<script type="application/ld+json">{"url":"https://arturpaprocki.com/eseje/a/",' +
    '"translationOfWork":{"@id":"https://arturpaprocki.com/zh/yulan/108271eb/a/"},' +
    '"image":"https://arturpaprocki.com/assets/ill/light/x.jpg"}</script>';
  const urls = advertisedUrls(html);
  assert.deepEqual(urls, [
    "/eseje/a/",
    "/en/essays/a/",
    "/eseje/a/",
    "/zh/yulan/108271eb/a/",
    "/assets/ill/light/x.jpg",
  ]);
  // Mapa czasów to `rel="alternate"` bez hreflang — nie jest wersją językową.
  assert.equal(urls.includes("/assets/audio/a-pl.sync.json"), false);
});

test("opublikowana strona wskazujaca adres podgladu to blad", () => {
  const pages = [
    { url: "/eseje/swiatlo-ktore-mysli/", html: page({ slug: "swiatlo-ktore-mysli", alts: ["/eseje/swiatlo-ktore-mysli/", "/en/essays/the-light-that-thinks/", "/zh/yulan/108271eb/bu-cunzai-de-he/"] }) },
    { url: "/zh/yulan/108271eb/bu-cunzai-de-he/", html: page({ slug: "bu-cunzai-de-he", draft: true, alts: [] }) },
  ];
  const p = checkSite(pages);
  assert.equal(p.length, 1);
  assert.match(p[0], /^\/eseje\/swiatlo-ktore-mysli\/: wskazuje adres podglądu \/zh\/yulan\/108271eb\/bu-cunzai-de-he\//);
  assert.match(p[0], /bu-cunzai-de-he/);
});

test("adres podgladu w samym JSON-LD tez wywala bramke", () => {
  const draft = { url: "/podglad/efekt-vertigo-bd3de0f3/", html: page({ slug: "efekt-vertigo", draft: true, alts: [] }) };
  const public_ = {
    url: "/en/essays/the-vertigo-effect/",
    html:
      alternates(["/en/essays/the-vertigo-effect/"]) +
      '<script type="application/ld+json">{"translationOfWork":{"@id":"https://arturpaprocki.com/podglad/efekt-vertigo-bd3de0f3/"}}</script>' +
      page({ slug: "the-vertigo-effect", alts: [] }),
  };
  const p = checkSite([public_, draft]);
  assert.equal(p.length, 1);
  assert.match(p[0], /wskazuje adres podglądu \/podglad\/efekt-vertigo-bd3de0f3\//);
});

test("bramka nie zna katalogow podgladu — rozpoznaje je po stronie, nie po nazwie", () => {
  // Czwarty język dołoży czwarty katalog; wyliczanka prefiksów zestarzałaby się
  // w dniu jego dodania, więc zbiór adresów roboczych bierze się z buildu.
  const pages = [
    { url: "/eseje/x/", html: page({ slug: "x", alts: ["/eseje/x/", "/de/vorschau/9f2c1ab0/x/"] }) },
    { url: "/de/vorschau/9f2c1ab0/x/", html: page({ slug: "x", draft: true, alts: [] }) },
  ];
  assert.equal(checkSite(pages).length, 1);
});

test("zestaw samych opublikowanych adresow przechodzi", () => {
  const pages = [
    { url: "/eseje/x/", html: page({ slug: "x", alts: ["/eseje/x/", "/en/essays/x/"] }) },
    { url: "/en/essays/x/", html: page({ slug: "x", alts: ["/eseje/x/", "/en/essays/x/"] }) },
  ];
  assert.deepEqual(checkSite(pages), []);
});

test("draft wskazujacy wlasny adres podgladu nie jest bledem", () => {
  const url = "/zh/yulan/108271eb/bu-cunzai-de-he/";
  const html =
    alternates([url]) +
    `<script type="application/ld+json">{"url":"${SITE}${url}"}</script>` +
    page({ slug: "bu-cunzai-de-he", draft: true, alts: [] });
  assert.deepEqual(checkSite([{ url, html }]), []);
});

test("essayMarker czyta slug i stan roboczy z artykulu", () => {
  assert.equal(essayMarker("<main><p>O mnie</p></main>"), null);
  assert.deepEqual(essayMarker(page({ slug: "a" })), { slug: "a", draft: false });
  assert.deepEqual(essayMarker(page({ slug: "a", draft: true })), { slug: "a", draft: true });
  // Kolejność atrybutów nie ma znaczenia — czytamy cały znacznik otwierający.
  assert.deepEqual(essayMarker('<article data-draft="true" data-slug="a">x</article>'), {
    slug: "a",
    draft: true,
  });
  // `data-slug` w treści strony (np. w przykładzie kodu) to nie artykuł.
  assert.equal(essayMarker('<p>data-slug="a"</p>'), null);
});

import { imageShortcode } from "./lib/images.mjs";
import { gestureShortcode } from "./lib/gesture.mjs";
import { dateFilters } from "./lib/dates.mjs";
import { faviconPlugin } from "./lib/favicon.mjs";
import { cjkFontsPlugin } from "./lib/fonts-cjk.mjs";
import { readingSyncTransform } from "./lib/reading-sync.mjs";
import langs from "./src/_data/langs.mjs";

// ——— Zestaw językowy (LANG-SET, spec 0052) ———
//
// Wersje jednego tekstu wiąże wspólny klucz `work:` we frontmatterze. Zestaw
// to uporządkowana lista `[{ lang, url, title }]` — ta sama struktura opisuje
// parę i trójkę, więc szablony mają jedną ścieżkę renderowania niezależnie od
// liczby języków.
//
// Strony stałe (`/`, `/o-mnie/`, `/kontakt/`, `/dziekuje/` i ich odpowiedniki
// EN) nadal noszą stare pole `pair:` — normalizujemy je do tego samego
// kształtu zamiast przepisywać siedem plików, których ten spec nie dotyczy.
// Stara para opisuje wyłącznie oś PL↔EN; trzeci język wchodzi tam przez
// `work:`, tak jak w esejach.
function langSetOfWork(data) {
  const works = data.collections?.works;
  const key = data.work;
  // Przy sondowaniu zależności Eleventy podstawia pod `collections.*` puste
  // tablice — stąd jawne sprawdzenie kształtu, nie samej prawdziwości.
  if (key && works && !Array.isArray(works)) {
    const versions = works[key];
    if (Array.isArray(versions) && versions.length > 1) return versions;
  }
  return null;
}

function buildLangSet(data) {
  const fromWork = langSetOfWork(data);
  if (fromWork) return fromWork;

  const lang = data.lang;
  if (data.pair && (lang === "pl" || lang === "en")) {
    const self = { lang, url: data.page?.url, title: data.title || "" };
    const other = { lang: lang === "pl" ? "en" : "pl", url: data.pair, title: "" };
    return lang === "pl" ? [self, other] : [other, self];
  }
  return null;
}

// Zgodność wsteczna: `pair` było polem frontmattera z adresem drugiej wersji.
// Dziś wynika z zestawu — dla zestawu DWUELEMENTOWEGO wskazuje tę drugą
// wersję, przy trzech i więcej zostaje puste, bo jeden link przestaje opisywać
// relację (wtedy właściwym źródłem jest `langSet`). Strony stałe dostają
// z powrotem własną wartość z nagłówka pliku: Eleventy pomija samoodwołanie
// przy liczeniu zależności, więc `data.pair` to tu wciąż wartość z frontmatteru.
function backwardCompatiblePair(data) {
  const versions = langSetOfWork(data);
  if (versions && versions.length === 2) {
    const other = versions.find((v) => v.lang !== data.lang);
    if (other) return other.url;
  }
  return data.pair;
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/canal");

  imageShortcode(eleventyConfig);
  gestureShortcode(eleventyConfig);
  dateFilters(eleventyConfig);
  // Czytanie synchroniczne: zdania + czasy pieczone w HTML (spec 0051).
  // Bez pliku <slug>-<lang>.sync.json strona wychodzi z buildu nietknieta.
  readingSyncTransform(eleventyConfig);

  // Drafty (draft: true) zostaja poza listami, feedami i sitemapa.
  eleventyConfig.addFilter("published", (items) =>
    (items || []).filter((it) => !it.data.draft)
  );
  faviconPlugin(eleventyConfig);
  // Podzbiór Noto Serif SC ze znaków, które strona ZH realnie stawia
  // (FONT-CJK). Musi biec PO zbudowaniu HTML, stąd hak `eleventy.after`.
  // Bez tej linii preload z `base.njk` wskazuje 404, a strona chińska cicho
  // schodzi na krój systemowy — dlatego sam fakt rejestracji jest testowany
  // (`lib/eleventy-config.test.mjs`).
  cjkFontsPlugin(eleventyConfig);

  // Trzy filtry na zestawie językowym — tyle wystarczy, żeby szablon nie
  // musiał wiedzieć, ile wersji ma utwór.
  eleventyConfig.addFilter("langPick", (set, code) =>
    (set || []).find((v) => v.lang === code) || null
  );
  eleventyConfig.addFilter("langExcept", (set, code) =>
    (set || []).filter((v) => v.lang !== code)
  );
  eleventyConfig.addFilter("langIndex", (set, code) =>
    (set || []).findIndex((v) => v.lang === code)
  );
  // Przełącznik musi zawierać język TEJ strony. Zestaw bywa zapasowy (strony
  // główne języków dla stron bez odpowiednika) i wtedy brakuje w nim języka,
  // który jeszcze nie jest `live` — a wtedy `langIndex` daje -1: suwak staje
  // pod pierwszą opcją i ŻADNA nie dostaje `aria-current`. Ten filtr dokłada
  // bieżącą stronę jako jej własną pozycję, na miejscu wynikającym z
  // `langs.order`, więc indeks jest zawsze prawdziwy.
  eleventyConfig.addFilter("langEnsure", (set, code, url) => {
    const list = set || [];
    if (!code || !langs.by[code] || list.some((v) => v.lang === code)) return list;
    return [...list, { lang: code, url: url || langs.by[code].home, title: "" }].sort(
      (a, b) => langs.order.indexOf(a.lang) - langs.order.indexOf(b.lang)
    );
  });

  eleventyConfig.addGlobalData("eleventyComputed", {
    langSet: buildLangSet,
    pair: backwardCompatiblePair,
  });

  // Wszystkie wersje jednego utworu pod jego kluczem, w kolejności `langs.order`.
  eleventyConfig.addCollection("works", (collection) => {
    const works = {};
    for (const item of collection.getAll()) {
      const key = item.data.work;
      if (!key || !langs.order.includes(item.data.lang)) continue;
      (works[key] ||= []).push({
        lang: item.data.lang,
        url: item.url,
        title: item.data.title || "",
      });
    }
    for (const versions of Object.values(works)) {
      versions.sort((a, b) => langs.order.indexOf(a.lang) - langs.order.indexOf(b.lang));
    }
    return works;
  });

  // Po jednej kolekcji esejów na język — nowy język dokłada się tagiem
  // `essays_<kod>` w danych katalogu, bez zmiany w tym pliku.
  for (const code of langs.order) {
    eleventyConfig.addCollection(`essays_${code}`, (collection) =>
      collection.getFilteredByTag(`essays_${code}`).sort((a, b) => b.date - a.date)
    );
  }

  eleventyConfig.addCollection("notatki", (collection) =>
    collection.getFilteredByTag("notatki").sort((a, b) => b.date - a.date)
  );
  // Feed PL scala eseje i notatki w jedną chronologiczną oś.
  eleventyConfig.addCollection("content_pl", (collection) =>
    [
      ...collection.getFilteredByTag("essays_pl"),
      ...collection.getFilteredByTag("notatki"),
    ].sort((a, b) => b.date - a.date)
  );

  return {
    dir: {
      input: "src",
      output: "_site",
    },
  };
}

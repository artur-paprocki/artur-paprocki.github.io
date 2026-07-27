import { test } from "node:test";
import assert from "node:assert/strict";
import eleventyConfig from "../eleventy.config.mjs";
import langs from "../src/_data/langs.mjs";

// Testy na SKŁADANEJ konfiguracji, nie na pojedynczych funkcjach.
//
// Powód jest konkretny: `lib/fonts-cjk.mjs` przeszedł osiem testów jednostkowych
// i ani razu nie został wywołany przez build — nikt go nie podpiął w
// `eleventy.config.mjs`. Test funkcji z definicji tego nie widzi, bo pyta
// „czy funkcja liczy dobrze", a nie „czy ktokolwiek ją woła". Poniższy zestaw
// uruchamia prawdziwą funkcję konfiguracyjną na atrapie i pyta o to drugie.

function loadConfig() {
  const filters = new Map();
  const shortcodes = new Map();
  const collections = new Map();
  const transforms = new Map();
  const globalData = new Map();
  const events = new Map();
  const passthrough = [];

  const stub = {
    addPassthroughCopy: (p) => passthrough.push(p),
    addFilter: (name, fn) => filters.set(name, fn),
    addShortcode: (name, fn) => shortcodes.set(name, fn),
    addAsyncShortcode: (name, fn) => shortcodes.set(name, fn),
    addTransform: (name, fn) => transforms.set(name, fn),
    addCollection: (name, fn) => collections.set(name, fn),
    addGlobalData: (name, value) => globalData.set(name, value),
    on: (event, fn) => {
      if (!events.has(event)) events.set(event, []);
      events.get(event).push(fn);
    },
  };

  const returned = eleventyConfig(stub);
  return { filters, shortcodes, collections, transforms, globalData, events, passthrough, returned };
}

test("krok podzbioru fontu CJK jest podpiety do builda", () => {
  const { events } = loadConfig();
  const after = events.get("eleventy.after") || [];
  const names = after.map((fn) => fn.name);
  assert.ok(
    names.includes("cjkSubsetsAfterBuild"),
    `haki eleventy.after: [${names.join(", ")}] — brak kroku fontu CJK, ` +
      "strona ZH straci webfont i preload wskaze 404"
  );
});

test("generowanie favikon nadal wisi na tym samym haku", () => {
  const { events } = loadConfig();
  const names = (events.get("eleventy.after") || []).map((fn) => fn.name);
  assert.ok(names.includes("generateFavicons"), names.join(", "));
});

test("langExcept oddaje wszystkie pozostale wersje, nie jedna", () => {
  const { filters } = loadConfig();
  const set = [
    { lang: "pl", url: "/eseje/a/" },
    { lang: "en", url: "/essays/a/" },
    { lang: "zh", url: "/zh/eseje/a/" },
  ];
  assert.deepEqual(
    filters.get("langExcept")(set, "pl").map((v) => v.lang),
    ["en", "zh"]
  );
  assert.deepEqual(
    filters.get("langExcept")(set, "zh").map((v) => v.lang),
    ["pl", "en"]
  );
  // Para zachowuje sie jak dotad.
  assert.deepEqual(
    filters.get("langExcept")(set.slice(0, 2), "pl").map((v) => v.lang),
    ["en"]
  );
  assert.deepEqual(filters.get("langExcept")(null, "pl"), []);
});

test("langEnsure dokłada jezyk strony do zestawu przelacznika", () => {
  const { filters } = loadConfig();
  const homes = [
    { lang: "pl", url: "/" },
    { lang: "en", url: "/en/" },
  ];
  const out = filters.get("langEnsure")(homes, "zh", "/zh/o-mnie/");
  assert.deepEqual(out.map((v) => v.lang), ["pl", "en", "zh"]);
  assert.equal(out[2].url, "/zh/o-mnie/");
  // Kolejnosc zawsze wg langs.order, nawet gdy brakuje srodkowego jezyka.
  const bez = filters.get("langEnsure")([{ lang: "zh", url: "/zh/" }], "pl", "/");
  assert.deepEqual(bez.map((v) => v.lang), ["pl", "zh"]);
});

test("langEnsure nie rusza zestawu, ktory juz ma ten jezyk", () => {
  const { filters } = loadConfig();
  const set = [
    { lang: "pl", url: "/eseje/a/" },
    { lang: "en", url: "/essays/a/" },
  ];
  assert.equal(filters.get("langEnsure")(set, "pl", "/eseje/a/"), set);
  // Jezyk spoza rejestru nie wchodzi do przelacznika — nie ma dla niego etykiety.
  assert.equal(filters.get("langEnsure")(set, "de", "/de/"), set);
  assert.deepEqual(filters.get("langEnsure")(null, "pl", "/"), [
    { lang: "pl", url: "/", title: "" },
  ]);
});

test("po langEnsure suwak pigulki nigdy nie stoi na -1", () => {
  const { filters } = loadConfig();
  const homes = [
    { lang: "pl", url: "/" },
    { lang: "en", url: "/en/" },
  ];
  for (const code of langs.order) {
    const set = filters.get("langEnsure")(homes, code, `/${code}/probna/`);
    const index = filters.get("langIndex")(set, code);
    assert.ok(index >= 0, `${code}: data-index=${index}`);
    assert.equal(set[index].lang, code);
  }
});

test("kazdy jezyk rejestru ma etykiety, ktorych szablony od niego wymagaja", () => {
  for (const code of langs.order) {
    const L = langs.by[code];
    for (const key of ["label", "switchTo", "readVersion", "hreflang", "home"]) {
      assert.equal(typeof L[key], "string", `${code}.${key}`);
      assert.ok(L[key].length > 0, `${code}.${key}`);
    }
  }
});

// Napisy strony eseju. Bez tego testu czwarty jezyk dolozony samymi danymi
// renderowalby puste `<div class="draft-banner"></div>` i pusty podpis
// odtwarzacza — build zielony, strona bez slow.
const UI_KEYS = [
  "draftBanner", "reading", "listen", "play", "pause", "progress", "theses",
  "transcript", "subscribeTitle", "subscribeBody", "subscribeCta",
];

test("kazdy jezyk ma komplet napisow interfejsu eseju", () => {
  for (const code of langs.order) {
    const ui = langs.by[code].ui;
    assert.ok(ui, `${code}.ui`);
    for (const key of UI_KEYS) {
      assert.equal(typeof ui[key], "string", `${code}.ui.${key}`);
      assert.ok(ui[key].trim().length > 0, `${code}.ui.${key}`);
    }
    // Czas czytania podstawia sie w szablonie przez `replace("{n}", …)`.
    for (const key of ["reading", "listen"]) {
      assert.ok(ui[key].includes("{n}"), `${code}.ui.${key} bez miejsca na liczbe minut`);
    }
  }
});

test("etykieta odtwarzacza ZH nie oglasza glosu autora", () => {
  // Decyzja Artura (spec 0052 §2): wersje chinska czyta natywny lektor.
  assert.ok(!/作者/.test(langs.by.zh.ui.listen), langs.by.zh.ui.listen);
  assert.ok(!/author|autor/i.test(langs.by.zh.ui.listen), langs.by.zh.ui.listen);
  // Polska i angielska zostaja przy glosie autora — tam to prawda.
  assert.match(langs.by.pl.ui.listen, /głos autora/);
  assert.match(langs.by.en.ui.listen, /author's voice/);
});

test("filtr localdate jest podpiety do builda", () => {
  const { filters } = loadConfig();
  const localdate = filters.get("localdate");
  assert.ok(localdate, `filtry: [${[...filters.keys()].join(", ")}]`);
  assert.equal(localdate("2026-07-11", "zh"), "2026年7月11日");
});

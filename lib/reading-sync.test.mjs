import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  annotateHtml,
  matchKey,
  normalizeText,
  readFrontMatterFields,
  readingSyncTransform,
  resolveLang,
  splitSentences,
  syncPathFor,
} from "./reading-sync.mjs";

const article = (inner) => `<main><article>\n${inner}\n</article></main>`;

function syncOf(...texts) {
  return {
    version: 1,
    sentences: texts.map((text, i) => ({ i, block: 0, start: i * 10, end: i * 10 + 9.5, text })),
  };
}

function collectLogs(html, options) {
  const logs = [];
  const out = annotateHtml(html, { ...options, onLog: (line) => logs.push(line) });
  return { out, logs };
}

// ------------------------------------------------------------ SEG-1

test("dzieli na zdaniach po kropce, wykrzykniku i wielokropku", () => {
  assert.deepEqual(splitSentences("Pierwsze zdanie. Drugie zdanie! Trzecie… Czwarte?"), [
    "Pierwsze zdanie.",
    "Drugie zdanie!",
    "Trzecie…",
    "Czwarte?",
  ]);
});

test("nie dzieli na skrotach polskich", () => {
  assert.deepEqual(splitSentences("Robimy to np. w Unrealu, m.in. z Volingą. Potem koniec."), [
    "Robimy to np. w Unrealu, m.in. z Volingą.",
    "Potem koniec.",
  ]);
  assert.deepEqual(splitSentences("Mówił o tym prof. Nowak i dr hab. Kowalska. Koniec."), [
    "Mówił o tym prof. Nowak i dr hab. Kowalska.",
    "Koniec.",
  ]);
});

test("nie dzieli na skrotach angielskich", () => {
  assert.deepEqual(
    splitSentences("We met Dr. Smith, e.g. at St. Paul's. The rest followed.", "en"),
    ["We met Dr. Smith, e.g. at St. Paul's.", "The rest followed."]
  );
});

test("nie dzieli na inicjalach", () => {
  assert.deepEqual(splitSentences("Napisał to E. B. Bratner w zeszłym roku. Potem zniknął."), [
    "Napisał to E. B. Bratner w zeszłym roku.",
    "Potem zniknął.",
  ]);
});

test("nie dzieli wewnatrz liczb ani po liczebniku porzadkowym", () => {
  assert.deepEqual(splitSentences("Ekran ma 7,5 na 3.5 metra. Reszta to szczegóły."), [
    "Ekran ma 7,5 na 3.5 metra.",
    "Reszta to szczegóły.",
  ]);
  assert.deepEqual(splitSentences("Zaczęło się w 2026. Rok później skończyło."), [
    "Zaczęło się w 2026. Rok później skończyło.",
  ]);
});

test("dzieli po cudzyslowie i nawiasie zamykajacym", () => {
  assert.deepEqual(splitSentences('Powiedział „nie da się”. Dało się.'), [
    "Powiedział „nie da się”.",
    "Dało się.",
  ]);
  assert.deepEqual(splitSentences("To był błąd (mój). Nikt go nie złapał."), [
    "To był błąd (mój).",
    "Nikt go nie złapał.",
  ]);
});

test("fragment krotszy niz trzy znaki doklejany do poprzedniego zdania", () => {
  assert.deepEqual(splitSentences("Zdanie pierwsze. 5! Zdanie trzecie."), [
    "Zdanie pierwsze. 5!",
    "Zdanie trzecie.",
  ]);
});

// --------------------------------------------------------- SEG-1-ZH
// Kontrakt spec 0052 §SEG-1-ZH. Te same przypadki stoja w `sync.test.mjs`
// w vaulcie — segmentacja jest kopia i musi dawac znak w znak to samo.

test("ZH: 。！？ dziela zdanie bez spacji po znaku", () => {
  assert.deepEqual(splitSentences("光会思考。真的吗？我不信！", "zh"), [
    "光会思考。",
    "真的吗？",
    "我不信！",
  ]);
});

test("ZH: wielokropek …… i ciag ？！ koncza zdanie jednym ciagiem", () => {
  assert.deepEqual(splitSentences("她笑了……然后离开了。真的吗？！我不信。", "zh"), [
    "她笑了……",
    "然后离开了。",
    "真的吗？！",
    "我不信。",
  ]);
});

test("ZH: znaki domykajace 」”） naleza do konczonego zdania", () => {
  assert.deepEqual(splitSentences("他说：「光会思考。」我不同意。", "zh"), [
    "他说：「光会思考。」",
    "我不同意。",
  ]);
  assert.deepEqual(splitSentences("他问：“这就是全部吗？”我点了点头。", "zh"), [
    "他问：“这就是全部吗？”",
    "我点了点头。",
  ]);
  assert.deepEqual(splitSentences("（这是后话。）下一句从这里开始。", "zh"), [
    "（这是后话。）",
    "下一句从这里开始。",
  ]);
});

test("ZH: cudzyslow otwierajacy po terminatorze zaczyna nowe zdanie", () => {
  assert.deepEqual(splitSentences("他说。“我来了。”她没有回答。", "zh"), [
    "他说。",
    "“我来了。”",
    "她没有回答。",
  ]);
});

test("ZH: kropka lacinska nie jest terminatorem", () => {
  assert.deepEqual(splitSentences("版本 2.0 在 2026 年发布。渲染从 35.7 秒降到 3.5 秒。", "zh"), [
    "版本 2.0 在 2026 年发布。",
    "渲染从 35.7 秒降到 3.5 秒。",
  ]);
  assert.deepEqual(splitSentences("详见 arturpaprocki.com/eseje。就这样。", "zh"), [
    "详见 arturpaprocki.com/eseje。",
    "就这样。",
  ]);
});

test("ZH: o cieciu decyduje jezyk wersji, nie zawartosc zdania", () => {
  const text = '广告语写着 "The light that thinks." Nobody believed it。';
  assert.deepEqual(splitSentences(text, "zh"), [text]);
  assert.deepEqual(splitSentences(text, "pl"), [
    '广告语写着 "The light that thinks."',
    "Nobody believed it。",
  ]);
});

test("ZH: prog dwoch znakow zostawia „是。”, sierote jednoznakowa dokleja", () => {
  assert.deepEqual(splitSentences("人类需要新的问题。是。这就是全部。", "zh"), [
    "人类需要新的问题。",
    "是。",
    "这就是全部。",
  ]);
  assert.deepEqual(splitSentences("这是一句。 。 下一句。", "zh"), ["这是一句。 。", "下一句。"]);
});

test("ZH: warianty tagu zh-Hans/zh-CN/zh_Hant tna tak samo jak zh", () => {
  const text = "光会思考。真的吗？我不信！";
  const base = splitSentences(text, "zh");
  for (const lang of ["zh-Hans", "zh-CN", "zh_Hant", "ZH-HANS"]) {
    assert.deepEqual(splitSentences(text, lang), base, `wariant ${lang}`);
  }
});

test("ZH: transform owija chinskie zdania w spany z czasami", () => {
  const html = article("<p>光会思考。真的吗？</p>");
  const { out } = collectLogs(html, {
    slug: "guang",
    lang: "zh",
    sync: syncOf("光会思考。", "真的吗？"),
  });

  assert.match(out, /<span class="z" id="z0" data-t="0.00" data-e="9.50">光会思考。<\/span>/);
  assert.match(out, /<span class="z" id="z1" data-t="10.00" data-e="19.50">真的吗？<\/span>/);
});

// ----------------------------------------------------------- MATCH-1

test("normalizacja sprowadza typografie do ASCII i lowercase", () => {
  assert.equal(normalizeText("  „Cytat”  —  ciąg\ndalszy… "), '"cytat" - ciąg dalszy...');
  assert.equal(matchKey("a".repeat(40)), "a".repeat(24));
});

// ------------------------------------------------------------ HTML-1

test("owija zdania w spany z czasami i globalna numeracja przez wiele akapitow", () => {
  const html = article("<p>Pierwsze zdanie. Drugie zdanie.</p>\n<p>Trzecie zdanie.</p>");
  const { out } = collectLogs(html, {
    slug: "test",
    sync: syncOf("Pierwsze zdanie.", "Drugie zdanie.", "Trzecie zdanie."),
  });

  assert.match(out, /<span class="z" id="z0" data-t="0.00" data-e="9.50">Pierwsze zdanie\.<\/span>/);
  assert.match(out, /<span class="z" id="z1" data-t="10.00" data-e="19.50">Drugie zdanie\.<\/span>/);
  assert.match(out, /<span class="z" id="z2" data-t="20.00" data-e="29.50">Trzecie zdanie\.<\/span>/);
});

test("nie rozcina linku ani kursywy w srodku zdania", () => {
  const inner =
    '<p>Zdanie z <a href="https://x.test">linkiem w środku</a> i końcem. Drugie z <em>kursywą</em>.</p>';
  const { out } = collectLogs(article(inner), {
    slug: "test",
    sync: syncOf("Zdanie z linkiem w środku i końcem.", "Drugie z kursywą."),
  });

  assert.match(
    out,
    /<span class="z" id="z0"[^>]*>Zdanie z <a href="https:\/\/x\.test">linkiem w środku<\/a> i końcem\.<\/span>/
  );
  assert.match(out, /<span class="z" id="z1"[^>]*>Drugie z <em>kursywą<\/em>\.<\/span>/);
  assert.equal(out.match(/<a href/g).length, 1);
});

test("zdanie zamkniete kursywa tnie sie dopiero za tagiem zamykajacym", () => {
  const inner = "<p><em>Całe zdanie w kursywie.</em> Drugie zdanie zwykłe.</p>";
  const { out } = collectLogs(article(inner), { slug: "test", sync: syncOf("x") });

  assert.match(out, /<span class="z" id="z0"><em>Całe zdanie w kursywie\.<\/em><\/span>/);
  assert.match(out, /<span class="z" id="z1">Drugie zdanie zwykłe\.<\/span>/);
});

test("zdanie zaczynajace sie linkiem obejmuje caly element", () => {
  const inner = '<p>Pierwsze zdanie. <a href="/x">Link otwiera</a> drugie zdanie.</p>';
  const { out } = collectLogs(article(inner), { slug: "test", sync: syncOf("x") });

  assert.match(out, /<span class="z" id="z1"><a href="\/x">Link otwiera<\/a> drugie zdanie\.<\/span>/);
});

test("pomija figure, figcaption i tresc poza article", () => {
  const html = `<div class="essay-head"><h1>Tytuł</h1></div>${article(
    '<p>Akapit pierwszy.</p>\n<figure class="still-ill"><img src="a.jpg" alt="a"><figcaption>Podpis kadru. Drugie zdanie podpisu.</figcaption></figure>\n<p>Akapit drugi.</p>'
  )}<div class="monogram-zone"><p>Stopka.</p></div>`;
  const { out } = collectLogs(html, { slug: "test", sync: syncOf("Akapit pierwszy.", "Akapit drugi.") });

  assert.match(out, /<figcaption>Podpis kadru\. Drugie zdanie podpisu\.<\/figcaption>/);
  assert.match(out, /<div class="essay-head"><h1>Tytuł<\/h1><\/div>/);
  assert.match(out, /<div class="monogram-zone"><p>Stopka\.<\/p><\/div>/);
  assert.equal(out.match(/class="z"/g).length, 2);
});

test("naglowek to jedno zdanie, blockquote i lista sa dzielone normalnie", () => {
  const inner =
    "<h2>Tytuł. Z kropką w środku</h2>\n<blockquote class=\"pull\"><p>Cytat jeden. Cytat dwa.</p></blockquote>\n<ul><li>Punkt jeden. Punkt dwa.</li></ul>";
  const { out } = collectLogs(article(inner), { slug: "test", sync: syncOf("x") });

  assert.match(out, /<h2><span class="z" id="z0">Tytuł\. Z kropką w środku<\/span><\/h2>/);
  assert.match(out, /<li><span class="z" id="z3">Punkt jeden\.<\/span> <span class="z" id="z4">Punkt dwa\.<\/span><\/li>/);
});

test("li zawierajace akapit nie jest owijane podwojnie", () => {
  const inner = "<ul><li><p>Punkt akapitowy.</p></li></ul>";
  const { out } = collectLogs(article(inner), { slug: "test", sync: syncOf("x") });

  assert.equal(out.match(/class="z"/g).length, 1);
  assert.match(out, /<li><p><span class="z" id="z0">Punkt akapitowy\.<\/span><\/p><\/li>/);
});

// ------------------------------------------------- MATCH-1 na dokumencie

test("dopasowanie przeskakuje do trzech zdan mapy", () => {
  const html = article("<p>Alfa zdanie pierwsze. Beta zdanie drugie.</p>");
  const sync = syncOf(
    "Alfa zdanie pierwsze.",
    "Podpis kadru pominięty w HTML.",
    "Drugi podpis pominięty w HTML.",
    "Trzeci podpis pominięty w HTML.",
    "Beta zdanie drugie."
  );
  const { out, logs } = collectLogs(html, { slug: "test", sync });

  assert.match(out, /id="z0" data-t="0.00"/);
  assert.match(out, /id="z1" data-t="40.00"/);
  assert.deepEqual(logs, ["[sync] test-pl: dopasowano 2/2 zdań"]);
});

test("niedopasowane zdanie zostaje spanem bez czasow, log ostrzega ponizej 80 procent", () => {
  const html = article("<p>Alfa zdanie pierwsze. Zupełnie inne zdanie tutaj.</p>");
  const { out, logs } = collectLogs(html, { slug: "test", sync: syncOf("Alfa zdanie pierwsze.") });

  assert.match(out, /<span class="z" id="z1">Zupełnie inne zdanie tutaj\.<\/span>/);
  assert.deepEqual(logs, ["WARN [sync] test-pl: dopasowano 1/2 zdań"]);
});

test("brak mapy sync i brak tez zostawia HTML bajt w bajt", () => {
  const html = article("<p>Pierwsze zdanie. Drugie zdanie.</p>");
  assert.equal(annotateHtml(html, { slug: "test", sync: null }), html);
  assert.equal(annotateHtml(html, { slug: "test", sync: { sentences: [] } }), html);
  assert.equal(annotateHtml(html, { slug: "test", sync: null, theses: [] }), html);
});

test("tezy bez mapy daja mark i spany bez czasow", () => {
  const html = article("<p>Zwykłe zdanie otwierające. Zdanie będące tezą tekstu.</p>");
  const { out, logs } = collectLogs(html, {
    slug: "test",
    sync: null,
    theses: ["Zdanie będące tezą tekstu."],
  });

  assert.match(out, /<span class="z" id="z0">Zwykłe zdanie otwierające\.<\/span>/);
  assert.match(out, /<mark class="z teza" id="z1">Zdanie będące tezą tekstu\.<\/mark>/);
  assert.equal(/data-[te]=/.test(out), false);
  assert.deepEqual(logs, ["[sync] test-pl: bez mapy czasów — 2 zdań, 1 tez"]);
});

test("strona bez article zostaje nietknieta", () => {
  const html = "<main><p>Strona listy. Bez artykułu.</p></main>";
  assert.equal(annotateHtml(html, { slug: "test", sync: syncOf("Strona listy.") }), html);
});

// --------------------------------------------------------------- FM-1

test("teza renderuje sie jako mark z klasa teza", () => {
  const html = article("<p>Zwykłe zdanie otwierające. Zdanie będące tezą tekstu.</p>");
  const { out, logs } = collectLogs(html, {
    slug: "test",
    sync: syncOf("Zwykłe zdanie otwierające.", "Zdanie będące tezą tekstu."),
    theses: ["Zdanie będące tezą tekstu."],
  });

  assert.match(
    out,
    /<mark class="z teza" id="z1" data-t="10.00" data-e="19.50">Zdanie będące tezą tekstu\.<\/mark>/
  );
  assert.deepEqual(logs, ["[sync] test-pl: dopasowano 2/2 zdań"]);
});

test("teza bez dopasowania daje ostrzezenie, nie wyjatek", () => {
  const html = article("<p>Zdanie pierwsze w tekście.</p>");
  const { out, logs } = collectLogs(html, {
    slug: "test",
    sync: syncOf("Zdanie pierwsze w tekście."),
    theses: ["Teza, której w tekście nie ma wcale."],
  });

  assert.match(out, /<span class="z" id="z0"/);
  assert.equal(out.includes("<mark"), false);
  assert.deepEqual(logs, [
    "[sync] test-pl: dopasowano 1/1 zdań",
    'WARN [sync] test-pl: teza bez dopasowania — "Teza, której w tekście nie ma wcale."',
  ]);
});

// -------------------------------------------------------- front matter

test("czyta audio i tezy z frontmatteru", () => {
  const raw = [
    "---",
    'title: "Rzeka, której nie ma"',
    "readingTime: 5",
    "audio: /assets/audio/swiatlo-ktore-mysli-pl.mp3",
    "theses:",
    '  - "Pierwsza teza eseju."',
    '  - "Druga teza eseju."',
    "---",
    "",
    "Treść eseju.",
  ].join("\n");

  const fields = readFrontMatterFields(raw);
  assert.equal(fields.audio, "/assets/audio/swiatlo-ktore-mysli-pl.mp3");
  assert.deepEqual(fields.theses, ["Pierwsza teza eseju.", "Druga teza eseju."]);
});

test("frontmatter z CRLF czyta sie tak samo jak z LF", () => {
  const raw = [
    "---",
    'title: "Reżyser, który dołączył do maszyny"',
    "audio: /assets/audio/rezyser-pl.mp3",
    "theses:",
    '  - "Pierwsza teza eseju."',
    '  - "Druga teza eseju."',
    '  - "Trzecia teza eseju."',
    "---",
    "",
    "Treść eseju.",
  ].join("\r\n");

  const fields = readFrontMatterFields("﻿" + raw);
  assert.equal(fields.title, "Reżyser, który dołączył do maszyny");
  assert.equal(fields.audio, "/assets/audio/rezyser-pl.mp3");
  assert.deepEqual(fields.theses, [
    "Pierwsza teza eseju.",
    "Druga teza eseju.",
    "Trzecia teza eseju.",
  ]);
  // Osamotniony CR (stare Makintosze, sklejki narzędzi) też nie może gasić funkcji.
  assert.deepEqual(readFrontMatterFields(raw.replace(/\r\n/g, "\r")).theses, fields.theses);
});

test("esej bez audio nie ma czego synchronizowac", () => {
  const fields = readFrontMatterFields('---\ntitle: "Bez audio"\n---\nTreść.');
  assert.equal(fields.audio, undefined);
});

test("jezyk z katalogu wejsciowego", () => {
  assert.equal(resolveLang("./src/eseje/swiatlo-ktore-mysli.md", "/eseje/swiatlo-ktore-mysli/"), "pl");
  assert.equal(resolveLang("./src/essays/the-light-that-thinks.md", "/essays/the-light-that-thinks/"), "en");
  assert.equal(resolveLang("src\\essays\\the-light-that-thinks.md", "/preview/x-1234/"), "en");
});

// Bez tego testu gałąź SEG-1-ZH jest kodem, którego produkcja nigdy nie wywoła:
// esej chiński dostawał język `pl` i wychodził z buildu z jednym zdaniem
// na akapit — bez błędu i bez ostrzeżenia.
test("jezyk chinski rozpoznany po segmencie /zh/", () => {
  assert.equal(resolveLang("./src/zh/wenzhang/bu-cunzai-de-he.md", "/zh/wenzhang/bu-cunzai-de-he/"), "zh");
  assert.equal(resolveLang("src\\zh\\wenzhang\\bu-cunzai-de-he.md", "/zh/yulan/2f3a/bu-cunzai-de-he/"), "zh");
  assert.equal(resolveLang("./src/zh/guanyu.njk", "/zh/guanyu/"), "zh");
  // Polski i angielski nie mogą wpaść w chińską gałąź przez samą literę.
  assert.equal(resolveLang("./src/eseje/zhuravl.md", "/eseje/zhuravl/"), "pl");
});

test("mapa czasow szukana w katalogu wejsciowym, nie jeden poziom nad esejem", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sync-path-"));
  const audio = path.join(root, "src", "assets", "audio");
  fs.mkdirSync(audio, { recursive: true });
  fs.mkdirSync(path.join(root, "src", "zh", "wenzhang"), { recursive: true });
  fs.mkdirSync(path.join(root, "src", "eseje"), { recursive: true });

  // Esej dwa poziomy pod `src/` (sekcja ZH) — dawne „..” dawało src/zh/assets/audio.
  assert.equal(
    syncPathFor(path.join(root, "src", "zh", "wenzhang", "bu-cunzai-de-he.md"), "bu-cunzai-de-he", "zh"),
    path.join(audio, "bu-cunzai-de-he-zh.sync.json")
  );
  // Esej jeden poziom pod `src/` — bez zmiany zachowania.
  assert.equal(
    syncPathFor(path.join(root, "src", "eseje", "swiatlo-ktore-mysli.md"), "swiatlo-ktore-mysli", "pl"),
    path.join(audio, "swiatlo-ktore-mysli-pl.sync.json")
  );
  fs.rmSync(root, { recursive: true, force: true });
});

// ------------------------------------------------------- transform

// Minimalna atrapa Eleventy: przechwytuje funkcje transformu i pozwala wywolac ja
// z podstawiona strona (`this.page`), tak jak robi to build.
function runTransform({ inputPath, url, fileSlug, content }) {
  let transform;
  const logs = [];
  readingSyncTransform(
    { addTransform: (_name, fn) => { transform = fn; } },
    { log: (line) => logs.push(line) }
  );
  const out = transform.call(
    { page: { inputPath, url, fileSlug, outputPath: "_site/eseje/x/index.html" } },
    content
  );
  return { out, logs };
}

test("uszkodzona mapa czasow gasi tylko czasy — tezy i kotwice zostaja", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reading-sync-"));
  const eseje = path.join(root, "src", "eseje");
  const audio = path.join(root, "src", "assets", "audio");
  fs.mkdirSync(eseje, { recursive: true });
  fs.mkdirSync(audio, { recursive: true });

  const inputPath = path.join(eseje, "moj-esej.md");
  fs.writeFileSync(inputPath, [
    "---",
    'title: "Mój esej"',
    "audio: /assets/audio/moj-esej-pl.mp3",
    "theses:",
    '  - "Druga teza eseju stoi w tekście dosłownie."',
    "---",
    "",
    "Treść eseju.",
  ].join("\n"), "utf8");
  // Mapa istnieje, ale jest urwana w polowie zapisu — build nie moze przez to
  // stracic tez ani kotwic `#zN` (decyzja W2: tezy sa niezalezne od mapy).
  fs.writeFileSync(path.join(audio, "moj-esej-pl.sync.json"), '{ "version": 1, "sen', "utf8");

  try {
    const { out, logs } = runTransform({
      inputPath,
      url: "/eseje/moj-esej/",
      fileSlug: "moj-esej",
      content: article(
        "<p>Pierwsze zdanie eseju. Druga teza eseju stoi w tekście dosłownie.</p>"
      ),
    });

    assert.match(out, /<mark class="z teza" id="z1"/);
    assert.match(out, /<span class="z" id="z0"/);
    // Bez mapy nie ma czasow — i nie moze ich byc zmyslonych.
    assert.ok(!out.includes("data-t="));
    assert.ok(logs.some((line) => /WARN \[sync\].*moj-esej-pl\.sync\.json/.test(line)));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

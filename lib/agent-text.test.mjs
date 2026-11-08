import { test } from "node:test";
import assert from "node:assert/strict";
import { toAgentMarkdown, stripFrontmatter } from "./agent-text.mjs";

test("frontmatter znika, treść zostaje", () => {
  const raw = "---\ntitle: \"X\"\ndraft: false\n---\n\nAkapit pierwszy.\n";
  assert.equal(stripFrontmatter(raw).trim(), "Akapit pierwszy.");
});

test("CRLF i BOM nie psują zdjęcia frontmattera", () => {
  const raw = "﻿---\r\ntitle: X\r\n---\r\nTekst.\r\n";
  assert.equal(toAgentMarkdown(raw), "Tekst.\n");
});

test("ilustracja: shortcode img → obraz markdown, podpis → kursywa z linkiem", () => {
  const raw = [
    "---",
    "title: X",
    "---",
    '<figure class="still-ill natural">',
    '{% img "src/assets/stills/a.jpg", "Opis obrazu" %}',
    '<figcaption>Zrzut ze strony <a href="https://mod.gov.ua/x">mod.gov.ua</a>.</figcaption>',
    "</figure>",
    "",
    "Dalej tekst.",
  ].join("\n");
  const md = toAgentMarkdown(raw);
  assert.match(md, /!\[Opis obrazu\]\(\/assets\/stills\/a\.jpg\)/);
  assert.match(md, /\*Zrzut ze strony \[mod\.gov\.ua\]\(https:\/\/mod\.gov\.ua\/x\)\.\*/);
  assert.doesNotMatch(md, /<figure|<\/figure|figcaption|\{%/);
  assert.match(md, /Dalej tekst\./);
});

test("linki markdown i nagłówki przechodzą bez zmian", () => {
  const raw = "---\nt: 1\n---\n## Sekcja\n\nZobacz [źródło](https://a.pl).\n";
  assert.equal(toAgentMarkdown(raw), "## Sekcja\n\nZobacz [źródło](https://a.pl).\n");
});

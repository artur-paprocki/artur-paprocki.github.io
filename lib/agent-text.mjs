// Czysty markdown tekstu dla agentów AI (bliźniak `index.md` każdej strony
// i `llms-full.txt`). Agent czytający stronę nie potrzebuje naszego HTML-a:
// zdań w <span>, odtwarzacza, ilustracji w dwóch motywach. Potrzebuje tekstu,
// źródeł i podpisów. Wejście to surowy plik źródłowy eseju lub notatki.
import fs from "node:fs";

const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

// Linki HTML → markdown, potem zdejmujemy wszystkie pozostałe znaczniki.
function htmlToText(html) {
  return decode(
    html
      .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/?(strong|b)>/gi, "**")
      .replace(/<\/?(em|i)>/gi, "*")
      .replace(/<[^>]+>/g, "")
  ).trim();
}

export function stripFrontmatter(raw) {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const m = text.match(/^---\n[\s\S]*?\n---\n?/);
  return m ? text.slice(m[0].length) : text;
}

export function toAgentMarkdown(raw) {
  let body = stripFrontmatter(raw);

  // {% img "src/assets/x.jpg", "alt" %} → ![alt](/assets/x.jpg)
  body = body.replace(
    /\{%-?\s*img\s+"([^"]+)"\s*,\s*"([^"]*)"[^%]*-?%\}/g,
    (_, src, alt) => `![${alt}](${src.replace(/^src\//, "/")})`
  );
  // Inne shortcody (gest, komentarze Nunjucks) nie niosą treści dla agenta.
  body = body.replace(/\{#[\s\S]*?#\}/g, "").replace(/\{%[\s\S]*?%\}/g, "");

  // Podpis ilustracji zostaje jako akapit kursywą; ramka <figure> znika.
  body = body.replace(
    /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/gi,
    (_, cap) => `\n*${htmlToText(cap)}*\n`
  );
  body = body.replace(/<\/?figure[^>]*>/gi, "");
  // Pozostały HTML w treści (rzadki) → tekst.
  body = body.replace(/<(\w+)[^>]*>[\s\S]*?<\/\1>/g, (m) => htmlToText(m));
  body = body.replace(/<[^>]+>/g, "");

  return body.replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function agentMarkdownFromFile(inputPath) {
  return toAgentMarkdown(fs.readFileSync(inputPath, "utf8"));
}

export function agentTextPlugin(eleventyConfig) {
  eleventyConfig.addFilter("agentMarkdown", (inputPath) =>
    agentMarkdownFromFile(inputPath)
  );
}

// IndexNow: po każdym deployu zgłaszamy wszystkie adresy z sitemapy
// (Bing, Yandex, Seznam, Naver dzielą się zgłoszeniem; Bing zasila część
// asystentów AI). Klucz jest publiczny z definicji — leży w korzeniu domeny.
// Użycie: node lib/indexnow.mjs [https://arturpaprocki.com]
export const KEY = "4b92fff34b11681c5c662cbd013fdb1a";

export function urlsFromSitemap(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

export function payload(siteUrl, urls) {
  const host = new URL(siteUrl).host;
  return {
    host,
    key: KEY,
    keyLocation: `${siteUrl}/${KEY}.txt`,
    // Same adresy tej domeny; dodajemy pliki dla agentów, których nie ma w sitemapie.
    urlList: [...new Set([...urls, `${siteUrl}/llms.txt`, `${siteUrl}/llms-full.txt`])].filter(
      (u) => new URL(u).host === host
    ),
  };
}

async function main() {
  const siteUrl = (process.argv[2] || "https://arturpaprocki.com").replace(/\/$/, "");
  const res = await fetch(`${siteUrl}/sitemap.xml`, { cache: "no-store" });
  if (!res.ok) throw new Error(`sitemap: HTTP ${res.status}`);
  const body = payload(siteUrl, urlsFromSitemap(await res.text()));
  const r = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  console.log(`[indexnow] ${body.urlList.length} adresów → HTTP ${r.status}`);
  // 200/202 = przyjęte. Błąd zgłoszenia nie może wywrócić deployu, tylko go widać w logu.
  if (r.status >= 400) console.log(await r.text());
}

if (process.argv[1]?.endsWith("indexnow.mjs")) {
  main().catch((e) => console.log(`[indexnow] pominięte: ${e.message}`));
}

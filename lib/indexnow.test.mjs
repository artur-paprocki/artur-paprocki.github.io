import { test } from "node:test";
import assert from "node:assert/strict";
import { urlsFromSitemap, payload, KEY } from "./indexnow.mjs";

test("adresy z sitemapy + pliki dla agentów, bez obcych domen", () => {
  const xml = "<urlset><url><loc>https://arturpaprocki.com/</loc></url><url><loc> https://arturpaprocki.com/eseje/x/ </loc></url><url><loc>https://obca.pl/a</loc></url></urlset>";
  const p = payload("https://arturpaprocki.com", urlsFromSitemap(xml));
  assert.equal(p.host, "arturpaprocki.com");
  assert.equal(p.keyLocation, `https://arturpaprocki.com/${KEY}.txt`);
  assert.deepEqual(p.urlList, [
    "https://arturpaprocki.com/",
    "https://arturpaprocki.com/eseje/x/",
    "https://arturpaprocki.com/llms.txt",
    "https://arturpaprocki.com/llms-full.txt",
  ]);
});

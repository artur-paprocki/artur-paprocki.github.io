import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { paperCurve, isPaperIllustration, paperMatched } from "./paper.mjs";

const apply = ({ a, b }, rgb) => rgb.map((v, i) => Math.round(a[i] * v + b[i]));

test("light: measured paper lands on the page paper, black stays black", () => {
  const c = paperCurve([240, 235, 223], "light");
  assert.deepEqual(apply(c, [240, 235, 223]), [253, 252, 249]);
  assert.deepEqual(apply(c, [0, 0, 0]), [0, 0, 0]);
});

test("dark: measured paper lands on the page paper, white stays white", () => {
  const c = paperCurve([45, 44, 62], "dark");
  assert.deepEqual(apply(c, [45, 44, 62]), [22, 24, 29]);
  assert.deepEqual(apply(c, [255, 255, 255]), [255, 255, 255]);
});

test("parallel callers share one conversion and never see a half-written file", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "paper-"));
  const src = path.join(root, "assets", "ill", "light", "ill-test-1400.jpg");
  fs.mkdirSync(path.dirname(src), { recursive: true });
  await sharp({ create: { width: 64, height: 36, channels: 3, background: "#f0ebdf" } }).jpeg().toFile(src);
  const cache = path.join(root, "cache");
  const [a, b] = await Promise.all([paperMatched(src, cache), paperMatched(src, cache)]);
  assert.equal(a, b);
  const meta = await sharp(a).metadata();
  assert.equal(meta.width, 64);
  fs.rmSync(root, { recursive: true, force: true });
});

test("only drawn illustrations are matched, not blended marks or photos", () => {
  assert.ok(isPaperIllustration("src/assets/ill/light/ill-hero-1400.jpg"));
  assert.ok(isPaperIllustration("src/assets/ill/dark/dill-vertigo-2-1400.jpg"));
  assert.ok(!isPaperIllustration("src/assets/ill/light/ill-monogram-220.jpg"));
  assert.ok(!isPaperIllustration("src/assets/ill/dark/dill-stroke-600.jpg"));
  assert.ok(!isPaperIllustration("src/assets/stills/cna-reportaz-1400.jpg"));
  assert.ok(!isPaperIllustration("src/assets/photo/artur-portret.jpg"));
});

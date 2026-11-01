import { test } from "node:test";
import assert from "node:assert/strict";
import { paperCurve, isPaperIllustration } from "./paper.mjs";

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

test("only drawn illustrations are matched, not blended marks or photos", () => {
  assert.ok(isPaperIllustration("src/assets/ill/light/ill-hero-1400.jpg"));
  assert.ok(isPaperIllustration("src/assets/ill/dark/dill-vertigo-2-1400.jpg"));
  assert.ok(!isPaperIllustration("src/assets/ill/light/ill-monogram-220.jpg"));
  assert.ok(!isPaperIllustration("src/assets/ill/dark/dill-stroke-600.jpg"));
  assert.ok(!isPaperIllustration("src/assets/stills/cna-reportaz-1400.jpg"));
  assert.ok(!isPaperIllustration("src/assets/photo/artur-portret.jpg"));
});

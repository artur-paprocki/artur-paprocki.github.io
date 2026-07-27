import { test } from "node:test";
import assert from "node:assert/strict";
import { formatLocalDate, formatPlDate, formatEnDate, formatZhDate } from "./dates.mjs";

const DATE = "2026-07-11";

test("chinski zapisuje date od roku, bez spacji", () => {
  assert.equal(formatZhDate(DATE), "2026年7月11日");
});

test("localdate wybiera format po kodzie jezyka, nie po „to nie polski\"", () => {
  assert.equal(formatLocalDate(DATE, "pl"), formatPlDate(DATE));
  assert.equal(formatLocalDate(DATE, "en"), formatEnDate(DATE));
  // Sedno poprawki: chinska strona pokazywala „July 11, 2026", bo szablon mial
  // `pldate if lang == "pl" else endate`.
  assert.equal(formatLocalDate(DATE, "zh"), "2026年7月11日");
  assert.notEqual(formatLocalDate(DATE, "zh"), formatEnDate(DATE));
});

test("jezyk bez wlasnego formatu wychodzi data ISO, a nie angielska", () => {
  assert.equal(formatLocalDate(DATE, "de"), "2026-07-11");
  assert.equal(formatLocalDate(DATE, undefined), "2026-07-11");
});

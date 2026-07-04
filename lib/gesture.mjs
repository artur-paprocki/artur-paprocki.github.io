import rough from "roughjs/bundled/rough.cjs.js";

// Deterministic 32-bit string hash (FNV-1a), used to derive a rough.js seed
// from (type + page + instance counter). Same inputs always produce the
// same seed, so two builds emit byte-identical SVGs — but every instance
// on a page gets its own seed, so no two strokes look alike.
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const generator = rough.generator();

const TYPE_OPTIONS = {
  underline: { roughness: 1.4, bowing: 1.5 },
  frame: { roughness: 0.9, bowing: 1.1 },
};

export function gesture(type, width, height, page, counter) {
  const options = TYPE_OPTIONS[type];
  if (!options) {
    throw new Error(`Unknown gesture type: ${type}`);
  }

  const seed = hashSeed(`${type}:${page}:${counter}`);
  const drawConfig = {
    seed,
    roughness: options.roughness,
    bowing: options.bowing,
    disableMultiStroke: true,
  };

  const drawable =
    type === "underline"
      ? generator.line(0, height / 2, width, height / 2, drawConfig)
      : generator.rectangle(1, 1, width - 2, height - 2, drawConfig);

  const path = drawable.sets.map((set) => generator.opsToPath(set)).join(" ");

  return `<svg class="gesture-path" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="${path}"/></svg>`;
}

export function gestureShortcode(eleventyConfig) {
  const counters = new Map();

  eleventyConfig.addShortcode("gesture", function (type, width, height) {
    const page = this.page.url || this.page.inputPath;
    const key = `${page}:${type}`;
    const counter = (counters.get(key) ?? 0) + 1;
    counters.set(key, counter);

    return gesture(type, width, height, page, counter);
  });
}

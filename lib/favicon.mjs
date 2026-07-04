import fs from "node:fs";
import sharp from "sharp";

// Favicon generated once from the monogram, straight into the output dir.
// Deterministic source + fixed sizes, so repeated builds are byte-identical.
// Runs as a build-lifecycle hook (not a shortcode) since it isn't tied to
// any single page render. Sharp has no native .ico encoder, so the 32px
// variant ships as PNG under the conventional `/favicon.ico` path — every
// browser sniffs the content rather than trusting the extension.
const SOURCE = "src/assets/ill/light/ill-monogram-220.jpg";
const OUTPUT_DIR = "_site";

export async function generateFavicons() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const icoPath = `${OUTPUT_DIR}/favicon.ico`;
  if (!fs.existsSync(icoPath)) {
    await sharp(SOURCE).resize(32, 32).png().toFile(icoPath);
  }

  const touchPath = `${OUTPUT_DIR}/apple-touch-icon.png`;
  if (!fs.existsSync(touchPath)) {
    await sharp(SOURCE).resize(180, 180).png().toFile(touchPath);
  }
}

export function faviconPlugin(eleventyConfig) {
  eleventyConfig.on("eleventy.after", generateFavicons);
}

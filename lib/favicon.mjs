import fs from "node:fs";
import sharp from "sharp";

// Favicon generated once from the monogram, straight into the output dir.
// Deterministic source + fixed sizes, so repeated builds are byte-identical.
// Runs as a build-lifecycle hook (not a shortcode) since it isn't tied to
// any single page render. Sharp has no native .ico encoder, so the 32px
// variant ships as PNG under the conventional `/favicon.ico` path — every
// browser sniffs the content rather than trusting the extension.
const SOURCE = "src/assets/ill/light/ill-monogram-220.jpg";
const SOURCE_DARK = "src/assets/ill/dark/dill-monogram-220.jpg";
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

  // Theme-aware favicon: browsers ignore `media` on <link rel=icon>, but an
  // SVG icon may carry its own prefers-color-scheme query — so both monogram
  // variants ride inside one SVG and the browser picks per system theme.
  const svgPath = `${OUTPUT_DIR}/favicon.svg`;
  if (!fs.existsSync(svgPath)) {
    const light = (await sharp(SOURCE).resize(64, 64).png().toBuffer()).toString("base64");
    const dark = (await sharp(SOURCE_DARK).resize(64, 64).png().toBuffer()).toString("base64");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
<style>#d{display:none}@media(prefers-color-scheme:dark){#l{display:none}#d{display:inline}}</style>
<image id="l" width="64" height="64" href="data:image/png;base64,${light}"/>
<image id="d" width="64" height="64" href="data:image/png;base64,${dark}"/>
</svg>`;
    fs.writeFileSync(svgPath, svg);
  }
}

export function faviconPlugin(eleventyConfig) {
  eleventyConfig.on("eleventy.after", generateFavicons);
}

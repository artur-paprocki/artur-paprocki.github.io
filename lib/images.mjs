import path from "node:path";
import fs from "node:fs";
import Image from "@11ty/eleventy-img";
import sharp from "sharp";

// Deterministic filenames: no hash/random component, so repeated builds
// produce byte-identical output. Sprites (bird animation frames) bypass
// this pipeline entirely via passthrough copy — see eleventy.config.mjs.
function filenameFormat(id, src, width, format) {
  const { name } = path.parse(src);
  return `${name}-${width}w.${format}`;
}

async function renderImage(src, alt, widths, imageAttributes) {
  if (typeof alt !== "string") {
    throw new Error(`Missing alt text for image: ${src}`);
  }

  const metadata = await Image(src, {
    widths: [...widths, null],
    formats: ["avif", "webp", "jpeg"],
    outputDir: "_site/assets/ill/generated/",
    urlPath: "/assets/ill/generated/",
    filenameFormat,
  });

  return Image.generateHTML(metadata, imageAttributes);
}

export function imageShortcode(eleventyConfig) {
  eleventyConfig.addAsyncShortcode(
    "img",
    async function (src, alt, widths = [480, 800, 1400], eager = false, className = "") {
      const imageAttributes = {
        alt,
        loading: eager ? "eager" : "lazy",
        decoding: "async",
        sizes: "(min-width: 660px) 660px, 100vw",
      };
      if (className) {
        imageAttributes.class = className;
      }

      return renderImage(src, alt, widths, imageAttributes);
    }
  );

  // Hero illustration: two theme variants sit in the DOM at once (CSS
  // toggles which is visible), so both must avoid competing as an eager
  // fetch. `loading="lazy"` defers the hidden (display:none) variant
  // entirely; `fetchpriority="high"` keeps the visible one — which is
  // above the fold — fetched immediately despite being lazy, preserving a
  // single request and full LCP priority. See motion.css / .only-light.
  eleventyConfig.addAsyncShortcode("heroimg", async function (src, alt, className = "") {
    const imageAttributes = {
      alt,
      loading: "lazy",
      fetchpriority: "high",
      decoding: "async",
      sizes: "(min-width: 660px) 660px, 100vw",
    };
    if (className) {
      imageAttributes.class = className;
    }

    return renderImage(src, alt, [480, 800, 1400], imageAttributes);
  });

  // og:image: single 1200x630 JPEG cover-cropped from a hero illustration.
  // Uses sharp directly (not the eleventy-img multi-width pipeline) because
  // OG cards need one fixed aspect ratio, not a responsive srcset.
  // Deterministic filename/output so repeated builds are byte-identical.
  const outputDir = "_site/assets/ill/generated";
  eleventyConfig.addAsyncShortcode("ogimg", async function (src) {
    const { name } = path.parse(src);
    const outputPath = path.join(outputDir, `${name}-og.jpeg`);

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputDir, { recursive: true });
      await sharp(src)
        .resize(1200, 630, { fit: "cover", position: "centre" })
        .jpeg({ quality: 82 })
        .toFile(outputPath);
    }

    return `/assets/ill/generated/${name}-og.jpeg`;
  });
}

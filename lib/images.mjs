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

export function imageShortcode(eleventyConfig) {
  eleventyConfig.addAsyncShortcode(
    "img",
    async function (src, alt, widths = [480, 800, 1400], eager = false, className = "") {
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

      const imageAttributes = {
        alt,
        loading: eager ? "eager" : "lazy",
        decoding: "async",
        sizes: "(min-width: 660px) 660px, 100vw",
      };
      if (className) {
        imageAttributes.class = className;
      }

      return Image.generateHTML(metadata, imageAttributes);
    }
  );

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

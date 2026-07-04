import path from "node:path";
import Image from "@11ty/eleventy-img";

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
    async function (src, alt, widths = [480, 800, 1400], eager = false) {
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
      };

      return Image.generateHTML(metadata, imageAttributes);
    }
  );
}

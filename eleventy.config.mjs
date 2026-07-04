import { imageShortcode } from "./lib/images.mjs";
import { gestureShortcode } from "./lib/gesture.mjs";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");

  imageShortcode(eleventyConfig);
  gestureShortcode(eleventyConfig);

  return {
    dir: {
      input: "src",
      output: "_site",
    },
  };
}

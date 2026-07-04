import { imageShortcode } from "./lib/images.mjs";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/css");

  imageShortcode(eleventyConfig);

  return {
    dir: {
      input: "src",
      output: "_site",
    },
  };
}

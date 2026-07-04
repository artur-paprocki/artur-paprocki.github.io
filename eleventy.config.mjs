import { imageShortcode } from "./lib/images.mjs";
import { gestureShortcode } from "./lib/gesture.mjs";
import { dateFilters } from "./lib/dates.mjs";
import { faviconPlugin } from "./lib/favicon.mjs";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");

  imageShortcode(eleventyConfig);
  gestureShortcode(eleventyConfig);
  dateFilters(eleventyConfig);
  faviconPlugin(eleventyConfig);

  eleventyConfig.addCollection("essays_pl", (collection) =>
    collection.getFilteredByTag("essays_pl").sort((a, b) => b.date - a.date)
  );
  eleventyConfig.addCollection("essays_en", (collection) =>
    collection.getFilteredByTag("essays_en").sort((a, b) => b.date - a.date)
  );

  return {
    dir: {
      input: "src",
      output: "_site",
    },
  };
}

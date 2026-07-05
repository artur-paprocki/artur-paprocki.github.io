import crypto from "node:crypto";

// See eseje.11tydata.js — same draft/preview mechanism for the EN side.
const previewCode = (slug) =>
  crypto.createHash("sha256").update(`ap-podglad:${slug}`).digest("hex").slice(0, 8);

export default {
  layout: "layouts/essay.njk",
  lang: "en",
  pageType: "essay",
  tags: ["essays_en"],
  eleventyComputed: {
    permalink: (data) =>
      data.draft
        ? `/preview/${data.page.fileSlug}-${previewCode(data.page.fileSlug)}/`
        : `/essays/${data.page.fileSlug}/`,
  },
};

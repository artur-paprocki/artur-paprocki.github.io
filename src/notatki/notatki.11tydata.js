import crypto from "node:crypto";

// Ten sam mechanizm podglądu co eseje.11tydata.js — patrz komentarz tam.
const previewCode = (slug) =>
  crypto.createHash("sha256").update(`ap-podglad:${slug}`).digest("hex").slice(0, 8);

export default {
  layout: "layouts/note.njk",
  lang: "pl",
  pageType: "note",
  tags: ["notatki"],
  eleventyComputed: {
    permalink: (data) =>
      data.draft
        ? `/podglad/${data.page.fileSlug}-${previewCode(data.page.fileSlug)}/`
        : `/notatki/${data.page.fileSlug}/`,
  },
};

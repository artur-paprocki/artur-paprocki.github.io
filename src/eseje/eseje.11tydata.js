import crypto from "node:crypto";

// draft: true w frontmatterze eseju = tryb PODGLĄDU:
// - sekretny permalink /podglad/<slug>-<kod>/ (kod deterministyczny — build
//   pozostaje powtarzalny), strona wygląda 1:1 jak finalna,
// - poza kolekcją (brak na stronie głównej, w RSS), poza sitemapą,
//   z wymuszonym noindex i banerem PODGLĄD (patrz essay.njk / head.njk).
// Zdjęcie flagi draft = publikacja pod normalnym adresem.
const previewCode = (slug) =>
  crypto.createHash("sha256").update(`ap-podglad:${slug}`).digest("hex").slice(0, 8);

export default {
  layout: "layouts/essay.njk",
  lang: "pl",
  pageType: "essay",
  tags: ["essays_pl"],
  eleventyComputed: {
    permalink: (data) =>
      data.draft
        ? `/podglad/${data.page.fileSlug}-${previewCode(data.page.fileSlug)}/`
        : `/eseje/${data.page.fileSlug}/`,
  },
};

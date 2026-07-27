import crypto from "node:crypto";

// Sekcja chińska (spec 0052). Ten sam mechanizm podglądu co w eseje.11tydata.js
// — z jedną różnicą: kod podglądu jest OSOBNYM segmentem ścieżki, a nie sufiksem
// sluga (`/zh/yulan/<kod>/<slug>/`, nie `/zh/yulan/<slug>-<kod>/`).
//
// Powód jest twardy, nie estetyczny: katalog, w którym ląduje `index.html`, jest
// kluczem podzbioru fontu CJK (`slugForPage` w lib/fonts-cjk.mjs), a preload
// w base.njk wskazuje plik nazwany `page.fileSlug`. Przy slugu z doklejonym
// kodem te dwie nazwy się rozjeżdżają i preload strony ZH pokazuje na 404.
// Przy tym układzie ostatni segment adresu jest slugiem i w podglądzie, i po
// publikacji, więc podzbiór fontu nie zmienia nazwy przy zdjęciu flagi draft.
// Sekretność adresu zostaje ta sama — kod ma tę samą entropię, tylko stoi
// katalog wyżej.
const previewCode = (slug) =>
  crypto.createHash("sha256").update(`ap-podglad:${slug}`).digest("hex").slice(0, 8);

export default {
  layout: "layouts/essay.njk",
  lang: "zh",
  pageType: "essay",
  tags: ["essays_zh"],
  eleventyComputed: {
    permalink: (data) =>
      data.draft
        ? `/zh/yulan/${previewCode(data.page.fileSlug)}/${data.page.fileSlug}/`
        : `/zh/wenzhang/${data.page.fileSlug}/`,
  },
};

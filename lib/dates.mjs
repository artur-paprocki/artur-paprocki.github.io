// Human-readable essay dates in Polish and English, plus a machine-readable
// ISO date for <time datetime>. No Intl locale data dependency issues:
// month names are a fixed lookup so output is identical across environments.
const PL_MONTHS = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];

const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatPlDate(date) {
  const d = new Date(date);
  return `${d.getDate()} ${PL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatEnDate(date) {
  const d = new Date(date);
  return `${EN_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// Chiński zapisuje datę od największej jednostki i nie oddziela jej spacjami:
// 2026年7月11日. Miesiąc to liczba, więc nie ma czego wyszukiwać w tablicy.
export function formatZhDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatIsoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

// Data w języku strony (LANG-SET, spec 0052). Do 26.07 szablony wybierały
// format warunkiem `pldate if lang == "pl" else endate`, więc strona chińska
// dostawała „July 11, 2026" — wszystko poza polskim było traktowane jak
// angielski. Tu decyduje kod języka, a język bez własnego formatu wychodzi
// datą ISO: neutralną, poprawną i widocznie nieprzetłumaczoną, zamiast cicho
// podszywać się pod angielski.
const BY_LANG = { pl: formatPlDate, en: formatEnDate, zh: formatZhDate };

export function formatLocalDate(date, lang) {
  return (BY_LANG[lang] || formatIsoDate)(date);
}

export function dateFilters(eleventyConfig) {
  eleventyConfig.addFilter("pldate", formatPlDate);
  eleventyConfig.addFilter("endate", formatEnDate);
  eleventyConfig.addFilter("isodate", formatIsoDate);
  eleventyConfig.addFilter("localdate", formatLocalDate);
}

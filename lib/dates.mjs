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

export function formatIsoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function dateFilters(eleventyConfig) {
  eleventyConfig.addFilter("pldate", formatPlDate);
  eleventyConfig.addFilter("endate", formatEnDate);
  eleventyConfig.addFilter("isodate", formatIsoDate);
}

export default {
  url: "https://arturpaprocki.com",
  // Adres, pod którym strona jest publicznie dostępna (redirect _next formularza).
  publicUrl: "https://arturpaprocki.com",
  author: "Artur Paprocki",
  // Single switch: while true, every page gets meta robots noindex,nofollow.
  noindex: true,
  // Nazwa sekcji krótkich form obok esejów (robocza — decyzja D4 może ją zmienić).
  // Trzymana w jednym miejscu: layouty i strona listingu czytają stąd.
  notesLabel: "Notatki",
  links: {
    linkedin: "https://www.linkedin.com/in/arturpaprocki",
    // Empty until the Substack account exists — templates hide the
    // subscribe box and footer link while this is falsy.
    substack: "",
    email: "contact@arturpaprocki.com",
  },
};

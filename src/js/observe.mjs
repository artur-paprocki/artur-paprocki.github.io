// Adds `.awake` to [data-awake] elements once, on first viewport entry.
// Drives the stamp, the bird and draw-in microinteractions.
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("awake");
      observer.unobserve(entry.target);
    }
  });
});

document.querySelectorAll("[data-awake]").forEach((el) => observer.observe(el));

// Shared top nav + section strip for the sections magazine.
// SECTIONS is the single source of truth: nav lists sections; a story page also
// gets its section's story list (the sub-tabs) rendered under the nav.
// Pages declare document.body.dataset.page: "story", a section id ("atlas",
// "method") or a story page id ("roads", "yardstick", ...).
(function () {
  const FIELD_GUIDE_BASE = "https://ihsara.github.io/binh-thanh-field-guide/";   // same value as story.js
  const SECTIONS = [
    { id: "story", label: "Story", href: "index.html", stories: [] },
    { id: "atlas", label: "Field guide", href: `${FIELD_GUIDE_BASE}hubs.html`,
      stories: [
        { href: `${FIELD_GUIDE_BASE}hubs.html`, label: "The 23 hubs", page: "hubs" },
        { href: `${FIELD_GUIDE_BASE}cuisine.html`, label: "Where the food is", page: "cuisine" },
        { href: `${FIELD_GUIDE_BASE}rhythm.html`, label: "The rhythm of a day", page: "rhythm" },
        { href: `${FIELD_GUIDE_BASE}history.html`, label: "The history ribbon", page: "history" },
        { href: `${FIELD_GUIDE_BASE}hem/`, label: "The alleys", page: "hem" },
      ] },
    { id: "method", label: "How we know", href: "method.html",
      stories: [
        { href: "method.html", label: "Method notes", page: "method" },
        { href: "map.html", label: "The map, 2015–2025", page: "map" },
        { href: "roads.html", label: "Roads", page: "roads" },
        { href: "places.html", label: "Places", page: "places" },
        { href: "road-beneath.html", label: "The road beneath the road", page: "road-beneath" },
        { href: "census.html", label: "Census, not newsfeed", page: "census" },
        { href: "satellite.html", label: "From orbit", page: "satellite" },
        { href: "centers.html", label: "Centers", page: "centers" },
        { href: "yardstick.html", label: "The yardstick", page: "yardstick" },
        { href: "four-lives.html", label: "The four lives", page: "four-lives" },
        { href: "chains.html", label: "Chains vs độc lập", page: "chains" },
        { href: "chains-poster.html", label: "Chains poster", page: "chains-poster" },
      ] },
  ];
  const page = document.body.dataset.page;
  const section = SECTIONS.find(
    (s) => s.id === page || s.stories.some((t) => t.page === page));
  const nav = document.getElementById("site-nav");
  if (!nav) return;
  nav.className = "site-nav";
  nav.innerHTML =
    `<a href="index.html" class="brand ${page === "story" ? "active" : ""}">Bình Thạnh</a>` +
    SECTIONS.map((s) =>
      `<a href="${s.href}" class="${section && section.id === s.id ? "active" : ""}">${s.label}</a>`
    ).join("");
  // Section strip (sub-tabs) — only when the page belongs to a section with stories.
  if (section && section.stories.length) {
    const strip = document.createElement("nav");
    strip.className = "section-strip";
    strip.innerHTML =
      `<a class="strip-label" href="${section.href}">${section.label}</a>` +
      section.stories.map((t) =>
        `<a href="${t.href}" class="${t.page === page ? "active" : ""}">${t.label}</a>`
      ).join("");
    nav.after(strip);
  }
})();

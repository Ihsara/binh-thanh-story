// Shared top nav + section strip for the sections magazine.
// SECTIONS is the single source of truth: nav lists sections; a story page also
// gets its section's story list (the sub-tabs) rendered under the nav.
// Pages declare document.body.dataset.page: "cover", a section id ("map",
// "street-life") or a story page id ("roads", "yardstick", ...).
(function () {
  const SECTIONS = [
    { id: "map", label: "The Map", href: "map.html",
      stories: [
        { href: "roads.html", label: "Roads", page: "roads" },
        { href: "places.html", label: "Places", page: "places" },
      ] },
    { id: "street-life", label: "Street Life", href: "street-life.html",
      stories: [
        { href: "yardstick.html", label: "The yardstick", page: "yardstick" },
        { href: "four-lives.html", label: "The four lives", page: "four-lives" },
        { href: "chains.html", label: "Chains vs độc lập", page: "chains" },
      ] },
    { id: "atlas", label: "Field Guide", href: "hubs.html",
      stories: [
        { href: "hubs.html", label: "The field guide", page: "hubs" },
        { href: "cuisine.html", label: "Where the food is", page: "cuisine" },
      ] },
    { id: "alleys", label: "The Alleys", href: "hem/", stories: [] },
    { id: "method", label: "Method", href: "method.html", stories: [] },
  ];
  const page = document.body.dataset.page;
  const section = SECTIONS.find(
    (s) => s.id === page || s.stories.some((t) => t.page === page));
  const nav = document.getElementById("site-nav");
  if (!nav) return;
  nav.className = "site-nav";
  nav.innerHTML =
    `<a href="index.html" class="brand ${page === "cover" ? "active" : ""}">Bình Thạnh</a>` +
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

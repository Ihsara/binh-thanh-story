// Shared top-nav for the hẻm sub-site (6 pages).
const HEM_PAGES = [
  ["index.html", "Home"], ["map.html", "Map"], ["tree.html", "Your address"],
  ["inversion.html", "Boulevard vs hẻm"], ["mapping.html", "How OSM learned"],
  ["method.html", "Method"],
];

function renderHemNav(active) {
  const el = document.getElementById("hem-nav");
  if (!el) return;
  el.innerHTML = HEM_PAGES.map(([href, label]) =>
    `<a href="${href}" class="${href === active ? "is-active" : ""}">${label}</a>`
  ).join(" · ");
}

// Shared top nav. Brand + the three threads + Method. Marks the active page from
// document.body.dataset.page.
(function () {
  const LINKS = [
    { href: "index.html", label: "Bình Thạnh", page: "cover", brand: true },
    { href: "roads.html", label: "Roads", page: "roads" },
    { href: "places.html", label: "Places", page: "places" },
    { href: "streetlife.html", label: "Streetlife", page: "streetlife" },
    { href: "method.html", label: "Method", page: "method" },
  ];
  const active = document.body.dataset.page;
  const nav = document.getElementById("site-nav");
  if (!nav) return;
  nav.className = "site-nav";
  nav.innerHTML = LINKS.map((l) =>
    `<a href="${l.href}" class="${l.brand ? "brand " : ""}${l.page === active ? "active" : ""}">${l.label}</a>`
  ).join("");
})();

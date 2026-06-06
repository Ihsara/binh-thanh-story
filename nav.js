// Shared site header, injected into any page with <div id="site-nav">.
// The active link is chosen from <body data-page="..."> (roads|places|cafe|method|cover).
(function () {
  const PAGES = [
    { key: "cover", href: "index.html", label: "Bình Thạnh" },
    { key: "roads", href: "roads.html", label: "Roads" },
    { key: "places", href: "places.html", label: "Places" },
    { key: "cafe", href: "cafe-fuel.html", label: "Café ↔ Fuel" },
    { key: "method", href: "method.html", label: "Method" },
  ];
  const here = document.body.getAttribute("data-page") || "cover";
  const mount = document.getElementById("site-nav");
  if (!mount) return;
  const nav = document.createElement("nav");
  nav.className = "site-nav";
  PAGES.forEach((p) => {
    const a = document.createElement("a");
    a.href = p.href;
    a.textContent = p.label;
    if (p.key === here) a.className = "active";
    nav.append(a);
  });
  mount.append(nav);
})();

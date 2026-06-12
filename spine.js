// Cover = masthead + featured story + section blocks. Stories live on their own
// pages; this file only lays the front page.
const el = (id) => document.getElementById(id);
function fold(a) { return a.at(-1) && a[0] ? `${(a.at(-1) / a[0]).toFixed(1)}×` : "—"; }
function countUp(node, target, suffix) {
  if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) { node.textContent = target + (suffix||""); return; }
  const m = String(target).match(/[\d.]+/); if (!m) { node.textContent = target; return; }
  const end = parseFloat(m[0]); let t0 = null;
  function tick(t) { if (!t0) t0 = t; const k = Math.min(1, (t - t0) / 600);
    node.textContent = (end * k).toFixed(target.includes(".") ? 1 : 0) + (target.replace(m[0], ""));
    if (k < 1) requestAnimationFrame(tick); else node.textContent = target; }
  requestAnimationFrame(tick);
}
function bignum(value, label) {
  const d = document.createElement("div"); d.className = "bignum";
  const v = document.createElement("div"); v.className = "v"; v.textContent = "0";
  const l = document.createElement("div"); l.className = "l"; l.textContent = label;
  d.append(v, l); countUp(v, value); return d;
}
const FEATURED = {
  href: "chains.html", kicker: "Street Life",
  title: "Chains vs độc lập",
  blurb: "169 chain outlets pile into a handful of corners — see where the brands cluster and the independents hold the rest.",
};
const SECTION_BLOCKS = [
  { label: "The Map", href: "map.html", stories: [
    { href: "roads.html", title: "Roads", blurb: "How the district became legible." },
    { href: "places.html", title: "Places", blurb: "How the neighbourhood filled with life." },
  ]},
  { label: "Street Life", href: "street-life.html", stories: [
    { href: "yardstick.html", title: "The yardstick", blurb: "The open commercial graph vs ten years of OSM." },
    { href: "four-lives.html", title: "The four lives", blurb: "Sustenance, anchors, third places, display." },
    { href: "chains.html", title: "Chains vs độc lập", blurb: "169 chain outlets pile into a handful of corners." },
  ]},
  { label: "The Alleys", href: "hem/", stories: [
    { href: "hem/", title: "The hẻm story", blurb: "The boulevard sells; the hẻm lives." },
  ]},
];
fetch("data.json").then((r) => r.json()).then((data) => {
  el("subtitle").textContent = data.subtitle;
  el("boundary-note").textContent = data.boundary_note || "";
  const g = data.growth;
  el("bignum-hero").append(
    bignum(fold(g.ways), "more road ways"),
    bignum(fold(g.amenities), "more amenities"),
    bignum("2018→19", "the mapping leap"));
  el("featured").innerHTML =
    `<a class="featured-card" href="${FEATURED.href}">
       <span class="kicker">Featured · ${FEATURED.kicker}</span>
       <h2>${FEATURED.title}</h2><p>${FEATURED.blurb}</p>
       <span class="go">Read →</span></a>`;
  el("section-blocks").innerHTML = SECTION_BLOCKS.map((s) =>
    `<div class="cover-section">
       <h2 class="cover-section-label"><a href="${s.href}">${s.label}</a></h2>
       <div class="cards-row">` +
       s.stories.map((c) =>
         `<a class="topic-card" href="${c.href}"><h3>${c.title}</h3><p>${c.blurb}</p>
          <span class="go">Read →</span></a>`).join("") +
       `</div></div>`).join("");
}).catch((e) => document.body.insertAdjacentHTML("afterbegin",
  `<pre style="color:#c00;padding:1rem">Failed to load data.json: ${e}</pre>`));

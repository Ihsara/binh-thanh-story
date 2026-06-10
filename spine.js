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
const CARDS = [
  { href: "roads.html", title: "Roads", blurb: "How the district became legible." },
  { href: "places.html", title: "Places", blurb: "How the neighbourhood filled with life." },
  { href: "streetlife.html", title: "Streetlife", blurb: "The district that lives outside." },
];
fetch("data.json").then((r) => r.json()).then((data) => {
  el("subtitle").textContent = data.subtitle;
  el("boundary-note").textContent = data.boundary_note || "";
  const g = data.growth;
  const bn = el("bignum-hero");
  bn.append(bignum(fold(g.ways), "more road ways"));
  bn.append(bignum(fold(g.amenities), "more amenities"));
  bn.append(bignum("2018→19", "the mapping leap"));
  renderGrowth(el("growth"), g.years, g.ways, { annotate: true });
  const host = el("topic-cards");
  CARDS.forEach((c) => {
    const a = document.createElement("a");
    a.className = "topic-card"; a.href = c.href;
    a.innerHTML = `<h3>${c.title}</h3><p>${c.blurb}</p><span class="go">Read →</span>`;
    host.append(a);
  });
}).catch((e) => document.body.insertAdjacentHTML("afterbegin",
  `<pre style="color:#c00;padding:1rem">Failed to load data.json: ${e}</pre>`));

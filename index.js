const el = (id) => document.getElementById(id);
const SVGNS = "http://www.w3.org/2000/svg";
function bignum(value, label) {
  const d = document.createElement("div");
  d.className = "bignum";
  d.innerHTML = `<div class="v">${value}</div><div class="l">${label}</div>`;
  return d;
}
function fold(arr) { return arr.at(-1) && arr[0] ? `${(arr.at(-1) / arr[0]).toFixed(1)}×` : "—"; }

const CARDS = [
  { href: "roads.html", title: "Roads", blurb: "The alley-mesh densification, year by year." },
  { href: "places.html", title: "Places", blurb: "How the neighbourhood filled with life." },
  { href: "cafe-fuel.html", title: "Café ↔ Fuel", blurb: "The rank race cafés won." },
  { href: "method.html", title: "Method", blurb: "How it's built, and the honest caveats." },
];

function renderGrowth(data) {
  const g = data.growth;
  const W = 520, H = 220, padX = 40, padY = 24;
  const xs = g.years, ys = g.ways;
  const xmin = Math.min(...xs), xmax = Math.max(...xs), ymax = Math.max(...ys);
  const px = (x) => padX + ((x - xmin) / Math.max(1, xmax - xmin)) * (W - 2 * padX);
  const py = (y) => H - padY - (y / ymax) * (H - 2 * padY);
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  let dpath = "";
  xs.forEach((x, i) => { dpath += `${i ? "L" : "M"}${px(x)},${py(ys[i])} `; });
  const path = document.createElementNS(SVGNS, "path");
  path.setAttribute("d", dpath); path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#d6336c"); path.setAttribute("stroke-width", 2.5);
  svg.append(path);
  xs.forEach((x, i) => {
    const c = document.createElementNS(SVGNS, "circle");
    c.setAttribute("cx", px(x)); c.setAttribute("cy", py(ys[i])); c.setAttribute("r", 4);
    c.setAttribute("fill", "#d6336c"); svg.append(c);
  });
  el("growth").append(svg);
}

fetch("data.json").then((r) => r.json()).then((data) => {
  el("title").textContent = data.district || data.title;
  el("subtitle").textContent = data.subtitle;
  el("boundary-note").textContent = data.boundary_note || "";
  const g = data.growth;
  const bn = el("bignum-hero");
  bn.append(bignum(fold(g.ways), "more road ways"));
  bn.append(bignum(fold(g.amenities), "more amenities"));
  bn.append(bignum(fold(g.shops), "more shops"));

  Timeline.mapGrid(el("cover-timeline"), data, "roads");
  renderGrowth(data);

  const host = el("topic-cards");
  CARDS.forEach((c) => {
    const a = document.createElement("a");
    a.className = "topic-card"; a.href = c.href;
    a.innerHTML = `<h3>${c.title}</h3><p>${c.blurb}</p><span class="go">Read →</span>`;
    host.append(a);
  });
}).catch((e) => { document.body.insertAdjacentHTML("afterbegin",
  `<pre style="color:#c00;padding:1rem">Failed to load data.json: ${e}</pre>`); });

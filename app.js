// Bình Thạnh story — fetch data.json and draw the six visuals. Vanilla JS + SVG.
const SVGNS = "http://www.w3.org/2000/svg";
const el = (id) => document.getElementById(id);

function snapByYear(data, year) {
  return data.snapshots.find((s) => s.year === year);
}

function bignum(value, label) {
  const d = document.createElement("div");
  d.className = "bignum";
  d.innerHTML = `<div class="v">${value}</div><div class="l">${label}</div>`;
  return d;
}

function fold(arr) {
  // ratio helper: latest / earliest, rounded to one decimal, as "N×"
  return arr[1] && arr[0] ? `${(arr[1] / arr[0]).toFixed(1)}×` : "—";
}

function renderHero(data) {
  el("title").textContent = data.district || data.title;
  el("subtitle").textContent = data.subtitle;
  el("boundary-note").textContent = data.boundary_note || "";
  // v1 hero shows the first vs last snapshot as fixed image pairs. When annual
  // snapshots are added, drive these from data.growth.years (and the matching
  // element ids) so the hero can't silently stay on 2015/2025.
  el("map-roads-2015").src = "roads-vn2015.png";
  el("map-roads-2025").src = "roads-vn2025.png";
  el("map-pois-2015").src = "pois-vn2015.png";
  el("map-pois-2025").src = "pois-vn2025.png";
}

function renderRoads(data) {
  const g = data.growth;
  el("roads-lede").textContent =
    `From ${g.ways[0].toLocaleString()} road ways (${g.km[0]} km) in ${g.years[0]} ` +
    `to ${g.ways.at(-1).toLocaleString()} (${g.km.at(-1)} km) in ${g.years.at(-1)}.`;
  const bn = el("bignum-roads");
  bn.append(bignum(fold(g.ways), "more road ways"));
  bn.append(bignum(fold(g.km), "more road length"));

  // Grouped bars: top road types by 2025 ways, 2015 vs 2025.
  const a = snapByYear(data, g.years[0]).roads_by_type;
  const b = snapByYear(data, g.years.at(-1)).roads_by_type;
  const map15 = Object.fromEntries(a.map((r) => [r.kind, r.ways]));
  const top = b.slice(0, 6);
  const max = Math.max(...top.map((r) => r.ways));
  const host = el("roads-bars");
  top.forEach((r) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    const w25 = (100 * r.ways) / max, w15 = (100 * (map15[r.kind] || 0)) / max;
    row.innerHTML =
      `<span>${r.kind}</span>` +
      `<span><span class="bar y2015" style="width:${w15}%"></span> ${map15[r.kind] || 0}</span>` +
      `<span><span class="bar" style="width:${w25}%"></span> ${r.ways}</span>`;
    host.append(row);
  });
}

function renderPois(data) {
  const g = data.growth;
  const bn = el("bignum-pois");
  bn.append(bignum(fold(g.amenities), "more amenities"));
  bn.append(bignum(fold(g.shops), "more shops"));
}

function renderSlopegraph(data) {
  const years = data.growth.years;
  const first = snapByYear(data, years[0]).amenities.slice(0, 8);
  const last = snapByYear(data, years.at(-1)).amenities;
  const lastRank = Object.fromEntries(last.map((a, i) => [a.value, i]));
  const W = 520, H = 360, padX = 130, padY = 20;
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const yLeft = (i) => padY + (i * (H - 2 * padY)) / 8;
  const yRight = (rank) => padY + (rank * (H - 2 * padY)) / Math.max(8, last.length);
  first.forEach((a, i) => {
    const r = lastRank[a.value];
    const y1 = yLeft(i), y2 = r == null ? H - padY : yRight(r);
    const line = document.createElementNS(SVGNS, "line");
    line.setAttribute("x1", padX); line.setAttribute("y1", y1);
    line.setAttribute("x2", W - padX); line.setAttribute("y2", y2);
    line.setAttribute("stroke", a.value === "cafe" ? "#d6336c" : "#adb5bd");
    line.setAttribute("stroke-width", a.value === "cafe" ? 2.5 : 1.5);
    svg.append(line);
    const tL = document.createElementNS(SVGNS, "text");
    tL.setAttribute("x", padX - 8); tL.setAttribute("y", y1 + 4);
    tL.setAttribute("text-anchor", "end"); tL.textContent = a.value;
    svg.append(tL);
  });
  const h1 = document.createElementNS(SVGNS, "text");
  h1.setAttribute("x", padX - 8); h1.setAttribute("y", 12); h1.setAttribute("text-anchor", "end");
  h1.textContent = years[0]; svg.append(h1);
  const h2 = document.createElementNS(SVGNS, "text");
  h2.setAttribute("x", W - padX + 8); h2.setAttribute("y", 12); h2.textContent = years.at(-1);
  svg.append(h2);
  el("slopegraph").append(svg);
}

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
    const t = document.createElementNS(SVGNS, "text");
    t.setAttribute("x", px(x)); t.setAttribute("y", py(ys[i]) - 10);
    t.setAttribute("text-anchor", "middle"); t.textContent = x; svg.append(t);
  });
  el("growth").append(svg);
}

fetch("data.json")
  .then((r) => r.json())
  .then((data) => {
    renderHero(data);
    renderRoads(data);
    renderPois(data);
    renderSlopegraph(data);
    renderGrowth(data);
  })
  .catch((e) => { document.body.insertAdjacentHTML("afterbegin",
    `<pre style="color:#c00;padding:1rem">Failed to load data.json: ${e}</pre>`); });

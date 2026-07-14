// wards.js — Act 1: the five 2025 wards as true polygon small multiples.
(function () {
  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

  const PALETTE = {sustenance:"#3e7a5e", anchors:"#44608c",
                   third_places:"#c0532a", display:"#c99a2e", unclassified:"#9c8a72"};
  const LIVES = ["sustenance", "anchors", "third_places", "display"];
  const W = 320, H = 250;

  function fmt(n, digits) {
    if (n == null || Number.isNaN(Number(n))) return "";
    const opts = digits == null
      ? { maximumFractionDigits: 0 }
      : { maximumFractionDigits: digits, minimumFractionDigits: digits };
    return Number(n).toLocaleString("en", opts);
  }

  function labelFor(data, key) {
    return (data.life_labels && data.life_labels[key]) || key.replace(/_/g, " ");
  }

  function oldWardLine(ward) {
    const old = ward.old_wards || [];
    if (!old.length) return "";
    return `<p class="old-wards">From ${old.map(esc).join(", ")}</p>`;
  }

  function lifeStack(data, ward) {
    const total = LIVES.reduce((sum, k) => sum + (ward.counts[k] || 0), 0) || 1;
    return `<div class="ward-stack" aria-label="Four-lives composition">` +
      LIVES.map((k) => {
        const n = ward.counts[k] || 0;
        const pct = 100 * n / total;
        return `<span style="width:${esc(pct.toFixed(3))}%;background:${esc(PALETTE[k])}" ` +
          `title="${esc(labelFor(data, k))}: ${esc(fmt(n))}"></span>`;
      }).join("") +
      `</div><div class="ward-key">` +
      LIVES.map((k) => `<span><i style="background:${esc(PALETTE[k])}"></i>` +
        `${esc(labelFor(data, k))} ${esc(fmt(ward.counts[k] || 0))}</span>`).join("") +
      `</div>`;
  }

  // The polygon carries the GEOGRAPHY and nothing else. It is deliberately a flat
  // fill: slicing the outline into bands sized by the four-lives counts would draw a
  // bar chart inside a map, and a reader seeing green on a ward's west edge would
  // fairly infer that its sustenance places sit in the west. They do not — the cuts
  // would be arbitrary. The composition is the stacked bar below; one mark, one job.
  function polygonSVG(data, ward) {
    const projection = d3.geoMercator().fitSize([W - 18, H - 18], ward.geometry);
    const path = d3.geoPath(projection);
    const d = path(ward.geometry) || "";
    return `<svg class="ward-shape" viewBox="0 0 ${esc(W)} ${esc(H)}" role="img" ` +
      `aria-label="${esc(ward.name)}, drawn to its true boundary">` +
      `<rect class="shape-ground" x="0" y="0" width="${esc(W)}" height="${esc(H)}"></rect>` +
      `<path class="ward-fill" d="${esc(d)}"></path>` +
      `<path class="ward-outline" d="${esc(d)}"></path>` +
      `</svg>`;
  }

  function cardHTML(data, ward) {
    const dispute = ward.population_disputed
      ? `<p class="ward-dispute"><b>Population note:</b> ${esc(ward.population_disputed)}</p>`
      : "";
    const topCats = (ward.top_cats || []).slice(0, 3).map((c) =>
      `<li>${esc(c.cat.replace(/_/g, " "))} <b>${esc(fmt(c.n))}</b></li>`).join("");
    return `<figure class="ward-card">` +
      `<div class="ward-map">${polygonSVG(data, ward)}</div>` +
      `<figcaption>` +
        `<h2>${esc(ward.name)}</h2>` +
        oldWardLine(ward) +
        `<dl class="ward-stats">` +
          `<div><dt>Area</dt><dd>${esc(fmt(ward.area_km2, 2))} km²</dd></div>` +
          `<div><dt>Population</dt><dd>${esc(fmt(ward.population))}</dd></div>` +
          `<div><dt>Density</dt><dd>${esc(fmt(ward.density_per_km2))}/km²</dd></div>` +
          `<div><dt>Four-life services</dt><dd>${esc(fmt(ward.services_per_1000, 1))}/1k</dd></div>` +
        `</dl>` +
        lifeStack(data, ward) +
        (topCats ? `<ul class="top-cats">${topCats}</ul>` : "") +
        dispute +
      `</figcaption>` +
    `</figure>`;
  }

  function boot() {
    fetch("wards.json?v=20260714w")
      .then((r) => r.json())
      .then((data) => {
        const citation = document.getElementById("population-citation");
        if (citation) citation.textContent = "Population citation: " + (data.population_citation || "");
        const grid = document.getElementById("wards-grid");
        if (!grid) return;
        grid.innerHTML = (data.wards || []).map((ward) => cardHTML(data, ward)).join("");
      })
      .catch((e) => {
        const grid = document.getElementById("wards-grid");
        if (grid) grid.innerHTML = `<pre class="load-error">Failed to load wards.json: ${esc(e)}</pre>`;
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

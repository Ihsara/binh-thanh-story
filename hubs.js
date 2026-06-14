// hubs.js — the atlas index: district map of 22 hubs + a sortable card grid.
(function () {
  const PALETTE = {sustenance:"#3e7a5e", anchors:"#44608c",
                   third_places:"#c0532a", display:"#c99a2e"};
  const CHAIN = "#7a3f1d", INDEP = "#44608c";
  const LIVES = ["sustenance","anchors","third_places","display"];

  d3.json("hubs.json").then(render).catch((e) =>
    document.getElementById("cards").innerHTML =
      `<pre style="color:#c00">Failed to load hubs.json: ${e}</pre>`);

  function render(data) {
    drawMap(data);
    let sort = "diversity";
    drawCards(data, sort);
    document.querySelectorAll(".atlas-controls button").forEach((b) =>
      b.addEventListener("click", () => {
        document.querySelectorAll(".atlas-controls button")
          .forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        drawCards(data, b.dataset.sort);
      }));
    const t = data.totals;
    document.getElementById("between").textContent =
      `Between the hubs: ${t.contested} places on contested frontiers and ` +
      `${t.unclaimed} beyond every hub's walk — counted, but in no hub.`;
  }

  function drawMap(data) {
    const W = 760, H = 520, pad = 24;
    const lons = data.hubs.map((h) => h.lon), lats = data.hubs.map((h) => h.lat);
    const x = d3.scaleLinear([Math.min(...lons), Math.max(...lons)], [pad, W-pad]);
    const y = d3.scaleLinear([Math.min(...lats), Math.max(...lats)], [H-pad, pad]);
    const r = d3.scaleSqrt(
      [0, d3.max(data.hubs, (h) => h.split.chain + h.split.indep)], [6, 26]);
    const svg = d3.select("#map").attr("viewBox", `0 0 ${W} ${H}`);
    svg.selectAll("circle").data(data.hubs).join("circle")
      .attr("cx", (h) => x(h.lon)).attr("cy", (h) => y(h.lat))
      .attr("r", (h) => r(h.split.chain + h.split.indep))
      .attr("fill", CHAIN).attr("fill-opacity", 0.55)
      .attr("stroke", "#fff").attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("click", (_e, h) => location.href = `hub.html?h=${h.rank}`)
      .append("title").text((h) => h.title);
  }

  function drawCards(data, sort) {
    const hubs = data.hubs.slice();
    const keys = {
      diversity: (h) => -h.diversity,
      chain: (h) => -(h.split.chain / Math.max(1, h.split.chain + h.split.indep)),
      size: (h) => -(h.split.chain + h.split.indep),
    };
    hubs.sort((a, b) => keys[sort](a) - keys[sort](b) || a.rank - b.rank);
    document.getElementById("cards").innerHTML = hubs.map(card).join("");
  }

  function bar(counts, total, parts, colors) {
    if (!total) return "";
    return `<div class="mini-bar">` + parts.map((p) =>
      `<span style="width:${100*(counts[p]||0)/total}%;background:${colors[p]}"></span>`
    ).join("") + `</div>`;
  }

  function card(h) {
    const n = h.split.chain + h.split.indep;
    const lifeTotal = LIVES.reduce((s, l) => s + (h.lives[l]||0), 0);
    return `<a class="hub-card" href="hub.html?h=${h.rank}">
      <h3>${h.title}</h3>
      <div class="hub-stat">${n} places · diversity ${h.diversity.toFixed(2)}</div>
      ${bar(h.lives, lifeTotal, LIVES, PALETTE)}
      ${bar({chain:h.split.chain, indep:h.split.indep}, n,
            ["chain","indep"], {chain:CHAIN, indep:INDEP})}
      <div class="hub-split">${h.split.chain} chain · ${h.split.indep} independent</div>
    </a>`;
  }
})();

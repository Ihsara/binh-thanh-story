// hubs.js — the atlas index: district map of 22 hubs + a sortable card grid.
(function () {
  const PALETTE = {sustenance:"#3e7a5e", anchors:"#44608c",
                   third_places:"#c0532a", display:"#c99a2e"};
  const CHAIN = "#7a3f1d", INDEP = "#44608c";
  const LIVES = ["sustenance","anchors","third_places","display"];

  // 22 distinct paper-friendly hues, one per hub (IDENTITY). Tested against the
  // live territory render for adjacency separability.
  const HUE = d3.quantize(t => d3.interpolateRainbow(t * 0.92 + 0.02), 22);
  const CONTESTED = "#9c8a5a", FAINT = "#cfc6b6";

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
    const W = 760, H = 560, pad = 16;
    const byId = new Map(data.hubs.map(h => [h.id, h]));
    const hueOf = id => HUE[((byId.get(id)?.rank || 1) - 1) % 22];
    const svg = d3.select("#map").attr("viewBox", `0 0 ${W} ${H}`)
      .on("click", dismissPop);

    d3.json("chains-territory.json").then(terr => {
      const [x0, y0, x1, y1] = terr.bounds;
      const x = d3.scaleLinear([x0, x1], [pad, W - pad]);
      const y = d3.scaleLinear([y0, y1], [H - pad, pad]);
      const line = d3.line().x(p => x(p[0])).y(p => y(p[1]));
      const owner = e => e.cls.startsWith("hub:") ? e.cls : null;

      // faint background: unclaimed + solo-brand seeds
      svg.append("g").selectAll("path")
        .data(terr.edges.filter(e => e.cls === "unclaimed" ||
                                     e.cls.startsWith("brand:")))
        .join("path").attr("d", e => line(e.c)).attr("fill", "none")
        .attr("stroke", FAINT).attr("stroke-width", 0.8).attr("stroke-opacity", 0.5);
      // contested frontiers: dashed
      svg.append("g").selectAll("path")
        .data(terr.edges.filter(e => e.cls === "contested"))
        .join("path").attr("d", e => line(e.c)).attr("fill", "none")
        .attr("stroke", CONTESTED).attr("stroke-width", 1)
        .attr("stroke-dasharray", "2,2").attr("stroke-opacity", 0.6);
      // one <g> per hub kingdom: fat invisible hit stroke + visible colored stroke
      const byHub = d3.group(terr.edges.filter(owner), e => e.cls);
      for (const [cls, edges] of byHub) {
        const hub = byId.get(cls);
        if (!hub) continue;
        const col = hueOf(cls);
        const g = svg.append("g").attr("class", "kingdom").style("cursor", "pointer")
          .on("mouseenter", function () {
            d3.select(this).selectAll(".vis").attr("stroke-width", 2.6).attr("stroke-opacity", 1);
          })
          .on("mouseleave", function () {
            d3.select(this).selectAll(".vis").attr("stroke-width", 1.6).attr("stroke-opacity", 0.85);
          })
          .on("click", (ev) => { ev.stopPropagation(); openPop(hub, edges, col, x, y); });
        g.selectAll("path.hit").data(edges).join("path").attr("class", "hit")
          .attr("d", e => line(e.c)).attr("fill", "none")
          .attr("stroke", "transparent").attr("stroke-width", 9);
        g.selectAll("path.vis").data(edges).join("path").attr("class", "vis")
          .attr("d", e => line(e.c)).attr("fill", "none").attr("stroke", col)
          .attr("stroke-width", 1.6).attr("stroke-opacity", 0.85);
      }
    }).catch((e) => d3.select("#map").append("text").attr("x", 16).attr("y", 28)
      .attr("fill", "#c00").text(`Failed to load chains-territory.json: ${e}`));
  }

  function openPop(hub, edges, col, x, y) {
    let sx = 0, sy = 0, n = 0;
    edges.forEach(e => e.c.forEach(p => { sx += p[0]; sy += p[1]; n++; }));
    const cx = x(sx / n), cy = y(sy / n);
    const nTotal = hub.split.chain + hub.split.indep;
    const pop = document.getElementById("kpop");
    const chainPct = 100 * hub.split.chain / Math.max(1, nTotal);
    pop.innerHTML =
      `<span class="kx">&times;</span>` +
      `<h3 style="color:${col}">${hub.title}</h3>` +
      `<p class="kmeta">${nTotal} places · diversity ${hub.diversity.toFixed(2)}</p>` +
      `<div class="kbar"><span style="width:${100 - chainPct}%;background:#44608c"></span>` +
      `<span style="width:${chainPct}%;background:#7a3f1d"></span></div>` +
      `<p class="krow">${hub.split.indep} independent · ${hub.split.chain} chain</p>` +
      `<p class="krow">${hub.signature}</p>` +
      `<a class="kgo" href="hub.html?h=${hub.rank}">Deeper dive →</a>`;
    pop.querySelector(".kx").onclick = (e) => { e.stopPropagation(); dismissPop(); };
    const fig = document.querySelector(".atlas-map").getBoundingClientRect();
    pop.style.left = Math.min(fig.width - 240, Math.max(6, cx / 760 * fig.width)) + "px";
    pop.style.top = Math.min(fig.height - 170, Math.max(6, cy / 560 * fig.height)) + "px";
    pop.style.display = "block";
  }
  function dismissPop() {
    const pop = document.getElementById("kpop");
    if (pop) pop.style.display = "none";
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

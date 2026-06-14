// hub.js — one hub's profile: local map + lives bar + split bar + categories.
(function () {
  const PALETTE = {sustenance:"#3e7a5e", anchors:"#44608c",
                   third_places:"#c0532a", display:"#c99a2e", unclassified:"#9c8a72"};
  const CHAIN = "#7a3f1d", INDEP = "#44608c", STREET = "#cfc6b6";
  const LIVES = ["sustenance","anchors","third_places","display"];
  const LIFE_LABEL = {sustenance:"Sustenance", anchors:"Anchors",
                      third_places:"Third places", display:"Display",
                      unclassified:"Back office"};

  const want = Math.max(1, parseInt(
    new URLSearchParams(location.search).get("h") || "1", 10) || 1);

  d3.json("hubs.json").then((data) => {
    const byRank = new Map(data.hubs.map((h) => [h.rank, h]));
    const h = byRank.get(want) || data.hubs[0];
    document.title = `${h.title} · Bình Thạnh Atlas`;
    document.getElementById("title").textContent = h.title;
    document.getElementById("sig").textContent =
      `${h.split.chain + h.split.indep} places · diversity ${h.diversity.toFixed(2)}`;
    drawLocal(h);
    drawBars(h);
    drawCats(h);
    pager(h, data.hubs.length);
  }).catch((e) => document.getElementById("hub-main").innerHTML =
    `<pre style="color:#c00">Failed to load hubs.json: ${e}</pre>`);

  function drawLocal(h) {
    const W = 720, H = 460, pad = 16;
    const [x0, y0, x1, y1] = h.bbox;
    const x = d3.scaleLinear([x0, x1], [pad, W-pad]);
    const y = d3.scaleLinear([y0, y1], [H-pad, pad]);
    const svg = d3.select("#lmap").attr("viewBox", `0 0 ${W} ${H}`);
    const line = d3.line().x((p) => x(p[0])).y((p) => y(p[1]));
    svg.append("g").selectAll("path").data(h.edges).join("path")
      .attr("d", line).attr("fill", "none").attr("stroke", STREET)
      .attr("stroke-width", 1.4);
    svg.append("g").selectAll("circle").data(h.places).join("circle")
      .attr("cx", (p) => x(p.lon)).attr("cy", (p) => y(p.lat))
      .attr("r", 4)
      .attr("fill", (p) => p.chain ? CHAIN : (PALETTE[p.life] || INDEP))
      .attr("fill-opacity", 0.8).attr("stroke", "#fff").attr("stroke-width", 0.6)
      .append("title").text((p) => (p.chain ? "chain · " : "independent · ") + p.life);
  }

  function stacked(el, counts, parts, colors, labels) {
    const total = parts.reduce((s, p) => s + (counts[p]||0), 0) || 1;
    document.getElementById(el).innerHTML =
      `<div class="big-bar">` + parts.map((p) =>
        `<span style="width:${100*(counts[p]||0)/total}%;background:${colors[p]}"
           title="${labels[p]}: ${counts[p]||0}"></span>`).join("") + `</div>` +
      `<div class="bar-key">` + parts.filter((p) => counts[p]).map((p) =>
        `<span><i style="background:${colors[p]}"></i>${labels[p]} ${counts[p]||0}</span>`
      ).join("") + `</div>`;
  }

  function drawBars(h) {
    stacked("lives", h.lives, [...LIVES, "unclassified"], PALETTE, LIFE_LABEL);
    stacked("split", {chain:h.split.chain, indep:h.split.indep},
            ["chain","indep"], {chain:CHAIN, indep:INDEP},
            {chain:"Chain", indep:"Independent"});
  }

  function drawCats(h) {
    document.getElementById("cats").innerHTML = (h.top_cats || []).map((c) =>
      `<li>${c.cat} <b>×${c.n}</b></li>`).join("") || "<li>—</li>";
    document.getElementById("examples").innerHTML = (h.examples || []).map((e) =>
      `<li>${e.name}<span class="tag ${e.chain?'chain':'indep'}">${e.chain?'chain':'independent'}</span></li>`
    ).join("") || "<li>—</li>";
  }

  function pager(h, total) {
    const prev = document.getElementById("prev"), next = document.getElementById("next");
    if (h.rank > 1) { prev.href = `hub.html?h=${h.rank-1}`; prev.textContent = "← Hub " + (h.rank-1); }
    if (h.rank < total) { next.href = `hub.html?h=${h.rank+1}`; next.textContent = "Hub " + (h.rank+1) + " →"; }
  }
})();

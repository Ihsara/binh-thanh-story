// hub.js — one hub's profile: local map + lives bar + split bar + categories.
(function () {
  const PALETTE = {sustenance:"#3e7a5e", anchors:"#44608c",
                   third_places:"#c0532a", display:"#c99a2e", unclassified:"#9c8a72"};
  const CHAIN = "#7a3f1d", INDEP = "#44608c", STREET = "#cfc6b6";
  const LIVES = ["sustenance","anchors","third_places","display"];
  const LIFE_LABEL = {sustenance:"Sustenance", anchors:"Anchors",
                      third_places:"Third places", display:"Display",
                      unclassified:"Back office"};
  const FIELD_COLOR = {coffee:"#a9683b",food:"#c0453a",retail:"#3e7a5e",
    beauty:"#b8639a",property:"#7a7f96",fashion:"#c99a2e",education:"#4a8fb0",
    health:"#3fae6a",electronics:"#8a6fc0",finance:"#3a6ea5",hotel:"#b08a4a",
    other:"#b3a892"};
  const FIELD_LABEL = {coffee:"Coffee/tea",food:"Food",retail:"Retail",
    beauty:"Beauty/care",property:"Property",fashion:"Fashion",
    education:"Education",health:"Health",electronics:"Electronics",
    finance:"Finance",hotel:"Hotel",other:"Other/office"};
  let activeFields = null;  // null = all; else a Set of fields to keep
  let showGen = false;      // generator-ring underlay toggle on the local map

  const want = Math.max(1, parseInt(
    new URLSearchParams(location.search).get("h") || "1", 10) || 1);

  d3.json("hubs.json").then((data) => {
    const byRank = new Map(data.hubs.map((h) => [h.rank, h]));
    const h = byRank.get(want) || data.hubs[0];
    document.title = `${h.title} · Bình Thạnh Atlas`;
    document.getElementById("title").textContent = h.title;
    document.getElementById("sig").textContent =
      `${h.split.chain + h.split.indep} places · diversity ${h.diversity.toFixed(2)} · ${h.signature}`;
    drawLocal(h);
    drawBars(h);
    drawCats(h);
    drawWhy(h);
    drawGenerators(h);
    drawNeighbours(h, byRank, data.relations);
    pager(h, data.hubs.length);
  }).catch((e) => document.getElementById("hub-main").innerHTML =
    `<pre style="color:#c00">Failed to load hubs.json: ${e}</pre>`);

  function drawLocal(h) {
    const W = 720, H = 460, pad = 16;
    const [x0, y0, x1, y1] = h.bbox;
    const x = d3.scaleLinear([x0, x1], [pad, W - pad]);
    const y = d3.scaleLinear([y0, y1], [H - pad, pad]);

    // streets stay SVG (crisp vectors)
    const svg = d3.select("#lmap").attr("viewBox", `0 0 ${W} ${H}`);
    svg.selectAll("*").remove();
    const line = d3.line().x(p => x(p[0])).y(p => y(p[1]));
    svg.append("g").selectAll("path").data(h.edges).join("path")
      .attr("d", line).attr("fill", "none").attr("stroke", STREET)
      .attr("stroke-width", 1.4);

    // dots on canvas (scales to ~1000+ places)
    const cv = document.getElementById("ldots");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.position = "absolute"; cv.style.left = 0; cv.style.top = 0;
    cv.style.width = "100%"; cv.style.height = "auto";
    const ctx = cv.getContext("2d");

    function jit(seed) { const s = Math.sin(seed * 12.9898) * 43758.5453;
      return (s - Math.floor(s)) - 0.5; }

    function paint() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (showGen && h.gen_points) {
        const GEN_RING = {school:"#4a8fb0", health:"#3fae6a", office:"#7a7f96",
                          hotel:"#b08a4a", market:"#3e7a5e"};
        h.gen_points.forEach((p) => {
          const X = x(p.lon), Y = y(p.lat);
          ctx.beginPath(); ctx.arc(X, Y, 9, 0, 2 * Math.PI);
          ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
          ctx.strokeStyle = GEN_RING[p.type] || "#999"; ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }
      h.places.forEach((p, i) => {
        if (activeFields && !activeFields.has(p.field)) return;
        const jx = jit(p.lon * 1000 + i) * 5, jy = jit(p.lat * 1000 + i * 7) * 5;
        const X = x(p.lon) + jx, Y = y(p.lat) + jy;
        ctx.beginPath(); ctx.arc(X, Y, p.chain ? 4.5 : 2.6, 0, 2 * Math.PI);
        ctx.globalAlpha = p.chain ? 1 : 0.62;
        ctx.fillStyle = FIELD_COLOR[p.field] || FIELD_COLOR.other; ctx.fill();
        if (p.chain) { ctx.globalAlpha = 1; ctx.lineWidth = 1.6;
          ctx.strokeStyle = "#fffdf8"; ctx.stroke(); }
      });
      ctx.globalAlpha = 1;
    }
    paint();
    drawChips(h, paint);
    const gt = document.getElementById("genToggle");
    if (gt) gt.onclick = () => {
      showGen = !showGen;
      gt.classList.toggle("on", showGen);
      gt.textContent = showGen ? "Hide what draws people" : "Show what draws people";
      paint();
    };
  }

  function drawChips(h, repaint) {
    const present = [...new Set(h.places.map(p => p.field))]
      .sort((a, b) => a === "other" ? 1 : b === "other" ? -1 : 0);
    const box = document.getElementById("fieldchips");
    box.innerHTML = present.map(f =>
      `<button class="fchip" data-f="${f}">` +
      `<i style="background:${FIELD_COLOR[f]}"></i>${FIELD_LABEL[f]}</button>`).join("");
    box.querySelectorAll(".fchip").forEach(btn => btn.onclick = () => {
      const f = btn.dataset.f;
      if (!activeFields) activeFields = new Set(present);
      btn.classList.toggle("off");
      activeFields = new Set([...box.querySelectorAll(".fchip")]
        .filter(b => !b.classList.contains("off")).map(b => b.dataset.f));
      if (activeFields.size === present.length) activeFields = null;
      repaint();
    });
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

  const GEN_LABEL = {school:"Schools", health:"Health", office:"Offices",
                     hotel:"Hotels", market:"Markets"};
  const GEN_GLYPH = {school:"🎓", health:"🏥", office:"🏢", hotel:"🏨", market:"🛒"};
  const BUILTUP_WORD = (s) => s >= 0.66 ? "high" : s >= 0.33 ? "medium" : "low";

  function drawWhy(h) {
    const f = h.form || {kind:"cluster", streets:[]};
    let where;
    if (f.kind === "crossroads" && f.streets.length >= 2)
      where = `Where ${f.streets[0]} meets ${f.streets[1]}`;
    else if (f.kind === "spine" && f.streets.length)
      where = `Along the ${f.streets[0]} spine`;
    else where = "A dense local cluster";
    const g = h.generators || {};
    const parts = ["school","health","office","hotel"]
      .filter(k => g[k]).map(k => `${g[k]} ${GEN_LABEL[k].toLowerCase()}`);
    const draw = parts.length ? ` with ${parts.join(", ")} within a five-minute walk` : "";
    document.getElementById("why").textContent =
      `${where}${draw} — the crowd that the ${h.split.chain} chains and ${h.split.indep} independents feed.`;
    // built-up mini-bar
    const s = (h.builtup && h.builtup.score) || 0;
    const pct = Math.round(s * 100);
    const cov = h.builtup ? h.builtup.count.toLocaleString() : "0";
    document.getElementById("builtup").innerHTML =
      `<span class="bu-label">Built-up</span>` +
      `<span class="bu-track"><span class="bu-fill" style="width:${pct}%"></span></span>` +
      `<span class="bu-word">${BUILTUP_WORD(s)}</span>` +
      `<span class="bu-note">${cov} buildings (footprint proxy, not population)</span>`;
  }

  function drawGenerators(h) {
    const g = h.generators || {};
    const order = ["school","health","office","hotel","market"];
    const html = order.filter(k => g[k]).map(k =>
      `<span class="gen"><b>${GEN_GLYPH[k]}</b> ${GEN_LABEL[k]} <b>${g[k]}</b></span>`
    ).join("");
    document.getElementById("generators").innerHTML =
      (html || "<span class='gen muted'>No standout draws nearby</span>") +
      `<p class="gen-cap">within ~5-min walk</p>`;
  }

  function drawNeighbours(h, byRank, relations) {
    const mine = (relations || []).filter(r => r.a === h.id || r.b === h.id);
    const other = (r) => r.a === h.id ? r.b : r.a;
    const idToHub = new Map([...byRank.values()].map(x => [x.id, x]));
    const ICON = {compete:"⚔", complement:"🤝", border:"·"};
    const VERB = {compete:"Competes with", complement:"Complements", border:"Borders"};
    const rank = {compete:0, complement:1, border:2};
    mine.sort((p, q) => rank[p.type] - rank[q.type] || q.shared_nodes - p.shared_nodes);
    document.getElementById("neighbours").innerHTML = mine.map(r => {
      const o = idToHub.get(other(r)); if (!o) return "";
      const detail = r.type === "compete"
        ? `${r.shared_nodes} shared-reach nodes`
        : r.type === "complement" ? "different life-mix" : "adjacent";
      return `<li><span class="rel ${r.type}">${ICON[r.type]}</span> ` +
             `${VERB[r.type]} <a href="hub.html?h=${o.rank}">${o.title}</a> ` +
             `<span class="rel-note">— ${detail}</span></li>`;
    }).join("") || "<li class='muted'>Stands alone — no reachable neighbour.</li>";
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

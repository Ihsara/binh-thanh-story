// chains-poster.js — a print/screenshot-friendly POSTER of the "Chains vs độc lập"
// map. Reuses the SHIPPED baked JSON (chains.json / -hubs / -territory / -outlets,
// 30 m contested margin — unchanged) and the SAME projection + glow-as-gradient-core
// recipe as chains.js. No stepper, no scroll. A small style switcher lets you flip
// between several poster treatments à la Visual Cinnamon; Style 1 is *exactly* the
// hero screenshot (hub glow over the full street basemap + the brand legend).
//
// Glow = stacked translucent circles (gradient core), NEVER an SVG blur (rule #7).
//
// The legend renders the full roster (every brand, biggest first) as a static key —
// it is a poster, so chips don't toggle; they read like a printed key.

(function () {
  "use strict";

  // ---- palette (carried verbatim from chains.js so Style 1 matches the screenshot) ----
  const PAL = {
    STREET: "#cfc6b6",
    STREET_FAINT: "#e0d8c8",
    HUB_CORE: "#7a3f1d",
    DOT: "#9c8a72",
    UNCLAIMED_INK: "#3a2c20",
    TERR: { brand: "#b06a36", hub: "#7a3f1d", contested: "#c9a24a", unclaimed: "#cdbfa8" },
    CAT_HUE: {
      convenience: "#b06a36", cafe_tea: "#c0532a", bank: "#44608c",
      fast_food: "#c99a2e", supermarket: "#3e7a5e", other_chain: "#7a6a55",
    },
  };
  // Dark-canvas variant (only Style 4 uses it): the glow literally luminesces on a
  // deep navy ground — never pure black (dataviz-design Decision 1).
  const DARK = {
    ground: "#101626",
    street: "#27324a",
    glow: "#ffb061",      // warm ember that pops on navy
    glowMid: "#e8893a",
    ink: "#f4ead8",
  };

  const VIEW = 600;
  let x, y;                      // projection closures (set by fit)
  let data = null;               // loaded baked JSON
  let rosterCat = new Map();     // chain id -> category
  let hubsByChain = new Map();   // chain id -> Set("hub:<k>")
  const line = d3.line().x(d => x(d[0])).y(d => y(d[1]));

  function fit(bounds) {
    const [minx, miny, maxx, maxy] = bounds;
    const sx = VIEW / (maxx - minx), sy = VIEW / (maxy - miny), s = Math.min(sx, sy);
    const ox = (VIEW - s * (maxx - minx)) / 2, oy = (VIEW - s * (maxy - miny)) / 2;
    x = lon => ox + (lon - minx) * s;
    y = lat => VIEW - (oy + (lat - miny) * s);
  }

  function coreR(d) { return 1.6 + d.chains.length * 0.55; }

  function territoryColour(cls) {
    if (cls === "contested") return PAL.TERR.contested;
    if (cls === "unclaimed") return PAL.TERR.unclaimed;
    if (cls.startsWith("hub:")) return PAL.TERR.hub;
    if (cls.startsWith("brand:")) {
      const cid = cls.slice("brand:".length);
      const cat = rosterCat.get(cid);
      return (cat && PAL.CAT_HUE[cat]) || PAL.TERR.brand;
    }
    return PAL.TERR.brand;
  }

  // -------------------------------------------------------------------------
  // STYLES. Each is a pure "draw the whole SVG once" function. They share the
  // edge + knot primitives but differ in ground, edge styling, and knot glow.
  // Style 1 reproduces the screenshot exactly.
  // -------------------------------------------------------------------------
  const STYLES = [
    {
      id: "glow",
      name: "1 · Density glow",
      blurb: "The hero. Hubs glow over the full street mesh — the exact piling-up the screenshot shows.",
      dark: false,
      draw: drawGlow,
    },
    {
      id: "territory",
      name: "2 · Walked territory",
      blurb: "Every street coloured by whoever reaches it first: brand turf, shared hub, contested frontier, or the rare unclaimed thread.",
      dark: false,
      draw: drawTerritory,
    },
    {
      id: "contested",
      name: "3 · Contested frontiers",
      blurb: "Fade everything but the borders where two reaches collide — the seams between kingdoms, picked out in gold.",
      dark: false,
      draw: drawContested,
    },
    {
      id: "night",
      name: "4 · Night map",
      blurb: "The same glow on a deep-navy ground, where the density literally luminesces.",
      dark: true,
      draw: drawNight,
    },
    {
      id: "ink",
      name: "5 · Ink & ember",
      blurb: "A spare print treatment: hairline streets in ink, only the hubs carry colour.",
      dark: false,
      draw: drawInk,
    },
  ];

  // ---- shared primitive: street edges ----
  function addEdges(svg, styleFn) {
    const g = svg.append("g").attr("class", "edges");
    g.selectAll("path").data(data.terr.edges).enter().append("path")
      .attr("d", d => line(d.c))
      .attr("fill", "none")
      .style("vector-effect", "non-scaling-stroke")
      .each(function (d) { styleFn(d3.select(this), d); });
    return g;
  }

  // ---- shared primitive: hub knots (gradient-core glow) ----
  function addKnots(svg, opts) {
    const { core, mid, halo, coreOpacity = 0.95, ranked = false } = opts;
    const g = svg.append("g").attr("class", "knots");
    const knot = g.selectAll("g").data(data.hubs).enter().append("g")
      .attr("transform", d => `translate(${x(d.lon)},${y(d.lat)})`);
    knot.append("circle")
      .attr("r", d => coreR(d) + 8).attr("fill", halo).attr("opacity", 0.14);
    knot.append("circle")
      .attr("r", d => coreR(d) + 3.5).attr("fill", mid).attr("opacity", 0.30);
    knot.append("circle")
      .attr("r", coreR).attr("fill", core).attr("opacity", coreOpacity);
    if (ranked) {
      const top = data.hubs.filter(h => h.rank <= 5);
      const lab = svg.append("g").attr("class", "knot-labels");
      const t = lab.selectAll("text").data(top).enter().append("text")
        .attr("x", d => x(d.lon) + coreR(d) + 6)
        .attr("y", d => y(d.lat) + 3)
        .attr("class", "poster-knot-label")
        .text(d => `${d.chains.length} brands`);
      t.clone(true).lower().attr("class", "poster-knot-label-bg");
    }
    return g;
  }

  // ===== Style 1: density glow (the screenshot) =====
  function drawGlow(svg) {
    addEdges(svg, (sel) =>
      sel.attr("stroke", d => d.cls === "unclaimed" ? PAL.STREET : PAL.STREET_FAINT)
         .attr("stroke-width", 0.7)
         .attr("opacity", 0.5));
    addKnots(svg, { core: PAL.HUB_CORE, mid: PAL.HUB_CORE, halo: PAL.HUB_CORE, ranked: true });
  }

  // ===== Style 2: walked territory (hard partition) =====
  function drawTerritory(svg) {
    addEdges(svg, (sel) =>
      sel.attr("stroke", d => territoryColour(d.cls))
         .attr("stroke-width", d => d.cls === "unclaimed" ? 0.7 : 0.85)
         .attr("opacity", d => d.cls === "unclaimed" ? 0.4 : 0.85));
    addKnots(svg, {
      core: PAL.HUB_CORE, mid: PAL.HUB_CORE, halo: PAL.HUB_CORE,
      coreOpacity: 0.9,
    });
  }

  // ===== Style 3: contested frontiers =====
  function drawContested(svg) {
    addEdges(svg, (sel) =>
      sel.attr("stroke", d => d.cls === "contested" ? PAL.TERR.contested : PAL.STREET)
         .attr("stroke-width", d => d.cls === "contested" ? 1.4 : 0.6)
         .attr("opacity", d => d.cls === "contested" ? 0.98 : 0.18));
    addKnots(svg, {
      core: PAL.HUB_CORE, mid: PAL.HUB_CORE, halo: PAL.HUB_CORE, coreOpacity: 0.85,
    });
  }

  // ===== Style 4: night map (dark luminous ground) =====
  function drawNight(svg) {
    svg.append("rect")
      .attr("x", 0).attr("y", 0).attr("width", VIEW).attr("height", VIEW)
      .attr("fill", DARK.ground);
    addEdges(svg, (sel) =>
      sel.attr("stroke", DARK.street).attr("stroke-width", 0.6).attr("opacity", 0.7));
    addKnots(svg, { core: DARK.glow, mid: DARK.glowMid, halo: DARK.glow, ranked: true });
  }

  // ===== Style 5: ink & ember =====
  function drawInk(svg) {
    addEdges(svg, (sel) =>
      sel.attr("stroke", "#2a221b").attr("stroke-width", 0.45).attr("opacity", 0.55));
    addKnots(svg, {
      core: "#b8431a", mid: "#b8431a", halo: "#b8431a", coreOpacity: 0.92, ranked: true,
    });
  }

  // -------------------------------------------------------------------------
  // Render orchestration
  // -------------------------------------------------------------------------
  let currentStyle = STYLES[0];

  function renderStyle(style) {
    currentStyle = style;
    const fig = document.getElementById("poster-map");
    fig.innerHTML = "";
    const svg = d3.select(fig).append("svg")
      .attr("viewBox", `0 0 ${VIEW} ${VIEW}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    fit(data.terr.bounds);
    style.draw(svg);

    document.body.classList.toggle("poster-dark", !!style.dark);
    document.getElementById("poster-blurb").textContent = style.blurb;
    // sync switcher buttons
    document.querySelectorAll(".style-btn").forEach(b =>
      b.classList.toggle("on", b.dataset.style === style.id));
  }

  function buildSwitcher() {
    const host = document.getElementById("poster-switcher");
    host.innerHTML = "";
    for (const s of STYLES) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "style-btn";
      b.dataset.style = s.id;
      b.textContent = s.name;
      b.addEventListener("click", () => renderStyle(s));
      host.append(b);
    }
  }

  // Full legend (every brand, biggest first) — a static printed key, not toggles.
  function buildLegend() {
    const host = document.getElementById("poster-legend");
    host.innerHTML = "";
    const roster = data.chains.roster.slice().sort((a, b) => b.n - a.n);
    for (const r of roster) {
      const chip = document.createElement("span");
      chip.className = "p-chip";
      const hue = PAL.CAT_HUE[r.category] || PAL.TERR.brand;
      chip.innerHTML =
        `<span class="sw" style="background:${hue}"></span>` +
        `${r.label} <span class="n">${r.n}</span>`;
      host.append(chip);
    }
  }

  // Fill the headline stat-line + caption from the baked totals (never hard-coded).
  function fillCopy() {
    const t = data.chains.totals;
    const brands = data.chains.roster.length;
    const maxBrands = Math.max(...data.hubs.map(h => h.chains.length));
    const top = data.hubs.slice().sort((a, b) => a.rank - b.rank)[0];
    const edges = data.terr.edges;
    const nUnclaimed = edges.filter(e => e.cls === "unclaimed").length;
    const nContested = edges.filter(e => e.cls === "contested").length;

    document.getElementById("poster-dek").innerHTML =
      `${t.outlets} chain outlets across ${brands} brands. They don't spread out — ` +
      `they pile into a handful of corners.`;

    const stats = [
      [t.outlets, "outlets"],
      [brands, "brands"],
      [t.hubs, "hubs"],
      [maxBrands, "brands in the top corner"],
      [`${(100 * nContested / edges.length).toFixed(1)}%`, "streets contested"],
      [`${(100 * nUnclaimed / edges.length).toFixed(1)}%`, "beyond every chain"],
    ];
    const sl = document.getElementById("poster-stats");
    sl.innerHTML = stats.map(([v, l]) =>
      `<div class="p-stat"><span class="v">${v}</span><span class="l">${l}</span></div>`).join("");
  }

  // 4K toggle: pin the poster wrapper to a 3840-wide canvas so a screenshot is
  // print-resolution. Toggling adds a class the CSS sizes; the SVG is vector so it
  // stays crisp at any size.
  function wire4K() {
    const btn = document.getElementById("poster-4k");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const on = document.body.classList.toggle("poster-4k");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? "Exit 4K" : "4K poster";
      if (on) window.scrollTo(0, 0);
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const fig = document.getElementById("poster-map");
    try {
      const [chains, hubs, terr] = await Promise.all([
        fetch("chains.json").then(r => r.json()),
        fetch("chains-hubs.json").then(r => r.json()),
        fetch("chains-territory.json").then(r => r.json()),
      ]);
      data = { chains, hubs: hubs.hubs, terr };
      rosterCat = new Map(chains.roster.map(r => [r.id, r.category]));
      hubsByChain = new Map();
      for (const h of data.hubs)
        for (const cid of h.chains)
          (hubsByChain.get(cid) || hubsByChain.set(cid, new Set()).get(cid)).add(h.id);

      fit(terr.bounds);
      buildSwitcher();
      buildLegend();
      fillCopy();
      wire4K();
      renderStyle(STYLES[0]);
    } catch (e) {
      fig.textContent = "Poster data failed to load.";
      console.error("chains-poster:", e);
    }
  });
})();

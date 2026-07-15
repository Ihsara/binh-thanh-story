// chains.js — "Chains vs độc lập" story 3.
// A PERSISTENT SVG map (one viewBox, restyled per step) + a Stepper that only
// flips the map's mode. The map element (#chains-map) lives OUTSIDE the stepper
// slot, so the stepper re-rendering its own body never tears down the SVG.
//
// Six modes (steps 1-6):
//   "overview"     — bare grey streets + every chain OUTLET as a small uniform dot
//                    (real 169 outlets from chains-outlets.json; hub-centroid proxy
//                    only as a fallback if that file is missing).
//   "exemplar"     — the honest-catchment beat: the naive 1km circle ghost around the
//                    baked Highlands outlet, vs. the dense hẻm network it really walks.
//   "hubs"         — THE HERO: streets fade to faint; the 23 hubs glow as gradient-core
//                    knots, radius scaled by #chains, the two 12-chain mega-knots dominating.
//   "hubs-ranked"  — like "hubs" but the top-5-by-rank knots gain "<n> brands" labels
//                    and a gentle pulse: this names the biggest knots.
//   "saturation"   — colour the territory edges, but FADE everything except `unclaimed`
//                    which POPS in full ink. The honest payoff: only 3.4% of streets
//                    (and 0.48% of independents) escape every chain's 1km reach.
//   "territory"    — the explorer: full territory colouring + interactive legend chips.
//                    setMode("territory", chainId) isolates one chain's reach (its
//                    brand edges + any hub containing it), fading the rest.
//
// Glow = gradient-core (stacked circles), NEVER an SVG blur filter (project rule #7).

(function () {
  const VIEW = 600;  // square SVG viewBox, matching the hem map engine

  const ChainsMap = (function () {
    // Closure-scoped projection (copied body of hem/map.js fit()): a square
    // equirectangular x/y into the 600x600 viewBox with Math.min letterboxing.
    let x, y;
    function fit(bounds) {
      const [minx, miny, maxx, maxy] = bounds;
      const sx = VIEW / (maxx - minx), sy = VIEW / (maxy - miny), s = Math.min(sx, sy);
      const ox = (VIEW - s * (maxx - minx)) / 2, oy = (VIEW - s * (maxy - miny)) / 2;
      x = lon => ox + (lon - minx) * s;
      y = lat => VIEW - (oy + (lat - miny) * s);
    }

    // ---- palette (restrained; warm density tells the hub story) ----
    const STREET = "#cfc6b6";          // paper-grey street basemap
    const STREET_FAINT = "#e0d8c8";    // streets recede under the glowing knots
    const HUB_CORE = "#7a3f1d";        // deep amber-brown = chain density, full strength
    const DOT = "#9c8a72";             // uniform "a chain is here" dot for overview
    const EXEMPLAR = "#c0532a";        // accent — the one outlet we're walking from
    const GHOST = "#a79c8a";           // dashed naive-circle ghost
    const UNCLAIMED_INK = "#3a2c20";   // saturation: the rare streets beyond every chain

    // territory class colours (explorer). brand/hub share a family; contested mid;
    // unclaimed dark. Per-chain hues for the isolate are derived from CAT_HUE.
    const TERR = {
      brand: "#b06a36",      // a chain's own walked turf
      hub: "#7a3f1d",        // shared-ground hub turf
      contested: "#c9a24a",  // frontier between reaches
      unclaimed: "#cdbfa8",  // beyond every chain (muted in full-territory view)
    };
    // category hues for the explorer chips + isolate accent.
    const CAT_HUE = {
      convenience: "#b06a36",
      cafe_tea: "#c0532a",
      bank: "#44608c",
      fast_food: "#c99a2e",
      supermarket: "#3e7a5e",
      other_chain: "#7a6a55",
    };

    let svg, gEdges, gHubs, gExemplar, gOutlets, gLabels, data;
    let mode = "overview";
    let hubsByChain = new Map();   // chainId -> Set(hub edge-label "hub:<k>")
    let onKnotTip = null;          // tooltip callback (wired by the page)

    const line = d3.line().x(d => x(d[0])).y(d => y(d[1]));

    async function mount(figure) {
      const fetched = await Promise.all([
        fetch("chains.json").then(r => r.json()),
        fetch("chains-hubs.json").then(r => r.json()),
        fetch("chains-territory.json").then(r => r.json()),
        // outlets are a clean-but-optional overview enhancement; tolerate absence.
        fetch("chains-outlets.json").then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      const [chains, hubs, terr, outlets] = fetched;
      data = {
        chains, hubs: hubs.hubs, terr,
        outlets: (outlets && outlets.outlets) || null,
      };
      fit(terr.bounds);

      // hub -> member chains lookup, keyed by the territory edge label "hub:<k>".
      // The hubs file's `id` IS that label (see chains_build join contract).
      hubsByChain = new Map();
      for (const h of data.hubs) {
        for (const cid of h.chains) {
          if (!hubsByChain.has(cid)) hubsByChain.set(cid, new Set());
          hubsByChain.get(cid).add(h.id);
        }
      }

      svg = d3.select(figure).append("svg")
        .attr("viewBox", `0 0 ${VIEW} ${VIEW}`);

      // (a) street basemap — one <path> per territory edge.
      gEdges = svg.append("g").attr("class", "edges");
      gEdges.selectAll("path").data(terr.edges).enter().append("path")
        .attr("d", d => line(d.c))
        .attr("fill", "none")
        .attr("stroke-width", 0.7)
        .style("vector-effect", "non-scaling-stroke");

      // exemplar layer (drawn under the hubs so the knots sit on top)
      gExemplar = svg.append("g").attr("class", "exemplar");

      // (a2) per-outlet dots layer for the overview (the real 169-strong cast).
      gOutlets = svg.append("g").attr("class", "outlets");
      if (data.outlets) {
        gOutlets.selectAll("circle").data(data.outlets).enter().append("circle")
          .attr("cx", d => x(d.lon)).attr("cy", d => y(d.lat))
          .attr("r", 1.9).attr("fill", DOT).attr("opacity", 0)
          .style("vector-effect", "non-scaling-stroke");
      }

      // (b) hub knots — one group per hub, translated to its projected centroid.
      // Glow = gradient-core (stacked circles), NEVER an SVG blur filter.
      gHubs = svg.append("g").attr("class", "hubs");
      const knot = gHubs.selectAll("g").data(data.hubs).enter().append("g")
        .attr("class", "knot")
        .attr("transform", d => `translate(${x(d.lon)},${y(d.lat)})`)
        .style("cursor", "pointer");          // KEEP pointer events (tooltips)
      knot.append("circle").attr("class", "g-halo");
      knot.append("circle").attr("class", "g-ring");
      knot.append("circle").attr("class", "g-core");
      knot.append("title").text(d =>
        `${d.chains.length} brands · ${d.outlets} outlets`);
      // custom tooltip hooks (the page wires onKnotTip; native <title> is the fallback).
      knot.on("pointerenter", (ev, d) => { if (onKnotTip) onKnotTip(d, ev); })
          .on("pointermove", (ev, d) => { if (onKnotTip) onKnotTip(d, ev); })
          .on("pointerleave", () => { if (onKnotTip) onKnotTip(null); });

      // labels for the ranked-hubs step (drawn on top of everything).
      gLabels = svg.append("g").attr("class", "hub-labels");

      setMode("overview");
      return data;
    }

    // radius of a hub's bright core, scaled by #chains (the 12-chain knots biggest).
    function coreR(d) { return 1.6 + d.chains.length * 0.55; }

    // which edges belong to an isolated chain: its own brand turf + any hub it sits in.
    function edgeInIsolate(cls, chainId) {
      if (cls === "brand:" + chainId) return true;
      const hubLabels = hubsByChain.get(chainId);
      return !!(hubLabels && hubLabels.has(cls));
    }

    function setMode(m, isolate = null) {
      // `isolate` (a chain id) is consumed by "territory" mode's explorer to dim
      // every edge that doesn't belong to the chosen chain; other modes ignore it.
      mode = m;
      if (!svg) return;
      const territoryish = (mode === "saturation" || mode === "territory");

      // --- street / territory edge styling per mode ---
      const paths = gEdges.selectAll("path");
      if (mode === "saturation") {
        // SATURATION: unclaimed pops in full ink; everything-claimed fades back.
        paths
          .attr("stroke", d => d.cls === "unclaimed" ? UNCLAIMED_INK : TERR.brand)
          .attr("stroke-width", d => d.cls === "unclaimed" ? 1.1 : 0.7)
          .attr("opacity", d => d.cls === "unclaimed" ? 0.95 : 0.12);
      } else if (mode === "territory") {
        // EXPLORER: full territory colouring; isolate dims all non-member edges.
        paths
          .attr("stroke", d => territoryColour(d.cls))
          .attr("stroke-width", d => isolate && edgeInIsolate(d.cls, isolate) ? 1.1 : 0.7)
          .attr("opacity", d => {
            if (!isolate) return d.cls === "unclaimed" ? 0.35 : 0.8;
            return edgeInIsolate(d.cls, isolate) ? 0.95 : 0.08;
          });
      } else {
        const streetStroke = (mode === "hubs" || mode === "hubs-ranked") ? STREET_FAINT : STREET;
        const streetOpacity = (mode === "hubs" || mode === "hubs-ranked") ? 0.45 : 0.9;
        paths.attr("stroke", streetStroke)
          .attr("stroke-width", 0.7)
          .attr("opacity", streetOpacity);
      }

      // --- overview outlet dots (the real cast) only in overview ---
      gOutlets.selectAll("circle").attr("opacity", mode === "overview" ? 0.85 : 0);

      // --- exemplar layer (only in exemplar mode) ---
      gExemplar.selectAll("*").remove();
      if (mode === "exemplar") drawExemplar();

      // --- hub knots per mode ---
      const knots = gHubs.selectAll("g.knot");
      const glowing = (mode === "hubs" || mode === "hubs-ranked");
      if (mode === "overview") {
        // If we have the real outlets layer, the knots step back to a faint hint;
        // without it, the knots ARE the overview proxy (small + uniform).
        knots.style("opacity", data.outlets ? 0 : 1)
          .classed("pulse", false);
        knots.select(".g-halo").attr("r", 0).attr("fill", "none");
        knots.select(".g-ring").attr("r", 0).attr("fill", "none");
        knots.select(".g-core").attr("r", 2.4).attr("fill", DOT).attr("opacity", 0.9);
      } else if (mode === "exemplar") {
        knots.style("opacity", 0.22).classed("pulse", false);
        knots.select(".g-halo").attr("r", 0).attr("fill", "none");
        knots.select(".g-ring").attr("r", 0).attr("fill", "none");
        knots.select(".g-core").attr("r", 2).attr("fill", DOT).attr("opacity", 0.6);
      } else if (glowing) {
        // THE HERO: gradient-core glow, sized by #chains.
        knots.style("opacity", 1);
        knots.select(".g-halo")
          .attr("r", d => coreR(d) + 8).attr("fill", HUB_CORE).attr("opacity", 0.14);
        knots.select(".g-ring")
          .attr("r", d => coreR(d) + 3.5).attr("fill", HUB_CORE).attr("opacity", 0.30);
        knots.select(".g-core")
          .attr("r", coreR).attr("fill", HUB_CORE).attr("opacity", 0.95);
        // ranked step: top-5 knots pulse (gated to no-preference via CSS class).
        knots.classed("pulse", d => mode === "hubs-ranked" && d.rank <= 5);
      } else if (territoryish) {
        // territory/saturation: knots present but quiet so the edges read.
        const onMode = mode === "territory";
        knots.style("opacity", onMode ? 0.9 : 0.4).classed("pulse", false);
        knots.select(".g-halo").attr("r", 0).attr("fill", "none");
        knots.select(".g-ring")
          .attr("r", onMode ? d => coreR(d) + 2 : 0).attr("fill", HUB_CORE).attr("opacity", 0.18);
        knots.select(".g-core")
          .attr("r", onMode ? 2.6 : 2).attr("fill", HUB_CORE).attr("opacity", onMode ? 0.85 : 0.5);
      }

      // --- ranked-hub labels (only in hubs-ranked) ---
      gLabels.selectAll("*").remove();
      if (mode === "hubs-ranked") {
        const top = data.hubs.filter(h => h.rank <= 5);
        const lab = gLabels.selectAll("text").data(top).enter().append("text")
          .attr("x", d => x(d.lon) + coreR(d) + 5)
          .attr("y", d => y(d.lat) + 3)
          .attr("class", "hub-label")
          .text(d => `${d.chains.length} brands`);
        // a hair of halo so the label reads over the glow.
        lab.clone(true).lower().attr("class", "hub-label-bg");
      }
    }

    function territoryColour(cls) {
      if (cls === "contested") return TERR.contested;
      if (cls === "unclaimed") return TERR.unclaimed;
      if (cls.startsWith("hub:")) return TERR.hub;
      if (cls.startsWith("brand:")) {
        const cid = cls.slice("brand:".length);
        const cat = ROSTER_CAT.get(cid);
        return (cat && CAT_HUE[cat]) || TERR.brand;
      }
      return TERR.brand;
    }

    function drawExemplar() {
      const ex = data.chains.exemplar;
      const reachM = (data.chains.params && data.chains.params.reach_m) || 1000;
      const dLon = reachM / (111320 * Math.cos(ex.lat * Math.PI / 180));
      const rPx = x(ex.lon + dLon) - x(ex.lon);
      gExemplar.append("circle")
        .attr("cx", x(ex.lon)).attr("cy", y(ex.lat)).attr("r", rPx)
        .attr("fill", "none").attr("stroke", GHOST)
        .attr("stroke-width", 1).attr("stroke-dasharray", "4 4")
        .style("vector-effect", "non-scaling-stroke");
      gExemplar.append("circle")
        .attr("cx", x(ex.lon)).attr("cy", y(ex.lat)).attr("r", 4)
        .attr("fill", EXEMPLAR).attr("stroke", "#fff").attr("stroke-width", 1);
    }

    // roster category lookup (filled at mount-time via setRosterCat).
    const ROSTER_CAT = new Map();
    function setRosterCat(roster) {
      ROSTER_CAT.clear();
      for (const r of roster) ROSTER_CAT.set(r.id, r.category);
    }

    return {
      mount, setMode, setRosterCat,
      catHue: cat => CAT_HUE[cat] || TERR.brand,
      onKnotTip: fn => { onKnotTip = fn; },
      project: (lon, lat) => [x(lon), y(lat)],
    };
  })();

  // ---- steps 1-6. Every number traces to the baked JSON. ----
  function buildSteps(d) {
    const t = d.chains.totals;
    const roster = d.chains.roster;
    const brands = roster.length;                       // 42
    const exLabel = (roster.find(r => r.id === d.chains.exemplar.chain) || {}).label || "Highlands Coffee";
    const maxBrands = Math.max(...d.hubs.map(h => h.chains.length));
    const top = d.hubs.slice().sort((a, b) => a.rank - b.rank)[0];

    // saturation numbers — computed from the loaded edges, never hard-coded.
    const edges = d.terr.edges;
    const nEdges = edges.length;
    const nUnclaimed = edges.filter(e => e.cls === "unclaimed").length;
    const beyond = d.chains.headline.independents_beyond_reach;
    const beyondShare = (d.chains.headline.independents_beyond_reach_share * 100).toFixed(2);
    const labelById = id => (roster.find(r => r.id === id) || {}).label || id;

    return [
      {
        kind: "intro",
        kicker: "The cast",
        headline: `${t.outlets} outlets. ${brands} brands.`,
        narrative: `Dropped onto one district of ${t.independents.toLocaleString()} independent ` +
          `shops, ${t.outlets} chain outlets from ${brands} brands — WinMart+, Trung Nguyên, ` +
          `Circle K, Highlands. Here they are on Bình Thạnh's streets. The question this ` +
          `story answers isn't who's bigger. It's where they land.`,
        render() { ChainsMap.setMode("overview"); },
      },
      {
        kind: "data",
        kicker: "How we measure reach",
        headline: `A circle is the lazy guess`,
        narrative: `Take one outlet — this ${exLabel} — and ask how far a customer is. The naive ` +
          `answer is a 1&nbsp;km circle (dashed). But nobody walks through walls: the real reach ` +
          `follows the street mesh, and in a district this dense with hẻm the walked catchment is ` +
          `tighter than the circle suggests. Every claim that follows uses walked distance, not the circle.`,
        render() { ChainsMap.setMode("exemplar"); },
      },
      {
        kind: "data",
        kicker: "The pile-up",
        headline: `Chains don't spread out — they <em>pile up</em>`,
        narrative: `Cluster the outlets and ${t.hubs} hubs emerge. Two corners are extraordinary: ` +
          `each packs <b>${maxBrands} different brands</b> into one ~200&nbsp;m knot — the rank-1 hub alone ` +
          `holds ${top.outlets} outlets. The glow is sized by how many brands share the corner; ` +
          `the two brightest are those ${maxBrands}-brand mega-knots. This is the whole story: not territory, ` +
          `but a few corners that swallow the chains.`,
        render() { ChainsMap.setMode("hubs"); },
      },
      {
        kind: "data",
        kicker: "The biggest knots",
        headline: `Name the corners`,
        narrative: `Rank the knots by how many brands share the ground. The top two each hold ` +
          `<b>${maxBrands} brands</b>: the rank-1 corner (${top.outlets} outlets) lines up Circle&nbsp;K, ` +
          `Highlands, Starbucks, GoGi House and Trung Nguyên on one block; rank 2 stacks Phúc Long, ` +
          `Katinat, Pizza Hut and PNJ a stone's throw away. Below them sit a ${nthBrands(d.hubs, 3)}-brand ` +
          `knot, then a cluster of 9-brand corners. Five labels mark the loudest five.`,
        render() { ChainsMap.setMode("hubs-ranked"); },
      },
      {
        kind: "data",
        kicker: "What escapes",
        headline: `Almost nothing escapes`,
        narrative: `Now walk a kilometre out from <em>every</em> chain and colour the streets it reaches. ` +
          `The point isn't who owns what — it's how little is left. Only <b>${nUnclaimed.toLocaleString()} of ` +
          `${nEdges.toLocaleString()} street segments</b> (${(100 * nUnclaimed / nEdges).toFixed(1)}%), and just ` +
          `<b>${beyond} of ${t.independents.toLocaleString()} independent shops (${beyondShare}%)</b>, lie ` +
          `beyond every chain's reach. Those few dark threads — picked out in ink here — are the whole of ` +
          `Bình Thạnh a chain can't already walk to. The district is saturated. ` +
          `<a class="how" href="hem/">The hẻm story →</a>`,
        render() { ChainsMap.setMode("saturation"); },
      },
      {
        kind: "data",
        kicker: "Explore",
        headline: `Whose kilometre is this?`,
        narrative: `Tap a brand below to light only its walked territory — its own turf plus every hub it ` +
          `sits in — and fade the rest. Tap again to see them all. The full map shades each segment by ` +
          `whoever reaches it first: a single brand's turf, a shared hub, a contested frontier, or the rare ` +
          `unclaimed thread. Hover a glowing knot to read which brands stack on that corner.`,
        render(slot) {
          const isolate = Explorer.current();
          ChainsMap.setMode("territory", isolate);
          Explorer.activate();
        },
      },
    ];
  }

  function nthBrands(hubs, rank) {
    const h = hubs.find(x => x.rank === rank);
    return h ? h.chains.length : "";
  }

  // ---- Explorer: interactive legend chips + #c:<id> hash + hub tooltip ----------------
  const Explorer = (function () {
    let data = null, legendEl = null, tip = null;
    let isolated = null;     // current chain id or null
    let built = false;       // chips injected once

    function readHash() {
      const seg = location.hash.replace(/^#/, "").split("/").find(s => s.startsWith("c:"));
      return seg ? seg.slice(2) : null;
    }
    function writeHash(id) {
      // mirror place-names: replaceState, no history spam.
      history.replaceState(null, "", id ? `#c:${id}` : location.pathname + location.search);
    }

    function init(d) {
      data = d;
      legendEl = document.getElementById("chains-legend");
      const fromHash = readHash();
      if (fromHash && d.chains.roster.some(r => r.id === fromHash)) {
        isolated = fromHash;
      } else if (fromHash) {
        history.replaceState(null, "", location.pathname + location.search);
      }
      buildTooltip();
      wireKnotTip();
    }

    function buildTooltip() {
      tip = document.createElement("div");
      tip.className = "chains-tip";
      tip.hidden = true;
      document.body.append(tip);
      // Touch has no hover: a tap fires pointerenter (so the tip SHOWS) but never
      // pointerleave, so the tip would stick. Dismiss it on any tap that lands off
      // a knot — same "tap pins, tap-away clears" pattern place-names uses on touch.
      document.addEventListener("pointerdown", (ev) => {
        if (tip.hidden) return;
        if (ev.target.closest && ev.target.closest("g.knot")) return;
        tip.hidden = true;
      }, true);
    }

    function wireKnotTip() {
      ChainsMap.onKnotTip((hub, ev) => {
        if (!hub) { tip.hidden = true; return; }
        const names = hub.chains
          .map(c => (data.chains.roster.find(r => r.id === c) || {}).label || c)
          .join(" · ");
        tip.innerHTML = `<b>${hub.chains.length} brands · ${hub.outlets} outlets</b>` +
          `<span class="tip-list">${names}</span>`;
        tip.hidden = false;
        const pad = 12;
        let lx = ev.clientX + pad, ly = ev.clientY + pad;
        const w = tip.offsetWidth, h = tip.offsetHeight;
        if (lx + w > window.innerWidth) lx = ev.clientX - w - pad;
        if (ly + h > window.innerHeight) ly = ev.clientY - h - pad;
        tip.style.left = lx + "px";
        tip.style.top = ly + "px";
      });
    }

    // build chips lazily, the first time the explorer step is shown.
    function buildChips() {
      if (built || !legendEl) return;
      built = true;
      // one chip per top brand (cap to keep the strip legible) — biggest first.
      const top = data.chains.roster.slice().sort((a, b) => b.n - a.n).slice(0, 12);
      legendEl.innerHTML = "";
      for (const r of top) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.dataset.chain = r.id;
        chip.setAttribute("aria-pressed", "false");
        chip.innerHTML =
          `<span class="sw" style="background:${ChainsMap.catHue(r.category)}"></span>` +
          `${r.label} <span class="n">${r.n}</span>`;
        chip.addEventListener("click", () => toggle(r.id));
        legendEl.append(chip);
      }
      syncChips();
    }

    function syncChips() {
      if (!legendEl) return;
      legendEl.querySelectorAll(".chip").forEach(chip => {
        const on = chip.dataset.chain === isolated;
        chip.classList.toggle("on", on);
        chip.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }

    function toggle(id) {
      isolated = (isolated === id) ? null : id;
      writeHash(isolated);
      ChainsMap.setMode("territory", isolated);
      syncChips();
    }

    // called when the explorer step renders.
    function activate() {
      buildChips();
      syncChips();
      if (legendEl) legendEl.hidden = false;
    }
    function current() { return isolated; }

    return { init, activate, current };
  })();

  document.addEventListener("DOMContentLoaded", async () => {
    const figure = document.getElementById("chains-map");
    try {
      const d = await ChainsMap.mount(figure);
      ChainsMap.setRosterCat(d.chains.roster);
      Explorer.init(d);
      Stepper.mount(document.getElementById("chains-stepper"), buildSteps(d));
      document.querySelector(".dek").textContent =
        `${d.chains.totals.outlets} chain outlets across ${d.chains.roster.length} brands. ` +
        `They don't spread out — they pile into a handful of corners. Here's where.`;
    } catch (e) {
      figure.textContent = "Map data failed to load.";
      console.error("chains mount:", e);
    }
  });

  // expose for any later step wiring / debugging
  window.ChainsMap = ChainsMap;
})();

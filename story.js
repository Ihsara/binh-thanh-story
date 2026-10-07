window.__storyEngine = true;   // the map engine below boots the controller once data loads
// story.js — "The old names came back". One fixed map, six steps.
// Each step is a declarative STATE; applyState() restyles the map to it. Back,
// Next and #step=N deep links jump straight to a state (no replay).
// Spec: docs/superpowers/specs/2026-10-07-old-names-story-design.md
const FIELD_GUIDE_BASE = "";   // the ONE field-guide base; the spin-out flips it

(function () {
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const STEPS = [
    { kicker: "Bình Thạnh · Hồ Chí Minh City",
      headline: "The old names came back",
      body: "<p>For fifty years this place was a list of numbers. In 2025 the numbers were deleted, and the old names came back.</p>",
      state: { r1895: 0, r1984: 0, layer: "outline", labels: "faint-names", lost: false, cards: false } },
    { kicker: "1895",
      headline: "Before the numbers, <em>Gia Định</em>",
      body: "<p>On Joly's 1895 plan of the Saigon outskirts, the land inside today's outline carries no numbers at all. This was Gia Định country — the name of the citadel, of the province, and loosely of the whole south.</p><p>The French sheet is warped onto today's streets. Its fit is good to about ±400 m: read it as a ghost, not a survey.</p>",
      state: { r1895: 0.85, r1984: 0, layer: "outline", labels: "none", lost: false, cards: false } },
    { kicker: "The numbered era",
      headline: "Twenty wards, numbered up to 28",
      body: "<p>Under the 1984 survey sheet, fitted to today's streets to about ±5 m, lie the twenty wards on the last numbered map (OSM, January 2024). Addresses all ran on these numbers. The old names survived on markets, streets and in memory.</p>",
      state: { r1895: 0, r1984: 0.6, layer: "old", labels: "numbers", lost: false, cards: false } },
    { kicker: "The vanishing",
      headline: "Numbers were disappearing long before 2025",
      body: "<p>Count to 28 and eight numbers are missing: 4, 8, 9, 10, 16, 18, 20 and 23. They were merged away in earlier rounds, and no boundary for them survives in our sources — so they float beside the map without a shape.</p><p>Five more dim on the map: Phường 3, 6, 15, 21 and 24. The 2025 resolution never mentions them, because an earlier round of mergers had already folded them into their neighbours. The law had nothing left to name.</p>",
      state: { r1895: 0, r1984: 0.6, layer: "old", labels: "numbers", lost: true, cards: false } },
    { kicker: "1 July 2025",
      headline: "Nothing was carved off",
      body: "<p>The district level was abolished, and the numbered wards became five names. Yet not one square metre left the old outline: 0.0% of the five new wards lies outside it.</p><p>Nineteen of the twenty mapped wards moved whole. Exactly one, Phường 6, was cut — 54.9% to Gia Định, 45.0% to Bình Lợi Trung.</p>",
      state: { r1895: 0, r1984: 0, layer: "redraw", labels: "names", lost: false, cards: false } },
    { kicker: "Today",
      headline: "Five old names",
      body: "<p>Gia Định, Bình Thạnh, Bình Lợi Trung, Thạnh Mỹ Tây, Bình Quới. Tap a ward to see where its name comes from, which numbers it swallowed, and what its streets are full of now.</p><p class=\"coda\"><a href=\"method.html#story\">How we know →</a></p>",
      state: { r1895: 0, r1984: 0, layer: "new", labels: "names", lost: false, cards: true } },
  ];

  const $ = (id) => document.getElementById(id);
  let step = 0;
  let applyState = function () {};          // replaced by the map engine (Task 5)

  function parseStep(hash) {
    const m = /(?:^|[#&])step=(-?\d+)/.exec(hash || "");
    if (!m) return 0;
    return Math.max(0, Math.min(STEPS.length - 1, parseInt(m[1], 10)));
  }

  function renderText() {
    const s = STEPS[step];
    $("step-body").innerHTML =
      `<span class="kicker">${s.kicker}</span><h2 id="step-headline">${s.headline}</h2>${s.body}`;
    $("step-back").disabled = step === 0;
    const last = step === STEPS.length - 1;
    if (last && document.activeElement === $("step-next")) $("step-back").focus();
    $("step-next").disabled = last;
    $("step-next").textContent = step === 0 ? "Begin →" : "Next →";
    $("step-dots").querySelectorAll("button").forEach((b, i) => {
      if (i === step) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
    if (!s.state.cards) $("ward-card").hidden = true;
  }

  function go(n, { animate = true } = {}) {
    step = Math.max(0, Math.min(STEPS.length - 1, n));
    history.replaceState(null, "", `#step=${step}`);
    renderText();
    applyState(STEPS[step].state, { animate: animate && !REDUCED });
  }

  function mountControls() {
    $("step-dots").innerHTML = STEPS.map((_, i) =>
      `<button type="button" aria-label="Step ${i + 1} of ${STEPS.length}"></button>`).join("");
    $("step-dots").querySelectorAll("button").forEach((b, i) => b.addEventListener("click", () => go(i)));
    $("step-back").addEventListener("click", () => go(step - 1));
    $("step-next").addEventListener("click", () => go(step + 1));
    document.addEventListener("keydown", (e) => {
      if (e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable)) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(step + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(step - 1); }
    });
    window.addEventListener("hashchange", () => {
      const n = parseStep(location.hash);
      if (n !== step) go(n, { animate: false });
    });
  }

  window.__story = { get step() { return step; }, go, parseStep, STEPS,
    setEngine(fn) { applyState = fn; } };

  mountControls();
  // Boot: the engine (Task 5) calls window.__story.boot() once story.json loads.
  window.__story.boot = () => go(parseStep(location.hash), { animate: false });
  if (!window.__storyEngine) window.__story.boot();
})();

// ---- map engine -----------------------------------------------------------
(function () {
  const S = window.__story;
  const svg = d3.select("#map-svg");
  const gR = svg.append("g").attr("class", "rasters");
  const gOld = svg.append("g").attr("class", "old");
  const gPieces = svg.append("g").attr("class", "pieces");
  const gNew = svg.append("g").attr("class", "new");
  const outlinePath = svg.append("path").attr("class", "outline");
  const gLabels = svg.append("g").attr("class", "labels");
  let data, overlays, projection, path, current = null;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (n) => n.split(" ").pop();

  function fit() {
    const r = svg.node().getBoundingClientRect();
    projection = d3.geoMercator().fitExtent([[16, 16], [r.width - 16, r.height - 16]], data.outline);
    path = d3.geoPath(projection);
    for (const id of ["1895", "1984"]) {
      const L = overlays.layers.find((l) => l.id === id);
      const [w, s, e, n] = L.bbox;
      const [x0, y0] = projection([w, n]), [x1, y1] = projection([e, s]);
      gR.select(`image.r${id}`).attr("href", L.img)
        .attr("x", x0).attr("y", y0).attr("width", x1 - x0).attr("height", y1 - y0)
        .attr("preserveAspectRatio", "none");
    }
    outlinePath.attr("d", path(data.outline));
    gOld.selectAll("path").attr("d", (d) => path(d.geometry));
    gPieces.selectAll("path").attr("d", (d) => path(d.geometry));
    gNew.selectAll("path").attr("d", (d) => path(d.geometry));
    gLabels.selectAll("text").attr("transform", (d) => `translate(${projection(d.label)})`);
  }

  function draw() {
    gR.selectAll("image").data(["1895", "1984"]).join("image")
      .attr("class", (d) => `r${d}`).attr("opacity", 0);
    gOld.selectAll("path").data(data.old_wards).join("path")
      .attr("class", (d) => "old-ward" + (d.unnamed_by_resolution ? " unnamed" : ""))
      .attr("opacity", 0);
    gPieces.selectAll("path").data(data.pieces).join("path")
      .attr("class", (d) => "piece" + (d.old === data.cut_old_ward ? " cut" : ""))
      .attr("fill", (d) => colorOf(d.new)).attr("opacity", 0);
    gNew.selectAll("path").data(data.new_wards).join("path")
      .attr("class", "new-ward").attr("fill", (d) => d.color).attr("opacity", 0)
      .attr("tabindex", -1).attr("role", "button").attr("aria-label", (d) => d.name)
      .on("click", (e, d) => openCard(d))
      .on("keydown", (e, d) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCard(d); } });
    gLabels.selectAll("text").data([
      ...data.old_wards.map((d) => ({ kind: "num", text: num(d.name), label: d.label, unnamed: d.unnamed_by_resolution })),
      ...data.new_wards.map((d) => ({ kind: "name", text: d.name.replace("Phường ", ""), label: d.label })),
    ]).join("text").attr("class", (d) => d.kind === "num" ? "old-label" : "new-label")
      .text((d) => d.text).attr("opacity", 0);
  }

  function colorOf(newName) { return data.new_wards.find((w) => w.name === newName).color; }

  function applyState(st, { animate }) {
    const t = animate ? d3.transition().duration(700) : null;
    const A = (sel) => t ? sel.interrupt().transition(t) : sel.interrupt();
    A(gR.select("image.r1895")).attr("opacity", st.r1895);
    A(gR.select("image.r1984")).attr("opacity", st.r1984);
    const L = { "1895": "1895 · Joly, Plan des environs de Saïgon · fit ±400 m",
                "1984": "1984 · DMA L7014 survey sheet · fit ±5 m" };
    d3.select("#map-note").text(st.r1895 ? L["1895"] : st.r1984 ? L["1984"] : "");
    A(gOld.selectAll("path"))
      .attr("opacity", st.layer === "old" ? 0.9 : st.layer === "redraw" ? 0.35 : 0)
      .style("fill-opacity", (d) => st.lost && d.unnamed_by_resolution ? 0.35 : 1);
    A(gPieces.selectAll("path")).attr("opacity", (d) =>
      st.layer === "redraw" ? (d.old === data.cut_old_ward ? 0.85 : 0.6) : 0);
    A(gNew.selectAll("path")).attr("opacity", st.layer === "new" ? 0.85 : 0);
    gNew.selectAll("path").attr("tabindex", st.cards ? 0 : -1);
    gNew.style("pointer-events", st.cards ? "auto" : "none");
    A(outlinePath).attr("opacity", 1);
    A(gLabels.selectAll("text")).attr("opacity", (d) =>
      st.labels === "numbers" && d.kind === "num" ? (st.lost && d.unnamed ? 0.4 : 1)
      : st.labels === "names" && d.kind === "name" ? 1
      : st.labels === "faint-names" && d.kind === "name" ? 0.25 : 0);
    renderLost(st.lost);
    renderCite(st.lost);
    current = st;
  }

  function renderCite(show) {
    const old = document.getElementById("resolution-cite");
    if (old) old.remove();
    if (!show || !data.citations || !data.citations.resolution) return;
    const p = document.createElement("p");
    p.className = "cite"; p.id = "resolution-cite";
    p.textContent = "Resolution: " + data.citations.resolution;
    document.getElementById("step-body").appendChild(p);
  }

  function renderLost(show) {
    const el = document.getElementById("lost-numbers");
    el.hidden = !show;
    if (!show) return;
    el.innerHTML = data.lost_numbers.map((n) => `<span class="lost">${esc(n)}</span>`).join("")
      + `<span class="cap">no boundary survives</span>`;
  }

  function openCard(w) {
    const lives = w.lives, total = lives.sustenance + lives.anchors + lives.third_places + lives.display;
    const hues = { sustenance: "#9c5b2e", anchors: "#4b5d7a", third_places: "#7a9a5c", display: "#c4a35a" };
    const counts = `Sustenance ${lives.sustenance}, anchors ${lives.anchors}, third places ${lives.third_places}, display ${lives.display}`;
    const bar = Object.keys(hues).map((k) =>
      `<span title="${k.replace("_", " ")}: ${lives[k]}" style="width:${(100 * lives[k] / total).toFixed(1)}%;background:${hues[k]}"></span>`).join("");
    const origin = S.origins.find((o) => o.name === w.origin_ref);
    const src = !origin ? "" : origin.sources.map((s) => `${esc(s.title)} (${esc(s.ref)})`).join("; ");
    const hubs = w.hubs.map((h) =>
      `<a href="${FIELD_GUIDE_BASE}hub.html?h=${h.rank}">${esc(h.title)}</a>`).join(" · ");
    const card = document.getElementById("ward-card");
    card.style.borderLeftColor = w.color;
    card.innerHTML =
      `<h3>${esc(w.name)}</h3>
       <p>${origin ? esc(origin.origin_text) : "The origin of this name is not documented in the sources we checked."}</p>${src ? `<p class="cite">Sources: ${src}</p>` : ""}
       <p><strong>Formerly:</strong> ${w.old_wards.map(esc).join(", ")}${data.pieces.some((p) => p.old === data.cut_old_ward && p.new === w.name) ? `, and part of ${esc(data.cut_old_ward)}` : ""}.</p>
       <p><strong>${w.population.toLocaleString("en")}</strong> people · ${w.density_per_km2.toLocaleString("en")} per km²</p>
       ${w.population_disputed ? `<p class="cite">${esc(w.population_disputed)}</p>` : ""}
       <div class="lives-bar" role="img" aria-label="${counts}">${bar}</div>
       <p class="cite">Sustenance ${lives.sustenance} · anchors ${lives.anchors} · third places ${lives.third_places} · display ${lives.display}, by mapped places.</p>
       ${w.dish ? `<p>Most-named dish in its places' names: <strong>${esc(w.dish.label)}</strong> (${w.dish.n} places)</p>` : ""}
       ${hubs ? `<p>Walk it: ${hubs}</p>` : ""}
       <p class="cite">Population: ${esc(data.citations.population)}</p>`;
    card.hidden = false;
    card.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  let resizeTimer;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fit, 120); });

  S.ready = Promise.all([d3.json("story.json"), d3.json("overlay-maps.json"), d3.json("name_origins.json")])
    .then(([story, ov, origins]) => {
      data = story; overlays = ov; S.origins = origins.origins;
      draw(); fit();
      S.setEngine(applyState);
      window.__story.boot();
      return new Promise((res) => requestAnimationFrame(() => res()));
    })
    .catch((err) => {
      console.error(err);
      d3.select("#map-note").text("The map could not load.");
      window.__story.boot();
    });
})();

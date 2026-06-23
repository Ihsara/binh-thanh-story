// road-beneath.js — magazine figures + sticky scroll-locator for the Thiên Lý long-read.
// Loads the baked road-beneath-figures.json and renders: intro arteries map, sticky
// locator (IntersectionObserver — NO scroll-jack), ride-strip, name-stack, three-fates.
(function () {
  const SVGNS = "http://www.w3.org/2000/svg";
  const INK = "#1d1a16", DIM = "#c9bea4", WATER = "#8daab8", ACCENT = "#a0522d";
  const el = (id) => document.getElementById(id);
  function svg(w, h) {
    const s = document.createElementNS(SVGNS, "svg");
    s.setAttribute("viewBox", `0 0 ${w} ${h}`);
    s.setAttribute("preserveAspectRatio", "xMidYMid meet");
    s.setAttribute("aria-hidden", "true");
    return s;
  }
  function path(d, stroke, w, opacity) {
    const p = document.createElementNS(SVGNS, "path");
    p.setAttribute("d", d); p.setAttribute("fill", "none");
    p.setAttribute("stroke", stroke); p.setAttribute("stroke-width", w);
    p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round");
    if (opacity != null) p.setAttribute("opacity", opacity);
    return p;
  }
  // project [lon,lat] coords into an SVG box (north-up); returns {pt, d}
  function projector(coords, w, h, pad) {
    const xs = coords.map((c) => c[0]), ys = coords.map((c) => c[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const sx = (w - 2 * pad) / ((x1 - x0) || 1);
    const sy = (h - 2 * pad) / ((y1 - y0) || 1);
    const s = Math.min(sx, sy);
    const pt = ([lon, lat]) => [pad + (lon - x0) * s, h - pad - (lat - y0) * s];
    const d = (cs) => cs.map((c, i) => (i ? "L" : "M") + pt(c).join(" ")).join(" ");
    return { pt, d };
  }

  fetch("road-beneath-figures.json").then((r) => r.json()).then((fig) => {
    renderArteries(fig);
    const loc = buildLocator(fig);
    renderRideStrip(fig);
    renderNameStack(fig);
    renderThreeFates(fig);
    wireObserver(fig, loc);
  }).catch((e) => {
    const m = el("fig-arteries");
    if (m) m.textContent = "figures unavailable: " + e;
  });

  // ── intro arteries map ────────────────────────────────────────────────
  function renderArteries(fig) {
    const mount = el("fig-arteries"); if (!mount) return;
    const W = 720, H = 420, pad = 18;
    const all = fig.arteries.flatMap((a) => a.coords).concat(fig.route);
    const pr = projector(all, W, H, pad);
    const s = svg(W, H);
    fig.arteries.forEach((a) => {
      s.append(path(pr.d(a.coords), DIM, 2.4, 0.9));
      const mid = a.coords[Math.floor(a.coords.length / 2)];
      if (mid) {
        const t = document.createElementNS(SVGNS, "text");
        const [x, y] = pr.pt(mid);
        t.setAttribute("x", x); t.setAttribute("y", y - 4);
        t.setAttribute("font-size", "11"); t.setAttribute("fill", "#7a6e5c");
        t.setAttribute("font-family", "'Be Vietnam Pro',sans-serif");
        t.textContent = a.name; s.append(t);
      }
    });
    s.append(path(pr.d(fig.route), INK, 4.0, 1)); // the hero corridor
    mount.append(s);
  }

  // ── sticky locator ────────────────────────────────────────────────────
  function buildLocator(fig) {
    const mount = el("locator"); if (!mount) return null;
    const W = 240, H = 280, pad = 14;
    const pr = projector(fig.route, W, H, pad);
    const s = svg(W, H);
    // dim full district route as context
    s.append(path(pr.d(fig.route), DIM, 2.0, 0.7));
    // a highlight path we re-point per section
    const hi = path("", ACCENT, 4.0, 1); s.append(hi);
    // crossing dots
    fig.crossings.filter((c) => c.on_route).forEach((c) => {
      const dot = document.createElementNS(SVGNS, "circle");
      const [x, y] = pr.pt([c.lon, c.lat]);
      dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", 3);
      dot.setAttribute("fill", "#3a2e20"); s.append(dot);
    });
    const cap = document.createElement("div"); cap.className = "loc-caption";
    mount.append(s, cap);
    function highlight(segKey, label) {
      const seg = fig.segments[segKey];
      if (seg) hi.setAttribute("d", pr.d(fig.route.slice(seg[0], seg[1] + 1)));
      else hi.setAttribute("d", pr.d(fig.route));
      cap.textContent = label || "";
    }
    return { highlight };
  }

  // map each article section id → locator state
  function wireObserver(fig, loc) {
    if (!loc) return;
    const map = {
      "arteries": ["all", "Bình Thạnh — the whole corridor"],
      "hook": ["all", "The line you ride every day"],
      "the-road-1748": ["all", "1748 — the full northern route"],
      "the-bridges": ["bridges", "The four crossings"],
      "name-stack": ["thi_nghe", "Through Thị Nghè into the district"],
      "three-fates": ["peninsula", "Out to the Bình Quới peninsula"],
      "route-citation": ["all", "1815 → 1895 → today"],
      "what-survives": ["peninsula", "The forgotten Bình Quới segment"],
    };
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const m = map[en.target.id];
        if (m) loc.highlight(m[0] === "all" ? null : m[0], m[1]);
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    document.querySelectorAll(".article-section[id]").forEach((sec) => obs.observe(sec));
  }

  // ── ride-strip ────────────────────────────────────────────────────────
  function renderRideStrip(fig) {
    const mount = el("fig-ride-strip"); if (!mount) return;
    const stops = fig.ride_strip; const W = 720, H = 120, padL = 24, padR = 24;
    const s = svg(W, H); const y = 60;
    s.append(path(`M${padL} ${y} L${W - padR} ${y}`, INK, 3, 1));
    const n = stops.length;
    stops.forEach((c, i) => {
      const x = padL + (W - padL - padR) * (n === 1 ? 0.5 : i / (n - 1));
      const dot = document.createElementNS(SVGNS, "circle");
      dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", 6);
      dot.setAttribute("fill", c.glyph === "ferry" ? WATER : "#3a2e20");
      s.append(dot);
      const anchor = i === 0 ? "start" : (i === n - 1 ? "end" : "middle");
      const tx = i === 0 ? padL : (i === n - 1 ? W - padR : x);
      const t = document.createElementNS(SVGNS, "text");
      t.setAttribute("x", tx); t.setAttribute("y", i % 2 ? y + 28 : y - 16);
      t.setAttribute("text-anchor", anchor); t.setAttribute("font-size", "12");
      t.setAttribute("fill", "#4a3f2f");
      t.setAttribute("font-family", "'Be Vietnam Pro',sans-serif");
      t.textContent = c.name; s.append(t);
    });
    mount.append(s);
  }

  // ── name-stack ────────────────────────────────────────────────────────
  function renderNameStack(fig) {
    const mount = el("fig-name-stack"); if (!mount) return;
    const lanes = fig.name_stack; const W = 720, laneH = 46, pad = 8;
    const H = lanes.length * laneH + 2 * pad;
    const s = svg(W, H);
    lanes.forEach((lane, li) => {
      const y = pad + li * laneH;
      const lbl = document.createElementNS(SVGNS, "text");
      lbl.setAttribute("x", 4); lbl.setAttribute("y", y + 16);
      lbl.setAttribute("font-size", "12"); lbl.setAttribute("font-weight", "600");
      lbl.setAttribute("fill", INK);
      lbl.setAttribute("font-family", "'Be Vietnam Pro',sans-serif");
      lbl.textContent = lane.street; s.append(lbl);
      const nb = lane.blocks.length;
      lane.blocks.forEach((b, bi) => {
        const bw = (W - 180) / nb, x = 180 + bi * bw;
        const rect = document.createElementNS(SVGNS, "rect");
        rect.setAttribute("x", x + 2); rect.setAttribute("y", y + 4);
        rect.setAttribute("width", bw - 4); rect.setAttribute("height", laneH - 14);
        rect.setAttribute("rx", 3);
        rect.setAttribute("fill", b.unknown ? "none" : "#efe6d2");
        rect.setAttribute("stroke", b.unknown ? DIM : "#d8c9a8");
        if (b.unknown) rect.setAttribute("stroke-dasharray", "4 3");
        s.append(rect);
        const t = document.createElementNS(SVGNS, "text");
        t.setAttribute("x", x + bw / 2); t.setAttribute("y", y + laneH / 2 + 2);
        t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", "10.5");
        t.setAttribute("fill", b.unknown ? "#9a8e76" : "#4a3f2f");
        t.setAttribute("font-family", "'Be Vietnam Pro',sans-serif");
        t.textContent = b.unknown ? `${b.era}: unknown` : `${b.era}: ${b.name}`;
        s.append(t);
      });
    });
    mount.append(s);
  }

  // ── three-fates ───────────────────────────────────────────────────────
  function renderThreeFates(fig) {
    const mount = el("fig-three-fates"); if (!mount) return;
    const fates = fig.three_fates; const cw = 240, H = 150, pad = 20;
    const W = fates.length * cw;
    const s = svg(W, H);
    fates.forEach((f, fi) => {
      const ox = fi * cw;
      const ser = f.series, n = ser.length;
      const lo = Math.min(...ser), hi = Math.max(...ser), rng = (hi - lo) || 1;
      const yOf = (v) => pad + 40 + (1 - (v - lo) / rng) * 50;
      const d = ser.map((v, i) =>
        (i ? "L" : "M") + (ox + pad + (cw - 2 * pad) * (n === 1 ? 0.5 : i / (n - 1))) + " " + yOf(v)).join(" ");
      s.append(path(d, fi === 1 ? WATER : (fi === 2 ? ACCENT : "#3a2e20"), 2.6, 1));
      const t = document.createElementNS(SVGNS, "text");
      t.setAttribute("x", ox + cw / 2); t.setAttribute("y", H - 30);
      t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", "11");
      t.setAttribute("fill", "#4a3f2f");
      t.setAttribute("font-family", "'Be Vietnam Pro',sans-serif");
      t.textContent = f.label; s.append(t);
      if (f.note) {
        const n2 = document.createElementNS(SVGNS, "text");
        n2.setAttribute("x", ox + cw / 2); n2.setAttribute("y", H - 14);
        n2.setAttribute("text-anchor", "middle"); n2.setAttribute("font-size", "9");
        n2.setAttribute("fill", "#7a6e5c");
        n2.setAttribute("font-family", "'Be Vietnam Pro',sans-serif");
        n2.textContent = f.note; s.append(n2);
      }
    });
    mount.append(s);
  }
})();

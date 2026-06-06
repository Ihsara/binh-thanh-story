// Decade-timeline engine. Two renderings share one year-driven redraw:
//   Timeline.mapGrid(mount, data, layer)  -> small-multiples + scrub focus map
//   Timeline.lineRace(mount, data)        -> SVG bump chart (see Task C5)
window.Timeline = (function () {
  function schemaList(data) { return data.snapshots.map((s) => s.schema); }
  function years(data) { return data.snapshots.map((s) => s.year); }

  function mapGrid(mount, data, layer) {
    const schemas = schemaList(data), ys = years(data);
    mount.classList.add("timeline");

    // Focus map (large), driven by the scrubber / play button.
    const focus = document.createElement("figure");
    focus.className = "tl-focus";
    const fimg = document.createElement("img");
    const fcap = document.createElement("figcaption");
    focus.append(fimg, fcap);

    // Controls
    const controls = document.createElement("div");
    controls.className = "tl-controls";
    const play = document.createElement("button");
    play.type = "button"; play.className = "tl-play"; play.textContent = "▶ Play";
    const range = document.createElement("input");
    range.type = "range"; range.min = "0"; range.max = String(ys.length - 1);
    range.value = String(ys.length - 1); range.className = "tl-range";
    controls.append(play, range);

    // Small-multiples grid (plain <img>s — works with JS off too).
    const grid = document.createElement("div");
    grid.className = "tl-grid";
    schemas.forEach((schema, i) => {
      const fig = document.createElement("figure");
      const img = document.createElement("img");
      img.src = `${layer}-${schema}.png`;
      img.alt = `${layer} ${ys[i]}`; img.loading = "lazy";
      const cap = document.createElement("figcaption");
      cap.textContent = ys[i];
      fig.append(img, cap);
      fig.addEventListener("click", () => setYear(i));
      grid.append(fig);
    });

    function setYear(i) {
      range.value = String(i);
      fimg.src = `${layer}-${schemas[i]}.png`;
      fimg.alt = `${layer} ${ys[i]}`;
      fcap.textContent = ys[i];
      grid.querySelectorAll("figure").forEach((f, j) =>
        f.classList.toggle("active", j === i));
    }

    let timer = null;
    function stop() { if (timer) { clearInterval(timer); timer = null; } play.textContent = "▶ Play"; }
    play.addEventListener("click", () => {
      if (timer) { stop(); return; }
      play.textContent = "❚❚ Pause";
      let i = (Number(range.value) >= ys.length - 1) ? 0 : Number(range.value);
      setYear(i);
      timer = setInterval(() => {
        i += 1;
        if (i >= ys.length) { stop(); return; }
        setYear(i);
      }, 700);
    });
    range.addEventListener("input", () => { stop(); setYear(Number(range.value)); });

    mount.append(focus, controls, grid);
    setYear(ys.length - 1); // default to the latest year
  }

  function lineRace(mount, data) {
    const SVGNS = "http://www.w3.org/2000/svg";
    const cf = data.cafe_fuel;
    const ys = cf.years;
    const W = 560, H = 320, padX = 48, padY = 30;
    // rank domain: 1..maxRank (lower rank number = higher on chart)
    const allRanks = cf.series.flatMap((s) => s.rank.filter((r) => r != null));
    const maxRank = Math.max(8, ...allRanks);
    const px = (i) => padX + (i * (W - 2 * padX)) / Math.max(1, ys.length - 1);
    const py = (rank) => padY + ((rank - 1) * (H - 2 * padY)) / Math.max(1, maxRank - 1);

    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("class", "linerace");

    // Year axis labels
    ys.forEach((y, i) => {
      const t = document.createElementNS(SVGNS, "text");
      t.setAttribute("x", px(i)); t.setAttribute("y", H - 8);
      t.setAttribute("text-anchor", "middle"); t.setAttribute("class", "axis");
      t.textContent = String(y).slice(2);
      svg.append(t);
    });

    const COLOR = { cafe: "#d6336c", fuel: "#868e96", restaurant: "#adb5bd" };
    const paths = [];
    cf.series.forEach((s) => {
      const pts = s.rank.map((r, i) => (r == null ? null : [px(i), py(r)])).filter(Boolean);
      if (pts.length < 1) return;
      const path = document.createElementNS(SVGNS, "path");
      const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", COLOR[s.value] || "#adb5bd");
      path.setAttribute("stroke-width", s.value === "cafe" ? 3 : 1.8);
      svg.append(path);
      paths.push(path);
      // End label
      const lastIdx = s.rank.map((r, i) => (r == null ? -1 : i)).filter((i) => i >= 0).at(-1);
      const lab = document.createElementNS(SVGNS, "text");
      lab.setAttribute("x", px(lastIdx) + 6); lab.setAttribute("y", py(s.rank[lastIdx]) + 4);
      lab.setAttribute("class", s.value === "cafe" ? "lbl accent" : "lbl");
      lab.textContent = s.value;
      svg.append(lab);
    });

    mount.classList.add("timeline");
    const controls = document.createElement("div");
    controls.className = "tl-controls";
    const play = document.createElement("button");
    play.type = "button"; play.className = "tl-play"; play.textContent = "▶ Replay";
    controls.append(play);
    mount.append(svg, controls);

    // Animate the stroke draw left-to-right by clip.
    const clip = document.createElementNS(SVGNS, "clipPath");
    const clipId = "lr-clip";
    clip.setAttribute("id", clipId);
    const rect = document.createElementNS(SVGNS, "rect");
    rect.setAttribute("x", "0"); rect.setAttribute("y", "0");
    rect.setAttribute("height", String(H));
    clip.append(rect); svg.append(clip);
    paths.forEach((p) => p.setAttribute("clip-path", `url(#${clipId})`));
    function animate() {
      let w = 0;
      rect.setAttribute("width", "0");
      const id = setInterval(() => {
        w += W / 40;
        if (w >= W) { rect.setAttribute("width", String(W)); clearInterval(id); return; }
        rect.setAttribute("width", String(w));
      }, 30);
    }
    play.addEventListener("click", animate);
    animate();
  }

  return { mapGrid, lineRace, schemaList, years };
})();

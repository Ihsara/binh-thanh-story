// renderGrowth(mountEl, years, values, opts) — a padded SVG line with a baseline,
// year ticks, and the 2018->19 jump annotated. Fixes the v1 clipping bug.
window.renderGrowth = function (mount, years, values, opts) {
  opts = opts || {};
  const NS = "http://www.w3.org/2000/svg";
  const W = 560, H = 260, padL = 40, padR = 16, padT = 24, padB = 28;
  const xmin = Math.min(...years), xmax = Math.max(...years), ymax = Math.max(...values);
  const px = (x) => padL + ((x - xmin) / Math.max(1, xmax - xmin)) * (W - padL - padR);
  const py = (y) => H - padB - (y / ymax) * (H - padT - padB);
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "chart-svg");
  // baseline
  const base = document.createElementNS(NS, "line");
  base.setAttribute("x1", padL); base.setAttribute("x2", W - padR);
  base.setAttribute("y1", H - padB); base.setAttribute("y2", H - padB);
  base.setAttribute("stroke", "#e4ddcf"); svg.append(base);
  // year ticks (every other year to avoid crowding)
  years.forEach((y, i) => {
    if (i % 2 && i !== years.length - 1) return;
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", px(y)); t.setAttribute("y", H - 8);
    t.setAttribute("text-anchor", "middle"); t.setAttribute("class", "axis");
    t.textContent = String(y).slice(2); svg.append(t);
  });
  // the line
  const d = years.map((y, i) => `${i ? "L" : "M"}${px(y)},${py(values[i])}`).join(" ");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", d); path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#c0532a"); path.setAttribute("stroke-width", 2.5);
  svg.append(path);
  years.forEach((y, i) => {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", px(y)); c.setAttribute("cy", py(values[i])); c.setAttribute("r", 3.5);
    c.setAttribute("fill", "#c0532a"); svg.append(c);
  });
  // annotate the 2018->19 jump if present
  const j = years.indexOf(2019);
  if (opts.annotate !== false && j > 0) {
    const a = document.createElementNS(NS, "text");
    a.setAttribute("x", px(2019) + 6); a.setAttribute("y", py(values[j]) - 8);
    a.setAttribute("class", "lbl accent"); a.textContent = "the mapping leap →";
    a.setAttribute("text-anchor", "end"); svg.append(a);
  }
  mount.append(svg);
};

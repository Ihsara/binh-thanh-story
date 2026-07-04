// anatomy.js — the walkable anatomy explorer for census.html.
// Renders the baked anatomy_tree as drill-down bars; lazy-loads per-leaf
// anonymous dots. Color's job = honesty (signal/noise/artifact), never category.
const $ = (s) => document.querySelector(s);

let TREE = null;
let DOTS = null;           // lazy-loaded anatomy_dots.json
let BOUNDS = null;         // [x0,y0,x1,y1] from dots file

const UNC = "__uncategorized__";

function nodeAtPath(tree, path) {
  let n = tree;
  for (const key of path) {
    if (!n.children) return null;
    n = n.children.find((c) => c.key === key);
    if (!n) return null;
  }
  return n;
}

function badgeClass(net) {
  const raw = net.added - net.removed;
  if (raw === 0 && net.rename === 0) return "zero";
  const parts = [["sig", Math.abs(net.real)], ["art", Math.abs(net.rename)],
                 ["noi", Math.abs(net.recycle)]];
  parts.sort((a, b) => b[1] - a[1]);
  return parts[0][1] === 0 ? "zero" : parts[0][0];
}

function badgeText(net) {
  const raw = net.added - net.removed;
  if (raw > 0) return "▲+" + raw;
  if (raw < 0) return "▼" + raw;
  return "·";
}

function renderCrumbs(path) {
  const nav = $("#anatomy-crumbs");
  nav.innerHTML = "";
  const hops = [{ key: "__district__", label: "District" }];
  let n = TREE;
  for (const key of path) {
    n = n.children.find((c) => c.key === key);
    hops.push({ key, label: n.label });
  }
  hops.forEach((h, i) => {
    if (i) { const s = document.createElement("span"); s.className = "sep"; s.textContent = "▸"; nav.append(s); }
    const b = document.createElement("button");
    b.className = "crumb" + (i === hops.length - 1 ? " current" : "");
    b.textContent = h.label;
    if (i < hops.length - 1) b.onclick = () => go(path.slice(0, i));
    nav.append(b);
  });
}

function renderBars(node, path, showAll) {
  const box = $("#anatomy-bars");
  box.innerHTML = "";
  $("#anatomy-dots").innerHTML = "";
  const kids = (node.children || []).slice();
  const max = Math.max(1, ...kids.map((c) => c.count));
  const LIMIT = 24;
  const shown = showAll ? kids : kids.slice(0, LIMIT);
  for (const c of shown) {
    const hasKids = !!(c.children && c.children.length);
    const row = document.createElement(hasKids ? "button" : "div");
    row.className = "arow" + (hasKids ? " has-children" : "");
    row.innerHTML =
      `<span class="aname" title="${c.key}">${c.label}</span>` +
      `<span class="atrack"><span class="afill" style="transform:scaleX(${c.count / max})"></span></span>` +
      `<span class="aval">${c.count.toLocaleString()}</span>` +
      `<span class="abadge ${badgeClass(c.net)}">${badgeText(c.net)}</span>` +
      (hasKids ? `<span class="achev">›</span>` : `<span></span>`);
    // Both drills route through go() → hash → render, so a leaf's URL is
    // shareable and the back button works (has-children descends; a leaf
    // lands on its dot-map via render()'s no-children branch).
    row.onclick = () => go(path.concat(c.key));
    box.append(row);
  }
  if (!showAll && kids.length > LIMIT) {
    const more = document.createElement("button");
    more.className = "show-all";
    more.textContent = `show all ${kids.length}`;
    more.onclick = () => renderBars(node, path, true);
    box.append(more);
  }
}

async function showDots(path, leaf) {
  if (!DOTS) {
    const r = await fetch("anatomy_dots.json");
    const j = await r.json();
    DOTS = j.leaves; BOUNDS = j.bounds;
  }
  const key = path.join("/");
  const entry = DOTS[key];
  const host = $("#anatomy-dots");
  host.innerHTML = "";
  if (!entry) { host.innerHTML = `<p class="dot-cap">No coordinates for ${leaf.label}.</p>`; return; }
  const W = 640, H = 420, pad = 12;
  const [x0, y0, x1, y1] = BOUNDS;
  const sx = (lon) => pad + ((lon - x0) / (x1 - x0)) * (W - 2 * pad);
  const sy = (lat) => H - pad - ((lat - y0) / (y1 - y0)) * (H - 2 * pad);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  // district frame (boundary ring if census carried one, else bbox)
  const ring = (TREE.__boundary || null);
  let framePath = `M${pad} ${pad} H${W - pad} V${H - pad} H${pad} Z`;
  if (ring && ring.length) {
    framePath = "M" + ring.map(([lo, la]) => `${sx(lo).toFixed(1)} ${sy(la).toFixed(1)}`).join("L") + "Z";
  }
  const poly = document.createElementNS(svg.namespaceURI, "path");
  poly.setAttribute("d", framePath);
  poly.setAttribute("fill", "#faf6ee"); poly.setAttribute("stroke", "#d8ccb6");
  svg.append(poly);
  for (const [lo, la] of entry.dots) {
    const c = document.createElementNS(svg.namespaceURI, "circle");
    c.setAttribute("cx", sx(lo).toFixed(1)); c.setAttribute("cy", sy(la).toFixed(1));
    c.setAttribute("r", "2.4"); c.setAttribute("fill", "#2f7d5b"); c.setAttribute("fill-opacity", "0.72");
    svg.append(c);
  }
  host.append(svg);
  const cap = document.createElement("p");
  cap.className = "dot-cap";
  cap.textContent = `${entry.count.toLocaleString()} ${leaf.label.toLowerCase()}, where they sit.`;
  host.append(cap);
}

function go(path) {
  location.hash = "a=" + path.join("/");
}

function render() {
  // NOTE A: decode so percent-encoded "(general)" (%28general%29) round-trips.
  let raw = (location.hash.match(/a=([^&]*)/) || [])[1] || "";
  try { raw = decodeURIComponent(raw); } catch (e) { /* leave raw as-is */ }
  const path = raw ? raw.split("/").filter(Boolean) : [];
  const node = nodeAtPath(TREE, path);
  if (!node) { go([]); return; }
  renderCrumbs(path);
  if (node.children && node.children.length) renderBars(node, path, false);
  else showDots(path, node);   // deep-linked straight to a leaf
}

async function boot() {
  const r = await fetch("census.json");
  const c = await r.json();
  TREE = c.anatomy_tree;
  TREE.__boundary = c.boundary || null;   // reuse cuisine-style ring if present (census.json has none → bbox frame)
  $("#anatomy-explorer").hidden = false;
  window.addEventListener("hashchange", render);
  render();
}
boot();

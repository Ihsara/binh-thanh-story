// centers.js — hero district-of-centers map for centers.html
// Consumes web/centers.json (schema centers-v2). Task 5 fills the portrait +
// explorer registers; this file only wires the hero SVG + toolbar + list.
(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const W = 900, H = 700;

  // Small categorical palette over the ≤8 character.type values seen in the
  // live data, plus an explicit unknown tail. Chosen once against
  // web/centers.json's actual character.type set (do not add speculative keys).
  const CHARACTER_PALETTE = {
    balanced: "#c0532a",
    services_and_business: "#5b7ea6",
    lifestyle_services: "#8a6fb0",
    food_and_drink: "#d98c3d",
    shopping: "#4a9b7f",
    cultural_and_historic: "#b0455a",
    education: "#3f8f8f",
    travel_and_transportation: "#7a8450",
    __uncategorized__: "#a89a82",
  };
  function characterColor(type) {
    return CHARACTER_PALETTE[type] || "#c6c6c6"; // .unknown tail
  }

  let state = {
    data: null,
    tint: "character",       // "character" | "density"
    bounds: null,
    project: null,
    densityScale: null,
    chainsOn: false,
    chainsData: null,
  };

  // ---- Task 5 shared state: the census anatomy tree + anonymous dots,
  // fetched once and cached (gotcha 4: no re-fetch per render). ----
  let anatomyState = {
    tree: null,          // census.json anatomy_tree
    dots: null,          // anatomy_dots.json leaves map: "a/b/c" -> {count, dots:[[lon,lat],...]}
    dotsBounds: null,
    lastPath: null,      // Task 5: last drawn explorer path, for the specials toggle redraw
  };

  // Domain label helper: title-case fallback over real Overture root keys
  // (e.g. "services_and_business" -> "Services And Business"). Mirrors the
  // census anatomy.js label convention; no speculative LABELS map here since
  // census.json's anatomy_tree already ships title-cased labels for tree
  // nodes — this helper is for domain keys arriving bare (over_index/
  // domain_shares in centers.json).
  function label_for(key) {
    if (!key) return "";
    if (key === "__uncategorized__" || key === "unknown") return "Uncategorized";
    return key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  // Stable domain palette shared by the portrait's domain-share bars and the
  // hero's CHARACTER_PALETTE where keys overlap — VALUE carries magnitude,
  // hue stays fixed per domain for cross-item consistency. Explicit
  // .unknown tail for any domain key not enumerated here.
  const DOMAIN_PALETTE = {
    services_and_business: "#5b7ea6",
    food_and_drink: "#d98c3d",
    shopping: "#4a9b7f",
    lifestyle_services: "#8a6fb0",
    education: "#3f8f8f",
    travel_and_transportation: "#7a8450",
    cultural_and_historic: "#b0455a",
    sports_and_recreation: "#4a7ab0",
    lodging: "#a06a3f",
    health_care: "#5a9a6a",
    community_and_government: "#8a7a5a",
    arts_and_entertainment: "#b0703f",
    geographic_entities: "#7a7a7a",
    __uncategorized__: "#a89a82",
  };
  function domainColor(key) {
    return DOMAIN_PALETTE[key] || "#c6c6c6"; // .unknown tail
  }

  // Child shade: walk the domain hue toward lighter as you drill deeper, so a
  // category reads as "a shade of its domain". depth 0 = the domain hue itself.
  function domainShade(domainKey, depth, maxDepth) {
    const hex = domainColor(domainKey);
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    const d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    const steps = Math.max(1, maxDepth);
    const t = Math.min(1, depth / (steps + 1));       // 0..~0.75 lightness lift
    const ll = Math.min(0.92, l + (0.92 - l) * t);
    return "hsl(" + Math.round(h * 360) + "," + Math.round(s * 100) + "%," +
           Math.round(ll * 100) + "%)";
  }

  function makeProjector(bounds) {
    // bounds = [minLon, minLat, maxLon, maxLat]. Equirectangular fit into the
    // viewBox, flipping Y so north is up, preserving aspect via letterboxing
    // inside the 900x700 frame (padding kept modest since the frame already
    // matches the district's rough aspect).
    const [minLon, minLat, maxLon, maxLat] = bounds;
    const pad = 24;
    const spanLon = maxLon - minLon;
    const spanLat = maxLat - minLat;
    const availW = W - pad * 2;
    const availH = H - pad * 2;
    // equirectangular: scale lon by cos(meanLat) so shapes aren't stretched
    const meanLatRad = ((minLat + maxLat) / 2) * Math.PI / 180;
    const lonScale = Math.cos(meanLatRad);
    const scaleX = availW / (spanLon * lonScale);
    const scaleY = availH / spanLat;
    const scale = Math.min(scaleX, scaleY);
    const usedW = spanLon * lonScale * scale;
    const usedH = spanLat * scale;
    const offX = pad + (availW - usedW) / 2;
    const offY = pad + (availH - usedH) / 2;
    return function project([lon, lat]) {
      const x = offX + (lon - minLon) * lonScale * scale;
      const y = offY + (maxLat - lat) * scale; // flip Y: north up
      return [x, y];
    };
  }

  function pathFor(coords, project) {
    return coords.map((pt, i) => {
      const [x, y] = project(pt);
      return (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2);
    }).join(" ");
  }

  function render() {
    const svg = document.getElementById("hero-map");
    if (!svg || !state.data) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const data = state.data;
    const project = state.project;
    const centersById = new Map(data.centers.map((c) => [c.id, c]));

    // Edge layer: draw unclaimed/contested first (background), then owned
    // territory edges on top so ownership colour reads clearly.
    const gEdges = document.createElementNS(SVG_NS, "g");
    gEdges.setAttribute("id", "hero-edges");
    svg.appendChild(gEdges);

    const ordered = data.edges.slice().sort((a, b) => {
      const rank = (cls) => (cls === "unclaimed" ? 0 : cls === "contested" ? 1 : 2);
      return rank(a.cls) - rank(b.cls);
    });

    for (const edge of ordered) {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", pathFor(edge.c, project));
      p.setAttribute("class", "edge " + (
        edge.cls === "unclaimed" ? "unclaimed" :
        edge.cls === "contested" ? "contested" : "owned"
      ));
      let color;
      if (edge.cls === "unclaimed") {
        color = "#c6c6c6";
      } else if (edge.cls === "contested") {
        color = "#9a8f78";
      } else {
        const c = centersById.get(edge.cls);
        color = c
          ? (state.tint === "density" ? state.densityScale(c.peak) : characterColor(c.character && c.character.type))
          : "#c6c6c6";
      }
      p.setAttribute("stroke", color);
      p.setAttribute("stroke-width", edge.cls === "unclaimed" ? "0.6" : "1.1");
      gEdges.appendChild(p);
    }

    // Chains overlay (lazy — only drawn once fetched and toggled on).
    if (state.chainsOn && state.chainsData) {
      const gChains = document.createElementNS(SVG_NS, "g");
      gChains.setAttribute("id", "hero-chains");
      const chainEdges = (state.chainsData.edges || []).filter(
        (e) => typeof e.cls === "string" && e.cls.indexOf("brand:") === 0
      );
      for (const edge of chainEdges) {
        const p = document.createElementNS(SVG_NS, "path");
        p.setAttribute("d", pathFor(edge.c, project));
        p.setAttribute("class", "edge chain");
        p.setAttribute("stroke", "#3a342a");
        p.setAttribute("stroke-width", "1");
        gChains.appendChild(p);
      }
      svg.appendChild(gChains);
    }

    // Center anchors + labels.
    const gCenters = document.createElementNS(SVG_NS, "g");
    gCenters.setAttribute("id", "hero-centers");
    svg.appendChild(gCenters);

    for (const c of data.centers) {
      const [x, y] = project([c.lon, c.lat]);
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("class", "center-dot");
      dot.setAttribute("cx", x.toFixed(2));
      dot.setAttribute("cy", y.toFixed(2));
      dot.setAttribute("r", "5");
      dot.setAttribute("fill", state.tint === "density"
        ? state.densityScale(c.peak)
        : characterColor(c.character && c.character.type));
      dot.style.cursor = "pointer";
      dot.addEventListener("click", () => selectCenter(c));
      gCenters.appendChild(dot);

      const label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("class", "center-label");
      label.setAttribute("x", (x + 8).toFixed(2));
      label.setAttribute("y", (y + 4).toFixed(2));
      label.textContent = c.name;
      label.style.cursor = "pointer";
      label.addEventListener("click", () => selectCenter(c));
      gCenters.appendChild(label);
    }
  }

  function selectCenter(c) {
    // Route through go() -> hash -> the single onhashchange handler, which
    // dispatches to renderPortrait. Never call renderPortrait directly from
    // a click (the census anatomy.js bug this task must not repeat).
    go("c=" + encodeURIComponent(c.id));
  }

  function renderList() {
    const ol = document.getElementById("center-list");
    if (!ol || !state.data) return;
    ol.innerHTML = "";
    const ranked = state.data.centers.slice().sort((a, b) => b.peak - a.peak);
    ranked.forEach((c, i) => {
      const li = document.createElement("li");
      const rank = document.createElement("span");
      rank.className = "rank";
      rank.textContent = (i + 1) + ".";
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = c.name;
      const character = document.createElement("span");
      character.className = "character";
      character.textContent = c.character && c.character.label ? c.character.label : "";
      li.appendChild(rank);
      li.appendChild(name);
      li.appendChild(character);
      li.addEventListener("click", () => selectCenter(c));
      ol.appendChild(li);
    });
  }

  function renderWeightTable() {
    const table = document.getElementById("weight-table");
    if (!table || !state.data || !state.data.weight_table) return;
    table.innerHTML = "";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["Domain", "Draw weight"].forEach((h) => {
      const th = document.createElement("th");
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const entries = Object.entries(state.data.weight_table)
      .sort((a, b) => b[1] - a[1]);
    for (const [domain, weight] of entries) {
      const tr = document.createElement("tr");
      const tdDomain = document.createElement("td");
      tdDomain.textContent = domain.replace(/_/g, " ");
      const tdWeight = document.createElement("td");
      tdWeight.textContent = weight.toFixed(2);
      tr.appendChild(tdDomain);
      tr.appendChild(tdWeight);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
  }

  function setTint(tint) {
    state.tint = tint;
    document.querySelectorAll(".hero-toolbar button[data-tint]").forEach((btn) => {
      btn.classList.toggle("on", btn.dataset.tint === tint);
    });
    render();
  }

  function wireToolbar() {
    document.querySelectorAll(".hero-toolbar button[data-tint]").forEach((btn) => {
      btn.addEventListener("click", () => setTint(btn.dataset.tint));
    });
    const chainsBox = document.getElementById("chains-layer");
    if (chainsBox) {
      chainsBox.addEventListener("change", () => {
        state.chainsOn = chainsBox.checked;
        if (state.chainsOn && !state.chainsData) {
          fetch("chains-territory.json")
            .then((r) => r.json())
            .then((json) => {
              state.chainsData = json;
              render();
            })
            .catch(() => {
              state.chainsOn = false;
              chainsBox.checked = false;
            });
        } else {
          render();
        }
      });
    }
  }

  // ============================================================
  // Task 5: per-center portrait
  // ============================================================

  function renderPortrait(center) {
    const section = document.getElementById("center-portrait");
    if (!section || !center) return;
    section.hidden = false;
    section.innerHTML = "";

    const header = document.createElement("div");
    header.className = "portrait-head";
    const h2 = document.createElement("h2");
    h2.textContent = center.name;
    const sub = document.createElement("p");
    sub.className = "portrait-character";
    sub.textContent = (center.character && center.character.label) || "";
    header.appendChild(h2);
    header.appendChild(sub);
    section.appendChild(header);

    // Over-index chips: key -> label_for(key) + "x" + ratio.
    if (center.over_index && center.over_index.length) {
      const chipRow = document.createElement("div");
      chipRow.className = "over-index-chips";
      for (const o of center.over_index) {
        const chip = document.createElement("span");
        chip.className = "chip over-chip";
        chip.textContent = label_for(o.key) + " ×" + o.ratio;
        chipRow.appendChild(chip);
      }
      section.appendChild(chipRow);
    }

    // Domain-share bar row: top ~8 domains by share, width = share.
    const shares = Object.entries(center.domain_shares || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const barBox = document.createElement("div");
    barBox.className = "domain-bars";
    for (const [key, share] of shares) {
      const row = document.createElement("div");
      row.className = "drow";
      const name = document.createElement("span");
      name.className = "dname";
      name.textContent = label_for(key);
      const track = document.createElement("span");
      track.className = "dtrack";
      const fill = document.createElement("span");
      fill.className = "dfill";
      // Gotcha 2: the fill needs display:block + explicit width (not a
      // transform on a 0-basis box) or it renders invisible.
      fill.style.width = Math.max(0, Math.min(100, share * 100)) + "%";
      fill.style.background = domainColor(key);
      track.appendChild(fill);
      const val = document.createElement("span");
      val.className = "dval";
      val.textContent = (share * 100).toFixed(1) + "%";
      row.appendChild(name);
      row.appendChild(track);
      row.appendChild(val);
      barBox.appendChild(row);
    }
    section.appendChild(barBox);

    // Examples list (may be empty — that's honest, not a bug).
    const exBox = document.createElement("div");
    exBox.className = "portrait-examples";
    if (center.examples && center.examples.length) {
      const ul = document.createElement("ul");
      for (const ex of center.examples) {
        const li = document.createElement("li");
        li.textContent = typeof ex === "string" ? ex : (ex.name || "");
        ul.appendChild(li);
      }
      exBox.appendChild(ul);
    } else {
      const p = document.createElement("p");
      p.className = "portrait-no-examples";
      p.textContent = "No named examples surfaced for this center yet.";
      exBox.appendChild(p);
    }
    section.appendChild(exBox);

    const meta = document.createElement("p");
    meta.className = "portrait-meta";
    meta.textContent = center.place_count.toLocaleString() + " places drawn into this center.";
    section.appendChild(meta);
  }

  // ============================================================
  // Task 5: the on-map anatomy explorer ("the census, done right")
  // ============================================================

  function anatomyNodeAtPath(tree, path) {
    let n = tree;
    for (const key of path) {
      if (!n.children) return null;
      n = n.children.find((c) => c.key === key);
      if (!n) return null;
    }
    return n;
  }

  function collectLeafKeys(node, prefix) {
    // Walk down to every terminal node (no children) under `node` and
    // return its full "/"-joined path, including a synthetic "(general)"
    // segment where the tree carries one as a real terminal.
    const out = [];
    const kids = node.children || [];
    if (!kids.length) {
      out.push(prefix.join("/"));
      return out;
    }
    for (const c of kids) {
      out.push.apply(out, collectLeafKeys(c, prefix.concat(c.key)));
    }
    return out;
  }

  function renderExplorerCrumbs(path) {
    const nav = document.getElementById("explorer-crumbs");
    if (!nav) return;
    nav.innerHTML = "";
    const hops = [{ key: "__district__", label: "District" }];
    let n = anatomyState.tree;
    for (const key of path) {
      n = n.children.find((c) => c.key === key);
      if (!n) break;
      hops.push({ key, label: n.label });
    }
    hops.forEach((h, i) => {
      if (i) {
        const sep = document.createElement("span");
        sep.className = "sep";
        sep.textContent = "▸";
        nav.appendChild(sep);
      }
      const b = document.createElement("button");
      b.className = "crumb" + (i === hops.length - 1 ? " current" : "");
      b.textContent = h.label;
      if (i < hops.length - 1) {
        const ancestorPath = path.slice(0, i);
        b.onclick = () => go("a=" + encodeURIComponent(ancestorPath.join("/")));
      }
      nav.appendChild(b);
    });
  }

  function renderExplorerColumns(path) {
    const wrap = document.getElementById("explorer-columns");
    if (!wrap) return;
    wrap.innerHTML = "";
    // Build one column per level: level 0 = domains (root children), then the
    // children along the selected path, then the selected node's children.
    const levels = [];
    let node = anatomyState.tree;
    levels.push({ node: node, selected: path[0] });          // domains
    for (let i = 0; i < path.length; i++) {
      node = (node.children || []).find((c) => c.key === path[i]);
      if (!node) break;
      levels.push({ node: node, selected: path[i + 1] });    // this branch's children
    }
    levels.forEach((lv, depth) => {
      const kids = (lv.node.children || []).slice();
      if (!kids.length) return;                               // leaf: no column
      const col = document.createElement("div");
      col.className = "explorer-col";
      kids.forEach((c) => {
        const domainKey = depth === 0 ? c.key : path[0];
        const row = document.createElement("button");
        row.type = "button";
        row.className = "explorer-cell" +
          (c.key === lv.selected ? " sel" : "") +
          ((c.children && c.children.length) ? " has-children" : "");
        const sw = document.createElement("span");
        sw.className = "cell-sw";
        sw.style.background = domainShade(domainKey, depth, 3);
        const nm = document.createElement("span");
        nm.className = "cell-name";
        nm.textContent = c.label;                             // FULL label, no clip
        nm.title = c.key;
        const ct = document.createElement("span");
        ct.className = "cell-count";
        ct.textContent = c.count.toLocaleString();
        row.appendChild(sw); row.appendChild(nm); row.appendChild(ct);
        const childPath = path.slice(0, depth).concat(c.key);
        row.onclick = () => go("a=" + encodeURIComponent(childPath.join("/")));
        col.appendChild(row);
      });
      wrap.appendChild(col);
    });
  }

  function ensureExplorerAssets() {
    // Lazy-fetch + cache both census.json (anatomy_tree) and
    // anatomy_dots.json (anonymous coords) exactly once.
    const need = [];
    if (!anatomyState.tree) {
      need.push(
        fetch("census.json")
          .then((r) => r.json())
          .then((c) => {
            anatomyState.tree = c.anatomy_tree;
          })
      );
    }
    if (!anatomyState.dots) {
      need.push(
        fetch("anatomy_dots.json")
          .then((r) => r.json())
          .then((j) => {
            anatomyState.dots = j.leaves;
            anatomyState.dotsBounds = j.bounds;
          })
      );
    }
    return Promise.all(need);
  }

  function drawSpecials(gParent) {
    // Pins the rare one/two-of-a-kind places as diamonds. Coords + label only.
    if (!state.data || !state.data.specials || !state.showSpecials) return;
    const project = state.project;
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("id", "specials-layer");
    for (const sp of state.data.specials) {
      for (const coord of sp.coords) {
        const [x, y] = project(coord);
        const dia = document.createElementNS(SVG_NS, "path");
        const rr = 3.2;
        dia.setAttribute("d", "M" + x + " " + (y - rr) + " L" + (x + rr) + " " + y +
                              " L" + x + " " + (y + rr) + " L" + (x - rr) + " " + y + " Z");
        dia.setAttribute("class", "explorer-special");
        const t = document.createElementNS(SVG_NS, "title");
        t.textContent = sp.label;              // label only, no place name
        dia.appendChild(t);
        g.appendChild(dia);
      }
    }
    gParent.appendChild(g);
  }

  function drawExplorerMap(path) {
    const svg = document.getElementById("explorer-map");
    if (!svg || !state.data) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const project = state.project;
    const data = state.data;

    // Street basemap: same edges + projection the hero map uses (reuse, do
    // not re-derive the projection).
    const gEdges = document.createElementNS(SVG_NS, "g");
    gEdges.setAttribute("id", "explorer-edges");
    for (const edge of data.edges) {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", pathFor(edge.c, project));
      p.setAttribute("class", "explorer-edge");
      gEdges.appendChild(p);
    }
    svg.appendChild(gEdges);

    // Anonymous dot overlay: coords + count only, no name lookups anywhere
    // near this block (contract enforced by test_explorer_dots_stay_anonymous).
    const gDots = document.createElementNS(SVG_NS, "g");
    gDots.setAttribute("id", "explorer-dots");
    if (anatomyState.dots) {
      const node = anatomyNodeAtPath(anatomyState.tree, path);
      const leafKeys = node ? collectLeafKeys(node, path) : [];
      for (const key of leafKeys) {
        const entry = anatomyState.dots[key];
        if (!entry) continue;
        for (const coord of entry.dots) {
          const [x, y] = project(coord);
          const dot = document.createElementNS(SVG_NS, "circle");
          dot.setAttribute("cx", x.toFixed(2));
          dot.setAttribute("cy", y.toFixed(2));
          dot.setAttribute("r", "1.2");
          dot.setAttribute("fill-opacity", "0.5");
          dot.setAttribute("class", "explorer-dot");
          gDots.appendChild(dot);
        }
      }
    }
    svg.appendChild(gDots);

    drawSpecials(svg);

    // The 13 named center anchors, always labeled for orientation.
    const gAnchors = document.createElementNS(SVG_NS, "g");
    gAnchors.setAttribute("id", "explorer-anchors");
    for (const c of data.centers) {
      const [x, y] = project([c.lon, c.lat]);
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("class", "explorer-anchor");
      dot.setAttribute("cx", x.toFixed(2));
      dot.setAttribute("cy", y.toFixed(2));
      dot.setAttribute("r", "4");
      gAnchors.appendChild(dot);
      const label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("class", "explorer-anchor-label");
      label.setAttribute("x", (x + 6).toFixed(2));
      label.setAttribute("y", (y + 3).toFixed(2));
      label.textContent = c.name;
      gAnchors.appendChild(label);
    }
    svg.appendChild(gAnchors);
  }

  function renderExplorerCaption(node, path) {
    const cap = document.getElementById("explorer-caption");
    if (!cap) return;
    if (path.length === 0) {
      cap.textContent = data_count_caption(node);
    } else {
      cap.textContent = node.label + ": " + node.count.toLocaleString() + " places, where they sit.";
    }
  }
  function data_count_caption(node) {
    return "The full district anatomy: " + node.count.toLocaleString() + " places. Drill a domain to see where they sit.";
  }

  function ensureExplorerSkeleton() {
    // The HTML ships an empty <section id="anatomy-explorer">; build its
    // internal structure once (crumbs, map svg, rows, caption) rather than
    // rebuilding the whole subtree on every render.
    const section = document.getElementById("anatomy-explorer");
    if (!section || document.getElementById("explorer-crumbs")) return;
    section.innerHTML =
      '<nav id="explorer-crumbs"></nav>' +
      '<button id="specials-toggle" type="button" aria-pressed="false">Show rarities</button>' +
      '<div id="explorer-body">' +
        '<div id="explorer-columns"></div>' +
        '<div id="explorer-mapwrap">' +
          '<svg id="explorer-map" viewBox="0 0 900 700" preserveAspectRatio="xMidYMid meet" ' +
          'role="img" aria-label="The current anatomy slice, plotted on Bình Thạnh\'s streets"></svg>' +
          '<p id="explorer-caption"></p>' +
        '</div>' +
      '</div>';
    const tog = document.getElementById("specials-toggle");
    if (tog) tog.onclick = function () {
      state.showSpecials = !state.showSpecials;
      tog.setAttribute("aria-pressed", state.showSpecials ? "true" : "false");
      drawExplorerMap(anatomyState.lastPath || []);
    };
  }

  function renderExplorer(path) {
    const section = document.getElementById("anatomy-explorer");
    if (!section) return;
    section.hidden = false;
    ensureExplorerSkeleton();
    anatomyState.lastPath = path;
    ensureExplorerAssets().then(() => {
      const node = anatomyNodeAtPath(anatomyState.tree, path);
      if (!node) { go("a="); return; }
      renderExplorerCrumbs(path);
      renderExplorerColumns(path);
      drawExplorerMap(path);
      renderExplorerCaption(node, path);
    });
  }

  // ============================================================
  // Task 5: hash routing — the single source of truth for both registers.
  // Every click calls go(hashval); go() only sets location.hash; the one
  // onhashchange handler (registered once in boot) parses it and dispatches.
  // Never call renderPortrait/renderExplorer directly from a click handler.
  // ============================================================

  function go(hashval) {
    location.hash = hashval;
  }

  function parseAndRoute() {
    const raw = location.hash.replace(/^#/, "");
    if (raw.indexOf("c=") === 0) {
      const id = decodeURIComponent(raw.slice(2));
      const center = state.data && state.data.centers.find((c) => c.id === id);
      if (center) renderPortrait(center);
      return;
    }
    if (raw.indexOf("a=") === 0) {
      let rawPath = raw.slice(2);
      // Gotcha 3: a leaf segment like "(general)" is percent-encoded in the
      // hash; decode it (wrapped in try/catch) so parens round-trip.
      try { rawPath = decodeURIComponent(rawPath); } catch (e) { /* leave as-is */ }
      const path = rawPath ? rawPath.split("/").filter(Boolean) : [];
      renderExplorer(path);
      return;
    }
    // Default: District root explorer.
    renderExplorer([]);
  }

  function boot() {
    fetch("centers.json")
      .then((r) => r.json())
      .then((data) => {
        state.data = data;
        state.showSpecials = false;
        state.bounds = data.bounds;
        state.project = makeProjector(data.bounds);
        const peaks = data.centers.map((c) => c.peak);
        state.densityScale = colorScale(Math.min.apply(null, peaks), Math.max.apply(null, peaks));
        wireToolbar();
        render();
        renderList();
        renderWeightTable();
        // Single onhashchange registration + initial hash read (default:
        // District root explorer) — done once boot data is ready so the
        // portrait/explorer can resolve centers/edges immediately.
        window.onhashchange = parseAndRoute;
        parseAndRoute();
      });
  }

  // Value ramp for density tint — a simple two-stop interpolation from a
  // light warm tone to a saturated accent, carrying magnitude in lightness.
  function colorScale(min, max) {
    const lo = [250, 231, 208];  // light sand
    const hi = [176, 44, 20];    // deep accent
    return function (v) {
      const t = max > min ? (v - min) / (max - min) : 0;
      const clamped = Math.max(0, Math.min(1, t));
      const rgb = lo.map((c0, i) => Math.round(c0 + (hi[i] - c0) * clamped));
      return "rgb(" + rgb.join(",") + ")";
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

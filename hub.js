// hub.js — one hub's profile: local map + lives bar + split bar + categories.
(function () {
  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

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
  const FG = window.FOOD_GROUPS, FREG = window.FOOD_REGION_ORDER;
  function isSpecialty(group, countInHub) {
    const g = FG[group];
    return g && !g.is_style && group !== "unclassified" &&
           group !== "vn_other" && countInHub <= 2;
  }
  // food-group / non-food-layer filter state
  let activeGroups = null;        // null = all food groups shown; else Set of shown groups
  let activeLayers = new Set();   // non-food fields toggled ON (hidden by default)
  function passesFilter(p) {
    if (p.food) return !activeGroups || activeGroups.has(p.food.group);
    return activeLayers.has(p.field);   // non-food only if its layer is on
  }
  let showGen = false;      // generator-ring underlay toggle on the local map

  // --- debug tooltip helpers (module scope) ---
  let _tip = null;
  function ensureTip() {
    if (!_tip) { _tip = document.createElement("div"); _tip.id = "dot-tip";
      document.body.appendChild(_tip); }
    return _tip;
  }
  function chip(text, color) {
    return `<span class="tag-chip" style="background:${color}">${text}</span>`;
  }
  function tooltipHTML(p) {
    if (!p.food) {
      return `<div class="tip-name">${p.name || "(unnamed)"}</div>` +
             `<div class="tip-sub">non-food · ${p.field || "—"}</div>`;
    }
    const f = p.food;
    const g = FG[f.group] || FG.unclassified;
    let html = `<div class="tip-name">${p.name || "(unnamed)"}</div>` +
      `<div class="tip-sub">${p.chain ? "chain" : "independent"}</div>` +
      `<div class="tip-final">→ ${chip(g.label, g.color)} ` +
      `<span class="tip-rule">(${f.rule})</span></div>`;
    if (f.primary)
      html += `<div class="tip-tags"><span class="tip-lbl">primary</span>` +
              `${chip(f.primary, g.color)}</div>`;
    if (f.hierarchy && f.hierarchy.length)
      html += `<div class="tip-tags"><span class="tip-lbl">hierarchy</span>` +
        f.hierarchy.map(t => chip(t, (FG[t] && FG[t].color) || "#6b6b6b")).join("") +
        `</div>`;
    if (f.alternates && f.alternates.length)
      html += `<div class="tip-tags"><span class="tip-lbl">alternates</span>` +
        f.alternates.map(t => chip(t, "#777")).join("") + `</div>`;
    return html;
  }

  const want = Math.max(1, parseInt(
    new URLSearchParams(location.search).get("h") || "1", 10) || 1);

  const TYPE_LABEL = {heritage:"Heritage corner", food:"Food street",
    riverside:"Riverside", bridge:"Bridge & gateway", knot:"Everyday knot"};
  const TOD_COLOR = {0:"#d9d2c6", 1:"#c08a4a", 2:"#a23b1e"};

  function renderFieldGuide(h) {
    document.getElementById("fg-glyph").innerHTML =
      (window.glyphSVG ? window.glyphSVG(h.glyph, {size:48}) : "");
    const badge = document.getElementById("fg-type-badge");
    badge.textContent = TYPE_LABEL[h.type] || h.type;
    badge.setAttribute("data-type", h.type);
    document.getElementById("fg-portrait").textContent = h.portrait || "";
    document.getElementById("fg-expect").textContent = h.what_to_expect || "";

    const tod = h.time_of_day || {morning:1, noon:1, evening:1};
    const TOD_HEIGHT = {0:"30%", 1:"65%", 2:"100%"};
    const TOD_WORD = {0:"quiet", 1:"moderate", 2:"busy"};
    document.getElementById("fg-timeofday").innerHTML =
      `<span class="tod-cap">When it's alive · <span class="tod-swatch" style="background:${TOD_COLOR[0]}"></span>quiet → <span class="tod-swatch" style="background:${TOD_COLOR[1]}"></span>moderate → <span class="tod-swatch" style="background:${TOD_COLOR[2]}"></span>busy</span>` +
      ["morning","noon","evening"].map(k => {
        const v = tod[k] !== undefined ? tod[k] : 1;
        return `<span class="tod" style="background:${TOD_COLOR[v]};height:${TOD_HEIGHT[v]}" title="${k}: ${TOD_WORD[v]}">${k}</span>`;
      }).join("");

    const picks = h.picks || [];
    document.getElementById("fg-picks").innerHTML = picks.length
      ? picks.map(p =>
          `<div class="fg-pick" data-pick="${esc(p.name)}"><span class="intent">${esc(p.intent)}</span>` +
          `<span class="name">${esc(p.name)}</span><span class="why">${esc(p.why)}</span></div>`
        ).join("")
      : `<span class="muted">No standout picks on file for this corner.</span>`;

    document.getElementById("fg-footnote").textContent = h.footnote || "";
  }

  function renderHero(h) {
    const fig = document.getElementById("hub-hero");
    if (!fig) return;
    if (h.hero_image && h.hero_image.src) {
      const img = h.hero_image;
      const cr = h.hero_credit || {};
      const licLink = cr.license_url
        ? `<a href="${esc(cr.license_url)}" target="_blank" rel="noopener">${esc(cr.license) || "license"}</a>`
        : esc(cr.license || "");
      const srcLink = cr.source_url
        ? `<a href="${esc(cr.source_url)}" target="_blank" rel="noopener">${esc(cr.source) || "source"}</a>`
        : esc(cr.source || "");
      fig.innerHTML =
        `<img src="${esc(img.src)}"` +
        (img.srcset ? ` srcset="${esc(img.srcset)}" sizes="(max-width:600px) 100vw, 720px"` : "") +
        ` alt="${esc(img.alt || "")}" loading="lazy">` +
        `<figcaption class="hub-credit">Photo: ${esc(cr.author || "")}` +
        (licLink ? ` · ${licLink}` : "") +
        (srcLink ? ` · ${srcLink}` : "") +
        `</figcaption>`;
      fig.hidden = false;
    } else if (h.research && h.research.photo_verdict === "data-art") {
      fig.hidden = true;
      fig.innerHTML = "";
    } else {
      fig.innerHTML = window.HUB_VIGNETTE ? window.HUB_VIGNETTE(h.id, h.type) : "";
      fig.hidden = !fig.innerHTML;
    }
  }

  // food_breakdown group -> readable label (subset; mirrors hub_field_guide)
  const FOOD_LBL = {ca_phe:"coffee", pho:"pho", bun:"bún", com:"cơm",
    banh_mi:"bánh mì", bbq:"BBQ", korean:"Korean", japanese:"Japanese",
    thai:"Thai", chinese:"Chinese", italian:"Italian", pizza:"pizza",
    seafood:"seafood", bakery:"bakeries", hu_tieu:"hủ tiếu",
    vegetarian:"vegetarian", fast_food:"fast food", chao:"cháo",
    vn_other:"Vietnamese", western_other:"Western", indian:"Indian"};

  function renderUnique(h) {
    const box = document.getElementById("fg-unique");
    if (!box || !h.whats_unique) { if (box) box.innerHTML = ""; return; }
    const s = (h.research && h.research.stats) || {};
    // one honest stat chip when the data supports it (never invented)
    const chips = [];
    if (s.cafes) chips.push(`${s.cafes} cafés`);
    if (s.offices) chips.push(`${s.offices} offices`);
    if (s.schools) chips.push(`${s.schools} schools`);
    const stat = chips.length
      ? `<p class="fg-unique-stat">${chips.map(esc).join(" · ")}</p>` : "";
    box.innerHTML =
      `<h3>What's unique here</h3>` +
      `<p class="fg-unique-line">${esc(h.whats_unique)}</p>` + stat;
  }

  function renderAround(h) {
    const box = document.getElementById("fg-around");
    if (!box) return;
    const anchors = (h.named_anchors || []).slice(0, 3);
    const anchorLis = anchors.map(a =>
      `<li class="anchor"><b>${esc(a.name)}</b>` +
      `<span class="what">${esc(a.what)}</span>` +
      `<span class="why">${esc(a.why)}</span></li>`).join("");
    // top named categories present in the hub (real place names, baked)
    const cats = (h.top_cats || []).slice(0, 6)
      .map(c => `<li class="cat">${esc(c.cat)} <b>×${c.n}</b></li>`).join("");
    // a food-count line (counts only, no invented names)
    const fb = Object.entries(h.food_breakdown || {})
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 3)
      .map(([g, n]) => `${n} ${esc(FOOD_LBL[g] || g)}`);
    const foodLine = fb.length
      ? `<p class="fg-around-food">Mostly ${fb.join(", ")}.</p>` : "";
    if (!anchorLis && !cats && !foodLine) { box.innerHTML = ""; return; }
    box.innerHTML = `<h3>What's around</h3>` +
      (anchorLis ? `<ul class="fg-anchors">${anchorLis}</ul>` : "") +
      (cats ? `<ul class="fg-around-cats">${cats}</ul>` : "") +
      foodLine;
  }

  const SHAPE_LBL = {loop: "a loop", oneway: "one way", out_back: "out and back"};

  function renderWalk(h) {
    const box = document.getElementById("fg-walk");
    if (!box) return;
    const wf = h.walking_flow;
    if (!wf || !Array.isArray(wf.stops) || !wf.stops.length) {
      box.innerHTML = ""; return;
    }
    const shape = SHAPE_LBL[wf.shape] || "";
    const head = `<h3>A walking flow${shape ? ` <span class="walk-shape">· ${esc(shape)}</span>` : ""}</h3>`;
    const premise = wf.premise ? `<p class="walk-premise">${esc(wf.premise)}</p>` : "";
    const steps = wf.stops.map((s, i) => {
      const mins = (s.minutes != null)
        ? `<span class="walk-min">${s.minutes === 0 ? "start" : "+" + s.minutes + " min"}</span>` : "";
      return `<li class="walk-step" data-walk="${i}"><span class="walk-n">${i + 1}</span>` +
        `<div class="walk-body"><span class="walk-stop">${esc(s.stop)}</span>` +
        `<span class="walk-intent">${esc(s.intent)}</span>${mins}</div></li>`;
    }).join("");
    box.innerHTML = head + premise + `<ol class="walk-list">${steps}</ol>`;
  }

  function renderCross(h) {
    const box = document.getElementById("fg-cross");
    if (!box) return;
    if (!h.cross_hub_draw) { box.innerHTML = ""; return; }
    box.innerHTML =
      `<h3>Why come here from elsewhere</h3>` +
      `<p class="fg-cross-line">${esc(h.cross_hub_draw)}</p>`;
  }

  function renderVizLinks(h) {
    const box = document.getElementById("fg-viz-links");
    if (!box) return;
    const hash = "";
    box.innerHTML =
      `<h3>See this corner elsewhere</h3>
       <p class="fg-viz-row">
         <a href="rhythm.html${hash}">Its daily rhythm →</a>
         <a href="history.html${hash}">On the history ribbon →</a>
         <a href="cuisine.html">What it eats →</a>
       </p>`;
  }

  function renderSkin(h) {
    const root = document.getElementById("hub-main");
    if (root && h.type_skin) root.setAttribute("data-skin", h.type_skin);
    const acc = h.accent || {};
    const pq = document.getElementById("fg-pullquote");
    if (pq) {
      if (acc.pull_quote) { pq.textContent = acc.pull_quote; pq.hidden = false; }
      else { pq.textContent = ""; pq.hidden = true; }
    }
  }

  Promise.all([
    d3.json("hubs.json"),
    d3.json("uniques.json").catch(() => ({candidates:[]})),
    d3.json("images/uniques/UNIQUES.json").catch(() => ({images:[]})),
    d3.json("hub_illustrations.json").catch(() => ({hubs:{}}))
  ]).then(([data, uniquesData, uniquesLedger, illustLedger]) => {
    const byRank = new Map(data.hubs.map((h) => [h.rank, h]));
    const h = byRank.get(want) || data.hubs[0];
    document.title = `${h.title} · Bình Thạnh Atlas`;
    document.getElementById("title").textContent = h.title;
    renderFieldGuide(h);
    renderHero(h);
    renderSkin(h);
    renderUnique(h);
    renderAround(h);
    renderWalk(h);
    renderCross(h);
    renderVizLinks(h);
    document.getElementById("sig").textContent =
      `${h.split.chain + h.split.indep} places · diversity ${h.diversity.toFixed(2)} · ${h.signature}`;
    // filter confirmed uniques for this hub
    const hubUniques = (uniquesData.candidates || [])
      .filter(c => c.hub_id === h.id && c.research && c.research.confirmed === true);
    // build ledger map: unique_name → file path
    const ledgerMap = new Map((uniquesLedger.images || []).map(img => [img.unique_name, img.file]));
    // annotate each unique with its svg file path so card rendering can use it
    hubUniques.forEach(u => { u._svgFile = ledgerMap.get(u.name) || null; });
    // illustrated map sidecar — null when no entry for this hub
    const illust = (illustLedger.hubs || {})[h.id] || null;
    drawLocal(h, hubUniques, ledgerMap, illust);
    wireFieldSpotlight(illust);
    renderHubCards(h, hubUniques);
    drawBars(h);
    drawCats(h);
    drawFood(h);
    drawWhy(h);
    drawGenerators(h);
    drawNeighbours(h, byRank, data.relations);
    pager(h, data.hubs.length, byRank);
  }).catch((e) => document.getElementById("hub-main").innerHTML =
    `<pre style="color:#c00">Failed to load hubs.json: ${e}</pre>`);

  // lives palette for quiet dot colouring (maps life → muted colour)
  const LIFE_COLOR = {
    sustenance: "#6faa88", anchors: "#7898b8",
    third_places: "#d4826a", display: "#d4b460", unclassified: "#c0b49e"
  };

  // ---- B3 exploration cards ----

  // Module-scope: the confirmed uniques for the currently displayed hub
  // (set during renderHubCards so spotlight can reference them)
  let _hubUniques = [];

  function renderHubCards(h, uniques) {
    const box = document.getElementById("hub-cards");
    if (!box) return;
    _hubUniques = uniques || [];
    _renderDefaultCards(box, h, _hubUniques);
    // Wire the map→card spotlight event from Task 5
    const cv = document.getElementById("ldots");
    if (cv) {
      cv.addEventListener("hub:select", (ev) => {
        _handleSpotlight(ev.detail, box, h, _hubUniques);
      });
      // clicking on the map backdrop (canvas itself, not a vignette/cluster)
      // clears back to the default all-cards view
      cv.addEventListener("click", (ev) => {
        // only clear if the click landed on the canvas, not a bubbling cluster/vignette
        if (ev.target === cv) _renderDefaultCards(box, h, _hubUniques);
      });
    }
  }

  function _renderDefaultCards(box, h, uniques) {
    if (!uniques.length) {
      box.innerHTML =
        `<p class="hub-cards-empty">` +
        `No single stall here is district-unique in our data — ` +
        `the corner's character is in its mix.` +
        `</p>`;
      return;
    }
    box.innerHTML =
      `<h3 class="hub-cards-title">Only here in the district</h3>` +
      uniques.map(u => _uniqueCardHTML(u, false)).join("");
  }

  function _uniqueCardHTML(u, highlighted) {
    const r = u.research || {};
    const what = esc(r.what || u.category || "");
    const note = esc(r.note || "");
    const name = esc(u.name || "");
    const caveat = "the only one we found in the district";
    // optional vignette image (small, from the ledger)
    const imgHref = u._svgFile
      ? `<img class="hub-card-vig" src="${esc(u._svgFile)}" alt="${name}" loading="lazy">` : "";
    return `<div class="hub-card unique-card${highlighted ? " spotlight" : ""}" data-unique="${name}">` +
      imgHref +
      (name ? `<span class="hub-card-name">${name}</span>` : "") +
      (what  ? `<span class="hub-card-what">${what}</span>` : "") +
      (note  ? `<p class="hub-card-note">${note}</p>` : "") +
      `<span class="hub-card-caveat">${esc(caveat)}</span>` +
      `</div>`;
  }

  function _handleSpotlight(sel, box, h, uniques) {
    if (!sel) { _renderDefaultCards(box, h, uniques); return; }
    // pick/walkstop are handled exclusively by wireFieldSpotlight — don't fight it
    if (sel.type === "pick" || sel.type === "walkstop") return;

    if (sel.type === "unique") {
      // Highlight the matching card; scroll it into view
      const name = sel.name || "";
      if (!uniques.length) { _renderDefaultCards(box, h, uniques); return; }
      // Re-render all cards, spotlighting the matching one
      box.innerHTML =
        `<h3 class="hub-cards-title">Only here in the district</h3>` +
        uniques.map(u => _uniqueCardHTML(u, u.name === name)).join("") +
        `<button class="hub-cards-clear">Show all →</button>`;
      const target = box.querySelector(`.hub-card[data-unique="${CSS.escape(name)}"]`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "nearest" });
      box.querySelector(".hub-cards-clear").onclick =
        () => _renderDefaultCards(box, h, uniques);
      return;
    }

    if (sel.type === "cluster") {
      // List the cluster's contents: named by name (escaped), anonymous by count only
      const places = sel.places || [];
      const named = places.filter(p => p.name);
      const anonCount = places.length - named.length;
      const nameList = named.map(p =>
        `<li class="hub-card-cluster-item">${esc(p.name)}</li>`
      ).join("");
      const anonLine = anonCount > 0
        ? `<li class="hub-card-cluster-anon">+ ${anonCount} unnamed here</li>` : "";
      box.innerHTML =
        `<div class="hub-card cluster-card">` +
        `<span class="hub-card-name">${sel.count} places co-located</span>` +
        `<ul class="hub-card-cluster-list">${nameList}${anonLine}</ul>` +
        `</div>` +
        (uniques.length
          ? `<button class="hub-cards-clear">Back to district-unique →</button>` : "");
      const clearBtn = box.querySelector(".hub-cards-clear");
      if (clearBtn) clearBtn.onclick = () => _renderDefaultCards(box, h, uniques);
      return;
    }

    // Fallback: clear to default
    _renderDefaultCards(box, h, uniques);
  }

  // ---- selection state + event dispatch ----
  let _selected = null;
  function spotlight(selection) {
    _selected = selection;
    const cv = document.getElementById("ldots");
    if (cv) cv.dispatchEvent(new CustomEvent("hub:select", { detail: selection, bubbles: true }));
  }

  function drawLocal(h, hubUniques, ledgerMap, illust) {
    hubUniques = hubUniques || [];
    ledgerMap  = ledgerMap  || new Map();

    const W = 720, H = 460, pad = 16;
    const [x0, y0, x1, y1] = h.bbox;
    const x = d3.scaleLinear([x0, x1], [pad, W - pad]);
    const y = d3.scaleLinear([y0, y1], [H - pad, pad]);

    // streets stay SVG (crisp vectors)
    const svg = d3.select("#lmap").attr("viewBox", `0 0 ${W} ${H}`);
    svg.selectAll("*").remove();

    // show/hide the honesty caption depending on whether we have an illustration
    const cap = document.getElementById("map-caption");
    if (cap) cap.hidden = !illust;

    if (illust) {
      // illustrated map path — base art + hand-placed pins + drawn walking route
      drawIllustrated(h, illust, svg, x, y, W, H);
    } else {
      // ----- existing OSM path: edges, anchor legend, clusters, vignettes -----
      const line = d3.line().x(p => x(p[0])).y(p => y(p[1]));
      svg.append("g").selectAll("path").data(h.edges).join("path")
        .attr("d", line).attr("fill", "none").attr("stroke", STREET)
        .attr("stroke-width", 1.4);

    // named_anchors legend (no lon/lat — placed as a small overlay inside SVG)
    const anchors = (h.named_anchors || []).slice(0, 3);
    if (anchors.length) {
      const ag = svg.append("g").attr("class", "anchor-legend")
        .attr("transform", `translate(${W - pad - 4}, ${pad + 4})`);
      ag.append("rect")
        .attr("x", -148).attr("y", -2)
        .attr("width", 152).attr("height", anchors.length * 22 + 6)
        .attr("fill", "rgba(250,246,239,0.88)").attr("rx", 5);
      anchors.forEach((a, i) => {
        const row = ag.append("g").attr("transform", `translate(0, ${i * 22 + 14})`);
        row.append("circle").attr("cx", -140).attr("cy", -4).attr("r", 4)
          .attr("fill", "none").attr("stroke", "#8a5a2b").attr("stroke-width", 1.5);
        row.append("text")
          .attr("x", -132).attr("y", 0)
          .attr("font-size", "10px").attr("fill", "#4a3020")
          .attr("font-family", "var(--body, sans-serif)")
          .text(a.name.length > 22 ? a.name.slice(0, 21) + "…" : a.name)
          .append("title").text(esc(a.name) + " — " + esc(a.what));
      });
    }

    // ---- cluster detection ----
    // Group places whose projected pixel positions are within CLUSTER_PX of each other
    const CLUSTER_PX = 8;
    const clusters = []; // [{cx, cy, places:[]}]
    h.places.forEach((p) => {
      const px = x(p.lon), py = y(p.lat);
      let found = false;
      for (const cl of clusters) {
        if (Math.abs(cl.cx - px) < CLUSTER_PX && Math.abs(cl.cy - py) < CLUSTER_PX) {
          cl.places.push(p); found = true; break;
        }
      }
      if (!found) clusters.push({ cx: px, cy: py, places: [p] });
    });
    // multi-place clusters (2+)
    const multiClusters = clusters.filter(cl => cl.places.length >= 2);

    // ---- cluster glyphs (SVG, above roads, below vignettes) ----
    const clusterG = svg.append("g").attr("class", "cluster-glyphs");
    multiClusters.forEach(cl => {
      const cg = clusterG.append("g")
        .attr("transform", `translate(${cl.cx}, ${cl.cy})`)
        .style("cursor", "pointer")
        .attr("aria-label", `${cl.places.length} places co-located here`);
      cg.append("circle").attr("r", 9)
        .attr("fill", "rgba(255,253,248,0.82)").attr("stroke", "#9c8a72")
        .attr("stroke-width", 1.2);
      cg.append("text").attr("text-anchor", "middle").attr("dy", "0.35em")
        .attr("font-size", "8px").attr("fill", "#4a4030")
        .attr("font-family", "var(--body, sans-serif)").attr("font-weight", "600")
        .text(cl.places.length);
      cg.append("title").text(`${cl.places.length} here`);
      cg.on("click", () => spotlight({ type: "cluster", count: cl.places.length,
        cx: cl.cx, cy: cl.cy, places: cl.places }));
      cg.on("mouseenter", () => spotlight({ type: "cluster", count: cl.places.length,
        cx: cl.cx, cy: cl.cy, places: cl.places }));
    });

    // ---- unique dish vignettes (SVG <image> at projected lon/lat) ----
    // Honest caveat: "the only one we found in the district" — never an absolute claim
    const VIGNETTE_SIZE = 36;
    const vigG = svg.append("g").attr("class", "unique-vignettes");
    hubUniques.forEach(u => {
      const svgFile = ledgerMap.get(u.name);
      if (!svgFile) return;
      const px = x(u.lon), py = y(u.lat);
      // connector line from anchor point to vignette centre
      const vx = Math.min(W - pad - VIGNETTE_SIZE, Math.max(pad, px));
      const vy = Math.min(H - pad - VIGNETTE_SIZE, Math.max(pad, py - VIGNETTE_SIZE - 6));
      const vg = vigG.append("g").attr("class", "unique-vignette").style("cursor", "pointer");
      // dot at exact location
      vg.append("circle").attr("cx", px).attr("cy", py).attr("r", 4)
        .attr("fill", "#c0453a").attr("stroke", "#fffdf8").attr("stroke-width", 1.5);
      // connector
      vg.append("line")
        .attr("x1", px).attr("y1", py)
        .attr("x2", vx + VIGNETTE_SIZE / 2).attr("y2", vy + VIGNETTE_SIZE)
        .attr("stroke", "#c0453a").attr("stroke-width", 1).attr("stroke-dasharray", "3,2")
        .attr("opacity", 0.6);
      // vignette frame
      vg.append("rect")
        .attr("x", vx).attr("y", vy)
        .attr("width", VIGNETTE_SIZE).attr("height", VIGNETTE_SIZE)
        .attr("fill", "#faf6ef").attr("stroke", "#c0453a").attr("stroke-width", 1.2)
        .attr("rx", 5);
      // SVG illustration via <image> (browser resolves relative to the page URL)
      vg.append("image")
        .attr("href", svgFile)
        .attr("x", vx + 2).attr("y", vy + 2)
        .attr("width", VIGNETTE_SIZE - 4).attr("height", VIGNETTE_SIZE - 4)
        .attr("alt", esc("the only one we found in the district") + " · " + esc(u.name))
        .append("title")
          .text(esc(u.name) + " — the only one we found in the district");
      vg.on("click", () => spotlight({ type: "unique", name: u.name, hub_id: u.hub_id,
        lon: u.lon, lat: u.lat, svgFile, caveat: "the only one we found in the district" }));
      vg.on("mouseenter", () => spotlight({ type: "unique", name: u.name, hub_id: u.hub_id,
        lon: u.lon, lat: u.lat, svgFile, caveat: "the only one we found in the district" }));
    });
    } // end else (OSM path)

    // ----- quiet dot texture on canvas: UNCHANGED, runs in both modes -----
    // dots on canvas (scales to ~1000+ places) — QUIET / low-contrast: life colours, low alpha
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
      // Quiet uniform dots: life-coloured, low alpha — texture, not clutter;
      // vignettes carry the emphasis now
      h.places.forEach((p, i) => {
        if (!passesFilter(p)) return;
        const jx = jit(p.lon * 1000 + i) * 4, jy = jit(p.lat * 1000 + i * 7) * 4;
        const X = x(p.lon) + jx, Y = y(p.lat) + jy;
        const life = p.life || (p.food ? "sustenance" : "unclassified");
        ctx.beginPath(); ctx.arc(X, Y, 2.2, 0, 2 * Math.PI);
        ctx.globalAlpha = 0.38;
        ctx.fillStyle = LIFE_COLOR[life] || LIFE_COLOR.unclassified;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    paint();
    drawChips(h, paint);

    // per-dot debug tooltip — canvas hover hit-test
    cv.onmousemove = (ev) => {
      const r = cv.getBoundingClientRect();
      const mx = (ev.clientX - r.left) * (W / r.width);
      const my = (ev.clientY - r.top) * (H / r.height);
      let best = null, bd = 64;  // 8px squared, in canvas units
      h.places.forEach((p) => {
        if (!passesFilter(p)) return;
        const dx = x(p.lon) - mx, dy = y(p.lat) - my;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = p; }
      });
      const tip = ensureTip();
      if (best) {
        tip.innerHTML = tooltipHTML(best);
        tip.style.display = "block";
        const tw = tip.offsetWidth, th = tip.offsetHeight;
        let lx = ev.clientX + 14, ly = ev.clientY + 14;
        if (lx + tw > window.innerWidth) lx = ev.clientX - tw - 14;
        if (ly + th > window.innerHeight) ly = ev.clientY - th - 14;
        tip.style.left = Math.max(4, lx) + "px";
        tip.style.top = Math.max(4, ly) + "px";
      } else {
        tip.style.display = "none";
      }
    };
    cv.onmouseleave = () => { if (_tip) _tip.style.display = "none"; };

    const gt = document.getElementById("genToggle");
    if (gt) gt.onclick = () => {
      showGen = !showGen;
      gt.classList.toggle("on", showGen);
      gt.textContent = showGen ? "Hide what draws people" : "Show what draws people";
      paint();
    };
  }

  // ---- illustrated map: base art + hand-placed pins + drawn walking route ----
  function drawIllustrated(h, illust, svg, x, y, W, H) {
    // illustration base, scaled to the map frame
    svg.append("image")
      .attr("href", illust.art).attr("x", 0).attr("y", 0)
      .attr("width", W).attr("height", H)
      .attr("preserveAspectRatio", "xMidYMid slice");

    const px = (u) => u * W, py = (u) => u * H;  // normalized 0–1 → pixels

    // --- drawn walking route (curve through stop points), dashed ink ---
    const stops = (illust.walk && illust.walk.stops) || [];
    if (stops.length >= 2) {
      const pts = stops.map(s => [px(s.x), py(s.y)]);
      const routeLine = d3.line().curve(d3.curveCatmullRom.alpha(0.6));
      svg.append("path").attr("class", "walk-route")
        .attr("d", routeLine(pts)).attr("fill", "none")
        .attr("stroke", "#c0532a").attr("stroke-width", 2.4)
        .attr("stroke-dasharray", "7,5").attr("stroke-linecap", "round")
        .attr("opacity", 0.85);
      // numbered stop markers ①②③ — clickable, shine the walking-flow step
      const sg = svg.append("g").attr("class", "walk-stops");
      stops.forEach((s, k) => {
        const g = sg.append("g").attr("transform", `translate(${px(s.x)},${py(s.y)})`)
          .attr("data-stop", s.i)
          .style("cursor", "pointer").attr("aria-label", `Walk stop ${k + 1}`);
        g.append("circle").attr("r", 11).attr("fill", "#fffdf8")
          .attr("stroke", "#c0532a").attr("stroke-width", 2);
        g.append("text").attr("text-anchor", "middle").attr("dy", "0.35em")
          .attr("font-size", "11px").attr("font-weight", "700")
          .attr("fill", "#c0532a").text(k + 1);
        g.on("click mouseenter", () => spotlight({ type: "walkstop", i: s.i, k }));
      });
    }

    // --- pick pins (hand-placed), numbered, clickable → shine the pick card ---
    const PIN = {coffee:"#a9683b", eat:"#c0453a"};
    const pg = svg.append("g").attr("class", "pick-pins");
    (illust.picks || []).forEach(p => {
      const g = pg.append("g").attr("transform", `translate(${px(p.x)},${py(p.y)})`)
        .attr("data-pin", p.name)
        .style("cursor", "pointer").attr("aria-label", p.name);
      g.append("circle").attr("r", 13).attr("fill", PIN[p.intent] || "#7a3f1d")
        .attr("stroke", "#fffdf8").attr("stroke-width", 2);
      g.append("text").attr("text-anchor", "middle").attr("dy", "0.35em")
        .attr("font-size", "12px").attr("font-weight", "700").attr("fill", "#fff")
        .text(p.n != null ? p.n : "•");
      g.append("title").text(p.name);
      g.on("click mouseenter", () => spotlight({ type: "pick", name: p.name }));
    });

    // Reverse hover: card/step → pin lit up
    // (wired after DOM settles — called from wireFieldSpotlight)
  }

  // ---- field-guide spotlight wiring for pick/walkstop ----
  function wireFieldSpotlight(illust) {
    const cv = document.getElementById("ldots");
    if (!cv) return;
    cv.addEventListener("hub:select", (ev) => {
      const sel = ev.detail || {};
      document.querySelectorAll(".fg-pick.spotlight,.walk-step.spotlight")
        .forEach(el => el.classList.remove("spotlight"));
      if (sel.type === "pick") {
        const el = document.querySelector(`.fg-pick[data-pick="${CSS.escape(sel.name)}"]`);
        if (el) { el.classList.add("spotlight"); el.scrollIntoView({behavior:"smooth",block:"nearest"}); }
      } else if (sel.type === "walkstop") {
        const el = document.querySelector(`.walk-step[data-walk="${sel.i}"]`);
        if (el) el.classList.add("spotlight");
      }
    });

    // Reverse hover: DOM card/step → SVG pin/stop lit
    if (!illust) return;
    document.querySelectorAll(".fg-pick[data-pick]").forEach(card => {
      card.addEventListener("mouseenter", () => {
        const g = document.querySelector(`.pick-pins g[data-pin="${CSS.escape(card.dataset.pick)}"]`);
        if (g) g.classList.add("pin-lit");
      });
      card.addEventListener("mouseleave", () => {
        document.querySelectorAll(".pick-pins g.pin-lit").forEach(g => g.classList.remove("pin-lit"));
      });
    });
    document.querySelectorAll(".walk-step[data-walk]").forEach(step => {
      step.addEventListener("mouseenter", () => {
        const i = step.dataset.walk;
        const g = document.querySelector(`.walk-stops g[data-stop="${i}"]`);
        if (g) g.classList.add("pin-lit");
      });
      step.addEventListener("mouseleave", () => {
        document.querySelectorAll(".walk-stops g.pin-lit").forEach(g => g.classList.remove("pin-lit"));
      });
    });
  }

  function drawChips(h, repaint) {
    // food groups present, sorted by region order
    const present = [...new Set(h.places.filter(p => p.food).map(p => p.food.group))]
      .sort((a, b) => FREG.indexOf((FG[a] || {}).region) -
                      FREG.indexOf((FG[b] || {}).region));
    // non-food fields present (layers), hidden by default
    const layers = [...new Set(h.places.filter(p => !p.food).map(p => p.field))]
      .filter(Boolean).sort();
    const box = document.getElementById("fieldchips");

    const foodRow = `<div class="chip-row food">` + present.map(g => {
      const fg = FG[g] || FG.unclassified;
      const extra = g === "unclassified" ? " ◌" : "";
      return `<button class="fchip" data-g="${g}">` +
        `<i style="background:${fg.color}"></i>${fg.label}${extra}</button>`;
    }).join("") + `</div>`;

    const layerRow = `<div class="chip-row layers"><span class="chip-lbl">+ add</span>` +
      layers.map(f =>
        `<button class="lchip" data-f="${f}">${FIELD_LABEL[f] || f}</button>`
      ).join("") + `</div>`;

    const key = `<p class="specialty-key"><b>✦</b> rare here — a specialty worth the trip</p>`;
    box.innerHTML = foodRow + layerRow + key;

    const fchips = [...box.querySelectorAll(".fchip")];
    function syncGroups() {
      activeGroups = new Set(fchips.filter(b => !b.classList.contains("off"))
        .map(b => b.dataset.g));
      if (activeGroups.size === present.length) activeGroups = null;
    }
    fchips.forEach(btn => {
      btn.onclick = () => {
        if (!activeGroups) activeGroups = new Set(present);
        btn.classList.toggle("off");
        syncGroups();
        repaint();
      };
      btn.ondblclick = () => {
        const g = btn.dataset.g;
        activeGroups = new Set([g]);
        fchips.forEach(b => b.classList.toggle("off", b.dataset.g !== g));
        repaint();
      };
    });

    box.querySelectorAll(".lchip").forEach(btn => btn.onclick = () => {
      const f = btn.dataset.f;
      const on = btn.classList.toggle("on");
      if (on) activeLayers.add(f); else activeLayers.delete(f);
      repaint();
    });
  }

  function drawFood(h) {
    const entries = Object.entries(h.food_breakdown || {})
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    const box = document.getElementById("foodbreak");
    if (!entries.length) {
      box.innerHTML = "<span class='muted'>No food places here.</span>";
      document.getElementById("foodline").textContent = "";
      return;
    }
    box.innerHTML = entries.map(([g, n]) => {
      const G = FG[g] || FG.unclassified;
      const spec = isSpecialty(g, n);   // same rule the map ✦ ring uses
      return `<span class="food-stat"><i style="background:${G.color}"></i>` +
        `${G.label} <b>${n}</b>${spec ? " ✦" : ""}</span>`;
    }).join("");
    const total = entries.reduce((s, e) => s + e[1], 0);
    const lab = (g) => ((FG[g] || FG.unclassified).label).toLowerCase();
    let line = "";
    if (total > 0) {
      const top1 = lab(entries[0][0]);
      const top2 = entries[1] ? lab(entries[1][0]) : null;
      line = top2
        ? `${total} places to eat or drink — mostly ${top1} and ${top2}.`
        : `${total} places to eat or drink — mostly ${top1}.`;
    }
    document.getElementById("foodline").textContent = line;
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

  function pager(h, total, byRank) {
    const prev = document.getElementById("prev"), next = document.getElementById("next");
    if (h.rank > 1) {
      const p = byRank.get(h.rank - 1);
      prev.href = `hub.html?h=${h.rank-1}`;
      prev.textContent = "← " + (p ? p.title : "Hub " + (h.rank-1));
    }
    if (h.rank < total) {
      const n = byRank.get(h.rank + 1);
      next.href = `hub.html?h=${h.rank+1}`;
      next.textContent = (n ? n.title : "Hub " + (h.rank+1)) + " →";
    }
  }

  // ---- Read↔Explore choreography ----
  // Toggle and IntersectionObserver cooperate as follows:
  //   • The toggle is a real <button> that always works, JS or no-IO.
  //   • When the user clicks the toggle, a "manual" flag is set.
  //     While the flag is set the IO will not override the class.
  //     Clicking the toggle again clears the manual flag (and the IO resumes).
  //   • The IO adds .explore when the map cell scrolls to viewport centre,
  //     and removes it when the map cell leaves — but only if no manual flag.
  //   • No-JS: the base grid shows everything; the toggle is inert without JS
  //     but the <button> is still visible (no content is hidden by default).
  (function wireExplore() {
    const grid = document.querySelector(".hub-grid");
    const btn  = document.getElementById("exploreToggle");
    const mapCell = document.querySelector(".hub-grid-b2");
    if (!grid || !btn) return;

    // State: manual means the user explicitly clicked; IO won't override.
    let manualExplore = false;

    function setExplore(on) {
      grid.classList.toggle("explore", on);
      btn.setAttribute("aria-pressed", String(on));
    }

    btn.addEventListener("click", () => {
      const next = !grid.classList.contains("explore");
      manualExplore = next;   // true when manually ON; false when manually OFF
      setExplore(next);
    });

    // IntersectionObserver — feature-detected; degrades gracefully when absent.
    if ('IntersectionObserver' in window && mapCell) {
      // rootMargin: trigger when the map cell is ~30% into the viewport
      // (negative top margin pulls the trigger point down from the top edge).
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (manualExplore) return;   // honour explicit toggle
          setExplore(entry.isIntersecting);
        });
      }, { rootMargin: "-30% 0px -30% 0px", threshold: 0 });
      io.observe(mapCell);
    }
  })();
})();

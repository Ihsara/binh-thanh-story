// redraw.js — Act 2: 20 old ward numbers into 5 named wards.
(function () {
  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

  const CACHE = "?v=20260714w";
  const W = 1080;
  const H = 620;
  const M = { top: 26, right: 198, bottom: 30, left: 155 };
  const X0 = M.left;
  const X1 = W - M.right;
  const NODE_W = 16;
  const GAP = 9;
  const CUT = "Phường 6";
  const NEW_ORDER = [
    "Phường Gia Định",
    "Phường Bình Lợi Trung",
    "Phường Bình Thạnh",
    "Phường Thạnh Mỹ Tây",
    "Phường Bình Quới",
  ];
  const NAME_NOTES = {
    "Phường Gia Định": "The Nguyễn citadel and province; Lê Văn Duyệt's seat, with Lăng Ông in the district.",
    "Phường Bình Quới": "The forgotten Thiên Lý segment: \"di tích giao thông số 1 của Sài Gòn, từ năm 1748\"; treated here as scholarly reconstruction.",
    // These two were filler ("one of the restored named wards") — they restated the
    // beat's claim without substantiating it, on the very cards meant to prove it.
    // What we can say, and no more: they are village/canton names of the same
    // pre-1975 lineage, of the kind carried on Trần Văn Học's 1815 map.
    "Phường Thạnh Mỹ Tây": "A village-and-canton name of the old Gia Định lineage — the layer of naming that Trần Văn Học's 1815 map records, returned as a ward.",
    "Phường Bình Lợi Trung": "Another name from that same pre-1975 stratum: not coined for the reform, but recovered by it.",
    "Phường Bình Thạnh": "The district name survives, but at ward scale."
  };

  function fmt(n, digits) {
    if (n == null || Number.isNaN(Number(n))) return "";
    const opts = digits == null
      ? { maximumFractionDigits: 0 }
      : { maximumFractionDigits: digits, minimumFractionDigits: digits };
    return Number(n).toLocaleString("en", opts);
  }

  function pct(n) {
    return (100 * Number(n)).toLocaleString("en", { maximumFractionDigits: 1 });
  }

  function oldNumber(name) {
    const m = String(name).match(/\d+/);
    return m ? Number(m[0]) : 0;
  }

  function realLinks(data) {
    return (data.links || []).filter((link) => link.is_noise === false);
  }

  function groupedOldOrder(data, links) {
    const byOld = d3.group(links, (d) => d.old);
    const primary = new Map();
    for (const [old, ls] of byOld) {
      const sorted = ls.slice().sort((a, b) => d3.descending(a.area_m2, b.area_m2));
      primary.set(old, sorted[0].new);
    }
    const rank = new Map(NEW_ORDER.map((name, i) => [name, i]));
    return (data.old_wards || []).map((d) => d.name).sort((a, b) => {
      if (a === CUT && primary.get(b) === "Phường Gia Định") return 1;
      if (b === CUT && primary.get(a) === "Phường Gia Định") return -1;
      return d3.ascending(rank.get(primary.get(a)) ?? 99, rank.get(primary.get(b)) ?? 99) ||
        d3.ascending(oldNumber(a), oldNumber(b));
    });
  }

  function stack(items, value, top, bottom) {
    const total = d3.sum(items, value);
    const available = Math.max(1, bottom - top - GAP * Math.max(0, items.length - 1));
    const k = available / total;
    let y = top;
    return new Map(items.map((item) => {
      const h = Math.max(2, value(item) * k);
      const out = { y0: y, y1: y + h, cy: y + h / 2, h };
      y += h + GAP;
      return [item.name || item, out];
    }));
  }

  function layout(data) {
    const links = realLinks(data);
    const oldByName = new Map((data.old_wards || []).map((d) => [d.name, d]));
    const newByName = new Map((data.new_wards || []).map((d) => [d.name, d]));
    const oldNames = groupedOldOrder(data, links);
    const oldItems = oldNames.map((name) => ({ name, area_m2: oldByName.get(name).area_m2 }));
    const newItems = NEW_ORDER.map((name) => newByName.get(name)).filter(Boolean);
    const oldBands = stack(oldItems, (d) => d.area_m2, M.top + 18, H - M.bottom);
    const newBands = stack(newItems, (d) => d.area_m2, M.top + 18, H - M.bottom);
    // Derive the gap count from the data, not a hardcoded 19: stack() computes the
    // same quantity as GAP * (items.length - 1), and if the two ever disagreed the
    // ribbons and the nodes would scale off different denominators and drift apart.
    const areaScale = (H - M.top - M.bottom - GAP * Math.max(0, oldItems.length - 1))
      / d3.sum(oldItems, (d) => d.area_m2);

    const oldOffsets = new Map(oldItems.map((d) => [d.name, oldBands.get(d.name).y0]));
    const destOffsets = new Map(newItems.map((d) => [d.name, newBands.get(d.name).y0]));
    const byOld = d3.group(links, (d) => d.old);
    const oldRank = new Map(oldNames.map((name, i) => [name, i]));
    const linkRows = [];

    for (const oldName of oldNames) {
      const ls = (byOld.get(oldName) || []).slice().sort((a, b) =>
        d3.ascending(NEW_ORDER.indexOf(a.new), NEW_ORDER.indexOf(b.new)));
      for (const link of ls) {
        const width = Math.max(2, link.area_m2 * areaScale);
        const oldY = oldOffsets.get(link.old) + width / 2;
        oldOffsets.set(link.old, oldOffsets.get(link.old) + width);
        linkRows.push({ ...link, width, sy: oldY, oldRank: oldRank.get(link.old) ?? 99 });
      }
    }

    linkRows.sort((a, b) =>
      d3.ascending(NEW_ORDER.indexOf(a.new), NEW_ORDER.indexOf(b.new)) ||
      d3.ascending(a.oldRank, b.oldRank));
    for (const link of linkRows) {
      const y = destOffsets.get(link.new) + link.width / 2;
      destOffsets.set(link.new, destOffsets.get(link.new) + link.width);
      link.ty = y;
    }
    return { links: linkRows, oldItems, newItems, oldBands, newBands };
  }

  function drawAlluvial(slot, data, mode) {
    const card = document.createElement("div");
    card.className = "alluvial-card";
    slot.append(card);

    const l = layout(data);
    const svg = d3.select(card).append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("role", "img")
      .attr("aria-label", "Alluvial from twenty old wards to five new wards; only Phường 6 forks.");
    const linkPath = d3.linkHorizontal()
      .source((d) => [X0 + NODE_W, d.sy])
      .target((d) => [X1, d.ty]);

    svg.append("text").attr("class", "node-label muted left")
      .attr("x", X0 - 12).attr("y", 24).text("20 old ward numbers");
    svg.append("text").attr("class", "node-label muted right")
      .attr("x", X1 + NODE_W + 12).attr("y", 24).text("5 new ward names");

    svg.append("g").selectAll("path")
      .data(l.links)
      .join("path")
      .attr("class", (d) => {
        const focus = mode === "fork" || mode === "names";
        if (d.old === CUT) return "ribbon fork";
        return focus ? "ribbon ghost" : "ribbon clean";
      })
      .attr("d", linkPath)
      .attr("stroke-width", (d) => d.width);

    const oldNodes = svg.append("g").selectAll("g")
      .data(l.oldItems)
      .join("g");
    oldNodes.append("rect")
      .attr("class", (d) => d.name === CUT ? "ward-node cut" : "ward-node")
      .attr("x", X0)
      .attr("y", (d) => l.oldBands.get(d.name).y0)
      .attr("width", NODE_W)
      .attr("height", (d) => l.oldBands.get(d.name).h);
    oldNodes.append("text")
      .attr("class", (d) => d.name === CUT ? "node-label strong left" : "node-label left")
      .attr("x", X0 - 10)
      .attr("y", (d) => l.oldBands.get(d.name).cy + 4)
      .text((d) => d.name);

    const newNodes = svg.append("g").selectAll("g")
      .data(l.newItems)
      .join("g");
    newNodes.append("rect")
      .attr("class", "ward-node new")
      .attr("x", X1)
      .attr("y", (d) => l.newBands.get(d.name).y0)
      .attr("width", NODE_W)
      .attr("height", (d) => l.newBands.get(d.name).h);
    newNodes.append("text")
      .attr("class", "node-label right")
      .attr("x", X1 + NODE_W + 10)
      .attr("y", (d) => l.newBands.get(d.name).cy - 2)
      .text((d) => d.name);
    newNodes.append("text")
      .attr("class", "node-metric")
      .attr("x", X1 + NODE_W + 10)
      .attr("y", (d) => l.newBands.get(d.name).cy + 13)
      .text((d) => `${fmt(d.area_km2, 2)} km²`);

    const forkLinks = l.links.filter((d) => d.old === CUT);
    if (forkLinks.length) {
      const mid = d3.mean(forkLinks, (d) => d.sy);
      const callout = svg.append("g").attr("class", "fork-callout");
      callout.append("path")
        .attr("d", `M ${X0 + 65} ${mid - 8} C ${X0 + 130} ${mid - 58}, ${X0 + 236} ${mid - 58}, ${X0 + 292} ${mid - 28}`);
      callout.append("text").attr("class", "title")
        .attr("x", X0 + 302).attr("y", mid - 35).text("the only fork");
      callout.append("text").attr("class", "sub")
        .attr("x", X0 + 302).attr("y", mid - 19).text("Phường 6: 54.9 / 45.0");
    }
  }

  function zeroPanel(slot, data) {
    const wrap = document.createElement("div");
    wrap.className = "zero-panel";
    wrap.innerHTML =
      `<div><b>${esc(pct(data.max_leakage_share))}%</b><span>leakage outside the old district</span></div>` +
      `<div><b>${esc(fmt(data.old_ward_count))}</b><span>old wards in the alluvial</span></div>` +
      `<div><b>${esc(fmt(data.new_ward_count))}</b><span>new wards, all nested inside</span></div>`;
    slot.append(wrap);
    drawAlluvial(slot, data, "nesting");
  }

  function forkPanel(slot, data) {
    drawAlluvial(slot, data, "fork");
    const links = realLinks(data).filter((d) => d.old === data.cut_old_ward);
    const p = document.createElement("p");
    p.className = "note";
    p.innerHTML = `${esc(data.cut_old_ward)} is the sole old ward with two drawn destinations: ` +
      links.map((d) => `${esc(d.new)} ${esc(pct(d.share))}%`).join(" and ") + ".";
    slot.append(p);
  }

  function fossilPanel(slot, data) {
    const old = (data.old_wards || []).map((d) => oldNumber(d.name));
    const max = Math.max(...old, ...data.gaps);
    const present = new Set(old);
    const gaps = new Set(data.gaps || []);
    // The five the law never names — a numbered ward that still exists on the
    // ground but has already been merged out of the statute's vocabulary.
    const unnamed = new Set((data.unnamed_by_resolution || []).map(oldNumber));
    const grid = document.createElement("div");
    grid.className = "gap-grid";
    let html = "";
    for (let i = 1; i <= max; i += 1) {
      const cls = gaps.has(i) ? "gap" : (unnamed.has(i) ? "unnamed" : "");
      const label = present.has(i) ? `Phường ${i}` : `${i}`;
      const title = gaps.has(i)
        ? "never existed by 2025 — merged away earlier"
        : (unnamed.has(i) ? "exists on the ground; the resolution never names it" : "");
      html += `<span class="${esc(cls)}"${title ? ` title="${esc(title)}"` : ""}>${esc(label)}</span>`;
    }
    grid.innerHTML = html;
    slot.append(grid);

    const key = document.createElement("p");
    key.className = "note gap-key";
    key.innerHTML =
      `<span class="swatch gap"></span> the eight gaps — numbers that no longer existed at all. ` +
      `<span class="swatch unnamed"></span> the five the resolution never names, though our geometry places every one.`;
    slot.append(key);

    drawAlluvial(slot, data, "fossil");
  }

  function namesPanel(slot, data) {
    drawAlluvial(slot, data, "names");
    const grid = document.createElement("div");
    grid.className = "name-grid";
    grid.innerHTML = (data.new_wards || []).map((ward) =>
      `<article><h3>${esc(ward.name)}</h3><p>${esc(NAME_NOTES[ward.name] || "")}</p></article>`
    ).join("");
    slot.append(grid);
    const links = document.createElement("p");
    links.className = "redraw-links";
    links.innerHTML = `The Thiên Lý route is presented here as scholarly reconstruction, not a surviving physical marker. ` +
      `Follow the existing thread in <a href="road-beneath.html">the road beneath the road</a> and <a href="history.html">the history layer</a>.`;
    slot.append(links);
  }

  function introCard(slot, html) {
    const div = document.createElement("div");
    div.className = "zero-panel";
    div.innerHTML = html;
    slot.append(div);
  }

  function steps(data) {
    const gaps = (data.gaps || []).join(", ");
    return [
      { kind: "intro", kicker: "Beat 1 · The nesting", headline: "The outer boundary <em>survived</em>.",
        narrative: `The 2025 redraw stayed inside Bình Thạnh: ${esc(pct(data.max_leakage_share))}% leakage. The old district outline survives; the interior was redrawn.`,
        render: (slot) => introCard(slot, `<div><b>${esc(pct(data.max_leakage_share))}%</b><span>measured leakage outside the old district</span></div>`) },
      { kind: "data", kicker: "The nesting", headline: "Five new wards, still inside <em>one old district</em>.",
        narrative: "The mark keeps the story geometric: the left side is the old numbered system; the right side is the five named wards.",
        render: (slot) => zeroPanel(slot, data) },
      { kind: "intro", kicker: "Beat 2 · The one cut", headline: "Nineteen wards moved intact. <em>One forked</em>.",
        narrative: `${esc(data.cut_old_ward)} alone splits 54.9 / 45.0 — and the official merge-list never names it. The law says nothing about the one ward that was actually divided; the geometry had to tell us.` },
      { kind: "data", kicker: "The one cut", headline: "The fork is the argument.",
        narrative: "Noise overlaps are filtered out before drawing. What remains is a comb of intact ribbons, plus one highlighted split.",
        render: (slot) => forkPanel(slot, data) },
      { kind: "intro", kicker: "Beat 3 · Fossil numbers", headline: "The numbers were already <em>broken</em>.",
        narrative: `Before 2025, the ward numbers ran 1–28 with eight gaps: ${esc(gaps)}. Wards 4, 8, 9, 10 and the rest had been merged away long before, and nobody renumbered what was left. The sequence was already a fossil.` },
      { kind: "data", kicker: "Fossil numbers", headline: "The law names only <em>fifteen</em> of the twenty.",
        narrative: `And the fossil has a fresher layer. Nghị quyết 1685 lists the wards folded into each new one — but it names just ${esc(String(data.resolution_names_count))} of the 20 that our geometry finds on the ground. ${esc((data.unnamed_by_resolution || []).join(", "))} appear nowhere in it. They are not omissions: an earlier phase had already absorbed them, so by the time the final text was written there was no unit left to name. The eight gaps are old disappearances; these five are the disappearances still in progress.`,
        render: (slot) => fossilPanel(slot, data) },
      { kind: "intro", kicker: "Beat 4 · Names returned", headline: "The reform restored <em>names</em>.",
        narrative: "Gia Định, Bình Quới, Thạnh Mỹ Tây, Bình Lợi Trung: names visible on Trần Văn Học's 1815 map. Bình Thạnh also survives, demoted from district to ward." },
      { kind: "data", kicker: "Names returned", headline: "The Thiên Lý thread stays honest.",
        narrative: "The project's research frames the present-day tracing of the 250-year-old route as scholarly reconstruction, not a surviving physical marker.",
        render: (slot) => namesPanel(slot, data) },
    ];
  }

  function boot() {
    fetch("redraw.json" + CACHE)
      .then((r) => r.json())
      .then((data) => {
        const citation = document.getElementById("redraw-citation");
        if (citation) citation.textContent = "Population citation: " + (data.population_citation || "");
        const res = document.getElementById("redraw-resolution");
        if (res) res.textContent = "Resolution: " + (data.resolution_citation || "");
        const mount = document.getElementById("redraw-stepper");
        if (!mount || !window.Stepper) return;
        Stepper.mount(mount, steps(data));
      })
      .catch((e) => {
        const mount = document.getElementById("redraw-stepper");
        if (mount) mount.innerHTML = `<pre class="load-error">Failed to load redraw.json: ${esc(e)}</pre>`;
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();


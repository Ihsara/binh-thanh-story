// census.js — "A census, not a newsfeed".
// A click-stepper over three comparisons (Apr→May, May→Jun, Apr→Jun span).
// Core viz: paired bars where CHURN (added + removed, id-recycling) towers over
// NET (real change), making "the noise dwarfs the signal" literal. Colour's job
// is DATA: green = net signal, sand = churn noise, ochre = taxonomy artifact.

const COL = { signal: "#2f7d5b", noise: "#c9b79a", artifact: "#b06a3a" };

d3.json("census.json?v=20260703c").then((D) => {
  const steps = [D.steps[0], D.steps[1], D.span];
  const stepLabels = ["April → May", "May → June", "April → June · full span"];
  let i = 0;

  // ---- stepper chrome ----
  const dots = d3.select("#dots");
  steps.forEach((_, k) => {
    dots.append("button")
      .attr("class", "dot" + (k === 0 ? " active" : ""))
      .attr("role", "tab")
      .attr("aria-label", stepLabels[k])
      .on("click", () => go(k));
  });
  d3.select("#prev").on("click", () => go(i - 1));
  d3.select("#next").on("click", () => go(i + 1));

  function go(k) {
    i = Math.max(0, Math.min(steps.length - 1, k));
    d3.selectAll(".dot").classed("active", (_, idx) => idx === i);
    d3.select("#prev").property("disabled", i === 0);
    d3.select("#next").property("disabled", i === steps.length - 1);
    d3.select("#steplabel").text(`${i + 1} / ${steps.length}`);
    render(steps[i], stepLabels[i]);
  }

  // ---- the bars ----
  const svg = d3.select("#bars");
  const W = 640, H = 300, M = { t: 34, r: 20, b: 54, l: 20 };
  const innerW = W - M.l - M.r, baseY = H - M.b;

  function render(s, label) {
    d3.select("#chartHead").text(
      `${s.old_month} → ${s.new_month}: ${fmt(s.old_total)} → ${fmt(s.new_total)} places`);
    d3.select("#chartSub").html(
      `The count barely moved — a net of <b>${signed(s.net)}</b>. But look what churned ` +
      `underneath to produce that near-nothing.`);

    // Bars: added, removed, net, recategorized. Scale all against the biggest
    // gross number so the eye sees churn towering over net.
    const bars = [
      { key: "added",   label: "Added",          val: s.added,   col: COL.noise,    sign: +1 },
      { key: "removed", label: "Removed",        val: s.removed, col: COL.noise,    sign: -1 },
      { key: "net",     label: "NET change",     val: Math.abs(s.net), disp: s.net, col: COL.signal, sign: Math.sign(s.net) || 1, hero: true },
      { key: "recat",   label: "Recategorized",  val: s.recat,   col: COL.artifact, sign: +1,
        caption: s.recat_value_to_value >= s.recat * 0.9 ? "≈ all a rename" : "" },
    ];
    const maxV = d3.max(bars, (b) => b.val) || 1;
    const y = d3.scaleLinear().domain([0, maxV]).range([0, baseY - M.t]);
    const x = d3.scaleBand().domain(bars.map((b) => b.key))
      .range([M.l, M.l + innerW]).padding(0.34);

    svg.selectAll("*").remove();

    // baseline
    svg.append("line").attr("class", "axis-base")
      .attr("x1", M.l).attr("x2", M.l + innerW).attr("y1", baseY).attr("y2", baseY);

    const g = svg.selectAll("g.bar").data(bars).join("g").attr("class", "bar");

    g.append("rect")
      .attr("x", (b) => x(b.key))
      .attr("width", x.bandwidth())
      .attr("y", baseY)
      .attr("height", 0)
      .attr("rx", 3)
      .attr("fill", (b) => b.col)
      .attr("opacity", (b) => b.hero ? 1 : 0.85)
      .transition().duration(650).delay((_, k) => k * 70)
      .attr("y", (b) => baseY - y(b.val))
      .attr("height", (b) => y(b.val));

    // hero outline on the net bar so a +101 sliver is still findable
    g.filter((b) => b.hero).append("rect")
      .attr("x", (b) => x(b.key) - 2).attr("width", x.bandwidth() + 4)
      .attr("y", (b) => baseY - Math.max(y(b.val), 3) - 2)
      .attr("height", (b) => Math.max(y(b.val), 3) + 2)
      .attr("rx", 5).attr("fill", "none")
      .attr("stroke", COL.signal).attr("stroke-width", 1.5).attr("stroke-dasharray", "3 3");

    // value on top
    g.append("text").attr("class", "bar-value")
      .attr("x", (b) => x(b.key) + x.bandwidth() / 2)
      .attr("y", (b) => baseY - y(b.val) - 8)
      .attr("text-anchor", "middle")
      .attr("fill", (b) => b.hero ? COL.signal : "#6b5d49")
      .attr("opacity", 0)
      .text((b) => b.key === "net" ? signed(b.disp) : fmt(b.val))
      .transition().delay((_, k) => 400 + k * 70).duration(300).attr("opacity", 1);

    // label below
    g.append("text").attr("class", "bar-label")
      .attr("x", (b) => x(b.key) + x.bandwidth() / 2)
      .attr("y", baseY + 20).attr("text-anchor", "middle")
      .text((b) => b.label);

    // caption below label (e.g. "≈ all a rename")
    g.filter((b) => b.caption).append("text").attr("class", "bar-caption")
      .attr("x", (b) => x(b.key) + x.bandwidth() / 2)
      .attr("y", baseY + 36).attr("text-anchor", "middle")
      .text((b) => b.caption);

    // ---- takeaway line, per step ----
    const ratio = s.net !== 0 ? Math.round((s.added + s.removed) / Math.abs(s.net)) : null;
    let t;
    if (s.key === undefined && i === 1) { /* fallthrough */ }
    if (i === 0) {
      t = `<b>${fmt(s.added)}</b> IDs appeared and <b>${fmt(s.removed)}</b> vanished to ` +
          `net just <b class="sig">${signed(s.net)}</b> — the source recycling GERS IDs, ` +
          `not ${fmt(s.added)} shops opening. Read the net, not the churn.`;
    } else if (i === 1) {
      t = `Overture added <b>0</b> and removed <b>${fmt(s.removed)}</b>, yet reported ` +
          `<b class="art">${fmt(s.recat)}</b> "recategorized." Of those, ` +
          `<b class="art">${fmt(s.recat_value_to_value)}</b> are the same shop under a ` +
          `renamed category. Nothing real happened here.`;
    } else {
      t = `Over the full quarter: net <b class="sig">${signed(s.net)}</b> on a base of ` +
          `${fmt(s.old_total)}. The <b class="noi">${fmt(s.added + s.removed)}</b> of gross ` +
          `churn is <b>${ratio}×</b> the net — noise swamping signal.`;
    }
    d3.select("#takeaway").html(t);
  }

  // ---- rename callout table (May→June, the artifact laid bare) ----
  const rt = d3.select("#renameTable");
  D.steps[1].rename_examples.forEach((r) => {
    const tr = rt.append("tr");
    tr.append("td").attr("class", "from").text(pretty(r.from));
    tr.append("td").attr("class", "arrow").text("→");
    tr.append("td").attr("class", "to").text(pretty(r.to));
    tr.append("td").attr("class", "cnt").text(fmt(r.n));
    tr.append("td").attr("class", "same").text("same shops");
  });

  // ---- bulk-themes strip ----
  const bs = d3.select("#bulkStrip");
  D.bulk.forEach((b) => {
    const cell = bs.append("div").attr("class", "bulk-cell");
    cell.append("div").attr("class", "lab").text(b.label);
    cell.append("div").attr("class", "big").text(fmt(b.counts[b.counts.length - 1]));
    cell.append("div")
      .attr("class", "delta " + (b.net === 0 ? "flat" : "up"))
      .text(b.net === 0 ? "no change · Apr→Jun" : `${signed(b.net)} · Apr→Jun`);
  });

  // ---- ANATOMY: 651 shapes of a district ----
  const A = D.anatomy;
  d3.select("#anatomyHead").text(
    `${fmt(A.total)} places sort into ${fmt(A.n_categories)} kinds of place`);
  d3.select("#anatomySub").html(
    `Just <b>${A.cover_50_k}</b> categories hold half of everything; it takes ` +
    `<b>${A.cover_80_k}</b> to reach 80%. The rest is a long tail — ` +
    `<b>${fmt(A.n_le3)}</b> categories have three or fewer places, and ` +
    `<b class="art">${fmt(A.n_singletons)}</b> are one-of-a-kind. ` +
    `(${fmt(A.uncategorized)} places carry no category at all.)`);
  d3.select("#ncatInline").text(fmt(A.n_categories));
  d3.select("#nSingleInline").text(fmt(A.n_singletons));

  // 1) distribution bars (horizontal count of categories per size band)
  (function distChart() {
    const svg = d3.select("#distBars");
    const W = 640, H = 220, M = { t: 8, r: 46, b: 8, l: 116 };
    const bands = A.distribution;
    const y = d3.scaleBand().domain(bands.map((d) => d.label))
      .range([M.t, H - M.b]).padding(0.22);
    const x = d3.scaleLinear()
      .domain([0, d3.max(bands, (d) => d.n_categories)]).range([M.l, W - M.r]);
    svg.selectAll("*").remove();
    const g = svg.selectAll("g").data(bands).join("g");
    g.append("text").attr("class", "dist-band")
      .attr("x", M.l - 8).attr("y", (d) => y(d.label) + y.bandwidth() / 2)
      .attr("dy", ".35em").attr("text-anchor", "end")
      .text((d) => d.label + (d.label === "1" ? " place" : " places"));
    g.append("rect")
      .attr("x", M.l).attr("y", (d) => y(d.label)).attr("height", y.bandwidth())
      .attr("rx", 4).attr("fill", "#c9b79a").attr("width", 0)
      .transition().duration(600).delay((_, i) => i * 60)
      .attr("width", (d) => x(d.n_categories) - M.l);
    g.append("text").attr("class", "dist-count")
      .attr("y", (d) => y(d.label) + y.bandwidth() / 2).attr("dy", ".35em")
      .attr("x", (d) => x(d.n_categories) + 8).attr("opacity", 0)
      .text((d) => d.n_categories)
      .transition().delay((_, i) => 300 + i * 60).attr("opacity", 1);
  })();

  // 2) top-10 category horizontal bars
  (function topCats() {
    const top = A.top.slice(0, 10);
    const max = top[0].n;
    const rows = d3.select("#topCats").selectAll(".topcat-row").data(top).join("div")
      .attr("class", "topcat-row");
    rows.append("div").attr("class", "name").text((d) => pretty(d.cat));
    rows.append("div").attr("class", "track")
      .append("div").attr("class", "fill")
      .style("transform", "scaleX(0)")
      .style("width", (d) => (d.n / max * 100) + "%");
    rows.append("div").attr("class", "val").text((d) => fmt(d.n));
    // animate fills in after paint
    requestAnimationFrame(() => setTimeout(() =>
      d3.selectAll("#topCats .fill").style("transform", "scaleX(1)"), 60));
  })();

  // 3) singleton cloud — a rotating sample of the one-of-a-kind tail
  const pool = A.singletons_sample.slice();
  function drawSingletons() {
    // shuffle a copy, take ~26 of the most "interesting" (skip generic ones)
    const shuffled = pool.slice().sort(() => Math.random() - 0.5).slice(0, 26);
    const cloud = d3.select("#singletonCloud");
    cloud.selectAll("*").remove();
    cloud.selectAll(".chip").data(shuffled).join("span")
      .attr("class", "chip").text((d) => pretty(d));
  }
  drawSingletons();
  d3.select("#reshuffle").on("click", drawSingletons);

  go(0);
});

// ---- helpers ----
function fmt(n) { return d3.format(",")(n); }
function signed(n) { return (n > 0 ? "+" : n < 0 ? "−" : "±") + fmt(Math.abs(n)); }
function pretty(cat) {
  return String(cat).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

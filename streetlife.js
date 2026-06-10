const el = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const COLOR = { cafe: "#c0532a", fuel: "#bcae97", restaurant: "#9c8a72" };
function lineRace(cf) {
  return (slot) => {
    const ys = cf.years, W = 560, H = 320, padX = 48, padY = 30;
    const allRanks = cf.series.flatMap((s) => s.rank.filter((r) => r != null));
    const maxRank = Math.max(8, ...allRanks);
    const px = (i) => padX + (i * (W - 2*padX)) / Math.max(1, ys.length - 1);
    const py = (r) => padY + ((r - 1) * (H - 2*padY)) / Math.max(1, maxRank - 1);
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "linerace");
    ys.forEach((y, i) => { const t = document.createElementNS(NS, "text");
      t.setAttribute("x", px(i)); t.setAttribute("y", H - 8); t.setAttribute("text-anchor","middle");
      t.setAttribute("class","axis"); t.textContent = String(y).slice(2); svg.append(t); });
    const paths = [];
    cf.series.forEach((s) => {
      const pts = s.rank.map((r,i)=> r==null?null:[px(i),py(r)]).filter(Boolean);
      if (!pts.length) return;
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", pts.map((q,i)=>`${i?"L":"M"}${q[0]},${q[1]}`).join(" "));
      p.setAttribute("fill","none"); p.setAttribute("stroke", COLOR[s.value]||"#999");
      p.setAttribute("stroke-width", s.value==="cafe"?3:1.8); svg.append(p); paths.push(p);
      const li = s.rank.map((r,i)=>r==null?-1:i).filter((i)=>i>=0).at(-1);
      const lab = document.createElementNS(NS,"text");
      lab.setAttribute("x", px(li)+6); lab.setAttribute("y", py(s.rank[li])+4);
      lab.setAttribute("class", s.value==="cafe"?"lbl accent":"lbl"); lab.textContent = s.value;
      svg.append(lab);
    });
    slot.append(svg);
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const clip = document.createElementNS(NS,"clipPath"); clip.setAttribute("id","lr");
    const rect = document.createElementNS(NS,"rect"); rect.setAttribute("y","0");
    rect.setAttribute("height",String(H)); rect.setAttribute("x","0"); rect.setAttribute("width","0");
    clip.append(rect); svg.append(clip); paths.forEach((p)=>p.setAttribute("clip-path","url(#lr)"));
    let w = 0; const id = setInterval(()=>{ w += W/40; rect.setAttribute("width", String(Math.min(w,W)));
      if (w>=W) clearInterval(id); }, 30);
  };
}
function mapImg(src, alt) {
  return (slot) => {
    const img = document.createElement("img");
    img.src = src; img.alt = alt; img.loading = "lazy";
    img.style.width = "100%"; img.style.maxWidth = "560px";
    slot.append(img);
  };
}
function barRows(rows) {
  // rows: [{label, n, cls, hem}] — reuses the .bar-row pattern from cafe.js.
  return (slot) => {
    const max = Math.max(...rows.map((r) => r.n));
    rows.forEach((r) => {
      const row = document.createElement("div"); row.className = "bar-row";
      const name = r.hem ? `<span class="street-hem">${r.label}</span>` : r.label;
      row.innerHTML = `<span>${name}</span><span><span class="${r.cls || "bar"}" style="width:${100*r.n/max}%"></span></span><span>${r.n}</span>`;
      slot.append(row);
    });
  };
}
fetch("data.json").then((r)=>r.json()).then((data)=>{
  const sl = data.streetlife, cf = data.cafe_fuel;
  const cafe = cf.series.find((s)=>s.value==="cafe");
  const rest = cf.series.find((s)=>s.value==="restaurant");
  const top2 = sl.overture.top_categories.slice(0, 2);
  const pct = Math.max(1, Math.round(100 * cafe.n.at(-1) / sl.overture.cafe_like));
  const surv = sl.osm.survival.find((s)=>s.cohort===2018) || sl.osm.survival[0];
  const survPct = Math.round(100 * surv.still / surv.then);
  const cafeSplit = sl.osm.road_class_split.find((s)=>s.value==="cafe");
  const steps = [
    { kind:"intro", kicker:"Streetlife", headline:"Coffee is this district's #1 business. <em>Literally.</em>",
      narrative:`Of ${sl.overture.total_places.toLocaleString("en")} places the open commercial graph lists in Bình Thạnh, the two most common kinds of business are the ${top2[0].cat.replace(/_/g," ")} (${top2[0].n.toLocaleString("en")}) and the ${top2[1].cat.replace(/_/g," ")} (${top2[1].n.toLocaleString("en")}). Nothing else comes close.` },
    { kind:"data", kicker:"The street", headline:`~${sl.overture.food_drink.toLocaleString("en")} places to <em>eat or drink</em>`,
      narrative:`Every food &amp; drink venue Overture lists, drawn as ink. Where the district eats, the paper darkens. (${sl.overture.confidence_hi.food_drink.toLocaleString("en")} of them at confidence ≥ ${sl.overture.confidence_hi.threshold}.)`,
      render: mapImg("streetlife-reality.png", "All Overture food and drink venues in Bình Thạnh") },
    { kind:"data", kicker:"The decade", headline:"OSM learned to <em>sit and sip</em>.",
      narrative:`Cafés on OpenStreetMap: ${cafe.n[0]} in 2015 → ${cafe.n.at(-1)} in 2025; restaurants ${rest.n[0]} → ${rest.n.at(-1)}. Café passed fuel in the amenity ranking by 2019. <a class='how' href='method.html#cafe-rank'>Is café really #2? →</a>`,
      render: lineRace(cf) },
    { kind:"data", kicker:"The lens", headline:`The map has learned about <em>${pct}%</em> of the street.`,
      narrative:`OSM's ${cafe.n.at(-1)} cafés (terracotta) and ${rest.n.at(-1)} restaurants (umber), on the ${sl.overture.food_drink.toLocaleString("en")}-venue haze. Ten years of mapping; a street that big. <a class='how' href='method.html#streetlife'>Why so few? →</a>`,
      render: mapImg("streetlife-overlay.png", "OSM venues over the Overture haze") },
    { kind:"data", kicker:"The streets of food", headline:"Some food streets are <em>hẻms</em>.",
      narrative:`Venues per nearest named road. Bình Quới hosts only restaurants — the riverside strip. And alley addresses (<span class="street-hem">hẻm</span>) make the list: roughly a third of mapped cafés sit closer to an alley than to any boulevard (${cafeSplit.hem} of ${cafeSplit.total}). <a class='how' href='hem/'>The hẻm story →</a>`,
      render: barRows(sl.osm.streets.map((s)=>({ label:s.road, n:s.n, hem:s.is_hem }))) },
    { kind:"data", kicker:"Chains & one-offs", headline:"The chains are the <em>minority</em>.",
      narrative:`${sl.overture.chains[0].name} has ${sl.overture.chains[0].n} branches here — and still the street belongs to the one-offs: ${sl.overture.oneoffs.slice(0,5).join(", ")}…`,
      render: barRows(sl.overture.chains.map((c)=>({ label:c.name, n:c.n, cls:"bar old" }))) },
    { kind:"intro", kicker:"The end", headline:"The map is still <em>learning</em> the street.",
      narrative:`Of the ${surv.then} cafés mapped in ${surv.cohort}, ${surv.still} (${survPct}%) are still on the map — the rest churned, as streets and mapping both do. <a class='how' href='method.html#churn'>What "survival" means →</a> Three threads, one decade. <a class='how' href='index.html'>Back to the start →</a>` },
  ];
  Stepper.mount(el("streetlife-stepper"), steps);
}).catch((e)=>document.body.insertAdjacentHTML("afterbegin",
  `<pre style="color:#c00;padding:1rem">Failed to load data.json: ${e}</pre>`));

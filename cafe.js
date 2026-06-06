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
    // draw-on animation via clip (reduced-motion: skip, show full)
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const clip = document.createElementNS(NS,"clipPath"); clip.setAttribute("id","lr");
    const rect = document.createElementNS(NS,"rect"); rect.setAttribute("y","0");
    rect.setAttribute("height",String(H)); rect.setAttribute("x","0"); rect.setAttribute("width","0");
    clip.append(rect); svg.append(clip); paths.forEach((p)=>p.setAttribute("clip-path","url(#lr)"));
    let w = 0; const id = setInterval(()=>{ w += W/40; rect.setAttribute("width", String(Math.min(w,W)));
      if (w>=W) clearInterval(id); }, 30);
  };
}
fetch("data.json").then((r)=>r.json()).then((data)=>{
  const cf = data.cafe_fuel;
  const cafe = cf.series.find((s)=>s.value==="cafe"), fuel = cf.series.find((s)=>s.value==="fuel");
  const steps = [
    { kind:"intro", kicker:"Café · 2015", headline:"Fuel was <em>king</em>.",
      narrative:"In 2015 the most-mapped amenity in the district was the petrol station. Cafés were an afterthought." },
    { kind:"data", kicker:"The rank race", headline:"Café climbs past <em>fuel</em>.",
      narrative:`Each line is one amenity's rank among all amenities, year by year. Café rose from rank ${cafe.rank[0]} to ${cafe.rank.at(-1)}, passing fuel by 2019. <a class='how' href='method.html#cafe-rank'>Is café really #1? →</a>`,
      render: lineRace(cf) },
    { kind:"data", kicker:"By the numbers", headline:`Cafés ${cafe.n[0]} → ${cafe.n.at(-1)}`,
      narrative:`Fuel stayed flat near ${fuel.n.at(-1)}. The district learned to sit and sip.`,
      render: (slot)=>{ const max=Math.max(cafe.n.at(-1),fuel.n.at(-1));
        [["café",cafe.n.at(-1),"bar"],["fuel",fuel.n.at(-1),"bar old"]].forEach(([k,n,cls])=>{
          const row=document.createElement("div"); row.className="bar-row";
          row.innerHTML=`<span>${k}</span><span><span class="${cls}" style="width:${100*n/max}%"></span></span><span>${n}</span>`;
          slot.append(row); }); } },
    { kind:"intro", kicker:"The end", headline:"A district that learned to <em>sit and sip</em>.",
      narrative:"Three threads, one decade. <a class='how' href='index.html'>Back to the start →</a>" },
  ];
  Stepper.mount(el("cafe-stepper"), steps);
}).catch((e)=>document.body.insertAdjacentHTML("afterbegin",
  `<pre style="color:#c00;padding:1rem">Failed to load data.json: ${e}</pre>`));

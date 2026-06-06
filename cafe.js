const el = (id) => document.getElementById(id);
fetch("data.json").then((r) => r.json()).then((data) => {
  el("boundary-note").textContent = data.boundary_note || "";
  const cf = data.cafe_fuel;
  const cafe = cf.series.find((s) => s.value === "cafe");
  const fuel = cf.series.find((s) => s.value === "fuel");
  const y0 = cf.years[0], y1 = cf.years.at(-1);
  el("cafe-lede").textContent =
    `In ${y0}, fuel was the district's most-mapped amenity and cafés were an afterthought. ` +
    `By ${y1}, cafés (${cafe.n.at(-1)}) had climbed past fuel (${fuel.n.at(-1)}).`;
  el("cafe-caveat").textContent =
    `Under the precise district clip, café count rose ${cafe.n[0]}→${cafe.n.at(-1)} ` +
    `(rank ${cafe.rank[0]}→${cafe.rank.at(-1)}) while fuel stayed flat at ${fuel.n.at(-1)} ` +
    `(rank ${fuel.rank[0]}→${fuel.rank.at(-1)}). Café genuinely overtook fuel — but it is not ` +
    `the clipped 2025 number one: restaurants are. The "café is #1" figure came from a coarser ` +
    `whole-snapshot probe; the precise clip tells the truer, smaller story.`;
  Timeline.lineRace(el("cafe-race"), data);
}).catch((e) => { document.body.insertAdjacentHTML("afterbegin",
  `<pre style="color:#c00;padding:1rem">Failed to load data.json: ${e}</pre>`); });

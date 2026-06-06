const el = (id) => document.getElementById(id);
function snap(data, year) { return data.snapshots.find((s) => s.year === year); }
function mapStage(src, alt) {
  return (slot) => {
    const f = document.createElement("div"); f.className = "map-frame";
    const img = document.createElement("img"); img.src = src; img.alt = alt; img.loading = "lazy";
    img.onerror = () => { f.textContent = "map unavailable"; };
    f.append(img); slot.append(f);
  };
}
function barsStage(rows, max) {
  return (slot) => {
    rows.forEach((r) => {
      const row = document.createElement("div"); row.className = "bar-row";
      row.innerHTML = `<span>${r.kind}</span><span><span class="bar" style="width:${100*r.ways/max}%"></span></span><span>${r.ways.toLocaleString()}</span>`;
      slot.append(row);
    });
  };
}
fetch("data.json").then((r) => r.json()).then((data) => {
  const g = data.growth;
  const first = g.years[0], last = g.years.at(-1);
  const byType = snap(data, last).roads_by_type.slice(0, 6);
  const max = Math.max(...byType.map((r) => r.ways));
  const steps = [
    { kind: "intro", kicker: "Roads · 2015", headline: "Barely <em>drawn</em>.",
      narrative: "In 2015, OpenStreetMap knew only Bình Thạnh's arteries — the big roads. The alleys where people actually live were blank." },
    { kind: "data", kicker: "The skeleton", headline: `${g.ways[0].toLocaleString()} ways`,
      narrative: `Just the main roads, and it stayed that way for three years — flat near a thousand ways through ${first}–2018.`,
      render: mapStage(`roads-vn${first}.png`, `roads ${first}`) },
    { kind: "intro", kicker: "2018 → 2019", headline: "Then the community came for the <em>alleys</em>.",
      narrative: "A mapping push traced the dense service-alley mesh that defines the district." },
    { kind: "data", kicker: "The mapping leap", headline: "The map <em>tripled</em>.",
      narrative: `Road ways jumped 1,095 → 3,560 in a single year. The new mesh is drawn dark; the old skeleton stays pale.`,
      render: mapStage("roads-cum-vn2019.png", "new roads in 2019") },
    { kind: "data", kicker: "The mesh thickens", headline: `${g.ways.at(-1).toLocaleString()} ways by ${last}`,
      narrative: "Mostly service alleys and residential lanes — the texture of a lived-in neighbourhood.",
      render: barsStage(byType, max) },
    { kind: "intro", kicker: "Next thread", headline: "A place you could finally <em>navigate</em>.",
      narrative: "Structure in place — but who lives there? <a class='how' href='places.html'>Read Places →</a>" },
  ];
  Stepper.mount(el("roads-stepper"), steps);
}).catch((e) => document.body.insertAdjacentHTML("afterbegin",
  `<pre style="color:#c00;padding:1rem">Failed to load data.json: ${e}</pre>`));

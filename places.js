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
function amenityBars(rows, max) {
  return (slot) => rows.forEach((a) => {
    const row = document.createElement("div"); row.className = "bar-row";
    row.innerHTML = `<span>${a.value}</span><span><span class="bar" style="width:${100*a.n/max}%"></span></span><span>${a.n}</span>`;
    slot.append(row);
  });
}
fetch("data.json").then((r) => r.json()).then((data) => {
  const g = data.growth, first = g.years[0], last = g.years.at(-1);
  const mix = snap(data, last).amenities.slice(0, 6);
  const max = Math.max(...mix.map((a) => a.n));
  const steps = [
    { kind: "intro", kicker: "Places · the question", headline: "Roads are <em>structure</em>.",
      narrative: "A map of streets tells you the shape of a place. It does not tell you who lives there, or where they go." },
    { kind: "data", kicker: "Filling in", headline: `${g.amenities[0]} → ${g.amenities.at(-1)} amenities`,
      narrative: `And shops grew ${g.shops[0]} → ${g.shops.at(-1)} over the decade. The latest map of every mapped place:`,
      render: mapStage(`pois-vn${last}.png`, `places ${last}`) },
    { kind: "data", kicker: `The ${last} mix`, headline: "What kind of <em>places</em>?",
      narrative: "Restaurants and cafés lead — the everyday texture of the neighbourhood. <a class='how' href='method.html#shop-dip'>A note on the 2023 dip →</a>",
      render: amenityBars(mix, max) },
    { kind: "intro", kicker: "Next thread", headline: "The everyday <em>texture</em>.",
      narrative: "One kind of place tells a story of its own. <a class='how' href='street-life.html'>Read Street Life →</a>" },
  ];
  Stepper.mount(el("places-stepper"), steps);
}).catch((e) => document.body.insertAdjacentHTML("afterbegin",
  `<pre style="color:#c00;padding:1rem">Failed to load data.json: ${e}</pre>`));

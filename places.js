const el = (id) => document.getElementById(id);
function snapByYear(data, year) { return data.snapshots.find((s) => s.year === year); }
function bignum(value, label) {
  const d = document.createElement("div");
  d.className = "bignum";
  d.innerHTML = `<div class="v">${value}</div><div class="l">${label}</div>`;
  return d;
}
function fold(arr) { return arr.at(-1) && arr[0] ? `${(arr.at(-1) / arr[0]).toFixed(1)}×` : "—"; }

fetch("data.json").then((r) => r.json()).then((data) => {
  el("boundary-note").textContent = data.boundary_note || "";
  const g = data.growth;
  el("places-lede").textContent =
    `From ${g.amenities[0]} amenities and ${g.shops[0]} shops in ${g.years[0]} ` +
    `to ${g.amenities.at(-1)} and ${g.shops.at(-1)} in ${g.years.at(-1)}.`;

  Timeline.mapGrid(el("places-timeline"), data, "pois");

  const bn = el("bignum-pois");
  bn.append(bignum(fold(g.amenities), "more amenities"));
  bn.append(bignum(fold(g.shops), "more shops"));

  // Top-6 amenities in the latest year as a simple bar list.
  const last = snapByYear(data, g.years.at(-1)).amenities.slice(0, 6);
  const max = Math.max(...last.map((a) => a.n));
  const host = el("amen-bars");
  last.forEach((a) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML =
      `<span>${a.value}</span>` +
      `<span><span class="bar" style="width:${(100 * a.n) / max}%"></span> ${a.n}</span>` +
      `<span></span>`;
    host.append(row);
  });
}).catch((e) => { document.body.insertAdjacentHTML("afterbegin",
  `<pre style="color:#c00;padding:1rem">Failed to load data.json: ${e}</pre>`); });

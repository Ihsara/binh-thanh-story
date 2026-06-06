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
  el("roads-lede").textContent =
    `From ${g.ways[0].toLocaleString()} road ways (${g.km[0]} km) in ${g.years[0]} ` +
    `to ${g.ways.at(-1).toLocaleString()} (${g.km.at(-1)} km) in ${g.years.at(-1)}.`;

  Timeline.mapGrid(el("roads-timeline"), data, "roads");

  const bn = el("bignum-roads");
  bn.append(bignum(fold(g.ways), "more road ways"));
  bn.append(bignum(fold(g.km), "more road length"));

  const a = snapByYear(data, g.years[0]).roads_by_type;
  const b = snapByYear(data, g.years.at(-1)).roads_by_type;
  const map15 = Object.fromEntries(a.map((r) => [r.kind, r.ways]));
  const top = b.slice(0, 6);
  const max = Math.max(...top.map((r) => r.ways));
  const host = el("roads-bars");
  top.forEach((r) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    const w25 = (100 * r.ways) / max, w15 = (100 * (map15[r.kind] || 0)) / max;
    row.innerHTML =
      `<span>${r.kind}</span>` +
      `<span><span class="bar y2015" style="width:${w15}%"></span> ${map15[r.kind] || 0}</span>` +
      `<span><span class="bar" style="width:${w25}%"></span> ${r.ways}</span>`;
    host.append(row);
  });
}).catch((e) => { document.body.insertAdjacentHTML("afterbegin",
  `<pre style="color:#c00;padding:1rem">Failed to load data.json: ${e}</pre>`); });

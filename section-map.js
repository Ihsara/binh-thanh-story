// The Map section page: subtitle, hero numbers, growth chart (data.json is baked).
(function () {
  const el = (id) => document.getElementById(id);
  function fold(a) { return a.at(-1) && a[0] ? `${(a.at(-1) / a[0]).toFixed(1)}\xd7` : "—"; }
  function bignum(value, label) {
    const d = document.createElement("div"); d.className = "bignum";
    const v = document.createElement("div"); v.className = "v"; v.textContent = value;
    const l = document.createElement("div"); l.className = "l"; l.textContent = label;
    d.append(v, l); return d;
  }
  fetch("data.json").then(function (r) { return r.json(); }).then(function (data) {
    el("subtitle").textContent = data.subtitle;
    el("boundary-note").textContent = data.boundary_note || "";
    const g = data.growth;
    const bn = el("bignum-hero");
    bn.append(bignum(fold(g.ways), "more road ways"));
    bn.append(bignum(fold(g.amenities), "more amenities"));
    bn.append(bignum("2018→19", "the mapping leap"));
    renderGrowth(el("growth"), g.years, g.ways, { annotate: true });
  }).catch(function (e) {
    document.body.insertAdjacentHTML("afterbegin",
      "<pre style=\"color:#c00;padding:1rem\">Failed to load data.json: " + e + "</pre>");
  });
})();

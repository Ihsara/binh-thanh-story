// cuisine.js — district-wide cuisine cluster map.
(function () {
  const FG = window.FOOD_GROUPS, FREG = window.FOOD_REGION_ORDER;
  let active = null;   // null = all; else Set of groups shown

  d3.json("cuisine.json").then((data) => {
    const W = 900, H = 680, pad = 18;
    const [x0, y0, x1, y1] = data.bounds;
    const x = d3.scaleLinear([x0, x1], [pad, W - pad]);
    const y = d3.scaleLinear([y0, y1], [H - pad, pad]);
    const cv = document.getElementById("ddots");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = "100%"; cv.style.height = "auto";
    const ctx = cv.getContext("2d");

    function paint() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      data.points.forEach((p) => {
        if (active && !active.has(p.group)) return;
        const G = FG[p.group] || FG.unclassified;
        ctx.beginPath(); ctx.arc(x(p.lon), y(p.lat), 2.2, 0, 2 * Math.PI);
        ctx.globalAlpha = 0.7; ctx.fillStyle = G.color; ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    paint();
    drawLegend(data, paint);
  }).catch((e) => document.getElementById("cuisine-main").innerHTML =
    `<pre style="color:#c00">Failed to load cuisine.json: ${e}</pre>`);

  function drawLegend(data, repaint) {
    const present = [...new Set(data.points.map(p => p.group))]
      .sort((a, b) => FREG.indexOf(FG[a].region) - FREG.indexOf(FG[b].region));
    const box = document.getElementById("dchips");
    box.innerHTML = present.map(g =>
      `<button class="fchip" data-g="${g}"><i style="background:${FG[g].color}"></i>` +
      `${FG[g].label}${g === "unclassified" ? " ◌" : ""}</button>`
    ).join("");
    box.querySelectorAll(".fchip").forEach(btn => {
      btn.onclick = () => {
        if (!active) active = new Set(present);
        btn.classList.toggle("off");
        active = new Set([...box.querySelectorAll(".fchip")]
          .filter(b => !b.classList.contains("off")).map(b => b.dataset.g));
        if (active.size === present.length) active = null;
        repaint();
      };
      btn.ondblclick = () => {
        active = new Set([btn.dataset.g]);
        box.querySelectorAll(".fchip").forEach(b =>
          b.classList.toggle("off", b.dataset.g !== btn.dataset.g));
        repaint();
      };
    });
  }
})();

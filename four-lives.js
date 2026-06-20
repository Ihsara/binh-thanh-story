const el = (id) => document.getElementById(id);
function mapImg(src, alt) {
  return (slot) => {
    const img = document.createElement("img");
    img.src = src; img.alt = alt; img.loading = "lazy";
    img.style.width = "100%"; img.style.maxWidth = "560px";
    slot.append(img);
  };
}
fetch("data.json").then((r) => r.json()).then((data) => {
  const lv = data.streetlife.lives;
  if (lv && el("lives-stepper")) {
    const LIFE_DESC = {
      sustenance: "markets, groceries, pharmacies, banks, motorbike repair — who feeds shift workers and runs the daily errands",
      anchors: "schools, temples, ward offices, government buildings — the fixed points the neighbourhood orients itself by",
      third_places: "cà phê at dawn, quán ăn at noon, bia and karaoke at dusk — where the city socializes",
      display: "fashion, beauty, electronics, hotel lobbies — the optional stroll, not the daily need",
    };
    const cnt = (k) => lv.counts.find((c) => c.life === k);
    const chips = lv.counts.map((c) =>
      `<span class="chip ${c.life}">${c.label} ${c.n.toLocaleString("en")}</span>`).join(" ");
    const fig = (k) => `<figure><img src="lives-${k.replace(/_/g,"-")}.png" alt="${cnt(k).label} places" loading="lazy"><figcaption>${cnt(k).label} · ${cnt(k).n.toLocaleString("en")}</figcaption></figure>`;
    const fourMaps = (slot) => {
      const d = document.createElement("div"); d.className = "lives-grid";
      d.innerHTML = ["sustenance","anchors","third_places","display"].map(fig).join("");
      slot.append(d);
    };
    const pairMaps = (slot) => {
      const d = document.createElement("div"); d.className = "lives-pair";
      d.innerHTML = fig("third_places") + fig("sustenance");
      slot.append(d);
    };
    const hemRank = lv.road_mix.map((m) => ({...m, share: m.hem / m.total}))
      .sort((a, b) => b.share - a.share);
    const hemiest = hemRank[0];
    const least = hemRank[hemRank.length - 1];
    const mixBars = (slot) => {
      lv.road_mix.forEach((m) => {
        const row = document.createElement("div"); row.className = "bar-row";
        const pct = Math.round(100 * m.hem / m.total);
        row.innerHTML = `<span>${m.label}</span><span><span class="bar ${m.life}" style="width:${pct}%"></span></span><span>${pct}% hẻm</span>`;
        slot.append(row);
      });
    };
    const topcat = (k, j) => `${cnt(k).top[j].cat.replace(/_/g, " ")} (${cnt(k).top[j].n.toLocaleString("en")})`;
    const sens = (t) => lv.sensitivity.find((r) => r.threshold === t);
    const liveSteps = [
      { kind: "intro", kicker: "The four lives", headline: "Coffee is the headline. It isn't the <em>whole street</em>.",
        narrative: `Ask what people come to DO — not what the category column says — and the ${lv.total.toLocaleString("en")} places the open graph lists resolve into four overlapping lives: ${chips}. (${lv.unclassified.n.toLocaleString("en")} of them are back-office pages the street never shows — counted, not hidden. <a class="how" href="method.html#lives">The sorting →</a>)` },
      { kind: "data", kicker: "Four inks", headline: "Four lives, four <em>districts within the district</em>.",
        narrative: `Each life drawn as its own ink — the social hum, the daily errand, the fixed shrine, the shopfront stroll. ${cnt("display").label} (${cnt("display").n.toLocaleString("en")}) is the biggest bucket of records — but tighten the existence-confidence dial and the picture shifts: at ≥0.75 it's ${cnt("third_places").label.toLowerCase()} (${sens(0.75).counts.third_places.toLocaleString("en")} vs ${sens(0.75).counts.display.toLocaleString("en")}) that leads the street the data is surest about.`,
        render: fourMaps },
      { kind: "data", kicker: "Two streets in one", headline: "The plastic-stool parliament and the <em>market run</em>.",
        narrative: `${LIFE_DESC.third_places} — alongside ${LIFE_DESC.sustenance}. The top draw of each: ${topcat("third_places", 0)} vs ${topcat("sustenance", 0)}.`,
        render: pairMaps },
      { kind: "data", kicker: "Where lives meet", headline: "Where all four lives <em>stack</em>.",
        narrative: `Jane Jacobs called it: vitality is density times <em>diversity</em>. Darker cells host more kinds of life; ${lv.grid.all_four.toLocaleString("en")} of ${lv.grid.active.toLocaleString("en")} inhabited ${lv.grid.cell_m}-metre cells host all four at once. The pale monocultures are mostly ${cnt(lv.grid.mono_top_life).label.toLowerCase()}.`,
        render: mapImg("lives-grid.png", "Cells shaded by how many kinds of life they host") },
      { kind: "data", kicker: "Boulevard & hẻm", headline: "The lives <em>sort themselves</em> by street.",
        narrative: `Which life retreats deepest into the alleys? ${hemiest.label} leans hardest into the hẻm (${Math.round(100 * hemiest.share)}%); ${least.label.toLowerCase()} stays closest to the boulevard (${Math.round(100 * least.share)}%). The alley scholarship predicted necessity inside, display out front — here is the district's own answer. <a class="how" href="hem/">The hẻm story →</a>`,
        render: mixBars },
      { kind: "intro", kicker: "What the data can't see", headline: "The fourth life of the <em>sidewalk</em> is invisible.",
        narrative: `Everything above is fixed commerce — places with a name and a pin. The roving layer (the cart, the basket, the evening stall) that <em>Sidewalk City</em> documented riding on top of HCMC's sidewalks appears in no database. The street has always been bigger than any map of it. <a class="how" href="method.html#lives">How we sorted →</a>` },
    ];
    Stepper.mount(el("lives-stepper"), liveSteps);
  }
}).catch((e) => document.body.insertAdjacentHTML("afterbegin",
  `<pre style="color:#c00;padding:1rem">Failed to load data.json: ${e}</pre>`));

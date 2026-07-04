// Bình Thạnh from orbit — flipbook engine.
// Loads months.json, plays ONLY real frames (has_image), never interpolates a
// gap. Every shown frame carries its four-field provenance readout. Sensor-era
// identity hue is the only encoded color. Chapters + explorer wired in later.
window.Orbit = (function () {
  const ERA_HUE = { "TM-30m": "--era-tm", "OLI-30m": "--era-oli", "S2-10m": "--era-s2" };
  const ERA_LABEL = {
    "TM-30m": "Landsat TM · 30 m",
    "OLI-30m": "Landsat OLI · 30 m",
    "S2-10m": "Sentinel-2 · 10 m",
  };
  const state = { manifest: null, months: [], frames: [], idx: 0, timer: null };

  function eraHue(era) {
    const v = ERA_HUE[era] || "--era-gap";
    return getComputedStyle(document.getElementById("orbit-main"))
      .getPropertyValue(v).trim() || "#6ea8fe";
  }

  function provenanceHTML(m) {
    // date · sensor/era (+colour chip) · in-district cloud % · resolution
    const d = (m.datetime || m.month + "-01").slice(0, 10);
    const era = ERA_LABEL[m.sensor_era] || m.sensor_era || "—";
    const cloud = (m.in_district_cloud_pct == null)
      ? "—" : `${m.in_district_cloud_pct.toFixed(1)}%`;
    const res = m.resolution_m ? `${m.resolution_m} m` : "—";
    const hue = eraHue(m.sensor_era);
    return `<span class="prov-era" style="background:${hue}">${era}</span>`
      + `<span><b>${d}</b></span>`
      + `<span>cloud (in-district) <b>${cloud}</b></span>`
      + `<span>res <b>${res}</b></span>`
      + `<span>${m.color_mode || "true-color"}</span>`;
  }

  function showFrame(realIdx) {
    if (!state.frames.length) return;
    state.idx = (realIdx + state.frames.length) % state.frames.length;
    const m = state.frames[state.idx];
    const stage = document.getElementById("orbit-stage");
    // Honesty net: a gap can never be rendered as imagery (frames are pre-filtered).
    if (!m.has_image) { showGapCard(m.month); return; }
    const gc = stage.querySelector(".orbit-gap-card"); if (gc) gc.remove();
    let img = stage.querySelector("img.orbit-frame");
    if (!img) { img = document.createElement("img"); img.className = "orbit-frame";
      img.alt = ""; stage.append(img); }
    img.src = `satellite/${m.month}.png`;
    document.getElementById("orbit-readout").innerHTML = provenanceHTML(m);
    if (typeof state.onFrame === "function") state.onFrame(state.idx, m);
  }

  let pause = () => {};   // replaced by the real pause() in Task 5

  const PRELOAD_AHEAD = 6;
  const _warmed = new Set();
  function preloadAround(idx) {
    for (let k = 1; k <= PRELOAD_AHEAD; k++) {
      const m = state.frames[(idx + k) % state.frames.length];
      if (m && !_warmed.has(m.month)) {
        const im = new Image(); im.src = `satellite/${m.month}.png`;
        _warmed.add(m.month);
      }
    }
  }

  function syncSlider() {
    const s = document.getElementById("orbit-slider");
    if (s) s.value = String(state.idx);
  }

  function play() {
    if (state.timer) return;
    const btn = document.getElementById("orbit-playpause");
    if (btn) btn.textContent = "⏸ Pause";
    state.timer = setInterval(() => {
      showFrame(state.idx + 1);
    }, 700);
  }
  function _pause() {
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
    const btn = document.getElementById("orbit-playpause");
    if (btn) btn.textContent = "▶ Play";
  }
  pause = _pause;   // replace the Task-4 stub

  function buildControls() {
    const c = document.getElementById("orbit-controls");
    c.innerHTML = "";
    const prev = document.createElement("button");
    prev.className = "orbit-btn"; prev.textContent = "‹"; prev.title = "Previous frame";
    const playBtn = document.createElement("button");
    playBtn.className = "orbit-btn"; playBtn.id = "orbit-playpause"; playBtn.textContent = "▶ Play";
    const next = document.createElement("button");
    next.className = "orbit-btn"; next.textContent = "›"; next.title = "Next frame";
    const slider = document.createElement("input");
    slider.type = "range"; slider.id = "orbit-slider";
    slider.min = "0"; slider.max = String(state.frames.length - 1); slider.value = "0";
    prev.addEventListener("click", () => { pause(); showFrame(state.idx - 1); });
    next.addEventListener("click", () => { pause(); showFrame(state.idx + 1); });
    playBtn.addEventListener("click", () => { state.timer ? pause() : play(); });
    slider.addEventListener("input", () => { pause(); showFrame(Number(slider.value)); });
    c.append(prev, playBtn, next, slider);
  }

  function nearestRealAtOrAfter(monthKey) {
    // honest scrub target: a gap can't be displayed, snap to the next real frame
    for (let i = 0; i < state.frames.length; i++) {
      if (state.frames[i].month >= monthKey) return i;
    }
    return state.frames.length - 1;
  }

  function highlightTick(realIdx) {
    const m = state.frames[realIdx];
    document.querySelectorAll("#orbit-ribbon .ribbon-tick.on")
      .forEach((t) => t.classList.remove("on"));
    if (!m) return;
    const t = document.querySelector(`#orbit-ribbon .ribbon-tick[data-month="${m.month}"]`);
    if (t) t.classList.add("on");
  }

  function buildRibbon() {
    const wrap = document.getElementById("orbit-ribbon");
    wrap.innerHTML = "";
    for (const m of state.months) {
      const t = document.createElement("span");
      t.className = "ribbon-tick" + (m.has_image ? "" : " gap");
      t.dataset.month = m.month;
      if (m.has_image) {
        const hue = eraHue(m.sensor_era);
        t.style.setProperty("--tick-hue", hue);
        t.style.color = hue;  // for the .on box-shadow (currentColor)
      }
      t.title = m.has_image
        ? `${m.month} · ${ERA_LABEL[m.sensor_era] || m.sensor_era}`
        : `${m.month} · no clear image`;
      t.addEventListener("click", () => {
        pause();
        showFrame(nearestRealAtOrAfter(m.month));
      });
      wrap.append(t);
    }
  }

  state.onFrame = (realIdx) => { highlightTick(realIdx); syncSlider(); preloadAround(realIdx); };

  function jumpToMonth(monthKey) {
    // exact real frame if present, else snap forward to the next real one
    let i = state.frames.findIndex((m) => m.month === monthKey);
    if (i < 0) i = nearestRealAtOrAfter(monthKey);
    pause();
    showFrame(i);
  }

  function buildChapters() {
    if (!window.Stepper) return;
    const el = document.getElementById("orbit-chapters");
    const at = (mk) => (slot) => { jumpToMonth(mk); };
    window.Stepper.mount(el, [
      { kind: "intro", kicker: "From orbit",
        headline: "One pass a month, always the same frame",
        narrative: "Each image is a single real satellite acquisition — the "
          + "clearest one that month, measured <em>inside</em> the district. "
          + "Clouded-out months are left blank rather than faked. Step through "
          + "the eras, then scrub it yourself." },
      { kind: "data", cta: "1988 →", kicker: "1988–1999 · Landsat-5",
        headline: "Fields, water, and a thin grid",
        narrative: "The oldest clear frames are Landsat-5 TM at 30 m. Thanh Đa "
          + "is farmland; the built-up grid hugs the Saigon-river bank. Coarse, "
          + "but real.", render: at("1988-01") },
      { kind: "data", cta: "2003 →", kicker: "2000–2012 · the SLC-off years",
        headline: "Those black stripes are honest",
        narrative: "In 2003 the Landsat-7 scan-line corrector (SLC) failed, so "
          + "ETM+ frames carry diagonal no-data stripes. We keep them — that is "
          + "what the archive actually holds, not a defect we introduced.",
        render: at("2003-08") },
      { kind: "data", cta: "2016 →", kicker: "2013–2016 · sharper eyes",
        headline: "Landsat-8, then Sentinel-2 arrive",
        narrative: "OLI (2013) and then Sentinel-2 at 10 m (from 2017 over this "
          + "district) resolve individual blocks. The texture gets crisp.",
        render: at("2016-02") },
      { kind: "data", cta: "2018 →", kicker: "2017–2026 · the build-out",
        headline: "The towers rise; Thanh Đa stays green",
        narrative: "Vinhomes Central Park and Landmark 81 (topped out 2018) "
          + "erupt on the riverfront, while the Thanh Đa peninsula stays "
          + "stubbornly green — a visible contrast you can watch frame to frame.",
        render: at("2018-02") },
      { kind: "intro", cta: "Explore ↔", kicker: "Your turn",
        headline: "Scrub the whole archive",
        narrative: "Drag the slider or hit play. Hollow ticks are honest gaps — "
          + "months with no clear image.", render: (slot) => {} },
    ]);
  }

  function renderAttribution() {
    const el = document.getElementById("orbit-attribution");
    if (!el) return;
    el.innerHTML =
      `<strong>Landsat frames</strong> (TM · OLI, 30 m): imagery courtesy of the `
      + `U.S. Geological Survey / NASA — public domain (U.S. federal government).`
      + `<br><strong>Sentinel-2 frames</strong> (10 m): contains modified `
      + `Copernicus Sentinel data 2015–2026, processed by ESA. `
      + `Free to use under the Copernicus open-data licence, with attribution to `
      + `Copernicus/ESA required.`
      + `<br>Each frame is one real dated acquisition, clipped to the district `
      + `boundary and pinned to a fixed 10 m grid (EPSG:32648). Cloud % is `
      + `measured inside the district, not scene-wide. Gap months have no clear image.`;
  }

  function showGapCard(month) {
    // Defensive honesty net: never render a gap as if it were imagery.
    const stage = document.getElementById("orbit-stage");
    const img = stage.querySelector("img.orbit-frame");
    if (img) img.remove();
    let card = stage.querySelector(".orbit-gap-card");
    if (!card) { card = document.createElement("div"); card.className = "orbit-gap-card"; stage.append(card); }
    card.textContent = `${month} · no clear image`;
    document.getElementById("orbit-readout").textContent = `${month} · gap (clouded / no acquisition)`;
  }

  async function boot() {
    const res = await fetch("satellite/months.json");
    state.manifest = await res.json();
    state.months = state.manifest.months || [];
    state.frames = state.months.filter((m) => m.has_image);  // real only, no gaps
    renderAttribution();
    buildRibbon();
    buildControls();
    if (state.frames.length) showFrame(0);
    buildChapters();
    if (typeof state.onBoot === "function") state.onBoot();
  }

  document.addEventListener("DOMContentLoaded", boot);
  return {
    state, boot, showFrame, provenanceHTML, eraHue, ERA_LABEL, ERA_HUE,
    buildRibbon, highlightTick, play, pause, buildControls,
    jumpToMonth, buildChapters, renderAttribution, showGapCard,
  };
})();

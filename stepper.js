// Shared narrative engine. Stepper.mount(el, steps) renders one step at a time.
//   step = { kind:'intro'|'data', kicker, headline (may contain <em>), narrative,
//            render(stage) }  // render gets a clean <div class="stage-body"> to fill
// Nav: Back/Next buttons, dot indicators, keyboard ArrowLeft/ArrowRight. Crossfade
// between stages. Respects prefers-reduced-motion (CSS kills the transition).
window.Stepper = (function () {
  function mount(el, steps) {
    el.classList.add("stepper");
    el.innerHTML = "";
    const stage = document.createElement("div");
    stage.className = "stage";
    const nav = document.createElement("div");
    nav.className = "step-nav";
    const back = document.createElement("button");
    back.type = "button"; back.textContent = "← Back";
    const next = document.createElement("button");
    next.type = "button"; next.className = "primary";
    const dots = document.createElement("div");
    dots.className = "dots";
    steps.forEach(() => { const d = document.createElement("span"); d.className = "dot"; dots.append(d); });
    nav.append(back, next, dots);
    el.append(stage, nav);

    let i = 0;
    function draw() {
      const s = steps[i];
      stage.classList.toggle("intro", s.kind === "intro");
      stage.style.opacity = "0";
      const body = document.createElement("div");
      body.className = "stage-body";
      let html = "";
      if (s.kicker) html += `<span class="kicker">${s.kicker}</span>`;
      if (s.headline) html += `<h2>${s.headline}</h2>`;
      if (s.narrative) html += `<p class="narr">${s.narrative}</p>`;
      body.innerHTML = html;
      const slot = document.createElement("div");
      body.append(slot);
      stage.innerHTML = "";
      stage.append(body);
      if (typeof s.render === "function") s.render(slot);
      // dots + buttons
      dots.querySelectorAll(".dot").forEach((d, j) => d.classList.toggle("on", j === i));
      back.disabled = i === 0;
      next.textContent = i === steps.length - 1 ? "Start over ↺" : (steps[i + 1] && steps[i + 1].cta) || "Next →";
      requestAnimationFrame(() => { stage.style.transition = "opacity .25s"; stage.style.opacity = "1"; });
    }
    function go(n) { i = (n + steps.length) % steps.length; draw(); }
    back.addEventListener("click", () => go(i - 1));
    next.addEventListener("click", () => go(i === steps.length - 1 ? 0 : i + 1));
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
    });
    draw();
    return { go };
  }
  return { mount };
})();

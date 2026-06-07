// Map page: per-year depth PNG frames + Type 1/Type 2 toggle + play button.
const YEARS = Array.from({length:11}, (_,i)=>2015+i);
let type = "t1", playing = null;

function frameSrc(y){ return `img/depth-${type}-vn${y}.png`; }

function show(y){
  document.getElementById("map-img").src = frameSrc(y);
  document.getElementById("year").value = y;
  document.getElementById("year-readout").textContent =
    `as known to OpenStreetMap in ${y}`;
}

function initMap(){
  document.querySelectorAll("input[name=maptype]").forEach(r =>
    r.onchange = () => { type = r.value; show(+document.getElementById("year").value); });
  document.getElementById("year").oninput = e => show(+e.target.value);
  document.getElementById("play").onclick = () => {
    if (playing){ clearInterval(playing); playing=null;
                  document.getElementById("play").textContent="▶ Play"; return; }
    document.getElementById("play").textContent="❚❚ Pause";
    let i = YEARS.indexOf(+document.getElementById("year").value);
    playing = setInterval(()=>{ i=(i+1)%YEARS.length; show(YEARS[i]); }, 900);
  };
  show(2025);
}
document.addEventListener("DOMContentLoaded", initMap);

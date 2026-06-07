// Radial tree of one arterial's hẻm system, from data/tree.json.
const RAMP = {"-1":"#cdbfa6","0":"#e8a679","1":"#c0552f","2":"#7c2d16","3":"#3a160b"};
const depthColor = d => RAMP[Math.max(-1, Math.min(3, d))];

async function initTree() {
  const data = await (await fetch("data/tree.json")).json();
  const sel = document.getElementById("arterial");
  data.order.forEach(a => sel.add(new Option(`${a} (${data.counts[a]})`, a)));
  sel.onchange = () => draw(data.arterials[sel.value], data.counts[sel.value], sel.value);
  draw(data.arterials[data.order[0]], data.counts[data.order[0]], data.order[0]);
}

function draw(rootData, count, name) {
  const svg = d3.select("#tree-svg");
  svg.selectAll("*").remove();

  // empty-state guard: an arterial with no mapped alleys
  if (!rootData.children || rootData.children.length === 0) {
    document.getElementById("tree-cap").textContent = `${name} has no mapped alleys.`;
    return;
  }

  const W = 720, H = 720, R = Math.min(W, H) / 2 - 40;
  const g = svg.attr("viewBox", `0 0 ${W} ${H}`)
               .append("g").attr("transform", `translate(${W/2},${H/2})`);
  const root = d3.hierarchy(rootData, d => d.children);
  d3.cluster().size([2 * Math.PI, R])(root);
  const toXY = d => [Math.cos(d.x - Math.PI/2) * d.y, Math.sin(d.x - Math.PI/2) * d.y];
  g.selectAll("line.link").data(root.links()).join("line")
    .attr("x1", d => toXY(d.source)[0]).attr("y1", d => toXY(d.source)[1])
    .attr("x2", d => toXY(d.target)[0]).attr("y2", d => toXY(d.target)[1])
    .attr("stroke", d => depthColor(d.target.data.depth))
    .attr("stroke-width", 1.2).attr("opacity", 0.8);
  g.selectAll("circle.node").data(root.descendants()).join("circle")
    .attr("cx", d => toXY(d)[0]).attr("cy", d => toXY(d)[1])
    .attr("r", d => d.data.depth === -1 ? 6 : 3)
    .attr("fill", d => depthColor(d.data.depth));
  document.getElementById("tree-cap").textContent =
    `${name}: ${count} alleys branch off this one road, down to ${root.height} forks deep.`;
}
document.addEventListener("DOMContentLoaded", initTree);

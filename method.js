fetch("data.json").then((r) => r.json()).then((data) => {
  const n = document.getElementById("boundary-note");
  if (n) n.textContent = data.boundary_note || "";
  if (location.hash) {
    const t = document.querySelector(location.hash);
    if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}).catch(() => {});

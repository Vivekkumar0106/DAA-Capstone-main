const nodePositions = {
  "Depot": [50, 50], "North Hub": [27, 23], "East Hub": [72, 20],
  "West Hub": [22, 72], "South Hub": [69, 75], "Central Mall": [50, 28],
  "Tech Park": [82, 48], "Airport": [66, 58], "University": [36, 52]
};

async function generatePlan() {
  const capacity = Number(document.querySelector("#capacity").value);
  document.querySelector("#loading").classList.remove("hidden");
  try {
    const response = await fetch("/api/plan", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({capacity})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to generate plan");
    renderPlan(data);
  } catch (error) {
    const toast = document.querySelector("#toast");
    toast.textContent = error.message;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3200);
  } finally {
    document.querySelector("#loading").classList.add("hidden");
  }
}

function renderPlan(data) {
  document.querySelector("#selected-count").textContent = data.selected.length;
  document.querySelector("#selected-weight").textContent = `${data.selected_weight} kg selected`;
  document.querySelector("#total-value").textContent = data.value;
  document.querySelector("#route-distance").textContent = `${data.route_distance.toFixed(1)} km`;
  document.querySelector("#capacity-used").textContent = `${Math.round(data.selected_weight / data.capacity * 100)}%`;
  document.querySelector("#remaining-capacity").textContent = `${data.capacity - data.selected_weight} kg available`;
  document.querySelector("#stop-count").textContent = `${Math.max(0, data.route.length - 2)} stops`;
  document.querySelector("#manifest-count").textContent = `${data.prioritized.length} parcels`;
  document.querySelector("#route-distance-badge").textContent = `${data.route_distance.toFixed(1)} km`;

  document.querySelector("#priority-list").innerHTML = data.prioritized.map((parcel, index) => {
    const selected = data.selected.some(item => item.parcel_id === parcel.parcel_id);
    return `<div class="parcel-row">
      <div class="parcel-rank">${index + 1}</div>
      <div><strong>${parcel.parcel_id}</strong><small>${parcel.destination} · ${parcel.weight} kg · value ${parcel.value}</small></div>
      <span class="parcel-status">${selected ? "Selected" : "Waiting"}</span>
    </div>`;
  }).join("");

  document.querySelector("#route-steps").innerHTML = data.route.map((node, index) =>
    `<div class="route-step"><div class="route-dot"></div><div><strong>${node}</strong><small>${index === 0 ? "Start" : index === data.route.length - 1 ? "Return" : `Stop ${index}`}</small></div></div>`
  ).join("");

  document.querySelector("#parcel-table").innerHTML = data.prioritized.map(parcel => {
    const selected = data.selected.some(item => item.parcel_id === parcel.parcel_id);
    return `<tr><td><strong>${parcel.parcel_id}</strong></td><td>${parcel.destination}</td><td>${parcel.weight} kg</td><td>${parcel.value}</td><td>${parcel.priority}</td><td>${parcel.deadline}</td><td><span class="status ${selected ? "selected" : "waiting"}">${selected ? "Selected" : "Not selected"}</span></td></tr>`;
  }).join("");

  renderMap(data);
  renderBenchmarks(data.timings);
}

function renderMap(data) {
  const routeSet = new Set(data.route);
  const map = document.querySelector("#route-node-map");
  map.innerHTML = data.nodes.map(name => {
    const position = nodePositions[name] || [50, 50];
    const classes = name === "Depot" ? "depot" : routeSet.has(name) ? "route-node" : "";
    return `<div class="map-node ${classes}" style="left:${position[0]}%;top:${position[1]}%" title="${name}">${name === "Depot" ? "D" : name.split(" ")[0].slice(0, 2)}</div>`;
  }).join("");
}

function renderBenchmarks(timings) {
  const maximum = Math.max(...timings.map(item => item.seconds), 0.000001);
  document.querySelector("#benchmark-list").innerHTML = timings.map(item =>
    `<div class="benchmark-row"><strong>${item.component}</strong><div class="benchmark-track"><div class="benchmark-bar" style="width:${Math.max(2, item.seconds / maximum * 100)}%"></div></div><span class="benchmark-value">${item.seconds.toFixed(8)} s</span></div>`
  ).join("");
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelectorAll(".section").forEach(section => section.classList.remove("active-section"));
    document.querySelector(`#${button.dataset.section}-section`).classList.add("active-section");
    document.querySelector("#page-title").textContent = button.textContent === "Overview" ? "Operations overview" : `${button.textContent} workspace`;
  });
});
document.querySelector("#plan-button").addEventListener("click", generatePlan);
document.querySelector("#capacity").addEventListener("keydown", event => {
  if (event.key === "Enter") generatePlan();
});
generatePlan();

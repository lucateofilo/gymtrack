function formatKg(n) {
  return n.toLocaleString("it-IT", { maximumFractionDigits: 1 }) + " kg";
}

function renderTrend(periods) {
  const container = document.getElementById("trendChart");
  container.innerHTML = "";
  const maxAbs = Math.max(1, ...periods.map((p) => p.value));

  for (const p of periods) {
    const col = document.createElement("div");
    col.className = "trend-col";
    const heightPct = (p.value / maxAbs) * 100;
    col.innerHTML = `
      <div class="trend-bar-track">
        <div class="trend-bar" style="height:${heightPct}%" title="${p.value}"></div>
      </div>
      <span class="trend-label">${p.label}</span>
    `;
    container.appendChild(col);
  }
}

function renderMuscleVolume(rows) {
  const list = document.getElementById("muscleVolumeList");
  const emptyState = document.getElementById("muscleVolumeEmpty");
  list.innerHTML = "";

  if (rows.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  const max = Math.max(...rows.map((r) => r.volume));
  for (const row of rows) {
    const li = document.createElement("li");
    const pct = max > 0 ? (row.volume / max) * 100 : 0;
    li.innerHTML = `
      <div class="cat-row-top">
        <span class="cat-name">${row.muscleGroup}</span>
        <span class="cat-amount">${formatKg(row.volume)}</span>
      </div>
      <div class="cat-bar-track">
        <div class="cat-bar-fill" style="width:${pct}%; background:var(--accent)"></div>
      </div>
    `;
    list.appendChild(li);
  }
}

function renderProgressionChart(points) {
  const svg = document.getElementById("progressionSvg");
  const emptyState = document.getElementById("progressionEmpty");
  const recordLabel = document.getElementById("progressionRecord");

  if (points.length === 0) {
    svg.hidden = true;
    recordLabel.hidden = true;
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  svg.hidden = false;
  recordLabel.hidden = false;

  const W = 300, H = 120, PAD = 10;
  const maxY = Math.max(...points.map((p) => p.value));
  const minY = Math.min(...points.map((p) => p.value));
  const rangeY = maxY - minY || 1;

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? W / 2 : PAD + (i / (points.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((p.value - minY) / rangeY) * (H - PAD * 2);
    return { x, y, pr: p.pr };
  });

  const linePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const dots = coords
    .map((c) => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${c.pr ? 4 : 2.5}" class="${c.pr ? "pr-dot" : "dot-point"}"></circle>`)
    .join("");

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = `<polyline points="${linePoints}" class="progression-line"></polyline>${dots}`;

  const bestEver = Math.max(...points.map((p) => p.value));
  recordLabel.textContent = `Record: ${formatKg(bestEver)} (1RM stimato)`;
}

function renderBodyWeightChart(points) {
  const svg = document.getElementById("bodyWeightSvg");
  const emptyState = document.getElementById("bodyWeightEmpty");
  const latestLabel = document.getElementById("bodyWeightLatest");

  if (points.length === 0) {
    svg.hidden = true;
    latestLabel.hidden = true;
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  svg.hidden = false;
  latestLabel.hidden = false;

  const W = 300, H = 120, PAD = 10;
  const maxY = Math.max(...points.map((p) => p.value));
  const minY = Math.min(...points.map((p) => p.value));
  const rangeY = maxY - minY || 1;

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? W / 2 : PAD + (i / (points.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((p.value - minY) / rangeY) * (H - PAD * 2);
    return { x, y };
  });

  const linePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const dots = coords.map((c) => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="2.5" class="dot-point"></circle>`).join("");

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = `<polyline points="${linePoints}" class="progression-line"></polyline>${dots}`;

  const latest = points[points.length - 1].value;
  latestLabel.textContent = `Ultimo: ${latest.toLocaleString("it-IT", { maximumFractionDigits: 1 })} kg`;
}

function renderStreakCalendar(year, monthIndex, workoutDates) {
  const container = document.getElementById("streakCalendar");
  container.innerHTML = "";

  const days = new Date(year, monthIndex + 1, 0).getDate();
  const firstDow = (new Date(year, monthIndex, 1).getDay() + 6) % 7; // Monday = 0

  for (let i = 0; i < firstDow; i++) {
    const filler = document.createElement("div");
    filler.className = "streak-cell empty";
    container.appendChild(filler);
  }

  for (let d = 1; d <= days; d++) {
    const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const cell = document.createElement("div");
    cell.className = "streak-cell" + (workoutDates.has(iso) ? " active" : "");
    cell.title = iso;
    cell.textContent = d;
    container.appendChild(cell);
  }
}

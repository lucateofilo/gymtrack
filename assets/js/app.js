const MONTHS_IT = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const MONTHS_IT_SHORT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

let periodType = "week";
let periodAnchor = startOfDay(new Date());
let currentWorkoutId = null;
let editingExerciseId = null;
let statsExerciseId = "";
let restTimerInterval = null;
let restTimerRemaining = 90;
let restStoppedAt = null;
let setStopwatchInterval = null;

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date) {
  const d = startOfDay(date);
  const diff = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - diff);
  return d;
}

function toISODate(date) {
  return date.toLocaleDateString("en-CA");
}

function getPeriodBounds(type, anchor) {
  if (type === "day") {
    return { start: startOfDay(anchor), end: endOfDay(anchor) };
  }
  if (type === "week") {
    const start = startOfWeek(anchor);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end: endOfDay(end) };
  }
  if (type === "month") {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { start, end: endOfDay(end) };
  }
  const start = new Date(anchor.getFullYear(), 0, 1);
  const end = new Date(anchor.getFullYear(), 11, 31);
  return { start, end: endOfDay(end) };
}

function getPeriodLabel(type, anchor) {
  if (type === "day") {
    return anchor.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
  }
  if (type === "week") {
    const { start, end } = getPeriodBounds(type, anchor);
    const fmt = (d) => d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
    return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;
  }
  if (type === "month") {
    return `${MONTHS_IT[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }
  return `${anchor.getFullYear()}`;
}

function getTrendLabel(type, anchor) {
  if (type === "day" || type === "week") {
    return anchor.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  }
  if (type === "month") {
    return MONTHS_IT_SHORT[anchor.getMonth()];
  }
  return `${anchor.getFullYear()}`;
}

function shiftedAnchor(type, anchor, direction) {
  const d = new Date(anchor);
  if (type === "day") d.setDate(d.getDate() + direction);
  else if (type === "week") d.setDate(d.getDate() + 7 * direction);
  else if (type === "month") d.setMonth(d.getMonth() + direction);
  else d.setFullYear(d.getFullYear() + direction);
  return startOfDay(d);
}

function shiftPeriod(direction) {
  periodAnchor = shiftedAnchor(periodType, periodAnchor, direction);
  renderAll();
}

function getWorkoutsInRange(start, end) {
  return Store.getWorkouts().filter((w) => {
    const d = new Date(w.date + "T12:00:00");
    return d >= start && d <= end;
  });
}

function getPastPeriods(type, anchor, n) {
  const periods = [];
  let cursor = anchor;
  for (let i = 0; i < n; i++) {
    const { start, end } = getPeriodBounds(type, cursor);
    periods.unshift({ start, end, label: getTrendLabel(type, cursor) });
    cursor = shiftedAnchor(type, cursor, -1);
  }
  return periods;
}

function exerciseBestE1RM(exerciseId) {
  const sets = Store.getSets().filter((s) => s.exerciseId === exerciseId);
  return sets.reduce((best, s) => Math.max(best, estimate1RM(s.weight, s.reps)), -Infinity);
}

function getPRSetIds(exerciseId) {
  const workouts = Store.getWorkouts();
  const sets = Store.getSets()
    .filter((s) => s.exerciseId === exerciseId)
    .map((s) => ({ ...s, date: workouts.find((w) => w.id === s.workoutId)?.date || "" }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let best = -Infinity;
  const prIds = [];
  for (const s of sets) {
    const e1rm = estimate1RM(s.weight, s.reps);
    if (e1rm > best) {
      best = e1rm;
      prIds.push(s.id);
    }
  }
  return prIds;
}

function computeWeekStreak() {
  const workouts = Store.getWorkouts();
  if (workouts.length === 0) return 0;
  const weeksWithWorkout = new Set(
    workouts.map((w) => toISODate(startOfWeek(new Date(w.date + "T12:00:00"))))
  );
  let streak = 0;
  let cursor = startOfWeek(new Date());
  while (weeksWithWorkout.has(toISODate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function renderAll() {
  document.getElementById("periodLabel").textContent = getPeriodLabel(periodType, periodAnchor);

  const { start, end } = getPeriodBounds(periodType, periodAnchor);
  const workouts = getWorkoutsInRange(start, end);

  renderHomeTotals(workouts);
  renderStreakChip();
  renderWorkoutsList(workouts);
  renderExerciseManager();
  renderStatsView();
}

function renderHomeTotals(workouts) {
  const setsInPeriod = workouts.flatMap((w) => Store.getSetsForWorkout(w.id));
  const volume = setsInPeriod.reduce((s, x) => s + x.weight * x.reps, 0);
  document.getElementById("totalWorkouts").textContent = workouts.length;
  document.getElementById("totalSets").textContent = setsInPeriod.length;
  document.getElementById("totalVolume").textContent = formatKg(volume);
}

function renderStreakChip() {
  const el = document.getElementById("streakChip");
  const streak = computeWeekStreak();
  el.textContent = streak > 0
    ? `\u{1F525} ${streak} settiman${streak === 1 ? "a" : "e"} di fila`
    : "Inizia il tuo streak settimanale";
}

function renderWorkoutsList(workouts) {
  const list = document.getElementById("workoutsList");
  const emptyState = document.getElementById("emptyState");
  list.innerHTML = "";

  const sorted = [...workouts].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (sorted.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  for (const w of sorted) {
    const sets = Store.getSetsForWorkout(w.id);
    const volume = sets.reduce((s, x) => s + x.weight * x.reps, 0);
    const groups = [...new Set(sets.map((s) => Store.getExerciseById(s.exerciseId)?.muscleGroup).filter(Boolean))];
    const dateLabel = new Date(w.date + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" });

    const li = document.createElement("li");
    li.className = "movement-item";
    li.innerHTML = `
      <div class="info">
        <div class="cat-name">${groups.join(", ") || "Allenamento"}</div>
        <div class="note">${sets.length} serie · ${formatKg(volume)}${w.note ? " · " + w.note : ""}</div>
      </div>
      <div class="meta">
        <span class="date">${dateLabel}</span>
      </div>
    `;
    li.addEventListener("click", () => openWorkoutModal("edit", w));
    list.appendChild(li);
  }
}

function fillMuscleGroupOptions(select) {
  select.innerHTML = "";
  for (const g of MUSCLE_GROUPS) {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    select.appendChild(opt);
  }
}

function populateExerciseSelect(selectedId) {
  const select = document.getElementById("setExerciseSelect");
  const exercises = Store.getExercises();
  select.innerHTML = "";
  for (const ex of exercises) {
    const opt = document.createElement("option");
    opt.value = ex.id;
    opt.textContent = ex.name;
    select.appendChild(opt);
  }
  const newOpt = document.createElement("option");
  newOpt.value = "__new__";
  newOpt.textContent = "+ Nuovo esercizio";
  select.appendChild(newOpt);

  select.value = selectedId && exercises.some((e) => e.id === selectedId)
    ? selectedId
    : exercises[0] ? exercises[0].id : "__new__";
  toggleNewExerciseFields();
}

function toggleNewExerciseFields() {
  const select = document.getElementById("setExerciseSelect");
  document.getElementById("newExerciseFields").hidden = select.value !== "__new__";
}

function renderSetsList(workoutId) {
  const list = document.getElementById("setsList");
  const emptyState = document.getElementById("setsEmpty");
  list.innerHTML = "";

  const sets = workoutId ? Store.getSetsForWorkout(workoutId) : [];
  if (sets.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  const prIds = new Set();
  for (const ex of Store.getExercises()) {
    for (const id of getPRSetIds(ex.id)) prIds.add(id);
  }

  for (const s of sets) {
    const exercise = Store.getExerciseById(s.exerciseId);
    const li = document.createElement("li");
    li.className = "movement-item";
    li.innerHTML = `
      <div class="info">
        <div class="cat-name">${exercise ? exercise.name : "Esercizio eliminato"}${prIds.has(s.id) ? ' <span class="pr-badge" title="Record personale">\u{1F3C6}</span>' : ""}</div>
        <div class="note">${s.weight} kg × ${s.reps}${s.rir != null ? " · RIR " + s.rir : ""}</div>
      </div>
      <button type="button" class="icon-btn set-delete" data-set-id="${s.id}" aria-label="Elimina serie">&#10005;</button>
    `;
    list.appendChild(li);
  }
}

function handleAddSet() {
  let exerciseId = document.getElementById("setExerciseSelect").value;
  const weight = document.getElementById("setWeight").value;
  const reps = document.getElementById("setReps").value;
  const rir = document.getElementById("setRir").value;

  if (exerciseId === "__new__") {
    const name = document.getElementById("newExerciseName").value.trim();
    const group = document.getElementById("newExerciseGroup").value;
    if (!name) {
      document.getElementById("newExerciseName").focus();
      return;
    }
    exerciseId = Store.addExercise(name, group).id;
  }

  if (!reps || Number(reps) <= 0) {
    document.getElementById("setReps").focus();
    return;
  }

  if (!currentWorkoutId) {
    currentWorkoutId = Store.addWorkout({
      date: document.getElementById("workoutDate").value || toISODate(new Date()),
      note: document.getElementById("workoutNote").value,
    }).id;
  }

  const prevBest = exerciseBestE1RM(exerciseId);
  const set = Store.addSet({ workoutId: currentWorkoutId, exerciseId, weight, reps, rir });
  const isPR = estimate1RM(set.weight, set.reps) > prevBest;
  clearSetStopwatch(true, exerciseId);

  document.getElementById("setWeight").value = "";
  document.getElementById("setReps").value = "";
  document.getElementById("setRir").value = "";
  populateExerciseSelect(exerciseId);
  document.getElementById("newExerciseName").value = "";
  renderSetsList(currentWorkoutId);
  document.getElementById("deleteWorkoutBtn").hidden = false;

  if (isPR) toast("\u{1F3C6} Nuovo record personale!");
}

function openWorkoutModal(mode, workout) {
  const modal = document.getElementById("workoutModal");
  // Don't reset an already-running rest timer / set stopwatch: closing the modal
  // (to peek at Stats, answer a call, etc.) must not interrupt an in-progress rest.
  if (!restTimerInterval && !restStoppedAt) {
    setRestTimer(90);
  }

  document.getElementById("workoutNote").value = "";
  document.getElementById("workoutDate").value = toISODate(new Date());
  document.getElementById("setWeight").value = "";
  document.getElementById("setReps").value = "";
  document.getElementById("setRir").value = "";
  populateExerciseSelect(null);

  if (mode === "edit") {
    currentWorkoutId = workout.id;
    document.getElementById("workoutModalTitle").textContent = "Modifica allenamento";
    document.getElementById("workoutDate").value = workout.date;
    document.getElementById("workoutNote").value = workout.note || "";
    document.getElementById("deleteWorkoutBtn").hidden = false;
  } else {
    currentWorkoutId = null;
    document.getElementById("workoutModalTitle").textContent = "Nuovo allenamento";
    document.getElementById("deleteWorkoutBtn").hidden = true;
  }

  renderSetsList(currentWorkoutId);
  modal.hidden = false;
}

function closeWorkoutModal() {
  // Rest timer / set stopwatch keep running in the background on purpose (see openWorkoutModal).
  if (currentWorkoutId && Store.getSetsForWorkout(currentWorkoutId).length === 0) {
    Store.deleteWorkout(currentWorkoutId);
  }
  document.getElementById("workoutModal").hidden = true;
  currentWorkoutId = null;
  renderAll();
}

function handleDeleteWorkout() {
  if (!currentWorkoutId) return;
  Store.deleteWorkout(currentWorkoutId);
  currentWorkoutId = null;
  stopRestTimer();
  clearSetStopwatch(false);
  document.getElementById("workoutModal").hidden = true;
  renderAll();
}

function formatTimer(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function setRestTimer(seconds) {
  stopRestTimer();
  restTimerRemaining = seconds;
  document.getElementById("restTimerDisplay").textContent = formatTimer(restTimerRemaining);
}

function startRestTimer() {
  clearSetStopwatch(false);
  if (restTimerRemaining <= 0) restTimerRemaining = 90;
  document.getElementById("restTimerToggle").textContent = "Pausa";
  restTimerInterval = setInterval(() => {
    restTimerRemaining--;
    document.getElementById("restTimerDisplay").textContent = formatTimer(Math.max(0, restTimerRemaining));
    if (restTimerRemaining <= 0) {
      stopRestTimer();
      startSetStopwatch();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      toast("Riposo terminato");
    }
  }, 1000);
}

function stopRestTimer() {
  clearInterval(restTimerInterval);
  restTimerInterval = null;
  document.getElementById("restTimerToggle").textContent = "Avvia";
}

function startSetStopwatch() {
  restStoppedAt = Date.now();
  updateSetStopwatchDisplay();
  clearInterval(setStopwatchInterval);
  setStopwatchInterval = setInterval(updateSetStopwatchDisplay, 1000);
}

function updateSetStopwatchDisplay() {
  const el = document.getElementById("setStopwatch");
  if (!restStoppedAt) {
    el.hidden = true;
    return;
  }
  const elapsed = Math.round((Date.now() - restStoppedAt) / 1000);
  const exerciseId = document.getElementById("setExerciseSelect").value;
  const exercise = exerciseId && exerciseId !== "__new__" ? Store.getExerciseById(exerciseId) : null;
  const estimate = exercise && exercise.avgSetSeconds != null
    ? ` · media ${formatTimer(Math.round(exercise.avgSetSeconds))}`
    : "";
  el.hidden = false;
  el.textContent = `Serie in corso: ${formatTimer(elapsed)}${estimate}`;
}

// ponytail: naive [1s, 600s] sanity window discards bogus samples (app left open, etc.);
// a per-exercise outlier filter would be more robust if bad samples show up in practice.
function clearSetStopwatch(record, exerciseId) {
  if (record && restStoppedAt) {
    const elapsed = (Date.now() - restStoppedAt) / 1000;
    if (elapsed >= 1 && elapsed <= 600) Store.recordSetDuration(exerciseId, elapsed);
  }
  restStoppedAt = null;
  clearInterval(setStopwatchInterval);
  setStopwatchInterval = null;
  document.getElementById("setStopwatch").hidden = true;
}

function renderExerciseManager() {
  const list = document.getElementById("exerciseManager");
  const emptyState = document.getElementById("exerciseManagerEmpty");
  const exercises = Store.getExercises();
  const sets = Store.getSets();
  list.innerHTML = "";

  if (exercises.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  for (const ex of exercises) {
    const inUse = sets.some((s) => s.exerciseId === ex.id);
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="cat-name">
        ${ex.name}
        <span class="budget-badge">${ex.muscleGroup}</span>
        ${ex.unit === "bodyweight" ? '<span class="budget-badge">corpo libero</span>' : ""}
      </span>
      <div class="cat-manager-actions">
        <button type="button" class="ex-edit" data-exercise-id="${ex.id}" aria-label="Modifica esercizio">✏️</button>
        <button type="button" class="ex-delete" data-exercise-id="${ex.id}" ${inUse ? "disabled" : ""} title="${inUse ? "Non eliminabile: ha serie registrate" : "Elimina esercizio"}" aria-label="Elimina esercizio">\u{1F5D1}️</button>
      </div>
    `;
    list.appendChild(li);
  }
}

function openExerciseModal(exercise) {
  const modal = document.getElementById("exerciseModal");
  editingExerciseId = exercise.id;
  document.getElementById("exerciseId").value = exercise.id;
  document.getElementById("exerciseName").value = exercise.name;
  document.getElementById("exerciseGroup").value = exercise.muscleGroup;
  document.getElementById("exerciseUnit").value = exercise.unit;
  modal.hidden = false;
}

function closeExerciseModal() {
  document.getElementById("exerciseModal").hidden = true;
  editingExerciseId = null;
}

function handleDeleteExercise(id) {
  const result = Store.deleteExercise(id);
  if (!result.ok) return;
  renderAll();
}

function populateProgressionExerciseSelect() {
  const select = document.getElementById("progressionExerciseSelect");
  const exercises = Store.getExercises();
  const current = select.value || statsExerciseId;
  select.innerHTML = "";

  if (exercises.length === 0) {
    select.innerHTML = '<option value="">Nessun esercizio</option>';
    statsExerciseId = "";
    return;
  }

  for (const ex of exercises) {
    const opt = document.createElement("option");
    opt.value = ex.id;
    opt.textContent = ex.name;
    select.appendChild(opt);
  }
  select.value = exercises.some((e) => e.id === current) ? current : exercises[0].id;
  statsExerciseId = select.value;
}

function computeMuscleVolume(workouts) {
  const workoutIds = new Set(workouts.map((w) => w.id));
  const totals = new Map();
  for (const s of Store.getSets()) {
    if (!workoutIds.has(s.workoutId)) continue;
    const exercise = Store.getExerciseById(s.exerciseId);
    if (!exercise) continue;
    totals.set(exercise.muscleGroup, (totals.get(exercise.muscleGroup) || 0) + s.weight * s.reps);
  }
  return [...totals.entries()]
    .map(([muscleGroup, volume]) => ({ muscleGroup, volume }))
    .sort((a, b) => b.volume - a.volume);
}

function renderProgressionForExercise(exerciseId) {
  if (!exerciseId) {
    renderProgressionChart([]);
    return;
  }
  const workouts = Store.getWorkouts();
  const sets = Store.getSets().filter((s) => s.exerciseId === exerciseId);

  const byWorkoutDate = new Map();
  for (const s of sets) {
    const w = workouts.find((w) => w.id === s.workoutId);
    if (!w) continue;
    const e1rm = estimate1RM(s.weight, s.reps);
    const prev = byWorkoutDate.get(w.date);
    if (!prev || e1rm > prev) byWorkoutDate.set(w.date, e1rm);
  }

  const sortedDates = [...byWorkoutDate.keys()].sort();
  let best = -Infinity;
  const points = sortedDates.map((date) => {
    const value = byWorkoutDate.get(date);
    const pr = value > best;
    if (pr) best = value;
    return { date, value, pr };
  });

  renderProgressionChart(points);
}

function renderStatsView() {
  populateProgressionExerciseSelect();
  renderProgressionForExercise(statsExerciseId);

  const { start, end } = getPeriodBounds(periodType, periodAnchor);
  renderMuscleVolume(computeMuscleVolume(getWorkoutsInRange(start, end)));

  const trendPeriods = getPastPeriods(periodType, periodAnchor, 6).map((p) => ({
    label: p.label,
    value: getWorkoutsInRange(p.start, p.end).length,
  }));
  renderTrend(trendPeriods);

  const today = new Date();
  const workoutDates = new Set(Store.getWorkouts().map((w) => w.date));
  renderStreakCalendar(today.getFullYear(), today.getMonth(), workoutDates);
}

function csvEscape(value) {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportSetsCSV() {
  const workouts = Store.getWorkouts();
  const rows = [["Data", "Esercizio", "Gruppo", "Peso", "Reps", "RIR"]];

  const sorted = [...Store.getSets()].sort((a, b) => {
    const da = workouts.find((w) => w.id === a.workoutId)?.date || "";
    const db = workouts.find((w) => w.id === b.workoutId)?.date || "";
    return da < db ? -1 : 1;
  });

  for (const s of sorted) {
    const w = workouts.find((w) => w.id === s.workoutId);
    const exercise = Store.getExerciseById(s.exerciseId);
    rows.push([
      w ? w.date : "",
      exercise ? exercise.name : "Esercizio eliminato",
      exercise ? exercise.muscleGroup : "",
      s.weight,
      s.reps,
      s.rir != null ? s.rir : "",
    ]);
  }

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `gymtrack-serie-${toISODate(new Date())}.csv`);
}

function exportBackup() {
  const json = JSON.stringify(Store.exportAll(), null, 2);
  downloadBlob(new Blob([json], { type: "application/json" }), `gymtrack-backup-${toISODate(new Date())}.json`);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch {
      alert("File di backup non valido.");
      return;
    }
    if (!confirm("Sostituire tutti i dati attuali con quelli del backup? L'operazione non è reversibile.")) return;
    if (!Store.importAll(data)) {
      alert("File di backup non valido.");
      return;
    }
    renderAll();
    alert("Backup ripristinato.");
  };
  reader.readAsText(file);
}

function switchView(view) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fillMuscleGroupOptions(document.getElementById("newExerciseGroup"));
  fillMuscleGroupOptions(document.getElementById("exerciseGroup"));

  document.getElementById("periodType").addEventListener("change", (e) => {
    periodType = e.target.value;
    periodAnchor = startOfDay(new Date());
    renderAll();
  });
  document.getElementById("periodPrev").addEventListener("click", () => shiftPeriod(-1));
  document.getElementById("periodNext").addEventListener("click", () => shiftPeriod(1));

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  document.getElementById("fab").addEventListener("click", () => openWorkoutModal("add"));
  document.getElementById("closeWorkoutModal").addEventListener("click", closeWorkoutModal);
  document.getElementById("doneWorkoutBtn").addEventListener("click", closeWorkoutModal);
  document.getElementById("deleteWorkoutBtn").addEventListener("click", handleDeleteWorkout);
  document.getElementById("workoutModal").addEventListener("click", (e) => {
    if (e.target.id === "workoutModal") closeWorkoutModal();
  });

  document.getElementById("workoutDate").addEventListener("change", (e) => {
    if (currentWorkoutId) Store.updateWorkout(currentWorkoutId, { date: e.target.value });
  });
  document.getElementById("workoutNote").addEventListener("input", (e) => {
    if (currentWorkoutId) Store.updateWorkout(currentWorkoutId, { note: e.target.value });
  });

  document.getElementById("setExerciseSelect").addEventListener("change", toggleNewExerciseFields);
  document.getElementById("addSetBtn").addEventListener("click", handleAddSet);
  document.getElementById("setsList").addEventListener("click", (e) => {
    const btn = e.target.closest(".set-delete");
    if (!btn) return;
    Store.deleteSet(btn.dataset.setId);
    renderSetsList(currentWorkoutId);
  });

  document.querySelectorAll(".rest-preset").forEach((btn) => {
    btn.addEventListener("click", () => setRestTimer(Number(btn.dataset.seconds)));
  });
  document.getElementById("restTimerToggle").addEventListener("click", () => {
    if (restTimerInterval) {
      stopRestTimer();
      startSetStopwatch();
    } else {
      startRestTimer();
    }
  });

  document.getElementById("addExerciseBtn").addEventListener("click", () => {
    document.getElementById("exerciseModalTitle").textContent = "Nuovo esercizio";
    editingExerciseId = null;
    document.getElementById("exerciseId").value = "";
    document.getElementById("exerciseName").value = "";
    document.getElementById("exerciseGroup").value = MUSCLE_GROUPS[0];
    document.getElementById("exerciseUnit").value = "kg";
    document.getElementById("exerciseModal").hidden = false;
  });
  document.getElementById("exerciseManager").addEventListener("click", (e) => {
    const editBtn = e.target.closest(".ex-edit");
    if (editBtn) {
      const exercise = Store.getExerciseById(editBtn.dataset.exerciseId);
      if (exercise) {
        document.getElementById("exerciseModalTitle").textContent = "Modifica esercizio";
        openExerciseModal(exercise);
      }
      return;
    }
    const deleteBtn = e.target.closest(".ex-delete");
    if (deleteBtn && !deleteBtn.disabled) handleDeleteExercise(deleteBtn.dataset.exerciseId);
  });
  document.getElementById("closeExerciseModal").addEventListener("click", closeExerciseModal);
  document.getElementById("exerciseModal").addEventListener("click", (e) => {
    if (e.target.id === "exerciseModal") closeExerciseModal();
  });
  document.getElementById("exerciseForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("exerciseName").value.trim();
    const muscleGroup = document.getElementById("exerciseGroup").value;
    const unit = document.getElementById("exerciseUnit").value;
    if (!name) return;

    if (editingExerciseId) {
      Store.updateExercise(editingExerciseId, { name, muscleGroup, unit });
    } else {
      Store.addExercise(name, muscleGroup, unit);
    }
    closeExerciseModal();
    renderAll();
  });

  document.getElementById("progressionExerciseSelect").addEventListener("change", (e) => {
    statsExerciseId = e.target.value;
    renderProgressionForExercise(statsExerciseId);
  });

  document.getElementById("exportCsvBtn").addEventListener("click", exportSetsCSV);
  document.getElementById("exportBackupBtn").addEventListener("click", exportBackup);
  document.getElementById("importBackupInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) importBackup(file);
  });

  registerServiceWorker();
  renderAll();
});

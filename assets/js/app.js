const MONTHS_IT = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const MONTHS_IT_SHORT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

const ICON_EDIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>';
const ICON_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';
const ICON_TROPHY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M17 4H7v6a5 5 0 0 0 10 0V4Z"></path><path d="M5 4H3v2a4 4 0 0 0 4 4"></path><path d="M19 4h2v2a4 4 0 0 1-4 4"></path></svg>';
const ICON_FLAME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>';
const PR_BADGE_HTML = `<span class="pr-badge" title="Record personale">${ICON_TROPHY}</span>`;

let periodType = "week";
let periodAnchor = startOfDay(new Date());
let currentWorkoutId = null;
let editingExerciseId = null;
let statsExerciseId = "";
let restTimerInterval = null;
let restTimerDuration = 90;
let restTimerRemaining = 90;
let restStoppedAt = null;
let setStopwatchInterval = null;
let startingRoutineId = null;
let editingRoutineId = null;

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

function toast(html) {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = html;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function renderAll() {
  document.getElementById("periodLabel").textContent = getPeriodLabel(periodType, periodAnchor);

  const { start, end } = getPeriodBounds(periodType, periodAnchor);
  const workouts = getWorkoutsInRange(start, end);

  renderRoutinesSection();
  renderHomeTotals(workouts);
  renderStreakChip();
  renderWorkoutsList(workouts);
  renderExerciseManager();
  renderRoutineGroupManager();
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
  el.innerHTML = streak > 0
    ? `<span class="streak-flame">${ICON_FLAME}</span>${streak} settiman${streak === 1 ? "a" : "e"} di fila`
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
    const routine = w.routineId ? Store.getRoutineById(w.routineId) : null;
    const title = routine ? routine.name : (groups.join(", ") || "Allenamento");
    const dateLabel = new Date(w.date + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" });

    const li = document.createElement("li");
    li.className = "movement-item";
    li.innerHTML = `
      <div class="info">
        <div class="cat-name">${title}</div>
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

function renderRoutinesSection() {
  const container = document.getElementById("routinesSection");
  const emptyState = document.getElementById("routinesEmpty");
  const groups = Store.getRoutineGroups();
  const routines = Store.getRoutines();
  container.innerHTML = "";

  if (routines.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  const buckets = groups.map((g) => ({ group: g, routines: routines.filter((r) => r.groupId === g.id) }));
  const ungrouped = routines.filter((r) => !groups.some((g) => g.id === r.groupId));
  if (ungrouped.length > 0) buckets.push({ group: { id: null, name: "Senza gruppo" }, routines: ungrouped });

  for (const bucket of buckets) {
    if (bucket.routines.length === 0) continue;
    const groupDiv = document.createElement("div");
    groupDiv.className = "routine-group";
    const title = document.createElement("h3");
    title.className = "routine-group-title";
    title.textContent = bucket.group.name;
    groupDiv.appendChild(title);

    const list = document.createElement("ul");
    list.className = "routine-list";
    for (const routine of bucket.routines) {
      const li = document.createElement("li");
      li.className = "routine-card";
      li.innerHTML = `
        <div class="routine-info">
          <span class="routine-name">${routine.name}</span>
          <span class="routine-meta">${routine.items.length} esercizi</span>
        </div>
        <div class="routine-actions">
          <button type="button" class="icon-btn routine-edit-btn" data-routine-id="${routine.id}" aria-label="Modifica scheda">${ICON_EDIT}</button>
          <button type="button" class="btn primary routine-start-btn" data-routine-id="${routine.id}">Avvia allenamento</button>
        </div>
      `;
      list.appendChild(li);
    }
    groupDiv.appendChild(list);
    container.appendChild(groupDiv);
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
        <div class="cat-name">${exercise ? exercise.name : "Esercizio eliminato"}${prIds.has(s.id) ? " " + PR_BADGE_HTML : ""}</div>
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
      routineId: startingRoutineId,
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

  if (isPR) toast(`${ICON_TROPHY} Nuovo record personale!`);
}

function openWorkoutModal(mode, workout, routineId) {
  const modal = document.getElementById("workoutModal");

  document.getElementById("workoutNote").value = "";
  document.getElementById("workoutDate").value = toISODate(new Date());
  document.getElementById("setWeight").value = "";
  document.getElementById("setReps").value = "";
  document.getElementById("setRir").value = "";

  let routine = null;
  if (mode === "edit") {
    currentWorkoutId = workout.id;
    startingRoutineId = workout.routineId || null;
    routine = startingRoutineId ? Store.getRoutineById(startingRoutineId) : null;
    document.getElementById("workoutDate").value = workout.date;
    document.getElementById("workoutNote").value = workout.note || "";
    document.getElementById("deleteWorkoutBtn").hidden = false;
    populateExerciseSelect(null);
  } else {
    currentWorkoutId = null;
    startingRoutineId = routineId || null;
    routine = startingRoutineId ? Store.getRoutineById(startingRoutineId) : null;
    document.getElementById("deleteWorkoutBtn").hidden = true;
    const firstItem = routine && routine.items[0] ? routine.items[0] : null;
    populateExerciseSelect(firstItem ? firstItem.exerciseId : null);
    if (firstItem) document.getElementById("setReps").value = firstItem.reps;
  }
  document.getElementById("workoutModalTitle").textContent = routine ? routine.name : (mode === "edit" ? "Modifica allenamento" : "Nuovo allenamento");

  // Don't reset an already-running rest timer / set stopwatch: closing the modal
  // (to peek at Stats, answer a call, etc.) must not interrupt an in-progress rest.
  if (!restTimerInterval && !restStoppedAt) {
    resetRestTimer();
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
  startingRoutineId = null;
  renderAll();
}

function handleDeleteWorkout() {
  if (!currentWorkoutId) return;
  Store.deleteWorkout(currentWorkoutId);
  currentWorkoutId = null;
  startingRoutineId = null;
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

function getExerciseRest(exerciseId) {
  const exercise = exerciseId ? Store.getExerciseById(exerciseId) : null;
  return exercise && exercise.restSeconds != null ? exercise.restSeconds : 90;
}

function updateRestTimerDisplay() {
  document.getElementById("restTimerDisplay").textContent = formatTimer(Math.max(0, restTimerRemaining));
  const btn = document.getElementById("restTimerToggle");
  if (restTimerInterval) btn.textContent = "Pausa";
  else if (restTimerRemaining > 0 && restTimerRemaining < restTimerDuration) btn.textContent = "Riprendi";
  else btn.textContent = "Avvia";
}

// Resets to the currently selected exercise's configured rest time, stopped and ready.
// Used on modal open, on natural expiry, on Azzera, and (guarded) when switching exercise while idle.
function resetRestTimer() {
  clearInterval(restTimerInterval);
  restTimerInterval = null;
  const exerciseId = document.getElementById("setExerciseSelect")?.value;
  if (exerciseId && exerciseId !== "__new__") restTimerDuration = getExerciseRest(exerciseId);
  restTimerRemaining = restTimerDuration;
  updateRestTimerDisplay();
}

function startRestTimer() {
  if (restTimerRemaining <= 0) restTimerRemaining = restTimerDuration;
  restTimerInterval = setInterval(() => {
    restTimerRemaining--;
    updateRestTimerDisplay();
    if (restTimerRemaining <= 0) {
      stopRestTimer();
      startSetStopwatch();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      toast("Riposo terminato");
      resetRestTimer();
    }
  }, 1000);
  updateRestTimerDisplay();
}

function stopRestTimer() {
  clearInterval(restTimerInterval);
  restTimerInterval = null;
  updateRestTimerDisplay();
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
        <span class="budget-badge">riposo ${formatTimer(getExerciseRest(ex.id))}</span>
      </span>
      <div class="cat-manager-actions">
        <button type="button" class="ex-edit" data-exercise-id="${ex.id}" aria-label="Modifica esercizio">${ICON_EDIT}</button>
        <button type="button" class="ex-delete" data-exercise-id="${ex.id}" ${inUse ? "disabled" : ""} title="${inUse ? "Non eliminabile: ha serie registrate" : "Elimina esercizio"}" aria-label="Elimina esercizio">${ICON_TRASH}</button>
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
  document.getElementById("exerciseRest").value = getExerciseRest(exercise.id);
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

// --- Routines (schede) ---
// The exercise list is edited as a local draft (editingRoutineItems) and only
// persisted to Store on "Salva scheda", same deferred pattern as the exercise edit form.
// Each item: { exerciseId, sets, reps, rir }. Rest time stays on the exercise itself (global).
let editingRoutineItems = [];

function renderRoutineGroupManager() {
  const container = document.getElementById("routineGroupManager");
  const emptyState = document.getElementById("routineGroupManagerEmpty");
  const groups = Store.getRoutineGroups();
  const routines = Store.getRoutines();
  container.innerHTML = "";

  if (routines.length === 0 && groups.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  const buckets = groups.map((g) => ({ group: g, routines: routines.filter((r) => r.groupId === g.id) }));
  const ungrouped = routines.filter((r) => !groups.some((g) => g.id === r.groupId));
  if (ungrouped.length > 0) buckets.push({ group: { id: null, name: "Senza gruppo" }, routines: ungrouped });

  for (const bucket of buckets) {
    const wrap = document.createElement("div");
    wrap.className = "routine-group-manage";
    wrap.innerHTML = `
      <div class="routine-group-header">
        <span>${bucket.group.name}</span>
        ${bucket.group.id ? `<div class="cat-manager-actions"><button type="button" class="rg-delete" data-group-id="${bucket.group.id}" ${bucket.routines.length > 0 ? "disabled" : ""} title="${bucket.routines.length > 0 ? "Non eliminabile: ha schede collegate" : "Elimina gruppo"}" aria-label="Elimina gruppo">${ICON_TRASH}</button></div>` : ""}
      </div>
      <ul class="category-manager"></ul>
    `;
    const list = wrap.querySelector("ul");
    for (const routine of bucket.routines) {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="cat-name">${routine.name} <span class="budget-badge">${routine.items.length} esercizi</span></span>
        <div class="cat-manager-actions">
          <button type="button" class="routine-edit" data-routine-id="${routine.id}" aria-label="Modifica scheda">${ICON_EDIT}</button>
          <button type="button" class="routine-delete" data-routine-id="${routine.id}" aria-label="Elimina scheda">${ICON_TRASH}</button>
        </div>
      `;
      list.appendChild(li);
    }
    container.appendChild(wrap);
  }
}

function populateRoutineGroupSelect(selectedId) {
  const select = document.getElementById("routineGroupSelect");
  const groups = Store.getRoutineGroups();
  select.innerHTML = "";
  for (const g of groups) {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = g.name;
    select.appendChild(opt);
  }
  const newOpt = document.createElement("option");
  newOpt.value = "__new__";
  newOpt.textContent = "+ Nuovo gruppo";
  select.appendChild(newOpt);

  select.value = selectedId && groups.some((g) => g.id === selectedId) ? selectedId : (groups[0] ? groups[0].id : "__new__");
  toggleNewRoutineGroupFields();
}

function toggleNewRoutineGroupFields() {
  const select = document.getElementById("routineGroupSelect");
  document.getElementById("newRoutineGroupFields").hidden = select.value !== "__new__";
}

function populateRoutineExerciseSelect() {
  const select = document.getElementById("routineExerciseSelect");
  const usedIds = editingRoutineItems.map((it) => it.exerciseId);
  const available = Store.getExercises().filter((e) => !usedIds.includes(e.id));
  select.innerHTML = "";
  for (const ex of available) {
    const opt = document.createElement("option");
    opt.value = ex.id;
    opt.textContent = ex.name;
    select.appendChild(opt);
  }
  const newOpt = document.createElement("option");
  newOpt.value = "__new__";
  newOpt.textContent = "+ Nuovo esercizio";
  select.appendChild(newOpt);

  select.value = available[0] ? available[0].id : "__new__";
  document.getElementById("routineExerciseRest").value = available[0] ? getExerciseRest(available[0].id) : 90;
  document.getElementById("routineExerciseSets").value = 3;
  document.getElementById("routineExerciseReps").value = 8;
  document.getElementById("routineExerciseRir").value = "";
  toggleNewRoutineExerciseFields();
}

function toggleNewRoutineExerciseFields() {
  const select = document.getElementById("routineExerciseSelect");
  document.getElementById("newRoutineExerciseFields").hidden = select.value !== "__new__";
}

function renderRoutineExercisesList() {
  const list = document.getElementById("routineExercisesList");
  const emptyState = document.getElementById("routineExercisesEmpty");
  list.innerHTML = "";

  if (editingRoutineItems.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  editingRoutineItems.forEach((item, idx) => {
    const exercise = Store.getExerciseById(item.exerciseId);
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="cat-name">${exercise ? exercise.name : "Esercizio eliminato"}
        <span class="budget-badge">${item.sets}×${item.reps}${item.rir != null ? " · RIR " + item.rir : ""}</span>
        <span class="budget-badge">riposo ${formatTimer(getExerciseRest(item.exerciseId))}</span>
      </span>
      <div class="cat-manager-actions">
        <button type="button" class="rex-move" data-index="${idx}" data-direction="-1" ${idx === 0 ? "disabled" : ""} aria-label="Sposta su">&#8593;</button>
        <button type="button" class="rex-move" data-index="${idx}" data-direction="1" ${idx === editingRoutineItems.length - 1 ? "disabled" : ""} aria-label="Sposta giù">&#8595;</button>
        <button type="button" class="rex-remove" data-index="${idx}" aria-label="Rimuovi">&#10005;</button>
      </div>
    `;
    list.appendChild(li);
  });
}

function handleAddExerciseToRoutine() {
  let exerciseId = document.getElementById("routineExerciseSelect").value;
  const restSeconds = Math.max(0, Number(document.getElementById("routineExerciseRest").value) || 0);
  const sets = Math.max(1, Number(document.getElementById("routineExerciseSets").value) || 1);
  const reps = Math.max(1, Number(document.getElementById("routineExerciseReps").value) || 1);
  const rirRaw = document.getElementById("routineExerciseRir").value;
  const rir = rirRaw === "" ? null : Math.min(10, Math.max(0, Number(rirRaw)));

  if (exerciseId === "__new__") {
    const name = document.getElementById("newRoutineExerciseName").value.trim();
    const group = document.getElementById("newRoutineExerciseGroup").value;
    if (!name) {
      document.getElementById("newRoutineExerciseName").focus();
      return;
    }
    exerciseId = Store.addExercise(name, group, "kg", restSeconds).id;
  } else {
    Store.updateExercise(exerciseId, { restSeconds });
  }

  editingRoutineItems.push({ exerciseId, sets, reps, rir });
  document.getElementById("newRoutineExerciseName").value = "";
  populateRoutineExerciseSelect();
  renderRoutineExercisesList();
}

function handleMoveRoutineExercise(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= editingRoutineItems.length) return;
  [editingRoutineItems[index], editingRoutineItems[newIndex]] = [editingRoutineItems[newIndex], editingRoutineItems[index]];
  renderRoutineExercisesList();
}

function handleRemoveRoutineExercise(index) {
  editingRoutineItems.splice(index, 1);
  renderRoutineExercisesList();
  populateRoutineExerciseSelect();
}

function openRoutineModal(mode, routine) {
  document.getElementById("routineName").value = "";
  document.getElementById("newRoutineGroupName").value = "";

  if (mode === "edit") {
    editingRoutineId = routine.id;
    document.getElementById("routineModalTitle").textContent = "Modifica scheda";
    document.getElementById("routineName").value = routine.name;
    populateRoutineGroupSelect(routine.groupId);
    editingRoutineItems = routine.items.map((it) => ({ ...it }));
    document.getElementById("deleteRoutineBtn").hidden = false;
  } else {
    editingRoutineId = null;
    document.getElementById("routineModalTitle").textContent = "Nuova scheda";
    populateRoutineGroupSelect(null);
    editingRoutineItems = [];
    document.getElementById("deleteRoutineBtn").hidden = true;
  }

  populateRoutineExerciseSelect();
  renderRoutineExercisesList();
  document.getElementById("routineModal").hidden = false;
}

function closeRoutineModal() {
  document.getElementById("routineModal").hidden = true;
  editingRoutineId = null;
  editingRoutineItems = [];
}

function handleSaveRoutine() {
  const name = document.getElementById("routineName").value.trim();
  if (!name) {
    document.getElementById("routineName").focus();
    return;
  }

  let groupId = document.getElementById("routineGroupSelect").value;
  if (groupId === "__new__") {
    const groupName = document.getElementById("newRoutineGroupName").value.trim();
    if (!groupName) {
      document.getElementById("newRoutineGroupName").focus();
      return;
    }
    groupId = Store.addRoutineGroup(groupName).id;
  }

  if (editingRoutineId) {
    Store.updateRoutine(editingRoutineId, { name, groupId, items: editingRoutineItems });
  } else {
    Store.addRoutine({ groupId, name, items: editingRoutineItems });
  }

  closeRoutineModal();
  renderAll();
}

function handleDeleteRoutine() {
  if (!editingRoutineId) return;
  Store.deleteRoutine(editingRoutineId);
  closeRoutineModal();
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
  fillMuscleGroupOptions(document.getElementById("newRoutineExerciseGroup"));

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

  document.getElementById("setExerciseSelect").addEventListener("change", () => {
    toggleNewExerciseFields();
    // Only resync the ready-to-start duration when idle/fresh; don't disrupt a running or paused rest.
    if (!restTimerInterval && restTimerRemaining === restTimerDuration) {
      resetRestTimer();
    }
  });
  document.getElementById("addSetBtn").addEventListener("click", handleAddSet);
  document.getElementById("setsList").addEventListener("click", (e) => {
    const btn = e.target.closest(".set-delete");
    if (!btn) return;
    Store.deleteSet(btn.dataset.setId);
    renderSetsList(currentWorkoutId);
  });

  document.getElementById("restTimerToggle").addEventListener("click", () => {
    if (restTimerInterval) stopRestTimer();
    else startRestTimer();
  });
  document.getElementById("restTimerReset").addEventListener("click", resetRestTimer);

  document.getElementById("addExerciseBtn").addEventListener("click", () => {
    document.getElementById("exerciseModalTitle").textContent = "Nuovo esercizio";
    editingExerciseId = null;
    document.getElementById("exerciseId").value = "";
    document.getElementById("exerciseName").value = "";
    document.getElementById("exerciseGroup").value = MUSCLE_GROUPS[0];
    document.getElementById("exerciseUnit").value = "kg";
    document.getElementById("exerciseRest").value = 90;
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
    const restSeconds = Math.max(0, Number(document.getElementById("exerciseRest").value) || 0);
    if (!name) return;

    if (editingExerciseId) {
      Store.updateExercise(editingExerciseId, { name, muscleGroup, unit, restSeconds });
    } else {
      Store.addExercise(name, muscleGroup, unit, restSeconds);
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

  document.getElementById("addRoutineBtn").addEventListener("click", () => openRoutineModal("add"));
  document.getElementById("routinesSection").addEventListener("click", (e) => {
    const startBtn = e.target.closest(".routine-start-btn");
    if (startBtn) {
      openWorkoutModal("add", null, startBtn.dataset.routineId);
      return;
    }
    const editBtn = e.target.closest(".routine-edit-btn");
    if (editBtn) {
      const routine = Store.getRoutineById(editBtn.dataset.routineId);
      if (routine) openRoutineModal("edit", routine);
    }
  });
  document.getElementById("routineGroupManager").addEventListener("click", (e) => {
    const editBtn = e.target.closest(".routine-edit");
    if (editBtn) {
      const routine = Store.getRoutineById(editBtn.dataset.routineId);
      if (routine) openRoutineModal("edit", routine);
      return;
    }
    const delBtn = e.target.closest(".routine-delete");
    if (delBtn) {
      Store.deleteRoutine(delBtn.dataset.routineId);
      renderAll();
      return;
    }
    const rgDelBtn = e.target.closest(".rg-delete");
    if (rgDelBtn && !rgDelBtn.disabled) {
      Store.deleteRoutineGroup(rgDelBtn.dataset.groupId);
      renderAll();
    }
  });
  document.getElementById("closeRoutineModal").addEventListener("click", closeRoutineModal);
  document.getElementById("routineModal").addEventListener("click", (e) => {
    if (e.target.id === "routineModal") closeRoutineModal();
  });
  document.getElementById("routineGroupSelect").addEventListener("change", toggleNewRoutineGroupFields);
  document.getElementById("routineExerciseSelect").addEventListener("change", () => {
    toggleNewRoutineExerciseFields();
    const val = document.getElementById("routineExerciseSelect").value;
    document.getElementById("routineExerciseRest").value = val && val !== "__new__" ? getExerciseRest(val) : 90;
  });
  document.getElementById("addRoutineExerciseBtn").addEventListener("click", handleAddExerciseToRoutine);
  document.getElementById("routineExercisesList").addEventListener("click", (e) => {
    const moveBtn = e.target.closest(".rex-move");
    if (moveBtn) {
      handleMoveRoutineExercise(Number(moveBtn.dataset.index), Number(moveBtn.dataset.direction));
      return;
    }
    const removeBtn = e.target.closest(".rex-remove");
    if (removeBtn) handleRemoveRoutineExercise(Number(removeBtn.dataset.index));
  });
  document.getElementById("saveRoutineBtn").addEventListener("click", handleSaveRoutine);
  document.getElementById("deleteRoutineBtn").addEventListener("click", handleDeleteRoutine);

  registerServiceWorker();
  renderAll();
});

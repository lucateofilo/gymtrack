const STORAGE_KEY = "gymtrack_data";
const MUSCLE_GROUPS = ["Petto", "Schiena", "Gambe", "Spalle", "Braccia", "Core", "Cardio"];

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { exercises: [], workouts: [], sets: [] };
  }
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data.exercises)) data.exercises = [];
    if (!Array.isArray(data.workouts)) data.workouts = [];
    if (!Array.isArray(data.sets)) data.sets = [];
    return data;
  } catch {
    return { exercises: [], workouts: [], sets: [] };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function genId() {
  return crypto.randomUUID();
}

function updateEntity(list, id, changes) {
  const item = list.find((x) => x.id === id);
  if (!item) return null;
  Object.assign(item, changes);
  return item;
}

function estimate1RM(weight, reps) {
  return reps <= 1 ? weight : weight * (1 + reps / 30);
}

const Store = {
  getExercises() {
    return loadData().exercises;
  },

  addExercise(name, muscleGroup, unit = "kg") {
    const data = loadData();
    const exercise = { id: genId(), name: name.trim(), muscleGroup, unit };
    data.exercises.push(exercise);
    saveData(data);
    return exercise;
  },

  updateExercise(id, changes) {
    const data = loadData();
    const exercise = updateEntity(data.exercises, id, changes);
    if (exercise) saveData(data);
    return exercise;
  },

  deleteExercise(id) {
    const data = loadData();
    const inUse = data.sets.some((s) => s.exerciseId === id);
    if (inUse) return { ok: false, reason: "in_use" };
    data.exercises = data.exercises.filter((e) => e.id !== id);
    saveData(data);
    return { ok: true };
  },

  recordSetDuration(exerciseId, seconds) {
    const data = loadData();
    const exercise = data.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;
    exercise.avgSetSeconds = exercise.avgSetSeconds == null
      ? seconds
      : exercise.avgSetSeconds * 0.7 + seconds * 0.3;
    saveData(data);
  },

  getExerciseById(id) {
    return loadData().exercises.find((e) => e.id === id) || null;
  },

  getWorkouts() {
    return loadData().workouts;
  },

  addWorkout({ date, note = "" }) {
    const data = loadData();
    const workout = { id: genId(), date, note: note.trim() };
    data.workouts.push(workout);
    saveData(data);
    return workout;
  },

  updateWorkout(id, changes) {
    const data = loadData();
    const workout = updateEntity(data.workouts, id, changes);
    if (workout) saveData(data);
    return workout;
  },

  deleteWorkout(id) {
    const data = loadData();
    data.workouts = data.workouts.filter((w) => w.id !== id);
    data.sets = data.sets.filter((s) => s.workoutId !== id);
    saveData(data);
  },

  getSets() {
    return loadData().sets;
  },

  getSetsForWorkout(workoutId) {
    return loadData().sets.filter((s) => s.workoutId === workoutId);
  },

  addSet({ workoutId, exerciseId, weight, reps, rir = null }) {
    const data = loadData();
    const set = {
      id: genId(),
      workoutId,
      exerciseId,
      weight: Math.abs(Number(weight)) || 0,
      reps: Math.max(0, Math.round(Number(reps))) || 0,
      rir: rir === "" || rir === null || rir === undefined ? null : Number(rir),
    };
    data.sets.push(set);
    saveData(data);
    return set;
  },

  deleteSet(id) {
    const data = loadData();
    data.sets = data.sets.filter((s) => s.id !== id);
    saveData(data);
  },

  exportAll() {
    return loadData();
  },

  importAll(data) {
    if (!data || typeof data !== "object") return false;
    saveData({
      exercises: Array.isArray(data.exercises) ? data.exercises : [],
      workouts: Array.isArray(data.workouts) ? data.workouts : [],
      sets: Array.isArray(data.sets) ? data.sets : [],
    });
    return true;
  },
};

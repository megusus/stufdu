// ════════════════════════════════════════
// ── Habit Streaks ──
// ════════════════════════════════════════

import { Storage } from './storage.js';

const HABITS_KEY  = 'habits';
const LOG_KEY     = 'habit-log';

// Preset habits users can quickly add
export const HABIT_PRESETS = [
  { name: 'Exercise',  icon: '🏃', color: '#00e676' },
  { name: 'Reading',   icon: '📖', color: '#00d2ff' },
  { name: 'Water',     icon: '💧', color: '#00bcd4' },
  { name: 'Sleep 8h',  icon: '😴', color: '#7c4dff' },
  { name: 'Meditate',  icon: '🧘', color: '#ffab00' },
  { name: 'Stretch',   icon: '🤸', color: '#ff6d00' },
  { name: 'French',    icon: '🇫🇷', color: '#e94560' },
  { name: 'Journal',   icon: '✍️', color: '#cf7aff' },
];

// ── Load / Save ──

export function loadHabits() {
  return Storage.get(HABITS_KEY, []);
}

function _saveHabits(habits) {
  Storage.set(HABITS_KEY, habits);
}

export function loadHabitLog() {
  return Storage.get(LOG_KEY, {});
}

function _saveHabitLog(log) {
  Storage.set(LOG_KEY, log);
}

// ── CRUD ──

export function addHabit({ name, icon, color, frequency, customDays }) {
  if (!name.trim()) return null;
  const habits = loadHabits();
  const habit = {
    id: 'habit-' + Date.now(),
    name: name.trim(),
    icon: icon || '⭐',
    color: color || '#00d2ff',
    frequency: frequency || 'daily',
    customDays: customDays || [],
    createdAt: new Date().toISOString(),
  };
  habits.push(habit);
  _saveHabits(habits);
  return habit;
}

export function removeHabit(id) {
  _saveHabits(loadHabits().filter(h => h.id !== id));
  // Remove from log too
  const log = loadHabitLog();
  Object.keys(log).forEach(date => { delete log[date][id]; });
  _saveHabitLog(log);
}

export function updateHabit(id, changes) {
  const habits = loadHabits().map(h => h.id === id ? { ...h, ...changes } : h);
  _saveHabits(habits);
}

// ── Daily Check-in ──

export function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function isHabitDoneToday(habitId) {
  const log = loadHabitLog();
  return !!(log[getTodayKey()]?.[habitId]);
}

export function toggleHabitToday(habitId) {
  const log = loadHabitLog();
  const key = getTodayKey();
  if (!log[key]) log[key] = {};
  if (log[key][habitId]) {
    delete log[key][habitId];
  } else {
    log[key][habitId] = true;
  }
  _saveHabitLog(log);
  return !!log[key][habitId];
}

// ── Analytics ──

/** Returns how many of the last N days a habit was completed */
export function getHabitStreak(habitId) {
  const log = loadHabitLog();
  const today = new Date();
  let streak = 0, best = 0, current = 0;
  // Count streak from today backwards
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (log[k]?.[habitId]) {
      if (i === 0 || streak > 0) streak++;
    } else if (i > 0) {
      break;
    }
  }
  // Count best streak
  const keys = Object.keys(log).sort();
  keys.forEach(k => {
    if (log[k]?.[habitId]) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  });
  return { streak, best };
}

/** Returns a mini 28-day grid array for a habit */
export function getHabitGrid(habitId) {
  const log = loadHabitLog();
  const today = new Date();
  const grid = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    grid.push({ date: k, done: !!(log[k]?.[habitId]) });
  }
  return grid;
}

/** Weekly completion count for a habit */
export function getHabitWeeklyCount(habitId) {
  const log = loadHabitLog();
  const today = new Date();
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (log[k]?.[habitId]) count++;
  }
  return count;
}

// ── Streak Freeze / Rest Days ──

const FREEZE_KEY = 'habit-freezes';

export function loadFreezes() { return Storage.get(FREEZE_KEY, { tokens: 2, used: {} }); }
function _saveFreezes(data) { Storage.set(FREEZE_KEY, data); }

export function getAvailableFreezes() { return loadFreezes().tokens || 0; }

export function useStreakFreeze(habitId) {
  const data = loadFreezes();
  if (data.tokens <= 0) return false;
  const key = getTodayKey();
  if (!data.used[key]) data.used[key] = [];
  if (data.used[key].includes(habitId)) return false;
  data.used[key].push(habitId);
  data.tokens--;
  _saveFreezes(data);
  return true;
}

export function addFreezeToken() {
  const data = loadFreezes();
  data.tokens = Math.min((data.tokens || 0) + 1, 5);
  _saveFreezes(data);
}

export function isFreezedToday(habitId) {
  const data = loadFreezes();
  return (data.used[getTodayKey()] || []).includes(habitId);
}

export function getHabitStreakWithFreezes(habitId) {
  const log = loadHabitLog();
  const freezes = loadFreezes();
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const done = log[k]?.[habitId];
    const frozen = (freezes.used[k] || []).includes(habitId);
    if (done || frozen) {
      if (i === 0 || streak > 0) streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

/** Returns today's completion ratio for all habits */
export function getTodayHabitSummary() {
  const habits = loadHabits();
  const log = loadHabitLog();
  const key = getTodayKey();
  const done = habits.filter(h => log[key]?.[h.id]).length;
  return { done, total: habits.length };
}

// ════════════════════════════════════════
// ── Task Time Tracking ──
// ════════════════════════════════════════

import { Storage } from './storage.js';

const LOG_KEY = 'time-log';

const TIMER_SESSION_KEY = 'active-timer';

let _activeTimer = null;
let _tickInterval = null;

function _persistTimer() {
  if (_activeTimer) {
    try { sessionStorage.setItem(TIMER_SESSION_KEY, JSON.stringify(_activeTimer)); }
    catch {}
  } else {
    sessionStorage.removeItem(TIMER_SESSION_KEY);
  }
}

function _restoreTimer(onTick) {
  try {
    const raw = sessionStorage.getItem(TIMER_SESSION_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved?.taskId && saved?.startedAt) {
      _activeTimer = saved;
      if (onTick) _tickInterval = setInterval(() => onTick(), 1000);
    }
  } catch {}
}

export function initTimerRestore(onTick) { _restoreTimer(onTick); }

export function getActiveTimer() { return _activeTimer; }

export function startTimer(taskId, taskText, onTick) {
  if (_activeTimer) stopTimer();
  _activeTimer = { taskId, taskText, startedAt: Date.now() };
  _persistTimer();
  _tickInterval = setInterval(() => { if (onTick) onTick(); }, 1000);
}

export function stopTimer() {
  if (!_activeTimer) return 0;
  const elapsed = Math.round((Date.now() - _activeTimer.startedAt) / 60000);
  if (elapsed >= 1) _logTime(_activeTimer.taskId, elapsed);
  clearInterval(_tickInterval);
  _tickInterval = null;
  const result = { ..._activeTimer, elapsed };
  _activeTimer = null;
  _persistTimer();
  return result;
}

export function getElapsedSeconds() {
  if (!_activeTimer) return 0;
  return Math.floor((Date.now() - _activeTimer.startedAt) / 1000);
}

// ── Persistence ──

export function loadTimeLog() {
  return Storage.get(LOG_KEY, {});
}

function _saveTimeLog(log) {
  Storage.set(LOG_KEY, log);
}

function _todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function _logTime(taskId, minutes) {
  if (minutes < 1) return;
  const log = loadTimeLog();
  const key = _todayKey();
  if (!log[key]) log[key] = {};
  log[key][taskId] = (log[key][taskId] || 0) + minutes;
  // Prune older than 90 days
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
  const cutStr = cutoff.toISOString().slice(0,10);
  Object.keys(log).forEach(k => { if (k < cutStr) delete log[k]; });
  _saveTimeLog(log);
}

/** Get minutes tracked for a task today */
export function getTodayTaskTime(taskId) {
  const log = loadTimeLog();
  return log[_todayKey()]?.[taskId] || 0;
}

/** Total minutes tracked today across all tasks */
export function getTodayTotalMinutes() {
  const log = loadTimeLog();
  const today = log[_todayKey()] || {};
  return Object.values(today).reduce((a, b) => a + b, 0);
}

/** Per-category breakdown for the current week */
export function getWeeklyTimeByCategory(schedule, DAYS) {
  const log = loadTimeLog();
  const now = new Date();
  const totals = {};

  // Build taskId → cat map
  const catMap = {};
  DAYS.forEach(day => {
    (schedule[day]?.sections || []).forEach(sec => {
      sec.items.forEach(item => { catMap[item.id] = item.cat; });
    });
  });

  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  for (let i = 0; i <= dow; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!log[k]) continue;
    Object.entries(log[k]).forEach(([taskId, mins]) => {
      const cat = catMap[taskId] || 'unknown';
      totals[cat] = (totals[cat] || 0) + mins;
    });
  }
  return totals;
}

export function getWeeklyTotalMinutes(schedule, DAYS) {
  const bycat = getWeeklyTimeByCategory(schedule, DAYS);
  return Object.values(bycat).reduce((a, b) => a + b, 0);
}

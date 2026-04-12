// ════════════════════════════════════════
// ── Analytics & Intelligence ──
// ════════════════════════════════════════

import { Storage } from './storage.js';
import { DAYS, schedule } from './schedule.js';
import { state, loadHistory } from './state.js';

const COMPLETION_TIMES_KEY = 'completion-times'; // { taskId: 'HH:MM' }

// ── Completion time logging ──

export function logCompletionTime(taskId) {
  const times = Storage.get(COMPLETION_TIMES_KEY, {});
  const now = new Date();
  times[taskId] = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  Storage.set(COMPLETION_TIMES_KEY, times);
}

export function loadCompletionTimes() {
  return Storage.get(COMPLETION_TIMES_KEY, {});
}

// ── Time-of-day patterns ──

/** Returns hourly completion counts [hour0..hour23] */
export function getHourlyPattern() {
  const times = loadCompletionTimes();
  const counts = new Array(24).fill(0);
  Object.values(times).forEach(t => {
    const h = parseInt(t.split(':')[0], 10);
    if (h >= 0 && h < 24) counts[h]++;
  });
  return counts;
}

export function getPeakHour() {
  const counts = getHourlyPattern();
  const max = Math.max(...counts);
  if (max === 0) return null;
  return counts.indexOf(max);
}

// ── Burnout detection ──

/**
 * Returns burnout risk: 'low'|'medium'|'high'|null
 * Based on last 3 weeks of history
 */
export function getBurnoutRisk() {
  const hist = loadHistory();
  const sorted = Object.entries(hist).sort((a, b) => a[0].localeCompare(b[0]));
  if (sorted.length < 3) return null;

  const recent = sorted.slice(-3).map(([, pct]) => pct);
  const declining = recent[0] > recent[1] && recent[1] > recent[2];
  const veryLow = recent[recent.length - 1] < 40;

  if (declining && veryLow) return 'high';
  if (declining || veryLow) return 'medium';
  return 'low';
}

export function getBurnoutMessage(risk) {
  if (!risk || risk === 'low') return null;
  if (risk === 'high') return '⚠️ 3+ weeks declining and below 40% — consider taking a lighter week.';
  return '📉 Completion trending down — try dropping lowest-priority tasks.';
}

// ── Subject difficulty ──

/** Score 1–5 based on skip/completion data */
export function getSubjectDifficulty(categories) {
  const catKeys = categories.keys();
  const scores = {};

  catKeys.forEach(cat => {
    let total = 0, done = 0, skipped = 0;
    DAYS.forEach(day => {
      (schedule[day]?.sections || []).forEach(sec => {
        sec.items.forEach(item => {
          if (item.cat !== cat) return;
          total++;
          const s = state.checked[item.id];
          if (s === 'done' || s === true) done++;
          if (s === 'skip') skipped++;
        });
      });
    });
    if (total === 0) return;
    const skipRate = skipped / total;
    const doneRate = done / total;
    // Difficulty: high skip + low done → hard
    const score = Math.max(1, Math.min(5, Math.round(1 + skipRate * 3 + (1 - doneRate) * 1)));
    scores[cat] = { score, total, done, skipped };
  });

  return scores;
}

// ── Energy / mood micro-journal ──

const ENERGY_KEY = 'energy-log';

export function loadEnergyLog() {
  return Storage.get(ENERGY_KEY, {});
}

function _saveEnergyLog(log) { Storage.set(ENERGY_KEY, log); }

export function logEnergy(level) {
  const log = loadEnergyLog();
  const d = new Date();
  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  log[key] = Math.max(1, Math.min(5, +level));
  _saveEnergyLog(log);
}

export function getTodayEnergy() {
  const d = new Date();
  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return loadEnergyLog()[key] || 0;
}

export function getEnergyProductivityCorrelation() {
  const log = loadEnergyLog();
  const hist = loadHistory();
  const pairs = [];
  Object.entries(log).forEach(([date, energy]) => {
    const d = new Date(date + 'T12:00:00');
    const weekKey = _isoWeekKey(d);
    if (hist[weekKey] !== undefined) pairs.push({ energy, pct: hist[weekKey] });
  });
  if (pairs.length < 3) return null;
  const highDays = pairs.filter(p => p.energy >= 4);
  const lowDays = pairs.filter(p => p.energy <= 2);
  const highAvg = highDays.length ? Math.round(highDays.reduce((s, p) => s + p.pct, 0) / highDays.length) : null;
  const lowAvg = lowDays.length ? Math.round(lowDays.reduce((s, p) => s + p.pct, 0) / lowDays.length) : null;
  return { highAvg, lowAvg, totalEntries: pairs.length };
}

function _isoWeekKey(d) {
  const temp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7));
  const week1 = new Date(temp.getFullYear(), 0, 4);
  const wn = 1 + Math.round(((temp - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${temp.getFullYear()}-W${String(wn).padStart(2, '0')}`;
}

// ── Spaced review reminders ──

const REVIEW_SCHEDULE_KEY = 'spaced-reviews';
const INTERVALS = [1, 3, 7, 14];

export function loadSpacedReviews() { return Storage.get(REVIEW_SCHEDULE_KEY, []); }
function _saveSpacedReviews(r) { Storage.set(REVIEW_SCHEDULE_KEY, r); }

export function scheduleSpacedReview(taskId, taskText, cat) {
  const reviews = loadSpacedReviews();
  const base = new Date();
  const items = INTERVALS.map(days => {
    const d = new Date(base); d.setDate(d.getDate() + days);
    return {
      id: `sr-${taskId}-${days}`,
      taskId, taskText, cat,
      reviewDate: d.toISOString().slice(0, 10),
      interval: days,
      done: false,
    };
  });
  // Replace existing for this task
  const filtered = reviews.filter(r => r.taskId !== taskId);
  _saveSpacedReviews([...filtered, ...items]);
}

export function markSpacedReviewDone(reviewId) {
  _saveSpacedReviews(loadSpacedReviews().map(r => r.id === reviewId ? { ...r, done: true } : r));
}

export function dismissSpacedReview(reviewId) {
  _saveSpacedReviews(loadSpacedReviews().filter(r => r.id !== reviewId));
}

export function getTodayReviews() {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return loadSpacedReviews().filter(r => !r.done && r.reviewDate <= today);
}

// ── Smart "what next" suggestion ──

export function getSmartSuggestion(schedule, DAYS, state, todayIdx, categories) {
  const todayName = DAYS[todayIdx] || DAYS[0];
  const candidates = [];

  // Collect undone tasks for today
  const dayData = schedule[todayName];
  if (!dayData) return null;
  (dayData.sections || []).forEach(sec => {
    sec.items.forEach(item => {
      const s = state.checked[item.id];
      if (s === true || s === 'done' || s === 'skip') return;
      if (state.taskDeferred[item.id] && state.taskDeferred[item.id] !== todayName) return;

      let score = 0;
      // Prefer tasks from high-skip subjects
      const catItems = [];
      DAYS.forEach(d => (schedule[d]?.sections || []).forEach(sec2 =>
        sec2.items.forEach(it => { if (it.cat === item.cat) catItems.push(it); })
      ));
      const skipRate = catItems.length ? catItems.filter(it => state.checked[it.id] === 'skip').length / catItems.length : 0;
      score += skipRate * 30;

      // Prefer tasks deferred multiple times (sticky)
      if (state.taskDeferred[item.id]) score += 20;

      // Prefer tasks with deadlines soon
      const dl = state.deadlines.find(dl2 => {
        const n = dl2.name.toLowerCase();
        return n.includes(item.cat) || item.text.toLowerCase().includes(n.slice(0, 10));
      });
      if (dl) {
        const dLeft = Math.ceil((new Date(dl.date) - new Date()) / 86400000);
        if (dLeft <= 3) score += 40;
        else if (dLeft <= 7) score += 15;
      }

      // Prefer earlier sections
      score += 5;

      candidates.push({ item, score, skipRate, section: sec.label });
    });
  });

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const label = categories.getLabel(best.item.cat) || best.item.cat;
  let reason = '';
  if (best.skipRate > 0.3) reason = `${label} has a high skip rate — tackling it builds momentum`;
  else if (state.taskDeferred[best.item.id]) reason = 'This task was deferred — clearing it frees your queue';
  else reason = `Highest priority in ${best.section}`;
  return { item: best.item, reason, label };
}

// ── Comparative analytics ──

export function getComparativeStats() {
  const hist = loadHistory();
  const sorted = Object.entries(hist).sort((a, b) => a[0].localeCompare(b[0]));
  if (sorted.length === 0) return null;

  const current = sorted[sorted.length - 1]?.[1] ?? 0;
  const last = sorted[sorted.length - 2]?.[1] ?? null;
  const avg4 = sorted.length >= 4
    ? Math.round(sorted.slice(-4, -1).reduce((s, [, v]) => s + v, 0) / 3)
    : null;
  const best = Math.max(...sorted.map(([, v]) => v));

  return { current, last, avg4, best,
    deltaLast: last !== null ? current - last : null,
    deltaAvg: avg4 !== null ? current - avg4 : null,
  };
}

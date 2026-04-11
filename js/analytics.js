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

// ════════════════════════════════════════
// ── Weekly Review State ──
// ════════════════════════════════════════

import { Storage } from './storage.js';
import { DAYS, schedule } from './schedule.js';
import {
  state, getWeekKey, getWeeklyProgress, getDayProgress, getStatus,
  getSubjectStreaks, getSkipDebt, loadHistory, nowInTZ,
  STATUS_DONE, STATUS_SKIP, STATUS_PROGRESS,
} from './state.js';
import { CategoryRegistry } from './categories.js';
import { getIdealGap } from './ideal.js';

const REVIEWS_KEY = 'weekly-reviews';

// ── UI state ──
let _step = 0;       // 0=overview, 1=days, 2=subjects, 3=reflection, 4=done
let _tempReflection = '';
let _tempHighlight = '';
let _tempImprovement = '';

export function getReviewStep() { return _step; }
export function setReviewStep(n) { _step = Math.max(0, Math.min(4, n)); }
export function resetReview() { _step = 0; _tempReflection = ''; _tempHighlight = ''; _tempImprovement = ''; }

export function getReviewDraft() {
  return { reflection: _tempReflection, highlight: _tempHighlight, improvement: _tempImprovement };
}
export function setReviewDraft(field, val) {
  if (field === 'reflection') _tempReflection = val;
  if (field === 'highlight') _tempHighlight = val;
  if (field === 'improvement') _tempImprovement = val;
}

// ── Load / Save ──

export function loadReviews() {
  return Storage.get(REVIEWS_KEY, {});
}

export function saveReview(weekKey, reviewData) {
  const reviews = loadReviews();
  reviews[weekKey] = { ...reviewData, savedAt: new Date().toISOString() };
  Storage.set(REVIEWS_KEY, reviews);
}

export function getReviewForWeek(weekKey) {
  const reviews = loadReviews();
  return reviews[weekKey] || null;
}

export function hasReviewForCurrentWeek() {
  return !!getReviewForWeek(getWeekKey());
}

// ── Auto-generate review data ──

export function generateReviewData() {
  const wp = getWeeklyProgress();
  const streaks = getSubjectStreaks();
  const skipDebt = getSkipDebt();
  const hist = loadHistory();
  const weekKey = getWeekKey();

  // Per-day breakdown
  const dayBreakdown = DAYS.map(day => {
    const p = getDayProgress(day);
    const dayData = schedule[day];
    const totalItems = (dayData?.sections || []).reduce((sum, s) => sum + s.items.length, 0);
    return { day, done: p.done, total: p.total, pct: p.pct, totalItems };
  });

  // Skipped tasks
  const skippedTasks = [];
  DAYS.forEach(day => {
    (schedule[day]?.sections || []).forEach(sec => {
      sec.items.forEach(item => {
        const s = getStatus(item.id);
        if (s === STATUS_SKIP) {
          skippedTasks.push({ id: item.id, text: item.text, cat: item.cat, day });
        }
      });
    });
  });

  // Incomplete tasks
  const incompleteTasks = [];
  DAYS.forEach(day => {
    (schedule[day]?.sections || []).forEach(sec => {
      sec.items.forEach(item => {
        if (state.taskDeferred[item.id] && state.taskDeferred[item.id] !== day) return;
        const s = getStatus(item.id);
        if (!s || s === STATUS_PROGRESS) {
          incompleteTasks.push({ id: item.id, text: item.text, cat: item.cat, day });
        }
      });
    });
  });

  // Streak subject performance
  const subjectPerformance = Object.entries(streaks)
    .map(([cat, data]) => ({
      cat,
      label: CategoryRegistry.getLabel(cat) || cat,
      done: data.done,
      total: data.total,
      pct: data.total ? Math.round((data.done / data.total) * 100) : 0,
    }))
    .sort((a, b) => a.pct - b.pct);

  // Suggestions based on patterns
  const suggestions = [];
  const weakSubjects = subjectPerformance.filter(s => s.pct < 50 && s.total >= 2);
  weakSubjects.forEach(s => {
    suggestions.push(`Consider rescheduling ${s.label} to a lighter day — only ${s.pct}% completed`);
  });

  const skipDebtEntries = Object.entries(skipDebt).filter(([, c]) => c >= 2);
  skipDebtEntries.forEach(([label, count]) => {
    suggestions.push(`"${label}" was skipped ${count} times — drop or restructure it?`);
  });

  const bestDay = dayBreakdown.filter(d => d.total > 0).sort((a, b) => b.pct - a.pct)[0];
  const worstDay = dayBreakdown.filter(d => d.total > 0).sort((a, b) => a.pct - b.pct)[0];
  if (bestDay && worstDay && bestDay.day !== worstDay.day && worstDay.pct < 40) {
    suggestions.push(`${worstDay.day} is your weakest day (${worstDay.pct}%) — move tasks to ${bestDay.day}?`);
  }

  // Ideal gap
  let idealGap = null;
  try {
    idealGap = getIdealGap(state.checked, state.taskDeferred);
  } catch (e) { /* no ideal configured */ }

  // Trend from recent weeks
  const recentWeeks = Object.entries(hist).sort((a, b) => a[0].localeCompare(b[0])).slice(-4);
  const trend = recentWeeks.length >= 2
    ? recentWeeks[recentWeeks.length - 1][1] - recentWeeks[recentWeeks.length - 2][1]
    : 0;

  return {
    weekKey,
    wp,
    dayBreakdown,
    skippedTasks,
    incompleteTasks,
    subjectPerformance,
    suggestions,
    idealGap,
    trend,
    recentWeeks,
  };
}

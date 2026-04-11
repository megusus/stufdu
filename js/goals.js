// ════════════════════════════════════════
// ── Goal Setting & Milestones ──
// ════════════════════════════════════════

import { Storage } from './storage.js';

const GOALS_KEY = 'goals';

export const GOAL_PRESETS = [
  { type: 'weekly-pct', label: '85%+ weekly completion', target: 85, unit: '%', icon: '🎯' },
  { type: 'streak',     label: '7-day habit streak',     target: 7,  unit: 'days', icon: '🔥' },
  { type: 'reading',    label: 'Read 10 books',           target: 10, unit: 'books', icon: '📚' },
  { type: 'custom',     label: 'Custom goal',             target: 100, unit: '', icon: '⭐' },
];

export function loadGoals() {
  return Storage.get(GOALS_KEY, []);
}

function _saveGoals(goals) {
  Storage.set(GOALS_KEY, goals);
}

export function addGoal({ type, label, target, unit, icon, deadline }) {
  const goals = loadGoals();
  const goal = {
    id: 'goal-' + Date.now(),
    type: type || 'custom',
    label: label.trim(),
    target: +target,
    unit: unit || '',
    icon: icon || '⭐',
    current: 0,
    deadline: deadline || null,
    createdAt: new Date().toISOString(),
  };
  goals.push(goal);
  _saveGoals(goals);
  return goal;
}

export function removeGoal(id) {
  _saveGoals(loadGoals().filter(g => g.id !== id));
}

export function updateGoalProgress(id, current) {
  _saveGoals(loadGoals().map(g => g.id === id ? { ...g, current: +current } : g));
}

/** Compute actual progress for a goal based on current app data */
export function computeGoalProgress(goal, { weeklyPct, readingCount, habitStreaks }) {
  switch (goal.type) {
    case 'weekly-pct': return weeklyPct ?? goal.current;
    case 'reading':    return readingCount ?? goal.current;
    case 'streak':     return Math.max(...(habitStreaks || [0]));
    default:           return goal.current;
  }
}

export function isGoalMet(goal) {
  return goal.current >= goal.target;
}

// ════════════════════════════════════════
// ── Task Recurrence Engine ──
// ════════════════════════════════════════

import { Storage } from './storage.js';
import { DAYS } from './schedule.js';

const RECURRENCE_KEY = 'recurring-tasks';

// Template: { id, text, hint, cat, est, recurrence: { type, days? } }

export function loadRecurringTasks() {
  return Storage.get(RECURRENCE_KEY, []);
}

function _saveRecurringTasks(tasks) {
  Storage.set(RECURRENCE_KEY, tasks);
}

export function addRecurringTask({ text, hint, cat, est, recurrence }) {
  if (!text?.trim() || !recurrence?.type) return null;
  const tasks = loadRecurringTasks();
  const task = {
    id: 'rec-' + Date.now(),
    text: text.trim(),
    hint: hint || '',
    cat: cat || 'homework',
    est: +est || 0,
    recurrence: {
      type: recurrence.type, // 'daily'|'weekdays'|'weekly'|'custom'
      days: recurrence.days || [],
      targetDay: recurrence.targetDay || null, // for weekly: which day
    },
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  _saveRecurringTasks(tasks);
  return task;
}

export function removeRecurringTask(id) {
  _saveRecurringTasks(loadRecurringTasks().filter(t => t.id !== id));
}

/** Day indices for weekdays (Mon-Fri) */
const WEEKDAY_IDXS = [0, 1, 2, 3, 4]; // DAYS is Mon=0...Sun=6

/**
 * Returns tasks that should appear on a given day based on recurrence rules.
 * @param {string} dayName - e.g. "Monday"
 * @returns {Array} items to inject
 */
export function getRecurringTasksForDay(dayName) {
  const templates = loadRecurringTasks();
  const dayIdx = DAYS.indexOf(dayName); // 0=Mon, 6=Sun
  if (dayIdx < 0) return [];

  return templates.filter(t => {
    const r = t.recurrence;
    if (!r) return false;
    if (r.type === 'daily') return true;
    if (r.type === 'weekdays') return WEEKDAY_IDXS.includes(dayIdx);
    if (r.type === 'weekly') return r.targetDay === dayName;
    if (r.type === 'custom') return (r.days || []).includes(dayName);
    return false;
  }).map(t => ({
    id: `${t.id}-${dayName.toLowerCase()}`,
    text: t.text,
    hint: t.hint || null,
    cat: t.cat,
    est: t.est || null,
    _isRecurring: true,
    _templateId: t.id,
  }));
}

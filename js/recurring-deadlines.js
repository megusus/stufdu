// ════════════════════════════════════════
// ── Recurring Deadlines ──
// ════════════════════════════════════════
// Extends the deadline model with optional recurrence.
// Recurrence types: 'weekly' | 'biweekly' | 'monthly'

import { Storage } from './storage.js';

export function loadRecurringDeadlines()    { return Storage.get('recurring-deadlines', []); }
export function saveRecurringDeadlines(arr) { Storage.set('recurring-deadlines', arr); }

export function addRecurringDeadline({ name, cat, recurrence, startDate, dayOfWeek }) {
  const arr = loadRecurringDeadlines();
  const rd  = {
    id:        'rd-' + Date.now(),
    name:      name.trim(),
    cat:       cat || 'homework',
    recurrence,           // 'weekly' | 'biweekly' | 'monthly'
    startDate,            // YYYY-MM-DD
    dayOfWeek: dayOfWeek ?? null, // 0=Sun for weekly/biweekly
    createdAt: Date.now(),
  };
  arr.push(rd);
  saveRecurringDeadlines(arr);
  return rd;
}

export function removeRecurringDeadline(id) {
  saveRecurringDeadlines(loadRecurringDeadlines().filter(r => r.id !== id));
}

// Generate upcoming deadline instances from recurring templates.
// Returns array of deadline-shaped objects { name, date, cat, _recurringId }
export function getUpcomingFromRecurring(weeksAhead = 8) {
  const templates = loadRecurringDeadlines();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const limit = new Date(today); limit.setDate(limit.getDate() + weeksAhead * 7);
  const generated = [];

  templates.forEach(rd => {
    const start = new Date(rd.startDate); start.setHours(0, 0, 0, 0);
    let cursor = new Date(Math.max(start.getTime(), today.getTime()));

    // Align cursor to the right weekday for weekly/biweekly
    if ((rd.recurrence === 'weekly' || rd.recurrence === 'biweekly') && rd.dayOfWeek != null) {
      while (cursor.getDay() !== rd.dayOfWeek) {
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    let iterations = 0;
    while (cursor <= limit && iterations < 52) {
      iterations++;
      const dateStr = cursor.toISOString().slice(0, 10);
      generated.push({ name: rd.name, date: dateStr, cat: rd.cat, _recurringId: rd.id });

      if (rd.recurrence === 'weekly')   cursor.setDate(cursor.getDate() + 7);
      else if (rd.recurrence === 'biweekly') cursor.setDate(cursor.getDate() + 14);
      else if (rd.recurrence === 'monthly') cursor.setMonth(cursor.getMonth() + 1);
      else break;
    }
  });

  return generated;
}

// Merge recurring-generated deadlines into the state deadlines array,
// skipping any that are already present (matched by name + date).
export function mergeRecurringIntoDeadlines(state, saveDeadlines) {
  const upcoming  = getUpcomingFromRecurring();
  const existing  = new Set(state.deadlines.map(d => d.name + '|' + d.date));
  let added = 0;

  upcoming.forEach(nd => {
    const key = nd.name + '|' + nd.date;
    if (!existing.has(key)) {
      state.deadlines.push(nd);
      existing.add(key);
      added++;
    }
  });

  if (added > 0) {
    state.deadlines.sort((a, b) => a.date.localeCompare(b.date));
    saveDeadlines();
  }
  return added;
}

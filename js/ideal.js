// ════════════════════════════════════════
// ── Ideal Week State ──
// ════════════════════════════════════════

import { Storage } from './storage.js';
import { DEFAULT_SCHEDULE, DAYS, schedule as activeSchedule } from './schedule.js';

const IDEAL_KEY = 'ideal-week';

// ── Module-level UI state ──
let _showCompare = false;
let _editingDay = null; // null = DAYS[0]

export function getIdealUIState() {
  return { showCompare: _showCompare, editingDay: _editingDay || DAYS[0] };
}
export function setIdealShowCompare(v) { _showCompare = !!v; }
export function setIdealEditingDay(d) { _editingDay = d; }

// ── Load / Save ──

export function loadIdealWeek() {
  try {
    const stored = Storage.get(IDEAL_KEY, null);
    if (stored && typeof stored === 'object' && Object.keys(stored).length > 0) {
      // Normalize: ensure all 7 days exist with sections
      const base = structuredClone(DEFAULT_SCHEDULE);
      Object.keys(stored).forEach(day => {
        if (stored[day] && typeof stored[day] === 'object') {
          base[day] = stored[day];
          if (!base[day].sections) base[day].sections = [{ label: 'Tasks', items: [] }];
          base[day].sections.forEach(s => { if (!s.items) s.items = []; });
        }
      });
      return base;
    }
  } catch (e) {
    console.warn('[ideal] Load failed:', e.message);
  }
  return structuredClone(DEFAULT_SCHEDULE);
}

export function saveIdealWeek(idealSchedule) {
  try {
    Storage.set(IDEAL_KEY, idealSchedule);
  } catch (e) {
    console.warn('[ideal] Save failed:', e.message);
  }
}

export function resetIdealToDefault() {
  Storage.remove(IDEAL_KEY);
}

// ── Mutations ──

export function addIdealTask(day, sectionIdx, text, cat) {
  if (!text.trim()) return false;
  const ideal = loadIdealWeek();
  const sec = ideal[day]?.sections?.[sectionIdx];
  if (!sec) return false;
  const id = `ideal-${day.toLowerCase().slice(0,3)}-${Date.now()}`;
  sec.items.push({ id, text: text.trim(), cat: cat || 'homework' });
  saveIdealWeek(ideal);
  return true;
}

export function removeIdealTask(day, sectionIdx, itemIdx) {
  const ideal = loadIdealWeek();
  const sec = ideal[day]?.sections?.[sectionIdx];
  if (!sec || !sec.items[itemIdx]) return false;
  sec.items.splice(itemIdx, 1);
  saveIdealWeek(ideal);
  return true;
}

export function addIdealSection(day, label) {
  if (!label.trim()) return false;
  const ideal = loadIdealWeek();
  if (!ideal[day]) ideal[day] = { wake: '08:00', leave: null, meta: null, sections: [] };
  ideal[day].sections.push({ label: label.trim(), items: [] });
  saveIdealWeek(ideal);
  return true;
}

export function removeIdealSection(day, sectionIdx) {
  const ideal = loadIdealWeek();
  const day_ = ideal[day];
  if (!day_ || day_.sections.length <= 1) return false;
  day_.sections.splice(sectionIdx, 1);
  saveIdealWeek(ideal);
  return true;
}

export function saveIdealDayMeta(day, wake, leave, meta) {
  const ideal = loadIdealWeek();
  if (!ideal[day]) ideal[day] = { sections: [{ label: 'Tasks', items: [] }] };
  ideal[day].wake = wake || '08:00';
  ideal[day].leave = leave || null;
  ideal[day].meta = meta || null;
  saveIdealWeek(ideal);
}

// ── Gap Analysis ──

export function getIdealGap(checked, taskDeferred) {
  const ideal = loadIdealWeek();
  const gap = {};
  DAYS.forEach(day => {
    const idealDay = ideal[day];
    const idealTotal = (idealDay?.sections || []).reduce((s, sec) => s + (sec.items || []).length, 0);

    const actualDay = activeSchedule[day];
    let actualDone = 0;
    if (actualDay) {
      (actualDay.sections || []).forEach(sec => (sec.items || []).forEach(item => {
        if (taskDeferred[item.id] && taskDeferred[item.id] !== day) return;
        const v = checked[item.id];
        if (v === true || v === 'done') actualDone++;
      }));
    }

    gap[day] = {
      idealTotal,
      actualDone,
      pct: idealTotal ? Math.min(100, Math.round((actualDone / idealTotal) * 100)) : 100,
    };
  });
  return gap;
}

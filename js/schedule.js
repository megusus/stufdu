// ════════════════════════════════════════
// ── Schedule & Default Data ──
// ════════════════════════════════════════

import { Storage } from './storage.js';
import { CategoryRegistry } from './categories.js';

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const DEFAULT_SCHEDULE = {
  Monday: {
    wake: "08:00", leave: "11:15", meta: null,
    sections: [
      {
        label: "Before class", items: [
          { id: "mon-1", text: "Functional Analysis", hint: "Deep work \u2014 proofs & theory. Building toward Thursday\u2019s meeting.", cat: "fa" },
        ]
      },
      {
        label: "Class", items: [
          { id: "mon-2", text: "MATE2202 Analiz IV (Teori) \u2014 12:20\u201314:50", hint: "Feza G\u00fcrsey Amfisi", cat: "class" },
        ]
      },
      {
        label: "After class", items: [
          { id: "mon-3", text: "Analysis IV \u2014 homework", hint: "Start while lecture is fresh. Office hours Wednesday.", cat: "analysis" },
          { id: "mon-4", text: "Functional Analysis", hint: "Exercises & problems", cat: "fa" },
        ]
      },
      {
        label: "Evening", items: [
          { id: "mon-read", text: "Daily reading (1\u20132 h)", hint: "Pick from Goodreads to-read shelf. History, philosophy, or science.", cat: "reading" },
          { id: "mon-5", text: "French + Physio", hint: null, cat: "routine" },
          { id: "mon-6", text: "Tue preview: Physics II", hint: "Light skim for tomorrow\u2019s lecture", cat: "physics" },
          { id: "mon-7", text: "Tue preview: Algebra II", hint: "Skim Cebir Teori topics", cat: "algebra" },
        ]
      },
    ],
  },
  Tuesday: {
    wake: "07:15", leave: "07:50", meta: null,
    sections: [
      {
        label: "Class (full day)", items: [
          { id: "tue-1", text: "MATE2259 Physics II (Teori + Uyg + Lab) \u2014 09:00\u201313:10", hint: "AUBB B\u00fcy\u00fck Amfi I / Fizik Lab-208", cat: "class" },
          { id: "tue-2", text: "MATE2200 Cebir II (Teori) \u2014 14:00\u201316:30", hint: "Feza G\u00fcrsey Amfisi", cat: "class" },
        ]
      },
      {
        label: "After class", items: [
          { id: "tue-3", text: "Functional Analysis", hint: "Deep work \u2014 best evening slot", cat: "fa" },
        ]
      },
      {
        label: "Evening", items: [
          { id: "tue-read", text: "Daily reading (1\u20132 h)", hint: "Pick from Goodreads to-read shelf. History, philosophy, or science.", cat: "reading" },
          { id: "tue-4", text: "French + Physio", hint: null, cat: "routine" },
          { id: "tue-5", text: "Analysis IV \u2014 homework", hint: "Continue from Monday. Must finish before Wed office hours.", cat: "analysis" },
        ]
      },
    ],
  },
  Wednesday: {
    wake: "07:15", leave: "07:50", meta: "Analysis IV office hours today",
    sections: [
      {
        label: "Class (full day)", items: [
          { id: "wed-1", text: "MATE2204 Bilgisayarda Matematik \u2014 09:00\u201311:30", hint: "Bilgisayar Lab II", cat: "class" },
          { id: "wed-2", text: "MATE2202 Analiz IV (Uyg) \u2014 11:30\u201313:10", hint: "Feza G\u00fcrsey Amfisi", cat: "class" },
          { id: "wed-3", text: "Analysis IV office hours", hint: "Bring Monday\u2019s hw. Ask about anything you\u2019re stuck on.", cat: "analysis" },
          { id: "wed-4", text: "MATE2203 Say\u0131lar Teorisi II \u2014 14:00\u201316:30", hint: "AUBB B\u00fcy\u00fck Amfi II", cat: "class" },
        ]
      },
      {
        label: "After class", items: [
          { id: "wed-5", text: "Functional Analysis \u2014 meeting prep", hint: "Last chance to polish exercises & intuition for Thursday.", cat: "fa" },
        ]
      },
      {
        label: "Evening", items: [
          { id: "wed-read", text: "Daily reading (1\u20132 h)", hint: "Pick from Goodreads to-read shelf. History, philosophy, or science.", cat: "reading" },
          { id: "wed-6", text: "French + Physio", hint: null, cat: "routine" },
          { id: "wed-7", text: "Number Theory II \u2014 homework", hint: "Start while today\u2019s lecture is fresh", cat: "numtheory" },
          { id: "wed-8", text: "Thu preview: Diff Eq II", hint: "Quick skim of tomorrow\u2019s topics (skippable)", cat: "diffeq" },
        ]
      },
    ],
  },
  Thursday: {
    wake: "07:15", leave: "07:50", meta: "FA meeting day",
    sections: [
      {
        label: "Class + meeting", items: [
          { id: "thu-1", text: "MATE2201 Diff Eq II (Teori + Uyg) \u2014 09:00\u201312:20", hint: "Feza G\u00fcrsey Amfisi", cat: "class" },
          { id: "thu-2", text: "FA teacher meeting \u2014 ~12:30\u201314:00", hint: "Present exercises, discuss intuition, get follow-ups", cat: "fameeting" },
        ]
      },
      {
        label: "After (home ~15:10)", items: [
          { id: "thu-3", text: "Functional Analysis \u2014 follow-ups", hint: "Start on whatever the teacher asked while it\u2019s fresh", cat: "fa" },
          { id: "thu-4", text: "Diff Equations II \u2014 homework", hint: "Process today\u2019s lecture", cat: "diffeq" },
          { id: "thu-5", text: "Number Theory II \u2014 homework", hint: "Continue from Wednesday", cat: "numtheory" },
        ]
      },
      {
        label: "Evening", items: [
          { id: "thu-read", text: "Daily reading (1\u20132 h)", hint: "Pick from Goodreads to-read shelf. History, philosophy, or science.", cat: "reading" },
          { id: "thu-6", text: "French + Physio", hint: null, cat: "routine" },
          { id: "thu-7", text: "Fri preview: Algebra II", hint: "Prep for Cebir II Uyg", cat: "algebra" },
        ]
      },
    ],
  },
  Friday: {
    wake: "08:50", leave: "09:30", meta: null,
    sections: [
      {
        label: "Class", items: [
          { id: "fri-1", text: "MATE2200 Cebir II (Uyg) \u2014 10:40\u201312:20", hint: "Feza G\u00fcrsey Amfisi", cat: "class" },
        ]
      },
      {
        label: "After class", items: [
          { id: "fri-2", text: "Algebra II \u2014 homework", hint: "Process today\u2019s Uyg + start problem sets", cat: "algebra" },
          { id: "fri-3", text: "Homework \u2014 all courses", hint: "Physics II, Comp Math, Diff Eq overflow. Clear the backlog.", cat: "homework" },
          { id: "fri-4", text: "Functional Analysis", hint: "Weekly consolidation. Thu follow-ups continue.", cat: "fa" },
        ]
      },
      {
        label: "Evening", items: [
          { id: "fri-read", text: "Daily reading (1\u20132 h)", hint: "Pick from Goodreads to-read shelf. History, philosophy, or science.", cat: "reading" },
          { id: "fri-5", text: "French + Physio", hint: null, cat: "routine" },
          { id: "fri-6", text: "Homework overflow", hint: "Finish anything remaining", cat: "homework" },
        ]
      },
    ],
  },
  Saturday: {
    wake: "08:30", leave: null, meta: null,
    sections: [
      {
        label: "Morning \u2014 peak hours", items: [
          { id: "sat-1", text: "Functional Analysis \u2014 deep work", hint: "Theory & proofs. Fueled by Thursday\u2019s feedback.", cat: "fa" },
          { id: "sat-2", text: "Functional Analysis \u2014 exercises & whiteboard", hint: null, cat: "fa" },
        ]
      },
      {
        label: "Afternoon", items: [
          { id: "sat-3", text: "Remaining homework", hint: "Clear anything left from the week", cat: "homework" },
          { id: "sat-4", text: "Functional Analysis \u2014 lighter review & notes", hint: "Or more hw if needed", cat: "fa" },
        ]
      },
      {
        label: "Evening", items: [
          { id: "sat-read", text: "Daily reading (1\u20132 h)", hint: "Pick from Goodreads to-read shelf. History, philosophy, or science.", cat: "reading" },
          { id: "sat-5", text: "French + Physio", hint: null, cat: "routine" },
        ]
      },
    ],
  },
  Sunday: {
    wake: "08:30", leave: null, meta: null,
    sections: [
      {
        label: "Core", items: [
          { id: "sun-1", text: "Functional Analysis \u2014 deep theory session", hint: "Flagship block of the week", cat: "fa" },
          { id: "sun-2", text: "Functional Analysis \u2014 exercises & proofs", hint: "If energy is there", cat: "fa" },
        ]
      },
      {
        label: "Evening", items: [
          { id: "sun-3", text: "10-min weekly reflection", hint: "What did I skip? What\u2019s piling up? What do I show Thursday?", cat: "reflect" },
          { id: "sun-4", text: "Monday prep: Analysis IV", hint: "Preview next Teori lecture topics", cat: "analysis" },
          { id: "sun-5", text: "Monday prep: Algebra II", hint: "Skim ahead for Tuesday\u2019s Teori", cat: "algebra" },
          { id: "sun-read", text: "Daily reading (1\u20132 h)", hint: "Pick from Goodreads to-read shelf. History, philosophy, or science.", cat: "reading" },
          { id: "sun-6", text: "French + Physio", hint: null, cat: "routine" },
        ]
      },
    ],
  },
};

// Mutable schedule object - starts as deep clone of default, then merged with custom
export let schedule = structuredClone(DEFAULT_SCHEDULE);

export const DEFAULT_OVERVIEW = [
  { day: "Mon", tag: "Late start", desc: "FA \u2192 class \u2192 Analysis IV hw \u2192 FA \u2192 preview Tue", color: "#00d2ff" },
  { day: "Tue", tag: "Heavy", desc: "Classes all day \u2192 FA \u2192 Analysis IV hw (before Wed)", color: "#e94560" },
  { day: "Wed", tag: "Heavy", desc: "Classes + office hours \u2192 FA meeting prep \u2192 NumTheory hw", color: "#e94560" },
  { day: "Thu", tag: "Meeting", desc: "Diff Eq \u2192 FA meeting \u2192 follow-ups \u2192 Diff Eq hw", color: "#ff9100" },
  { day: "Fri", tag: "Half day", desc: "Cebir Uyg \u2192 Algebra hw \u2192 all-course hw \u2192 FA", color: "#ffab00" },
  { day: "Sat", tag: "Home", desc: "FA (peak hours) \u2192 remaining hw \u2192 more FA", color: "#00d2ff" },
  { day: "Sun", tag: "Home", desc: "FA deep \u2192 reflect \u2192 Mon prep (Analiz + Algebra)", color: "#00d2ff" },
];

// Build overview dynamically from active schedule
export function buildOverviewData() {
  return DAYS.map((dayName, i) => {
    const day = schedule[dayName];
    const sections = day.sections.map(s => s.label).join(' \u2192 ');
    const hasLeave = !!day.leave;
    const tag = day.meta || (hasLeave ? (day.sections.length > 2 ? 'Heavy' : 'Half day') : 'Home');
    // Use default overview if available, otherwise generate
    if (DEFAULT_OVERVIEW[i]) return DEFAULT_OVERVIEW[i];
    return { day: SHORT[i], tag, desc: sections, color: '#00d2ff' };
  });
}

export function saveScheduleToStorage() {
  try {
    Storage.set('custom-schedule', schedule);
  } catch (e) { console.warn('Failed to save schedule:', e.message); }
}

export function loadCustomSchedule() {
  try {
    const custom = Storage.get('custom-schedule', null);
    if (!custom || typeof custom !== 'object') return;
    for (const day of DAYS) {
      if (custom[day] && custom[day].sections) {
        schedule[day] = custom[day];
      }
    }
    // Ensure any custom categories from schedule are registered
    for (const day of DAYS) {
      for (const sec of schedule[day].sections) {
        for (const item of sec.items) {
          if (item.cat && !CategoryRegistry.has(item.cat)) {
            CategoryRegistry.register(item.cat, { bg: '#1a1a1a', border: '#888', label: item.cat.toUpperCase(), defaultEst: 60 });
          }
        }
      }
    }
  } catch (e) { console.warn('Failed to load custom schedule:', e.message); }
}

export function addTaskToSection(dayName, sectionIdx, text, cat, hint) {
  const section = schedule[dayName].sections[sectionIdx];
  if (!section || !text.trim()) return;
  cat = (cat || 'homework').replace(/[^a-zA-Z0-9]/g, '');
  const dayPrefix = dayName.slice(0, 3).toLowerCase();
  let maxNum = 0;
  schedule[dayName].sections.forEach(s => s.items.forEach(item => {
    const m = item.id.match(new RegExp('^' + dayPrefix + '-(\\d+)$'));
    if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
  }));
  const newId = dayPrefix + '-' + (maxNum + 1);
  section.items.push({ id: newId, text: text.trim(), hint: hint || null, cat: cat || 'homework' });
  if (!CategoryRegistry.has(cat)) {
    CategoryRegistry.register(cat, { bg: '#1a1a1a', border: '#888', label: cat.toUpperCase(), defaultEst: 60 });
    CategoryRegistry.save();
  }
  saveScheduleToStorage();
}

export function removeTaskFromSchedule(dayName, sectionIdx, itemIdx) {
  const section = schedule[dayName].sections[sectionIdx];
  if (!section) return;
  const item = section.items[itemIdx];
  section.items.splice(itemIdx, 1);
  saveScheduleToStorage();
  return item; // return removed item so caller can clean up state
}

export function renameSectionInSchedule(dayName, sectionIdx, newLabel) {
  const section = schedule[dayName]?.sections[sectionIdx];
  if (!section || !newLabel.trim()) return;
  section.label = newLabel.trim();
  saveScheduleToStorage();
}

export function addSectionToDay(dayName, label) {
  if (!label || !label.trim()) return;
  if (!schedule[dayName]) return;
  schedule[dayName].sections.push({ label: label.trim(), items: [] });
  saveScheduleToStorage();
}

export function removeSectionFromDay(dayName, sectionIdx) {
  const day = schedule[dayName];
  if (!day || day.sections.length <= 1) return; // keep at least one section
  day.sections.splice(sectionIdx, 1);
  saveScheduleToStorage();
}

export function moveSectionInDay(dayName, sectionIdx, direction) {
  const sections = schedule[dayName]?.sections;
  if (!sections) return;
  const newIdx = sectionIdx + direction;
  if (newIdx < 0 || newIdx >= sections.length) return;
  [sections[sectionIdx], sections[newIdx]] = [sections[newIdx], sections[sectionIdx]];
  saveScheduleToStorage();
}

export function moveTaskInSection(dayName, sectionIdx, itemIdx, direction) {
  const section = schedule[dayName]?.sections[sectionIdx];
  if (!section) return;
  const items = section.items;
  const newIdx = itemIdx + direction;
  if (newIdx < 0 || newIdx >= items.length) return;
  [items[itemIdx], items[newIdx]] = [items[newIdx], items[itemIdx]];
  saveScheduleToStorage();
}

// ── Day configuration (active/alias) ──
export const dayConfig = Object.fromEntries(
  DAYS.map(d => [d, { active: true, alias: null }])
);

export function getDayLabel(dayName) {
  return dayConfig[dayName]?.alias || dayName;
}

export function getShortLabel(dayName, idx) {
  const alias = dayConfig[dayName]?.alias;
  if (alias) return alias.slice(0, 3);
  return SHORT[idx];
}

export function getActiveDays() {
  return DAYS.filter(d => dayConfig[d]?.active !== false);
}

export function setDayActive(dayName, active) {
  if (!dayConfig[dayName]) return;
  dayConfig[dayName].active = active;
  saveDayConfig();
}

export function setDayAlias(dayName, alias) {
  if (!dayConfig[dayName]) return;
  dayConfig[dayName].alias = alias?.trim() || null;
  saveDayConfig();
}

export function saveDayConfig() {
  try { Storage.set('day-config', dayConfig); } catch (e) {}
}

export function loadDayConfig() {
  try {
    const saved = Storage.get('day-config', null);
    if (!saved || typeof saved !== 'object') return;
    for (const d of DAYS) {
      if (saved[d] && typeof saved[d] === 'object') {
        if (typeof saved[d].active === 'boolean') dayConfig[d].active = saved[d].active;
        if (typeof saved[d].alias === 'string' || saved[d].alias === null) dayConfig[d].alias = saved[d].alias;
      }
    }
  } catch (e) { console.warn('Failed to load day config:', e.message); }
}

export function findItemById(id) {
  for (const d of DAYS) {
    for (const s of schedule[d].sections) {
      for (const item of s.items) {
        if (item.id === id) return item;
      }
    }
  }
  return null;
}

export function getScheduleFingerprint() {
  const ids = [];
  DAYS.forEach(d => schedule[d].sections.forEach(s => s.items.forEach(item => ids.push(item.id))));
  return ids.join(',');
}

export function buildTextToIdMap() {
  const map = {};
  const seen = {};
  DAYS.forEach(d => schedule[d].sections.forEach(s => s.items.forEach(item => {
    const key = item.text.trim().toLowerCase();
    const uniqueKey = d + '::' + key;
    map[uniqueKey] = item.id;
    if (!seen[key]) {
      map[key] = item.id;
      seen[key] = true;
    }
  })));
  return map;
}

export function buildIdToTextMap() {
  const map = {};
  DAYS.forEach(d => schedule[d].sections.forEach(s => s.items.forEach(item => {
    map[item.id] = { text: item.text.trim().toLowerCase(), day: d };
  })));
  return map;
}

export function getCurrentIds() {
  const ids = new Set();
  DAYS.forEach(d => schedule[d].sections.forEach(s => s.items.forEach(item => ids.add(item.id))));
  return ids;
}

// Initialize: load custom schedule + day config
loadCustomSchedule();
loadDayConfig();

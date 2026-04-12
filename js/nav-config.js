// ════════════════════════════════════════
// ── Customizable Navigation Config ──
// ════════════════════════════════════════

import { Storage } from './storage.js';

export const ALL_NAV_ITEMS = [
  { id: 'home',       icon: '⌂',  label: 'Home'       },
  { id: 'schedule',   icon: '▦',  label: 'Schedule'   },
  { id: 'ideal',      icon: '✦',  label: 'Ideal'      },
  { id: 'calendar',   icon: '📅', label: 'Calendar'   },
  { id: 'inbox',      icon: '📥', label: 'Inbox'      },
  { id: 'matrix',     icon: '🔲', label: 'Matrix'     },
  { id: 'stats',      icon: '◈',  label: 'Stats'      },
  { id: 'review',     icon: '📋', label: 'Review'     },
  { id: 'habits',     icon: '🏃', label: 'Habits'     },
  { id: 'grades',     icon: '📊', label: 'Grades'     },
  { id: 'flashcards', icon: '🧠', label: 'Flashcards' },
  { id: 'tools',      icon: '⚙',  label: 'Tools'      },
  { id: 'gpa',        icon: '🎓', label: 'GPA'         },
];

// Default core tabs (user's preference: Home, Schedule, Ideal, Calendar, Inbox, Matrix)
const DEFAULT_PINNED = ['home', 'schedule', 'ideal', 'calendar', 'inbox', 'matrix'];
const MAX_PINNED = 6;

export function loadNavConfig() {
  const stored = Storage.get('nav-config', null);
  if (stored && Array.isArray(stored.pinned)) return stored;
  return { pinned: DEFAULT_PINNED };
}

export function saveNavConfig(cfg) {
  Storage.set('nav-config', cfg);
}

export function getPinnedItems() {
  const { pinned } = loadNavConfig();
  return pinned
    .map(id => ALL_NAV_ITEMS.find(n => n.id === id))
    .filter(Boolean);
}

export function getOverflowItems() {
  const { pinned } = loadNavConfig();
  return ALL_NAV_ITEMS.filter(n => !pinned.includes(n.id));
}

export function pinItem(id) {
  const cfg = loadNavConfig();
  if (cfg.pinned.includes(id)) return cfg;
  if (cfg.pinned.length >= MAX_PINNED) cfg.pinned = cfg.pinned.slice(0, MAX_PINNED - 1);
  cfg.pinned.push(id);
  saveNavConfig(cfg);
  return cfg;
}

export function unpinItem(id) {
  const cfg = loadNavConfig();
  if (cfg.pinned.length <= 1) return cfg; // keep at least one
  cfg.pinned = cfg.pinned.filter(p => p !== id);
  saveNavConfig(cfg);
  return cfg;
}

export function reorderPinned(fromIdx, toIdx) {
  const cfg = loadNavConfig();
  const arr = [...cfg.pinned];
  const [moved] = arr.splice(fromIdx, 1);
  arr.splice(toIdx, 0, moved);
  cfg.pinned = arr;
  saveNavConfig(cfg);
  return cfg;
}

export { MAX_PINNED };

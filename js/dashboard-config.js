// ════════════════════════════════════════
// ── Dashboard Card Configuration ──
// ════════════════════════════════════════

import { Storage } from './storage.js';

export const CARD_DEFS = [
  { id: 'today-progress', label: 'Today Progress',   defaultSize: 'wide',   defaultVisible: true  },
  { id: 'deadlines',      label: 'Deadlines',         defaultSize: 'normal', defaultVisible: true  },
  { id: 'meal',           label: "Today's Meal",      defaultSize: 'normal', defaultVisible: true  },
  { id: 'streak',         label: 'Weekly Streak',     defaultSize: 'normal', defaultVisible: true  },
  { id: 'ideal-gap',      label: 'Ideal vs Actual',   defaultSize: 'normal', defaultVisible: true  },
  { id: 'reading',        label: 'Reading',           defaultSize: 'normal', defaultVisible: true  },
  { id: 'scratchpad',     label: 'Scratchpad',        defaultSize: 'normal', defaultVisible: true  },
  { id: 'grades',         label: 'Grades',            defaultSize: 'normal', defaultVisible: true  },
  { id: 'time-tracked',   label: 'Time Tracked',      defaultSize: 'normal', defaultVisible: true  },
  { id: 'daily-plan',     label: 'Daily Plan',        defaultSize: 'normal', defaultVisible: true  },
  { id: 'habits',         label: 'Habits',            defaultSize: 'normal', defaultVisible: true  },
  { id: 'inbox',          label: 'Inbox',             defaultSize: 'normal', defaultVisible: true  },
  { id: 'weekly-review',  label: 'Weekly Review',     defaultSize: 'normal', defaultVisible: true  },
  { id: 'smart-suggest',  label: 'Smart Suggestion',  defaultSize: 'normal', defaultVisible: true  },
  { id: 'spaced-reviews', label: 'Reviews Due',       defaultSize: 'normal', defaultVisible: true  },
  { id: 'energy',         label: 'Energy Level',      defaultSize: 'normal', defaultVisible: true  },
];

export function loadDashboardConfig() {
  const stored = Storage.get('dashboard-config', null);
  if (!stored || !Array.isArray(stored)) return getDefaultConfig();
  // Merge stored config with defaults so newly added cards appear
  const storedMap = Object.fromEntries(stored.map(c => [c.id, c]));
  const merged = CARD_DEFS.map((def, i) => ({
    id:      def.id,
    visible: storedMap[def.id]?.visible ?? def.defaultVisible,
    size:    storedMap[def.id]?.size    ?? def.defaultSize,
    order:   storedMap[def.id]?.order   ?? i + stored.length,
  }));
  // Preserve custom ordering for cards that were stored
  stored.forEach((c, idx) => {
    const m = merged.find(x => x.id === c.id);
    if (m) m.order = idx;
  });
  return merged.sort((a, b) => a.order - b.order);
}

export function saveDashboardConfig(config) {
  Storage.set('dashboard-config', config.map((c, i) => ({ ...c, order: i })));
}

export function getDefaultConfig() {
  return CARD_DEFS.map((def, i) => ({
    id:      def.id,
    visible: def.defaultVisible,
    size:    def.defaultSize,
    order:   i,
  }));
}

export function moveCard(config, id, direction) {
  const idx = config.findIndex(c => c.id === id);
  if (idx < 0) return config;
  const swapIdx = idx + direction;
  if (swapIdx < 0 || swapIdx >= config.length) return config;
  const newConfig = [...config];
  [newConfig[idx], newConfig[swapIdx]] = [newConfig[swapIdx], newConfig[idx]];
  return newConfig.map((c, i) => ({ ...c, order: i }));
}

export function setCardVisible(config, id, visible) {
  return config.map(c => c.id === id ? { ...c, visible } : c);
}

export function setCardSize(config, id, size) {
  return config.map(c => c.id === id ? { ...c, size } : c);
}

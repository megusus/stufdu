// ════════════════════════════════════════
// ── Category Management Handlers ──
// ════════════════════════════════════════

import { Storage } from '../storage.js';
import { CategoryRegistry } from '../categories.js';
import { schedule } from '../schedule.js';
import { state } from '../state.js';

export function editCat(key, render) {
  state.catEditKey = state.catEditKey === key ? null : key;
  render();
}

export function saveCatEdit(key, render, showToast) {
  const v = id => document.getElementById(id)?.value ?? '';
  const num = (id, fb) => { const n = parseInt(v(id), 10); return isNaN(n) ? fb : n; };
  const cat = CategoryRegistry.get(key);
  CategoryRegistry.register(key, {
    label:      v(`cat-label-${key}`),
    border:     v(`cat-border-${key}`) || cat.border,
    bg:         v(`cat-bg-${key}`) || cat.bg,
    defaultEst: num(`cat-est-${key}`, cat.defaultEst),
  });
  CategoryRegistry.save();
  state.catEditKey = null;
  showToast(`\u2713 Category \u201c${key}\u201d updated`);
  render();
}

export function deleteCat(key, render, showToast) {
  let usedCount = 0;
  for (const dayName of Object.keys(schedule)) {
    for (const section of (schedule[dayName].sections || [])) {
      for (const item of (section.items || [])) {
        if (item.cat === key) usedCount++;
      }
    }
  }
  const msg = usedCount > 0
    ? `\u201c${key}\u201d is used by ${usedCount} task(s). Remove anyway? Those tasks will fall back to the default style.`
    : `Remove category \u201c${key}\u201d?`;
  if (!confirm(msg)) return;
  CategoryRegistry.remove(key);
  CategoryRegistry.save();
  state.catEditKey = null;
  showToast(`Category \u201c${key}\u201d removed`);
  render();
}

export function addCat(render, showToast) {
  const keyRaw = document.getElementById('cat-new-key')?.value ?? '';
  const key = keyRaw.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!key) { showToast('Category key is required'); return; }
  if (CategoryRegistry.has(key)) { showToast(`Key \u201c${key}\u201d already exists`); return; }
  const v = id => document.getElementById(id)?.value ?? '';
  const num = (id, fb) => { const n = parseInt(v(id), 10); return isNaN(n) ? fb : n; };
  CategoryRegistry.register(key, {
    label:      v('cat-new-label').trim(),
    border:     v('cat-new-border') || '#888888',
    bg:         v('cat-new-bg') || '#1a1a1a',
    defaultEst: num('cat-new-est', 60),
  });
  CategoryRegistry.save();
  state.showCatAddForm = false;
  showToast(`\u2713 Category \u201c${key}\u201d added`);
  render();
}

export function resetCatToDefaults(render, showToast) {
  if (!confirm('Reset all categories to defaults? Custom categories will be lost.')) return;
  Storage.remove('categories');
  CategoryRegistry.init();
  state.catEditKey = null;
  state.showCatAddForm = false;
  showToast('Categories reset to defaults');
  render();
}

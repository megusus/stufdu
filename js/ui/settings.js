// ════════════════════════════════════════
// ── Settings Apply / Reset ──
// ════════════════════════════════════════

import { CONFIG, saveConfigOverrides } from '../config.js';
import { Storage } from '../storage.js';

export function applySettings(render, showToast) {
  const v = id => document.getElementById(id)?.value ?? '';
  const num = (id, fallback) => { const n = parseInt(v(id), 10); return isNaN(n) ? fallback : n; };
  const overrides = {
    appTitle:          v('cfg-appTitle').trim()        || CONFIG.appTitle,
    semester:          v('cfg-semester').trim()         || CONFIG.semester,
    headerTag:         v('cfg-headerTag').trim()        || CONFIG.headerTag,
    timezone:          v('cfg-timezone')                || CONFIG.timezone,
    toastDuration:     num('cfg-toastDuration',          CONFIG.toastDuration),
    swipeThreshold:    num('cfg-swipeThreshold',         CONFIG.swipeThreshold),
    mealApiUrl:        v('cfg-mealApiUrl').trim()        || CONFIG.mealApiUrl,
    goodreadsRss:      v('cfg-goodreadsRss').trim()      || CONFIG.goodreadsRss,
  };
  saveConfigOverrides(overrides);
  Storage.init(CONFIG.storagePrefix);
  showToast('Settings saved \u2713');
  render();
}

export function resetSettings(showToast) {
  Storage.remove('config');
  showToast('Settings reset \u2014 reload to restore defaults');
}

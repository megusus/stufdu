// ════════════════════════════════════════
// ── Centralized Configuration ──
// ════════════════════════════════════════

export const CONFIG = {
  // Identity
  storagePrefix: 'sp26',
  appTitle: 'Study Plan',
  semester: 'Spring 2026 \u00b7 4th Semester',
  headerTag: 'FA \u2265 18h/week \u00b7 preview \u2192 class \u2192 hw',

  // Environment
  timezone: 'Europe/Istanbul',
  passwordHash: '55c3c985d5aee66bc140dc0f75263a953c6d7ddd77e3599bc240f64d741ea76f',

  // External APIs
  mealApiUrl: 'https://sks.istanbul.edu.tr/meal-schedule/filter',
  goodreadsRss: 'https://www.goodreads.com/review/list_rss/100819470?key=4g-f84dD_4vkPSZGV91PpP4MfGIqKQoH2ZPr-NCflolcTxak&shelf=to-read',

  // Firebase (optional - set to a config object to skip manual setup)
  firebase: null,

  // UI defaults
  toastDuration: 3500,
  saveDebounceMs: 100,
  syncDebounceMs: 500,
  swipeThreshold: 60,
  searchDebounceMs: 200,

  // Theme colors
  themeColors: {
    dark: { bg: '#09090b', meta: '#09090b' },
    light: { bg: '#faf6ed', meta: '#faf6ed' },
  },

  // Auto-theme (sunrise/sunset by month index, Istanbul approximate)
  sunriseBySeason: [7.5, 7, 6.5, 6, 5.5, 5.5, 5.5, 6, 6.5, 7, 7, 7.5],
  sunsetBySeason: [17, 17.5, 18, 19, 19.5, 20.5, 20.5, 20, 19, 18, 17, 16.5],

  // Semester start
  semesterStart: [2026, 1, 9], // [year, monthIdx, day]
};

// Load user overrides from localStorage (if any)
try {
  const overrides = JSON.parse(localStorage.getItem(CONFIG.storagePrefix + '-config') || '{}');
  if (overrides && typeof overrides === 'object') {
    Object.assign(CONFIG, overrides);
  }
} catch (e) { /* ignore invalid config */ }

// Save config overrides to localStorage
export function saveConfigOverrides(overrides) {
  try {
    const existing = JSON.parse(localStorage.getItem(CONFIG.storagePrefix + '-config') || '{}');
    Object.assign(existing, overrides);
    localStorage.setItem(CONFIG.storagePrefix + '-config', JSON.stringify(existing));
    Object.assign(CONFIG, overrides);
  } catch (e) { console.warn('Failed to save config:', e.message); }
}

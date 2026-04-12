// ════════════════════════════════════════
// ── Full-State Backup & Restore ──
// ════════════════════════════════════════
// Covers ALL storage keys — every module included.

import { CONFIG }  from './config.js';
import { Storage } from './storage.js';

const APP_VERSION = '2.0';

// Keys that require the prefix (non-week keys)
const STATIC_KEYS = [
  'history', 'links', 'deadlines', 'meals', 'reading-list',
  'custom-schedule', 'day-config', 'categories', 'config',
  'inbox', 'habits', 'habit-log', 'habit-freezes',
  'daily-plans', 'time-log', 'grades', 'lecture-notes',
  'recurring-tasks', 'task-blocked-by', 'goals', 'completion-times',
  'energy-log', 'spaced-reviews',
  'theme', 'fontscale', 'scratch', 'sync-config', 'reading-sync-ts',
  'dashboard-config', 'flashcard-decks', 'flashcard-cards',
  'badges', 'pomodoro-config', 'fc-reviews-total', 'weekly-reviews',
  'nav-config', 'credit-hours', 'gpa-scale',
  'onboarding-done', 'encrypted-keys',
];

function _prefixedKey(k)  { return CONFIG.storagePrefix + '-' + k; }

export function exportFullBackup() {
  const prefix = CONFIG.storagePrefix;
  const backup  = {
    _meta: {
      version:  APP_VERSION,
      prefix,
      exported: new Date().toISOString(),
      appTitle: CONFIG.appTitle,
      semester: CONFIG.semester,
    },
    data: {},
  };

  // Static keys
  STATIC_KEYS.forEach(k => {
    const raw = localStorage.getItem(_prefixedKey(k));
    if (raw !== null) backup.data[k] = raw;
  });

  // Week keys: w{N}, w{N}-notes, w{N}-defer, w{N}-lock
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix + '-')) continue;
    const sub = key.slice(prefix.length + 1);
    if (/^w\d+(-notes|-defer|-lock)?$/.test(sub)) {
      backup.data[sub] = localStorage.getItem(key);
    }
  }

  return backup;
}

export function downloadFullBackup() {
  const backup = exportFullBackup();
  const json   = JSON.stringify(backup, null, 2);
  const blob   = new Blob([json], { type: 'application/json' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  const date   = new Date().toISOString().slice(0, 10);
  a.href       = url;
  a.download   = `study-plan-full-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return Object.keys(backup.data).length;
}

export function validateBackup(obj) {
  if (!obj || typeof obj !== 'object') return { valid: false, reason: 'Not a JSON object' };
  if (!obj._meta) return { valid: false, reason: 'Missing _meta field' };
  if (!obj.data || typeof obj.data !== 'object') return { valid: false, reason: 'Missing data field' };
  return { valid: true, keyCount: Object.keys(obj.data).length, meta: obj._meta };
}

export function restoreFullBackup(backup, targetPrefix = null) {
  const prefix = targetPrefix || CONFIG.storagePrefix;
  const { data } = backup;
  let restored = 0;
  Object.entries(data).forEach(([k, raw]) => {
    try {
      localStorage.setItem(prefix + '-' + k, raw);
      restored++;
    } catch (e) {
      console.warn('[restore] Failed to write key:', k, e.message);
    }
  });
  return restored;
}

// ── File-based import ──
export function importFullBackupFromFile(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      const { valid, reason, keyCount, meta } = validateBackup(obj);
      if (!valid) { onError('Invalid backup file: ' + reason); return; }
      onSuccess(obj, keyCount, meta);
    } catch (e) {
      onError('Could not parse file: ' + e.message);
    }
  };
  reader.onerror = () => onError('File read error');
  reader.readAsText(file);
}

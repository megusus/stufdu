// ════════════════════════════════════════
// ── Storage Prefix Migration ──
// ════════════════════════════════════════
// Detects old-prefix keys in localStorage and offers to
// copy them to the current prefix, preserving user data.

import { CONFIG } from './config.js';
import { Storage } from './storage.js';

// Keys that are stored with the prefix but without a week number
const STATIC_KEYS = [
  'history', 'links', 'deadlines', 'meals', 'reading-list',
  'custom-schedule', 'day-config', 'categories', 'config', 'inbox', 'habits', 'habit-log', 'daily-plans', 'time-log', 'grades', 'lecture-notes', 'recurring-tasks', 'task-blocked-by', 'goals', 'completion-times',
  'theme', 'fontscale', 'scratch',
  'sync-config', 'reading-sync-ts',
  'energy-log', 'spaced-reviews', 'habit-freezes',
  // New feature keys
  'dashboard-config', 'flashcard-decks', 'flashcard-cards', 'badges', 'pomodoro-config',
  'fc-reviews-total', 'weekly-reviews',
];

// Pattern for week-based keys: w{N}, w{N}-notes, w{N}-defer, w{N}-lock
const WEEK_KEY_PATTERN = /^(.+)-(w\d+(?:-(?:notes|defer|lock))?)$/;

/**
 * Scan localStorage for keys belonging to a different prefix.
 * Returns the detected old prefix, or null if none found.
 */
export function detectOldPrefixKeys(currentPrefix) {
  const seen = new Set();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || key.startsWith(currentPrefix + '-')) continue;

    // Check static keys
    for (const sk of STATIC_KEYS) {
      const match = key.match(new RegExp(`^(.+)-${sk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
      if (match && match[1] !== currentPrefix) {
        seen.add(match[1]);
      }
    }

    // Check week keys
    const wm = key.match(WEEK_KEY_PATTERN);
    if (wm && wm[1] !== currentPrefix) {
      seen.add(wm[1]);
    }
  }

  // Return the most likely prefix (the one with the most keys)
  if (seen.size === 0) return null;
  let best = null, bestCount = 0;
  for (const prefix of seen) {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith(prefix + '-')) count++;
    }
    if (count > bestCount) { best = prefix; bestCount = count; }
  }
  return best;
}

/**
 * Copy all known key types from oldPrefix to newPrefix.
 * Does NOT delete old keys (rollback safety).
 * Returns the number of keys copied.
 */
export function migrateStoragePrefix(oldPrefix, newPrefix) {
  if (!oldPrefix || !newPrefix || oldPrefix === newPrefix) return 0;
  let copied = 0;

  // Copy static keys
  for (const sk of STATIC_KEYS) {
    const oldKey = oldPrefix + '-' + sk;
    const newKey = newPrefix + '-' + sk;
    const val = localStorage.getItem(oldKey);
    if (val !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, val);
      copied++;
    }
  }

  // Copy week-based keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(oldPrefix + '-')) continue;
    const suffix = key.slice(oldPrefix.length + 1);
    // Only copy week keys that aren't static
    if (STATIC_KEYS.includes(suffix)) continue;
    if (/^w\d+/.test(suffix)) {
      const newKey = newPrefix + '-' + suffix;
      if (localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, localStorage.getItem(key));
        copied++;
      }
    }
  }

  return copied;
}

/**
 * Show a confirmation dialog offering migration.
 * @param {string} oldPrefix
 * @param {string} newPrefix
 * @param {Function} showToast
 * @param {Function} showConfirm
 * @param {Function} render
 */
export function offerMigration(oldPrefix, newPrefix, showToast, showConfirm, render) {
  showConfirm(
    `Found data from a previous version (prefix "${oldPrefix}"). Copy it to the current version ("${newPrefix}")?`,
    () => {
      const count = migrateStoragePrefix(oldPrefix, newPrefix);
      if (count > 0) {
        showToast(`Migrated ${count} key(s) from "${oldPrefix}" to "${newPrefix}"`);
        // Reload to pick up migrated data
        setTimeout(() => location.reload(), 1500);
      } else {
        showToast('No new data to migrate');
      }
    }
  );
}

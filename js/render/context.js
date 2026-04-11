// ════════════════════════════════════════
// ── Render Context Builder ──
// ════════════════════════════════════════
// Assembles a context object that renderers receive instead of
// importing shared state/config/registries directly.

import { CONFIG } from '../config.js';
import { CategoryRegistry } from '../categories.js';
import { DAYS, SHORT, schedule, buildOverviewData, getDayLabel, getShortLabel, getActiveDays, dayConfig } from '../schedule.js';
import {
  state, getStatus, getDayProgress, getWeeklyProgress,
  getEstimate, formatEst, escapeHtml, getWeekKey, getWeekNum, nowInTZ,
  getDaysUntil, getSubjectStreaks, generateWeeklySummary,
  getPastWeekData, loadHistory, todayIdx,
  STATUS_DONE, STATUS_SKIP, STATUS_PROGRESS, STATUS_BLOCKED,
} from '../state.js';
import { getSyncConfig } from '../sync.js';
import { currentTheme } from '../ui/theme.js';

/**
 * Build a snapshot of everything renderers need.
 * Called once per render cycle by render/index.js.
 */
export function buildRenderContext() {
  const dayName = DAYS[state.selectedDay] || DAYS[0];
  const day = schedule[dayName];
  const prog = getDayProgress(dayName);
  const wp = getWeeklyProgress();

  return {
    // Config
    config: CONFIG,

    // State snapshot (renderers read, never write)
    state,

    // Schedule data
    schedule,
    days: DAYS,
    short: SHORT,
    dayConfig,
    dayName,
    day,

    // Derived
    prog,
    wp,
    todayIdx,
    isToday: state.selectedDay === todayIdx,
    weekKey: getWeekKey(),
    weekNum: getWeekNum(),

    // Category registry (methods)
    categories: {
      get:         k => CategoryRegistry.get(k),
      getColor:    k => CategoryRegistry.getColor(k),
      getLabel:    k => CategoryRegistry.getLabel(k),
      getEstimate: k => CategoryRegistry.getEstimate(k),
      keys:        () => CategoryRegistry.keys(),
      has:         k => CategoryRegistry.has(k),
      getAllColors: () => CategoryRegistry.getAllColors(),
    },

    // Pure functions
    getStatus,
    getEstimate,
    formatEst,
    escapeHtml,
    getDayProgress,
    getWeeklyProgress,
    getDayLabel,
    getShortLabel,
    getActiveDays,
    getDaysUntil,
    getSubjectStreaks,
    generateWeeklySummary,
    getPastWeekData,
    loadHistory,
    buildOverviewData,
    nowInTZ,

    // Status constants
    STATUS_DONE,
    STATUS_SKIP,
    STATUS_PROGRESS,
    STATUS_BLOCKED,

    // Sync/theme
    hasSyncConfig: !!(CONFIG.firebase || getSyncConfig()),
    currentTheme: currentTheme,
  };
}

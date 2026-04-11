// ════════════════════════════════════════
// ── Onboarding Wizard ──
// ════════════════════════════════════════

import { Storage } from './storage.js';

const DONE_KEY = 'onboarding-done';
let _step = null; // null = not showing

export function isOnboardingDone() {
  return !!Storage.getRaw(DONE_KEY, '');
}

export function markOnboardingDone() {
  Storage.setRaw(DONE_KEY, '1');
  _step = null;
}

export function getOnboardingStep() { return _step; }
export function setOnboardingStep(n) { _step = n === null ? null : Math.max(0, Math.min(3, n)); }
export function closeOnboarding() { _step = null; }
export function openOnboarding() { _step = 0; }

/** Check if onboarding should auto-open (first run) */
export function shouldShowOnboarding(schedule) {
  if (isOnboardingDone()) return false;
  // Check if schedule is empty (all sections empty across all days)
  const totalTasks = Object.values(schedule).reduce((sum, day) =>
    sum + (day?.sections || []).reduce((s, sec) => s + (sec.items || []).length, 0), 0
  );
  return totalTasks === 0;
}

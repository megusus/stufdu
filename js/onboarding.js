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

/** Check if onboarding should auto-open (first run).
 *  Uses absence of 'custom-schedule' key — not empty task count —
 *  so the default schedule doesn't suppress the wizard. */
export function shouldShowOnboarding() {
  if (isOnboardingDone()) return false;
  // True first-run: no custom schedule has ever been saved
  return !Storage.get('custom-schedule', null);
}

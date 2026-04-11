// ════════════════════════════════════════
// ── Daily Planning Ritual ──
// ════════════════════════════════════════

import { Storage } from './storage.js';

const PLANS_KEY = 'daily-plans';

function _todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── Load / Save ──

export function loadDailyPlans() {
  return Storage.get(PLANS_KEY, {});
}

export function getTodayPlan() {
  return loadDailyPlans()[_todayKey()] || null;
}

export function saveTodayPlan({ intention, mustDo, priorities, plannedAt }) {
  const plans = loadDailyPlans();
  plans[_todayKey()] = {
    intention: intention || '',
    mustDo: mustDo || [],
    priorities: priorities || [],
    plannedAt: plannedAt || new Date().toISOString(),
  };
  // Prune older than 60 days
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60);
  const cutStr = cutoff.toISOString().slice(0,10);
  Object.keys(plans).forEach(k => { if (k < cutStr) delete plans[k]; });
  Storage.set(PLANS_KEY, plans);
}

export function hasPlanForToday() {
  return !!loadDailyPlans()[_todayKey()];
}

export function setMustDo(taskId, isMustDo, currentPlan) {
  const plan = currentPlan || getTodayPlan() || { intention: '', mustDo: [], priorities: [] };
  if (isMustDo && !plan.mustDo.includes(taskId)) {
    plan.mustDo = [...plan.mustDo, taskId];
  } else if (!isMustDo) {
    plan.mustDo = plan.mustDo.filter(id => id !== taskId);
  }
  return plan;
}

export function isMustDo(taskId) {
  const plan = getTodayPlan();
  return plan ? plan.mustDo.includes(taskId) : false;
}

// ── Planner UI state ──
let _plannerStep = null; // null = closed, 0/1/2 = wizard steps

export function getPlannerStep() { return _plannerStep; }
export function setPlannerStep(n) { _plannerStep = n === null ? null : Math.max(0, Math.min(2, n)); }
export function closePlanner() { _plannerStep = null; }
export function openPlanner() { _plannerStep = 0; }

// ── Weekly plan stats for review ──
export function getPlannedDaysCount() {
  const plans = loadDailyPlans();
  const keys = Object.keys(plans);
  const now = new Date();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon=0
  let count = 0;
  for (let i = 0; i <= dow; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (plans[k]) count++;
  }
  return { count, outOf: dow + 1 };
}

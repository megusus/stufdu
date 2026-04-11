// ════════════════════════════════════════
// ── Daily Planning Wizard Renderer ──
// ════════════════════════════════════════

import { getPlannerStep, getTodayPlan, hasPlanForToday } from '../daily-plan.js';
import { loadInbox } from '../inbox.js';
import { DAYS } from '../schedule.js';

const STEPS = ['Inbox', 'Priorities', 'Intention'];

export function renderPlannerOverlay(ctx) {
  const step = getPlannerStep();
  if (step === null) return '';

  try { return _buildOverlay(step, ctx); }
  catch (err) {
    console.error('[planner]', err);
    return '';
  }
}

function _buildOverlay(step, ctx) {
  const { escapeHtml, state, schedule, getStatus, days, todayIdx, STATUS_DONE, STATUS_SKIP } = ctx;
  const todayName = days[todayIdx] || days[0];
  const inboxItems = loadInbox();
  const existingPlan = getTodayPlan();

  let html = `<div class="planner-overlay" id="planner-overlay">
    <div class="planner-box">
      <div class="planner-header">
        <div class="planner-title">📅 Plan Your Day</div>
        <button class="planner-close" data-action="closePlanner">✕</button>
      </div>`;

  // Step indicators
  html += `<div class="planner-steps">`;
  STEPS.forEach((label, i) => {
    html += `<div class="planner-step-dot ${i === step ? 'active' : i < step ? 'done' : ''}">${i < step ? '✓' : i + 1}</div>`;
    if (i < STEPS.length - 1) html += `<div class="planner-step-line ${i < step ? 'done' : ''}"></div>`;
  });
  html += `</div>`;

  // ── Step 0: Triage Inbox ──
  if (step === 0) {
    html += `<div class="planner-step-label">Triage your inbox</div>`;
    if (inboxItems.length === 0) {
      html += `<div class="planner-empty">📥 Inbox is clear — nothing to triage!</div>`;
    } else {
      inboxItems.slice(0, 5).forEach(item => {
        html += `<div class="planner-inbox-item">
          <span class="planner-item-text">${escapeHtml(item.text)}</span>
          <div class="planner-item-btns">
            <button class="data-btn" data-action="inboxToTask" data-id="${escapeHtml(item.id)}"
              style="font-size:10px;color:var(--accent);border-color:#00d2ff44">→ Task</button>
            <button class="data-btn" data-action="inboxRemove" data-id="${escapeHtml(item.id)}"
              style="font-size:10px;color:var(--dim)">Dismiss</button>
          </div>
        </div>`;
      });
      if (inboxItems.length > 5) {
        html += `<div style="font-size:10px;color:var(--dim);margin-top:4px">+${inboxItems.length - 5} more in inbox</div>`;
      }
    }
  }

  // ── Step 1: Priorities / Must-Do ──
  if (step === 1) {
    html += `<div class="planner-step-label">Mark your must-dos for today</div>`;
    const todayDay = schedule[todayName];
    const allItems = (todayDay?.sections || []).flatMap(s => s.items);
    const pending = allItems.filter(item => {
      if (state.taskDeferred[item.id] && state.taskDeferred[item.id] !== todayName) return false;
      const s = getStatus(item.id);
      return !s || (s !== STATUS_DONE && s !== STATUS_SKIP);
    });

    if (pending.length === 0) {
      html += `<div class="planner-empty">✓ All tasks done for today!</div>`;
    } else {
      const mustDoIds = existingPlan?.mustDo || [];
      pending.forEach(item => {
        const isMust = mustDoIds.includes(item.id);
        html += `<div class="planner-task-row">
          <button class="planner-mustdo-btn ${isMust ? 'active' : ''}"
            data-action="toggleMustDo" data-id="${escapeHtml(item.id)}"
            title="${isMust ? 'Unmark' : 'Mark as must-do'}">★</button>
          <span class="planner-task-text">${escapeHtml(item.text)}</span>
        </div>`;
      });
    }
  }

  // ── Step 2: Intention ──
  if (step === 2) {
    html += `<div class="planner-step-label">Set your intention for the day</div>
    <textarea class="review-textarea review-textarea-lg" id="planner-intention"
      placeholder="What's your main focus today? What would make today a success?"
      data-stop>${escapeHtml(existingPlan?.intention || '')}</textarea>
    <div class="planner-save-row">
      <button class="data-btn" data-action="saveDailyPlan"
        style="color:var(--accent);border-color:#00d2ff44;width:100%;justify-content:center">
        ✓ Save Daily Plan
      </button>
    </div>`;
  }

  // Nav buttons
  html += `<div class="planner-nav">`;
  if (step > 0) html += `<button class="data-btn" data-action="plannerPrev" style="color:var(--muted)">← Back</button>`;
  else html += `<div></div>`;
  if (step < 2) html += `<button class="data-btn" data-action="plannerNext" style="color:var(--accent);border-color:#00d2ff44">Next →</button>`;
  html += `</div>`;

  html += `</div></div>`; // .planner-box .planner-overlay
  return html;
}

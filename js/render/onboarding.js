// ════════════════════════════════════════
// ── Onboarding Wizard Renderer ──
// ════════════════════════════════════════

import { getOnboardingStep } from '../onboarding.js';

const STEPS = ['Welcome', 'Schedule', 'Subjects', 'Tasks'];

export function renderOnboardingOverlay(ctx) {
  const step = getOnboardingStep();
  if (step === null) return '';
  try { return _buildOnboarding(step, ctx); }
  catch (err) {
    console.error('[onboarding]', err);
    return '';
  }
}

function _buildOnboarding(step, ctx) {
  const { escapeHtml, config, categories } = ctx;

  let html = `<div class="planner-overlay" id="onboarding-overlay">
    <div class="planner-box" style="max-width:520px">
      <div class="planner-header">
        <div class="planner-title">🎓 Welcome to ${escapeHtml(config.appTitle)}</div>
        <button class="planner-close" data-action="skipOnboarding">Skip →</button>
      </div>`;

  // Step indicators
  html += `<div class="planner-steps">`;
  STEPS.forEach((label, i) => {
    html += `<div class="planner-step-dot ${i === step ? 'active' : i < step ? 'done' : ''}">${i < step ? '✓' : i + 1}</div>`;
    if (i < STEPS.length - 1) html += `<div class="planner-step-line ${i < step ? 'done' : ''}"></div>`;
  });
  html += `</div>`;

  if (step === 0) {
    html += `<div class="planner-step-label">Welcome! Let's set up your hub.</div>
    <div style="font-size:12px;color:var(--muted);line-height:1.7;margin-bottom:16px">
      This app is your personal study hub — schedule, habits, grades, notes, and more, all in one place.<br><br>
      It only takes 2 minutes to get started. You can always skip steps and configure later.
    </div>
    <div class="settings-row">
      <label>App title</label>
      <input class="settings-input" id="onboard-title" value="${escapeHtml(config.appTitle)}" placeholder="My Study Hub">
    </div>
    <div class="settings-row">
      <label>Semester / Term</label>
      <input class="settings-input" id="onboard-semester" value="${escapeHtml(config.semester)}" placeholder="Spring 2026">
    </div>`;
  }

  if (step === 1) {
    html += `<div class="planner-step-label">When does your week start? Set your wake time.</div>
    <div style="font-size:11px;color:var(--dim);margin-bottom:12px">This sets your default daily routine.</div>
    <div class="settings-row">
      <label>Default wake time</label>
      <input class="settings-input" id="onboard-wake" type="time" value="07:30">
    </div>
    <div class="settings-row">
      <label>Study days</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
        ${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d =>
          `<label style="display:flex;align-items:center;gap:4px;font-size:11px">
            <input type="checkbox" data-onboard-day="${d}" ${['Monday','Tuesday','Wednesday','Thursday','Friday'].includes(d) ? 'checked' : ''}> ${d.slice(0,3)}
          </label>`
        ).join('')}
      </div>
    </div>`;
  }

  if (step === 2) {
    html += `<div class="planner-step-label">What subjects are you studying?</div>
    <div style="font-size:11px;color:var(--dim);margin-bottom:12px">Categories help organise and colour-code your tasks.</div>
    <div class="grades-form-row" style="flex-wrap:wrap;gap:6px">`;
    categories.keys().forEach(k => {
      const c = categories.getColor(k);
      html += `<span class="item-cat" style="background:${c.border}18;color:${c.border};border:1px solid ${c.border}33">${escapeHtml(categories.getLabel(k) || k)}</span>`;
    });
    html += `</div>
    <div style="font-size:10px;color:var(--dim);margin-top:8px">Add or edit subjects in Tools → Categories after setup.</div>`;
  }

  if (step === 3) {
    html += `<div class="planner-step-label">Add your first task to get started!</div>
    <div style="font-size:11px;color:var(--dim);margin-bottom:12px">You can add more from the Schedule view anytime.</div>
    <div class="grades-form-row">
      <input class="inbox-capture-input" id="onboard-task" type="text" placeholder="e.g. Read chapter 3" style="flex:1">
      <select class="editor-select" id="onboard-task-cat">
        ${categories.keys().map(k => `<option value="${k}">${escapeHtml(categories.getLabel(k) || k)}</option>`).join('')}
      </select>
    </div>
    <div style="font-size:11px;color:var(--accent);margin-top:8px">🎉 You're all set! Hit "Finish" to start your hub.</div>`;
  }

  // Nav
  html += `<div class="planner-nav">`;
  if (step > 0) html += `<button class="data-btn" data-action="onboardPrev" style="color:var(--muted)">← Back</button>`;
  else html += `<div></div>`;
  if (step < 3) {
    html += `<button class="data-btn" data-action="onboardNext" style="color:var(--accent);border-color:#00d2ff44">Next →</button>`;
  } else {
    html += `<button class="data-btn" data-action="finishOnboarding" style="color:var(--accent);border-color:#00d2ff44">Finish ✓</button>`;
  }
  html += `</div></div></div>`;
  return html;
}

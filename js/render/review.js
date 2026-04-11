// ════════════════════════════════════════
// ── Weekly Review Wizard Renderer ──
// ════════════════════════════════════════

import {
  generateReviewData, getReviewStep, getReviewDraft,
  hasReviewForCurrentWeek, getReviewForWeek,
} from '../review.js';
import { getWeekKey } from '../state.js';

export function renderReviewView(ctx) {
  try { return _renderReviewInner(ctx); }
  catch (err) {
    console.error('[render] Review failed:', err);
    return `<div style="padding:24px;color:#e94560">Review error: ${ctx.escapeHtml(String(err))}</div>`;
  }
}

function _renderReviewInner(ctx) {
  const { escapeHtml, categories } = ctx;
  const step = getReviewStep();
  const data = generateReviewData();
  const draft = getReviewDraft();
  const existing = getReviewForWeek(getWeekKey());

  let html = `<div class="view-page">
    <div class="view-page-header">
      <h1 class="view-page-title">📋 Weekly Review</h1>
      <div class="view-page-sub">${data.weekKey} &mdash; guided reflection on your week</div>
    </div>`;

  // Progress indicator
  const steps = ['Overview', 'Days', 'Subjects', 'Reflect', 'Done'];
  html += `<div class="review-steps">`;
  steps.forEach((label, i) => {
    const cls = i < step ? 'done' : i === step ? 'active' : '';
    html += `<div class="review-step ${cls}">
      <div class="review-step-dot">${i < step ? '✓' : i + 1}</div>
      <div class="review-step-label">${label}</div>
    </div>`;
    if (i < steps.length - 1) html += `<div class="review-step-line ${i < step ? 'done' : ''}"></div>`;
  });
  html += `</div>`;

  // ── Step 0: Overview ──
  if (step === 0) {
    const trendIcon = data.trend > 0 ? '↑' : data.trend < 0 ? '↓' : '→';
    const trendColor = data.trend > 0 ? '#00e676' : data.trend < 0 ? '#e94560' : 'var(--dim)';
    html += `<div class="review-section">
      <div class="review-section-title">Week at a Glance</div>
      <div class="review-stat-grid">
        <div class="review-stat-card">
          <div class="review-stat-val">${data.wp.pct}%</div>
          <div class="review-stat-label">Completion</div>
        </div>
        <div class="review-stat-card">
          <div class="review-stat-val">${data.wp.done}/${data.wp.total}</div>
          <div class="review-stat-label">Tasks done</div>
        </div>
        <div class="review-stat-card">
          <div class="review-stat-val">${data.skippedTasks.length}</div>
          <div class="review-stat-label">Skipped</div>
        </div>
        <div class="review-stat-card">
          <div class="review-stat-val" style="color:${trendColor}">${trendIcon} ${Math.abs(data.trend)}%</div>
          <div class="review-stat-label">vs last week</div>
        </div>
      </div>`;
    if (data.recentWeeks.length > 1) {
      html += `<div class="review-trend">`;
      data.recentWeeks.forEach(([key, p]) => {
        const h = Math.max(4, Math.round(p * 0.5));
        const c = p >= 80 ? '#00e676' : p >= 50 ? '#00d2ff' : p >= 20 ? '#ffab00' : '#e94560';
        html += `<div class="review-trend-bar" style="height:${h}px;background:${c}" title="${key}: ${p}%">
          <span class="review-trend-label">${p}%</span>
        </div>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
    html += _navButtons(step, 'Start Review →');
  }

  // ── Step 1: Day Breakdown ──
  if (step === 1) {
    html += `<div class="review-section">
      <div class="review-section-title">Day-by-Day Breakdown</div>`;
    data.dayBreakdown.forEach(d => {
      if (d.total === 0) return;
      const color = d.pct >= 80 ? '#00e676' : d.pct >= 50 ? '#00d2ff' : d.pct >= 20 ? '#ffab00' : '#e94560';
      html += `<div class="review-day-row">
        <div class="review-day-name" style="color:${color}">${escapeHtml(d.day.slice(0, 3).toUpperCase())}</div>
        <div class="review-day-bar-wrap">
          <div class="review-day-bar" style="width:${d.pct}%;background:${color}"></div>
        </div>
        <div class="review-day-stat">${d.done}/${d.total} <span style="color:${color}">${d.pct}%</span></div>
      </div>`;
    });
    if (data.incompleteTasks.length > 0) {
      html += `<div class="review-subsection">
        <div class="review-subsection-title">${data.incompleteTasks.length} Incomplete Tasks</div>`;
      data.incompleteTasks.slice(0, 10).forEach(t => {
        const c = categories.getColor(t.cat);
        html += `<div class="review-task-row">
          <div class="review-task-dot" style="background:${c.border}"></div>
          <div class="review-task-text">${escapeHtml(t.text)}</div>
          <div class="review-task-day">${escapeHtml(t.day.slice(0, 3))}</div>
        </div>`;
      });
      if (data.incompleteTasks.length > 10) {
        html += `<div style="font-size:10px;color:var(--dim);margin-top:4px">+${data.incompleteTasks.length - 10} more</div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
    html += _navButtons(step);
  }

  // ── Step 2: Subjects ──
  if (step === 2) {
    html += `<div class="review-section">
      <div class="review-section-title">Subject Performance</div>`;
    if (data.subjectPerformance.length > 0) {
      data.subjectPerformance.forEach(s => {
        const c = categories.getColor(s.cat);
        const color = s.pct >= 80 ? '#00e676' : s.pct >= 50 ? '#00d2ff' : s.pct >= 20 ? '#ffab00' : '#e94560';
        html += `<div class="review-subject-row">
          <div class="review-subject-swatch" style="background:${c.border}"></div>
          <div class="review-subject-name">${escapeHtml(s.label)}</div>
          <div class="review-day-bar-wrap" style="flex:1">
            <div class="review-day-bar" style="width:${s.pct}%;background:${color}"></div>
          </div>
          <div class="review-subject-pct" style="color:${color}">${s.done}/${s.total} · ${s.pct}%</div>
        </div>`;
      });
    } else {
      html += `<div class="home-card-empty">No subject data yet</div>`;
    }
    if (data.suggestions.length > 0) {
      html += `<div class="review-subsection">
        <div class="review-subsection-title">💡 Suggestions</div>`;
      data.suggestions.forEach(s => {
        html += `<div class="review-suggestion">${escapeHtml(s)}</div>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
    html += _navButtons(step);
  }

  // ── Step 3: Reflection ──
  if (step === 3) {
    html += `<div class="review-section">
      <div class="review-section-title">Reflect on Your Week</div>
      <div class="review-field">
        <label class="review-field-label">🌟 What was the highlight?</label>
        <textarea class="review-textarea" id="review-highlight" placeholder="Best moment, breakthrough, or win..." data-input-action="updateReviewDraft" data-field="highlight">${escapeHtml(draft.highlight || existing?.highlight || '')}</textarea>
      </div>
      <div class="review-field">
        <label class="review-field-label">🔧 What would you improve?</label>
        <textarea class="review-textarea" id="review-improvement" placeholder="What held you back? What to change next week..." data-input-action="updateReviewDraft" data-field="improvement">${escapeHtml(draft.improvement || existing?.improvement || '')}</textarea>
      </div>
      <div class="review-field">
        <label class="review-field-label">📝 Free reflection</label>
        <textarea class="review-textarea review-textarea-lg" id="review-reflection" placeholder="Anything else on your mind about this week..." data-input-action="updateReviewDraft" data-field="reflection">${escapeHtml(draft.reflection || existing?.reflection || '')}</textarea>
      </div>
    </div>`;
    html += _navButtons(step, 'Save & Finish →');
  }

  // ── Step 4: Done ──
  if (step === 4) {
    const saved = getReviewForWeek(getWeekKey());
    html += `<div class="review-section" style="text-align:center;padding:40px 20px">
      <div style="font-size:40px;margin-bottom:16px">✨</div>
      <div style="font-size:16px;font-weight:700;color:var(--text-bright);margin-bottom:8px">Week reviewed!</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:24px">
        ${data.wp.pct}% completion · ${data.wp.done} tasks done · ${data.skippedTasks.length} skipped
      </div>`;
    if (saved?.highlight) {
      html += `<div class="review-saved-card">
        <div class="review-saved-label">🌟 Highlight</div>
        <div class="review-saved-text">${escapeHtml(saved.highlight)}</div>
      </div>`;
    }
    if (saved?.improvement) {
      html += `<div class="review-saved-card">
        <div class="review-saved-label">🔧 Improvement</div>
        <div class="review-saved-text">${escapeHtml(saved.improvement)}</div>
      </div>`;
    }
    if (saved?.reflection) {
      html += `<div class="review-saved-card">
        <div class="review-saved-label">📝 Notes</div>
        <div class="review-saved-text">${escapeHtml(saved.reflection)}</div>
      </div>`;
    }
    html += `<div style="margin-top:24px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
      <button class="data-btn" data-action="reviewRestart" style="color:var(--accent);border-color:#00d2ff44">↺ Review Again</button>
      <a class="data-btn" href="#home" style="text-decoration:none;color:var(--muted)">← Back to Home</a>
    </div>
    </div>`;
  }

  html += `</div>`; // .view-page
  return html;
}

function _navButtons(step, nextLabel) {
  return `<div class="review-nav">
    ${step > 0 ? `<button class="data-btn" data-action="reviewPrev" style="color:var(--muted)">← Back</button>` : '<div></div>'}
    <button class="data-btn" data-action="reviewNext" style="color:var(--accent);border-color:#00d2ff44">${nextLabel || 'Next →'}</button>
  </div>`;
}

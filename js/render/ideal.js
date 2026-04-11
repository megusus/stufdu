// ════════════════════════════════════════
// ── Ideal Week View Renderer ──
// ════════════════════════════════════════

import { loadIdealWeek, getIdealUIState } from '../ideal.js';
import { DAYS } from '../schedule.js';

export function renderIdealView(ctx) {
  try { return _renderIdealInner(ctx); }
  catch (err) {
    console.error('[render] Ideal failed:', err);
    return `<div style="padding:24px;color:#e94560">Ideal view error: ${ctx.escapeHtml(String(err))}</div>`;
  }
}

function _renderIdealInner(ctx) {
  const { escapeHtml, categories, getDayProgress } = ctx;

  const ideal = loadIdealWeek();
  const { showCompare, editingDay } = getIdealUIState();

  let html = `<div class="view-page">
    <div class="view-page-header">
      <h1 class="view-page-title">✦ Ideal Week</h1>
      <div class="view-page-sub">Define your aspirational weekly template and track the gap</div>
    </div>`;

  // Mode toggle
  html += `<div class="view-mode-toggle" style="margin-bottom:20px">
    <button class="view-btn${!showCompare ? ' active' : ''}" data-action="setIdealMode" data-mode="edit">Edit</button>
    <button class="view-btn${showCompare ? ' active' : ''}" data-action="setIdealMode" data-mode="compare">Compare</button>
  </div>`;

  if (showCompare) {
    // ── Compare view ──
    html += `<div style="font-size:10px;color:var(--dim);margin-bottom:14px;text-transform:uppercase;letter-spacing:1px">Ideal vs Actual this week</div>
      <div class="ideal-compare-grid">`;
    DAYS.forEach(day => {
      const idealDay = ideal[day];
      const actualProg = getDayProgress(day);
      const idealTotal = (idealDay?.sections || []).reduce((s, sec) => s + (sec.items || []).length, 0);
      const pct = idealTotal
        ? Math.min(100, Math.round((actualProg.done / idealTotal) * 100))
        : actualProg.pct;
      const color = pct >= 80 ? '#00e676' : pct >= 50 ? '#00d2ff' : pct >= 20 ? '#ffab00' : '#e94560';
      html += `<div class="ideal-compare-card">
        <div class="ideal-compare-day" style="color:${color}">${escapeHtml(day.slice(0, 3).toUpperCase())}</div>
        <div class="ideal-compare-row">
          <div class="ideal-compare-col">
            <div class="ideal-compare-label">Ideal</div>
            <div class="ideal-compare-val">${idealTotal}</div>
          </div>
          <div class="ideal-compare-sep"></div>
          <div class="ideal-compare-col">
            <div class="ideal-compare-label">Done</div>
            <div class="ideal-compare-val" style="color:${color}">${actualProg.done}</div>
          </div>
        </div>
        <div class="ideal-compare-bar">
          <div class="ideal-compare-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="ideal-compare-pct" style="color:${color}">${pct}%</div>
      </div>`;
    });
    html += `</div>`;
  } else {
    // ── Edit view ──
    html += `<div class="tabs" style="margin-bottom:20px">`;
    DAYS.forEach(day => {
      const idealDay = ideal[day];
      const count = (idealDay?.sections || []).reduce((s, sec) => s + (sec.items || []).length, 0);
      html += `<button class="tab${editingDay === day ? ' active' : ''}" data-action="selectIdealDay" data-day="${escapeHtml(day)}">
        ${escapeHtml(day.slice(0, 3))}
        ${count > 0 ? `<div class="tab-progress" style="width:100%;opacity:0.25;background:var(--accent)"></div>` : ''}
      </button>`;
    });
    html += `</div>`;

    const day = ideal[editingDay] || { wake: '08:00', leave: null, meta: null, sections: [{ label: 'Tasks', items: [] }] };

    // Day details
    html += `<div class="editor-section" style="margin-bottom:16px">
      <div class="editor-section-header">
        <span class="editor-section-label">Day Details — ${escapeHtml(editingDay)}</span>
      </div>
      <div class="settings-row">
        <label>Wake time</label>
        <input class="settings-input" id="ideal-wake-${editingDay}" type="time" value="${escapeHtml(day.wake || '08:00')}">
      </div>
      <div class="settings-row">
        <label>Leave time (optional)</label>
        <input class="settings-input" id="ideal-leave-${editingDay}" type="time" value="${escapeHtml(day.leave || '')}">
      </div>
      <div class="settings-row">
        <label>Day note</label>
        <input class="settings-input" id="ideal-meta-${editingDay}" value="${escapeHtml(day.meta || '')}" placeholder="e.g. class day, meeting...">
      </div>
      <button class="editor-add-btn" style="width:100%;margin-top:6px" data-action="saveIdealDayMeta" data-day="${escapeHtml(editingDay)}">Save Details</button>
    </div>`;

    // Sections + tasks
    day.sections.forEach((section, sIdx) => {
      html += `<div class="editor-section">
        <div class="editor-section-header">
          <span class="editor-section-label">${escapeHtml(section.label)}</span>
          <span class="editor-section-actions">
            ${day.sections.length > 1 ? `<button class="cat-row-btn danger" data-action="removeIdealSection" data-day="${escapeHtml(editingDay)}" data-i="${sIdx}" title="Delete section">✕</button>` : ''}
          </span>
        </div>`;
      section.items.forEach((item, iIdx) => {
        const c = categories.getColor(item.cat);
        html += `<div class="editor-item">
          <span class="editor-item-text">${escapeHtml(item.text)}</span>
          <span class="editor-item-cat" style="color:${c.border}">${categories.getLabel(item.cat) || item.cat}</span>
          <button class="editor-remove-btn" data-action="removeIdealTask" data-day="${escapeHtml(editingDay)}" data-i="${sIdx}" data-j="${iIdx}" title="Remove">✕</button>
        </div>`;
      });
      html += `<div class="editor-add-row">
        <input class="editor-input" id="ideal-text-${sIdx}" type="text" placeholder="Task text...">
        <select class="editor-select" id="ideal-cat-${sIdx}">`;
      categories.keys().forEach(k => {
        html += `<option value="${k}">${categories.getLabel(k) || k}</option>`;
      });
      html += `</select>
        <button class="editor-add-btn" data-action="addIdealTask" data-day="${escapeHtml(editingDay)}" data-i="${sIdx}">+ Add</button>
      </div></div>`;
    });

    html += `<button class="editor-add-btn" style="width:100%;margin-top:6px;color:var(--accent);border-color:var(--accent)44;background:none"
      data-action="addIdealSection" data-day="${escapeHtml(editingDay)}">+ Add Section</button>`;

    // Import / reset actions
    html += `<div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border)">
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px">
        Import your ideal week as the active schedule, or compare how you're tracking against your goals.
      </div>
      <div class="data-controls">
        <button class="data-btn" style="color:var(--accent);border-color:#00d2ff44" data-action="importIdealAsSchedule">
          ↓ Use as this week's plan
        </button>
        <button class="data-btn" style="color:#e94560;border-color:#e9456033" data-action="resetIdealToDefault">
          ↺ Reset to default template
        </button>
      </div>
    </div>`;
  }

  html += `</div>`; // .view-page
  return html;
}

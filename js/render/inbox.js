// ════════════════════════════════════════
// ── Inbox View Renderer ──
// ════════════════════════════════════════

import { loadInbox } from '../inbox.js';
import { DAYS } from '../schedule.js';

export function renderInboxView(ctx) {
  try { return _renderInboxInner(ctx); }
  catch (err) {
    console.error('[render] Inbox failed:', err);
    return `<div style="padding:24px;color:#e94560">Inbox error: ${ctx.escapeHtml(String(err))}</div>`;
  }
}

function _renderInboxInner(ctx) {
  const { escapeHtml, categories, schedule, state } = ctx;
  const items = loadInbox();

  let html = `<div class="view-page">
    <div class="view-page-header">
      <h1 class="view-page-title">📥 Inbox</h1>
      <div class="view-page-sub">Captured thoughts — triage into tasks, deadlines, or notes</div>
    </div>`;

  // Quick capture at the top
  html += `<div class="inbox-capture-row" data-stop>
    <input class="inbox-capture-input" id="inbox-capture-input" type="text"
      placeholder="Capture a thought, task, or idea..."
      data-key-action="inboxCaptureKey">
    <button class="data-btn" data-action="inboxCapture" style="color:var(--accent);border-color:#00d2ff44;flex-shrink:0">+ Capture</button>
  </div>`;

  if (items.length === 0) {
    html += `<div class="inbox-empty">
      <div class="inbox-empty-icon">📥</div>
      <div class="inbox-empty-title">Inbox is empty</div>
      <div class="inbox-empty-sub">Use the field above or press <kbd>N</kbd> anywhere to capture quickly.</div>
    </div>`;
  } else {
    html += `<div class="inbox-header-row">
      <span style="font-size:11px;color:var(--dim)">${items.length} item${items.length !== 1 ? 's' : ''}</span>
      <button class="data-btn" data-action="inboxClearAll" style="color:#e94560;border-color:#e9456033;font-size:10px">Clear all</button>
    </div>`;

    items.forEach(item => {
      const rel = _relativeTime(item.createdAt);
      html += `<div class="inbox-item" id="inbox-item-${escapeHtml(item.id)}">
        <div class="inbox-item-main">
          <div class="inbox-item-text">${escapeHtml(item.text)}</div>
          <div class="inbox-item-time">${rel}</div>
        </div>
        <div class="inbox-item-actions">
          <div class="inbox-triage-group">
            <span style="font-size:9px;color:var(--dim);display:block;margin-bottom:4px">→ Task</span>
            <select class="editor-select inbox-day-select" id="inbox-day-${escapeHtml(item.id)}">
              ${DAYS.map(d => `<option value="${d}">${d.slice(0,3)}</option>`).join('')}
            </select>
            <button class="data-btn" data-action="inboxToTask" data-id="${escapeHtml(item.id)}"
              style="font-size:10px;color:var(--accent);border-color:#00d2ff44">Add task</button>
          </div>
          <div class="inbox-triage-group">
            <span style="font-size:9px;color:var(--dim);display:block;margin-bottom:4px">→ Deadline</span>
            <input type="date" class="settings-input inbox-date-input" id="inbox-date-${escapeHtml(item.id)}"
              value="${new Date().toISOString().slice(0,10)}" style="font-size:10px">
            <button class="data-btn" data-action="inboxToDeadline" data-id="${escapeHtml(item.id)}"
              style="font-size:10px;color:#b44aff;border-color:#b44aff33">Add deadline</button>
          </div>
          <div class="inbox-triage-group">
            <span style="font-size:9px;color:var(--dim);display:block;margin-bottom:4px">→ Other</span>
            <button class="data-btn" data-action="inboxToScratch" data-id="${escapeHtml(item.id)}"
              style="font-size:10px;color:var(--muted)">Scratchpad</button>
            <button class="data-btn" data-action="inboxRemove" data-id="${escapeHtml(item.id)}"
              style="font-size:10px;color:#e94560;border-color:#e9456033">Dismiss</button>
          </div>
        </div>
      </div>`;
    });
  }

  html += `</div>`; // .view-page
  return html;
}

function _relativeTime(iso) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return ''; }
}

// ════════════════════════════════════════
// ── Main Render Orchestrator ──
// ════════════════════════════════════════

import { DAYS, schedule, getDayLabel } from '../schedule.js';
import {
  state, escapeHtml,
  getDayProgress, getWeeklyProgress, invalidateProgressCache,
  getCurrentSectionIndex, todayIdx,
} from '../state.js';
import { buildRenderContext } from './context.js';
import { renderHeaderControls } from './header.js';
import { renderWeekView as renderWeekViewModule } from './week-view.js';
import { renderDayView as renderDayViewModule } from './day-view.js';
import { renderPanels as renderPanelsModule } from './panels.js';
import { renderFAB } from './fab.js';
import { renderScratchpad } from './scratchpad.js';
import { ensurePomoBar } from '../ui/timer.js';
import { showToast } from '../ui/toggle.js';

// ── Render batching ──
let _renderQueued = false;

export function render() {
  if (_renderQueued) return;
  _renderQueued = true;
  requestAnimationFrame(doRender);
}

export function renderImmediate() { doRender(); }

export function doRender() {
  _renderQueued = false;
  try {
    _doRenderInner();
  } catch (err) {
    console.error('[render] Fatal render error:', err);
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.innerHTML = `
        <div style="padding:40px 24px;max-width:480px;margin:0 auto;font-family:inherit;text-align:center">
          <div style="font-size:48px;margin-bottom:16px">\u26a0\ufe0f</div>
          <div style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:8px">Render error</div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:16px">
            Something went wrong while drawing the UI. Your data is safe.
          </div>
          <pre style="font-size:10px;text-align:left;background:var(--surface);color:#e94560;padding:12px;border-radius:8px;overflow:auto;margin-bottom:20px;white-space:pre-wrap;word-break:break-all">${escapeHtml(String(err))}</pre>
          <button data-action="reloadApp" style="font-family:inherit;font-size:13px;font-weight:600;padding:10px 28px;background:var(--accent);color:#09090b;border:none;border-radius:8px;cursor:pointer">
            Reload App
          </button>
        </div>`;
    }
  }
}

function _doRenderInner() {
  invalidateProgressCache();
  const scrollY = window.scrollY;
  const _focusId = document.activeElement?.id;
  const _focusVal = document.activeElement?.value;
  const _focusSel = [document.activeElement?.selectionStart, document.activeElement?.selectionEnd];

  // Build render context — single source of truth for all sub-renderers
  const ctx = buildRenderContext();
  const { dayName, day, prog, wp, isToday } = ctx;
  const currentSectionIdx = isToday ? getCurrentSectionIndex(day.sections) : -1;

  let html = '';

  html += renderHeaderControls(ctx);

  // ── Week view ──
  if (state.viewMode === 'week') {
    html += renderWeekViewModule(ctx);
  }

  // ── Day view ──
  if (state.viewMode === 'day') {
    html += renderDayViewModule(ctx, currentSectionIdx);
  }

  // ── Panels ──
  html += renderPanelsModule(ctx);

  // Reset
  if (state.viewMode === 'day') {
    html += `<div class="reset-wrap"><button class="reset-btn" data-action="resetDay">Reset ${escapeHtml(getDayLabel(dayName))}</button></div>`;
  }

  const appEl = document.getElementById('app');
  appEl.className = 'app' + (state.fontScale === 'large' ? ' font-large' : '');
  appEl.innerHTML = html;

  // FAB
  renderFAB(ctx);

  // Scratchpad
  renderScratchpad(ctx);

  // Focus timer bar
  ensurePomoBar(render, showToast);

  // Restore focus
  if (_focusId) {
    const _focusEl = document.getElementById(_focusId);
    if (_focusEl) {
      if (_focusVal !== undefined && 'value' in _focusEl) _focusEl.value = _focusVal;
      _focusEl.focus();
      try { if (_focusSel[0] != null) _focusEl.setSelectionRange(_focusSel[0], _focusSel[1]); } catch(e) {}
    }
  }

  requestAnimationFrame(() => window.scrollTo(0, scrollY));
}

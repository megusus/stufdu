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
import { renderSchedulePanels } from './panels.js';
import { renderFAB } from './fab.js';
import { renderScratchpad } from './scratchpad.js';
import { showToast } from '../ui/toggle.js';
import { currentView } from '../router.js';
import { renderNav } from './nav.js';
import { renderHome } from './home.js';
import { renderIdealView } from './ideal.js';
import { renderToolsView } from './tools-view.js';
import { renderStatsView } from './stats-view.js';
import { renderReviewView } from './review.js';
import { renderInboxView } from './inbox.js';
import { renderHabitsView } from './habits.js';
import { renderGradesView } from './grades.js';
import { renderMatrixView } from './matrix.js';
import { renderCalendarView } from './calendar.js';
import { renderOnboardingOverlay } from './onboarding.js';
import { renderPlannerOverlay } from './daily-plan.js';
import { getActiveTimer, getElapsedSeconds } from '../time-tracking.js';
import { renderFlashcardsView } from './flashcards.js';
import { renderGPAView } from './gpa.js';
import { getPinnedItems, getOverflowItems, ALL_NAV_ITEMS } from '../nav-config.js';
import { getSession as getPomodoroSession, getRemainingSecs } from '../pomodoro.js';
import { hasPendingConflict, renderConflictModal } from '../sync-conflict.js';

function _updateTimerBar() {
  const timer = getActiveTimer();
  let el = document.getElementById('time-tracker-bar');
  if (!timer) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.id = 'time-tracker-bar';
    el.className = 'time-tracker-bar';
    document.body.appendChild(el);
  }
  const secs = getElapsedSeconds();
  const m = Math.floor(secs / 60), s = secs % 60;
  el.innerHTML = `<span class="tt-icon">⏱</span>
    <span class="tt-time">${m}:${String(s).padStart(2,'0')}</span>
    <span class="tt-task">${timer.taskText.slice(0,30)}</span>
    <button class="tt-stop" data-action="stopTimeTrack">■ Stop</button>`;
}

// ── Render batching ──
let _renderQueued = false;

export function render() {
  if (_renderQueued) return;
  _renderQueued = true;
  // Use View Transitions API for smooth cross-fades when supported
  if (typeof document.startViewTransition === 'function') {
    requestAnimationFrame(() => {
      document.startViewTransition(() => {
        _renderQueued = false;
        _doRenderInner();
      });
    });
  } else {
    requestAnimationFrame(doRender);
  }
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
          <div style="font-size:48px;margin-bottom:16px">⚠️</div>
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

function _updatePomodoroBar() {
  const session = getPomodoroSession();
  let el = document.getElementById('pomodoro-bar');
  if (!session) {
    if (el) el.remove();
    return;
  }
  const secs   = getRemainingSecs();
  const m      = Math.floor(secs / 60);
  const s      = secs % 60;
  const label  = session.type === 'work' ? '🍅 Focus' : session.type === 'longBreak' ? '☕ Long Break' : '🌿 Break';
  const color  = session.type === 'work' ? '#e94560' : '#00e676';
  const pct    = Math.round((1 - secs / session.durationSecs) * 100);

  if (!el) {
    el = document.createElement('div');
    el.id = 'pomodoro-bar';
    el.className = 'pomodoro-bar';
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <div class="pomodoro-bar-track" style="position:absolute;left:0;top:0;height:3px;width:${pct}%;background:${color};transition:width 1s linear"></div>
    <span class="tt-icon" style="color:${color}">${label}</span>
    <span class="tt-time">${m}:${String(s).padStart(2,'0')}</span>
    <span class="tt-task">${session.sessionsCompleted || 0} session${session.sessionsCompleted !== 1 ? 's' : ''} done</span>
    ${session.type !== 'work'
      ? `<button class="tt-stop" data-action="skipPomodoroBreak">Skip Break →</button>`
      : `<button class="tt-stop" data-action="stopPomodoro" style="color:#e94560">■ Stop</button>`}`;
}

function _updateNavCustomizer(ctx) {
  let el = document.getElementById('nav-customizer-overlay');
  if (!ctx.state.navCustomizerOpen) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'nav-customizer-overlay';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:8000;display:flex;align-items:flex-end;justify-content:center;padding-bottom:env(safe-area-inset-bottom,0)';
    el.addEventListener('click', e => { if (e.target === el) { ctx.state.navCustomizerOpen = false; doRender(); } });
    document.body.appendChild(el);
  }
  const pinned   = getPinnedItems().map(n => n.id);
  const overflow = getOverflowItems().map(n => n.id);

  let h = `<div style="background:var(--surface);border-radius:16px 16px 0 0;width:100%;max-width:480px;padding:20px;border-top:1px solid var(--border)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:14px;font-weight:700;color:var(--text-bright)">Customize Navigation</div>
      <button class="icon-btn" data-action="closeNavCustomizer">✕</button>
    </div>
    <div style="font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Pinned tabs (tap to unpin)</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">`;
  ALL_NAV_ITEMS.filter(n => pinned.includes(n.id)).forEach(n => {
    h += `<button class="data-btn" data-action="unpinNavItem" data-id="${n.id}"
      style="color:#00d2ff;border-color:#00d2ff44;padding:6px 12px;font-size:11px">
      ${n.icon} ${n.label} ✕
    </button>`;
  });
  h += `</div>
    <div style="font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Available (tap to pin)</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">`;
  ALL_NAV_ITEMS.filter(n => !pinned.includes(n.id)).forEach(n => {
    h += `<button class="data-btn" data-action="pinNavItem" data-id="${n.id}"
      style="padding:6px 12px;font-size:11px">
      ${n.icon} ${n.label} +
    </button>`;
  });
  h += `</div>
    <div style="font-size:10px;color:var(--dim);margin-top:4px">Pinned tabs appear in the bottom bar (max 6). All others go into the More ⋯ menu.</div>
  </div>`;
  el.innerHTML = h;
}

function _updateConflictModal(ctx) {
  const existing = document.getElementById('conflict-modal-overlay');
  if (existing) existing.remove();
  if (!hasPendingConflict()) return;
  const html = renderConflictModal(ctx.escapeHtml);
  if (!html) return;
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstElementChild);
}

function _updateFocusOverlay() {
  let el = document.getElementById('focus-session-overlay');
  if (!state.focusSession) {
    if (el) el.remove();
    return;
  }
  const elapsed = Math.floor((Date.now() - state.focusSession.startedAt) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const html = `<div id="focus-session-overlay" class="focus-overlay">
    <div class="focus-overlay-inner">
      <div class="focus-overlay-label">🎯 Focus Mode</div>
      <div class="focus-overlay-task">${escapeHtml(state.focusSession.taskText.slice(0, 60))}</div>
      <div class="focus-overlay-timer">${timeStr}</div>
      <button class="data-btn" data-action="endFocusSession" style="margin-top:20px;color:#e94560;border-color:#e9456044;padding:10px 32px;font-size:14px">■ End Session</button>
    </div>
  </div>`;
  if (el) {
    el.querySelector('.focus-overlay-timer').textContent = timeStr;
  } else {
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container.firstElementChild);
  }
}

function _doRenderInner() {
  invalidateProgressCache();
  const scrollY = window.scrollY;
  const _focusId = document.activeElement?.id;
  const _focusVal = document.activeElement?.value;
  const _focusSel = [document.activeElement?.selectionStart, document.activeElement?.selectionEnd];

  const ctx = buildRenderContext();
  const view = currentView();

  // Update nav (sidebar + bottom tabs)
  renderNav(ctx);

  let html = '';

  if (view === 'schedule') {
    const { dayName, day } = ctx;
    const currentSectionIdx = ctx.isToday ? getCurrentSectionIndex(day.sections) : -1;

    html += renderHeaderControls(ctx);

    if (state.viewMode === 'week') html += renderWeekViewModule(ctx);
    if (state.viewMode === 'day')  html += renderDayViewModule(ctx, currentSectionIdx);

    html += renderSchedulePanels(ctx);

    if (state.viewMode === 'day') {
      html += `<div class="reset-wrap"><button class="reset-btn" data-action="resetDay">Reset ${escapeHtml(getDayLabel(dayName))}</button></div>`;
    }
  } else if (view === 'home') {
    html = renderHome(ctx);
  } else if (view === 'ideal') {
    html = renderIdealView(ctx);
  } else if (view === 'tools') {
    html = renderToolsView(ctx);
  } else if (view === 'stats') {
    html = renderStatsView(ctx);
  } else if (view === 'review') {
    html = renderReviewView(ctx);
  } else if (view === 'inbox') {
    html = renderInboxView(ctx);
  } else if (view === 'habits') {
    html = renderHabitsView(ctx);
  } else if (view === 'grades') {
    html = renderGradesView(ctx);
  } else if (view === 'matrix') {
    html = renderMatrixView(ctx);
  } else if (view === 'calendar') {
    html = renderCalendarView(ctx);
  } else if (view === 'flashcards') {
    html = renderFlashcardsView(ctx);
  } else if (view === 'gpa') {
    html = renderGPAView(ctx);
  } else {
    html = renderHome(ctx);
  }

  const appEl = document.getElementById('app');
  appEl.className = 'app' + (state.fontScale === 'large' ? ' font-large' : '');
  appEl.innerHTML = html;

  // FAB
  renderFAB(ctx);

  // Scratchpad
  renderScratchpad(ctx);

  // Daily Planner overlay
  const existingPlanner = document.getElementById('planner-overlay');
  if (existingPlanner) existingPlanner.remove();
  const plannerHtml = renderPlannerOverlay(ctx);
  if (plannerHtml) {
    const el = document.createElement('div');
    el.innerHTML = plannerHtml;
    document.body.appendChild(el.firstElementChild);
  }

  // Time tracker bar
  _updateTimerBar();

  // Pomodoro bar
  _updatePomodoroBar();

  // Sync conflict modal
  _updateConflictModal(ctx);

  // Nav customizer overlay
  _updateNavCustomizer(ctx);

  // Focus session overlay
  _updateFocusOverlay();

  // Onboarding overlay
  const existingOnboard = document.getElementById('onboarding-overlay');
  if (existingOnboard) existingOnboard.remove();
  const onboardHtml = renderOnboardingOverlay(ctx);
  if (onboardHtml) {
    const el = document.createElement('div');
    el.innerHTML = onboardHtml;
    document.body.appendChild(el.firstElementChild);
  }

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

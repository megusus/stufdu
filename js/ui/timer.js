// ════════════════════════════════════════
// ── Focus Timer (Pomodoro) ──
// ════════════════════════════════════════

import { Storage } from '../storage.js';
import { state, escapeHtml, haptic, logPomoSession } from '../state.js';
import { findItemById } from '../schedule.js';

let _pomoBarEl = null;
let _pomoBarPos = null;
let _timerCtxMenuFn = null;

export function setTimerContextMenu(fn) {
  _timerCtxMenuFn = fn;
}

export function setFocusTimerMin(min) {
  state.focusTimerMin = Math.max(1, Math.min(180, parseInt(min) || 25));
  Storage.setRaw('timer-min', state.focusTimerMin);
}

export function startPomo(taskId, render, showToast, customMin) {
  const item = findItemById(taskId);
  if (!item) return;
  const mins = customMin || state.focusTimerMin;
  state.pomoState = { taskId, taskText: item.text, startTime: Date.now(), duration: mins * 60 * 1000, paused: false, elapsed: 0 };
  haptic('success');
  state.pomoInterval = setInterval(() => pomoTick(render, showToast), 1000);
  render();
  showToast(`Focus timer started \u2014 ${mins} min`);
}

function pomoTick(render, showToast) {
  if (!state.pomoState || state.pomoState.paused) return;
  state.pomoState.elapsed = Date.now() - state.pomoState.startTime;
  if (state.pomoState.elapsed >= state.pomoState.duration) {
    finishPomo(render, showToast);
    return;
  }
  _updatePomoBarContent(render, showToast);
}

export function finishPomo(render, showToast) {
  clearInterval(state.pomoInterval);
  logPomoSession(state.pomoState.taskId, state.pomoState.elapsed);
  haptic('heavy');
  showToast('Focus session complete! Take a break.');
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification('Focus Timer Complete', { body: 'Take a break!', icon: '\ud83d\udcd8' });
  }
  state.pomoState = null;
  ensurePomoBar(render, showToast);
  render();
}

export function cancelPomo(render, showToast) {
  if (state.pomoState && state.pomoState.elapsed > 60000) logPomoSession(state.pomoState.taskId, state.pomoState.elapsed);
  clearInterval(state.pomoInterval);
  state.pomoState = null;
  ensurePomoBar(render, showToast);
  render();
  showToast('Focus timer cancelled');
}

export function togglePomoPause(render) {
  if (!state.pomoState) return;
  if (state.pomoState.paused) {
    state.pomoState.startTime = Date.now() - state.pomoState.elapsed;
    state.pomoState.paused = false;
  } else {
    state.pomoState.paused = true;
  }
  render();
}

export function restartPomo(showToast) {
  if (!state.pomoState) return;
  state.pomoState.startTime = Date.now();
  state.pomoState.elapsed = 0;
  state.pomoState.paused = false;
  haptic('success');
  showToast(`Timer restarted \u2014 ${Math.round(state.pomoState.duration / 60000)} min`);
}

export function resetPomoPosition() {
  if (!_pomoBarEl) return;
  _pomoBarEl.style.left = '50%';
  _pomoBarEl.style.top = '';
  _pomoBarEl.style.bottom = '84px';
  _pomoBarEl.style.transform = 'translateX(-50%)';
  _pomoBarPos = null;
}

function _updatePomoBarContent(render, showToast) {
  if (!_pomoBarEl || !state.pomoState) return;
  const remain = Math.max(0, state.pomoState.duration - state.pomoState.elapsed);
  const m = Math.floor(remain / 60000), s = Math.floor((remain % 60000) / 1000);
  const pct = state.pomoState.elapsed / state.pomoState.duration;
  const circ = 2 * Math.PI * 15;
  _pomoBarEl.innerHTML = `
    <svg class="pomo-ring" viewBox="0 0 36 36"><circle class="pomo-ring-bg" cx="18" cy="18" r="15"/><circle class="pomo-ring-fg" cx="18" cy="18" r="15" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pct)}"/></svg>
    <div class="pomo-time">${m}:${String(s).padStart(2, '0')}</div>
    <div class="pomo-task" title="${escapeHtml(state.pomoState.taskText)}">${escapeHtml(state.pomoState.taskText.slice(0, 25))}</div>
    <button class="pomo-btn" data-action="togglePomoPause" title="${state.pomoState.paused ? 'Resume' : 'Pause'}">${state.pomoState.paused ? '\u25b6' : '\u23f8'}</button>
    <button class="pomo-btn" data-action="restartPomo" title="Restart">\u21bb</button>
    <button class="pomo-btn" data-action="resetPomoPosition" title="Re-center">\u2316</button>
    <button class="pomo-btn stop" data-action="cancelPomo" title="Stop">\u2715</button>`;
}

function _initPomoDrag(el) {
  let startX, startY, origX, origY, dragging = false;
  function onStart(e) {
    if (e.button && e.button !== 0) return;
    if (e.target.closest('.pomo-btn')) return;
    e.preventDefault();
    const t = e.touches ? e.touches[0] : e;
    const rect = el.getBoundingClientRect();
    startX = t.clientX; startY = t.clientY;
    origX = rect.left + rect.width / 2; origY = rect.top + rect.height / 2;
    dragging = true;
    el.classList.add('dragging');
  }
  function onMove(e) {
    if (!dragging) return;
    const t = e.touches ? e.touches[0] : e;
    const dx = t.clientX - startX, dy = t.clientY - startY;
    const newX = Math.max(80, Math.min(window.innerWidth - 80, origX + dx));
    const newY = Math.max(30, Math.min(window.innerHeight - 30, origY + dy));
    el.style.left = newX + 'px';
    el.style.top = newY + 'px';
    el.style.bottom = 'auto';
    el.style.transform = 'translate(-50%, -50%)';
    _pomoBarPos = { x: newX, y: newY };
  }
  function onEnd() {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('dragging');
  }
  el.addEventListener('mousedown', onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd);
  el.addEventListener('touchstart', onStart, { passive: false });
  document.addEventListener('touchmove', onMove, { passive: true });
  document.addEventListener('touchend', onEnd);
}

export function ensurePomoBar(render, showToast) {
  if (state.pomoState && !_pomoBarEl) {
    _pomoBarEl = document.createElement('div');
    _pomoBarEl.className = 'pomo-bar';
    _pomoBarEl.id = 'pomo-bar';
    _pomoBarEl.style.animation = 'fabSlideUp 0.25s ease-out';
    _pomoBarEl.oncontextmenu = e => {
      if (_timerCtxMenuFn) _timerCtxMenuFn(e);
    };
    document.body.appendChild(_pomoBarEl);
    _initPomoDrag(_pomoBarEl);
    _updatePomoBarContent(render, showToast);
  } else if (!state.pomoState && _pomoBarEl) {
    _pomoBarEl.remove();
    _pomoBarEl = null;
    _pomoBarPos = null;
  }
}

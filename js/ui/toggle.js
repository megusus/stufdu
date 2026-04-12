// ════════════════════════════════════════
// ── Task Toggle, Actions, Notes, Links, Context Menus ──
// ════════════════════════════════════════

import { CONFIG } from '../config.js';
import { DAYS, schedule } from '../schedule.js';
import { CategoryRegistry } from '../categories.js';
import {
  state, getStatus, getWeekKey, STATUS_DONE, STATUS_SKIP, STATUS_PROGRESS, STATUS_BLOCKED,
  getDayProgress, getWeeklyProgress, invalidateProgressCache, getTaskDay, isTaskLocked,
  isDayLocked, haptic, escapeHtml, saveState, saveLinks, formatEst,
} from '../state.js';
import { findItemById } from '../schedule.js';
import { Storage } from '../storage.js';
import { syncPush } from '../sync.js';
import { activateModal, announce, deactivateModal } from './a11y.js';
import { spawnDayComplete } from './confetti.js';
// Forward references set by init.js
let _render = () => {};
let _doRender = () => {};

export function setRenderFn(renderFn, doRenderFn) {
  _render = renderFn;
  _doRender = doRenderFn;
}

// ── Toast / Undo ──
// type: 'default' | 'success' | 'warning' | 'error' | 'info'
export function showToast(msg, type = 'default') {
  const toast = document.getElementById('toast');
  const canUndo = state.lastToggle && /^(Task completed|Task unchecked|Skipped|Status cleared|In progress|Blocked)$/.test(String(msg));
  const undo = canUndo
    ? '<button class="toast-undo" data-action="undoToggle">Undo</button>'
    : '';
  toast.innerHTML = `<span>${escapeHtml(msg)}</span>${undo}`;
  toast.className = `toast show${type !== 'default' ? ' toast--' + type : ''}`;
  announce(msg);
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(hideToast, CONFIG.toastDuration);
}

export function hideToast() {
  const toast = document.getElementById('toast');
  if (toast) toast.classList.remove('show');
}

export function undoToggle() {
  if (!state.lastToggle) return;
  if (state.lastToggle.prevStatus) {
    state.checked[state.lastToggle.id] = state.lastToggle.prevStatus;
  } else {
    delete state.checked[state.lastToggle.id];
  }
  state.lastToggle = null;
  saveState();
  syncPush();
  hideToast();
  _render();
}

// ── Custom confirm modal ──
export function showConfirm(message, onConfirm, confirmLabel = 'Confirm') {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.setAttribute('aria-labelledby', 'confirm-title');
  overlay.innerHTML = `<div class="confirm-box">
    <div class="confirm-msg" id="confirm-title">${escapeHtml(message).replace(/\n/g, '<br>')}</div>
    <div class="confirm-actions">
      <button class="confirm-btn" id="confirm-cancel">Cancel</button>
      <button class="confirm-btn danger" id="confirm-ok">${escapeHtml(confirmLabel)}</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  activateModal(overlay, 'Confirm action');
  const close = () => { deactivateModal(overlay); overlay.remove(); };
  overlay.querySelector('#confirm-cancel').onclick = close;
  overlay.querySelector('#confirm-ok').onclick = () => { close(); onConfirm(); };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

// ── Lock ──
export function toggleLock(dayName) {
  if (state.lockedDays[dayName]) {
    delete state.lockedDays[dayName];
    showToast(dayName + ' unlocked');
  } else {
    state.lockedDays[dayName] = true;
    showToast(dayName + ' locked');
  }
  saveState();
  syncPush();
  _render();
}

// ── Toggle (tap checkbox = toggle done) ──
export function toggle(id) {
  if (isTaskLocked(id)) { showToast('Day is locked', 'error'); haptic('error'); return; }
  const prev = state.checked[id];
  const wasDone = getStatus(id) === STATUS_DONE;
  if (wasDone) {
    delete state.checked[id];
    haptic('light');
  } else {
    state.checked[id] = STATUS_DONE;
    state.justCompletedId = id;
    setTimeout(() => { state.justCompletedId = null; }, 500);
    haptic('success');
  }
  state.lastToggle = { id, prevStatus: prev };
  saveState();
  syncPush();
  const msg = wasDone ? 'Task unchecked' : 'Task completed';
  const msgType = wasDone ? 'default' : 'success';
  let needsFullRender = false;
  const dayName = getTaskDay(id);
  if (dayName && !wasDone) {
    const prog = getDayProgress(dayName);
    if (prog.pct === 100 && !state.celebrationShown[dayName]) {
      state.celebrationShown[dayName] = true;
      haptic('heavy');
      spawnDayComplete();
      needsFullRender = true;
    }
  }
  if (!needsFullRender && !state.openActions && !state.openNoteInput && !state.openDeferPicker && !state.openLinkInput && patchTaskDOM(id)) {
    showToast(msg, msgType);
    return;
  }
  _render();
  showToast(msg, msgType);
}

// ── Task status ──
export function setTaskStatus(id, status) {
  if (isTaskLocked(id)) { showToast('Day is locked', 'error'); haptic('error'); return; }
  const prev = state.checked[id];
  const hadOpenUI = state.openActions || state.openNoteInput || state.openDeferPicker || state.openLinkInput;
  if (getStatus(id) === status) {
    delete state.checked[id];
    state.lastToggle = { id, prevStatus: prev };
    haptic('light');
    state.openActions = null;
    saveState();
    syncPush();
    if (!hadOpenUI && patchTaskDOM(id)) { showToast('Status cleared'); return; }
    _render();
    showToast('Status cleared');
  } else {
    state.checked[id] = status;
    state.lastToggle = { id, prevStatus: prev };
    if (status === STATUS_SKIP) {
      state.justSkippedId = id;
      setTimeout(() => { state.justSkippedId = null; }, 400);
      haptic('medium');
    } else {
      haptic('light');
    }
    state.openActions = null;
    saveState();
    syncPush();
    const labels = { skip: 'Skipped', progress: 'In progress', blocked: 'Blocked' };
    const types  = { skip: 'warning', progress: 'info', blocked: 'error' };
    const msg = labels[status] || status;
    const type = types[status] || 'default';
    if (!hadOpenUI && patchTaskDOM(id)) { showToast(msg, type); return; }
    _render();
    showToast(msg, type);
  }
}

// ── Action menu ──
export function toggleActionMenu(id, e) {
  if (e) e.stopPropagation();
  state.openActions = state.openActions === id ? null : id;
  state.openNoteInput = null;
  state.openDeferPicker = null;
  state.openLinkInput = null;
  haptic('select');
  _render();
}

// ── Notes ──
export function showNoteInput(id, e) {
  if (e) e.stopPropagation();
  state.openNoteInput = state.openNoteInput === id ? null : id;
  state.openDeferPicker = null;
  state.openLinkInput = null;
  _render();
  if (state.openNoteInput) {
    setTimeout(() => {
      const inp = document.getElementById('note-input-' + id);
      if (inp) inp.focus();
    }, 50);
  }
}

export function saveNote(id, fromBlur) {
  const inp = document.getElementById('note-input-' + id);
  if (!inp) return;
  if (fromBlur && state.openNoteInput !== id) return;
  const text = inp.value.trim();
  if (text) {
    state.taskNotes[id] = text;
  } else {
    delete state.taskNotes[id];
  }
  state.openNoteInput = null;
  saveState();
  syncPush();
  _render();
  showToast(text ? 'Note saved' : 'Note removed', 'success');
}

// ── Defer ──
export function showDeferPicker(id, e) {
  if (e) e.stopPropagation();
  state.openDeferPicker = state.openDeferPicker === id ? null : id;
  state.openNoteInput = null;
  state.openLinkInput = null;
  _render();
}

export function deferTask(id, targetDay) {
  if (isTaskLocked(id)) { showToast('Day is locked', 'error'); haptic('error'); return; }
  state.taskDeferred[id] = targetDay;
  state.openActions = null;
  state.openDeferPicker = null;
  haptic('medium');
  saveState();
  syncPush();
  _render();
  showToast('Deferred to ' + targetDay, 'info');
}

// ── Clear ──
export function clearTask(id, e) {
  if (e) e.stopPropagation();
  if (isTaskLocked(id)) { showToast('Day is locked', 'error'); return; }
  delete state.checked[id];
  delete state.taskNotes[id];
  delete state.taskDeferred[id];
  delete state.taskLinks[id];
  state.openActions = null;
  state.openLinkInput = null;
  saveState();
  saveLinks();
  syncPush();
  _render();
  showToast('Cleared');
}

// ── Mark section done ──
export function markSectionDone(dayName, sectionIdx) {
  if (isDayLocked(dayName)) { showToast('Day is locked', 'error'); haptic('error'); return; }
  const section = schedule[dayName]?.sections?.[sectionIdx];
  if (!section) return;
  let count = 0;
  section.items.forEach(item => {
    if (state.taskDeferred[item.id] && state.taskDeferred[item.id] !== dayName) return;
    if (getStatus(item.id) !== STATUS_DONE) {
      state.checked[item.id] = STATUS_DONE;
      count++;
    }
  });
  if (count > 0) {
    haptic('success');
    saveState();
    syncPush();
    _render();
    showToast(`${count} task${count > 1 ? 's' : ''} completed`, 'success');
    const prog = getDayProgress(dayName);
    if (prog.pct === 100 && !state.celebrationShown[dayName]) {
      state.celebrationShown[dayName] = true;
      haptic('heavy');
      spawnDayComplete();
    }
  } else {
    showToast('Section already complete');
  }
}

// ── Links ──
export function addLink(taskId) {
  showLinkInput(taskId);
}

export function showLinkInput(id, e) {
  if (e) e.stopPropagation();
  state.openLinkInput = state.openLinkInput === id ? null : id;
  state.openActions = null;
  state.openNoteInput = null;
  state.openDeferPicker = null;
  _render();
  if (state.openLinkInput) {
    setTimeout(() => {
      const inp = document.getElementById('link-input-' + id);
      if (inp) inp.focus();
    }, 50);
  }
}

export function saveLink(id) {
  const inp = document.getElementById('link-input-' + id);
  if (!inp) return;
  const url = inp.value.trim();
  if (!url) { state.openLinkInput = null; _render(); return; }
  if (!state.taskLinks[id]) state.taskLinks[id] = [];
  state.taskLinks[id].push(url);
  state.openLinkInput = null;
  saveLinks();
  syncPush();
  _render();
  showToast('Link added');
}

export function removeLink(taskId, idx) {
  if (state.taskLinks[taskId]) {
    state.taskLinks[taskId].splice(idx, 1);
    if (!state.taskLinks[taskId].length) delete state.taskLinks[taskId];
    saveLinks();
    syncPush();
    _render();
  }
}

// ── FAB (Quick-add) ──
export function toggleFab() {
  state.fabOpen = !state.fabOpen;
  haptic('light');
  _render();
  if (state.fabOpen) {
    setTimeout(() => {
      const inp = document.getElementById('fab-text');
      if (inp) inp.focus();
    }, 100);
  }
}

export async function fabAddTask() {
  const textInput = document.getElementById('fab-text');
  const catInput = document.getElementById('fab-cat');
  const sectionInput = document.getElementById('fab-section');
  if (!textInput || !textInput.value.trim()) { showToast('Enter task text'); return; }
  const dayName = DAYS[state.selectedDay];
  const sIdx = parseInt(sectionInput ? sectionInput.value : '0') || 0;
  const { addTaskToSection } = await import('../schedule.js');
  addTaskToSection(dayName, sIdx, textInput.value.trim(), catInput ? catInput.value : 'homework');
  haptic('success');
  state.fabOpen = false;
  _render();
}

// ── Category filter ──
export function toggleCatFilter(cat) {
  state.activeFilter = cat === undefined ? null : (state.activeFilter === cat ? null : cat);
  haptic('select');
  _render();
}

// ── Focus mode ──
export function toggleFocusMode() {
  state.focusMode = !state.focusMode;
  haptic('select');
  _render();
  showToast(state.focusMode ? 'Focus mode \u2014 showing remaining tasks' : 'Showing all tasks');
}

// ── Panel toggle ──
export function togglePanel(id) {
  state.openPanels[id] = !state.openPanels[id];
  _doRender();
}

// ── Day selection ──
export function selectDay(i) {
  if (!DAYS[i]) return;
  state.lastDayDirection = i > state.selectedDay ? 'right' : (i < state.selectedDay ? 'left' : null);
  state.selectedDay = i;
  state.viewMode = 'day';
  // Clear any open editor state from the previous day
  state.renamingSectionIdx = null;
  state.addingSectionDay = null;
  haptic('select');
  _render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function setViewMode(mode) {
  state.viewMode = mode;
  _render();
}

// ── Reset day ──
export function resetDay() {
  if (isDayLocked(DAYS[state.selectedDay])) { showToast('Day is locked'); return; }
  showConfirm(`Reset all tasks for ${DAYS[state.selectedDay]}?`, () => {
    const dayName = DAYS[state.selectedDay];
    (schedule[dayName]?.sections || []).forEach(s => (s.items || []).forEach(item => {
      delete state.checked[item.id];
      delete state.taskNotes[item.id];
      delete state.taskDeferred[item.id];
    }));
    saveState();
    syncPush();
    _render();
    showToast(`${dayName} reset`);
  });
}

// ── Past week viewer ──
export function viewPastWeek(weekKey) {
  state.pastWeekViewing = weekKey === getWeekKey() ? null : weekKey;
  _render();
}

// ── Week view collapse ──
export function toggleWeekDayCollapse(dayIdx) {
  state.weekViewCollapsed[dayIdx] = !state.weekViewCollapsed[dayIdx];
  haptic('select');
  _render();
}

// ── Font size ──
export function toggleFontSize() {
  state.fontScale = state.fontScale === 'normal' ? 'large' : 'normal';
  Storage.setRaw('fontscale', state.fontScale);
  _render();
}

// ── Keyboard shortcuts modal ──
export function toggleShortcuts() {
  state.showShortcuts = !state.showShortcuts;
  if (state.showShortcuts) {
    const overlay = document.createElement('div');
    overlay.className = 'shortcuts-overlay';
    overlay.id = 'shortcuts-modal';
    overlay.innerHTML = `<div class="shortcuts-box">
      <div class="shortcuts-title">Keyboard Shortcuts</div>
      <div class="shortcut-row"><span class="shortcut-desc">Home dashboard</span><span class="shortcut-key">1</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Schedule</span><span class="shortcut-key">2</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Ideal Week</span><span class="shortcut-key">3</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Tools</span><span class="shortcut-key">4</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Stats</span><span class="shortcut-key">5</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Weekly Review</span><span class="shortcut-key">6</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Inbox</span><span class="shortcut-key">7</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Matrix</span><span class="shortcut-key">8</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Calendar</span><span class="shortcut-key">9</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Quick Capture</span><span class="shortcut-key">N</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Global Search</span><span class="shortcut-key">⌘K</span></div>
      <div class="shortcut-row" style="border-top:1px solid var(--border);margin-top:4px;padding-top:4px"><span class="shortcut-desc">Next day</span><span class="shortcut-key">\u2192</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Previous day</span><span class="shortcut-key">\u2190</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Toggle task</span><span class="shortcut-key">Enter</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Search tasks</span><span class="shortcut-key">/</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Focus mode</span><span class="shortcut-key">F</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Week view</span><span class="shortcut-key">W</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Day view</span><span class="shortcut-key">D</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">Font size</span><span class="shortcut-key">+/-</span></div>
      <div class="shortcut-row"><span class="shortcut-desc">This help</span><span class="shortcut-key">?</span></div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) toggleShortcuts(); });
  } else {
    const m = document.getElementById('shortcuts-modal');
    if (m) m.remove();
  }
}

// ── Scratchpad ──
export function toggleScratchpad() {
  state.scratchpadOpen = !state.scratchpadOpen;
  _render();
}

// ── Context menus ──
let _ctxMenu = null;

export function closeCtxMenu() {
  if (_ctxMenu) { _ctxMenu.remove(); _ctxMenu = null; }
}

export function showCtxMenu(x, y, items) {
  closeCtxMenu();
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  items.forEach(item => {
    if (item === '---') {
      const sep = document.createElement('div');
      sep.className = 'ctx-sep';
      menu.appendChild(sep);
      return;
    }
    const btn = document.createElement('button');
    btn.className = 'ctx-item' + (item.cls ? ' ' + item.cls : '');
    btn.innerHTML = `<span class="ctx-icon">${item.icon}</span>${item.label}`;
    btn.onclick = (e) => { e.stopPropagation(); closeCtxMenu(); item.action(); };
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
  if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
  if (x < 8) x = 8;
  if (y < 8) y = 8;
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  _ctxMenu = menu;
}

export function showTaskCtxMenu(taskId, e) {
  e.preventDefault();
  e.stopPropagation();
  const st = getStatus(taskId);
  const dayName = getTaskDay(taskId);
  const items = [];
  if (st !== STATUS_DONE) items.push({ icon: '\u2713', label: 'Mark done', cls: 'accent', action: () => toggle(taskId) });
  else items.push({ icon: '\u21a9', label: 'Uncheck', action: () => toggle(taskId) });
  if (st !== STATUS_SKIP) items.push({ icon: '\u23ed', label: 'Skip', cls: 'danger', action: () => setTaskStatus(taskId, STATUS_SKIP) });
  if (st !== STATUS_PROGRESS) items.push({ icon: '\u25b6', label: 'In progress', cls: 'warn', action: () => setTaskStatus(taskId, STATUS_PROGRESS) });
  if (st !== STATUS_BLOCKED) items.push({ icon: '\u26d4', label: 'Blocked', cls: 'danger', action: () => setTaskStatus(taskId, STATUS_BLOCKED) });
  items.push('---');
  items.push({ icon: '\ud83d\udcdd', label: 'Add note', action: () => { state.openActions = taskId; showNoteInput(taskId); } });
  items.push({ icon: '\ud83d\udd17', label: 'Add link', action: () => addLink(taskId) });
  items.push({ icon: '\u2192', label: 'Defer \u2192', action: () => showDeferCtxMenu(taskId, e.clientX, e.clientY, dayName) });
  items.push('---');
  items.push({ icon: '\u2715', label: 'Clear all', cls: 'danger', action: () => clearTask(taskId) });
  showCtxMenu(e.clientX, e.clientY, items);
}

function showDeferCtxMenu(taskId, x, y, currentDay) {
  setTimeout(() => {
    const items = DAYS.filter(d => d !== currentDay).map(d => ({
      icon: '\u2192', label: d, action: () => deferTask(taskId, d)
    }));
    showCtxMenu(x + 10, y, items);
  }, 10);
}

export function showTabCtxMenu(dayIdx, e) {
  e.preventDefault();
  e.stopPropagation();
  const dayName = DAYS[dayIdx];
  const locked = isDayLocked(dayName);
  const prog = getDayProgress(dayName);
  showCtxMenu(e.clientX, e.clientY, [
    { icon: '\ud83d\udcc4', label: `Open ${dayName}`, action: () => selectDay(dayIdx) },
    { icon: locked ? '\ud83d\udd13' : '\ud83d\udd12', label: locked ? 'Unlock day' : 'Lock day', action: () => toggleLock(dayName) },
    '---',
    { icon: '\u2713', label: `Mark all done (${prog.total - prog.done} left)`, cls: 'accent', action: () => { (schedule[dayName]?.sections || []).forEach((s, si) => markSectionDone(dayName, si)); } },
    { icon: '\u21bb', label: 'Reset day', cls: 'danger', action: () => { state.selectedDay = dayIdx; resetDay(); } },
  ]);
}

// ── Targeted DOM patch (avoid full rebuild for simple state changes) ──
export function patchTaskDOM(id) {
  const st = getStatus(id);
  let patched = false;
  const el = document.querySelector(`.item[data-task-id="${id}"]`);
  if (el) {
    el.classList.remove('done', 'skip', 'progress', 'blocked', 'just-completed', 'just-skipped');
    if (st === STATUS_DONE) el.classList.add('done');
    else if (st === STATUS_SKIP) el.classList.add('skip');
    else if (st === STATUS_PROGRESS) el.classList.add('progress');
    else if (st === STATUS_BLOCKED) el.classList.add('blocked');
    if (state.justCompletedId === id) el.classList.add('just-completed');
    if (state.justSkippedId === id) el.classList.add('just-skipped');
    el.setAttribute('aria-checked', String(st === STATUS_DONE));
    patched = true;
  }
  const wt = document.querySelector(`.week-task[data-task-id="${id}"]`);
  if (wt) {
    wt.classList.remove('done', 'skip', 'progress', 'blocked');
    if (st === STATUS_DONE) wt.classList.add('done');
    else if (st === STATUS_SKIP) wt.classList.add('skip');
    else if (st === STATUS_PROGRESS) wt.classList.add('progress');
    else if (st === STATUS_BLOCKED) wt.classList.add('blocked');
    const check = wt.querySelector('.week-task-check');
    if (check) check.textContent = st === STATUS_DONE ? '\u2713' : st === STATUS_SKIP ? '\u2716' : st === STATUS_PROGRESS ? '\u25b6' : st === STATUS_BLOCKED ? '\u26d4' : '';
    wt.setAttribute('aria-checked', String(st === STATUS_DONE));
    patched = true;
  }
  if (patched) {
    invalidateProgressCache();
    updateProgressBars();
  }
  return patched;
}

export function updateProgressBars() {
  const dayName = DAYS[state.selectedDay];
  const prog = getDayProgress(dayName);
  const wp = getWeeklyProgress();

  const fill = document.querySelector('.progress-fill');
  if (fill) fill.style.width = prog.pct + '%';

  const taskCount = document.getElementById('task-count');
  const taskPct = document.getElementById('task-pct');
  if (taskCount) taskCount.textContent = `${prog.done}/${prog.total} tasks`;
  if (taskPct) taskPct.textContent = `${prog.pct}%`;

  const weekVal = document.getElementById('week-val');
  if (weekVal) weekVal.textContent = `${wp.done}/${wp.total} \u00b7 ${wp.pct}%`;
  const weekFill = document.querySelector('.weekly-bar-fill');
  if (weekFill) weekFill.style.width = wp.pct + '%';

  document.querySelectorAll('.tab').forEach((tab, i) => {
    const p = getDayProgress(DAYS[i]);
    const bar = tab.querySelector('.tab-progress');
    if (bar) bar.style.width = p.pct + '%';
  });
}

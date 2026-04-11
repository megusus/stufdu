// ════════════════════════════════════════
// ── App Initialization & Entry Point ──
// ════════════════════════════════════════

import { CONFIG } from './config.js';
import { Storage } from './storage.js';
import { CategoryRegistry } from './categories.js';
import { DAYS, schedule, addTaskToSection, removeTaskFromSchedule, renameSectionInSchedule, addSectionToDay, removeSectionFromDay, moveSectionInDay, moveTaskInSection, updateDayMetadata, addDayToSchedule, removeDayFromSchedule, dayConfig, setDayActive, setDayAlias, saveDayConfig, saveScheduleToStorage, getDayLabel } from './schedule.js';
import { state, loadState, saveState, saveLinks, saveDeadlines, saveMeals, saveReadingList, loadHistory, loadScratchpad, saveScratchpad, getWeekKey, getWeekNum, getISOWeek, nowInTZ, getStatus, getDayProgress, getWeeklyProgress, invalidateProgressCache, STATUS_DONE, STATUS_SKIP, STATUS_PROGRESS, STATUS_BLOCKED, todayIdx, READING_LIST_DEFAULT, escapeHtml, formatEst, haptic } from './state.js';
import { initPasswordGate } from './password.js';
import { syncGoodreads, saveGoodreadsCSV, handleGoodreadsFile } from './reading.js';
import { getSyncConfig, connectSync, disconnectSync, setupStoredSync, syncPush, updateSyncDot } from './sync.js';
import { initTheme, toggleTheme, checkAutoTheme, currentTheme } from './ui/theme.js';
import { startPomo, cancelPomo, togglePomoPause, restartPomo, resetPomoPosition, setFocusTimerMin, ensurePomoBar, setTimerContextMenu } from './ui/timer.js';
import { toggle, setTaskStatus, toggleActionMenu, showNoteInput, saveNote, showDeferPicker, deferTask, clearTask, markSectionDone, addLink, showLinkInput, saveLink, removeLink, toggleFab, fabAddTask, toggleCatFilter, toggleFocusMode, togglePanel, selectDay, setViewMode, resetDay, viewPastWeek, toggleWeekDayCollapse, toggleFontSize, toggleShortcuts, toggleScratchpad, showToast, hideToast, undoToggle, showConfirm, showCtxMenu, showTaskCtxMenu, showTimerCtxMenu, showTabCtxMenu, closeCtxMenu, patchTaskDOM, updateProgressBars, toggleLock, setRenderFn } from './ui/toggle.js';
import { setSearch, clearSearch } from './ui/search.js';
import { initSwipeListeners, initPageSwipe, handleLongPressStart, handleLongPressEnd, handleItemClick } from './ui/swipe.js';
import { render, renderImmediate, doRender } from './render/index.js';
import { initDispatch } from './ui/dispatch.js';

// Extracted modules
import { fetchMeals, savePastedMeals, toggleMealPaste, clearMealData } from './meals.js';
import { exportData, importData, exportCalendar, exportSchedule, importSchedule, resetDefaultSchedule, newSemester, shareProgress, addDeadline, removeDeadline, requestNotifPermission, scheduleNotifications, pruneOldData, checkStorageQuota, carryOverDeferrals, migrateProgress } from './data.js';
import { applySettings, resetSettings } from './ui/settings.js';
import { editCat, saveCatEdit, deleteCat, addCat, resetCatToDefaults } from './ui/categories-editor.js';
import { detectOldPrefixKeys, offerMigration } from './migration.js';

// ── Wire up render function references ──
setRenderFn(render, doRender);

// ── Wire timer context menu ──
setTimerContextMenu(showTimerCtxMenu);

// ── Event dispatcher: handles all data-action click attributes ──
initDispatch({
  reloadApp:                 () => location.reload(),
  // Header
  toggleTheme:              () => toggleTheme(render),
  toggleFontSize:           () => toggleFontSize(),
  toggleShortcuts:          () => toggleShortcuts(),
  setSearch:                (_data, _e, el) => setSearch(el.value, doRender),
  selectInput:              (_data, _e, el) => el.select?.(),
  // Search / view
  clearSearch:              () => clearSearch(doRender),
  setViewMode:              ({ mode }) => setViewMode(mode),
  toggleFocusMode:          () => toggleFocusMode(),
  resetDay:                 () => resetDay(),
  // Day/week navigation
  selectDay:                ({ i }) => selectDay(+i),
  showTabCtxMenu:           ({ i }, e) => showTabCtxMenu(+i, e),
  toggleWeekDayCollapse:    ({ i }) => toggleWeekDayCollapse(+i),
  toggleLock:               ({ day }) => toggleLock(day),
  toggleCatFilter:          ({ cat }) => toggleCatFilter(cat || null),
  // Task actions
  toggle:                   ({ id }) => toggle(id),
  handleItemClick:          ({ id }, e) => handleItemClick(id, e, toggle),
  toggleActionMenu:         ({ id }, e) => toggleActionMenu(id, e),
  showTaskCtxMenu:          ({ id }, e) => showTaskCtxMenu(id, e),
  handleLongPressStart:     ({ id }, e) => handleLongPressStart(id, e, toggleActionMenu),
  handleLongPressEnd:       () => handleLongPressEnd(),
  setTaskStatus:            ({ id, status }) => setTaskStatus(id, status),
  showNoteInput:            ({ id }, e) => showNoteInput(id, e),
  showDeferPicker:          ({ id }, e) => showDeferPicker(id, e),
  clearTask:                ({ id }, e) => clearTask(id, e),
  addLink:                  ({ id }) => addLink(id),
  saveLink:                 ({ id }) => saveLink(id),
  startPomo:                ({ id }) => startPomo(id, render, showToast),
  deferTask:                ({ id, day }) => deferTask(id, day),
  markSectionDone:          ({ day, i }) => markSectionDone(day, +i),
  // Panels
  togglePanel:              ({ panel }) => togglePanel(panel),
  // Pomodoro
  cancelPomo:               () => cancelPomo(render, showToast),
  togglePomoPause:          () => togglePomoPause(render),
  restartPomo:              () => restartPomo(showToast),
  resetPomoPosition:        () => resetPomoPosition(),
  // Timer duration
  setFocusTimerMinAndRender:({ min }) => { setFocusTimerMin(+min); doRender(); },
  setFocusTimerMinFromInput:(_data, _e, el) => { setFocusTimerMin(+el.value); doRender(); },
  stopPropagation:          (_data, e) => e.stopPropagation(),
  // Reading
  syncGoodreads:            () => syncGoodreads(render, showToast),
  saveGoodreadsCSV:         () => saveGoodreadsCSV(render, showToast),
  handleGoodreadsFile:      () => handleGoodreadsFile(render, showToast),
  readingToggleCSV:         () => { state.readingShowCSV = !state.readingShowCSV; render(); },
  readingResetList:         () => { state.readingList = [...READING_LIST_DEFAULT]; saveReadingList(); state.readingSyncStatus = null; render(); },
  // Streak
  viewPastWeek:             ({ week }) => viewPastWeek(week),
  // Sync
  connectSync:              () => connectSync(render, showToast),
  disconnectSync:           () => disconnectSync(render, showToast),
  // Schedule editor — tasks
  addTaskToSection:         ({ day, i }) => {
    const text = document.getElementById(`editor-text-${i}`)?.value ?? '';
    const cat  = document.getElementById(`editor-cat-${i}`)?.value ?? '';
    addTaskToSection(day, +i, text, cat);
    render();
    showToast('Task added');
  },
  removeTaskFromSchedule:   ({ day, i, j }) => {
    const item = removeTaskFromSchedule(day, +i, +j);
    if (item) { delete state.checked[item.id]; delete state.taskNotes[item.id]; delete state.taskDeferred[item.id]; }
    saveState();
    render();
    showToast('Task removed');
  },
  // Schedule editor — sections
  renameSectionStart:  ({ day, i }) => { state.renamingSectionIdx = { day, idx: +i }; render(); },
  renameSectionCancel: ()           => { state.renamingSectionIdx = null; render(); },
  renameSectionSave:   ({ day, i }) => {
    const val = document.getElementById(`editor-section-rename-${i}`)?.value ?? '';
    renameSectionInSchedule(day, +i, val);
    state.renamingSectionIdx = null;
    render();
    showToast('Section renamed');
  },
  addSectionStart:    ({ day })  => { state.addingSectionDay = day; render(); },
  addSectionCancel:   ()         => { state.addingSectionDay = null; render(); },
  addSectionConfirm:  ({ day })  => {
    const val = document.getElementById('editor-new-section-label')?.value ?? '';
    if (!val.trim()) { showToast('Enter a section name'); return; }
    addSectionToDay(day, val.trim());
    state.addingSectionDay = null;
    render();
    showToast('Section added');
  },
  removeSectionFromDay: ({ day, i }) => {
    const sections = schedule[day]?.sections;
    if (!sections) return;
    const sec = sections[+i];
    const label = sec?.label ?? 'this section';
    const taskCount = sec?.items?.length ?? 0;
    const msg = taskCount
      ? `Delete "${label}" and its ${taskCount} task${taskCount > 1 ? 's' : ''}?`
      : `Delete section "${label}"?`;
    showConfirm(msg, () => {
      removeSectionFromDay(day, +i);
      render();
      showToast('Section removed');
    });
  },
  // Schedule editor — section reordering
  moveSectionUp:   ({ day, i }) => { moveSectionInDay(day, +i, -1); render(); },
  moveSectionDown: ({ day, i }) => { moveSectionInDay(day, +i, +1); render(); },
  // Schedule editor — task reordering
  moveTaskUp:   ({ day, i, j }) => { moveTaskInSection(day, +i, +j, -1); render(); },
  moveTaskDown: ({ day, i, j }) => { moveTaskInSection(day, +i, +j, +1); render(); },
  // Day manager
  toggleDayManager: () => { state.showDayManager = !state.showDayManager; render(); },
  toggleDayActive:  ({ day }) => {
    const current = dayConfig[day]?.active !== false;
    const activeDaysLeft = DAYS.filter(d => d !== day && dayConfig[d]?.active !== false).length;
    if (current && activeDaysLeft < 1) { showToast('At least one day must be active'); return; }
    setDayActive(day, !current);
    if (current && DAYS[state.selectedDay] === day) {
      const firstActive = DAYS.findIndex(d => dayConfig[d]?.active !== false);
      if (firstActive !== -1) state.selectedDay = firstActive;
    }
    render();
  },
  startDayRename:  ({ day }) => { state.renamingDayName = day; render(); },
  cancelDayRename: ()         => { state.renamingDayName = null; render(); },
  saveDayAlias:    ({ day })  => {
    const val = document.getElementById(`day-rename-${day}`)?.value ?? '';
    setDayAlias(day, val.trim() || null);
    state.renamingDayName = null;
    render();
    showToast('Day label updated');
  },
  clearDayAlias: ({ day }) => {
    setDayAlias(day, null);
    render();
    showToast('Day label reset');
  },
  saveDayMeta: ({ day }) => {
    updateDayMetadata(day, {
      wake:  document.getElementById(`editor-wake-${day}`)?.value ?? '',
      leave: document.getElementById(`editor-leave-${day}`)?.value ?? '',
      meta:  document.getElementById(`editor-meta-${day}`)?.value ?? '',
    });
    render();
    showToast('Day details saved');
  },
  addDay: () => {
    const input = document.getElementById('editor-new-day-name');
    const newDay = addDayToSchedule(input?.value ?? '');
    if (!newDay) { showToast('Enter a day name'); return; }
    state.selectedDay = DAYS.indexOf(newDay);
    state.showDayManager = true;
    render();
    showToast(`Day "${newDay}" added`);
  },
  removeDay: ({ day }) => {
    if (DAYS.length <= 1) { showToast('At least one day is required'); return; }
    showConfirm(`Delete "${day}" and its scheduled tasks? Progress for those task IDs will be cleared.`, () => {
      const removedIds = [];
      (schedule[day]?.sections || []).forEach(sec => (sec.items || []).forEach(item => removedIds.push(item.id)));
      if (!removeDayFromSchedule(day)) return;
      removedIds.forEach(id => {
        delete state.checked[id];
        delete state.taskNotes[id];
        delete state.taskDeferred[id];
        delete state.taskLinks[id];
      });
      if (state.selectedDay >= DAYS.length) state.selectedDay = DAYS.length - 1;
      if (state.selectedDay < 0) state.selectedDay = 0;
      saveState();
      saveLinks();
      render();
      showToast('Day removed');
    });
  },
  // Schedule file
  exportSchedule: () => exportSchedule(showToast),
  importSchedule: () => importSchedule(render, showToast),
  resetDefaultSchedule: () => resetDefaultSchedule(render, showToast, showConfirm),
  newSemester:    () => newSemester(render, showToast, showConfirm),
  // Meals
  fetchMeals:               () => fetchMeals(render, showToast),
  toggleMealPaste:          () => toggleMealPaste(render),
  clearMealData:            () => clearMealData(render, showToast),
  savePastedMeals:          () => savePastedMeals(render, showToast),
  // Data
  exportData:               () => exportData(),
  importData:               () => importData(render, showToast),
  exportCalendar:           () => exportCalendar(showToast),
  shareProgress:            () => shareProgress(showToast),
  // Deadlines
  removeDeadline:           ({ i }) => removeDeadline(+i, render),
  showDeadlineForm:         () => { state.showDeadlineForm = true; render(); },
  addDeadline:              () => addDeadline(
    document.getElementById('dl-name')?.value ?? '',
    document.getElementById('dl-date')?.value ?? '',
    document.getElementById('dl-cat')?.value ?? '',
    render, showToast
  ),
  // Notifications
  requestNotifPermission:   () => requestNotifPermission(render, showToast),
  // Categories
  editCat:                  ({ key }) => editCat(key, render),
  saveCatEdit:              ({ key }) => saveCatEdit(key, render, showToast),
  deleteCat:                ({ key }) => deleteCat(key, render, showToast),
  addCat:                   () => addCat(render, showToast),
  addCatOnEnter:            (_data, e) => { if (e.key === 'Enter') { e.preventDefault(); addCat(render, showToast); } },
  showCatAddFormOn:         () => { state.showCatAddForm = true;  render(); },
  showCatAddFormOff:        () => { state.showCatAddForm = false; render(); },
  resetCatToDefaults:       () => resetCatToDefaults(render, showToast),
  // Settings
  applySettings:            () => applySettings(render, showToast),
  resetSettings:            () => resetSettings(showToast),
  // FAB / scratchpad
  toggleFab:                () => toggleFab(),
  fabAddTask:               () => fabAddTask(),
  fabAddTaskOnEnter:        (_data, e) => { if (e.key === 'Enter') { e.preventDefault(); fabAddTask(); } },
  toggleScratchpad:         () => toggleScratchpad(),
  saveScratchpad:           (_data, _e, el) => { saveScratchpad(el.value); syncPush(); },
  // Keyboard helpers
  saveNoteOnEnter:          ({ id }, e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote(id); } },
  saveLinkOnEnterOrClose:   ({ id }, e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveLink(id); }
    if (e.key === 'Escape') { state.openLinkInput = null; render(); }
  },
  clickOnEnterSpace:        (_data, e, el) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.click();
    }
  },
  clickMappedActionOnEnterEscape: (data, e) => {
    const action = e.key === 'Enter' ? data.enterAction : e.key === 'Escape' ? data.escapeAction : '';
    if (!action) return;
    e.preventDefault();
    const target = Array.from(document.querySelectorAll(`[data-action="${action}"]`)).find(el =>
      (!data.day || el.dataset.day === data.day) &&
      (!data.i || el.dataset.i === data.i) &&
      (!data.j || el.dataset.j === data.j)
    );
    target?.click();
  },
  undoToggle:               () => undoToggle(),
});

// ════════════════════════════════════════
// ── Event Listeners ──
// ════════════════════════════════════════

// Context menu cleanup
document.addEventListener('click', closeCtxMenu);
document.addEventListener('scroll', closeCtxMenu, true);

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
  if (e.key === 'Enter' || e.key === ' ') {
    const el = document.activeElement;
    if (el && el.dataset.taskId) { e.preventDefault(); toggle(el.dataset.taskId); return; }
    if (el && el.dataset.panelId) { e.preventDefault(); togglePanel(el.dataset.panelId); return; }
    // Generic role-based activation
    if (el && (el.getAttribute('role') === 'button' || el.getAttribute('role') === 'checkbox') && el.tagName !== 'BUTTON') {
      e.preventDefault(); el.click(); return;
    }
  }
  if (e.key === 'Escape') {
    // Priority chain: context menu → shortcuts → search → scratchpad → FAB → open panels
    const ctxMenu = document.querySelector('.ctx-menu');
    if (ctxMenu) { closeCtxMenu(); return; }
    if (state.showShortcuts) { toggleShortcuts(); return; }
    if (state.searchQuery) { clearSearch(doRender); return; }
    if (state.scratchpadOpen) { toggleScratchpad(); return; }
    if (state.fabOpen) { state.fabOpen = false; render(); return; }
    // Close the first open panel
    const openPanelKey = Object.keys(state.openPanels).find(k => state.openPanels[k]);
    if (openPanelKey) { togglePanel(openPanelKey); return; }
  }
  if (isInput) return;
  if (e.key === 'ArrowRight' && state.selectedDay < DAYS.length - 1) selectDay(state.selectedDay + 1);
  if (e.key === 'ArrowLeft' && state.selectedDay > 0) selectDay(state.selectedDay - 1);
  if (e.key === '?' || (e.shiftKey && e.key === '/')) { e.preventDefault(); toggleShortcuts(); }
  if (e.key === '/' && !e.shiftKey) { e.preventDefault(); const si = document.getElementById('search-input'); if (si) si.focus(); }
  if (e.key === 'f' || e.key === 'F') toggleFocusMode();
  if (e.key === 'w' || e.key === 'W') setViewMode('week');
  if (e.key === 'd' || e.key === 'D') setViewMode('day');
  if (e.key === '+' || e.key === '=') { if (state.fontScale !== 'large') toggleFontSize(); }
  if (e.key === '-') { if (state.fontScale !== 'normal') toggleFontSize(); }
});

// Offline/Online indicator
function updateOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.classList.toggle('show', !navigator.onLine);
}
window.addEventListener('online', () => { updateOfflineBanner(); showToast('Back online'); });
window.addEventListener('offline', updateOfflineBanner);

// ════════════════════════════════════════
// ── PWA ──
// ════════════════════════════════════════

(function () {
  function generateIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#09090b'; ctx.fillRect(0, 0, size, size);
    ctx.font = `${size * 0.7}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('\ud83d\udcd8', size / 2, size / 2 + size * 0.05);
    return canvas.toDataURL('image/png');
  }
  const m = {
    name: CONFIG.appTitle, short_name: 'Study', start_url: '.', display: 'standalone',
    background_color: '#09090b', theme_color: '#09090b',
    icons: [
      { src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>\ud83d\udcd8</text></svg>", sizes: 'any', type: 'image/svg+xml' },
      { src: generateIcon(192), sizes: '192x192', type: 'image/png' },
      { src: generateIcon(512), sizes: '512x512', type: 'image/png' },
    ]
  };
  const l = document.createElement('link'); l.rel = 'manifest';
  l.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(m));
  document.head.appendChild(l);
})();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      if (!newSW) return;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          const banner = document.getElementById('sw-update');
          if (banner) banner.classList.add('show');
        }
      });
    });
  }).catch(err => console.warn('SW registration failed:', err.message));
  if (window.caches) {
    caches.open('study-plan-fonts-v1').then(cache => {
      cache.match('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap').then(r => {
        if (!r) fetch('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap').then(res => { if (res.ok) cache.put(res.url, res); }).catch(() => {});
      });
    }).catch(() => {});
  }
}

// ════════════════════════════════════════
// ── App Boot ──
// ════════════════════════════════════════

function boot() {
  initTheme(render);
  loadState();
  if (!DAYS[state.selectedDay]) state.selectedDay = 0;
  if (dayConfig[DAYS[state.selectedDay]]?.active === false) {
    const firstActive = DAYS.findIndex(d => dayConfig[d]?.active !== false);
    state.selectedDay = firstActive >= 0 ? firstActive : 0;
  }
  migrateProgress(showToast);
  carryOverDeferrals(showToast);
  pruneOldData();
  checkStorageQuota(showToast);
  checkAutoTheme();

  // Detect old prefix data and offer migration
  const oldPrefix = detectOldPrefixKeys(CONFIG.storagePrefix);
  if (oldPrefix) {
    setTimeout(() => offerMigration(oldPrefix, CONFIG.storagePrefix, showToast, showConfirm, render), 2000);
  }

  // Initialize swipe
  initSwipeListeners(toggle, setTaskStatus);
  initPageSwipe(selectDay);

  // Render
  renderImmediate();

  // Notifications
  if (state.notifEnabled) scheduleNotifications();

  // Auto-theme check every 5 min
  setInterval(checkAutoTheme, 300000);

  // Update offline banner
  updateOfflineBanner();

  // Auto-connect sync
  setupStoredSync(render).catch(err => console.warn('Auto-sync failed:', err.message));
}

// Password gate wraps the boot
initPasswordGate(boot);

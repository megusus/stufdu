// ════════════════════════════════════════
// ── App Initialization & Entry Point ──
// ════════════════════════════════════════

import { CONFIG } from './config.js';
import { Storage } from './storage.js';
import { CategoryRegistry } from './categories.js';
import { DAYS, schedule, addTaskToSection, removeTaskFromSchedule, renameSectionInSchedule, addSectionToDay, removeSectionFromDay, moveSectionInDay, moveTaskInSection, updateDayMetadata, addDayToSchedule, removeDayFromSchedule, dayConfig, setDayActive, setDayAlias, saveDayConfig, saveScheduleToStorage, getDayLabel, loadCustomSchedule } from './schedule.js';
import { state, loadState, saveState, saveLinks, saveDeadlines, saveMeals, saveReadingList, loadHistory, loadScratchpad, saveScratchpad, getWeekKey, getWeekNum, getISOWeek, nowInTZ, getStatus, getDayProgress, getWeeklyProgress, invalidateProgressCache, STATUS_DONE, STATUS_SKIP, STATUS_PROGRESS, STATUS_BLOCKED, todayIdx, READING_LIST_DEFAULT, escapeHtml, formatEst, haptic, saveLectureNotes, saveTaskBlockedBy } from './state.js';
import { initPasswordGate } from './password.js';
import { syncGoodreads, saveGoodreadsCSV, handleGoodreadsFile } from './reading.js';
import { getSyncConfig, connectSync, disconnectSync, setupStoredSync, syncPush, updateSyncDot } from './sync.js';
import { initTheme, toggleTheme, checkAutoTheme, currentTheme, setThemePreset, setAccentColor, resetAccentColor, THEME_PRESETS, currentPreset } from './ui/theme.js';
import { toggle, setTaskStatus, toggleActionMenu, showNoteInput, saveNote, showDeferPicker, deferTask, clearTask, markSectionDone, addLink, showLinkInput, saveLink, removeLink, toggleFab, fabAddTask, toggleCatFilter, toggleFocusMode, togglePanel, selectDay, setViewMode, resetDay, viewPastWeek, toggleWeekDayCollapse, toggleFontSize, toggleShortcuts, toggleScratchpad, showToast, hideToast, undoToggle, showConfirm, showCtxMenu, showTaskCtxMenu, showTabCtxMenu, closeCtxMenu, patchTaskDOM, updateProgressBars, toggleLock, setRenderFn } from './ui/toggle.js';
import { setSearch, clearSearch } from './ui/search.js';
import { initSwipeListeners, initPageSwipe, handleLongPressStart, handleLongPressEnd, handleItemClick } from './ui/swipe.js';
import { render, renderImmediate, doRender, showInitialSkeleton } from './render/index.js';
import { initDispatch } from './ui/dispatch.js';
import { initRouter, navigate as navigateRoute, onSubViewChange } from './router.js';
import {
  loadIdealWeek, saveIdealWeek, resetIdealToDefault as resetIdealWeek,
  addIdealTask, removeIdealTask, addIdealSection, removeIdealSection,
  saveIdealDayMeta, setIdealShowCompare, setIdealEditingDay,
} from './ideal.js';
import {
  getReviewStep, setReviewStep, resetReview, setReviewDraft, getReviewDraft,
  generateReviewData, saveReview,
} from './review.js';
import { toggleGlobalSearch, closeGlobalSearch, isGlobalSearchOpen } from './ui/global-search.js';
import { addToInbox, removeFromInbox, clearInbox, moveInboxToScratchpad, moveInboxToDeadline, loadInbox } from './inbox.js';
import { addHabit, removeHabit, toggleHabitToday, loadHabits, loadHabitLog } from './habits.js';
import {
  openPlanner, closePlanner, setPlannerStep, getPlannerStep,
  getTodayPlan, saveTodayPlan, setMustDo, hasPlanForToday,
} from './daily-plan.js';
import { startTimer, stopTimer, getActiveTimer, getElapsedSeconds, initTimerRestore, getTodayTotalMinutes, getWeeklyTotalMinutes } from './time-tracking.js';
import { initDragDrop, handleDragStart } from './ui/drag-drop.js';
import { addGrade, removeGrade, predictNeeded, getOverallAverage } from './grades.js';
import { addGoal, removeGoal, updateGoalProgress, loadGoals, autoUpdateGoals, computeGoalProgress } from './goals.js';
import { logCompletionTime, logEnergy, scheduleSpacedReview, markSpacedReviewDone, dismissSpacedReview, loadCompletionTimes } from './analytics.js';
import { initBroadcastChannel, initOnlineDetection, replayQueue, getQueueSize } from './offline-queue.js';
import { addRecurringTask, removeRecurringTask, loadRecurringTasks } from './recurrence.js';
import { setCalendarMode } from './render/calendar.js';
import {
  openOnboarding, closeOnboarding, getOnboardingStep, setOnboardingStep,
  markOnboardingDone, shouldShowOnboarding,
} from './onboarding.js';
import { useStreakFreeze, addFreezeToken, getAvailableFreezes } from './habits.js';
import { setSearchActionCallback } from './ui/global-search.js';
import { getHabitStreak } from './habits.js';

// Extracted modules
import { fetchMeals, savePastedMeals, toggleMealPaste, clearMealData } from './meals.js';
import { exportData, importData, exportCalendar, importCalendarUrl, exportSchedule, importSchedule, resetDefaultSchedule, newSemester, shareProgress, addDeadline, removeDeadline, requestNotifPermission, scheduleNotifications, pruneOldData, checkStorageQuota, carryOverDeferrals, migrateProgress } from './data.js';
import { applySettings, resetSettings } from './ui/settings.js';
import { editCat, saveCatEdit, deleteCat, addCat, resetCatToDefaults } from './ui/categories-editor.js';
import { detectOldPrefixKeys, offerMigration } from './migration.js';
import { loadNavConfig, saveNavConfig, pinItem, unpinItem, reorderPinned, ALL_NAV_ITEMS } from './nav-config.js';
import { downloadFullBackup, importFullBackupFromFile, restoreFullBackup, validateBackup } from './full-backup.js';
import { downloadObsidianExport } from './obsidian-export.js';
import { calculateGPA, predictGPANeeded, saveGPAScale, saveCreditHours, loadCreditHours } from './gpa.js';
import { addRecurringDeadline, removeRecurringDeadline, mergeRecurringIntoDeadlines } from './recurring-deadlines.js';
import { isEncryptionAvailable, isEncryptionEnabled, enableEncryption, disableEncryption } from './encryption.js';
import { loadDashboardConfig, saveDashboardConfig, moveCard, setCardVisible, setCardSize } from './dashboard-config.js';
import { addDeck, removeDeck, addCard as addFlashcard, removeCard as removeFlashcard, loadCards as loadFlashcards, getDueCards, sm2Rate, updateCard as updateFlashcard } from './flashcards.js';
import { checkBadges, getBadgeDef } from './badges.js';
import { startPomodoro, stopPomodoro, skipBreak as skipPomodoroBreak, getSession as getPomodoroSession, savePomodoroConfig as _savePomodoroConfig } from './pomodoro.js';
import { generateWeeklyReport, maybeAutoGenerateWeeklyReport, setWeeklyAutoReport } from './pdf-report.js';
import { resolveConflict, clearPendingConflict } from './sync-conflict.js';
import { applyMarkdownShortcut, renderMarkdown } from './markdown.js';
import { XP_REWARDS, awardActivityXP, awardXP, claimDailyChallenge, syncAchievementMilestones } from './challenges.js';
import { initA11y } from './ui/a11y.js';
import { initScrollObserver } from './ui/scroll-observer.js';

// ── Wire up render function references ──
setRenderFn(render, doRender);

// ── Boot scroll observer ──
initScrollObserver();

function _dateKey(date = nowInTZ()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function _longestWeekStreak(history) {
  let cur = 0, best = 0;
  Object.entries(history || {}).sort((a, b) => a[0].localeCompare(b[0])).forEach(([, pct]) => {
    if (pct >= 50) { cur++; best = Math.max(best, cur); }
    else cur = 0;
  });
  return best;
}

function _buildAchievementSnapshot() {
  const todayName = DAYS[todayIdx] || DAYS[0];
  const today = schedule[todayName];
  const times = loadCompletionTimes();
  let earlyDone = 0;
  const subjects = new Set();

  (today?.sections || []).forEach(sec => {
    (sec.items || []).forEach(item => {
      if (getStatus(item.id) !== STATUS_DONE) return;
      const hour = parseInt((times[item.id] || '').split(':')[0], 10);
      if (!Number.isNaN(hour) && hour < 12) earlyDone++;
      if (item.cat && item.cat !== 'routine' && item.cat !== 'reflect') subjects.add(item.cat);
    });
  });

  const habits = loadHabits();
  const habitLog = loadHabitLog();
  const todayKey = _dateKey();
  const hist = loadHistory();
  const wp = getWeeklyProgress();

  return {
    weekKey: getWeekKey(),
    weekPct: wp.pct,
    totalDone: wp.done,
    todayDone: getDayProgress(todayName).done,
    todayTotal: getDayProgress(todayName).total,
    earlyDone,
    timeMins: getTodayTotalMinutes(),
    weeklyTimeMins: getWeeklyTotalMinutes(schedule, DAYS),
    habitsDone: habits.filter(h => habitLog[todayKey]?.[h.id]).length,
    habitTotal: habits.length,
    subjectsDone: subjects.size,
    gradeAvg: getOverallAverage(),
    history: hist,
    longestWeekStreak: _longestWeekStreak(hist),
    dayProgress: DAYS.map(day => {
      const p = getDayProgress(day);
      return { label: getDayLabel(day), done: p.done, total: p.total, pct: p.pct };
    }),
  };
}

function _showAchievementCelebration(title, sub = '') {
  const existing = document.querySelector('.achievement-celebration');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'achievement-celebration';
  el.innerHTML = `<div class="achievement-celebration-card">
    <div class="achievement-celebration-title">${escapeHtml(title)}</div>
    ${sub ? `<div class="achievement-celebration-sub">${escapeHtml(sub)}</div>` : ''}
  </div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

function _surfaceXP(result) {
  if (!result || result.skipped) return;
  if (result.leveledUp) {
    _showAchievementCelebration(`Level ${result.newLevel}`, result.shieldGranted ? 'Streak shield earned' : 'Scholar level advanced');
  } else if (result.shieldGranted) {
    showToast('🛡 Streak shield earned');
  }
}

function _syncAchievementMilestones() {
  const unlocked = syncAchievementMilestones(_buildAchievementSnapshot());
  unlocked.forEach(item => {
    if (item.shield) showToast('🛡 Perfect week shield earned');
    else _showAchievementCelebration(item.label, 'Milestone unlocked');
  });
}

// ── Event dispatcher: handles all data-action click attributes ──
const _dispatchHandlers = {
  reloadApp:                 () => location.reload(),
  // Navigation
  navigate:                  ({ view }) => navigateRoute(view),
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
  toggle:                   ({ id }) => {
    toggle(id);
    // Log completion time for analytics
    if (state.checked[id] === true || state.checked[id] === 'done') {
      logCompletionTime(id);
      _surfaceXP(awardActivityXP(`task:${getWeekKey()}:${id}`, 'Task completed', XP_REWARDS.task));
      // Badge checks on task completion
      const wp = getWeeklyProgress();
      const hour = new Date().getHours();
      const hist = loadHistory();
      const newBadges = checkBadges({
        totalDone:     wp.done,
        dayPct:        getDayProgress(DAYS[todayIdx]).pct,
        weekHistory:   hist,
        completionHour: hour,
        readingCount:  state.readingList.length,
      });
      if (newBadges.length > 0) {
        newBadges.forEach(badgeId => {
          const def = getBadgeDef(badgeId);
          if (def) setTimeout(() => showToast(`🏅 Achievement: ${def.name}!`), 500);
        });
      }
      _syncAchievementMilestones();
    }
  },
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
  removeLink:               ({ id, idx }) => removeLink(id, +idx),
  deferTask:                ({ id, day }) => deferTask(id, day),
  markSectionDone:          ({ day, i }) => markSectionDone(day, +i),
  // Panels
  togglePanel:              ({ panel }) => togglePanel(panel),
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
  importCalendarUrl:        () => {
    const url = document.getElementById('ical-url-input')?.value || '';
    importCalendarUrl(url, render, showToast);
  },
  shareProgress:            () => shareProgress(showToast),
  cloudBackup:              async () => {
    try {
      const { syncPush: sp } = await import('./sync.js');
      const snapshot = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(CONFIG.storagePrefix + '-')) snapshot[k] = localStorage.getItem(k);
      }
      showToast('Backup saved ✓');
    } catch (e) { showToast('Backup failed: ' + e.message); }
  },
  restoreBackup:            () => { showToast('Restore: use Import JSON for now'); },
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
  saveScratchpadMarkdown:   ({ previewId }, _e, el) => {
    saveScratchpad(el.value);
    const preview = document.getElementById(previewId);
    if (preview) preview.innerHTML = renderMarkdown(el.value) || '<div class="markdown-empty">Write with Markdown. Preview appears here.</div>';
    syncPush();
  },
  updateMarkdownPreview:    ({ previewId }, _e, el) => {
    const preview = document.getElementById(previewId);
    if (preview) preview.innerHTML = renderMarkdown(el.value) || '<div class="markdown-empty">Preview formulas, lists, links, and checkboxes here.</div>';
  },
  markdownShortcut:         ({ target, command }) => {
    const textarea = document.getElementById(target);
    applyMarkdownShortcut(textarea, command);
  },
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

  // ── Ideal Week ──
  setIdealMode:             ({ mode }) => {
    setIdealShowCompare(mode === 'compare');
    navigateRoute('ideal', mode === 'compare' ? 'compare' : 'edit');
    render();
  },
  selectIdealDay:           ({ day }) => { setIdealEditingDay(day); render(); },
  saveIdealDayMeta:         ({ day }) => {
    saveIdealDayMeta(
      day,
      document.getElementById(`ideal-wake-${day}`)?.value ?? '',
      document.getElementById(`ideal-leave-${day}`)?.value ?? '',
      document.getElementById(`ideal-meta-${day}`)?.value ?? '',
    );
    render(); showToast('Day details saved');
  },
  addIdealTask:             ({ day, i }) => {
    const text = document.getElementById(`ideal-text-${i}`)?.value ?? '';
    const cat  = document.getElementById(`ideal-cat-${i}`)?.value ?? '';
    if (addIdealTask(day, +i, text, cat)) { render(); showToast('Task added'); }
    else showToast('Enter task text');
  },
  removeIdealTask:          ({ day, i, j }) => { removeIdealTask(day, +i, +j); render(); showToast('Task removed'); },
  addIdealSection:          ({ day }) => {
    const label = prompt('Section name:');
    if (label?.trim()) { addIdealSection(day, label.trim()); render(); showToast('Section added'); }
  },
  removeIdealSection:       ({ day, i }) => {
    showConfirm('Delete this section?', () => { removeIdealSection(day, +i); render(); showToast('Section removed'); });
  },
  importIdealAsSchedule:    () => {
    showConfirm('Replace your active schedule with the Ideal Week? This will overwrite all current tasks.', () => {
      // Save ideal week as custom-schedule, then reload it into memory
      Storage.set('custom-schedule', loadIdealWeek());
      loadCustomSchedule();
      saveScheduleToStorage();
      render(); showToast('Ideal week imported as schedule');
    });
  },
  resetIdealToDefault:      () => {
    showConfirm('Reset Ideal Week to the default template?', () => {
      resetIdealWeek(); render(); showToast('Ideal week reset');
    });
  },

  // ── Weekly Review ──
  reviewNext:               () => {
    const step = getReviewStep();
    if (step === 3) {
      const draft = getReviewDraft();
      const data = generateReviewData();
      saveReview(getWeekKey(), {
        highlight: draft.highlight,
        improvement: draft.improvement,
        reflection: draft.reflection,
        wp: data.wp,
        skippedCount: data.skippedTasks.length,
        incompleteCount: data.incompleteTasks.length,
      });
      _surfaceXP(awardActivityXP(`review:${getWeekKey()}`, 'Weekly review completed', XP_REWARDS.review));
      _syncAchievementMilestones();
      showToast('Review saved!');
    }
    const nextStep = step + 1;
    setReviewStep(nextStep);
    navigateRoute('review', String(nextStep));
    render();
  },
  reviewPrev:               () => {
    const prevStep = getReviewStep() - 1;
    setReviewStep(prevStep);
    navigateRoute('review', String(prevStep));
    render();
  },
  reviewRestart:            () => { resetReview(); navigateRoute('review', '0'); render(); },
  updateReviewDraft:        ({ field }, _e, el) => { setReviewDraft(field, el.value); },

  // ── Global Search ──
  openGlobalSearch:         () => toggleGlobalSearch(),

  // ── Inbox ──
  inboxCapture:             () => {
    const input = document.getElementById('inbox-capture-input');
    const text = input?.value.trim() || '';
    if (!text) { showToast('Enter some text first'); return; }
    addToInbox(text);
    if (input) input.value = '';
    render();
    showToast('Captured to inbox');
  },
  inboxCaptureKey:          (_data, e) => {
    if (e.key === 'Enter') {
      const input = e.target;
      const text = input.value.trim();
      if (!text) return;
      addToInbox(text);
      input.value = '';
      render();
      showToast('Captured to inbox');
    }
  },
  inboxRemove:              ({ id }) => { removeFromInbox(id); render(); },
  inboxClearAll:            () => {
    showConfirm('Clear all inbox items?', () => { clearInbox(); render(); showToast('Inbox cleared'); });
  },
  inboxToTask:              ({ id }) => {
    const items = loadInbox();
    const item = items.find(i => i.id === id);
    if (!item) return;
    const daySelect = document.getElementById(`inbox-day-${id}`);
    const day = daySelect?.value || DAYS[state.selectedDay] || DAYS[0];
    const secs = schedule[day]?.sections;
    if (!secs || secs.length === 0) { showToast('No sections in that day'); return; }
    addTaskToSection(day, 0, item.text, 'homework');
    removeFromInbox(id);
    render();
    showToast(`Added to ${day}`);
  },
  inboxToDeadline:          ({ id }) => {
    const items = loadInbox();
    const item = items.find(i => i.id === id);
    if (!item) return;
    const dateInput = document.getElementById(`inbox-date-${id}`);
    const date = dateInput?.value || new Date().toISOString().slice(0,10);
    const dl = moveInboxToDeadline(id, item.text, date, 'homework');
    state.deadlines.push(dl);
    state.deadlines.sort((a,b) => a.date.localeCompare(b.date));
    saveDeadlines();
    render();
    showToast('Added to deadlines');
  },
  inboxToScratch:           ({ id }) => {
    const newScratch = moveInboxToScratchpad(id, loadScratchpad());
    saveScratchpad(newScratch);
    render();
    showToast('Moved to scratchpad');
  },

  // ── Habits ──
  toggleHabit:              ({ id }) => {
    const completed = toggleHabitToday(id);
    if (completed) _surfaceXP(awardActivityXP(`habit:${_dateKey()}:${id}`, 'Habit checked off', XP_REWARDS.habit));
    render();
  },
  addHabitPreset:           ({ name, icon, color }) => {
    addHabit({ name, icon, color, frequency: 'daily' });
    render();
    showToast(`${icon} ${name} added`);
  },
  addHabitCustom:           () => {
    const name = document.getElementById('habit-name-input')?.value.trim();
    const icon = document.getElementById('habit-icon-input')?.value.trim() || '⭐';
    const color = document.getElementById('habit-color-input')?.value || '#00d2ff';
    if (!name) { showToast('Enter a habit name'); return; }
    addHabit({ name, icon, color, frequency: 'daily' });
    render();
    showToast(`${icon} ${name} added`);
  },
  removeHabit:              ({ id }) => {
    const h = loadHabits().find(h => h.id === id);
    showConfirm(`Remove habit "${h?.name || id}"?`, () => {
      removeHabit(id);
      render();
      showToast('Habit removed');
    });
  },

  // ── Daily Planner ──
  openPlanner:              () => { openPlanner(); render(); },
  closePlanner:             () => { closePlanner(); render(); },
  plannerNext:              () => { setPlannerStep(getPlannerStep() + 1); render(); },
  plannerPrev:              () => { setPlannerStep(getPlannerStep() - 1); render(); },
  toggleMustDo:             ({ id }) => {
    const plan = getTodayPlan() || { intention: '', mustDo: [], priorities: [] };
    const updated = setMustDo(id, !plan.mustDo.includes(id), plan);
    saveTodayPlan(updated);
    render();
  },
  saveDailyPlan:            () => {
    const intention = document.getElementById('planner-intention')?.value || '';
    const plan = getTodayPlan() || { mustDo: [], priorities: [] };
    saveTodayPlan({ ...plan, intention, plannedAt: new Date().toISOString() });
    closePlanner();
    render();
    showToast('Daily plan saved ✓');
  },

  // ── Time Tracking ──
  startTimeTrack:           ({ id, text }) => {
    startTimer(id, text, render);
    render();
    showToast(`⏱ Tracking: ${text.slice(0, 30)}`);
  },
  stopTimeTrack:            () => {
    const result = stopTimer();
    render();
    if (result && result.elapsed >= 1) showToast(`⏱ Logged ${result.elapsed} min`);
    else showToast('Timer stopped');
  },

  // ── Drag & Drop ──
  taskDragStart:            ({ id, day, si, ii }, e) => {
    if (e?.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    handleDragStart(id, day, si, ii);
  },

  // ── Lecture Notes ──
  openLectureNotes:         ({ id }) => { state.openLectureNotes = id; render(); },
  closeLectureNotes:        () => { state.openLectureNotes = null; render(); },
  saveLectureNotes:         ({ id }) => {
    const text = document.getElementById(`lecture-notes-${id}`)?.value || '';
    if (text.trim()) state.lectureNotes[id] = text.trim();
    else delete state.lectureNotes[id];
    saveLectureNotes();
    state.openLectureNotes = null;
    render();
    showToast('Notes saved');
  },

  // ── Goals ──
  addGoalPreset:            ({ type, label, target, unit, icon }) => {
    addGoal({ type, label, target, unit, icon });
    render();
    showToast(`${icon} Goal added`);
  },
  addGoalCustom:            () => {
    const label  = document.getElementById('goal-label')?.value?.trim();
    const target = document.getElementById('goal-target')?.value;
    const unit   = document.getElementById('goal-unit')?.value || '';
    if (!label || !target) { showToast('Enter label and target'); return; }
    addGoal({ type: 'custom', label, target, unit, icon: '⭐' });
    render();
    showToast('Goal added');
  },
  removeGoal:               ({ id }) => { removeGoal(id); render(); showToast('Goal removed'); },
  updateGoalProgress:       ({ id }) => {
    const val = document.getElementById(`goal-progress-${id}`)?.value;
    if (val) { updateGoalProgress(id, val); render(); }
  },

  // ── Recurrence ──
  addRecurringTask:         () => {
    const text   = document.getElementById('rec-text')?.value?.trim();
    const cat    = document.getElementById('rec-cat')?.value || 'homework';
    const type   = document.getElementById('rec-type')?.value || 'weekdays';
    const day    = document.getElementById('rec-target-day')?.value || null;
    if (!text) { showToast('Enter task text'); return; }
    addRecurringTask({ text, cat, recurrence: { type, targetDay: day } });
    render();
    showToast('Recurring task added');
  },
  removeRecurringTask:      ({ id }) => {
    showConfirm('Remove this recurring task?', () => {
      removeRecurringTask(id);
      render();
      showToast('Recurring task removed');
    });
  },

  // ── Grades ──
  addGrade:                 () => {
    const cat    = document.getElementById('grade-cat')?.value || 'homework';
    const name   = document.getElementById('grade-name')?.value?.trim();
    const score  = document.getElementById('grade-score')?.value;
    const max    = document.getElementById('grade-max')?.value || '100';
    const weight = document.getElementById('grade-weight')?.value || '1';
    const date   = document.getElementById('grade-date')?.value || new Date().toISOString().slice(0,10);
    const type   = document.getElementById('grade-type')?.value || 'exam';
    if (!name || !score) { showToast('Enter a name and score'); return; }
    addGrade(cat, { name, score, maxScore: max, weight, date, type });
    render();
    showToast('Grade added');
  },
  removeGrade:              ({ cat, id }) => { removeGrade(cat, id); render(); showToast('Grade removed'); },

  // ── Calendar ──
  setCalendarMode:          ({ mode }) => { setCalendarMode(mode); render(); },
  calNavigateDay:           ({ day }) => {
    const idx = DAYS.indexOf(day);
    if (idx >= 0) { state.selectedDay = idx; navigateRoute('schedule'); }
  },

  // ── Onboarding ──
  onboardNext:              () => { setOnboardingStep(getOnboardingStep() + 1); render(); },
  onboardPrev:              () => { setOnboardingStep(getOnboardingStep() - 1); render(); },
  skipOnboarding:           () => { markOnboardingDone(); render(); },
  finishOnboarding:         () => {
    const taskText = document.getElementById('onboard-task')?.value?.trim();
    if (taskText) {
      const cat = document.getElementById('onboard-task-cat')?.value || 'homework';
      const today = DAYS[state.selectedDay] || DAYS[0];
      addTaskToSection(today, 0, taskText, cat);
    }
    markOnboardingDone();
    render();
    showToast('Welcome! 🎓 Your hub is ready.');
  },

  // ── Theming ──
  setThemePreset:           ({ key }) => { setThemePreset(key, render); showToast(`Theme: ${THEME_PRESETS[key]?.label || key}`); },
  setAccentColor:           ({ value }, _e, el) => { setAccentColor(value || el?.value, null); },
  resetAccentColor:         () => { resetAccentColor(render); showToast('Accent color reset'); },

  // ── Task Dependencies ──
  showBlockerPicker:        ({ id }) => { state.openBlockerPicker = state.openBlockerPicker === id ? null : id; render(); },
  closeBlockerPicker:       () => { state.openBlockerPicker = null; render(); },
  toggleBlocker:            ({ id, blocker }) => {
    if (!state.taskBlockedBy) state.taskBlockedBy = {};
    const current = state.taskBlockedBy[id] || [];
    if (current.includes(blocker)) state.taskBlockedBy[id] = current.filter(b => b !== blocker);
    else state.taskBlockedBy[id] = [...current, blocker];
    if (state.taskBlockedBy[id].length === 0) delete state.taskBlockedBy[id];
    saveTaskBlockedBy();
    render();
  },

  // ── Spaced Review ──
  scheduleReview:           ({ id, text, cat }) => { scheduleSpacedReview(id, text, cat); showToast('🧠 Review scheduled (+1, +3, +7, +14 days)'); },
  markSpacedReview:         ({ reviewId }) => { markSpacedReviewDone(reviewId); render(); showToast('Review marked done ✓'); },
  dismissSpacedReview:      ({ reviewId }) => { dismissSpacedReview(reviewId); render(); },

  // ── Energy Journal ──
  logEnergy:                ({ level }) => { logEnergy(+level); render(); showToast(`⚡ Energy logged: ${level}/5`); },

  // ── Grade Predictor ──
  predictGrade:             () => {
    const cat = document.getElementById('predict-cat')?.value;
    const target = +document.getElementById('predict-target')?.value;
    if (!cat || !target) { showToast('Select a subject and target'); return; }
    const result = predictNeeded(cat, target);
    const el = document.getElementById('predict-result');
    if (!el || !result) return;
    if (result.possible) {
      el.innerHTML = `<div style="margin-top:10px;padding:10px;background:var(--surface);border-radius:8px;font-size:11px;color:var(--text)">
        You need <strong style="color:var(--accent)">${result.needed}/${result.max}</strong> (${result.pct}%) on the next assessment to reach <strong>${target}%</strong>.</div>`;
    } else {
      el.innerHTML = `<div style="margin-top:10px;padding:10px;background:#e9456011;border-radius:8px;font-size:11px;color:#e94560">
        ⚠ You need ${result.pct}% — above the max of ${result.max}. Target may not be reachable with one assessment.</div>`;
    }
  },

  // ── Matrix ──
  matrixJumpToTask:         ({ day }) => {
    const idx = DAYS.indexOf(day);
    if (idx >= 0) { state.selectedDay = idx; navigateRoute('schedule'); }
  },

  // ── Streak Freeze ──
  useStreakFreeze:           ({ id }) => {
    if (useStreakFreeze(id)) { render(); showToast('❄️ Streak freeze applied'); }
    else showToast('No freezes available');
  },

  // ── Focus Session ──
  startFocusSession:        ({ id, text }) => {
    state.focusSession = { taskId: id, taskText: text || 'Focus', startedAt: Date.now() };
    startTimer(id, text || 'Focus', render);
    render();
  },
  endFocusSession:          () => {
    const result = stopTimer();
    state.focusSession = null;
    render();
    if (result?.elapsed >= 1) {
      _surfaceXP(awardXP('Focus session', XP_REWARDS.focus));
      showToast(`🎯 Focus: ${result.elapsed} min logged`);
    }
    else showToast('Focus session ended');
  },
  markDoneAndEndFocus:      ({ id }) => {
    const result = stopTimer();
    state.focusSession = null;
    if (id && !state.checked[id]) {
      state.checked[id] = true;
      logCompletionTime(id);
      _surfaceXP(awardActivityXP(`task:${getWeekKey()}:${id}`, 'Task completed', XP_REWARDS.task));
      saveState();
    }
    render();
    if (result?.elapsed >= 1) {
      _surfaceXP(awardXP('Focus session', XP_REWARDS.focus));
      showToast(`✅ Done! ${result.elapsed} min focused`);
    }
    else showToast('Task completed');
  },
  focusCaptureOnEnter:      (_d, e) => {
    if (e.key !== 'Enter') return;
    const inp = document.getElementById('focus-capture-input');
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    const current = loadScratchpad() || '';
    saveScratchpad(current + (current ? '\n' : '') + `[focus] ${text}`);
    inp.value = '';
    showToast('💭 Thought captured');
  },
  focusCaptureThought:      () => {
    const inp = document.getElementById('focus-capture-input');
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    const current = loadScratchpad() || '';
    saveScratchpad(current + (current ? '\n' : '') + `[focus] ${text}`);
    inp.value = '';
    showToast('💭 Thought captured');
  },

  // ── Backup / Restore ──
  downloadBackup:           () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(CONFIG.storagePrefix)) data[k] = localStorage.getItem(k);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `study-plan-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast('📦 Backup downloaded');
  },
  uploadBackup:             () => {
    const input = document.getElementById('backup-file-input');
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        showConfirm(`Restore backup? This will overwrite current data (${Object.keys(data).length} keys).`, () => {
          Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
          showToast('Backup restored — reloading...');
          setTimeout(() => location.reload(), 1000);
        });
      } catch { showToast('Invalid backup file'); }
    };
    reader.readAsText(file);
  },

  // ── Navigation Customization ──
  toggleNavOverflow:  () => { state.navOverflowOpen = !state.navOverflowOpen; render(); },
  closeNavOverflow:   () => { state.navOverflowOpen = false; render(); },
  openNavCustomizer:  () => { state.navOverflowOpen = false; state.navCustomizerOpen = true; render(); },
  closeNavCustomizer: () => { state.navCustomizerOpen = false; render(); },
  pinNavItem:    ({ id }) => { pinItem(id); state.navCustomizerOpen = true; render(); },
  unpinNavItem:  ({ id }) => { unpinItem(id); state.navCustomizerOpen = true; render(); },

  // ── Full Backup ──
  downloadFullBackup: () => {
    const count = downloadFullBackup();
    showToast(`✅ Full backup saved (${count} keys)`);
  },
  importFullBackup: () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      importFullBackupFromFile(file,
        (obj, keyCount, meta) => {
          showConfirm(
            `Restore ${keyCount} keys from backup?\nExported: ${meta?.exported?.slice(0,10) ?? 'unknown'}\nSemester: ${meta?.semester ?? 'unknown'}\n\nThis will overwrite all current data.`,
            () => {
              const n = restoreFullBackup(obj);
              showToast(`✅ Restored ${n} keys — reloading…`);
              setTimeout(() => location.reload(), 1200);
            },
            'Restore',
          );
        },
        (err) => showToast('❌ ' + err),
      );
    };
    input.click();
  },

  // ── Obsidian Export ──
  exportObsidian: () => {
    downloadObsidianExport(showToast);
  },

  // ── GPA Calculator ──
  setGPAScale: ({ scale }) => {
    saveGPAScale(scale);
    render();
  },
  setCreditHours: ({ cat }, _e, el) => {
    const credits = loadCreditHours();
    credits[cat]  = parseFloat(el.value) || 0;
    saveCreditHours(credits);
    render();
  },
  computeGPAPredictor: () => {
    const target = parseFloat(document.getElementById('gpa-target-input')?.value) || 3.5;
    const result = predictGPANeeded(target);
    const el = document.getElementById('gpa-predict-result');
    if (el) {
      el.style.color = result.possible ? '#00e676' : '#e94560';
      el.textContent = result.message;
    }
  },

  // ── Recurring Deadlines ──
  addRecurringDeadline: () => {
    const name  = document.getElementById('rd-name')?.value.trim();
    const cat   = document.getElementById('rd-cat')?.value || 'homework';
    const rec   = document.getElementById('rd-recurrence')?.value || 'weekly';
    const dow   = parseInt(document.getElementById('rd-dow')?.value ?? '5');
    const start = document.getElementById('rd-start')?.value || new Date().toISOString().slice(0,10);
    if (!name) { showToast('Enter a deadline name'); return; }
    addRecurringDeadline({ name, cat, recurrence: rec, startDate: start, dayOfWeek: dow });
    const added = mergeRecurringIntoDeadlines(state, saveDeadlines);
    render();
    showToast(`Recurring deadline added (${added} instance${added !== 1 ? 's' : ''} generated)`);
  },
  removeRecurringDeadline: ({ id }) => {
    showConfirm('Remove this recurring deadline template? Existing instances will not be deleted.', () => {
      removeRecurringDeadline(id);
      render();
      showToast('Recurring deadline removed');
    });
  },

  // ── Encryption ──
  toggleEncryption: () => {
    if (!isEncryptionAvailable()) { showToast('❌ Requires HTTPS'); return; }
    if (isEncryptionEnabled()) {
      showConfirm('Disable encryption? Your data will remain in localStorage but no longer encrypted.', () => {
        disableEncryption();
        render();
        showToast('Encryption disabled');
      });
    } else {
      showConfirm('Enable AES-256 encryption for sensitive data (grades, notes, scratch)? You will need your password to decrypt.', async () => {
        try {
          const hash = CONFIG.passwordHash;
          if (!hash) { showToast('❌ Set a password first'); return; }
          await enableEncryption(hash);
          render();
          showToast('✅ Encryption enabled');
        } catch (e) { showToast('❌ ' + e.message); }
      });
    }
  },

  // ── Dashboard Customization ──
  toggleDashboardEdit: () => {
    state.dashboardEditMode = !state.dashboardEditMode;
    render();
  },
  setDashboardCardVisible: ({ cardId }, _e, el) => {
    const config = loadDashboardConfig();
    const updated = setCardVisible(config, cardId, el.checked);
    saveDashboardConfig(updated);
    render();
  },
  setDashboardCardSize: ({ cardId }, _e, el) => {
    const config = loadDashboardConfig();
    const updated = setCardSize(config, cardId, el.value);
    saveDashboardConfig(updated);
    render();
  },
  moveDashboardCardUp: ({ cardId }) => {
    const config  = loadDashboardConfig();
    const updated = moveCard(config, cardId, -1);
    saveDashboardConfig(updated);
    render();
  },
  moveDashboardCardDown: ({ cardId }) => {
    const config  = loadDashboardConfig();
    const updated = moveCard(config, cardId, +1);
    saveDashboardConfig(updated);
    render();
  },

  // ── Flashcards ──
  addFlashcardDeck: () => {
    const input = document.getElementById('fc-new-deck-name');
    const name  = input?.value.trim() || '';
    if (!name) { showToast('Enter a deck name'); return; }
    addDeck(name);
    if (input) input.value = '';
    render();
    showToast(`Deck "${name}" created`);
  },
  addFlashcardDeckOnEnter: (_data, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const name = e.target.value.trim();
      if (!name) return;
      addDeck(name);
      e.target.value = '';
      render();
      showToast(`Deck "${name}" created`);
    }
  },
  removeFlashcardDeck: ({ deckId }) => {
    showConfirm('Delete this deck and all its cards?', () => {
      removeDeck(deckId);
      render();
      showToast('Deck removed');
    });
  },
  addFlashcard: ({ deckId }) => {
    const front = document.getElementById(`fc-front-${deckId}`)?.value.trim() || '';
    const back  = document.getElementById(`fc-back-${deckId}`)?.value.trim() || '';
    if (!front || !back) { showToast('Enter both question and answer'); return; }
    addFlashcard(deckId, front, back);
    if (document.getElementById(`fc-front-${deckId}`)) document.getElementById(`fc-front-${deckId}`).value = '';
    if (document.getElementById(`fc-back-${deckId}`)) document.getElementById(`fc-back-${deckId}`).value = '';
    render();
    showToast('Card added');
  },
  removeFlashcard: ({ cardId }) => {
    removeFlashcard(cardId);
    render();
    showToast('Card removed');
  },
  startFlashcardStudy: ({ deckId }) => {
    state.flashcardStudyDeck = deckId === undefined ? null : deckId;
    state.flashcardFlipped   = false;
    render();
  },
  exitFlashcardStudy: () => {
    state.flashcardStudyDeck = null;
    state.flashcardFlipped   = false;
    render();
  },
  flipFlashcard: () => {
    state.flashcardFlipped = !state.flashcardFlipped;
    render();
  },
  rateFlashcard: ({ cardId, rating }) => {
    const cards = loadFlashcards();
    const card  = cards.find(c => c.id === cardId);
    if (!card) return;
    const updated = sm2Rate(card, +rating);
    updateFlashcard(cardId, updated);
    state.flashcardFlipped = false;

    // Badge check for flashcard reviews
    const totalReviewed = (Storage.get('fc-reviews-total', 0) || 0) + 1;
    Storage.set('fc-reviews-total', totalReviewed);
    const newBadges = checkBadges({ flashcardsReviewed: totalReviewed });
    if (newBadges.length > 0) {
      newBadges.forEach(id => {
        const def = getBadgeDef(id);
        if (def) showToast(`🏅 Badge: ${def.name}!`);
      });
    }
    render();
  },

  // ── Pomodoro ──
  startPomodoro: ({ taskText, text }) => {
    const label = taskText || text || '';
    startPomodoro(label, render, render);
    state.pomodoroBarVisible = true;
    render();
    showToast('🍅 Pomodoro started — 25 minutes');
  },
  stopPomodoro: () => {
    stopPomodoro();
    render();
    showToast('Pomodoro stopped');
  },
  skipPomodoroBreak: () => {
    skipPomodoroBreak();
    render();
  },
  savePomodoroConfig: () => {
    const work = parseInt(document.getElementById('pomo-work')?.value) || 25;
    const brk  = parseInt(document.getElementById('pomo-break')?.value) || 5;
    const lng  = parseInt(document.getElementById('pomo-long')?.value) || 15;
    const ses  = parseInt(document.getElementById('pomo-sessions')?.value) || 4;
    _savePomodoroConfig({ workMins: work, breakMins: brk, longBreakMins: lng, sessionsBeforeLong: ses });
    render(); showToast('Pomodoro settings saved');
  },

  // ── PDF Report ──
  generatePDFReport: () => {
    generateWeeklyReport();
  },
  toggleWeeklyAutoReport: (_data, _e, el) => {
    setWeeklyAutoReport(!!el.checked);
    showToast(el.checked ? 'Sunday report auto-generate enabled' : 'Sunday report auto-generate disabled');
  },

  claimDailyChallenge: () => {
    const claimed = claimDailyChallenge(_buildAchievementSnapshot(), nowInTZ());
    if (!claimed.ok) {
      showToast(claimed.challenge.claimed ? 'Daily challenge already claimed' : 'Challenge not complete yet');
      return;
    }
    _surfaceXP(claimed.result);
    render();
    showToast(`+${claimed.challenge.xp}xp · ${claimed.challenge.title}`);
  },

  // ── Sync Conflict ──
  resolveConflict: ({ side }) => {
    resolveConflict(side);
    render();
    showToast(side === 'local' ? 'Kept your local version' : 'Using cloud version');
  },
  dismissConflict: () => {
    clearPendingConflict();
    render();
  },

  // ── Badge check trigger (called manually after significant events) ──
  checkAndShowBadges: () => {
    const wp          = getWeeklyProgress();
    const hist        = loadHistory();
    const habits      = state.habitsLoaded || [];
    const streaks     = {};
    // (streaks computed via habits module if needed)
    const newBadges   = checkBadges({
      totalDone:        wp.done,
      dayPct:           getDayProgress(DAYS[todayIdx]).pct,
      weekHistory:      hist,
      habitStreaks:      streaks,
      readingCount:     state.readingList.length,
      gradeAvg:         null,
      timeTodayMins:    0,
      completionHour:   null,
      weeklyReviewCount: 0,
      inboxEmpty:       false,
      catsToday:        0,
    });
    if (newBadges.length > 0) {
      newBadges.forEach(id => {
        const def = getBadgeDef(id);
        if (def) showToast(`🏅 Achievement unlocked: ${def.name}!`);
      });
    }
  },

  // ── Weekly Export ──
  exportWeeklySummary:      () => {
    const wp = getWeeklyProgress();
    const wk = getWeekNum();
    let text = `📊 Study Plan — Week ${wk} Summary\n${'═'.repeat(40)}\n\n`;
    text += `Overall: ${wp.done}/${wp.total} tasks (${wp.pct}%)\n\n`;
    DAYS.forEach(day => {
      const p = getDayProgress(day);
      if (p.total === 0) return;
      const bar = '█'.repeat(Math.round(p.pct / 10)) + '░'.repeat(10 - Math.round(p.pct / 10));
      text += `${getDayLabel(day).padEnd(12)} ${bar} ${p.pct}% (${p.done}/${p.total})\n`;
    });
    text += `\n${new Date().toLocaleDateString()}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `study-plan-week${wk}.txt`;
    a.click(); URL.revokeObjectURL(url);
    showToast('📊 Weekly summary exported');
  },
};
initDispatch(_dispatchHandlers);

// ════════════════════════════════════════
// ── Event Listeners ──
// ════════════════════════════════════════

// Context menu cleanup
document.addEventListener('click', closeCtxMenu);
document.addEventListener('scroll', closeCtxMenu, true);

// ── Button ripple effect ──
document.addEventListener('pointerdown', e => {
  const btn = e.target.closest('.data-btn, .tab, .view-btn, .fab-add-btn');
  if (!btn || btn.disabled) return;
  const rect = btn.getBoundingClientRect();
  const dot = document.createElement('span');
  dot.className = 'ripple-dot';
  dot.style.left = (e.clientX - rect.left) + 'px';
  dot.style.top  = (e.clientY - rect.top)  + 'px';
  btn.appendChild(dot);
  dot.addEventListener('animationend', () => dot.remove(), { once: true });
}, { passive: true });

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  // Cmd/Ctrl+K global search
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    toggleGlobalSearch();
    return;
  }
  // If global search is open, let it handle its own keys
  if (isGlobalSearchOpen()) return;

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
    // Priority chain: global search → context menu → shortcuts → search → scratchpad → FAB → open panels
    if (isGlobalSearchOpen()) { closeGlobalSearch(); return; }
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
  // View shortcuts (1-5)
  if (e.key === '1') navigateRoute('home');
  if (e.key === '2') navigateRoute('schedule');
  if (e.key === '3') navigateRoute('ideal');
  if (e.key === '4') navigateRoute('tools');
  if (e.key === '5') navigateRoute('stats');
  if (e.key === '6') navigateRoute('review');
  if (e.key === '7') navigateRoute('inbox');
  if (e.key === '8') navigateRoute('matrix');
  if (e.key === '9') navigateRoute('calendar');
  if (e.key === 'n') {
    e.preventDefault();
    // Quick capture: show mini overlay or navigate to inbox
    const text = prompt('Quick capture:');
    if (text?.trim()) {
      addToInbox(text.trim());
      render();
      showToast('Captured to inbox ✓');
    }
  }
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
    const fontCssUrl = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap';
    caches.open('study-plan-fonts-v1').then(cache => {
      cache.match(fontCssUrl).then(r => {
        if (!r) fetch(fontCssUrl).then(res => { if (res.ok) cache.put(res.url, res); }).catch(() => {});
      });
    }).catch(() => {});
  }
}

// ════════════════════════════════════════
// ── App Boot ──
// ════════════════════════════════════════

function boot() {
  initA11y();
  showInitialSkeleton();
  initRouter(render);
  initDragDrop(render);
  initTimerRestore(render);

  // Wire search quick-actions
  setSearchActionCallback((action, taskId) => {
    if (action === 'toggle') { toggle(taskId); render(); return; }
    if (action === 'skip')   { setTaskStatus(taskId, STATUS_SKIP); render(); return; }
    // Command palette actions — call the matching handler if it exists
    const handler = _dispatchHandlers[action];
    if (handler) { handler({}); return; }
    render();
  });
  // Multi-tab sync: re-render when another tab updates state
  initBroadcastChannel((msg) => {
    if (msg.key) render();
  });
  // Replay offline queue when connection is restored
  initOnlineDetection(() => {
    replayQueue(syncPush, showToast);
  });
  // Restore in-memory state from URL sub-views on navigation / refresh
  onSubViewChange((view, sub) => {
    if (view === 'review' && sub) {
      const step = parseInt(sub, 10);
      if (!isNaN(step)) setReviewStep(step);
    }
    if (view === 'ideal') {
      if (sub === 'compare') setIdealShowCompare(true);
      else if (sub === 'edit') setIdealShowCompare(false);
    }
  });
  initTheme(render);
  loadState();
  if (!DAYS[state.selectedDay]) state.selectedDay = 0;
  // Auto-open onboarding on first visit
  if (shouldShowOnboarding()) openOnboarding();
  if (dayConfig[DAYS[state.selectedDay]]?.active === false) {
    const firstActive = DAYS.findIndex(d => dayConfig[d]?.active !== false);
    state.selectedDay = firstActive >= 0 ? firstActive : 0;
  }
  migrateProgress(showToast);
  carryOverDeferrals(showToast);
  pruneOldData();
  // Inject recurring deadline instances on boot
  try { mergeRecurringIntoDeadlines(state, saveDeadlines); } catch (e) { console.warn('[recurring-dl]', e); }
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

  // Auto-update goals
  try {
    const wp = getWeeklyProgress();
    const habits = loadHabits();
    const streaks = habits.map(h => getHabitStreak(h.id).streak);
    autoUpdateGoals({ weeklyPct: wp.pct, readingCount: state.readingList.length, habitStreaks: streaks });
  } catch {}
  try { _syncAchievementMilestones(); } catch {}
  try { maybeAutoGenerateWeeklyReport(); } catch {}

  // Render
  renderImmediate();

  // Notifications
  if (state.notifEnabled) scheduleNotifications();

  // Auto-theme check every 5 min
  setInterval(checkAutoTheme, 300000);

  // Badging API — update PWA icon badge periodically
  function _updateBadge() {
    try {
      const { getInboxCount: _ic } = { getInboxCount };
      const { getDueCards: _dc } = { getDueCards };
      const inboxCnt = _ic();
      const flashDue = _dc().length;
      const overdueDeadlines = state.deadlines.filter(dl => {
        const d = new Date(dl.date); const now = new Date(); d.setHours(0,0,0,0); now.setHours(0,0,0,0);
        return d < now;
      }).length;
      const total = inboxCnt + overdueDeadlines + flashDue;
      if ('setAppBadge' in navigator) {
        total > 0 ? navigator.setAppBadge(total) : navigator.clearAppBadge();
      }
    } catch {}
  }
  _updateBadge();
  setInterval(_updateBadge, 60000);

  // Update offline banner
  updateOfflineBanner();

  // Auto-connect sync
  setupStoredSync(render).catch(err => console.warn('Auto-sync failed:', err.message));
}

// Password gate wraps the boot
initPasswordGate(boot);

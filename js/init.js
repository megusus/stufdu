// ════════════════════════════════════════
// ── App Initialization & Entry Point ──
// ════════════════════════════════════════

import { CONFIG, saveConfigOverrides } from './config.js';
import { Storage } from './storage.js';
import { CategoryRegistry } from './categories.js';
import { DAYS, SHORT, schedule, addTaskToSection, removeTaskFromSchedule, renameSectionInSchedule, addSectionToDay, removeSectionFromDay, moveSectionInDay, moveTaskInSection, dayConfig, setDayActive, setDayAlias, saveDayConfig, saveScheduleToStorage, getScheduleFingerprint, buildTextToIdMap, buildIdToTextMap, getCurrentIds, findItemById } from './schedule.js';
import { state, loadState, saveState, saveLinks, saveDeadlines, saveMeals, saveReadingList, loadHistory, loadScratchpad, saveScratchpad, getWeekKey, getWeekNum, getISOWeek, nowInTZ, getStatus, getDayProgress, getWeeklyProgress, invalidateProgressCache, STATUS_DONE, STATUS_SKIP, STATUS_PROGRESS, STATUS_BLOCKED, todayIdx, READING_LIST_DEFAULT, escapeHtml, haptic, formatEst } from './state.js';
import { initPasswordGate } from './password.js';
import { syncGoodreads, saveGoodreadsCSV, handleGoodreadsFile } from './reading.js';
import { getSyncConfig, connectSync, disconnectSync, setupStoredSync, syncPush, updateSyncDot } from './sync.js';
import { initTheme, toggleTheme, checkAutoTheme, currentTheme } from './ui/theme.js';
import { startPomo, cancelPomo, togglePomoPause, restartPomo, resetPomoPosition, setFocusTimerMin, ensurePomoBar } from './ui/timer.js';
import { toggle, setTaskStatus, toggleActionMenu, showNoteInput, saveNote, showDeferPicker, deferTask, clearTask, markSectionDone, addLink, showLinkInput, saveLink, removeLink, toggleFab, fabAddTask, toggleCatFilter, toggleFocusMode, togglePanel, selectDay, setViewMode, resetDay, viewPastWeek, toggleWeekDayCollapse, toggleFontSize, toggleShortcuts, toggleScratchpad, showToast, hideToast, undoToggle, showConfirm, showCtxMenu, showTaskCtxMenu, showTimerCtxMenu, showTabCtxMenu, closeCtxMenu, patchTaskDOM, updateProgressBars, toggleLock, setRenderFn } from './ui/toggle.js';
import { setSearch, clearSearch } from './ui/search.js';
import { initSwipeListeners, initPageSwipe, handleLongPressStart, handleLongPressEnd, handleItemClick } from './ui/swipe.js';
import { render, renderImmediate, doRender } from './render/index.js';
import { initDispatch } from './ui/dispatch.js';

// ── Wire up render function references ──
setRenderFn(render, doRender);

// ── Event dispatcher: handles all data-action click attributes ──
// Replaces ~80 window globals with a single document-level listener.
initDispatch({
  // Header
  toggleTheme:              () => toggleTheme(render),
  toggleFontSize:           () => toggleFontSize(),
  toggleShortcuts:          () => toggleShortcuts(),
  // Search / view
  clearSearch:              () => clearSearch(doRender),
  setViewMode:              ({ mode }) => setViewMode(mode),
  toggleFocusMode:          () => toggleFocusMode(),
  resetDay:                 () => resetDay(),
  // Day/week navigation
  selectDay:                ({ i }) => selectDay(+i),
  toggleWeekDayCollapse:    ({ i }) => toggleWeekDayCollapse(+i),
  toggleLock:               ({ day }) => toggleLock(day),
  toggleCatFilter:          ({ cat }) => toggleCatFilter(cat || null),
  // Task actions
  toggle:                   ({ id }) => toggle(id),
  handleItemClick:          ({ id }, e) => handleItemClick(id, e, toggle),
  toggleActionMenu:         ({ id }, e) => toggleActionMenu(id, e),
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
  // Reading
  syncGoodreads:            () => syncGoodreads(render, showToast),
  saveGoodreadsCSV:         () => saveGoodreadsCSV(render, showToast),
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
    // If we're deactivating the currently selected day, jump to the first active day
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
  // Schedule file
  exportSchedule: () => exportSchedule(),
  importSchedule: () => importSchedule(),
  newSemester:    () => newSemester(),
  // Meals
  fetchMeals:               () => fetchMeals(),
  toggleMealPaste:          () => toggleMealPaste(),
  clearMealData:            () => clearMealData(),
  savePastedMeals:          () => savePastedMeals(),
  // Data
  exportData:               () => exportData(),
  importData:               () => importData(),
  exportCalendar:           () => exportCalendar(),
  shareProgress:            () => shareProgress(),
  // Deadlines
  removeDeadline:           ({ i }) => removeDeadline(+i),
  showDeadlineForm:         () => { state.showDeadlineForm = true; render(); },
  addDeadline:              () => addDeadline(
    document.getElementById('dl-name')?.value ?? '',
    document.getElementById('dl-date')?.value ?? '',
    document.getElementById('dl-cat')?.value ?? ''
  ),
  // Notifications
  requestNotifPermission:   () => requestNotifPermission(),
  // Categories
  editCat:                  ({ key }) => editCat(key),
  saveCatEdit:              ({ key }) => saveCatEdit(key),
  deleteCat:                ({ key }) => deleteCat(key),
  addCat:                   () => addCat(),
  showCatAddFormOn:         () => { state.showCatAddForm = true;  render(); },
  showCatAddFormOff:        () => { state.showCatAddForm = false; render(); },
  resetCatToDefaults:       () => resetCatToDefaults(),
  // Settings
  applySettings:            () => applySettings(),
  resetSettings:            () => resetSettings(),
  // FAB / scratchpad
  toggleFab:                () => toggleFab(),
  fabAddTask:               () => fabAddTask(),
  toggleScratchpad:         () => toggleScratchpad(),
});

// ── Minimal window globals (non-click event handlers only) ──
// oninput, onchange, onkeydown, oncontextmenu, ontouchstart/end can't use
// the click dispatcher — keep only what those inline handlers actually need.
Object.assign(window, {
  // oninput
  saveScratchpad:      (text) => { saveScratchpad(text); syncPush(); },
  // onchange (timer minute input, goodreads file input)
  setFocusTimerMin,
  _doRender:           doRender,
  handleGoodreadsFile: () => handleGoodreadsFile(render, showToast),
  // onkeydown (Enter shortcuts in text inputs)
  saveNote,
  saveLink,
  fabAddTask,
  addCat,
  // render (called from link-input Escape: openLinkInput=null;render())
  render,
  get openLinkInput() { return state.openLinkInput; },
  set openLinkInput(v) { state.openLinkInput = v; },
  // oncontextmenu
  showTabCtxMenu,
  showTaskCtxMenu,
  // ontouchstart/end (swipe + long-press)
  handleLongPressStart: (id, e) => handleLongPressStart(id, e, toggleActionMenu),
  handleLongPressEnd,
});

// ════════════════════════════════════════
// ── Meal Widget ──
// ════════════════════════════════════════

function parseMealString(str) {
  if (!str || typeof str !== 'string') return [];
  return str.split(/[\r\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
}

function parseSKSApiResponse(data) {
  const newData = {};
  if (!Array.isArray(data)) return newData;
  for (const item of data) {
    let dateKey = null;
    if (item.created_at) dateKey = item.created_at.substring(0, 10);
    if (!dateKey) continue;
    newData[dateKey] = {
      kahvalti: parseMealString(item.breakfast_tr || item.breakfast || ''),
      ogle: parseMealString(item.lunch_tr || item.lunch || ''),
      aksam: parseMealString(item.dinner_tr || item.dinner || ''),
      vegan: parseMealString(item.vegan_tr || item.vegan || ''),
    };
  }
  return newData;
}

function parseMealText(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const newData = {};
  let currentDate = null;
  let currentType = 'ogle';
  const months = { 'ocak': 1, '\u015fubat': 2, 'subat': 2, 'mart': 3, 'nisan': 4, 'may\u0131s': 5, 'mayis': 5, 'haziran': 6, 'temmuz': 7, 'a\u011fustos': 8, 'agustos': 8, 'eyl\u00fcl': 9, 'eylul': 9, 'ekim': 10, 'kas\u0131m': 11, 'kasim': 11, 'aral\u0131k': 12, 'aralik': 12 };
  for (const line of lines) {
    const lower = line.toLowerCase();
    const dateMatch2 = line.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    const dateMatch3 = line.match(/(\d{4})-(\d{2})-(\d{2})/);
    const dateMatch1 = line.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (dateMatch3) { currentDate = dateMatch3[0]; if (!newData[currentDate]) newData[currentDate] = { kahvalti: [], ogle: [], aksam: [], vegan: [] }; continue; }
    if (dateMatch2) { currentDate = `${dateMatch2[3]}-${dateMatch2[2].padStart(2, '0')}-${dateMatch2[1].padStart(2, '0')}`; if (!newData[currentDate]) newData[currentDate] = { kahvalti: [], ogle: [], aksam: [], vegan: [] }; continue; }
    if (dateMatch1 && months[dateMatch1[2].toLowerCase()]) { const m = months[dateMatch1[2].toLowerCase()]; currentDate = `${dateMatch1[3]}-${String(m).padStart(2, '0')}-${dateMatch1[1].padStart(2, '0')}`; if (!newData[currentDate]) newData[currentDate] = { kahvalti: [], ogle: [], aksam: [], vegan: [] }; continue; }
    if (lower.includes('kahvalt') || lower.includes('breakfast')) { currentType = 'kahvalti'; continue; }
    if (lower.includes('\u00f6\u011fle') || lower.includes('ogle') || lower.includes('lunch')) { currentType = 'ogle'; continue; }
    if (lower.includes('ak\u015fam') || lower.includes('aksam') || lower.includes('dinner')) { currentType = 'aksam'; continue; }
    if (lower.includes('vegan')) { currentType = 'vegan'; continue; }
    if (currentDate && newData[currentDate]) {
      if (lower === 'tarih' || lower === 'g\u00fcn' || lower === 'gun' || lower === 'men\u00fc' || lower === 'menu') continue;
      const clean = line.replace(/^\d+[\.)\]]\s*/, '').replace(/\t+/g, ' ').trim();
      if (clean.length > 1 && clean.length < 100) newData[currentDate][currentType].push(clean);
    }
  }
  return newData;
}

async function fetchMeals() {
  state.mealFetchStatus = 'fetching';
  render();
  const now = nowInTZ();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  try {
    const url = `${CONFIG.mealApiUrl}?category=lunch&month=${month}&year=${year}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const json = await res.json();
      const items = Array.isArray(json) ? json : (json.data || []);
      const parsed = parseSKSApiResponse(items);
      if (Object.keys(parsed).length > 0) {
        Object.assign(state.mealData, parsed);
        saveMeals();
        state.mealFetchStatus = 'ok';
        render();
        showToast(`Loaded meals for ${Object.keys(parsed).length} days`);
        return;
      }
    }
  } catch (e) { console.warn('SKS API failed:', e.message); }
  state.mealFetchStatus = 'error';
  state.mealShowPaste = true;
  render();
}

function savePastedMeals() {
  const ta = document.getElementById('meal-paste-input');
  if (!ta || !ta.value.trim()) { showToast('Paste meal data first'); return; }
  const parsed = parseMealText(ta.value);
  const count = Object.keys(parsed).length;
  if (count === 0) { showToast('Could not parse any dates from text'); return; }
  Object.assign(state.mealData, parsed);
  saveMeals();
  state.mealShowPaste = false;
  haptic('success');
  render();
  showToast(`Loaded meals for ${count} day${count > 1 ? 's' : ''}`);
}

function toggleMealPaste() { state.mealShowPaste = !state.mealShowPaste; render(); }
function clearMealData() { state.mealData = {}; Storage.remove('meals'); render(); showToast('Meal data cleared'); }

// ════════════════════════════════════════
// ── Deadlines ──
// ════════════════════════════════════════

function addDeadline(name, date, cat) {
  if (!name || !date) return;
  state.deadlines.push({ name: name.trim(), date, cat: cat || 'homework' });
  state.deadlines.sort((a,b) => a.date.localeCompare(b.date));
  saveDeadlines();
  syncPush();
  state.showDeadlineForm = false;
  render();
  showToast('Deadline added');
}

function removeDeadline(idx) {
  state.deadlines.splice(idx, 1);
  saveDeadlines();
  syncPush();
  render();
}

// ════════════════════════════════════════
// ── Notifications ──
// ════════════════════════════════════════

function requestNotifPermission() {
  if (!('Notification' in window)) { showToast('Notifications not supported'); return; }
  Notification.requestPermission().then(p => {
    state.notifEnabled = p === 'granted';
    if (state.notifEnabled) { scheduleNotifications(); showToast('Notifications enabled'); }
    else showToast('Notifications denied');
    render();
  });
}

function scheduleNotifications() {
  state.notifTimers.forEach(t => clearTimeout(t));
  state.notifTimers = [];
  if (!state.notifEnabled) return;
  const now = nowInTZ();
  if (state.selectedDay !== todayIdx) return;
  const dayName = DAYS[todayIdx];
  const day = schedule[dayName];
  if (day.leave) {
    const [lh, lm] = day.leave.split(':').map(Number);
    const leaveMs = new Date(now).setHours(lh, lm, 0, 0) - now.getTime() - 1800000;
    if (leaveMs > 0) state.notifTimers.push(setTimeout(() => new Notification('Leave in 30 min', { body: `Head out at ${day.leave}`, icon: '\ud83d\udeb6' }), leaveMs));
  }
  day.sections.forEach(s => s.items.forEach(item => {
    if (item.cat !== 'class' && item.cat !== 'fameeting') return;
    const m = item.text.match(/(\d{1,2}):(\d{2})/);
    if (!m) return;
    const classMs = new Date(now).setHours(parseInt(m[1]), parseInt(m[2]), 0, 0) - now.getTime() - 900000;
    if (classMs > 0) state.notifTimers.push(setTimeout(() => new Notification('Class in 15 min', { body: item.text.split('\u2014')[0].trim(), icon: '\ud83d\udcd8' }), classMs));
  }));
}

// ════════════════════════════════════════
// ── Export / Import / Calendar / Share ──
// ════════════════════════════════════════

function exportData() {
  const data = { checked: state.checked, notes: state.taskNotes, deferred: state.taskDeferred, history: loadHistory(), weekKey: getWeekKey(), exported: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `study-plan-${getWeekKey()}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (typeof data !== 'object' || data === null) { showToast('Invalid file format'); return; }
        const validStates = [STATUS_DONE, STATUS_SKIP, STATUS_PROGRESS, STATUS_BLOCKED];
        if (data.checked && typeof data.checked === 'object') {
          const clean = {};
          for (const [k, v] of Object.entries(data.checked)) {
            if (/^[a-z]+-\d+$/.test(k) && (v === true || validStates.includes(v))) clean[k] = v;
          }
          state.checked = clean;
        }
        if (data.notes && typeof data.notes === 'object') {
          const clean = {};
          for (const [k, v] of Object.entries(data.notes)) {
            if (/^[a-z]+-\d+$/.test(k) && typeof v === 'string' && v.length < 1000) clean[k] = v;
          }
          state.taskNotes = clean;
        }
        if (data.deferred && typeof data.deferred === 'object') {
          const clean = {};
          for (const [k, v] of Object.entries(data.deferred)) {
            if (/^[a-z]+-\d+$/.test(k) && DAYS.includes(v)) clean[k] = v;
          }
          state.taskDeferred = clean;
        }
        saveState();
        if (data.history && typeof data.history === 'object') {
          const cleanHist = {};
          for (const [k, v] of Object.entries(data.history)) {
            if (/^w\d+$/.test(k) && typeof v === 'number' && v >= 0 && v <= 100) cleanHist[k] = v;
          }
          Storage.set('history', cleanHist);
        }
        render();
        showToast('Data imported');
      } catch (err) { showToast('Invalid file'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function exportCalendar() {
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//StudyPlan//EN\r\nCALSCALE:GREGORIAN\r\n';
  const now = nowInTZ();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const monday = new Date(now); monday.setDate(monday.getDate() - dow);
  DAYS.forEach((dayName, di) => {
    schedule[dayName].sections.forEach(s => s.items.forEach(item => {
      if (item.cat !== 'class' && item.cat !== 'fameeting') return;
      const timeMatch = item.text.match(/(\d{1,2}):(\d{2})\u2014(\d{1,2}):(\d{2})/);
      if (!timeMatch) return;
      const eventDate = new Date(monday); eventDate.setDate(eventDate.getDate() + di);
      const ds = `${eventDate.getFullYear()}${String(eventDate.getMonth()+1).padStart(2,'0')}${String(eventDate.getDate()).padStart(2,'0')}`;
      const dtStart = `${ds}T${String(timeMatch[1]).padStart(2,'0')}${timeMatch[2]}00`;
      const dtEnd = `${ds}T${String(timeMatch[3]).padStart(2,'0')}${timeMatch[4]}00`;
      ics += `BEGIN:VEVENT\r\nDTSTART;TZID=${CONFIG.timezone}:${dtStart}\r\nDTEND;TZID=${CONFIG.timezone}:${dtEnd}\r\n`;
      ics += `SUMMARY:${item.text.split('\u2014')[0].trim()}\r\n`;
      if (item.hint) ics += `LOCATION:${item.hint}\r\n`;
      ics += `END:VEVENT\r\n`;
    }));
  });
  ics += 'END:VCALENDAR\r\n';
  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'study-plan-classes.ics'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  showToast('Calendar exported');
}

function exportSchedule() {
  const data = {
    schedule,
    dayConfig,
    exported: new Date().toISOString(),
    version: 1,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `schedule-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Schedule exported');
}

function importSchedule() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (typeof data !== 'object' || data === null) { showToast('Invalid file'); return; }
        // Import schedule structure
        if (data.schedule && typeof data.schedule === 'object') {
          for (const day of DAYS) {
            if (data.schedule[day] && Array.isArray(data.schedule[day].sections)) {
              schedule[day] = data.schedule[day];
            }
          }
          saveScheduleToStorage();
        }
        // Import day config
        if (data.dayConfig && typeof data.dayConfig === 'object') {
          for (const day of DAYS) {
            if (data.dayConfig[day]) {
              if (typeof data.dayConfig[day].active === 'boolean') dayConfig[day].active = data.dayConfig[day].active;
              if (typeof data.dayConfig[day].alias === 'string' || data.dayConfig[day].alias === null) {
                dayConfig[day].alias = data.dayConfig[day].alias;
              }
            }
          }
          saveDayConfig();
        }
        render();
        showToast('Schedule imported ✓');
      } catch (err) { showToast('Invalid file'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function newSemester() {
  showConfirm(
    'Start a new semester?\n\nThis clears all task progress, notes, deferred tasks, and links.\nYour schedule structure, categories, and settings are kept.',
    () => {
      state.checked = {};
      state.taskNotes = {};
      state.taskDeferred = {};
      state.taskLinks = {};
      saveState();
      saveLinks();
      showToast('🎓 New semester started — progress cleared');
      render();
    }
  );
}

function shareProgress() {
  const wp = getWeeklyProgress();
  const dayProgs = DAYS.map(d => { const p = getDayProgress(d); return `${d.slice(0,3)}: ${p.pct}%`; });
  const text = `\ud83d\udcd8 Study Plan \u2014 Week ${getWeekNum()}\n${wp.done}/${wp.total} tasks (${wp.pct}%)\n${dayProgs.join(' \u00b7 ')}\n\n#studyplan`;
  if (navigator.share) {
    navigator.share({ title: 'Study Plan Progress', text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard')).catch(() => showToast('Share not supported'));
  }
}

// ════════════════════════════════════════
// ── Data Maintenance ──
// ════════════════════════════════════════

function pruneOldData() {
  try {
    const hist = loadHistory();
    const keys = Object.keys(hist).sort();
    if (keys.length > 20) {
      const pruned = {};
      keys.slice(-20).forEach(k => pruned[k] = hist[k]);
      Storage.set('history', pruned);
    }
    const mealKeys = Object.keys(state.mealData).sort();
    if (mealKeys.length > 30) {
      const cutoff = mealKeys[mealKeys.length - 30];
      for (const k of mealKeys) { if (k < cutoff) delete state.mealData[k]; }
      saveMeals();
    }
  } catch (e) { /* non-critical */ }
}

function checkStorageQuota() {
  if (Storage.checkQuota()) {
    setTimeout(() => showToast('Storage nearly full \u2014 export your data'), 1000);
  }
}

function carryOverDeferrals() {
  try {
    const currentWeek = getISOWeek(nowInTZ());
    if (currentWeek <= 1) return;
    const prevKey = 'w' + (currentWeek - 1);
    const prevDefer = Storage.get(prevKey + '-defer', {});
    const prevChecked = Storage.get(prevKey, {});
    let carried = 0;
    for (const [id, target] of Object.entries(prevDefer)) {
      const st = prevChecked[id];
      if (st === true || st === STATUS_DONE || st === STATUS_SKIP) continue;
      if (!state.checked[id] && !state.taskDeferred[id]) {
        state.taskDeferred[id] = DAYS.includes(target) ? target : 'Monday';
        carried++;
      }
    }
    if (carried > 0) {
      saveState();
      setTimeout(() => showToast(`${carried} undone task(s) carried from last week`), 800);
    }
  } catch (e) { /* non-critical */ }
}

function migrateProgress() {
  const fpKey = getWeekKey() + '-schedule-fp';
  const textMapKey = getWeekKey() + '-schedule-textmap';
  const currentFp = getScheduleFingerprint();
  const storedFp = Storage.getRaw(fpKey, '');
  if (storedFp === currentFp) return;
  if (!storedFp) {
    Storage.setRaw(fpKey, currentFp);
    Storage.set(textMapKey, buildIdToTextMap());
    return;
  }
  let oldTextMap = Storage.get(textMapKey, {});
  const newTextToId = buildTextToIdMap();
  const currentIds = getCurrentIds();
  let migrated = 0;
  const newChecked = {}, newNotes = {}, newDeferred = {};
  for (const [id, val] of Object.entries(state.checked)) { if (currentIds.has(id)) newChecked[id] = val; }
  for (const [id, val] of Object.entries(state.taskNotes)) { if (currentIds.has(id)) newNotes[id] = val; }
  for (const [id, val] of Object.entries(state.taskDeferred)) { if (currentIds.has(id)) newDeferred[id] = val; }

  function findNewId(oldId) {
    const entry = oldTextMap[oldId];
    if (!entry) return null;
    const text = typeof entry === 'string' ? entry : entry.text;
    const day = typeof entry === 'object' ? entry.day : null;
    if (day) { const dayKey = day + '::' + text; if (newTextToId[dayKey]) return newTextToId[dayKey]; }
    return newTextToId[text] || null;
  }

  for (const [oldId, val] of Object.entries(state.checked)) {
    if (currentIds.has(oldId)) continue;
    const newId = findNewId(oldId);
    if (newId && !newChecked[newId]) { newChecked[newId] = val; migrated++; }
  }
  for (const [oldId, val] of Object.entries(state.taskNotes)) {
    if (currentIds.has(oldId)) continue;
    const newId = findNewId(oldId);
    if (newId && !newNotes[newId]) { newNotes[newId] = val; migrated++; }
  }
  for (const [oldId, val] of Object.entries(state.taskDeferred)) {
    if (currentIds.has(oldId)) continue;
    const newId = findNewId(oldId);
    if (newId && !newDeferred[newId]) { newDeferred[newId] = val; migrated++; }
  }

  state.checked = newChecked;
  state.taskNotes = newNotes;
  state.taskDeferred = newDeferred;
  Storage.setRaw(fpKey, currentFp);
  Storage.set(textMapKey, buildIdToTextMap());
  saveState();

  if (migrated > 0) setTimeout(() => showToast(`Schedule updated \u2014 migrated ${migrated} item(s)`), 500);
  else if (Object.keys(state.checked).length > 0) setTimeout(() => showToast('Schedule updated \u2014 progress preserved'), 500);
}

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
  }
  if (e.key === 'Escape') {
    if (state.showShortcuts) { toggleShortcuts(); return; }
    if (state.searchQuery) { clearSearch(doRender); return; }
    if (state.fabOpen) { state.fabOpen = false; render(); return; }
  }
  if (isInput) return;
  if (e.key === 'ArrowRight' && state.selectedDay < 6) selectDay(state.selectedDay + 1);
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
// ── Settings ──
// ════════════════════════════════════════

function applySettings() {
  const v = id => document.getElementById(id)?.value ?? '';
  const num = (id, fallback) => { const n = parseInt(v(id), 10); return isNaN(n) ? fallback : n; };
  saveConfigOverrides({
    appTitle:          v('cfg-appTitle').trim()        || CONFIG.appTitle,
    semester:          v('cfg-semester').trim()         || CONFIG.semester,
    headerTag:         v('cfg-headerTag').trim()        || CONFIG.headerTag,
    timezone:          v('cfg-timezone')                || CONFIG.timezone,
    focusTimerDefault: num('cfg-focusTimerDefault',      CONFIG.focusTimerDefault),
    toastDuration:     num('cfg-toastDuration',          CONFIG.toastDuration),
    swipeThreshold:    num('cfg-swipeThreshold',         CONFIG.swipeThreshold),
    mealApiUrl:        v('cfg-mealApiUrl').trim()        || CONFIG.mealApiUrl,
    goodreadsRss:      v('cfg-goodreadsRss').trim()      || CONFIG.goodreadsRss,
  });
  showToast('Settings saved \u2713');
  render();
}

function resetSettings() {
  Storage.remove('config');
  showToast('Settings reset \u2014 reload to restore defaults');
}

// ════════════════════════════════════════
// ── Category Management ──
// ════════════════════════════════════════

function editCat(key) {
  state.catEditKey = state.catEditKey === key ? null : key;
  render();
}

function saveCatEdit(key) {
  const v = id => document.getElementById(id)?.value ?? '';
  const num = (id, fb) => { const n = parseInt(v(id), 10); return isNaN(n) ? fb : n; };
  const cat = CategoryRegistry.get(key);
  CategoryRegistry.register(key, {
    label:      v(`cat-label-${key}`),
    border:     v(`cat-border-${key}`) || cat.border,
    bg:         v(`cat-bg-${key}`) || cat.bg,
    defaultEst: num(`cat-est-${key}`, cat.defaultEst),
  });
  CategoryRegistry.save();
  state.catEditKey = null;
  showToast(`\u2713 Category \u201c${key}\u201d updated`);
  render();
}

function deleteCat(key) {
  let usedCount = 0;
  for (const dayName of Object.keys(schedule)) {
    for (const section of (schedule[dayName].sections || [])) {
      for (const item of (section.items || [])) {
        if (item.cat === key) usedCount++;
      }
    }
  }
  const msg = usedCount > 0
    ? `\u201c${key}\u201d is used by ${usedCount} task(s). Remove anyway? Those tasks will fall back to the default style.`
    : `Remove category \u201c${key}\u201d?`;
  if (!confirm(msg)) return;
  CategoryRegistry.remove(key);
  CategoryRegistry.save();
  state.catEditKey = null;
  showToast(`Category \u201c${key}\u201d removed`);
  render();
}

function addCat() {
  const keyRaw = document.getElementById('cat-new-key')?.value ?? '';
  const key = keyRaw.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!key) { showToast('Category key is required'); return; }
  if (CategoryRegistry.has(key)) { showToast(`Key \u201c${key}\u201d already exists`); return; }
  const v = id => document.getElementById(id)?.value ?? '';
  const num = (id, fb) => { const n = parseInt(v(id), 10); return isNaN(n) ? fb : n; };
  CategoryRegistry.register(key, {
    label:      v('cat-new-label').trim(),
    border:     v('cat-new-border') || '#888888',
    bg:         v('cat-new-bg') || '#1a1a1a',
    defaultEst: num('cat-new-est', 60),
  });
  CategoryRegistry.save();
  state.showCatAddForm = false;
  showToast(`\u2713 Category \u201c${key}\u201d added`);
  render();
}

function resetCatToDefaults() {
  if (!confirm('Reset all categories to defaults? Custom categories will be lost.')) return;
  Storage.remove('categories');
  CategoryRegistry.init();
  state.catEditKey = null;
  state.showCatAddForm = false;
  showToast('Categories reset to defaults');
  render();
}

// ════════════════════════════════════════
// ── App Boot ──
// ════════════════════════════════════════

function boot() {
  initTheme(render);
  loadState();
  migrateProgress();
  carryOverDeferrals();
  pruneOldData();
  checkStorageQuota();
  checkAutoTheme();

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

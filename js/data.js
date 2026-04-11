// ════════════════════════════════════════
// ── Data Operations ──
// ── Export, Import, Calendar, Share,
// ── Deadlines, Notifications, Maintenance
// ════════════════════════════════════════

import { CONFIG } from './config.js';
import { Storage } from './storage.js';
import { DAYS, schedule, replaceSchedule, resetScheduleToDefault, dayConfig, saveDayConfig, getScheduleFingerprint, buildTextToIdMap, buildIdToTextMap, getCurrentIds, findItemById } from './schedule.js';
import {
  state, loadState, saveState, saveLinks, saveDeadlines, saveMeals, loadHistory,
  getWeekKey, getWeekNum, getISOWeek, nowInTZ,
  getStatus, getDayProgress, getWeeklyProgress, invalidateProgressCache,
  STATUS_DONE, STATUS_SKIP, STATUS_PROGRESS, STATUS_BLOCKED,
  todayIdx,
} from './state.js';
import { syncPush } from './sync.js';

// ════════════════════════════════════════
// ── Deadlines ──
// ════════════════════════════════════════

export function addDeadline(name, date, cat, render, showToast) {
  if (!name || !date) return;
  state.deadlines.push({ name: name.trim(), date, cat: cat || 'homework' });
  state.deadlines.sort((a,b) => a.date.localeCompare(b.date));
  saveDeadlines();
  syncPush();
  state.showDeadlineForm = false;
  render();
  showToast('Deadline added');
}

export function removeDeadline(idx, render) {
  state.deadlines.splice(idx, 1);
  saveDeadlines();
  syncPush();
  render();
}

// ════════════════════════════════════════
// ── Notifications ──
// ════════════════════════════════════════

export function requestNotifPermission(render, showToast) {
  if (!('Notification' in window)) { showToast('Notifications not supported'); return; }
  Notification.requestPermission().then(p => {
    state.notifEnabled = p === 'granted';
    if (state.notifEnabled) { scheduleNotifications(); showToast('Notifications enabled'); }
    else showToast('Notifications denied');
    render();
  });
}

export function scheduleNotifications() {
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

export function exportData() {
  const data = { checked: state.checked, notes: state.taskNotes, deferred: state.taskDeferred, history: loadHistory(), weekKey: getWeekKey(), exported: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `study-plan-${getWeekKey()}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importData(render, showToast) {
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

export function exportCalendar(showToast) {
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//StudyPlan//EN\r\nCALSCALE:GREGORIAN\r\n';
  const now = nowInTZ();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const monday = new Date(now); monday.setDate(monday.getDate() - dow);
  DAYS.forEach((dayName, di) => {
    (schedule[dayName]?.sections || []).forEach(s => (s.items || []).forEach(item => {
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

export function exportSchedule(showToast) {
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

export function importSchedule(render, showToast) {
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
        if (data.schedule && typeof data.schedule === 'object') {
          replaceSchedule(data.schedule, { persist: true });
        }
        if (data.dayConfig && typeof data.dayConfig === 'object') {
          for (const day of Object.keys(dayConfig)) {
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

export function resetDefaultSchedule(render, showToast, showConfirm) {
  showConfirm('Reset the schedule structure to the built-in default? Progress for matching task IDs is kept.', () => {
    resetScheduleToDefault();
    state.selectedDay = Math.min(state.selectedDay, DAYS.length - 1);
    state.showDayManager = false;
    render();
    showToast('Default schedule restored');
  });
}

export function newSemester(render, showToast, showConfirm) {
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

export function shareProgress(showToast) {
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

export function pruneOldData() {
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

export function checkStorageQuota(showToast) {
  if (Storage.checkQuota()) {
    setTimeout(() => showToast('Storage nearly full \u2014 export your data'), 1000);
  }
}

export function carryOverDeferrals(showToast) {
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

export function migrateProgress(showToast) {
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



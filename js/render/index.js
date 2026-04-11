// ════════════════════════════════════════
// ── Main Render Orchestrator ──
// ════════════════════════════════════════

import { CONFIG } from '../config.js';
import { Storage } from '../storage.js';
import { CategoryRegistry } from '../categories.js';
import { DAYS, SHORT, schedule, buildOverviewData, DEFAULT_OVERVIEW, findItemById, getDayLabel, getShortLabel, getActiveDays, dayConfig } from '../schedule.js';
import {
  state, getStatus, getEstimate, formatEst, escapeHtml, nowInTZ,
  getWeekKey, getWeekNum, getDayProgress, getWeeklyProgress, invalidateProgressCache,
  getCommuteInfo, getDaysUntil, getSkipDebt, getSubjectStreaks, getCurrentSectionIndex,
  getHeatmapData, generateWeeklySummary, getPomoLog, getPastWeekData,
  loadHistory, loadScratchpad, saveScratchpad, todayIdx, isDayLocked,
  STATUS_DONE, STATUS_SKIP, STATUS_PROGRESS, STATUS_BLOCKED, READING_LIST_DEFAULT,
  saveReadingList,
} from '../state.js';
import { getSyncConfig, updateSyncDot } from '../sync.js';
import { currentTheme } from '../ui/theme.js';
import { renderItem } from './task-item.js';
import { renderMealCard } from './meals.js';
import { ensurePomoBar } from '../ui/timer.js';
import { showToast, updateProgressBars } from '../ui/toggle.js';

// ── Render batching ──
let _renderQueued = false;

export function render() {
  if (_renderQueued) return;
  _renderQueued = true;
  requestAnimationFrame(doRender);
}

export function renderImmediate() { doRender(); }

// ── Shared error box for inline render failures ──
function _errBox(context, err) {
  console.error(`[render] ${context} failed:`, err);
  return `<div style="padding:10px 12px;margin:4px 0;font-size:11px;color:#e94560;background:#1a0808;border:1px solid #e9456033;border-radius:8px">
    \u26a0\ufe0f <strong>${escapeHtml(context)}</strong> failed to render &mdash;
    <code style="font-size:9px;font-family:monospace">${escapeHtml(String(err).slice(0, 120))}</code>
  </div>`;
}

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
          <button onclick="location.reload()" style="font-family:inherit;font-size:13px;font-weight:600;padding:10px 28px;background:var(--accent);color:#09090b;border:none;border-radius:8px;cursor:pointer">
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

  const dayName = DAYS[state.selectedDay];
  const day = schedule[dayName];
  const prog = getDayProgress(dayName);
  const wp = getWeeklyProgress();
  const isToday = state.selectedDay === todayIdx;
  const currentSectionIdx = isToday ? getCurrentSectionIndex(day.sections) : -1;

  let html = '';

  // Header
  const themeIcon = currentTheme === 'dark' ? '\u2600\ufe0f' : '\ud83c\udf19';
  const hasSyncConfig = !!(CONFIG.firebase || getSyncConfig());
  html += `
    <div class="header">
      <div class="header-sub">${CONFIG.semester}</div>
      <h1>${CONFIG.appTitle} <span id="sync-dot" class="sync-dot ${hasSyncConfig ? state.syncStatus : 'hidden'}"
          title="${state.syncStatus === 'connected' ? 'Synced' : state.syncStatus === 'syncing' ? 'Syncing' : 'Offline'}"></span>
        <button class="theme-toggle" data-action="toggleTheme" title="Toggle light/dark mode">${themeIcon}</button>
        <button class="fontsize-btn" data-action="toggleFontSize" title="Toggle font size">${state.fontScale === 'large' ? 'A\u2193' : 'A\u2191'}</button>
        <button class="fontsize-btn" data-action="toggleShortcuts" title="Keyboard shortcuts" style="font-size:11px">?</button>
      </h1>
      <div class="header-tag">${CONFIG.headerTag}</div>
    </div>`;

  // Weekly progress
  html += `
    <div class="weekly-progress">
      <span class="weekly-label">Week ${getWeekNum()}</span>
      <div class="weekly-bar"><div class="weekly-bar-fill" style="width:${wp.pct}%"></div></div>
      <span class="weekly-val" id="week-val">${wp.done}/${wp.total} \u00b7 ${wp.pct}%${wp.estRemain > 0 ? `<span class="est-remaining"> \u00b7 ~${formatEst(wp.estRemain)} left</span>` : ''}</span>
    </div>`;

  // Day progress
  html += `
    <div class="progress-wrap">
      <div class="progress-bar"><div class="progress-fill" style="width:${prog.pct}%"></div></div>
      <div class="progress-text">
        <span id="task-count">${prog.done}/${prog.total} tasks${prog.estRemain > 0 ? `<span class="est-remaining"> \u00b7 ~${formatEst(prog.estRemain)} left</span>` : ''}</span>
        <span id="task-pct">${prog.pct}%</span>
      </div>
    </div>`;

  // Search bar
  html += `<div class="search-bar">
    <span class="search-icon">\ud83d\udd0d</span>
    <input class="search-input" id="search-input" type="text" placeholder="Search tasks\u2026"
           value="${escapeHtml(state.searchQuery)}" oninput="setSearch(this.value)" onfocus="this.select()">
    ${state.searchQuery ? '<button class="search-clear" data-action="clearSearch">\u2715</button>' : ''}
  </div>`;

  // View toggle + focus mode
  html += `<div class="view-toggle">
    <button class="view-btn ${state.viewMode === 'day' ? 'active' : ''}" data-action="setViewMode" data-mode="day">Day</button>
    <button class="view-btn ${state.viewMode === 'week' ? 'active' : ''}" data-action="setViewMode" data-mode="week">Week</button>
    <button class="focus-toggle ${state.focusMode ? 'active' : ''}" data-action="toggleFocusMode" title="Hide completed tasks">\ud83c\udfaf Focus</button>
  </div>`;

  // Tabs (day view only)
  if (state.viewMode === 'day') {
    html += `<div class="tabs" role="tablist" aria-label="Days of the week">`;
    DAYS.forEach((d, i) => {
      if (!dayConfig[d]?.active) return; // skip inactive days
      const p = getDayProgress(d);
      const cls = [i === state.selectedDay ? 'active' : '', i === todayIdx ? 'today' : ''].filter(Boolean).join(' ');
      html += `<button class="tab ${cls}" role="tab" aria-selected="${i === state.selectedDay}" data-action="selectDay" data-i="${i}" oncontextmenu="showTabCtxMenu(${i},event)">
        ${getShortLabel(d, i)}<div class="tab-progress" style="width:${p.pct}%"></div>
      </button>`;
    });
    html += `</div>`;
  }

  // ── Week view ──
  if (state.viewMode === 'week') {
    html += renderWeekView();
  }

  // ── Day view ──
  if (state.viewMode === 'day') {
    html += renderDayView(dayName, day, prog, isToday, currentSectionIdx);
  }

  // ── Panels ──
  html += renderPanels(dayName, day, wp);

  // Reset
  if (state.viewMode === 'day') {
    html += `<div class="reset-wrap"><button class="reset-btn" data-action="resetDay">Reset ${escapeHtml(getDayLabel(dayName))}</button></div>`;
  }

  const appEl = document.getElementById('app');
  appEl.className = 'app' + (state.fontScale === 'large' ? ' font-large' : '');
  appEl.innerHTML = html;

  // FAB
  renderFAB();

  // Scratchpad
  renderScratchpad();

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

// ── Week View ──
function renderWeekView() {
  try { return _renderWeekViewInner(); }
  catch (err) { return _errBox('Week view', err); }
}
function _renderWeekViewInner() {
  let html = `<div class="week-view">`;
  DAYS.forEach((wDayName, di) => {
    if (!dayConfig[wDayName]?.active) return; // skip inactive days
    const wDay = schedule[wDayName];
    const wProg = getDayProgress(wDayName);
    const wIsToday = di === todayIdx;
    const wCollapsed = state.weekViewCollapsed[di];
    const wLabel = getDayLabel(wDayName);
    html += `<div class="week-day-block">
      <div class="week-day-header" data-action="toggleWeekDayCollapse" data-i="${di}">
        <div>
          <span class="week-day-name ${wIsToday ? 'is-today' : ''}">${escapeHtml(wLabel)}${wIsToday ? ' \u2022 today' : ''}</span>
          <span class="week-day-meta">${wDay.wake}${wDay.leave ? ' \u2192 ' + wDay.leave : ' \u2022 home'}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <div class="week-day-progress"><span class="pct">${wProg.pct}%</span> ${wProg.done}/${wProg.total}</div>
          <span class="week-day-collapse-arrow ${wCollapsed ? '' : 'open'}">\u25bc</span>
        </div>
      </div>
      <div class="week-day-tasks ${wCollapsed ? 'collapsed' : ''}">`;
    wDay.sections.forEach(section => {
      html += `<div class="week-section-label">${section.label}</div>`;
      section.items.forEach(item => {
        const st = getStatus(item.id);
        const isDeferred = state.taskDeferred[item.id] && state.taskDeferred[item.id] !== wDayName;
        if (isDeferred) return;
        if (state.focusMode && (st === STATUS_DONE || st === STATUS_SKIP)) return;
        if (state.searchQuery && !item.text.toLowerCase().includes(state.searchQuery) && !(item.hint && item.hint.toLowerCase().includes(state.searchQuery))) return;
        let cls = 'week-task';
        if (st === STATUS_DONE) cls += ' done';
        else if (st === STATUS_SKIP) cls += ' skip';
        else if (st === STATUS_PROGRESS) cls += ' progress';
        else if (st === STATUS_BLOCKED) cls += ' blocked';
        if (state.activeFilter && item.cat !== state.activeFilter) cls += ' filtered-out';
        const checkIcon = st === STATUS_DONE ? '\u2713' : st === STATUS_SKIP ? '\u2716' : st === STATUS_PROGRESS ? '\u25b6' : '';
        const stLabel = st === STATUS_DONE ? 'done' : st === STATUS_SKIP ? 'skipped' : st === STATUS_PROGRESS ? 'in progress' : 'not started';
        const catLabel = CategoryRegistry.getLabel(item.cat);
        html += `<div class="${cls}" data-task-id="${item.id}" data-action="toggle" data-id="${item.id}" role="checkbox" tabindex="0" aria-checked="${st === STATUS_DONE}" aria-label="${escapeHtml(item.text)} \u2014 ${stLabel}"
                 onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">`;
          <div class="week-task-check">${checkIcon}</div>
          <div class="week-task-text">${escapeHtml(item.text)}</div>
          ${catLabel ? `<div class="week-task-cat">${catLabel}</div>` : ''}
        </div>`;
      });
    });
    // Deferred-in tasks
    Object.entries(state.taskDeferred).forEach(([id, target]) => {
      if (target !== wDayName) return;
      const item = findItemById(id);
      if (!item) return;
      const st = getStatus(item.id);
      let cls = 'week-task';
      if (st === STATUS_DONE) cls += ' done';
      else if (st === STATUS_SKIP) cls += ' skip';
      else if (st === STATUS_PROGRESS) cls += ' progress';
      const checkIcon = st === STATUS_DONE ? '\u2713' : st === STATUS_SKIP ? '\u2716' : st === STATUS_PROGRESS ? '\u25b6' : '';
      html += `<div class="${cls}" data-task-id="${item.id}" data-action="toggle" data-id="${item.id}" style="border-left:2px solid var(--accent)">
        <div class="week-task-check">${checkIcon}</div>
        <div class="week-task-text">\u2192 ${escapeHtml(item.text)}</div>
      </div>`;
    });
    html += `</div>
      <div style="padding:4px 10px 6px;text-align:center">
        <button class="cat-filter-btn haptic-press" data-action="selectDay" data-i="${di}" style="font-size:10px">Open day \u2192</button>
      </div>
    </div>`;
  });
  html += `</div>`;
  return html;
}

// ── Day View ──
function renderDayView(dayName, day, prog, isToday, currentSectionIdx) {
  try { return _renderDayViewInner(dayName, day, prog, isToday, currentSectionIdx); }
  catch (err) { return _errBox(`Day view (${dayName})`, err); }
}
function _renderDayViewInner(dayName, day, prog, isToday, currentSectionIdx) {
  let html = '';
  const dayLocked = isDayLocked(dayName);

  // Day header
  const leaveHtml = day.leave ? `<span>Leave <span class="val">${day.leave}</span></span>` : `<span class="home">Home day</span>`;
  const metaHtml = day.meta ? `<span class="flag">\u2691 ${day.meta}</span>` : '';
  html += `
    <div class="day-header">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="day-name">${escapeHtml(getDayLabel(dayName))}${isToday ? ' <span style="font-size:12px;color:var(--accent);font-weight:400">today</span>' : ''}</div>
        <button class="lock-btn ${dayLocked ? 'locked' : ''}" data-action="toggleLock" data-day="${dayName}">${dayLocked ? '\ud83d\udd12 Locked' : '\ud83d\udd13 Lock'}</button>
      </div>
      <div class="day-meta">
        <span>Wake <span class="val">${day.wake}</span></span>
        ${leaveHtml} ${metaHtml}
      </div>
    </div>`;

  // Commute countdown
  const commute = getCommuteInfo();
  if (commute && commute.mins !== null) {
    const cCls = commute.mins <= 10 ? 'red' : commute.mins <= 30 ? 'orange' : 'green';
    html += `<div class="commute-banner ${cCls}">
      <span class="commute-icon">\ud83d\udeb6</span>
      <span>${commute.label} <span class="commute-time">${commute.mins} min</span> (at ${commute.time})</span>
    </div>`;
  }

  // Deadline countdown card
  const activeDeadlines = state.deadlines.filter(d => getDaysUntil(d.date) >= 0).slice(0, 5);
  if (activeDeadlines.length > 0) {
    html += `<div class="deadline-card"><div class="deadline-card-title">\ud83d\udcc5 Upcoming Deadlines</div>`;
    activeDeadlines.forEach((dl) => {
      const days = getDaysUntil(dl.date);
      const cls = days <= 3 ? 'urgent' : days <= 7 ? 'soon' : 'ok';
      const label = days === 0 ? 'TODAY' : days === 1 ? 'Tomorrow' : `${days} days`;
      html += `<div class="deadline-item">
        <span class="deadline-name">${escapeHtml(dl.name)}</span>
        <span class="deadline-days ${cls}">${label}</span>
      </div>`;
    });
    html += `</div>`;
  }

  // Meal card
  html += renderMealCard(dayName, state.selectedDay);

  // Skipped tasks banner
  const skippedItems = [];
  day.sections.forEach(s => s.items.forEach(item => {
    if (state.taskDeferred[item.id] && state.taskDeferred[item.id] !== dayName) return;
    if (getStatus(item.id) === STATUS_SKIP) skippedItems.push(item);
  }));
  if (skippedItems.length > 0) {
    html += `<div class="skipped-banner">
      <div class="skipped-banner-header">\u23ed Skipped <span class="skipped-banner-count">${skippedItems.length}</span></div>
      <div class="skipped-banner-list">`;
    skippedItems.forEach(item => {
      const catLabel = CategoryRegistry.getLabel(item.cat);
      html += `<div class="skipped-banner-item">${escapeHtml(item.text)}${catLabel ? `<span class="sbi-cat">${catLabel}</span>` : ''}</div>`;
    });
    html += `</div></div>`;
  }

  // Deferred tasks coming INTO this day
  const deferredIn = [];
  Object.entries(state.taskDeferred).forEach(([id, target]) => {
    if (target === dayName) {
      const item = findItemById(id);
      if (item) {
        // Find original day
        for (const dName of DAYS) {
          for (const sec of schedule[dName].sections) {
            for (const it of sec.items) {
              if (it.id === id) deferredIn.push({ item, fromDay: dName });
            }
          }
        }
      }
    }
  });

  if (deferredIn.length > 0) {
    html += `<div class="deferred-section"><div class="deferred-label">\u2192 Deferred In <span class="deferred-badge">${deferredIn.length} task${deferredIn.length > 1 ? 's' : ''}</span></div><div class="items">`;
    deferredIn.forEach(({ item, fromDay }) => {
      html += renderItem(item, dayName, 'deferred-in-highlight', fromDay);
    });
    html += `</div></div>`;
  }

  // Day completion celebration
  if (prog.pct === 100 && prog.total > 0) {
    const confettiColors = ['#00d2ff', '#00e676', '#ffab00', '#b44aff', '#e94560', '#ff6d00'];
    const confettiShapes = ['50%', '2px', '0'];
    let confettiHtml = '';
    for (let c = 0; c < 30; c++) {
      const color = confettiColors[c % confettiColors.length];
      const left = 30 + Math.random() * 40;
      const top = 30 + Math.random() * 20;
      const delay = Math.random() * 0.5;
      const size = 4 + Math.random() * 5;
      const angle = (Math.random() * 360) * Math.PI / 180;
      const dist = 40 + Math.random() * 80;
      const sprayX = Math.cos(angle) * dist;
      const sprayY = Math.sin(angle) * dist - 30;
      const shape = confettiShapes[c % confettiShapes.length];
      confettiHtml += `<div class="confetti-particle" style="left:${left}%;top:${top}%;background:${color};width:${size}px;height:${size * (0.5 + Math.random())}px;border-radius:${shape};--spray-x:${sprayX}px;--spray-y:${sprayY}px;animation-delay:${delay}s"></div>`;
    }
    html += `<div class="day-complete-banner">
      ${confettiHtml}
      <div class="day-complete-text">\u2728 ${dayName} Complete!</div>
      <div class="day-complete-sub">All ${prog.total} tasks done. You crushed it.</div>
    </div>`;
  }

  // Skip debt warning
  const skipDebt = getSkipDebt();
  const debtEntries = Object.entries(skipDebt).filter(([, c]) => c >= 2);
  if (debtEntries.length > 0) {
    html += `<div class="skip-debt-banner">
      <div class="skip-debt-header">\u26a0 Skip Debt</div>`;
    debtEntries.forEach(([label, count]) => {
      html += `<div class="skip-debt-item"><span>${label}</span><span class="skip-debt-count">${count} skipped</span></div>`;
    });
    html += `</div>`;
  }

  // Category filter bar
  const usedCats = new Set();
  day.sections.forEach(s => s.items.forEach(item => {
    if (item.cat && item.cat !== 'routine' && item.cat !== 'reflect') usedCats.add(item.cat);
  }));
  if (usedCats.size > 1) {
    html += `<div class="cat-filter-bar">
      <button class="cat-filter-btn haptic-press ${!state.activeFilter ? 'active' : ''}" data-action="toggleCatFilter"
              style="${!state.activeFilter ? 'background:var(--text-bright);color:var(--bg);border-color:transparent;font-weight:600' : ''}">All</button>`;
    usedCats.forEach(cat => {
      const c = CategoryRegistry.getColor(cat);
      const label = CategoryRegistry.getLabel(cat) || cat;
      const isActive = state.activeFilter === cat;
      html += `<button class="cat-filter-btn haptic-press ${isActive ? 'active' : ''}" data-action="toggleCatFilter" data-cat="${cat}"
              style="${isActive ? `background:${c.border}22;color:${c.border};border-color:${c.border}` : `color:${c.border}`}">${label}</button>`;
    });
    html += `</div>`;
  }

  // Sections
  const transClass = state.lastDayDirection === 'left' ? 'day-transition-left' : state.lastDayDirection === 'right' ? 'day-transition-right' : '';
  html += `<div class="sections ${dayLocked ? 'day-locked-overlay' : ''} ${transClass}" role="list" aria-label="Tasks for ${dayName}">`;
  day.sections.forEach((section, sIdx) => {
    let sClass = 'section-group';
    if (isToday) {
      if (sIdx < currentSectionIdx) sClass += ' section-past';
      else if (sIdx === currentSectionIdx) sClass += ' section-current';
    }
    const sectionAllDone = section.items.every(item => {
      if (state.taskDeferred[item.id] && state.taskDeferred[item.id] !== dayName) return true;
      const st = getStatus(item.id);
      return st === STATUS_DONE || st === STATUS_SKIP;
    });
    html += `<div class="${sClass}"><div class="section-label">${section.label}`;
    if (!dayLocked && !sectionAllDone) {
      html += `<button class="section-done-btn haptic-press" data-action="markSectionDone" data-day="${dayName}" data-i="${sIdx}">\u2713 All done</button>`;
    } else if (sectionAllDone && section.items.length > 0) {
      html += `<span style="font-size:9px;color:var(--accent);margin-left:6px;letter-spacing:0">\u2713</span>`;
    }
    html += `</div><div class="items">`;
    section.items.forEach(item => {
      html += renderItem(item, dayName);
    });
    html += `</div></div>`;
  });
  html += `</div>`;
  state.lastDayDirection = null;

  return html;
}

// ── Panels ──
function renderPanels(dayName, day, wp) {
  try { return _renderPanelsInner(dayName, day, wp); }
  catch (err) { return _errBox('Panels', err); }
}
function _renderPanelsInner(dayName, day, wp) {
  let html = '';

  function lazyPanel(id, title, titleStyle, contentFn) {
    const isOpen = state.openPanels[id];
    html += `<div class="panel">
      <div class="panel-header ${isOpen ? 'open' : ''}" data-panel-id="${id}" data-action="togglePanel" data-panel="${id}"
           role="button" aria-expanded="${!!isOpen}" aria-controls="panel-${id}" tabindex="0">
        <div class="panel-title"${titleStyle ? ` style="${titleStyle}"` : ''}>${title}</div><div class="panel-arrow">\u25bc</div>
      </div>
      <div class="panel-content ${isOpen ? 'open' : ''}" id="panel-${id}">`;
    if (isOpen) {
      try {
        contentFn();
      } catch (err) {
        console.error(`[render] Panel "${id}" failed:`, err);
        html += `<div style="padding:10px 12px;font-size:11px;color:#e94560;background:#1a0808;border-radius:6px">
          \u26a0\ufe0f Panel failed to render &mdash; <code style="font-size:9px;font-family:monospace">${escapeHtml(String(err).slice(0, 120))}</code>
        </div>`;
      }
    }
    html += `</div></div>`;
  }

  // Weekly overview
  const overviewData = buildOverviewData();
  lazyPanel('overview', 'Weekly Pattern', '', () => {
    overviewData.forEach(row => {
      html += `<div class="overview-row">
        <div class="overview-day" style="color:${row.color}">${row.day}</div>
        <div class="overview-tag" style="background:${row.color}15;color:${row.color};border:1px solid ${row.color}30">${row.tag}</div>
        <div class="overview-desc">${row.desc}</div>
      </div>`;
    });
  });

  // FA Engine
  lazyPanel('fa', 'FA Weekly Engine', '', () => {
    html += `<div style="font-size:12px;color:#71717a;line-height:1.8">
      <span style="color:#ff9100;font-weight:600">Thu</span> Meeting \u2192 feedback + follow-up questions<br>
      <span style="color:#ffab00;font-weight:600">Thu\u2013Fri</span> Start follow-ups while conversation is fresh<br>
      <span style="color:#00d2ff;font-weight:600">Sat\u2013Sun</span> Bulk deep work (fueled by Thu feedback)<br>
      <span style="color:#b44aff;font-weight:600">Mon\u2013Tue</span> Continue exercises, build intuition arguments<br>
      <span style="color:#00e676;font-weight:600">Wed</span> Polish & prep material to present Thursday
    </div>`;
  });

  // How it works
  lazyPanel('how', 'How this works', '', () => {
    html += `<div class="info" style="background:#0a1628;border:1px solid rgba(0,210,255,0.13);color:#8899aa">
      <p><strong>No fixed times except class, wake & FA meeting.</strong> Work through tasks in order. Finish early? Take the slack.</p>
      <p><strong>Every course block = homework.</strong> The schedule routes hw to optimal days based on lecture timing.</p>
      <p><strong>Analysis IV has the only external check.</strong> Mon lecture \u2192 Mon/Tue hw \u2192 Wed office hours. Other courses: hw + check with AI.</p>
    </div>`;
  });

  // Cut order
  lazyPanel('cut', 'Bad day? Cut order', 'color:#e94560', () => {
    html += `<div class="info" style="background:#1a0a0a;border:1px solid rgba(233,69,96,0.13);color:#aa8888">
      <p>1. Next-day previews</p><p>2. Physics II / Comp Math hw</p><p>3. Number Theory II hw</p><p>4. Algebra II hw</p>
      <p style="color:#aabbcc">\u2014 protected below \u2014</p>
      <p style="color:#aabbcc">5. Analysis IV hw (office hours deadline)</p>
      <p style="color:#aabbcc">6. FA blocks (whole week \u2192 Thursday)</p>
    </div>`;
  });

  // Reading list
  lazyPanel('readinglist', `Reading List (${state.readingList.length} books)`, 'color:#cf7aff', () => {
    html += `<div class="data-controls" style="margin-bottom:10px">
      <button class="data-btn" data-action="syncGoodreads" style="color:#cf7aff;border-color:#cf7aff33">
        ${state.readingSyncStatus === 'syncing' ? 'Syncing\u2026' : '\ud83d\udd04 Sync RSS'}
      </button>
      <button class="data-btn" data-action="readingToggleCSV" style="color:#b44aff;border-color:#b44aff33">
        \ud83d\udcc4 Import CSV
      </button>
      ${state.readingList.length > 0 ? '<button class="data-btn" data-action="readingResetList" style="color:#e94560;border-color:#e9456033">\u2715 Reset</button>' : ''}
    </div>`;
    if (state.readingLastSync) {
      const ago = Math.round((Date.now() - new Date(state.readingLastSync).getTime()) / 60000);
      const label = ago < 1 ? 'just now' : ago < 60 ? ago + 'm ago' : ago < 1440 ? Math.round(ago / 60) + 'h ago' : Math.round(ago / 1440) + 'd ago';
      html += `<div style="font-size:10px;color:var(--muted);margin-bottom:8px">Last sync: ${label}</div>`;
    }
    if (state.readingSyncStatus === 'ok') html += `<div class="meal-status ok" style="margin-bottom:8px">Synced successfully.</div>`;
    else if (state.readingSyncStatus === 'error') html += `<div class="meal-status err" style="margin-bottom:8px">RSS sync failed. Use CSV import to load all books.</div>`;
    else if (state.readingSyncStatus === 'syncing') html += `<div class="meal-status wait" style="margin-bottom:8px">Fetching from Goodreads RSS\u2026</div>`;
    if (state.readingShowCSV) {
      html += `<div style="margin-bottom:10px">
        <div style="margin-bottom:6px"><label class="data-btn" style="color:#cf7aff;border-color:#cf7aff33;cursor:pointer;display:inline-block">\ud83d\udcc1 Choose CSV file<input type="file" id="goodreads-file-input" accept=".csv" onchange="handleGoodreadsFile()" style="display:none"></label></div>
        <textarea class="meal-paste-area" id="goodreads-csv-input" placeholder="Or paste your Goodreads CSV export here."></textarea>
        <button class="data-btn" data-action="saveGoodreadsCSV" style="width:100%;color:#cf7aff;border-color:#cf7aff44;margin-top:4px">Parse & Save</button>
      </div>`;
    }
    html += `<div class="info" style="background:#1a0f1f;border:1px solid rgba(207,122,255,0.13);color:#bb99cc;font-size:12px;line-height:1.9;max-height:400px;overflow-y:auto">`;
    state.readingList.forEach((book, i) => {
      html += `<p style="margin:0;padding:2px 0">${i + 1}. <strong>${escapeHtml(book.title)}</strong> <span style="color:#71717a">\u2014 ${escapeHtml(book.author)}</span></p>`;
    });
    html += `</div>`;
  });

  // 3-week rhythm
  lazyPanel('rhythm', '3-week rhythm', 'color:#00e676', () => {
    html += `<div class="info" style="background:#0a1a18;border:1px solid rgba(0,230,118,0.13);color:#88aa99">
      <p><strong>Weeks 1\u20132:</strong> Every course block = homework only.</p>
      <p><strong>Week 3:</strong> Swap one session per course for a once-over of the last 3 weeks.</p>
    </div>`;
  });

  // Streak
  lazyPanel('streak', 'Weekly Streak', '', () => {
    const hist = loadHistory();
    const recentWeeks = Object.entries(hist).sort((a, b) => a[0].localeCompare(b[0])).slice(-8);
    if (recentWeeks.length > 0) {
      html += `<div class="past-week-nav">`;
      recentWeeks.forEach(([key, pct]) => {
        const isCurrent = key === getWeekKey();
        const isViewing = state.pastWeekViewing === key || (!state.pastWeekViewing && isCurrent);
        html += `<button class="past-week-btn ${isViewing ? 'active' : ''}" data-action="viewPastWeek" data-week="${key}">${key.replace(CONFIG.storagePrefix + '-', '')} (${pct}%)</button>`;
      });
      html += `</div>`;
      html += `<div class="streak-chart" style="margin-bottom:20px">`;
      recentWeeks.forEach(([key, pct]) => {
        const isCurrent = key === getWeekKey();
        html += `<div class="streak-bar${isCurrent ? ' current' : ''}" style="height:${Math.max(pct, 4)}%" title="${key}: ${pct}%">
          <div class="streak-bar-label">${key.replace(CONFIG.storagePrefix + '-', '')}</div>
        </div>`;
      });
      html += `</div>`;
      if (state.pastWeekViewing) {
        const pastData = getPastWeekData(state.pastWeekViewing);
        const pastEntries = Object.entries(pastData);
        if (pastEntries.length > 0) {
          html += `<div style="font-size:10px;color:var(--dim);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">${state.pastWeekViewing} Task States</div>`;
          html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">`;
          pastEntries.forEach(([id, status]) => {
            const color = status === STATUS_DONE ? 'var(--accent)' : status === STATUS_SKIP ? '#e94560' : status === STATUS_PROGRESS ? '#ffab00' : 'var(--dim)';
            html += `<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:${color}18;color:${color};border:1px solid ${color}30">${id}: ${status === true ? STATUS_DONE : status}</span>`;
          });
          html += `</div>`;
        } else {
          html += `<div style="font-size:11px;color:var(--dim)">No data found for this week.</div>`;
        }
      }
    } else {
      html += `<div class="streak-empty">Complete tasks to start tracking your streak.</div>`;
    }
    const subjectStreaks = getSubjectStreaks();
    const streakEntries = Object.entries(subjectStreaks);
    if (streakEntries.length > 0) {
      html += `<div style="font-size:10px;color:var(--dim);margin:14px 0 6px;text-transform:uppercase;letter-spacing:1px">Subject Progress</div>`;
      html += `<div class="subject-streaks">`;
      streakEntries.sort((a, b) => (b[1].done / b[1].total) - (a[1].done / a[1].total)).forEach(([cat, data]) => {
        const c = CategoryRegistry.getColor(cat);
        const label = CategoryRegistry.getLabel(cat) || cat;
        const pct = data.total ? Math.round((data.done / data.total) * 100) : 0;
        html += `<div class="subject-streak-card" style="border-color:${c.border}22">
          <div class="subject-streak-label" style="color:${c.border}">${label}</div>
          <div class="subject-streak-bar"><div class="subject-streak-fill" style="width:${pct}%;background:${c.border}"></div></div>
          <div class="subject-streak-val">${data.done}/${data.total} \u00b7 ${pct}%</div>
        </div>`;
      });
      html += `</div>`;
    }
  });

  // Sync panel
  const hasSyncConfig = !!(CONFIG.firebase || getSyncConfig());
  lazyPanel('sync', `Sync ${hasSyncConfig && state.firebaseReady ? '<span style="color:#00e676;font-size:9px;margin-left:6px">\u25cf connected</span>' : ''}`, '', () => {
    if (hasSyncConfig && state.firebaseReady) {
      html += `<div style="font-size:11px;color:#00e676;margin-bottom:10px">Syncing across all your devices.</div>
        <button class="data-btn" data-action="disconnectSync" style="width:100%;color:#e94560;border-color:#e9456033">Disconnect Sync</button>`;
    } else if (hasSyncConfig && !state.firebaseReady) {
      html += `<div style="font-size:11px;color:#ffab00;margin-bottom:10px">Connecting\u2026</div>
        <button class="data-btn" data-action="disconnectSync" style="width:100%">Disconnect</button>`;
    } else {
      html += `<div class="sync-info">Paste your Firebase config and set a password to sync across devices.</div>
        <textarea class="sync-input" id="sync-config-input" placeholder='Paste firebaseConfig here'></textarea>
        <input class="sync-input" id="sync-email" type="email" placeholder="Email" style="min-height:auto;resize:none;margin-bottom:4px">
        <input class="sync-input" id="sync-password" type="password" placeholder="Password (min 6 chars)" style="min-height:auto;resize:none;margin-bottom:8px">
        <button class="data-btn" data-action="connectSync" style="width:100%;color:var(--accent);border-color:#00d2ff44">Connect Sync</button>
        <div id="sync-msg" class="sync-msg"></div>`;
    }
  });

  // Schedule editor
  lazyPanel('editor', 'Edit Schedule', '', () => {

    // ── Day manager toggle ──
    html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="font-size:10px;color:var(--dim)">Editing <strong style="color:var(--text)">${escapeHtml(getDayLabel(dayName))}</strong></div>
      <button class="cat-row-btn" data-action="toggleDayManager" style="${state.showDayManager ? 'color:var(--accent);border-color:var(--accent)44' : ''}">
        \ud83d\uddd3\ufe0f ${state.showDayManager ? 'Hide' : 'Manage'} Days
      </button>
    </div>`;

    // ── Day manager panel ──
    if (state.showDayManager) {
      html += `<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:14px">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:8px;font-weight:600">Active Days & Labels</div>`;
      DAYS.forEach((d, di) => {
        const cfg = dayConfig[d];
        const isRenamingDay = state.renamingDayName === d;
        const label = getDayLabel(d);
        html += `<div class="cat-list-row" style="margin-bottom:5px">
          <input type="checkbox" ${cfg.active ? 'checked' : ''}
                 onchange="event.stopPropagation()"
                 data-action="toggleDayActive" data-day="${d}" style="cursor:pointer;flex-shrink:0">
          ${isRenamingDay
            ? `<input class="editor-input" id="day-rename-${d}" type="text" value="${escapeHtml(label)}" placeholder="${d}..."
                      style="flex:1;min-width:0" onclick="event.stopPropagation()"
                      onkeydown="if(event.key==='Enter'){event.preventDefault();document.querySelector('[data-action=saveDayAlias][data-day=\\'${d}\\']')?.click()}if(event.key==='Escape'){document.querySelector('[data-action=cancelDayRename]')?.click()}">`
            : `<span class="cat-row-key" style="flex:1">${escapeHtml(label)}${cfg.alias ? ` <span style="color:var(--dim);font-size:9px">(${d})</span>` : ''}</span>`
          }
          ${isRenamingDay
            ? `<button class="editor-add-btn" data-action="saveDayAlias" data-day="${d}">Save</button>
               <button class="cat-row-btn" data-action="cancelDayRename">✕</button>`
            : `<button class="cat-row-btn" data-action="startDayRename" data-day="${d}" title="Set display name">✏️</button>
               ${cfg.alias ? `<button class="cat-row-btn danger" data-action="clearDayAlias" data-day="${d}" title="Reset to default">↩</button>` : ''}`
          }
        </div>`;
      });
      html += `</div>`;
    }

    // ── Section list for selected day ──
    day.sections.forEach((section, sIdx) => {
      const isRenaming = state.renamingSectionIdx &&
                         state.renamingSectionIdx.day === dayName &&
                         state.renamingSectionIdx.idx === sIdx;
      const canDelete = day.sections.length > 1;
      const isFirst = sIdx === 0;
      const isLast  = sIdx === day.sections.length - 1;
      html += `<div class="editor-section">`;
      if (isRenaming) {
        html += `<div class="editor-section-rename-row">
          <input class="editor-input" id="editor-section-rename-${sIdx}" type="text" value="${escapeHtml(section.label)}" placeholder="Section name..."
                 onkeydown="if(event.key==='Enter'){event.preventDefault();document.querySelector('[data-action=renameSectionSave][data-i=\\'${sIdx}\\']')?.click()}if(event.key==='Escape'){document.querySelector('[data-action=renameSectionCancel]')?.click()}" onclick="event.stopPropagation()">
          <button class="editor-add-btn" data-action="renameSectionSave" data-day="${dayName}" data-i="${sIdx}">Save</button>
          <button class="cat-row-btn" data-action="renameSectionCancel">Cancel</button>
        </div>`;
      } else {
        html += `<div class="editor-section-header">
          <span class="editor-section-label">${escapeHtml(section.label)}</span>
          <span class="editor-section-actions">
            <button class="cat-row-btn" data-action="moveSectionUp"   data-day="${dayName}" data-i="${sIdx}" title="Move section up"   ${isFirst ? 'disabled style="opacity:.3"' : ''}>\u2191</button>
            <button class="cat-row-btn" data-action="moveSectionDown" data-day="${dayName}" data-i="${sIdx}" title="Move section down" ${isLast  ? 'disabled style="opacity:.3"' : ''}>\u2193</button>
            <button class="cat-row-btn" data-action="renameSectionStart" data-day="${dayName}" data-i="${sIdx}" title="Rename">\u270f\ufe0f</button>
            ${canDelete ? `<button class="cat-row-btn danger" data-action="removeSectionFromDay" data-day="${dayName}" data-i="${sIdx}" title="${section.items.length ? 'Delete section + ' + section.items.length + ' task(s)' : 'Delete empty section'}">\u2715</button>` : ''}
          </span>
        </div>`;
      }
      section.items.forEach((item, iIdx) => {
        const isFirstItem = iIdx === 0;
        const isLastItem  = iIdx === section.items.length - 1;
        html += `<div class="editor-item">
          <span class="editor-item-reorder">
            <button class="editor-reorder-btn" data-action="moveTaskUp"   data-day="${dayName}" data-i="${sIdx}" data-j="${iIdx}" ${isFirstItem ? 'disabled' : ''}>\u2191</button>
            <button class="editor-reorder-btn" data-action="moveTaskDown" data-day="${dayName}" data-i="${sIdx}" data-j="${iIdx}" ${isLastItem  ? 'disabled' : ''}>\u2193</button>
          </span>
          <span class="editor-item-text">${escapeHtml(item.text)}</span>
          <span class="editor-item-cat">${CategoryRegistry.getLabel(item.cat) || item.cat}</span>
          <button class="editor-remove-btn" data-action="removeTaskFromSchedule" data-day="${dayName}" data-i="${sIdx}" data-j="${iIdx}" title="Remove">\u2715</button>
        </div>`;
      });
      html += `<div class="editor-add-row">
        <input class="editor-input" id="editor-text-${sIdx}" type="text" placeholder="Task text...">
        <select class="editor-select" id="editor-cat-${sIdx}">`;
      CategoryRegistry.keys().forEach(k => {
        html += `<option value="${k}">${CategoryRegistry.getLabel(k) || k}</option>`;
      });
      html += `</select>
        <button class="editor-add-btn" data-action="addTaskToSection" data-day="${dayName}" data-i="${sIdx}">+ Add</button>
      </div></div>`;
    });

    // ── Add section ──
    if (state.addingSectionDay === dayName) {
      html += `<div class="editor-section" style="border-color:var(--accent)44">
        <div class="editor-section-rename-row">
          <input class="editor-input" id="editor-new-section-label" type="text" placeholder="Section name (e.g. Afternoon)..."
                 onkeydown="if(event.key==='Enter'){event.preventDefault();document.querySelector('[data-action=addSectionConfirm]')?.click()}if(event.key==='Escape'){document.querySelector('[data-action=addSectionCancel]')?.click()}" onclick="event.stopPropagation()">
          <button class="editor-add-btn" data-action="addSectionConfirm" data-day="${dayName}">\u2713 Add</button>
          <button class="cat-row-btn" data-action="addSectionCancel">Cancel</button>
        </div>
      </div>`;
    } else {
      html += `<button class="editor-add-btn" style="width:100%;margin-top:6px;color:var(--accent);border-color:var(--accent)44;background:none" data-action="addSectionStart" data-day="${dayName}">+ Add Section</button>`;
    }

    // ── Schedule export / import / new semester ──
    html += `<div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border)">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:8px;font-weight:600">Schedule File</div>
      <div class="data-controls">
        <button class="data-btn" data-action="exportSchedule" style="color:var(--accent);border-color:#00d2ff33">\u2193 Export</button>
        <button class="data-btn" data-action="importSchedule" style="color:var(--accent);border-color:#00d2ff33">\u2191 Import</button>
        <button class="data-btn" data-action="newSemester" style="color:#ff9100;border-color:#ff910033">\ud83c\udf93 New Semester</button>
      </div>
    </div>`;
  });

  // Meal panel
  const hasMealData = Object.keys(state.mealData).length > 0;
  lazyPanel('meal', `\ud83c\udf7d\ufe0f Yemekhane${hasMealData ? ' <span style="font-size:9px;color:#00e676">\u2022 ' + Object.keys(state.mealData).length + ' days</span>' : ''}`, 'color:#ff9100', () => {
    html += `<div style="font-size:10px;color:var(--dim);margin-bottom:10px">Istanbul \u00dc Yemekhane menu. Auto-fetch from SKS or paste manually.</div>
      <div class="data-controls" style="margin-bottom:10px">
        <button class="data-btn" data-action="fetchMeals" style="color:#ff9100;border-color:#ff910033">${state.mealFetchStatus === 'fetching' ? 'Fetching\u2026' : '\ud83d\udd04 Auto-fetch'}</button>
        <button class="data-btn" data-action="toggleMealPaste" style="color:#b44aff;border-color:#b44aff33">\u270f\ufe0f Paste menu</button>
        ${hasMealData ? '<button class="data-btn" data-action="clearMealData" style="color:#e94560;border-color:#e9456033">\u2715 Clear</button>' : ''}
      </div>`;
    if (state.mealFetchStatus === 'ok') html += `<div class="meal-status ok">Fetched and parsed successfully.</div>`;
    else if (state.mealFetchStatus === 'error') html += `<div class="meal-status err">Auto-fetch failed. Paste the menu below or try again.</div>`;
    else if (state.mealFetchStatus === 'fetching') html += `<div class="meal-status wait">Fetching from university API\u2026</div>`;
    if (state.mealShowPaste) {
      html += `<textarea class="meal-paste-area" id="meal-paste-input" placeholder="Paste the weekly menu here."></textarea>
        <button class="data-btn" data-action="savePastedMeals" style="width:100%;color:#ff9100;border-color:#ff910044;margin-top:4px">Parse & Save</button>`;
    }
    if (hasMealData) {
      const mealDates = Object.keys(state.mealData).sort();
      html += `<div style="margin-top:10px;font-size:10px;color:var(--dim);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">Stored (${mealDates.length} days)</div>`;
      mealDates.slice(-5).forEach(date => {
        const m = state.mealData[date];
        const items = [...(m.kahvalti || []), ...(m.ogle || []), ...(m.aksam || [])];
        html += `<div style="font-size:10px;color:var(--text);margin-bottom:4px"><span style="color:#ff9100;font-weight:600">${date}</span><span style="color:var(--dim)"> \u2014 ${items.slice(0, 3).join(', ')}${items.length > 3 ? '\u2026' : ''}</span></div>`;
      });
    }
  });

  // Data
  lazyPanel('data', 'Data', '', () => {
    html += `<div class="data-controls">
      <button class="data-btn" data-action="exportData">Export JSON</button>
      <button class="data-btn" data-action="importData">Import JSON</button>
      <button class="data-btn" data-action="exportCalendar" style="color:#b44aff;border-color:#b44aff33">\ud83d\udcc5 .ics</button>
      <button class="data-btn" data-action="shareProgress" style="color:#00e676;border-color:#00e67633">\ud83d\udce4 Share</button>
    </div>`;
  });

  // Deadlines
  lazyPanel('deadlines', '\ud83d\udcc5 Deadlines', 'color:#b44aff', () => {
    state.deadlines.forEach((dl, idx) => {
      const days = getDaysUntil(dl.date);
      const cls = days < 0 ? 'urgent' : days <= 3 ? 'urgent' : days <= 7 ? 'soon' : 'ok';
      const label = days < 0 ? `${-days}d ago` : days === 0 ? 'TODAY' : days === 1 ? 'Tomorrow' : `${days} days`;
      html += `<div class="deadline-item">
        <span class="deadline-name">${escapeHtml(dl.name)} <span style="font-size:9px;color:var(--dim)">${dl.date}</span></span>
        <span style="display:flex;align-items:center;gap:6px"><span class="deadline-days ${cls}">${label}</span><button class="editor-remove-btn" data-action="removeDeadline" data-i="${idx}">\u2715</button></span>
      </div>`;
    });
    if (state.showDeadlineForm) {
      html += `<div class="deadline-form">
        <input id="dl-name" placeholder="Name (e.g. Midterm)">
        <input id="dl-date" type="date">
        <select id="dl-cat">${CategoryRegistry.keys().map(k => `<option value="${k}">${CategoryRegistry.getLabel(k)||k}</option>`).join('')}</select>
        <button class="pomo-btn" data-action="addDeadline">Add</button>
      </div>`;
    } else {
      html += `<button class="deadline-add" data-action="showDeadlineForm">+ Add deadline</button>`;
    }
  });

  // Heatmap
  lazyPanel('heatmap', '\u23f1 Focus Timer & Heatmap', '', () => {
    html += `<div style="margin-bottom:12px"><div style="font-size:10px;color:var(--dim);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Session Duration</div><div style="display:flex;gap:4px;flex-wrap:wrap">`;
    [15, 25, 30, 45, 60, 90].forEach(m => {
      const active = state.focusTimerMin === m;
      html += `<button class="cat-filter-btn ${active ? 'active' : ''}" data-action="setFocusTimerMinAndRender" data-min="${m}" style="${active ? 'background:var(--accent);color:#09090b;border-color:var(--accent);font-weight:600' : ''}">${m}m</button>`;
    });
    html += `<input type="number" min="1" max="180" value="${state.focusTimerMin}" style="width:55px;font-family:inherit;font-size:11px;background:var(--bg);color:var(--text);border:1px solid var(--border2);border-radius:20px;padding:5px 8px;text-align:center" onchange="event.stopPropagation();setFocusTimerMin(this.value);_doRender()" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"></div></div>`;
    html += `<div style="font-size:10px;color:var(--dim);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Heatmap</div>`;
    const data = getHeatmapData();
    html += `<div class="heatmap-grid">`;
    data.forEach(d => {
      const lvl = d.mins <= 0 ? '' : d.mins < 30 ? 'l1' : d.mins < 60 ? 'l2' : d.mins < 120 ? 'l3' : 'l4';
      html += `<div class="heatmap-cell ${lvl}" title="${d.date}: ${d.mins}m"></div>`;
    });
    html += `</div>`;
    html += `<div class="heatmap-legend"><span>Less</span><div class="heatmap-cell"></div><div class="heatmap-cell l1"></div><div class="heatmap-cell l2"></div><div class="heatmap-cell l3"></div><div class="heatmap-cell l4"></div><span>More</span></div>`;
    html += `<div style="font-size:10px;color:var(--dim);margin-top:6px">Based on focus sessions. Start a timer on any task to log study time.</div>`;
  });

  // Weekly summary
  lazyPanel('summary', '\ud83d\udccb Weekly Summary', '', () => {
    const s = generateWeeklySummary();
    html += `<div class="summary-card">
      <div class="summary-stat"><span class="summary-label">Tasks completed</span><span class="summary-value">${s.wp.done}/${s.wp.total} (${s.wp.pct}%)</span></div>
      <div class="summary-stat"><span class="summary-label">Focus time</span><span class="summary-value">${formatEst(s.totalPomo) || '0m'}</span></div>
    </div>`;
    if (Object.keys(s.pomoWeek).length > 0) {
      html += `<div style="font-size:10px;color:var(--dim);margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Time by Subject</div>`;
      Object.entries(s.pomoWeek).sort((a,b) => b[1] - a[1]).forEach(([cat, min]) => {
        const c = CategoryRegistry.getColor(cat);
        const label = CategoryRegistry.getLabel(cat) || cat;
        html += `<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:${c.border}">${label}</span><span style="color:var(--text);font-weight:600">${formatEst(min)}</span></div>`;
      });
    }
    const debtEntries = Object.entries(s.skipDebt).filter(([,c]) => c >= 1);
    if (debtEntries.length > 0) {
      html += `<div style="font-size:10px;color:var(--dim);margin:8px 0 4px;text-transform:uppercase;letter-spacing:1px">Skip Debt</div>`;
      debtEntries.forEach(([label, count]) => {
        html += `<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#e94560">${label}</span><span style="font-weight:600;color:#e94560">${count}</span></div>`;
      });
    }
  });

  // Notifications
  lazyPanel('notifs', '\ud83d\udd14 Notifications', '', () => {
    html += `<div style="font-size:11px;color:var(--muted);margin-bottom:8px">Get reminders for classes and leave times.</div>`;
    if (state.notifEnabled) {
      html += `<div style="font-size:11px;color:#00e676;margin-bottom:6px">\u2713 Notifications enabled</div>`;
    } else {
      html += `<button class="data-btn" data-action="requestNotifPermission" style="width:100%;color:var(--accent);border-color:#00d2ff44">Enable Notifications</button>`;
    }
  });

  // Categories
  lazyPanel('categories', '\ud83c\udfa8 Categories', 'color:var(--muted)', () => {
    html += `<div style="display:flex;flex-direction:column;gap:6px">`;
    CategoryRegistry.keys().forEach(key => {
      const cat = CategoryRegistry.get(key);
      const isEditing = state.catEditKey === key;
      if (isEditing) {
        // Clamp bg to valid hex for color picker (fallback to dark if unusual value)
        const safeBg = /^#[0-9a-fA-F]{6}$/.test(cat.bg) ? cat.bg : '#1a1a1a';
        html += `<div class="cat-edit-row" style="border-color:${cat.border}55">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
            <div style="width:14px;height:14px;border-radius:4px;background:${cat.border};flex-shrink:0"></div>
            <span style="font-size:11px;font-weight:600;color:var(--text)">${escapeHtml(key)}</span>
          </div>
          <div class="settings-row"><label>Label (badge text)</label><input class="settings-input" id="cat-label-${key}" value="${escapeHtml(cat.label)}" placeholder="e.g. FA, HW, READ" maxlength="8" onclick="event.stopPropagation()"></div>
          <div style="display:flex;gap:8px">
            <div class="settings-row" style="flex:1"><label>Accent / border color</label><input class="settings-input" type="color" id="cat-border-${key}" value="${cat.border}" onclick="event.stopPropagation()"></div>
            <div class="settings-row" style="flex:1"><label>Background color</label><input class="settings-input" type="color" id="cat-bg-${key}" value="${safeBg}" onclick="event.stopPropagation()"></div>
          </div>
          <div class="settings-row"><label>Default estimate (min, 0 = no estimate)</label><input class="settings-input" type="number" id="cat-est-${key}" min="0" max="480" value="${cat.defaultEst}" onclick="event.stopPropagation()"></div>
          <div style="display:flex;gap:6px;margin-top:6px">
            <button class="data-btn" data-action="saveCatEdit" data-key="${key}" style="flex:1;color:var(--accent);border-color:#00d2ff44">\ud83d\udcbe Save</button>
            <button class="data-btn" data-action="editCat" data-key="${key}" style="flex:1">Cancel</button>
          </div>
        </div>`;
      } else {
        html += `<div class="cat-list-row">
          <div class="cat-swatch" style="background:${cat.border}"></div>
          <div class="cat-row-key">${escapeHtml(key)}</div>
          ${cat.label ? `<div class="cat-row-badge" style="background:${cat.border}18;color:${cat.border};border-color:${cat.border}33">${escapeHtml(cat.label)}</div>` : '<div style="width:20px"></div>'}
          <div class="cat-row-est">${cat.defaultEst ? cat.defaultEst + 'm' : '\u2014'}</div>
          <button class="cat-row-btn" data-action="editCat" data-key="${key}">Edit</button>
          <button class="cat-row-btn danger" data-action="deleteCat" data-key="${key}">\u00d7</button>
        </div>`;
      }
    });
    // Add new form
    if (state.showCatAddForm) {
      html += `<div class="cat-edit-row" style="border-color:var(--border);margin-top:4px">
        <div style="font-size:11px;font-weight:600;color:var(--text);margin-bottom:10px">New Category</div>
        <div class="settings-row"><label>Key (unique slug, lowercase)</label><input class="settings-input" id="cat-new-key" placeholder="e.g. physics2" maxlength="24" onclick="event.stopPropagation()" onkeydown="if(event.key==='Enter'){event.stopPropagation();addCat();}"></div>
        <div class="settings-row"><label>Label (badge text, optional)</label><input class="settings-input" id="cat-new-label" placeholder="PHY" maxlength="8" onclick="event.stopPropagation()"></div>
        <div style="display:flex;gap:8px">
          <div class="settings-row" style="flex:1"><label>Accent color</label><input class="settings-input" type="color" id="cat-new-border" value="#00d2ff" onclick="event.stopPropagation()"></div>
          <div class="settings-row" style="flex:1"><label>Background</label><input class="settings-input" type="color" id="cat-new-bg" value="#091a28" onclick="event.stopPropagation()"></div>
        </div>
        <div class="settings-row"><label>Default estimate (min)</label><input class="settings-input" type="number" id="cat-new-est" min="0" max="480" value="60" onclick="event.stopPropagation()"></div>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button class="data-btn" data-action="addCat" style="flex:1;color:var(--accent);border-color:#00d2ff44">+ Add</button>
          <button class="data-btn" data-action="showCatAddFormOff" style="flex:1">Cancel</button>
        </div>
      </div>`;
    } else {
      html += `<button class="data-btn" data-action="showCatAddFormOn" style="width:100%;color:var(--accent);border-color:#00d2ff22;margin-top:4px">+ New Category</button>`;
    }
    html += `<button class="data-btn" data-action="resetCatToDefaults" style="width:100%;color:#e94560;border-color:#e9456033;margin-top:2px">\u21ba Reset to Defaults</button>`;
    html += `</div>`;
  });

  // Settings
  const TIMEZONES = ['Europe/Istanbul','Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Sao_Paulo','Asia/Tokyo','Asia/Shanghai','Asia/Seoul','Asia/Kolkata','Asia/Dubai','Australia/Sydney','Pacific/Auckland'];
  lazyPanel('settings', '\u2699\ufe0f Settings', 'color:var(--muted)', () => {
    html += `<div style="display:flex;flex-direction:column;gap:0">
      <div class="settings-section">
        <div class="settings-section-label">Identity</div>
        <div class="settings-row"><label>App Title</label><input class="settings-input" id="cfg-appTitle" value="${escapeHtml(CONFIG.appTitle)}" placeholder="Study Plan"></div>
        <div class="settings-row"><label>Semester Name</label><input class="settings-input" id="cfg-semester" value="${escapeHtml(CONFIG.semester)}" placeholder="Spring 2026 \xb7 4th Semester"></div>
        <div class="settings-row"><label>Header Tag</label><input class="settings-input" id="cfg-headerTag" value="${escapeHtml(CONFIG.headerTag)}" placeholder="FA \u2265 18h/week \xb7 preview \u2192 class \u2192 hw"></div>
      </div>
      <div class="settings-section">
        <div class="settings-section-label">Environment</div>
        <div class="settings-row"><label>Timezone</label><select class="settings-input" id="cfg-timezone">${TIMEZONES.map(tz => `<option value="${tz}"${CONFIG.timezone === tz ? ' selected' : ''}>${tz}</option>`).join('')}</select></div>
      </div>
      <div class="settings-section">
        <div class="settings-section-label">UI Defaults</div>
        <div class="settings-row"><label>Focus Timer Default (min)</label><input class="settings-input" type="number" id="cfg-focusTimerDefault" min="1" max="180" value="${CONFIG.focusTimerDefault}"></div>
        <div class="settings-row"><label>Toast Duration (ms)</label><input class="settings-input" type="number" id="cfg-toastDuration" min="500" max="10000" value="${CONFIG.toastDuration}"></div>
        <div class="settings-row"><label>Swipe Threshold (px)</label><input class="settings-input" type="number" id="cfg-swipeThreshold" min="20" max="200" value="${CONFIG.swipeThreshold}"></div>
      </div>
      <div class="settings-section">
        <div class="settings-section-label">External APIs</div>
        <div class="settings-row"><label>Meal API URL</label><input class="settings-input" id="cfg-mealApiUrl" value="${escapeHtml(CONFIG.mealApiUrl)}" placeholder="https://sks.istanbul.edu.tr/..."></div>
        <div class="settings-row"><label>Goodreads RSS URL</label><input class="settings-input" id="cfg-goodreadsRss" value="${escapeHtml(CONFIG.goodreadsRss)}" placeholder="https://www.goodreads.com/..."></div>
      </div>
      <button class="data-btn" data-action="applySettings" style="width:100%;color:var(--accent);border-color:#00d2ff44;margin-top:4px">\ud83d\udcbe Save Settings</button>
      <button class="data-btn" data-action="resetSettings" style="width:100%;color:#e94560;border-color:#e9456033;margin-top:6px">\u21ba Reset to Defaults</button>
      <div class="settings-save-note">Changes take effect immediately. Reset requires a page reload.</div>
    </div>`;
  });

  return html;
}

// ── FAB ──
function renderFAB() {
  let fabEl = document.getElementById('fab-container');
  if (!fabEl) {
    fabEl = document.createElement('div');
    fabEl.id = 'fab-container';
    document.body.appendChild(fabEl);
  }
  let fabHtml = `<button class="fab ${state.fabOpen ? 'open' : ''}" data-action="toggleFab">+</button>`;
  if (state.fabOpen && state.viewMode === 'day') {
    const fabDay = schedule[DAYS[state.selectedDay]];
    fabHtml += `<div class="fab-panel">
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-weight:600">Quick add to ${DAYS[state.selectedDay]}</div>
      <input id="fab-text" type="text" placeholder="Task text..." onkeydown="if(event.key==='Enter')fabAddTask()">
      <div class="fab-panel-row"><select id="fab-cat" style="flex:1">`;
    CategoryRegistry.keys().forEach(k => {
      fabHtml += `<option value="${k}">${CategoryRegistry.getLabel(k) || k}</option>`;
    });
    fabHtml += `</select><select id="fab-section" style="flex:1">`;
    fabDay.sections.forEach((s, i) => {
      fabHtml += `<option value="${i}">${s.label}</option>`;
    });
    fabHtml += `</select></div>
      <button class="fab-add-btn" data-action="fabAddTask" style="margin-top:8px">Add Task</button>
    </div>`;
  }
  fabEl.innerHTML = fabHtml;
}

// ── Scratchpad ──
function renderScratchpad() {
  let scratchEl = document.getElementById('scratchpad-container');
  if (!scratchEl) { scratchEl = document.createElement('div'); scratchEl.id = 'scratchpad-container'; document.body.appendChild(scratchEl); }
  let scratchHtml = `<button class="scratchpad-fab" data-action="toggleScratchpad" title="Quick notes">\ud83d\udcdd</button>`;
  if (state.scratchpadOpen) {
    scratchHtml += `<div class="scratchpad-panel">
      <div class="scratchpad-header"><span>Scratchpad</span><span style="font-size:9px;color:var(--dim)">Auto-saved</span></div>
      <textarea class="scratchpad-area" id="scratchpad-text" placeholder="Quick notes\u2026" oninput="saveScratchpad(this.value)">${escapeHtml(loadScratchpad())}</textarea>
    </div>`;
  }
  scratchEl.innerHTML = scratchHtml;
}

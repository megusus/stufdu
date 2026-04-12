// ════════════════════════════════════════
// ── Day View Renderer ──
// ════════════════════════════════════════

import { renderItem } from './task-item.js';
import { renderMealCard } from './meals.js';
import { getRecurringTasksForDay } from '../recurrence.js';

function _errBox(context, err, escapeHtml) {
  console.error(`[render] ${context} failed:`, err);
  return `<div style="padding:10px 12px;margin:4px 0;font-size:11px;color:#e94560;background:#1a0808;border:1px solid #e9456033;border-radius:8px">
    \u26a0\ufe0f <strong>${escapeHtml(context)}</strong> failed to render &mdash;
    <code style="font-size:9px;font-family:monospace">${escapeHtml(String(err).slice(0, 120))}</code>
  </div>`;
}

/**
 * Pure renderer: receives RenderContext + currentSectionIdx, returns HTML string.
 * @param {import('./context.js').RenderContext} ctx
 * @param {number} currentSectionIdx
 */
export function renderDayView(ctx, currentSectionIdx) {
  try { return _renderDayViewInner(ctx, currentSectionIdx); }
  catch (err) { return _errBox('DayView', err, ctx.escapeHtml); }
}

function _renderDayViewInner(ctx, currentSectionIdx) {
  const { state, dayName, day, prog, isToday, escapeHtml, formatEst, getEstimate,
          getStatus, getDayLabel, categories, STATUS_DONE, STATUS_SKIP } = ctx;

  let html = '';

  // Celebration banner
  if (prog.pct === 100 && state.celebrationShown[dayName]) {
    html += `<div class="day-complete-banner animate-on-scroll">
      <div class="day-complete-text">✦ All tasks complete ✦</div>
      <div class="day-complete-sub">Take a well-deserved break today.</div>
    </div>`;
  }

  // Day header
  html += `<div class="day-header">
    <div>
      <h2 class="day-name">${escapeHtml(getDayLabel(dayName))}${isToday ? ' <span class="today-tag">today</span>' : ''}</h2>
      <div class="day-meta">Wake <strong>${escapeHtml(day.wake || '08:00')}</strong>${day.leave ? ` · Leave <strong>${escapeHtml(day.leave)}</strong>` : ' <span class="home-day-tag">Home day</span>'}${day.meta ? ` · <em>${escapeHtml(day.meta)}</em>` : ''}</div>
    </div>
    <button class="lock-btn ${state.lockedDays[dayName] ? 'locked' : ''}" data-action="toggleLock" data-day="${escapeHtml(dayName)}" title="${state.lockedDays[dayName] ? 'Unlock' : 'Lock'} day">
      \ud83d\udd12 ${state.lockedDays[dayName] ? 'Locked' : 'Lock'}
    </button>
  </div>`;

  // Cat filters
  const dayCats = new Set();
  day.sections.forEach(s => s.items.forEach(item => {
    if (state.taskDeferred[item.id] && state.taskDeferred[item.id] !== dayName) return;
    dayCats.add(item.cat);
  }));
  if (dayCats.size > 1) {
    html += '<div class="cat-filter-row">';
    html += `<button class="cat-filter-btn ${!state.activeFilter ? 'active' : ''}" data-action="toggleCatFilter">All</button>`;
    [...dayCats].forEach(cat => {
      const c = categories.getColor(cat);
      const label = categories.getLabel(cat) || cat;
      html += `<button class="cat-filter-btn ${state.activeFilter === cat ? 'active' : ''}" data-action="toggleCatFilter" data-cat="${cat}" style="${state.activeFilter === cat ? `background:${c.border};color:var(--bg);border-color:${c.border}` : `border-color:${c.border}44;color:${c.border}`}">${label}</button>`;
    });
    html += '</div>';
  }

  // Meal card
  html += renderMealCard(ctx);

  // Search
  const query = (state.searchQuery || '').trim().toLowerCase();

  // Empty state — no tasks in any section
  const totalItems = day.sections.reduce((sum, s) => sum + s.items.length, 0);
  if (totalItems === 0 && !query) {
    html += `<div class="day-empty-state">
      <div class="day-empty-icon">📋</div>
      <div class="day-empty-title">No tasks yet</div>
      <div class="day-empty-sub">Add tasks using the + button below,<br>or import from your Ideal Week.</div>
      <div class="day-empty-actions">
        <button class="data-btn" data-action="toggleFab" style="color:var(--accent);border-color:var(--accent-ring)">+ Add task</button>
        <a class="data-btn" href="#ideal" style="text-decoration:none;color:var(--c-purple,#cf7aff);border-color:color-mix(in srgb,var(--c-purple,#cf7aff) 25%,transparent)">✦ Ideal Week</a>
      </div>
    </div>`;
  }

  // Sections
  day.sections.forEach((section, sIdx) => {
    const items = section.items.filter(item => {
      if (state.taskDeferred[item.id] && state.taskDeferred[item.id] !== dayName) return false;
      if (state.focusMode && (getStatus(item.id) === STATUS_DONE || getStatus(item.id) === STATUS_SKIP)) return false;
      if (state.activeFilter && item.cat !== state.activeFilter) return false;
      if (query && !item.text.toLowerCase().includes(query) && !(item.hint || '').toLowerCase().includes(query)) return false;
      return true;
    });
    if (items.length === 0 && (state.focusMode || state.activeFilter || query)) return;

    // Section progress fraction (not filtered — actual state of all section items)
    const secAllItems = section.items.filter(item => !(state.taskDeferred[item.id] && state.taskDeferred[item.id] !== dayName));
    const secDone = secAllItems.filter(it => { const s = getStatus(it.id); return s === STATUS_DONE || s === STATUS_SKIP; }).length;
    const secPct = secAllItems.length > 0 ? Math.round(secDone / secAllItems.length * 100) : 0;

    const isCurrent = isToday && sIdx === currentSectionIdx;
    html += `<div class="section ${isCurrent ? 'active-section' : ''}">`;
    html += `<div class="section-header">
      <span class="section-label">${escapeHtml(section.label.toUpperCase())}</span>
      <div class="section-prog-wrap">
        <span class="section-frac">${secDone}/${secAllItems.length}</span>
        <div class="section-prog-track" title="${secPct}% complete">
          <div class="section-prog-fill ${secPct === 100 ? 'complete' : ''}" style="width:${secPct}%"></div>
        </div>
      </div>
      <button class="section-done-btn" data-action="markSectionDone" data-day="${escapeHtml(dayName)}" data-i="${sIdx}" title="Mark all done">\u2713 All</button>
    </div>`;

    html += `<div class="drop-zone" data-drop-zone data-drop-day="${escapeHtml(dayName)}" data-drop-section="${sIdx}">`;
    items.forEach((item, itemIdx) => {
      const dragAttrs = `draggable="true" data-dragstart-action="taskDragStart" data-drag-id="${item.id}" data-drag-day="${escapeHtml(dayName)}" data-drag-si="${sIdx}" data-drag-ii="${itemIdx}"`;
      html += renderItem(ctx, item, dayName, '', '', dragAttrs);
    });
    html += `</div></div>`;
  });

  // Recurring tasks injected for this day
  const recurring = getRecurringTasksForDay(dayName);
  if (recurring.length > 0) {
    const visibleRec = recurring.filter(item => {
      if (state.focusMode && (getStatus(item.id) === STATUS_DONE || getStatus(item.id) === STATUS_SKIP)) return false;
      if (state.activeFilter && item.cat !== state.activeFilter) return false;
      if (query && !item.text.toLowerCase().includes(query)) return false;
      return true;
    });
    if (visibleRec.length > 0) {
      html += `<div class="section recurring-section"><div class="section-header"><span class="section-label">🔁 RECURRING</span></div>`;
      html += `<div class="drop-zone">`;
      visibleRec.forEach(item => { html += renderItem(ctx, item, dayName, 'recurring-task'); });
      html += `</div></div>`;
    }
  }

  // Deferred-in tasks
  const deferredIn = Object.entries(state.taskDeferred).filter(([id, target]) => {
    if (target !== dayName) return false;
    let isOwnTask = false;
    for (const sec of day.sections) { for (const it of sec.items) { if (it.id === id) { isOwnTask = true; break; } } if (isOwnTask) break; }
    return !isOwnTask;
  });
  if (deferredIn.length > 0) {
    html += `<div class="section deferred-section"><div class="section-header"><span class="section-label">DEFERRED HERE</span></div>`;
    deferredIn.forEach(([id]) => {
      // Find the item across all days
      let foundItem = null, fromDay = null;
      for (const d of ctx.days) {
        for (const s of (ctx.schedule[d]?.sections || [])) {
          for (const it of s.items) {
            if (it.id === id) { foundItem = it; fromDay = d; break; }
          }
          if (foundItem) break;
        }
        if (foundItem) break;
      }
      if (foundItem) html += renderItem(ctx, foundItem, dayName, 'deferred-in', fromDay);
    });
    html += '</div>';
  }

  return html;
}

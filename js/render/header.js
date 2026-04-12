// ════════════════════════════════════════
// ── Header Controls Renderer ──
// ════════════════════════════════════════

import { getIdealGap } from '../ideal.js';

/**
 * Pure renderer: receives RenderContext, returns HTML string.
 * @param {import('./context.js').RenderContext} ctx
 */
export function renderHeaderControls(ctx) {
  const { config, state, days, dayConfig, prog, wp, escapeHtml, formatEst, getEstimate,
          getDayProgress, getShortLabel, categories, todayIdx, isToday, weekNum,
          currentTheme, hasSyncConfig, schedule } = ctx;

  const remaining = (ctx.day?.sections || []).reduce((sum, s) => {
    return sum + s.items.reduce((acc, item) => {
      if (state.taskDeferred[item.id] && state.taskDeferred[item.id] !== ctx.dayName) return acc;
      return ctx.getStatus(item.id) ? acc : acc + getEstimate(item);
    }, 0);
  }, 0);
  const estDisplay = remaining > 0 ? ` · ~${formatEst(remaining)} left` : '';

  const themeLabel = currentTheme === 'dark' ? '\u2600\ufe0f' : '\ud83c\udf19';
  const syncDot = hasSyncConfig && state.firebaseReady
    ? '<span class="sync-dot" title="Sync connected"></span>'
    : '';

  let html = `<div class="semester-tag">${escapeHtml(config.semester)}</div>
    <div class="title-row">
      <h1 class="title">${escapeHtml(config.appTitle)}${syncDot}</h1>
      <div class="title-controls">
        <button class="icon-btn" data-action="toggleTheme" title="Toggle theme">${themeLabel}</button>
        <button class="icon-btn" data-action="toggleFontSize" title="Font size">A\u2195</button>
        <button class="icon-btn" data-action="toggleShortcuts" title="Keyboard shortcuts">?</button>
      </div>
    </div>
    <div class="subtitle">${escapeHtml(config.headerTag)}</div>`;

  html += `<div class="progress-section" aria-label="Weekly progress">
    <div class="week-label">WEEK ${weekNum}</div>
    <div class="weekly-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${wp.pct}" aria-label="Weekly completion">
      <div class="weekly-bar-fill" style="width:${wp.pct}%"></div>
    </div>
    <div id="week-val" class="week-val">${wp.done}/${wp.total} \u00b7 ${wp.pct}%${estDisplay ? ` \u00b7 ~${formatEst(remaining)} left` : ''}</div>
  </div>`;

  html += `<div class="day-stats"><span id="task-count">${prog.done}/${prog.total} tasks</span> <span class="day-est">${estDisplay}</span> <span id="task-pct">${prog.pct}%</span></div>`;

  html += `<div class="search-bar"><span class="search-icon">\ud83d\udd0d</span><input id="search-input" type="text" class="search-input" placeholder="Search tasks\u2026" value="${escapeHtml(state.searchQuery || '')}" data-input-action="setSearch" data-focus-action="selectInput" data-stop></div>`;

  html += `<div class="seg-control view-mode-seg" role="group" aria-label="View mode">
    <button class="seg-btn ${state.viewMode === 'day' ? 'active' : ''}" data-action="setViewMode" data-mode="day" aria-pressed="${state.viewMode === 'day'}">Day</button>
    <button class="seg-btn ${state.viewMode === 'week' ? 'active' : ''}" data-action="setViewMode" data-mode="week" aria-pressed="${state.viewMode === 'week'}">Week</button>
    <button class="seg-btn seg-btn--focus ${state.focusMode ? 'active' : ''}" data-action="toggleFocusMode" aria-pressed="${state.focusMode ? 'true' : 'false'}">&#128053; Focus</button>
  </div>`;

  // Compute ideal gap for all days (for tab indicators)
  let idealGap = {};
  try { idealGap = getIdealGap(state.checked, state.taskDeferred); } catch(e) {}

  html += '<div class="tabs" role="tablist" aria-label="Study days">';
  days.forEach((d, i) => {
    if (dayConfig[d]?.active === false) return;
    const p = getDayProgress(d);
    const sel = i === state.selectedDay;
    const today = i === todayIdx;
    const gap = idealGap[d];
    let gapDot = '';
    if (gap && gap.idealTotal > 0) {
      const dotTier = gap.pct >= 80 ? 'good' : gap.pct >= 50 ? 'mid' : 'low';
      gapDot = `<span class="tab-ideal-dot tab-ideal-dot--${dotTier}" title="Ideal: ${gap.pct}%"></span>`;
    }
    html += `<button class="tab ${sel ? 'active' : ''} ${today ? 'today' : ''}"
      data-action="selectDay" data-i="${i}" data-context-action="showTabCtxMenu"
      role="tab" aria-selected="${sel}" tabindex="${sel ? '0' : '-1'}" aria-label="${escapeHtml(d)} ${p.done} of ${p.total} tasks complete">
      ${escapeHtml(getShortLabel(d, i))}${gapDot}
      <div class="tab-progress" style="width:${p.pct}%"></div>
    </button>`;
  });
  html += '</div>';

  return html;
}

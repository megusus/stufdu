// ════════════════════════════════════════
// ── Header Controls Renderer ──
// ════════════════════════════════════════

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
    ? '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#00e676;margin-left:4px;vertical-align:middle" title="Sync connected"></span>'
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

  html += `<div class="progress-section">
    <div class="week-label">WEEK ${weekNum}</div>
    <div class="weekly-bar"><div class="weekly-bar-fill" style="width:${wp.pct}%"></div></div>
    <div id="week-val" class="week-val">${wp.done}/${wp.total} \u00b7 ${wp.pct}%${estDisplay ? ` \u00b7 ~${formatEst(remaining)} left` : ''}</div>
  </div>`;

  html += `<div class="day-stats"><span id="task-count">${prog.done}/${prog.total} tasks</span> <span class="day-est">${estDisplay}</span> <span id="task-pct">${prog.pct}%</span></div>`;

  html += `<div class="search-bar"><span class="search-icon">\ud83d\udd0d</span><input id="search-input" type="text" class="search-input" placeholder="Search tasks\u2026" value="${escapeHtml(state.searchQuery || '')}" data-input-action="setSearch" data-focus-action="selectInput" data-stop></div>`;

  html += `<div class="view-mode-toggle">
    <button class="view-btn ${state.viewMode === 'day' ? 'active' : ''}" data-action="setViewMode" data-mode="day">Day</button>
    <button class="view-btn ${state.viewMode === 'week' ? 'active' : ''}" data-action="setViewMode" data-mode="week">Week</button>
    <button class="view-btn focus ${state.focusMode ? 'active' : ''}" data-action="toggleFocusMode">\ud83d\udc53 Focus</button>
  </div>`;

  html += '<div class="tabs">';
  days.forEach((d, i) => {
    if (dayConfig[d]?.active === false) return;
    const p = getDayProgress(d);
    const sel = i === state.selectedDay;
    const today = i === todayIdx;
    html += `<button class="tab ${sel ? 'active' : ''} ${today ? 'today' : ''}"
      data-action="selectDay" data-i="${i}" data-context-action="showTabCtxMenu"
      role="tab" aria-selected="${sel}">
      ${escapeHtml(getShortLabel(d, i))}
      <div class="tab-progress" style="width:${p.pct}%"></div>
    </button>`;
  });
  html += '</div>';

  return html;
}

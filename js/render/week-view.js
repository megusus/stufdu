// ════════════════════════════════════════
// ── Week View Renderer ──
// ════════════════════════════════════════

/**
 * Pure renderer: receives RenderContext, returns HTML string.
 * @param {import('./context.js').RenderContext} ctx
 */
export function renderWeekView(ctx) {
  const { state, days, dayConfig, schedule, escapeHtml, getStatus,
          getDayProgress, getDayLabel, getShortLabel, categories, todayIdx,
          STATUS_DONE, STATUS_SKIP, STATUS_PROGRESS, STATUS_BLOCKED } = ctx;

  let html = '<div class="week-view">';
  days.forEach((dayName, di) => {
    if (dayConfig[dayName]?.active === false) return;
    const day = schedule[dayName];
    if (!day) return;
    const prog = getDayProgress(dayName);
    const isToday = di === todayIdx;
    const collapsed = state.weekViewCollapsed[di];

    html += `<div class="week-day ${isToday ? 'today' : ''} ${collapsed ? 'collapsed' : ''}">`;
    html += `<div class="week-day-header" data-action="toggleWeekDayCollapse" data-i="${di}">
      <span class="week-day-name">${escapeHtml(getDayLabel(dayName))}</span>
      <span class="week-day-prog">${prog.pct}%</span>
    </div>`;

    if (!collapsed) {
      day.sections.forEach(section => {
        html += `<div class="week-section-label">${escapeHtml(section.label)}</div>`;
        section.items.forEach(item => {
          if (state.taskDeferred[item.id] && state.taskDeferred[item.id] !== dayName) return;
          const st = getStatus(item.id);
          const c = categories.getColor(item.cat);
          let cls = 'week-task';
          if (st === STATUS_DONE) cls += ' done';
          else if (st === STATUS_SKIP) cls += ' skip';
          else if (st === STATUS_PROGRESS) cls += ' progress';
          else if (st === STATUS_BLOCKED) cls += ' blocked';
          const check = st === STATUS_DONE ? '\u2713' : st === STATUS_SKIP ? '\u2716' : st === STATUS_PROGRESS ? '\u25b6' : st === STATUS_BLOCKED ? '\u26d4' : '';
          html += `<div class="${cls}" data-task-id="${item.id}" data-action="toggle" data-id="${item.id}"
            role="checkbox" aria-checked="${st === STATUS_DONE}" style="border-left-color:${c.border}">
            <span class="week-task-check">${check}</span>
            <span class="week-task-text">${escapeHtml(item.text)}</span>
          </div>`;
        });
      });
    }

    html += '</div>';
  });
  html += '</div>';
  return html;
}

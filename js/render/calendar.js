// ════════════════════════════════════════
// ── Multi-week Calendar View ──
// ════════════════════════════════════════

import { DAYS, schedule, getDayLabel } from '../schedule.js';
import { state, getStatus, getDaysUntil, STATUS_DONE, STATUS_SKIP, getDayProgress, loadHistory } from '../state.js';

let _calendarMode = '4week'; // '4week' | 'month'

export function getCalendarMode() { return _calendarMode; }
export function setCalendarMode(m) { _calendarMode = m; }

export function renderCalendarView(ctx) {
  try { return _renderCalendarInner(ctx); }
  catch (err) {
    console.error('[render] Calendar failed:', err);
    return `<div style="padding:24px;color:#e94560">Calendar error: ${ctx.escapeHtml(String(err))}</div>`;
  }
}

function _renderCalendarInner(ctx) {
  const { escapeHtml, getDayLabel: ctxGetDayLabel } = ctx;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const mode = _calendarMode;
  const daysToShow = mode === 'month' ? _getDaysInMonth(today) : _getLast4Weeks(today);

  let html = `<div class="view-page">
    <div class="view-page-header">
      <h1 class="view-page-title">📅 Calendar</h1>
      <div class="view-page-sub">Multi-week overview with deadlines and progress</div>
    </div>
    <div class="view-mode-toggle" style="margin-bottom:20px">
      <button class="view-btn${mode === '4week' ? ' active' : ''}" data-action="setCalendarMode" data-mode="4week">4 Weeks</button>
      <button class="view-btn${mode === 'month' ? ' active' : ''}" data-action="setCalendarMode" data-mode="month">Month</button>
    </div>
    <div class="calendar-grid-header">`;

  // Day headers (Mon-Sun)
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d => {
    html += `<div class="cal-day-header">${d}</div>`;
  });
  html += `</div><div class="calendar-grid">`;

  // Build historical week data for past dates
  const hist = loadHistory();

  // Fill days
  daysToShow.forEach(dateStr => {
    const date = new Date(dateStr + 'T12:00:00');
    const dayName = DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const isFuture = dateStr > todayStr;

    let pct = -1;
    if (isToday) {
      const prog = getDayProgress(dayName);
      pct = prog.total > 0 ? prog.pct : -1;
    } else if (isPast) {
      // Use week-level historical data as approximation
      const wk = _isoWeekKey(date);
      if (hist[wk] !== undefined) pct = hist[wk];
    } else {
      // Future: show template progress if it's this week, else no data
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(thisWeekStart.getDate() - (thisWeekStart.getDay() === 0 ? 6 : thisWeekStart.getDay() - 1));
      const thisWeekEnd = new Date(thisWeekStart); thisWeekEnd.setDate(thisWeekEnd.getDate() + 6);
      if (date >= thisWeekStart && date <= thisWeekEnd) {
        const prog = getDayProgress(dayName);
        pct = prog.total > 0 ? prog.pct : -1;
      }
    }
    const color = pct === 100 ? '#00e676' : pct >= 60 ? '#00d2ff' : pct >= 20 ? '#ffab00' : pct >= 0 ? '#e94560' : null;

    // Deadline dots
    const dlDots = state.deadlines
      .filter(dl => dl.date === dateStr)
      .slice(0, 3)
      .map(dl => `<span class="cal-dl-dot" title="${escapeHtml(dl.name)}"></span>`)
      .join('');

    const dayNum = date.getDate();
    const isFirstOfMonth = dayNum === 1;
    const monthLabel = isFirstOfMonth ? date.toLocaleString('default', { month: 'short' }) : '';

    html += `<div class="cal-cell${isToday ? ' today' : ''}" data-action="calNavigateDay" data-date="${escapeHtml(dateStr)}" data-day="${escapeHtml(dayName)}">
      <div class="cal-cell-date">
        ${monthLabel ? `<span class="cal-month-label">${monthLabel} </span>` : ''}${dayNum}
      </div>
      ${pct >= 0 ? `<div class="cal-cell-bar" style="width:${pct}%;background:${color}"></div>` : ''}
      ${pct === 100 ? `<div class="cal-cell-check">✓</div>` : ''}
      ${dlDots ? `<div class="cal-cell-dots">${dlDots}</div>` : ''}
    </div>`;
  });

  html += `</div>
    <div class="calendar-legend">
      <span class="cal-legend-item"><span class="cal-legend-dot" style="background:#00e676"></span>100%</span>
      <span class="cal-legend-item"><span class="cal-legend-dot" style="background:#00d2ff"></span>≥60%</span>
      <span class="cal-legend-item"><span class="cal-legend-dot" style="background:#ffab00"></span>≥20%</span>
      <span class="cal-legend-item"><span class="cal-legend-dot" style="background:#e94560"></span>&lt;20%</span>
      <span class="cal-legend-item"><span class="cal-dl-dot"></span>Deadline</span>
    </div>
  </div>`;

  return html;
}

function _isoWeekKey(d) {
  const temp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7));
  const week1 = new Date(temp.getFullYear(), 0, 4);
  const wn = 1 + Math.round(((temp - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${temp.getFullYear()}-W${String(wn).padStart(2, '0')}`;
}

function _getLast4Weeks(today) {
  const days = [];
  // Start from the Monday 4 weeks ago
  const start = new Date(today);
  start.setDate(start.getDate() - (start.getDay() === 0 ? 6 : start.getDay() - 1) - 21);
  for (let i = 0; i < 28; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function _getDaysInMonth(today) {
  const year = today.getFullYear(), month = today.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  // Pad to Monday
  const startOffset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  for (let i = startOffset; i > 0; i--) {
    const d = new Date(first); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d).toISOString().slice(0, 10));
  }
  // Pad to fill last row (7 cols)
  while (days.length % 7 !== 0) {
    const last_ = new Date(days[days.length - 1]);
    last_.setDate(last_.getDate() + 1);
    days.push(last_.toISOString().slice(0, 10));
  }
  return days;
}

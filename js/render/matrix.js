// ════════════════════════════════════════
// ── Eisenhower Matrix View ──
// ════════════════════════════════════════

import { DAYS, schedule } from '../schedule.js';
import { state, getStatus, getDaysUntil, STATUS_DONE, STATUS_SKIP } from '../state.js';

const QUADRANTS = [
  { id: 'do',     label: 'Do Now',      sub: 'Urgent + Important',     color: '#e94560', bg: '#e9456011' },
  { id: 'plan',   label: 'Schedule',    sub: 'Not Urgent + Important',  color: '#00d2ff', bg: '#00d2ff11' },
  { id: 'delegate', label: 'Minimise', sub: 'Urgent + Not Important',   color: '#ffab00', bg: '#ffab0011' },
  { id: 'drop',   label: 'Eliminate',   sub: 'Not Urgent + Not Important', color: '#6c7086', bg: '#6c708611' },
];

const HIGH_IMPORTANCE_CATS = new Set(['fa', 'analysis', 'algebra', 'diffeq', 'numtheory', 'physics', 'class']);

export function renderMatrixView(ctx) {
  try { return _renderMatrixInner(ctx); }
  catch (err) {
    console.error('[render] Matrix failed:', err);
    return `<div style="padding:24px;color:#e94560">Matrix error: ${ctx.escapeHtml(String(err))}</div>`;
  }
}

function _renderMatrixInner(ctx) {
  const { escapeHtml, categories, getDayLabel, days, todayIdx } = ctx;
  const todayName = days[todayIdx] || days[0];

  // Classify all pending tasks
  const classified = { do: [], plan: [], delegate: [], drop: [] };

  DAYS.forEach(day => {
    const dayData = schedule[day];
    if (!dayData) return;
    (dayData.sections || []).forEach(sec => {
      sec.items.forEach(item => {
        // Skip done/skipped
        const s = getStatus(item.id);
        if (s === STATUS_DONE || s === STATUS_SKIP) return;
        // Skip deferred away from this day
        if (state.taskDeferred[item.id] && state.taskDeferred[item.id] !== day) return;

        // Urgency: is it today/tomorrow, or is there a deadline soon?
        const isToday = day === todayName;
        const isTomorrow = days.indexOf(day) === days.indexOf(todayName) + 1;
        const relatedDl = state.deadlines.find(dl => {
          const dlName = dl.name.toLowerCase();
          return dlName.includes(item.cat) || item.text.toLowerCase().includes(dlName.slice(0,10));
        });
        const daysUntilDeadline = relatedDl ? getDaysUntil(relatedDl.date) : null;
        const isUrgent = isToday || isTomorrow || (daysUntilDeadline !== null && daysUntilDeadline <= 3);

        // Importance: high-weight categories, or explicit 'class' type
        const isImportant = HIGH_IMPORTANCE_CATS.has(item.cat) ||
          (item.est && item.est >= 60) ||
          (daysUntilDeadline !== null && daysUntilDeadline <= 7);

        let quadrant;
        if (isUrgent && isImportant)      quadrant = 'do';
        else if (!isUrgent && isImportant) quadrant = 'plan';
        else if (isUrgent && !isImportant) quadrant = 'delegate';
        else                               quadrant = 'drop';

        const c = categories.getColor(item.cat);
        classified[quadrant].push({ item, day, color: c.border });
      });
    });
  });

  let html = `<div class="view-page">
    <div class="view-page-header">
      <h1 class="view-page-title">🔲 Priority Matrix</h1>
      <div class="view-page-sub">Eisenhower matrix — auto-classified from your schedule</div>
    </div>
    <div class="matrix-grid">`;

  QUADRANTS.forEach(q => {
    const tasks = classified[q.id];
    html += `<div class="matrix-quadrant" style="border-color:${q.color}33;background:${q.bg}">
      <div class="matrix-q-header">
        <div class="matrix-q-label" style="color:${q.color}">${q.label}</div>
        <div class="matrix-q-sub">${q.sub}</div>
        <div class="matrix-q-count" style="color:${q.color}">${tasks.length}</div>
      </div>
      <div class="matrix-q-tasks">`;
    if (tasks.length === 0) {
      html += `<div class="matrix-q-empty">—</div>`;
    } else {
      tasks.slice(0, 8).forEach(({ item, day, color }) => {
        const dayIdx = days.indexOf(day);
        html += `<div class="matrix-task-item matrix-task-interactive" data-action="toggle" data-id="${item.id}" style="cursor:pointer" title="Toggle done">
          <span class="matrix-task-dot" style="background:${color}"></span>
          <span class="matrix-task-text">${escapeHtml(item.text.slice(0,45))}</span>
          <span class="matrix-task-day" data-action="matrixJumpToTask" data-day="${escapeHtml(day)}" data-stop title="Go to ${escapeHtml(day)}">${escapeHtml(day.slice(0,3))} →</span>
        </div>`;
      });
      if (tasks.length > 8) {
        html += `<div style="font-size:9px;color:var(--dim);margin-top:4px">+${tasks.length - 8} more</div>`;
      }
    }
    html += `</div></div>`;
  });

  html += `</div>
    <div style="font-size:10px;color:var(--dim);margin-top:16px;line-height:1.6">
      Auto-classification: <strong>Urgent</strong> = today, tomorrow, or deadline ≤3 days.
      <strong>Important</strong> = core academic subjects or deadlines ≤7 days.
    </div>
  </div>`;

  return html;
}

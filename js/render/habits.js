// ════════════════════════════════════════
// ── Habits View Renderer ──
// ════════════════════════════════════════

import {
  loadHabits, HABIT_PRESETS, isHabitDoneToday, getHabitStreak,
  getHabitGrid, getHabitWeeklyCount, getTodayHabitSummary,
  getAvailableFreezes, isFreezedToday, getHabitStreakWithFreezes,
} from '../habits.js';

export function renderHabitsView(ctx) {
  try { return _renderHabitsInner(ctx); }
  catch (err) {
    console.error('[render] Habits failed:', err);
    return `<div style="padding:24px;color:#e94560">Habits error: ${ctx.escapeHtml(String(err))}</div>`;
  }
}

function _renderHabitsInner(ctx) {
  const { escapeHtml } = ctx;
  const habits = loadHabits();
  const summary = getTodayHabitSummary();

  const freezeCount = getAvailableFreezes();

  let html = `<div class="view-page">
    <div class="view-page-header">
      <h1 class="view-page-title">🏃 Habits</h1>
      <div class="view-page-sub">
        Today: ${summary.done}/${summary.total} done
        ${summary.total > 0 ? `&middot; ${Math.round((summary.done/summary.total)*100)}%` : ''}
        &middot; ❄️ ${freezeCount} freeze${freezeCount !== 1 ? 's' : ''} left
      </div>
    </div>`;

  // ── Today's Check-in ──
  if (habits.length > 0) {
    html += `<div class="habits-today-grid">`;
    habits.forEach(h => {
      const done = isHabitDoneToday(h.id);
      const frozen = isFreezedToday(h.id);
      const streakWithFreeze = getHabitStreakWithFreezes(h.id);
      html += `<div class="habit-check-row">
        <button class="habit-check-btn ${done ? 'done' : ''} ${frozen ? 'frozen' : ''}"
          data-action="toggleHabit" data-id="${escapeHtml(h.id)}"
          style="--habit-color:${h.color}">
          <span class="habit-check-icon">${h.icon}</span>
          <span class="habit-check-name">${escapeHtml(h.name)}</span>
          ${done ? '<span class="habit-check-mark">✓</span>' : frozen ? '<span class="habit-check-mark">❄️</span>' : ''}
        </button>
        ${!done && !frozen && freezeCount > 0 ? `<button class="habit-freeze-btn" data-action="useStreakFreeze" data-id="${escapeHtml(h.id)}" title="Use streak freeze">❄️</button>` : ''}
        ${streakWithFreeze > 0 ? `<span class="habit-streak-badge">🔥${streakWithFreeze}</span>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  // ── Add Habit ──
  html += `<div class="habits-add-section">
    <div class="review-section-title" style="font-size:12px;margin-bottom:10px">Quick add from presets</div>
    <div class="habits-presets">`;
  HABIT_PRESETS.forEach(p => {
    const exists = habits.some(h => h.name === p.name);
    if (!exists) {
      html += `<button class="habit-preset-btn" data-action="addHabitPreset"
        data-name="${escapeHtml(p.name)}" data-icon="${escapeHtml(p.icon)}" data-color="${escapeHtml(p.color)}"
        style="border-color:${p.color}44;color:${p.color}">
        ${p.icon} ${escapeHtml(p.name)}
      </button>`;
    }
  });
  html += `</div>`;

  // Custom habit form
  html += `<div class="habits-custom-form" data-stop>
    <input class="inbox-capture-input" id="habit-name-input" type="text" placeholder="Custom habit name..." style="flex:1">
    <input type="text" id="habit-icon-input" class="settings-input" value="⭐" style="width:50px;text-align:center" placeholder="Icon">
    <input type="color" id="habit-color-input" value="#00d2ff" style="width:38px;height:36px;border:1px solid var(--border2);border-radius:6px;cursor:pointer;background:none;padding:2px">
    <button class="data-btn" data-action="addHabitCustom" style="color:var(--accent);border-color:#00d2ff44">+ Add</button>
  </div>
  </div>`;

  // ── Streak Details ──
  if (habits.length > 0) {
    html += `<div class="habits-streak-list">`;
    habits.forEach(h => {
      const { streak, best } = getHabitStreak(h.id);
      const weekCount = getHabitWeeklyCount(h.id);
      const grid = getHabitGrid(h.id);

      html += `<div class="habit-streak-card">
        <div class="habit-streak-header">
          <span class="habit-streak-icon" style="color:${h.color}">${h.icon}</span>
          <span class="habit-streak-name">${escapeHtml(h.name)}</span>
          <span class="habit-streak-stats">
            🔥 ${streak} day${streak !== 1 ? 's' : ''} &middot; best ${best} &middot; ${weekCount}/7 this week
          </span>
          <button class="editor-remove-btn" data-action="removeHabit" data-id="${escapeHtml(h.id)}" title="Delete habit">✕</button>
        </div>
        <div class="habit-mini-grid">`;
      grid.forEach(cell => {
        html += `<div class="habit-grid-cell ${cell.done ? 'done' : ''}"
          style="${cell.done ? `background:${h.color}` : ''}"
          title="${cell.date}"></div>`;
      });
      html += `</div></div>`;
    });
    html += `</div>`;
  } else {
    html += `<div class="inbox-empty" style="padding:32px 24px">
      <div class="inbox-empty-icon">🏃</div>
      <div class="inbox-empty-title">No habits yet</div>
      <div class="inbox-empty-sub">Add from presets above or create your own.</div>
    </div>`;
  }

  html += `</div>`; // .view-page
  return html;
}

/** Renders a mini habit check-in for the home dashboard card */
export function renderHabitsHomeCard(escapeHtml) {
  const habits = loadHabits();
  const summary = getTodayHabitSummary();
  if (habits.length === 0) return null;

  let html = `<div class="home-card-label">🏃 Habits</div>`;
  const color = summary.done === summary.total && summary.total > 0 ? '#00e676'
    : summary.done > 0 ? '#ffab00' : '#e94560';
  html += `<div class="home-card-big" style="color:${color}">${summary.done}/${summary.total} today</div>`;
  html += `<div class="habit-mini-row">`;
  habits.slice(0, 6).forEach(h => {
    const done = isHabitDoneToday(h.id);
    html += `<span class="habit-mini-pill ${done ? 'done' : ''}"
      style="--habit-color:${h.color}"
      data-action="toggleHabit" data-id="${escapeHtml(h.id)}"
      title="${escapeHtml(h.name)}">${h.icon}</span>`;
  });
  html += `</div>`;
  return html;
}

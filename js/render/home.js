// ════════════════════════════════════════
// ── Home Dashboard Renderer ──
// ════════════════════════════════════════

import { loadScratchpad }                           from '../state.js';
import { getIdealGap }                              from '../ideal.js';
import { hasReviewForCurrentWeek }                  from '../review.js';
import { getInboxCount }                            from '../inbox.js';
import { renderHabitsHomeCard }                     from './habits.js';
import { getTodayHabitSummary, loadHabits }         from '../habits.js';
import { hasPlanForToday, getTodayPlan }            from '../daily-plan.js';
import { getTodayTotalMinutes, getActiveTimer }      from '../time-tracking.js';
import { getOverallAverage, getLetter, getGradeColor } from '../grades.js';
import { getTodayReviews, getTodayEnergy, getSmartSuggestion } from '../analytics.js';
import { loadDashboardConfig, saveDashboardConfig, moveCard, setCardVisible, setCardSize, CARD_DEFS } from '../dashboard-config.js';

export function renderHome(ctx) {
  try { return _renderHomeInner(ctx); }
  catch (err) {
    console.error('[render] Home failed:', err);
    return `<div style="padding:24px;color:#e94560">Home render error: ${ctx.escapeHtml(String(err))}</div>`;
  }
}

function _renderHomeInner(ctx) {
  const { state, config, escapeHtml, formatEst, getDayProgress, getWeeklyProgress,
          getDayLabel, categories, getEstimate, getStatus, todayIdx, days,
          schedule, wp, getDaysUntil, loadHistory, weekNum } = ctx;

  const editMode  = state.dashboardEditMode;
  const cardConfig = loadDashboardConfig();

  const todayName = days[todayIdx] || days[0];
  const todayProg = getDayProgress(todayName);
  const todayDay  = schedule[todayName];

  const remaining = todayDay ? (todayDay.sections || []).reduce((sum, s) =>
    sum + s.items.reduce((acc, item) => {
      if (state.taskDeferred[item.id] && state.taskDeferred[item.id] !== todayName) return acc;
      return getStatus(item.id) ? acc : acc + getEstimate(item);
    }, 0), 0) : 0;

  const upcomingDl = [...state.deadlines]
    .map(dl => ({ ...dl, daysLeft: getDaysUntil(dl.date) }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  const todayDate  = new Date().toISOString().slice(0, 10);
  const todayMeal  = state.mealData[todayDate];
  const scratchText = loadScratchpad() || '';
  const scratchLines = scratchText.split('\n').filter(l => l.trim()).slice(0, 2);
  const firstBook  = state.readingList[0];
  const hist       = loadHistory();
  const recentWeeks = Object.entries(hist).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);

  // Ideal gap
  let idealGapMsg = '', idealGapOk = false;
  try {
    const gap      = getIdealGap(state.checked, state.taskDeferred);
    const todayGap = gap[todayName];
    if (todayGap && todayGap.idealTotal > 0) {
      const behind = Math.max(0, todayGap.idealTotal - todayGap.actualDone);
      idealGapMsg = behind === 0
        ? `On track with ideal ${escapeHtml(todayName)}`
        : `${behind} task${behind !== 1 ? 's' : ''} behind ideal ${escapeHtml(todayName)}`;
      idealGapOk = behind === 0;
    }
  } catch (e) { /* ideal not configured */ }

  const pct = todayProg.pct;
  const ringColor = pct === 100 ? '#00e676' : pct >= 60 ? '#00d2ff' : pct >= 30 ? '#ffab00' : '#e94560';
  const circumference = 2 * Math.PI * 26;

  // ── Per-card render functions ──
  const CARDS = {
    'today-progress': (cfg) => `
      <div class="home-card home-card--${cfg.size === 'wide' ? 'wide' : 'normal'}" data-action="navigate" data-view="schedule">
        <div class="home-card-label">Today &middot; ${escapeHtml(getDayLabel(todayName))}</div>
        <div class="home-card-progress-row">
          <svg class="progress-ring" width="64" height="64" viewBox="0 0 64 64" style="flex-shrink:0">
            <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border)" stroke-width="5"/>
            <circle cx="32" cy="32" r="26" fill="none" stroke="${ringColor}" stroke-width="5"
              stroke-dasharray="${circumference.toFixed(1)}"
              stroke-dashoffset="${(circumference * (1 - pct / 100)).toFixed(1)}"
              stroke-linecap="round" transform="rotate(-90 32 32)" style="transition:stroke-dashoffset 0.5s"/>
            <text x="32" y="37" text-anchor="middle" font-family="inherit" font-size="11" font-weight="700" fill="${ringColor}">${pct}%</text>
          </svg>
          <div class="home-card-progress-info">
            <div class="home-card-big">${todayProg.done}/${todayProg.total} tasks</div>
            ${remaining > 0 ? `<div class="home-card-sub">~${formatEst(remaining)} remaining</div>`
              : pct === 100 && todayProg.total > 0 ? '<div class="home-card-sub" style="color:#00e676">All done!</div>' : ''}
            <div class="home-card-sub">${wp.done}/${wp.total} this week &middot; ${wp.pct}%</div>
          </div>
        </div>
      </div>`,

    'deadlines': () => {
      let h = `<div class="home-card" data-action="navigate" data-view="stats">
        <div class="home-card-label">📅 Upcoming Deadlines</div>`;
      if (upcomingDl.length === 0) {
        h += `<div class="home-card-empty">No deadlines set</div><div class="home-card-hint">Add in Stats →</div>`;
      } else {
        upcomingDl.forEach(dl => {
          const cls   = dl.daysLeft < 0 ? 'urgent' : dl.daysLeft <= 3 ? 'urgent' : dl.daysLeft <= 7 ? 'soon' : 'ok';
          const label = dl.daysLeft < 0 ? `${-dl.daysLeft}d ago` : dl.daysLeft === 0 ? 'TODAY' : dl.daysLeft === 1 ? 'tomorrow' : `${dl.daysLeft}d`;
          const c     = categories.getColor(dl.cat);
          h += `<div class="home-dl-item">
            <div class="home-dl-dot" style="background:${c.border}"></div>
            <div class="home-dl-name">${escapeHtml(dl.name)}</div>
            <span class="deadline-days ${cls}">${label}</span>
          </div>`;
        });
      }
      return h + `</div>`;
    },

    'meal': () => {
      let h = `<div class="home-card" data-action="navigate" data-view="tools">
        <div class="home-card-label">🍽 Today's Meal</div>`;
      const hasMeal = todayMeal && (todayMeal.ogle?.length || todayMeal.aksam?.length || todayMeal.kahvalti?.length);
      if (hasMeal) {
        if (todayMeal.kahvalti?.length) h += `<div class="home-meal-type">Breakfast</div><div class="home-meal-items">${todayMeal.kahvalti.slice(0,2).map(i => escapeHtml(i)).join(', ')}</div>`;
        if (todayMeal.ogle?.length)     h += `<div class="home-meal-type">Lunch</div><div class="home-meal-items">${todayMeal.ogle.slice(0,3).map(i => escapeHtml(i)).join(', ')}</div>`;
        if (todayMeal.aksam?.length)    h += `<div class="home-meal-type">Dinner</div><div class="home-meal-items">${todayMeal.aksam.slice(0,2).map(i => escapeHtml(i)).join(', ')}</div>`;
      } else {
        h += `<div class="home-card-empty">No meal data for today</div><div class="home-card-hint">Fetch in Tools →</div>`;
      }
      return h + `</div>`;
    },

    'streak': () => {
      let h = `<div class="home-card" data-action="navigate" data-view="stats">
        <div class="home-card-label">🔥 Weekly Streak</div>`;
      if (recentWeeks.length > 0) {
        h += `<div class="home-spark">`;
        recentWeeks.forEach(([key, p]) => {
          const ht = Math.max(4, Math.round(p * 0.38));
          const c  = p >= 80 ? '#00e676' : p >= 50 ? '#00d2ff' : p >= 20 ? '#ffab00' : '#e94560';
          h += `<div class="home-spark-bar" style="height:${ht}px;background:${c}" title="${key}: ${p}%"></div>`;
        });
        const lastPct = recentWeeks[recentWeeks.length - 1]?.[1] ?? 0;
        h += `</div><div class="home-card-big">${lastPct}% this week</div>`;
      } else {
        h += `<div class="home-card-empty">No history yet</div><div class="home-card-hint">Complete tasks to start →</div>`;
      }
      return h + `</div>`;
    },

    'ideal-gap': () => `
      <div class="home-card" data-action="navigate" data-view="ideal">
        <div class="home-card-label">✦ Ideal vs Actual</div>
        ${idealGapMsg
          ? `<div class="home-card-big" style="color:${idealGapOk ? '#00e676' : '#ffab00'};font-size:11px">${idealGapMsg}</div><div class="home-card-hint">View Ideal Week →</div>`
          : `<div class="home-card-empty">Set up your Ideal Week</div><div class="home-card-hint">Define your goals →</div>`}
      </div>`,

    'reading': () => `
      <div class="home-card" data-action="navigate" data-view="tools">
        <div class="home-card-label">📚 Reading</div>
        ${firstBook
          ? `<div class="home-card-big" style="font-size:11px;line-height:1.4">${escapeHtml(firstBook.title)}</div>
             <div class="home-card-sub">${escapeHtml(firstBook.author)}</div>
             <div class="home-card-hint">${state.readingList.length} book${state.readingList.length !== 1 ? 's' : ''} on list →</div>`
          : `<div class="home-card-empty">No reading list</div><div class="home-card-hint">Add books in Tools →</div>`}
      </div>`,

    'scratchpad': () => {
      let h = `<div class="home-card" data-action="toggleScratchpad" data-stop>
        <div class="home-card-label">📝 Scratchpad</div>`;
      if (scratchLines.length > 0) {
        scratchLines.forEach(line => { h += `<div class="home-scratch-line">${escapeHtml(line)}</div>`; });
        h += `<div class="home-card-hint">Tap to open →</div>`;
      } else {
        h += `<div class="home-card-empty">Empty</div><div class="home-card-hint">Tap to write →</div>`;
      }
      return h + `</div>`;
    },

    'grades': () => {
      const overallGrade = getOverallAverage();
      if (overallGrade === null) return '';
      const gradeColor = getGradeColor(overallGrade);
      return `<div class="home-card" data-action="navigate" data-view="grades">
        <div class="home-card-label">📊 Grades</div>
        <div class="home-card-big" style="color:${gradeColor}">${overallGrade}% · ${getLetter(overallGrade)}</div>
        <div class="home-card-hint">View breakdown →</div>
      </div>`;
    },

    'time-tracked': () => {
      const trackedMins = getTodayTotalMinutes();
      const activeTimer = getActiveTimer();
      let h = `<div class="home-card" data-stop><div class="home-card-label">⏱ Time Tracked</div>`;
      if (activeTimer) {
        h += `<div class="home-card-big" style="color:var(--accent)">Running</div>
          <div class="home-card-sub">${escapeHtml(activeTimer.taskText.slice(0,28))}</div>
          <button class="data-btn" data-action="stopTimeTrack" style="margin-top:6px;width:100%;color:#e94560;border-color:#e9456033">■ Stop</button>`;
      } else if (trackedMins > 0) {
        const hh = Math.floor(trackedMins / 60), mm = trackedMins % 60;
        h += `<div class="home-card-big">${hh > 0 ? `${hh}h ` : ''}${mm > 0 ? `${mm}m` : ''} today</div>
          <div class="home-card-hint">Track via task actions →</div>`;
      } else {
        h += `<div class="home-card-empty">Nothing tracked yet</div><div class="home-card-hint">⏱ Track from task menu →</div>`;
      }
      return h + `</div>`;
    },

    'daily-plan': () => {
      const planned   = hasPlanForToday();
      const todayPlan = getTodayPlan();
      let h = `<div class="home-card" data-action="openPlanner" data-stop style="cursor:pointer">
        <div class="home-card-label">📅 Daily Plan</div>`;
      if (planned && todayPlan?.intention) {
        h += `<div class="home-card-big" style="font-size:11px;color:var(--accent);line-height:1.4">"${escapeHtml(todayPlan.intention.slice(0,60))}"</div>`;
        if (todayPlan.mustDo?.length) h += `<div class="home-card-hint">★ ${todayPlan.mustDo.length} must-do task${todayPlan.mustDo.length !== 1 ? 's' : ''}</div>`;
      } else if (planned) {
        h += `<div class="home-card-big" style="color:#00e676;font-size:11px">Plan set ✓</div><div class="home-card-hint">Tap to update →</div>`;
      } else {
        h += `<div class="home-card-empty">Not planned yet</div><div class="home-card-hint">Set today's intention →</div>`;
      }
      return h + `</div>`;
    },

    'habits': () => {
      const habitsCardHtml = renderHabitsHomeCard(escapeHtml);
      if (!habitsCardHtml) return '';
      return `<div class="home-card" data-action="navigate" data-view="habits">${habitsCardHtml}</div>`;
    },

    'inbox': () => {
      const inboxCount = getInboxCount();
      let h = `<div class="home-card" data-action="navigate" data-view="inbox">
        <div class="home-card-label">📥 Inbox</div>`;
      if (inboxCount > 0) {
        h += `<div class="home-card-big" style="color:#ffab00">${inboxCount} item${inboxCount !== 1 ? 's' : ''} to triage</div><div class="home-card-hint">Triage now →</div>`;
      } else {
        h += `<div class="home-card-big" style="color:#00e676;font-size:11px">All clear ✓</div><div class="home-card-hint">Press N to capture →</div>`;
      }
      return h + `</div>`;
    },

    'weekly-review': () => {
      const hasReview = hasReviewForCurrentWeek();
      let h = `<div class="home-card" data-action="navigate" data-view="review">
        <div class="home-card-label">📋 Weekly Review</div>`;
      if (hasReview) {
        h += `<div class="home-card-big" style="color:#00e676;font-size:11px">Review complete ✓</div><div class="home-card-hint">View or redo →</div>`;
      } else {
        h += `<div class="home-card-empty">Not reviewed yet</div><div class="home-card-hint">Reflect on your week →</div>`;
      }
      return h + `</div>`;
    },

    'smart-suggest': () => {
      const suggestion = getSmartSuggestion(schedule, days, state, todayIdx, categories);
      if (!suggestion) return '';
      return `<div class="home-card home-card-accent" data-action="navigate" data-view="schedule">
        <div class="home-card-label">💡 Suggested Next</div>
        <div class="home-card-big" style="font-size:11px;color:var(--accent)">${escapeHtml(suggestion.item.text.slice(0,45))}</div>
        <div class="home-card-sub" style="color:var(--dim);font-size:10px">${escapeHtml(suggestion.reason)}</div>
      </div>`;
    },

    'spaced-reviews': () => {
      const reviewsDue = getTodayReviews();
      if (reviewsDue.length === 0) return '';
      let h = `<div class="home-card" data-stop>
        <div class="home-card-label">🧠 Reviews Due</div>
        <div class="home-card-big" style="color:#cf7aff">${reviewsDue.length} to review</div>`;
      reviewsDue.slice(0, 3).forEach(r => {
        h += `<div style="display:flex;align-items:center;gap:6px;margin-top:4px">
          <span style="font-size:10px;color:var(--text);flex:1">${escapeHtml(r.taskText.slice(0,30))}</span>
          <button class="data-btn" data-action="markSpacedReview" data-review-id="${r.id}" style="font-size:9px;padding:2px 8px;color:#00e676;border-color:#00e67633">✓</button>
          <button class="data-btn" data-action="dismissSpacedReview" data-review-id="${r.id}" style="font-size:9px;padding:2px 8px;color:var(--dim);border-color:var(--border)">✕</button>
        </div>`;
      });
      if (reviewsDue.length > 3) h += `<div style="font-size:9px;color:var(--dim);margin-top:4px">+${reviewsDue.length - 3} more</div>`;
      return h + `</div>`;
    },

    'energy': () => {
      const todayEnergy = getTodayEnergy();
      let h = `<div class="home-card" data-stop><div class="home-card-label">⚡ Energy Level</div>`;
      if (todayEnergy) {
        const emoji = ['', '😴', '😐', '🙂', '💪', '🔥'][todayEnergy];
        h += `<div class="home-card-big">${emoji} ${todayEnergy}/5</div><div class="home-card-hint">Logged today ✓</div>`;
      } else {
        h += `<div class="energy-selector">`;
        [1, 2, 3, 4, 5].forEach(n => {
          const emoji = ['', '😴', '😐', '🙂', '💪', '🔥'][n];
          h += `<button class="energy-btn" data-action="logEnergy" data-level="${n}" title="${n}/5">${emoji}</button>`;
        });
        h += `</div><div class="home-card-hint">How's your energy today?</div>`;
      }
      return h + `</div>`;
    },
  };

  // ── Build header ──
  let html = `<div class="view-page">
    <div class="view-page-header">
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
        <div>
          <h1 class="view-page-title">Good ${_timeOfDay()} ✦</h1>
          <div class="view-page-sub">${escapeHtml(config.semester)} &middot; Week ${weekNum}</div>
        </div>
        <button class="data-btn" data-action="toggleDashboardEdit"
          style="font-size:11px;padding:6px 12px;${editMode ? 'color:#00d2ff;border-color:#00d2ff44' : 'color:var(--dim);border-color:var(--border)'}">
          ${editMode ? '✓ Done' : '⚙ Customize'}
        </button>
      </div>
    </div>`;

  // ── Edit mode panel ──
  if (editMode) {
    html += `<div class="home-card" style="margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--text-bright);margin-bottom:12px">Dashboard Cards</div>
      <div style="display:flex;flex-direction:column;gap:6px">`;
    cardConfig.forEach((c, idx) => {
      const def = CARD_DEFS.find(d => d.id === c.id);
      if (!def) return;
      html += `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
        <label style="display:flex;align-items:center;gap:6px;flex:1;cursor:pointer;font-size:12px">
          <input type="checkbox" ${c.visible ? 'checked' : ''}
            data-change-action="setDashboardCardVisible" data-card-id="${escapeHtml(c.id)}"
            style="width:14px;height:14px;accent-color:var(--accent)">
          ${escapeHtml(def.label)}
        </label>
        <select data-change-action="setDashboardCardSize" data-card-id="${escapeHtml(c.id)}"
          style="font-family:inherit;font-size:10px;background:var(--surface);color:var(--text);
          border:1px solid var(--border);border-radius:6px;padding:3px 6px;cursor:pointer">
          <option value="normal" ${c.size !== 'wide' ? 'selected' : ''}>Normal</option>
          <option value="wide"   ${c.size === 'wide' ? 'selected' : ''}>Wide</option>
        </select>
        <div style="display:flex;gap:4px">
          <button class="data-btn" data-action="moveDashboardCardUp" data-card-id="${escapeHtml(c.id)}"
            style="padding:3px 7px;font-size:10px;${idx === 0 ? 'opacity:0.3;cursor:default' : ''}">↑</button>
          <button class="data-btn" data-action="moveDashboardCardDown" data-card-id="${escapeHtml(c.id)}"
            style="padding:3px 7px;font-size:10px;${idx === cardConfig.length - 1 ? 'opacity:0.3;cursor:default' : ''}">↓</button>
        </div>
      </div>`;
    });
    html += `</div></div>`;
  }

  // ── Card grid ──
  html += `<div class="home-grid">`;

  cardConfig
    .filter(c => c.visible)
    .forEach(c => {
      const renderer = CARDS[c.id];
      if (!renderer) return;
      const cardHtml = renderer(c);
      if (!cardHtml || !cardHtml.trim()) return;
      html += cardHtml;
    });

  html += `</div></div>`;
  return html;
}

function _timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

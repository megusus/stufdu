// ════════════════════════════════════════
// ── Home Dashboard Renderer ──
// ════════════════════════════════════════

import { loadScratchpad } from '../state.js';
import { getIdealGap } from '../ideal.js';
import { hasReviewForCurrentWeek } from '../review.js';
import { getInboxCount } from '../inbox.js';
import { renderHabitsHomeCard } from './habits.js';
import { getTodayHabitSummary } from '../habits.js';
import { loadHabits } from '../habits.js';
import { hasPlanForToday, getTodayPlan } from '../daily-plan.js';
import { getTodayTotalMinutes, getActiveTimer } from '../time-tracking.js';
import { getOverallAverage, getLetter, getGradeColor } from '../grades.js';

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

  const todayName = days[todayIdx] || days[0];
  const todayProg = getDayProgress(todayName);
  const todayDay = schedule[todayName];

  const remaining = todayDay ? (todayDay.sections || []).reduce((sum, s) =>
    sum + s.items.reduce((acc, item) => {
      if (state.taskDeferred[item.id] && state.taskDeferred[item.id] !== todayName) return acc;
      return getStatus(item.id) ? acc : acc + getEstimate(item);
    }, 0), 0) : 0;

  const upcomingDl = [...state.deadlines]
    .map(dl => ({ ...dl, daysLeft: getDaysUntil(dl.date) }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  const todayDate = new Date().toISOString().slice(0, 10);
  const todayMeal = state.mealData[todayDate];

  const scratchText = loadScratchpad() || '';
  const scratchLines = scratchText.split('\n').filter(l => l.trim()).slice(0, 2);

  const firstBook = state.readingList[0];
  const hist = loadHistory();
  const recentWeeks = Object.entries(hist).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);

  // Ideal gap for today
  let idealGapMsg = '';
  let idealGapOk = false;
  try {
    const gap = getIdealGap(state.checked, state.taskDeferred);
    const todayGap = gap[todayName];
    if (todayGap && todayGap.idealTotal > 0) {
      const behind = Math.max(0, todayGap.idealTotal - todayGap.actualDone);
      if (behind === 0) {
        idealGapMsg = `On track with ideal ${escapeHtml(todayName)}`;
        idealGapOk = true;
      } else {
        idealGapMsg = `${behind} task${behind !== 1 ? 's' : ''} behind ideal ${escapeHtml(todayName)}`;
      }
    }
  } catch (e) { /* ideal not configured */ }

  const pct = todayProg.pct;
  const ringColor = pct === 100 ? '#00e676' : pct >= 60 ? '#00d2ff' : pct >= 30 ? '#ffab00' : '#e94560';
  const circumference = 2 * Math.PI * 26;

  let html = `<div class="view-page">
    <div class="view-page-header">
      <h1 class="view-page-title">Good ${_timeOfDay()} ✦</h1>
      <div class="view-page-sub">${escapeHtml(config.semester)} &middot; Week ${weekNum}</div>
    </div>
    <div class="home-grid">`;

  // ── 1. Today's Progress (wide card) ──
  html += `<div class="home-card home-card--wide" data-action="navigate" data-view="schedule">
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
        ${remaining > 0 ? `<div class="home-card-sub">~${formatEst(remaining)} remaining</div>` : pct === 100 && todayProg.total > 0 ? '<div class="home-card-sub" style="color:#00e676">All done!</div>' : ''}
        <div class="home-card-sub">${wp.done}/${wp.total} this week &middot; ${wp.pct}%</div>
      </div>
    </div>
  </div>`;

  // ── 2. Deadlines ──
  html += `<div class="home-card" data-action="navigate" data-view="stats">
    <div class="home-card-label">📅 Upcoming Deadlines</div>`;
  if (upcomingDl.length === 0) {
    html += `<div class="home-card-empty">No deadlines set</div>
      <div class="home-card-hint">Add in Stats →</div>`;
  } else {
    upcomingDl.forEach(dl => {
      const cls = dl.daysLeft < 0 ? 'urgent' : dl.daysLeft <= 3 ? 'urgent' : dl.daysLeft <= 7 ? 'soon' : 'ok';
      const label = dl.daysLeft < 0 ? `${-dl.daysLeft}d ago` : dl.daysLeft === 0 ? 'TODAY' : dl.daysLeft === 1 ? 'tomorrow' : `${dl.daysLeft}d`;
      const c = categories.getColor(dl.cat);
      html += `<div class="home-dl-item">
        <div class="home-dl-dot" style="background:${c.border}"></div>
        <div class="home-dl-name">${escapeHtml(dl.name)}</div>
        <span class="deadline-days ${cls}">${label}</span>
      </div>`;
    });
  }
  html += `</div>`;

  // ── 3. Meal ──
  html += `<div class="home-card" data-action="navigate" data-view="tools">
    <div class="home-card-label">🍽 Today's Meal</div>`;
  const hasMeal = todayMeal && (todayMeal.ogle?.length || todayMeal.aksam?.length || todayMeal.kahvalti?.length);
  if (hasMeal) {
    if (todayMeal.kahvalti?.length) {
      html += `<div class="home-meal-type">Breakfast</div>
        <div class="home-meal-items">${todayMeal.kahvalti.slice(0, 2).map(i => escapeHtml(i)).join(', ')}</div>`;
    }
    if (todayMeal.ogle?.length) {
      html += `<div class="home-meal-type">Lunch</div>
        <div class="home-meal-items">${todayMeal.ogle.slice(0, 3).map(i => escapeHtml(i)).join(', ')}</div>`;
    }
    if (todayMeal.aksam?.length) {
      html += `<div class="home-meal-type">Dinner</div>
        <div class="home-meal-items">${todayMeal.aksam.slice(0, 2).map(i => escapeHtml(i)).join(', ')}</div>`;
    }
  } else {
    html += `<div class="home-card-empty">No meal data for today</div>
      <div class="home-card-hint">Fetch in Tools →</div>`;
  }
  html += `</div>`;

  // ── 4. Streak ──
  html += `<div class="home-card" data-action="navigate" data-view="stats">
    <div class="home-card-label">🔥 Weekly Streak</div>`;
  if (recentWeeks.length > 0) {
    html += `<div class="home-spark">`;
    recentWeeks.forEach(([key, p]) => {
      const h = Math.max(4, Math.round(p * 0.38));
      const c = p >= 80 ? '#00e676' : p >= 50 ? '#00d2ff' : p >= 20 ? '#ffab00' : '#e94560';
      html += `<div class="home-spark-bar" style="height:${h}px;background:${c}" title="${key}: ${p}%"></div>`;
    });
    html += `</div>`;
    const lastPct = recentWeeks[recentWeeks.length - 1]?.[1] ?? 0;
    html += `<div class="home-card-big">${lastPct}% this week</div>`;
  } else {
    html += `<div class="home-card-empty">No history yet</div>
      <div class="home-card-hint">Complete tasks to start →</div>`;
  }
  html += `</div>`;

  // ── 6. Ideal Gap ──
  html += `<div class="home-card" data-action="navigate" data-view="ideal">
    <div class="home-card-label">✦ Ideal vs Actual</div>`;
  if (idealGapMsg) {
    html += `<div class="home-card-big" style="color:${idealGapOk ? '#00e676' : '#ffab00'};font-size:11px">${idealGapMsg}</div>
      <div class="home-card-hint">View Ideal Week →</div>`;
  } else {
    html += `<div class="home-card-empty">Set up your Ideal Week</div>
      <div class="home-card-hint">Define your goals →</div>`;
  }
  html += `</div>`;

  // ── 7. Reading ──
  html += `<div class="home-card" data-action="navigate" data-view="tools">
    <div class="home-card-label">📚 Reading</div>`;
  if (firstBook) {
    html += `<div class="home-card-big" style="font-size:11px;line-height:1.4">${escapeHtml(firstBook.title)}</div>
      <div class="home-card-sub">${escapeHtml(firstBook.author)}</div>
      <div class="home-card-hint">${state.readingList.length} book${state.readingList.length !== 1 ? 's' : ''} on list →</div>`;
  } else {
    html += `<div class="home-card-empty">No reading list</div>
      <div class="home-card-hint">Add books in Tools →</div>`;
  }
  html += `</div>`;

  // ── 8. Scratchpad Preview ──
  html += `<div class="home-card" data-action="toggleScratchpad" data-stop>
    <div class="home-card-label">📝 Scratchpad</div>`;
  if (scratchLines.length > 0) {
    scratchLines.forEach(line => {
      html += `<div class="home-scratch-line">${escapeHtml(line)}</div>`;
    });
    html += `<div class="home-card-hint">Tap to open →</div>`;
  } else {
    html += `<div class="home-card-empty">Empty</div>
      <div class="home-card-hint">Tap to write →</div>`;
  }
  html += `</div>`;

  // ── 9. Grades ──
  const overallGrade = getOverallAverage();
  if (overallGrade !== null) {
    const gradeColor = getGradeColor(overallGrade);
    html += `<div class="home-card" data-action="navigate" data-view="grades">
      <div class="home-card-label">📊 Grades</div>
      <div class="home-card-big" style="color:${gradeColor}">${overallGrade}% · ${getLetter(overallGrade)}</div>
      <div class="home-card-hint">View breakdown →</div>
    </div>`;
  }

  // ── 10. Time Tracked Today ──
  const trackedMins = getTodayTotalMinutes();
  const activeTimer = getActiveTimer();
  html += `<div class="home-card" data-stop>
    <div class="home-card-label">⏱ Time Tracked</div>`;
  if (activeTimer) {
    html += `<div class="home-card-big" style="color:var(--accent)">Running</div>
      <div class="home-card-sub">${escapeHtml(activeTimer.taskText.slice(0,28))}</div>
      <button class="data-btn" data-action="stopTimeTrack" style="margin-top:6px;width:100%;color:#e94560;border-color:#e9456033">■ Stop</button>`;
  } else if (trackedMins > 0) {
    const h = Math.floor(trackedMins / 60), m = trackedMins % 60;
    html += `<div class="home-card-big">${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''} today</div>
      <div class="home-card-hint">Track via task actions →</div>`;
  } else {
    html += `<div class="home-card-empty">Nothing tracked yet</div>
      <div class="home-card-hint">⏱ Track from task menu →</div>`;
  }
  html += `</div>`;

  // ── 10. Daily Plan ──
  const planned = hasPlanForToday();
  const todayPlan = getTodayPlan();
  html += `<div class="home-card" data-action="openPlanner" data-stop style="cursor:pointer">
    <div class="home-card-label">📅 Daily Plan</div>`;
  if (planned && todayPlan?.intention) {
    html += `<div class="home-card-big" style="font-size:11px;color:var(--accent);line-height:1.4">"${escapeHtml(todayPlan.intention.slice(0,60))}"</div>`;
    if (todayPlan.mustDo?.length) {
      html += `<div class="home-card-hint">★ ${todayPlan.mustDo.length} must-do task${todayPlan.mustDo.length !== 1 ? 's' : ''}</div>`;
    }
  } else if (planned) {
    html += `<div class="home-card-big" style="color:#00e676;font-size:11px">Plan set ✓</div>
      <div class="home-card-hint">Tap to update →</div>`;
  } else {
    html += `<div class="home-card-empty">Not planned yet</div>
      <div class="home-card-hint">Set today's intention →</div>`;
  }
  html += `</div>`;

  // ── 10. Habits ──
  const habitsCardHtml = renderHabitsHomeCard(escapeHtml);
  if (habitsCardHtml) {
    html += `<div class="home-card" data-action="navigate" data-view="habits">${habitsCardHtml}</div>`;
  }

  // ── 10. Inbox ──
  const inboxCount = getInboxCount();
  html += `<div class="home-card" data-action="navigate" data-view="inbox">
    <div class="home-card-label">📥 Inbox</div>`;
  if (inboxCount > 0) {
    html += `<div class="home-card-big" style="color:#ffab00">${inboxCount} item${inboxCount !== 1 ? 's' : ''} to triage</div>
      <div class="home-card-hint">Triage now →</div>`;
  } else {
    html += `<div class="home-card-big" style="color:#00e676;font-size:11px">All clear ✓</div>
      <div class="home-card-hint">Press N to capture →</div>`;
  }
  html += `</div>`;

  // ── 10. Weekly Review ──
  const hasReview = hasReviewForCurrentWeek();
  html += `<div class="home-card" data-action="navigate" data-view="review">
    <div class="home-card-label">📋 Weekly Review</div>`;
  if (hasReview) {
    html += `<div class="home-card-big" style="color:#00e676;font-size:11px">Review complete ✓</div>
      <div class="home-card-hint">View or redo →</div>`;
  } else {
    html += `<div class="home-card-empty">Not reviewed yet</div>
      <div class="home-card-hint">Reflect on your week →</div>`;
  }
  html += `</div>`;

  html += `</div></div>`; // .home-grid .view-page
  return html;
}

function _timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

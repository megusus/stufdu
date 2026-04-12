// ════════════════════════════════════════
// ── Stats View Renderer ──
// ════════════════════════════════════════

import { renderStatPanels } from './panels.js';
import { getBurnoutRisk, getBurnoutMessage, getComparativeStats, getHourlyPattern, getPeakHour, getSubjectDifficulty, loadCompletionTimes } from '../analytics.js';
import { loadGoals, isGoalMet, GOAL_PRESETS } from '../goals.js';
import { loadBadges, BADGE_DEFS } from '../badges.js';
import { getOverallAverage } from '../grades.js';
import { loadHabits, loadHabitLog } from '../habits.js';
import { getTodayTotalMinutes, getWeeklyTotalMinutes } from '../time-tracking.js';
import { getDailyChallenge, getLevelInfo, getPersonalBests, loadAchievementProfile } from '../challenges.js';
import { isWeeklyAutoReportEnabled } from '../pdf-report.js';

// ── Contribution Heatmap ──
function _renderHeatmapCtx(loadHistory, escapeHtml) {
  const hist = loadHistory();
  const entries = Object.entries(hist).sort((a, b) => a[0].localeCompare(b[0]));
  if (entries.length < 3) return '';

  // Build a map of weekKey → pct
  const pctMap = Object.fromEntries(entries);

  // Render last 20 weeks as a grid
  const recent = entries.slice(-20);

  const cells = recent.map(([key, pct]) => {
    const color = pct >= 90 ? '#006600' : pct >= 70 ? '#00aa44' : pct >= 50 ? '#00d2ff' : pct >= 20 ? '#ffab00' : '#333';
    const fill  = pct >= 90 ? '#00e676' : pct >= 70 ? '#00c853' : pct >= 50 ? '#00d2ff' : pct >= 20 ? '#ffab00' : '#e94560';
    return `<div title="${escapeHtml(key)}: ${pct}%" style="width:20px;height:20px;background:${fill}22;border-radius:3px;
      border:1px solid ${fill}44;display:flex;align-items:center;justify-content:center;position:relative;cursor:default">
      <div style="width:${Math.max(2, Math.round(pct/100*14))}px;height:${Math.max(2, Math.round(pct/100*14))}px;
        background:${fill};border-radius:2px"></div>
    </div>`;
  }).join('');

  const avg = Math.round(entries.reduce((s, [, p]) => s + p, 0) / entries.length);
  const best = Math.max(...entries.map(([, p]) => p));

  return `<div class="analytics-card">
    <div class="analytics-card-title">📅 Study History</div>
    <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px">${cells}</div>
    <div class="analytics-stats-row">
      <div class="analytics-stat">
        <div class="analytics-stat-val">${entries.length}</div>
        <div class="analytics-stat-label">Weeks tracked</div>
      </div>
      <div class="analytics-stat">
        <div class="analytics-stat-val">${avg}%</div>
        <div class="analytics-stat-label">Average</div>
      </div>
      <div class="analytics-stat">
        <div class="analytics-stat-val" style="color:#00e676">${best}%</div>
        <div class="analytics-stat-label">Best week</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:10px;color:var(--dim)">
      Less
      ${['#e9456022','#ffab0033','#00d2ff33','#00c85333','#00e67644'].map(c =>
        `<div style="width:12px;height:12px;background:${c};border-radius:2px;border:1px solid ${c.replace('22','66').replace('33','66').replace('44','88')}"></div>`
      ).join('')}
      More
    </div>
  </div>`;
}

function _todayKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function _longestWeekStreak(history) {
  let cur = 0, best = 0;
  Object.entries(history).sort((a, b) => a[0].localeCompare(b[0])).forEach(([, pct]) => {
    if (pct >= 50) { cur++; best = Math.max(best, cur); }
    else cur = 0;
  });
  return best;
}

function _buildAchievementSnapshot(ctx) {
  const { state, days, todayIdx, schedule, getStatus, getDayProgress, getDayLabel, loadHistory, weekKey, wp, nowInTZ } = ctx;
  const todayName = days[todayIdx] || days[0];
  const today = schedule[todayName];
  const times = loadCompletionTimes();
  let earlyDone = 0;
  const subjects = new Set();

  (today?.sections || []).forEach(sec => {
    (sec.items || []).forEach(item => {
      if (getStatus(item.id) !== 'done') return;
      const completedAt = times[item.id] || '';
      const hour = parseInt(completedAt.split(':')[0], 10);
      if (!Number.isNaN(hour) && hour < 12) earlyDone++;
      if (item.cat && item.cat !== 'routine' && item.cat !== 'reflect') subjects.add(item.cat);
    });
  });

  const now = nowInTZ ? nowInTZ() : new Date();
  const habitLog = loadHabitLog();
  const habits = loadHabits();
  const todayKey = _todayKey(now);
  const habitsDone = habits.filter(h => habitLog[todayKey]?.[h.id]).length;
  const history = loadHistory();
  const dayProgress = days.map(day => {
    const p = getDayProgress(day);
    return { label: getDayLabel(day), done: p.done, total: p.total, pct: p.pct };
  });

  return {
    weekKey,
    weekPct: wp.pct,
    totalDone: wp.done,
    todayDone: getDayProgress(todayName).done,
    todayTotal: getDayProgress(todayName).total,
    earlyDone,
    timeMins: getTodayTotalMinutes(),
    weeklyTimeMins: getWeeklyTotalMinutes(schedule, days),
    habitsDone,
    habitTotal: habits.length,
    subjectsDone: subjects.size,
    gradeAvg: getOverallAverage(),
    history,
    longestWeekStreak: _longestWeekStreak(history),
    dayProgress,
  };
}

// ── Achievement Badges ──
function _renderBadges(escapeHtml) {
  const earned = loadBadges();
  const earnedKeys = Object.keys(earned);
  if (earnedKeys.length === 0) return '';

  const badgeHtml = BADGE_DEFS.filter(b => earned[b.id]).map(b => {
    const ago = earned[b.id]?.earnedAt
      ? _timeAgo(earned[b.id].earnedAt)
      : '';
    return `<div class="badge-card" title="${escapeHtml(b.name)}: ${escapeHtml(b.desc)}">
      <span class="badge-icon">${b.icon}</span>
      <div class="badge-name">${escapeHtml(b.name)}</div>
      ${ago ? `<div class="badge-ago">${ago}</div>` : ''}
    </div>`;
  }).join('');

  return `<div class="analytics-card achievement-panel">
    <div class="analytics-card-title">🏅 Achievements (${earnedKeys.length}/${BADGE_DEFS.length})</div>
    <div class="achievement-badge-strip">${badgeHtml}</div>
  </div>`;
}

function _renderAchievementBoard(ctx) {
  const { escapeHtml, nowInTZ } = ctx;
  const snapshot = _buildAchievementSnapshot(ctx);
  const profile = loadAchievementProfile();
  const level = getLevelInfo(profile.xp);
  const challenge = getDailyChallenge(snapshot, nowInTZ ? nowInTZ() : new Date());
  const bests = getPersonalBests(snapshot);
  const eventHtml = (profile.events || []).slice(0, 4).map(ev =>
    `<div class="achievement-event">
      <span>${ev.shield ? '🛡' : '+' + ev.amount + 'xp'}</span>
      <strong>${escapeHtml(ev.label)}</strong>
    </div>`
  ).join('');
  const weeklyTime = snapshot.weeklyTimeMins > 0
    ? `${Math.floor(snapshot.weeklyTimeMins / 60)}h ${snapshot.weeklyTimeMins % 60}m`
    : '0m';

  return `<div class="achievement-hero analytics-card">
    <div class="achievement-hero-top">
      <div>
        <div class="analytics-card-title">◇ Level ${level.level} Scholar</div>
        <div class="achievement-xp-line">${profile.xp}xp total · ${level.needed}xp to level ${level.level + 1}</div>
      </div>
      <div class="achievement-shields">🛡 ${profile.shields}</div>
    </div>
    <div class="achievement-xp-track"><div class="achievement-xp-fill" style="width:${level.pct}%"></div></div>
    <div class="achievement-grid">
      <div class="achievement-card">
        <div class="achievement-card-kicker">Today</div>
        <div class="achievement-card-title">${challenge.icon} ${escapeHtml(challenge.title)}</div>
        <div class="achievement-card-copy">${escapeHtml(challenge.desc)}</div>
        <div class="challenge-meter"><div class="challenge-meter-fill" style="width:${challenge.pct}%"></div></div>
        <div class="challenge-row">
          <span>${challenge.progress}/${challenge.target}</span>
          ${challenge.claimed
            ? '<span class="challenge-claimed">claimed</span>'
            : `<button class="data-btn" data-action="claimDailyChallenge" ${challenge.complete ? '' : 'disabled'}
                style="font-size:10px;color:var(--accent);border-color:#00d2ff44">Claim +${challenge.xp}xp</button>`}
        </div>
      </div>
      <div class="achievement-card">
        <div class="achievement-card-kicker">Personal Bests</div>
        <div class="personal-best-row"><span>Best week</span><strong>${escapeHtml(bests.bestWeek.key)} · ${bests.bestWeek.pct}%</strong></div>
        <div class="personal-best-row"><span>Longest streak</span><strong>${bests.longestStreak} week${bests.longestStreak === 1 ? '' : 's'}</strong></div>
        <div class="personal-best-row"><span>Best day</span><strong>${escapeHtml(bests.bestDay.label)} · ${bests.bestDay.done} tasks</strong></div>
        <div class="personal-best-row"><span>Time this week</span><strong>${weeklyTime}</strong></div>
      </div>
      <div class="achievement-card achievement-card--events">
        <div class="achievement-card-kicker">Recent XP</div>
        ${eventHtml || '<div class="achievement-empty">Complete tasks, habits, focus sessions, and reviews to build XP.</div>'}
      </div>
    </div>
  </div>`;
}

function _timeAgo(ts) {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60)        return 'just now';
  if (secs < 3600)      return `${Math.floor(secs/60)}m ago`;
  if (secs < 86400)     return `${Math.floor(secs/3600)}h ago`;
  if (secs < 86400*30)  return `${Math.floor(secs/86400)}d ago`;
  return `${Math.floor(secs/86400/30)}mo ago`;
}

export function renderStatsView(ctx) {
  try {
    const { wp, formatEst, escapeHtml, categories } = ctx;

    const risk = getBurnoutRisk();
    const burnoutMsg = getBurnoutMessage(risk);
    const comparative = getComparativeStats();
    const goals = loadGoals();
    const peakHour = getPeakHour();
    const hourlyPattern = getHourlyPattern();
    const difficulty = getSubjectDifficulty(categories);

    let extra = '';

    // Burnout alert
    if (burnoutMsg) {
      const bgColor = risk === 'high' ? '#e9456022' : '#ffab0022';
      const borderColor = risk === 'high' ? '#e9456066' : '#ffab0066';
      extra += `<div class="analytics-alert" style="background:${bgColor};border-color:${borderColor}">
        ${escapeHtml(burnoutMsg)}
      </div>`;
    }

    // Comparative stats
    if (comparative) {
      const { current, deltaLast, deltaAvg, best } = comparative;
      extra += `<div class="analytics-card">
        <div class="analytics-card-title">📈 Comparative</div>
        <div class="analytics-stats-row">
          <div class="analytics-stat"><div class="analytics-stat-val">${current}%</div><div class="analytics-stat-label">This week</div></div>
          ${deltaLast !== null ? `<div class="analytics-stat"><div class="analytics-stat-val" style="color:${deltaLast >= 0 ? '#00e676' : '#e94560'}">${deltaLast >= 0 ? '+' : ''}${deltaLast}%</div><div class="analytics-stat-label">vs last week</div></div>` : ''}
          ${deltaAvg !== null ? `<div class="analytics-stat"><div class="analytics-stat-val" style="color:${deltaAvg >= 0 ? '#00e676' : '#e94560'}">${deltaAvg >= 0 ? '+' : ''}${deltaAvg}%</div><div class="analytics-stat-label">vs 4-wk avg</div></div>` : ''}
          <div class="analytics-stat"><div class="analytics-stat-val" style="color:#00e676">${best}%</div><div class="analytics-stat-label">Best week</div></div>
        </div>
      </div>`;
    }

    // Peak productivity hour
    if (peakHour !== null) {
      const ampm = peakHour < 12 ? `${peakHour || 12}am` : `${peakHour === 12 ? 12 : peakHour - 12}pm`;
      extra += `<div class="analytics-card">
        <div class="analytics-card-title">🕐 Productive Hours</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px">Peak: <strong style="color:var(--accent)">${ampm}</strong></div>
        <div class="hourly-chart">
          ${hourlyPattern.map((c, h) => {
            const max = Math.max(...hourlyPattern, 1);
            const pct = Math.round((c / max) * 100);
            const show = h >= 6 && h <= 22;
            if (!show) return '';
            return `<div class="hourly-bar-wrap" title="${h}:00 — ${c} tasks">
              <div class="hourly-bar" style="height:${Math.max(2, pct)}%"></div>
              ${h % 4 === 0 ? `<div class="hourly-label">${h}</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }

    // Subject difficulty
    const diffEntries = Object.entries(difficulty).filter(([, d]) => d.total >= 3);
    if (diffEntries.length > 0) {
      extra += `<div class="analytics-card">
        <div class="analytics-card-title">🧠 Subject Difficulty</div>
        ${diffEntries.sort(([,a],[,b]) => b.score - a.score).map(([cat, d]) => {
          const c = categories.getColor(cat);
          const stars = '●'.repeat(d.score) + '○'.repeat(5 - d.score);
          return `<div class="difficulty-row">
            <span class="difficulty-cat" style="color:${c.border}">${escapeHtml(categories.getLabel(cat) || cat)}</span>
            <span class="difficulty-stars">${stars}</span>
            <span class="difficulty-score">${d.score}/5</span>
          </div>`;
        }).join('')}
      </div>`;
    }

    // Goals
    if (goals.length > 0) {
      extra += `<div class="analytics-card">
        <div class="analytics-card-title">🎯 Goals</div>
        ${goals.map(g => {
          const pct = Math.min(100, Math.round((g.current / g.target) * 100));
          const met = isGoalMet(g);
          const color = met ? '#00e676' : pct >= 50 ? '#00d2ff' : '#ffab00';
          return `<div class="goal-item">
            <span class="goal-icon">${g.icon}</span>
            <div class="goal-info">
              <div class="goal-label">${escapeHtml(g.label)}</div>
              <div class="goal-bar-wrap">
                <div class="goal-bar" style="width:${pct}%;background:${color}"></div>
              </div>
            </div>
            <div class="goal-stat" style="color:${color}">${g.current}/${g.target}${g.unit}</div>
            <button class="editor-remove-btn" data-action="removeGoal" data-id="${escapeHtml(g.id)}" title="Remove">✕</button>
          </div>`;
        }).join('')}
      </div>`;
    }

    // Add goal form
    extra += `<div class="analytics-card">
      <div class="analytics-card-title">+ Add Goal</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
        ${GOAL_PRESETS.map(p =>
          `<button class="habit-preset-btn" data-action="addGoalPreset"
            data-type="${p.type}" data-label="${escapeHtml(p.label)}"
            data-target="${p.target}" data-unit="${p.unit}" data-icon="${p.icon}"
            style="font-size:10px">${p.icon} ${escapeHtml(p.label)}</button>`
        ).join('')}
      </div>
    </div>`;

    // Contribution heatmap
    extra += _renderHeatmapCtx(ctx.loadHistory, escapeHtml);

    // Achievement progression + badges
    extra += _renderAchievementBoard(ctx);
    extra += _renderBadges(escapeHtml);

    // PDF report button
    extra += `<div class="analytics-card">
      <div class="analytics-card-title">📄 Reports</div>
      <button class="data-btn" data-action="generatePDFReport"
        style="width:100%;color:#00d2ff;border-color:#00d2ff44;padding:10px;font-size:12px">
        📊 Export Weekly Report (Print/PDF)
      </button>
      <label class="report-auto-row">
        <input type="checkbox" data-change-action="toggleWeeklyAutoReport" ${isWeeklyAutoReportEnabled() ? 'checked' : ''}>
        <span>Auto-generate on Sundays</span>
      </label>
    </div>`;

    return `<div class="view-page">
      <div class="view-page-header">
        <h1 class="view-page-title">◈ Stats</h1>
        <div class="view-page-sub">Weekly streak, deadlines, summaries &mdash; ${wp.done}/${wp.total} tasks this week (${wp.pct}%)</div>
      </div>
      ${extra}
      ${renderStatPanels(ctx)}
    </div>`;
  } catch (err) {
    console.error('[render] StatsView failed:', err);
    return `<div style="padding:24px;color:#e94560">Stats view error: ${ctx.escapeHtml(String(err))}</div>`;
  }
}

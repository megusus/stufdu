// ════════════════════════════════════════
// ── PDF / Print Report Generator ──
// ════════════════════════════════════════

import { CONFIG }                            from './config.js';
import { DAYS, schedule, getDayLabel }       from './schedule.js';
import { loadHistory, getWeeklyProgress, getDayProgress, nowInTZ, getWeekNum } from './state.js';
import { loadHabits, getHabitStreak, loadHabitLog } from './habits.js';
import { loadGoals, isGoalMet }              from './goals.js';
import { getOverallAverage, loadGrades, getCatAverage } from './grades.js';
import { getTodayTotalMinutes, getWeeklyTotalMinutes, loadTimeLog } from './time-tracking.js';
import { CategoryRegistry }                  from './categories.js';

function _esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function generateWeeklyReport() {
  const wp      = getWeeklyProgress();
  const hist    = loadHistory();
  const habits  = loadHabits();
  const goals   = loadGoals();
  const grades  = loadGrades();
  const gradeAvg = getOverallAverage();
  const now     = nowInTZ();
  const weekNum = getWeekNum();
  const weeklyMins = getWeeklyTotalMinutes();

  const recentWeeks = Object.entries(hist)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8);

  // Streak bars for recent weeks
  const sparkBars = recentWeeks.map(([, p]) => {
    const h = Math.max(4, Math.round(p * 0.3));
    const c = p >= 80 ? '#00e676' : p >= 50 ? '#00d2ff' : p >= 20 ? '#ffab00' : '#e94560';
    return `<div style="width:20px;height:${h}px;background:${c};border-radius:2px;display:inline-block;margin-right:3px;vertical-align:bottom" title="${p}%"></div>`;
  }).join('');

  // Daily breakdown
  const dayRows = DAYS.map(d => {
    const p = getDayProgress(d);
    if (p.total === 0) return '';
    const bar = Math.round(p.pct / 10);
    const fill = '█'.repeat(bar) + '░'.repeat(10 - bar);
    return `<tr>
      <td>${_esc(getDayLabel(d))}</td>
      <td>${p.done}/${p.total}</td>
      <td style="color:${p.pct >= 80 ? '#00844d' : p.pct >= 50 ? '#0077a8' : '#a85c00'}">${p.pct}%</td>
      <td style="font-family:monospace;font-size:10px;letter-spacing:-1px">${fill}</td>
    </tr>`;
  }).filter(Boolean).join('');

  // Habits
  const habitRows = habits.map(h => {
    const streak = getHabitStreak(h.id);
    return `<tr><td>${_esc(h.icon)} ${_esc(h.name)}</td><td>${streak} day streak</td></tr>`;
  }).join('');

  // Goals
  const goalRows = goals.map(g => {
    const pct = Math.min(100, Math.round((g.current / g.target) * 100));
    const met = isGoalMet(g);
    return `<tr>
      <td>${_esc(g.icon)} ${_esc(g.label)}</td>
      <td>${g.current}/${g.target}${_esc(g.unit)}</td>
      <td style="color:${met ? '#00844d' : '#a85c00'}">${pct}% ${met ? '✓' : ''}</td>
    </tr>`;
  }).join('');

  // Grade breakdown
  const catKeys = Object.keys(grades);
  const gradeRows = catKeys.map(cat => {
    const avg = getCatAverage(cat);
    if (avg === null) return '';
    const label = CategoryRegistry.getLabel(cat) || cat;
    return `<tr><td>${_esc(label)}</td><td>${avg}%</td></tr>`;
  }).filter(Boolean).join('');

  const h = weeklyMins > 0 ? Math.floor(weeklyMins / 60) : 0;
  const m = weeklyMins > 0 ? weeklyMins % 60 : 0;
  const weeklyTimeStr = weeklyMins > 0 ? `${h}h ${m}m` : '—';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Study Report — Week ${weekNum} — ${now.toLocaleDateString()}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'JetBrains Mono', 'Courier New', monospace; max-width: 820px; margin: 36px auto; color: #1a1a1a; line-height: 1.6; font-size: 13px; }
    h1 { font-size: 22px; color: #09090b; border-bottom: 3px solid #00d2ff; padding-bottom: 10px; margin-bottom: 6px; }
    h2 { font-size: 14px; font-weight: 700; margin: 28px 0 8px; color: #333; border-left: 3px solid #00d2ff; padding-left: 10px; }
    .meta { color: #666; font-size: 11px; margin-bottom: 24px; }
    .summary { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
    .stat { background: #f5f5f5; padding: 14px 20px; border-radius: 8px; min-width: 120px; text-align: center; border-top: 3px solid #00d2ff; }
    .stat-val { font-size: 26px; font-weight: 700; color: #09090b; }
    .stat-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 12px; }
    td, th { padding: 7px 10px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f5f5f5; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .spark { margin: 8px 0 4px; }
    footer { margin-top: 32px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
    @media print {
      body { margin: 16px; max-width: 100%; font-size: 11px; }
      h1 { font-size: 18px; }
      h2 { margin: 16px 0 6px; }
      .summary { gap: 10px; }
      .stat { min-width: 90px; padding: 10px 14px; }
      .stat-val { font-size: 20px; }
    }
  </style>
</head>
<body>
  <h1>📊 Weekly Study Report</h1>
  <p class="meta">${_esc(CONFIG.semester)} &middot; Week ${weekNum} &middot; Generated ${now.toLocaleString()}</p>

  <div class="summary">
    <div class="stat">
      <div class="stat-val">${wp.pct}%</div>
      <div class="stat-label">Weekly Progress</div>
    </div>
    <div class="stat">
      <div class="stat-val">${wp.done}/${wp.total}</div>
      <div class="stat-label">Tasks Done</div>
    </div>
    <div class="stat">
      <div class="stat-val">${weeklyTimeStr}</div>
      <div class="stat-label">Time Tracked</div>
    </div>
    ${gradeAvg !== null ? `<div class="stat"><div class="stat-val">${gradeAvg}%</div><div class="stat-label">Grade Avg</div></div>` : ''}
  </div>

  ${dayRows ? `<h2>Daily Breakdown</h2>
  <table>
    <tr><th>Day</th><th>Tasks</th><th>%</th><th>Progress</th></tr>
    ${dayRows}
  </table>` : ''}

  ${recentWeeks.length > 1 ? `<h2>Recent Weeks</h2>
  <div class="spark">${sparkBars}</div>
  <table>
    <tr><th>Week</th><th>Completion</th></tr>
    ${recentWeeks.map(([k, p]) => `<tr><td>${_esc(k)}</td><td style="color:${p >= 80 ? '#00844d' : p >= 50 ? '#0077a8' : '#a85c00'}">${p}%</td></tr>`).join('')}
  </table>` : ''}

  ${habitRows ? `<h2>Habit Streaks</h2>
  <table>
    <tr><th>Habit</th><th>Status</th></tr>
    ${habitRows}
  </table>` : ''}

  ${gradeRows ? `<h2>Grades</h2>
  <table>
    <tr><th>Subject</th><th>Average</th></tr>
    ${gradeRows}
  </table>` : ''}

  ${goalRows ? `<h2>Goals</h2>
  <table>
    <tr><th>Goal</th><th>Progress</th><th>Status</th></tr>
    ${goalRows}
  </table>` : ''}

  <footer>${_esc(CONFIG.appTitle)} &middot; ${now.toLocaleDateString()} &middot; Week ${weekNum}</footer>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Please allow popups to view the report.'); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 600);
}

// ════════════════════════════════════════
// ── PDF / Print Report Generator ──
// ════════════════════════════════════════

import { CONFIG } from './config.js';
import { DAYS, schedule, getDayLabel } from './schedule.js';
import { loadHistory, getWeeklyProgress, getDayProgress, nowInTZ, getWeekNum, getWeekKey, getStatus, STATUS_DONE } from './state.js';
import { loadHabits, getHabitStreak, loadHabitLog } from './habits.js';
import { loadGoals, isGoalMet } from './goals.js';
import { getOverallAverage, loadGrades, getCatAverage } from './grades.js';
import { getWeeklyTotalMinutes, getWeeklyTimeByCategory } from './time-tracking.js';
import { CategoryRegistry } from './categories.js';
import { Storage } from './storage.js';

const AUTO_KEY = 'pdf-report-auto-weekly';
const AUTO_LAST_KEY = 'pdf-report-auto-last';

function _esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _fmtMins(mins) {
  if (!mins) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m ? `${m}m` : ''}`.trim() : `${m}m`;
}

function _pctColor(pct) {
  if (pct >= 85) return '#087f5b';
  if (pct >= 60) return '#0b7285';
  if (pct >= 35) return '#9a6700';
  return '#c92a2a';
}

function _weekDates() {
  const now = nowInTZ();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const start = new Date(now);
  start.setDate(start.getDate() - dow);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

function _dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function _completionBySubject(grades, timeByCat) {
  const cats = new Set([...CategoryRegistry.keys(), ...Object.keys(grades || {}), ...Object.keys(timeByCat || {})]);
  return [...cats].map(cat => {
    let total = 0, done = 0;
    DAYS.forEach(day => {
      (schedule[day]?.sections || []).forEach(sec => (sec.items || []).forEach(item => {
        if (item.cat !== cat) return;
        total++;
        if (getStatus(item.id) === STATUS_DONE) done++;
      }));
    });
    const pct = total ? Math.round(done / total * 100) : 0;
    const grade = getCatAverage(cat);
    return {
      cat,
      label: CategoryRegistry.getLabel(cat) || cat,
      color: CategoryRegistry.getColor(cat).border || '#00d2ff',
      total,
      done,
      pct,
      grade,
      mins: timeByCat[cat] || 0,
    };
  }).filter(row => row.total || row.grade !== null || row.mins);
}

function _lastSevenHabitCount(habitId) {
  const log = loadHabitLog();
  let count = 0;
  const today = nowInTZ();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (log[_dateKey(d)]?.[habitId]) count++;
  }
  return count;
}

function _bars(entries) {
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return entries.map(([label, value]) => {
    const pct = Math.round((value / max) * 100);
    return `<div class="bar-row">
      <span>${_esc(label)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <strong>${_esc(_fmtMins(value))}</strong>
    </div>`;
  }).join('');
}

export function isWeeklyAutoReportEnabled() {
  return Storage.getRaw(AUTO_KEY, '') === '1';
}

export function setWeeklyAutoReport(enabled) {
  Storage.setRaw(AUTO_KEY, enabled ? '1' : '');
}

export function maybeAutoGenerateWeeklyReport() {
  if (!isWeeklyAutoReportEnabled()) return false;
  const now = nowInTZ();
  if (now.getDay() !== 0) return false;
  const key = `${now.getFullYear()}-${getWeekKey()}`;
  if (Storage.getRaw(AUTO_LAST_KEY, '') === key) return false;
  Storage.setRaw(AUTO_LAST_KEY, key);
  setTimeout(() => generateWeeklyReport({ auto: true }), 1200);
  return true;
}

export function generateWeeklyReport({ auto = false } = {}) {
  const wp = getWeeklyProgress();
  const hist = loadHistory();
  const habits = loadHabits();
  const goals = loadGoals();
  const grades = loadGrades();
  const gradeAvg = getOverallAverage();
  const now = nowInTZ();
  const weekNum = getWeekNum();
  const { start, end } = _weekDates();
  const timeByCat = getWeeklyTimeByCategory(schedule, DAYS);
  const weeklyMins = getWeeklyTotalMinutes(schedule, DAYS);
  const subjectRows = _completionBySubject(grades, timeByCat).sort((a, b) => (b.mins + b.done * 20) - (a.mins + a.done * 20));

  const dailyRows = DAYS.map(day => {
    const p = getDayProgress(day);
    if (!p.total) return '';
    return `<tr>
      <td>${_esc(getDayLabel(day))}</td>
      <td>${p.done}/${p.total}</td>
      <td><div class="mini-track"><div style="width:${p.pct}%;background:${_pctColor(p.pct)}"></div></div></td>
      <td class="num" style="color:${_pctColor(p.pct)}">${p.pct}%</td>
    </tr>`;
  }).join('');

  const subjectTable = subjectRows.map(row => `<tr>
    <td><span class="swatch" style="background:${row.color}"></span>${_esc(row.label)}</td>
    <td>${row.total ? `${row.done}/${row.total}` : '—'}</td>
    <td>${row.grade !== null ? `${row.grade}%` : '—'}</td>
    <td>${_fmtMins(row.mins)}</td>
  </tr>`).join('');

  const habitRows = habits.map(h => {
    const streak = getHabitStreak(h.id);
    const count = _lastSevenHabitCount(h.id);
    const pct = Math.round((count / 7) * 100);
    return `<tr>
      <td>${_esc(h.icon)} ${_esc(h.name)}</td>
      <td>${count}/7</td>
      <td><div class="mini-track"><div style="width:${pct}%;background:${h.color || '#00d2ff'}"></div></div></td>
      <td>${streak.streak}d streak</td>
    </tr>`;
  }).join('');

  const goalRows = goals.map(g => {
    const pct = Math.min(100, Math.round((g.current / g.target) * 100));
    return `<tr>
      <td>${_esc(g.icon)} ${_esc(g.label)}</td>
      <td>${_esc(g.current)}/${_esc(g.target)}${_esc(g.unit)}</td>
      <td><div class="mini-track"><div style="width:${pct}%;background:${isGoalMet(g) ? '#087f5b' : '#0b7285'}"></div></div></td>
      <td>${pct}%</td>
    </tr>`;
  }).join('');

  const recentWeeks = Object.entries(hist).sort((a, b) => a[0].localeCompare(b[0])).slice(-10);
  const weekBars = recentWeeks.map(([key, pct]) => `<div class="week-bar">
    <div class="week-fill" style="height:${Math.max(4, pct)}%;background:${_pctColor(pct)}"></div>
    <span>${_esc(key.replace(CONFIG.storagePrefix + '-', ''))}</span>
  </div>`).join('');
  const timeBars = _bars(Object.entries(timeByCat).map(([cat, mins]) => [CategoryRegistry.getLabel(cat) || cat, mins]));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Study Report · Week ${weekNum}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f4f1ea;
      color: #171717;
      font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif;
      line-height: 1.5;
      font-size: 13px;
    }
    .page {
      width: min(920px, calc(100vw - 40px));
      margin: 32px auto;
      background: #fffdf8;
      border: 1px solid #d8d0c1;
      box-shadow: 0 24px 70px rgba(35, 29, 20, 0.18);
      padding: 38px;
    }
    .masthead {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 24px;
      border-bottom: 4px double #171717;
      padding-bottom: 22px;
      margin-bottom: 24px;
    }
    .eyebrow { font: 700 10px ui-monospace, "SFMono-Regular", monospace; letter-spacing: 1.8px; text-transform: uppercase; color: #64615a; }
    h1 { margin: 5px 0 6px; font-size: 34px; line-height: 1.05; letter-spacing: -0.02em; }
    .meta { color: #64615a; font: 11px ui-monospace, "SFMono-Regular", monospace; }
    .seal {
      width: 96px; height: 96px; border: 2px solid #171717; border-radius: 50%;
      display: grid; place-items: center; font: 900 20px ui-monospace, monospace;
      background: radial-gradient(circle, #eaf9ff, #fffdf8 66%);
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .stat {
      border: 1px solid #ded7c8;
      border-radius: 8px;
      padding: 14px;
      background: #fbf8f0;
    }
    .stat-val { font: 900 26px ui-monospace, "SFMono-Regular", monospace; line-height: 1; }
    .stat-label { margin-top: 6px; font: 700 9px ui-monospace, monospace; letter-spacing: 1.2px; text-transform: uppercase; color: #6f6a60; }
    h2 {
      margin: 24px 0 10px;
      font-size: 15px;
      font-family: ui-monospace, "SFMono-Regular", monospace;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .grid-2 { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    td, th { padding: 8px 7px; border-bottom: 1px solid #e6dfd0; text-align: left; vertical-align: middle; }
    th { font: 800 9px ui-monospace, monospace; letter-spacing: 1px; text-transform: uppercase; color: #6f6a60; }
    .num { font-family: ui-monospace, monospace; font-weight: 800; text-align: right; }
    .mini-track { height: 7px; background: #eee7d8; border-radius: 8px; overflow: hidden; }
    .mini-track div { height: 100%; border-radius: inherit; }
    .swatch { display:inline-block; width:8px; height:8px; border-radius:2px; margin-right:7px; }
    .week-chart { height: 150px; display: flex; gap: 9px; align-items: end; padding: 14px 6px 0; border: 1px solid #ded7c8; border-radius: 8px; background:#fbf8f0; }
    .week-bar { flex: 1; height: 126px; display: flex; flex-direction: column; align-items:center; justify-content:flex-end; gap: 5px; }
    .week-fill { width: 100%; min-height: 4px; border-radius: 5px 5px 2px 2px; }
    .week-bar span { font: 8px ui-monospace, monospace; color:#6f6a60; writing-mode: vertical-rl; max-height: 45px; overflow: hidden; }
    .bar-row { display:grid; grid-template-columns: 86px 1fr 54px; gap:8px; align-items:center; font-size:11px; margin-bottom:7px; }
    .bar-track { height: 8px; background:#eee7d8; border-radius:8px; overflow:hidden; }
    .bar-fill { height:100%; background:#0b7285; border-radius:inherit; }
    footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #ded7c8; color: #7b7467; font: 10px ui-monospace, monospace; display:flex; justify-content:space-between; }
    @media print {
      body { background: white; }
      .page { width: auto; margin: 0; border: 0; box-shadow: none; padding: 18px; }
      .summary { grid-template-columns: repeat(4, 1fr); }
      h1 { font-size: 28px; }
      .stat-val { font-size: 21px; }
      .grid-2 { gap: 12px; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="masthead">
      <div>
        <div class="eyebrow">${auto ? 'Auto-generated report' : 'Weekly study dossier'}</div>
        <h1>${_esc(CONFIG.appTitle)} · Week ${weekNum}</h1>
        <div class="meta">${_esc(CONFIG.semester)} · ${start.toLocaleDateString()} – ${end.toLocaleDateString()} · Generated ${now.toLocaleString()}</div>
      </div>
      <div class="seal">${wp.pct}%</div>
    </header>

    <section class="summary">
      <div class="stat"><div class="stat-val">${wp.done}/${wp.total}</div><div class="stat-label">Tasks Completed</div></div>
      <div class="stat"><div class="stat-val">${wp.pct}%</div><div class="stat-label">Weekly Progress</div></div>
      <div class="stat"><div class="stat-val">${_fmtMins(weeklyMins)}</div><div class="stat-label">Tracked Time</div></div>
      <div class="stat"><div class="stat-val">${gradeAvg !== null ? gradeAvg + '%' : '—'}</div><div class="stat-label">Grade Average</div></div>
    </section>

    <div class="grid-2">
      <section>
        <h2>Daily Summary</h2>
        <table><tr><th>Day</th><th>Tasks</th><th>Completion</th><th class="num">%</th></tr>${dailyRows}</table>
      </section>
      <section>
        <h2>Streak History</h2>
        <div class="week-chart">${weekBars || '<div style="color:#7b7467">No history yet.</div>'}</div>
      </section>
    </div>

    ${subjectTable ? `<section><h2>Subject Breakdown</h2><table><tr><th>Subject</th><th>Tasks</th><th>Grade</th><th>Time</th></tr>${subjectTable}</table></section>` : ''}
    ${habitRows ? `<section><h2>Habit Completion</h2><table><tr><th>Habit</th><th>Week</th><th>Completion</th><th>Streak</th></tr>${habitRows}</table></section>` : ''}
    ${goalRows ? `<section><h2>Goal Progress</h2><table><tr><th>Goal</th><th>Progress</th><th>Bar</th><th>%</th></tr>${goalRows}</table></section>` : ''}
    ${Object.keys(timeByCat).length ? `<section><h2>Time Tracked</h2>${timeBars}</section>` : ''}

    <footer><span>${_esc(CONFIG.appTitle)}</span><span>${now.toLocaleDateString()} · printable PDF</span></footer>
  </main>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Please allow popups to view the report.'); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 600);
}

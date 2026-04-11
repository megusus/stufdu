// ════════════════════════════════════════
// ── Stats View Renderer ──
// ════════════════════════════════════════

import { renderStatPanels } from './panels.js';
import { getBurnoutRisk, getBurnoutMessage, getComparativeStats, getHourlyPattern, getPeakHour, getSubjectDifficulty } from '../analytics.js';
import { loadGoals, isGoalMet, GOAL_PRESETS } from '../goals.js';

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

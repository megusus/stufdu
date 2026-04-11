// ════════════════════════════════════════
// ── Stats View Renderer ──
// ════════════════════════════════════════

import { renderStatPanels } from './panels.js';

export function renderStatsView(ctx) {
  try {
    const { wp, formatEst } = ctx;
    return `<div class="view-page">
      <div class="view-page-header">
        <h1 class="view-page-title">◈ Stats</h1>
        <div class="view-page-sub">Weekly streak, focus heatmap, deadlines &mdash; ${wp.done}/${wp.total} tasks this week (${wp.pct}%)</div>
      </div>
      ${renderStatPanels(ctx)}
    </div>`;
  } catch (err) {
    console.error('[render] StatsView failed:', err);
    return `<div style="padding:24px;color:#e94560">Stats view error: ${ctx.escapeHtml(String(err))}</div>`;
  }
}

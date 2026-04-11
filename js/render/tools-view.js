// ════════════════════════════════════════
// ── Tools View Renderer ──
// ════════════════════════════════════════

import { renderToolPanels } from './panels.js';

export function renderToolsView(ctx) {
  try {
    const { escapeHtml, state, hasSyncConfig } = ctx;
    const syncStatus = hasSyncConfig && state.firebaseReady
      ? '<span style="color:#00e676;font-size:9px;margin-left:6px">● connected</span>'
      : '';

    return `<div class="view-page">
      <div class="view-page-header">
        <h1 class="view-page-title">⚙ Tools</h1>
        <div class="view-page-sub">Configure meals, reading, sync, and more${syncStatus}</div>
      </div>
      ${renderToolPanels(ctx)}
    </div>`;
  } catch (err) {
    console.error('[render] ToolsView failed:', err);
    return `<div style="padding:24px;color:#e94560">Tools view error: ${ctx.escapeHtml(String(err))}</div>`;
  }
}

// ════════════════════════════════════════
// ── Scratchpad Renderer ──
// ════════════════════════════════════════

import { loadScratchpad } from '../state.js';

/**
 * Pure(ish) renderer: receives RenderContext, writes scratchpad to DOM.
 * @param {import('./context.js').RenderContext} ctx
 */
export function renderScratchpad(ctx) {
  const { state, escapeHtml } = ctx;
  let el = document.getElementById('scratchpad-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'scratchpad-container';
    document.body.appendChild(el);
  }

  if (!state.scratchpadOpen) {
    el.innerHTML = `<button class="scratchpad-toggle" data-action="toggleScratchpad" title="Scratchpad">\ud83d\udcdd</button>`;
    return;
  }

  const content = loadScratchpad();
  el.innerHTML = `<div class="scratchpad-panel" data-stop style="animation:fabSlideUp 0.2s ease-out">
    <div class="scratchpad-header">
      <span>\ud83d\udcdd Scratchpad</span>
      <button class="fab-close" data-action="toggleScratchpad">\u2715</button>
    </div>
    <textarea class="scratchpad-area" id="scratchpad-text" data-input-action="saveScratchpad" data-stop placeholder="Quick notes\u2026">${escapeHtml(content)}</textarea>
  </div>`;
}

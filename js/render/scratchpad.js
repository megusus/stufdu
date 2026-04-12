// ════════════════════════════════════════
// ── Scratchpad Renderer ──
// ════════════════════════════════════════

import { loadScratchpad } from '../state.js';
import { renderMarkdown } from '../markdown.js';

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
  const preview = renderMarkdown(content) || '<div class="markdown-empty">Write with Markdown. Preview appears here.</div>';
  el.innerHTML = `<div class="scratchpad-panel scratchpad-panel--markdown" data-stop style="animation:fabSlideUp 0.2s ease-out">
    <div class="scratchpad-header">
      <span>\ud83d\udcdd Scratchpad</span>
      <button class="fab-close" data-action="toggleScratchpad">\u2715</button>
    </div>
    <div class="markdown-toolbar" aria-label="Markdown shortcuts">
      <button class="markdown-tool-btn" data-action="markdownShortcut" data-target="scratchpad-text" data-command="heading" title="Heading">H</button>
      <button class="markdown-tool-btn" data-action="markdownShortcut" data-target="scratchpad-text" data-command="bold" title="Bold">B</button>
      <button class="markdown-tool-btn" data-action="markdownShortcut" data-target="scratchpad-text" data-command="italic" title="Italic">I</button>
      <button class="markdown-tool-btn" data-action="markdownShortcut" data-target="scratchpad-text" data-command="list" title="List">•</button>
      <button class="markdown-tool-btn" data-action="markdownShortcut" data-target="scratchpad-text" data-command="checkbox" title="Checkbox">☐</button>
      <button class="markdown-tool-btn" data-action="markdownShortcut" data-target="scratchpad-text" data-command="code" title="Inline code">{ }</button>
      <button class="markdown-tool-btn" data-action="markdownShortcut" data-target="scratchpad-text" data-command="link" title="Link">↗</button>
    </div>
    <div class="markdown-workbench">
      <textarea class="scratchpad-area scratchpad-area--markdown" id="scratchpad-text"
        data-input-action="saveScratchpadMarkdown" data-preview-id="scratchpad-preview"
        data-stop placeholder="# Quick notes&#10;- [ ] Capture a task&#10;- Link a source">${escapeHtml(content)}</textarea>
      <div class="markdown-preview scratchpad-preview" id="scratchpad-preview" data-stop>${preview}</div>
    </div>
  </div>`;
}

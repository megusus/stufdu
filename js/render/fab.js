// ════════════════════════════════════════
// ── FAB Renderer ──
// ════════════════════════════════════════

/**
 * Pure(ish) renderer: receives RenderContext, writes FAB to DOM.
 * @param {import('./context.js').RenderContext} ctx
 */
export function renderFAB(ctx) {
  const { state, dayName, day, escapeHtml, categories } = ctx;
  let el = document.getElementById('fab-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fab-container';
    document.body.appendChild(el);
  }

  if (!state.fabOpen) {
    el.innerHTML = `<button class="fab" data-action="toggleFab" title="Quick add task">+</button>`;
    return;
  }

  const sections = day?.sections || [];
  let html = `<div class="fab-panel" data-stop style="animation:fabSlideUp 0.2s ease-out">
    <div class="fab-header">
      <span>Quick Add \u2192 ${escapeHtml(dayName)}</span>
      <button class="fab-close" data-action="toggleFab">\u2715</button>
    </div>
    <input id="fab-text" class="fab-input" type="text" placeholder="Task text\u2026" data-key-action="fabAddTaskOnEnter" data-stop>
    <select id="fab-cat" class="fab-select" data-stop>`;
  categories.keys().forEach(k => {
    html += `<option value="${k}">${categories.getLabel(k) || k}</option>`;
  });
  html += `</select>
    <select id="fab-section" class="fab-select" data-stop>`;
  sections.forEach((s, i) => {
    html += `<option value="${i}">${escapeHtml(s.label)}</option>`;
  });
  html += `</select>
    <button class="fab-add-btn" data-action="fabAddTask">Add Task</button>
  </div>`;
  el.innerHTML = html;
}

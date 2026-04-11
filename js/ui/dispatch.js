// ════════════════════════════════════════
// ── Event Dispatcher ──
// ════════════════════════════════════════
// Replaces 80+ window globals with a single document-level click listener.
// Each interactive element carries data-action (+ optional data-* args).
// Call initDispatch(handlers) from init.js after all handlers are ready.

let _handlers = null;

export function initDispatch(handlers) {
  _handlers = handlers;
  document.addEventListener('click', _handleClick, false);
}

function _handleClick(e) {
  if (!_handlers) return;
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  // data-stop attribute → stop the event from reaching other document listeners
  if (el.hasAttribute('data-stop')) e.stopPropagation();
  const fn = _handlers[action];
  if (!fn) { console.warn('[dispatch] unknown action:', action); return; }
  fn(el.dataset, e, el);
}

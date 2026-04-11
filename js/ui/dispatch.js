// ════════════════════════════════════════
// ── Event Dispatcher ──
// ════════════════════════════════════════
// Replaces most window globals with delegated document-level listeners.
// Elements carry data-action / data-input-action / data-change-action /
// data-key-action / data-focus-action / data-context-action / touch action
// attributes plus optional data-* args.
// Call initDispatch(handlers) from init.js after all handlers are ready.

let _handlers = null;

export function initDispatch(handlers) {
  _handlers = handlers;
  document.addEventListener('click', _handleClick, false);
  document.addEventListener('input', _handleInput, false);
  document.addEventListener('change', _handleChange, false);
  document.addEventListener('keydown', _handleKeydown, false);
  document.addEventListener('focusin', _handleFocusIn, false);
  document.addEventListener('contextmenu', _handleContextMenu, false);
  document.addEventListener('touchstart', _handleTouchStart, { passive: true });
  document.addEventListener('touchend', _handleTouchEnd, { passive: true });
  document.addEventListener('touchmove', _handleTouchMove, { passive: true });
}

function _handleClick(e) {
  if (!_handlers) return;
  const el = e.target.closest('[data-action], [data-stop]');
  if (!el) return;
  // data-stop attribute → stop the event from reaching other document listeners
  if (el.hasAttribute('data-stop')) e.stopPropagation();
  const action = el.dataset.action;
  if (!action) return;
  const fn = _handlers[action];
  if (!fn) { console.warn('[dispatch] unknown action:', action); return; }
  fn(el.dataset, e, el);
}

function _handleInput(e) {
  if (!_handlers) return;
  const el = e.target.closest('[data-input-action]');
  if (!el) return;
  const fn = _handlers[el.dataset.inputAction];
  if (!fn) { console.warn('[dispatch] unknown input action:', el.dataset.inputAction); return; }
  fn(el.dataset, e, el);
}

function _handleChange(e) {
  if (!_handlers) return;
  const el = e.target.closest('[data-change-action]');
  if (!el) return;
  const fn = _handlers[el.dataset.changeAction];
  if (!fn) { console.warn('[dispatch] unknown change action:', el.dataset.changeAction); return; }
  fn(el.dataset, e, el);
}

function _handleKeydown(e) {
  if (!_handlers) return;
  const el = e.target.closest('[data-key-action]');
  if (!el) return;
  if (el.hasAttribute('data-stop')) e.stopPropagation();
  const fn = _handlers[el.dataset.keyAction];
  if (!fn) { console.warn('[dispatch] unknown key action:', el.dataset.keyAction); return; }
  fn(el.dataset, e, el);
}

function _handleFocusIn(e) {
  if (!_handlers) return;
  const el = e.target.closest('[data-focus-action]');
  if (!el) return;
  const fn = _handlers[el.dataset.focusAction];
  if (!fn) { console.warn('[dispatch] unknown focus action:', el.dataset.focusAction); return; }
  fn(el.dataset, e, el);
}

function _handleContextMenu(e) {
  if (!_handlers) return;
  const el = e.target.closest('[data-context-action]');
  if (!el) return;
  const fn = _handlers[el.dataset.contextAction];
  if (!fn) { console.warn('[dispatch] unknown context action:', el.dataset.contextAction); return; }
  fn(el.dataset, e, el);
}

function _handleTouchStart(e) {
  _handleTouchAction(e, 'touchstartAction', 'touchstart');
}

function _handleTouchEnd(e) {
  _handleTouchAction(e, 'touchendAction', 'touchend');
}

function _handleTouchMove(e) {
  _handleTouchAction(e, 'touchmoveAction', 'touchmove');
}

function _handleTouchAction(e, datasetKey, label) {
  if (!_handlers) return;
  const attr = 'data-' + label + '-action';
  const el = e.target.closest(`[${attr}]`);
  if (!el) return;
  const action = el.dataset[datasetKey];
  const fn = _handlers[action];
  if (!fn) { console.warn(`[dispatch] unknown ${label} action:`, action); return; }
  fn(el.dataset, e, el);
}

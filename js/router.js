// ════════════════════════════════════════
// ── Hash-based Client Router ──
// ════════════════════════════════════════

export const VIEWS = ['home', 'schedule', 'ideal', 'tools', 'stats', 'review', 'inbox', 'habits', 'grades', 'calendar', 'matrix', 'flashcards', 'gpa'];

let _renderFn = null;
let _subViewHandlers = [];

export function initRouter(renderFn) {
  _renderFn = renderFn;
  window.addEventListener('hashchange', () => {
    _applySubView();
    if (_renderFn) _renderFn();
  });
  const raw = location.hash.replace('#', '').split('/')[0];
  if (!VIEWS.includes(raw)) history.replaceState(null, '', '#home');
  _applySubView();
}

/** Register a handler that is called on every hash change with (view, sub) */
export function onSubViewChange(fn) {
  _subViewHandlers.push(fn);
}

function _applySubView() {
  const v = currentView();
  const s = currentSubView();
  _subViewHandlers.forEach(fn => { try { fn(v, s); } catch (e) { console.warn('[router]', e); } });
}

export function navigate(view, sub) {
  const hash = sub ? `#${view}/${sub}` : `#${view}`;
  if (location.hash !== hash) location.hash = hash;
}

export function currentView() {
  const raw = (location.hash || '#home').replace('#', '').split('/')[0];
  return VIEWS.includes(raw) ? raw : 'home';
}

export function currentSubView() {
  const parts = (location.hash || '').replace('#', '').split('/');
  return parts[1] || null;
}

// ════════════════════════════════════════
// ── Hash-based Client Router ──
// ════════════════════════════════════════

export const VIEWS = ['home', 'schedule', 'ideal', 'tools', 'stats', 'review', 'inbox', 'habits', 'grades', 'calendar', 'matrix', 'flashcards', 'gpa'];

let _renderFn = null;
let _subViewHandlers = [];
let _prevView = 'home';

// Navigation direction: views ordered for forward/back awareness
const _VIEW_ORDER = VIEWS;

function _setNavDir(from, to) {
  const fi = _VIEW_ORDER.indexOf(from);
  const ti = _VIEW_ORDER.indexOf(to);
  if (fi === -1 || ti === -1 || fi === ti) {
    document.documentElement.removeAttribute('data-nav-dir');
  } else {
    document.documentElement.setAttribute('data-nav-dir', ti > fi ? 'forward' : 'back');
  }
}

export function initRouter(renderFn) {
  _renderFn = renderFn;
  _prevView = currentView();
  window.addEventListener('hashchange', () => {
    const nextView = currentView();
    _setNavDir(_prevView, nextView);
    _prevView = nextView;
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

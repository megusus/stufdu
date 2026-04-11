// ════════════════════════════════════════
// ── Hash-based Client Router ──
// ════════════════════════════════════════

export const VIEWS = ['home', 'schedule', 'ideal', 'tools', 'stats'];

let _renderFn = null;

export function initRouter(renderFn) {
  _renderFn = renderFn;
  window.addEventListener('hashchange', () => {
    if (_renderFn) _renderFn();
  });
  const raw = location.hash.replace('#', '').split('/')[0];
  if (!VIEWS.includes(raw)) history.replaceState(null, '', '#home');
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

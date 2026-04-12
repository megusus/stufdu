// ════════════════════════════════════════
// ── Scroll-Triggered Animation Observer ──
// Uses IntersectionObserver to add .in-view to .animate-on-scroll elements
// as they enter the viewport.
// ════════════════════════════════════════

let _observer = null;

/**
 * Initialize the shared IntersectionObserver.
 * Call once at app boot.
 */
export function initScrollObserver() {
  if (typeof IntersectionObserver === 'undefined') return;

  _observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          _observer.unobserve(entry.target); // fire once
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -32px 0px', // slightly before fully visible
    }
  );
}

/**
 * Observe all .animate-on-scroll elements that haven't been revealed yet.
 * Call after each render pass.
 */
export function observeScrollAnimations() {
  if (!_observer) return;
  document.querySelectorAll('.animate-on-scroll:not(.in-view)').forEach(el => {
    _observer.observe(el);
  });
}

/**
 * Reset: unobserve everything and re-observe.
 * Call when the view changes completely.
 */
export function resetScrollObserver() {
  if (!_observer) return;
  _observer.disconnect();
  observeScrollAnimations();
}

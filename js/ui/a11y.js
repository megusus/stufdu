// ════════════════════════════════════════
// ── Accessibility Helpers ──
// ════════════════════════════════════════

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="tab"]',
].join(',');

let _lastActiveBeforeModal = null;

function _focusable(root) {
  return [...root.querySelectorAll(FOCUSABLE)].filter(el => {
    if (el.hasAttribute('disabled')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

function _activeModal() {
  const modals = [...document.querySelectorAll('[data-modal="true"]')];
  return modals[modals.length - 1] || null;
}

export function announce(message) {
  const region = document.getElementById('sr-announcer');
  if (!region) return;
  region.textContent = '';
  setTimeout(() => { region.textContent = String(message || ''); }, 20);
}

export function activateModal(root, label = 'Dialog') {
  if (!root) return;
  if (!_lastActiveBeforeModal) _lastActiveBeforeModal = document.activeElement;
  root.dataset.modal = 'true';
  root.setAttribute('role', root.getAttribute('role') || 'dialog');
  root.setAttribute('aria-modal', 'true');
  if (!root.getAttribute('aria-label') && !root.getAttribute('aria-labelledby')) {
    root.setAttribute('aria-label', label);
  }
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => {
    const first = _focusable(root)[0] || root;
    if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
    first.focus?.();
  });
}

export function deactivateModal(root) {
  if (root) root.removeAttribute('data-modal');
  if (!_activeModal()) {
    document.body.classList.remove('modal-open');
    const target = _lastActiveBeforeModal;
    _lastActiveBeforeModal = null;
    if (target && document.contains(target)) target.focus?.();
  }
}

export function initA11y() {
  document.addEventListener('keydown', e => {
    const modal = _activeModal();
    if (!modal) return;
    if (e.key === 'Tab') {
      const items = _focusable(modal);
      if (!items.length) {
        e.preventDefault();
        modal.focus?.();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, true);

  const mo = new MutationObserver(() => {
    if (!_activeModal()) document.body.classList.remove('modal-open');
  });
  mo.observe(document.body, { childList: true, subtree: false });
}

export function repairA11yTree(root = document) {
  root.querySelectorAll('button, [role="button"], a').forEach(el => {
    if (el.getAttribute('aria-label')) return;
    const title = el.getAttribute('title');
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (title && (!text || text.length <= 3 || /^[✕×✓?+⋮⋯←→↑↓■]+$/.test(text))) {
      el.setAttribute('aria-label', title);
    } else if (!text && el.dataset.action) {
      el.setAttribute('aria-label', el.dataset.action.replace(/([A-Z])/g, ' $1').trim());
    }
  });

  root.querySelectorAll('.progress-bar, .briefing-progress-bar, .goal-bar-wrap, .summary-bar').forEach(el => {
    if (!el.getAttribute('role')) el.setAttribute('role', 'progressbar');
    const fill = el.querySelector('[style*="width"]');
    const width = fill?.style?.width || '';
    const pct = parseInt(width, 10);
    if (!Number.isNaN(pct)) {
      el.setAttribute('aria-valuemin', '0');
      el.setAttribute('aria-valuemax', '100');
      el.setAttribute('aria-valuenow', String(Math.max(0, Math.min(100, pct))));
    }
  });
}

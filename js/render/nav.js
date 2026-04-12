// ════════════════════════════════════════
// ── Navigation Shell Renderer ──
// ════════════════════════════════════════

import { currentView } from '../router.js';
import { getInboxCount } from '../inbox.js';
import { getDueCards } from '../flashcards.js';
import { getPinnedItems, getOverflowItems, loadNavConfig } from '../nav-config.js';

let _lastSidebarHtml = '';
let _lastBottomHtml = '';
let _lastOverflowHtml = '';

export function renderNav(ctx) {
  const active   = currentView();
  const { escapeHtml, config, currentTheme, state } = ctx;
  const inboxCount = getInboxCount();
  const flashDue   = getDueCards().length;

  const pinned   = getPinnedItems();
  const overflow = getOverflowItems();

  // ── Sidebar ──
  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) {
    let h = `<div class="sidebar-brand">
      <span class="sidebar-brand-icon">📘</span>
      <div class="sidebar-brand-text">
        <div class="sidebar-brand-name">${escapeHtml(config.appTitle)}</div>
        <div class="sidebar-brand-sub">${escapeHtml(config.semester)}</div>
      </div>
    </div>
    <nav class="sidebar-nav">`;

    // All items in sidebar (pinned first, then overflow)
    [...pinned, ...overflow].forEach(({ id, icon, label }) => {
      const badge = _badge(id, inboxCount, flashDue);
      h += `<a class="sidebar-link${active === id ? ' active' : ''}" href="#${id}" ${active === id ? 'aria-current="page"' : ''}>
        <span class="sidebar-link-icon">${icon}${badge}</span>
        <span class="sidebar-link-label">${label}</span>
      </a>`;
    });

    h += `</nav>
    <div class="sidebar-footer">
      <button class="icon-btn" data-action="openNavCustomizer" title="Customize navigation">⚙ Nav</button>
      <button class="icon-btn" data-action="toggleTheme" title="Toggle theme">${currentTheme === 'dark' ? '☀️' : '🌙'}</button>
      <button class="icon-btn" data-action="toggleFontSize" title="Font size">A↕</button>
      <button class="icon-btn" data-action="toggleShortcuts" title="Keyboard shortcuts">?</button>
    </div>`;
    if (h !== _lastSidebarHtml) {
      sidebarEl.innerHTML = h;
      _lastSidebarHtml = h;
    }
  }

  // ── Bottom tabs ──
  const btabsEl = document.getElementById('bottom-tabs');
  if (btabsEl) {
    let h = '';

    // Pinned core tabs
    pinned.forEach(({ id, icon, label }) => {
      const badge = _badge(id, inboxCount, flashDue);
      h += `<a class="btab${active === id ? ' active' : ''}" href="#${id}" ${active === id ? 'aria-current="page"' : ''}>
        <span class="btab-icon" style="position:relative">${icon}${badge}</span>
        <span class="btab-label">${label}</span>
      </a>`;
    });

    // "More" overflow button
    if (overflow.length > 0) {
      const overflowActive = overflow.some(n => n.id === active);
      h += `<button class="btab${overflowActive ? ' active' : ''}" data-action="toggleNavOverflow" style="background:none;border:none;cursor:pointer;padding:0">
        <span class="btab-icon">⋯</span>
        <span class="btab-label">More</span>
      </button>`;
    }

    if (h !== _lastBottomHtml) {
      btabsEl.innerHTML = h;
      _lastBottomHtml = h;
    }

    // Overflow drawer (shown/hidden via state)
    _updateOverflowDrawer(active, overflow, inboxCount, flashDue, state);
  }
}

function _badge(id, inboxCount, flashDue) {
  if (id === 'inbox' && inboxCount > 0)
    return `<span class="nav-badge btab-badge">${inboxCount}</span>`;
  if (id === 'flashcards' && flashDue > 0)
    return `<span class="nav-badge btab-badge" style="background:#cf7aff">${flashDue}</span>`;
  return '';
}

function _updateOverflowDrawer(active, overflow, inboxCount, flashDue, state) {
  let drawer = document.getElementById('nav-overflow-drawer');
  if (!state?.navOverflowOpen) {
    if (drawer) drawer.remove();
    _lastOverflowHtml = '';
    return;
  }
  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'nav-overflow-drawer';
    drawer.className = 'nav-overflow-drawer';
    document.body.appendChild(drawer);
  }

  let h = `<div class="nav-overflow-header">
    <span style="font-size:11px;font-weight:600;color:var(--dim);text-transform:uppercase;letter-spacing:1px">More views</span>
    <button class="icon-btn" data-action="toggleNavOverflow">✕</button>
  </div>
  <div class="nav-overflow-grid">`;

  overflow.forEach(({ id, icon, label }) => {
    const badge = _badge(id, inboxCount, flashDue);
    h += `<a class="nav-overflow-item${active === id ? ' active' : ''}" href="#${id}" data-action="closeNavOverflow" ${active === id ? 'aria-current="page"' : ''}>
      <span style="font-size:20px;position:relative">${icon}${badge}</span>
      <span style="font-size:10px;margin-top:3px">${label}</span>
    </a>`;
  });

  h += `</div>
  <div style="border-top:1px solid var(--border);padding:12px 16px">
    <button class="data-btn" data-action="openNavCustomizer"
      style="width:100%;font-size:11px;color:var(--dim);border-color:var(--border)">
      ⚙ Customize navigation
    </button>
  </div>`;

  if (h !== _lastOverflowHtml) {
    drawer.innerHTML = h;
    _lastOverflowHtml = h;
  }
}

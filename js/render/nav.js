// ════════════════════════════════════════
// ── Navigation Shell Renderer ──
// ════════════════════════════════════════

import { currentView } from '../router.js';
import { getInboxCount } from '../inbox.js';

const NAV_ITEMS = [
  { id: 'home',     icon: '⌂',  label: 'Home'      },
  { id: 'schedule', icon: '▦',  label: 'Schedule'   },
  { id: 'ideal',    icon: '✦',  label: 'Ideal Week' },
  { id: 'tools',    icon: '⚙',  label: 'Tools'      },
  { id: 'stats',    icon: '◈',  label: 'Stats'      },
  { id: 'review',   icon: '📋', label: 'Review'     },
  { id: 'inbox',    icon: '📥', label: 'Inbox'      },
  { id: 'habits',   icon: '🏃', label: 'Habits'     },
  { id: 'grades',   icon: '📊', label: 'Grades'     },
  { id: 'matrix',   icon: '🔲', label: 'Matrix'     },
  { id: 'calendar', icon: '📅', label: 'Calendar'   },
];

/**
 * Injects nav HTML into #sidebar and #bottom-tabs DOM elements.
 * Called on every render cycle.
 */
export function renderNav(ctx) {
  const active = currentView();
  const { escapeHtml, config, currentTheme } = ctx;
  const inboxCount = getInboxCount();

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
    NAV_ITEMS.forEach(({ id, icon, label }) => {
      const badge = id === 'inbox' && inboxCount > 0 ? `<span class="nav-badge">${inboxCount}</span>` : '';
      h += `<a class="sidebar-link${active === id ? ' active' : ''}" href="#${id}">
        <span class="sidebar-link-icon">${icon}${badge}</span>
        <span class="sidebar-link-label">${label}</span>
      </a>`;
    });
    h += `</nav>
    <div class="sidebar-footer">
      <button class="icon-btn" data-action="toggleTheme" title="Toggle theme">${currentTheme === 'dark' ? '☀️' : '🌙'}</button>
      <button class="icon-btn" data-action="toggleFontSize" title="Font size">A↕</button>
      <button class="icon-btn" data-action="toggleShortcuts" title="Keyboard shortcuts">?</button>
    </div>`;
    sidebarEl.innerHTML = h;
  }

  const btabsEl = document.getElementById('bottom-tabs');
  if (btabsEl) {
    let h = '';
    NAV_ITEMS.forEach(({ id, icon, label }) => {
      const badge = id === 'inbox' && inboxCount > 0 ? `<span class="nav-badge btab-badge">${inboxCount}</span>` : '';
      h += `<a class="btab${active === id ? ' active' : ''}" href="#${id}">
        <span class="btab-icon" style="position:relative">${icon}${badge}</span>
        <span class="btab-label">${label}</span>
      </a>`;
    });
    btabsEl.innerHTML = h;
  }
}

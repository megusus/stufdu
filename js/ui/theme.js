// ════════════════════════════════════════
// ── Theme Toggle + Auto-theme ──
// ════════════════════════════════════════

import { CONFIG } from '../config.js';
import { Storage } from '../storage.js';
import { nowInTZ } from '../state.js';

export let currentTheme = 'dark';

export function initTheme(render) {
  const savedTheme = Storage.getRaw('theme', '');
  currentTheme = savedTheme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', currentTheme);

  // Set meta tag on initial load
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = CONFIG.themeColors[currentTheme]?.meta || '#09090b';

  // Listen for system theme changes if no manual preference
  if (!savedTheme && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
      if (Storage.getRaw('theme', '')) return;
      currentTheme = e.matches ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', currentTheme);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = CONFIG.themeColors[currentTheme]?.meta || '#09090b';
      render();
    });
  }
}

export function toggleTheme(render) {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  Storage.setRaw('theme', currentTheme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = CONFIG.themeColors[currentTheme]?.meta || '#09090b';
  render();
}

export function checkAutoTheme() {
  if (Storage.getRaw('theme', '')) return;
  const now = nowInTZ();
  const month = now.getMonth();
  const sunrise = CONFIG.sunriseBySeason[month];
  const sunset = CONFIG.sunsetBySeason[month];
  const h = now.getHours() + now.getMinutes() / 60;
  const shouldBeLight = h >= sunrise && h < sunset;
  const newTheme = shouldBeLight ? 'light' : 'dark';
  if (newTheme !== currentTheme) {
    currentTheme = newTheme;
    document.documentElement.setAttribute('data-theme', currentTheme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = CONFIG.themeColors[currentTheme]?.meta || '#09090b';
  }
}

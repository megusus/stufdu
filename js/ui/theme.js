// ════════════════════════════════════════
// ── Theme Toggle + Auto-theme + Presets ──
// ════════════════════════════════════════

import { CONFIG } from '../config.js';
import { Storage } from '../storage.js';
import { nowInTZ } from '../state.js';

export let currentTheme = 'dark';

// ── Preset theme definitions ──
// Each preset overrides CSS custom properties on :root
export const THEME_PRESETS = {
  default: {
    label: 'Midnight',
    dark: {},
    light: {},
  },
  'warm-paper': {
    label: 'Warm Paper',
    dark: {
      '--bg':          '#faf6ed',
      '--surface':     '#f2ead8',
      '--surface2':    '#e9dec6',
      '--border':      '#cbbd9b44',
      '--border2':     '#9d8c6744',
      '--text':        '#312b22',
      '--text-bright': '#17130e',
      '--muted':       '#665b49',
      '--dim':         '#94866e',
      '--faint':       '#d8ccb3',
      '--accent':      '#007a99',
      '--glass-bg':    'rgba(250, 246, 237, 0.82)',
      '--glass-border':'rgba(49, 43, 34, 0.10)',
    },
    light: {
      '--bg':          '#faf6ed',
      '--surface':     '#f2ead8',
      '--surface2':    '#e9dec6',
      '--border':      '#cbbd9b44',
      '--border2':     '#9d8c6744',
      '--text':        '#312b22',
      '--text-bright': '#17130e',
      '--muted':       '#665b49',
      '--dim':         '#94866e',
      '--faint':       '#d8ccb3',
      '--accent':      '#007a99',
      '--glass-bg':    'rgba(250, 246, 237, 0.82)',
      '--glass-border':'rgba(49, 43, 34, 0.10)',
    },
  },
  nord: {
    label: 'Nord',
    dark: {
      '--bg':           '#2e3440',
      '--surface':      '#3b4252',
      '--surface2':     '#434c5e',
      '--border':       '#4c566a40',
      '--border2':      '#4c566a80',
      '--text':         '#d8dee9',
      '--text-bright':  '#eceff4',
      '--muted':        '#a5b0c0',
      '--dim':          '#6272a4',
      '--accent':       '#88c0d0',
    },
    light: {
      '--bg':           '#eceff4',
      '--surface':      '#e5e9f0',
      '--surface2':     '#d8dee9',
      '--border':       '#4c566a22',
      '--border2':      '#4c566a44',
      '--text':         '#2e3440',
      '--text-bright':  '#2e3440',
      '--muted':        '#4c566a',
      '--dim':          '#6272a4',
      '--accent':       '#5e81ac',
    },
  },
  'rose-pine': {
    label: 'Rose Pine',
    dark: {
      '--bg':           '#191724',
      '--surface':      '#1f1d2e',
      '--surface2':     '#26233a',
      '--border':       '#6e6a8640',
      '--border2':      '#6e6a8680',
      '--text':         '#e0def4',
      '--text-bright':  '#e0def4',
      '--muted':        '#908caa',
      '--dim':          '#6e6a86',
      '--accent':       '#c4a7e7',
    },
    light: {
      '--bg':           '#faf4ed',
      '--surface':      '#fffaf3',
      '--surface2':     '#f2e9e1',
      '--border':       '#dbbfb822',
      '--border2':      '#dbbfb844',
      '--text':         '#575279',
      '--text-bright':  '#575279',
      '--muted':        '#907aa9',
      '--dim':          '#9893a5',
      '--accent':       '#907aa9',
    },
  },
  'catppuccin-mocha': {
    label: 'Catppuccin Mocha',
    dark: {
      '--bg':           '#1e1e2e',
      '--surface':      '#181825',
      '--surface2':     '#313244',
      '--border':       '#45475a40',
      '--border2':      '#45475a80',
      '--text':         '#cdd6f4',
      '--text-bright':  '#cdd6f4',
      '--muted':        '#a6adc8',
      '--dim':          '#6c7086',
      '--accent':       '#89b4fa',
    },
    light: {
      '--bg':           '#eff1f5',
      '--surface':      '#e6e9ef',
      '--surface2':     '#dce0e8',
      '--border':       '#ccd0da44',
      '--border2':      '#ccd0da80',
      '--text':         '#4c4f69',
      '--text-bright':  '#4c4f69',
      '--muted':        '#7c7f93',
      '--dim':          '#9ca0b0',
      '--accent':       '#1e66f5',
    },
  },
  'solarized-dark': {
    label: 'Solarized Dark',
    dark: {
      '--bg':           '#002b36',
      '--surface':      '#073642',
      '--surface2':     '#094555',
      '--border':       '#073642',
      '--border2':      '#586e7540',
      '--text':         '#839496',
      '--text-bright':  '#93a1a1',
      '--muted':        '#657b83',
      '--dim':          '#586e75',
      '--accent':       '#2aa198',
    },
    light: {
      '--bg':           '#fdf6e3',
      '--surface':      '#eee8d5',
      '--surface2':     '#e4dcc5',
      '--border':       '#93a1a122',
      '--border2':      '#93a1a144',
      '--text':         '#657b83',
      '--text-bright':  '#586e75',
      '--muted':        '#839496',
      '--dim':          '#93a1a1',
      '--accent':       '#268bd2',
    },
  },
  'high-contrast': {
    label: 'High Contrast',
    dark: {
      '--bg':          '#000000',
      '--surface':     '#1a1a1a',
      '--surface2':    '#242424',
      '--border':      '#ffffff33',
      '--border2':     '#ffffff66',
      '--text':        '#f5f5f5',
      '--text-bright': '#ffffff',
      '--muted':       '#c7c7c7',
      '--dim':         '#8f8f8f',
      '--faint':       '#333333',
      '--accent':      '#00ff88',
      '--glass-bg':    'rgba(26,26,26,0.88)',
      '--glass-border':'rgba(255,255,255,0.22)',
    },
    light: {
      '--bg':          '#ffffff',
      '--surface':     '#f1f1f1',
      '--surface2':    '#e6e6e6',
      '--border':      '#00000033',
      '--border2':     '#00000066',
      '--text':        '#111111',
      '--text-bright': '#000000',
      '--muted':       '#3d3d3d',
      '--dim':         '#666666',
      '--faint':       '#d9d9d9',
      '--accent':      '#006b3a',
      '--glass-bg':    'rgba(255,255,255,0.88)',
      '--glass-border':'rgba(0,0,0,0.22)',
    },
  },
  amoled: {
    label: 'AMOLED',
    dark: {
      '--bg':          '#000000',
      '--surface':     '#0a0a0a',
      '--surface2':    '#101010',
      '--border':      '#1f1f1f',
      '--border2':     '#343434',
      '--text':        '#d8f7ff',
      '--text-bright': '#ffffff',
      '--muted':       '#83a5ad',
      '--dim':         '#526970',
      '--faint':       '#1a1a1a',
      '--accent':      '#00d2ff',
      '--glass-bg':    'rgba(0,0,0,0.86)',
      '--glass-border':'rgba(0,210,255,0.16)',
    },
    light: {
      '--bg':          '#000000',
      '--surface':     '#0a0a0a',
      '--surface2':    '#101010',
      '--border':      '#1f1f1f',
      '--border2':     '#343434',
      '--text':        '#d8f7ff',
      '--text-bright': '#ffffff',
      '--muted':       '#83a5ad',
      '--dim':         '#526970',
      '--faint':       '#1a1a1a',
      '--accent':      '#00d2ff',
      '--glass-bg':    'rgba(0,0,0,0.86)',
      '--glass-border':'rgba(0,210,255,0.16)',
    },
  },
};

export let currentPreset = 'default';

const PRESET_ALIASES = {
  midnight: 'default',
  rosepine: 'rose-pine',
  catppuccin: 'catppuccin-mocha',
  solarized: 'solarized-dark',
};

function _normalizePresetKey(key) {
  return PRESET_ALIASES[key] || key || 'default';
}

function _applyPresetVars(presetKey, theme) {
  const preset = THEME_PRESETS[presetKey];
  if (!preset) return;
  const vars = preset[theme] || {};
  const root = document.documentElement;
  // Remove all previously applied preset vars first
  Object.keys(Object.values(THEME_PRESETS).flatMap(p => [...Object.keys(p.dark || {}), ...Object.keys(p.light || {})])
    .reduce((a, k) => { a[k] = 1; return a; }, {}))
    .forEach(v => root.style.removeProperty(v));
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

function _applyAccentColor(color) {
  if (color) {
    document.documentElement.style.setProperty('--accent', color);
  } else {
    // Let preset/default handle it
  }
}

export function initPreset() {
  const saved = _normalizePresetKey(Storage.getRaw('theme-preset', 'default'));
  currentPreset = THEME_PRESETS[saved] ? saved : 'default';
  if (currentPreset !== Storage.getRaw('theme-preset', 'default')) Storage.setRaw('theme-preset', currentPreset);
  _applyPresetVars(currentPreset, currentTheme);
  const accent = Storage.getRaw('accent-color', '');
  if (accent) _applyAccentColor(accent);
}

export function setThemePreset(key, render) {
  const normalized = _normalizePresetKey(key);
  if (!THEME_PRESETS[normalized]) return;
  currentPreset = normalized;
  Storage.setRaw('theme-preset', normalized);
  _applyPresetVars(normalized, currentTheme);
  const accent = Storage.getRaw('accent-color', '');
  if (accent) _applyAccentColor(accent);
  if (render) render();
}

export function setAccentColor(color, render) {
  Storage.setRaw('accent-color', color);
  _applyAccentColor(color);
  if (render) render();
}

export function resetAccentColor(render) {
  Storage.setRaw('accent-color', '');
  // Re-apply preset (will remove accent override)
  _applyPresetVars(currentPreset, currentTheme);
  if (render) render();
}

export function initTheme(render) {
  const savedTheme = Storage.getRaw('theme', '');
  currentTheme = savedTheme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', currentTheme);
  initPreset();

  // Set meta tag on initial load
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = CONFIG.themeColors[currentTheme]?.meta || '#09090b';

  // Listen for system theme changes if no manual preference
  if (!savedTheme && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
      if (Storage.getRaw('theme', '')) return;
      currentTheme = e.matches ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', currentTheme);
      _applyPresetVars(currentPreset, currentTheme);
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
  _applyPresetVars(currentPreset, currentTheme);
  const accent = Storage.getRaw('accent-color', '');
  if (accent) _applyAccentColor(accent);
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

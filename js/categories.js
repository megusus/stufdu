// ════════════════════════════════════════
// ── Category Registry ──
// ════════════════════════════════════════

import { Storage } from './storage.js';

// Default categories
const DEFAULT_CATEGORIES = {
  class:     { bg: '#1a1a2e', border: '#e94560', label: 'CLASS',  defaultEst: 0 },
  fa:        { bg: '#0a1628', border: '#00d2ff', label: 'FA',     defaultEst: 120 },
  fameeting: { bg: '#1a1408', border: '#ff9100', label: 'MTG',    defaultEst: 90 },
  analysis:  { bg: '#1a0a28', border: '#b44aff', label: 'ANL IV', defaultEst: 75 },
  algebra:   { bg: '#0a2818', border: '#00e676', label: 'ALG II', defaultEst: 60 },
  diffeq:    { bg: '#28200a', border: '#ffab00', label: 'DEQ II', defaultEst: 60 },
  numtheory: { bg: '#281a0a', border: '#ff6d00', label: 'NT II',  defaultEst: 60 },
  physics:   { bg: '#1a0a1a', border: '#e040fb', label: 'PHY II', defaultEst: 60 },
  homework:  { bg: '#1a1a0a', border: '#c6a700', label: 'HW',     defaultEst: 60 },
  routine:   { bg: '#0f1a0f', border: '#66bb6a', label: '',       defaultEst: 45 },
  reflect:   { bg: '#14140a', border: '#8d8d00', label: '',       defaultEst: 10 },
  reading:   { bg: '#1a0f1f', border: '#cf7aff', label: 'READ',   defaultEst: 0 },
};

const FALLBACK_CAT = { bg: '#1a1a1a', border: '#888', label: '', defaultEst: 60 };

export const CategoryRegistry = {
  _cats: {},

  // Initialize with defaults then load overrides
  init() {
    // Start with deep-cloned defaults
    this._cats = {};
    for (const [key, val] of Object.entries(DEFAULT_CATEGORIES)) {
      this._cats[key] = { ...val };
    }
    // Merge user overrides from storage
    this.load();
  },

  register(key, { bg, border, label, defaultEst }) {
    this._cats[key] = {
      bg: bg || FALLBACK_CAT.bg,
      border: border || FALLBACK_CAT.border,
      label: label !== undefined ? label : key.toUpperCase(),
      defaultEst: defaultEst !== undefined ? defaultEst : 60,
    };
  },

  get(key) {
    return this._cats[key] || { ...FALLBACK_CAT, label: key ? key.toUpperCase() : '' };
  },

  getColor(key) {
    const c = this.get(key);
    return { bg: c.bg, border: c.border };
  },

  getLabel(key) {
    return this.get(key).label;
  },

  getEstimate(key) {
    return this.get(key).defaultEst;
  },

  keys() {
    return Object.keys(this._cats);
  },

  has(key) {
    return key in this._cats;
  },

  remove(key) {
    delete this._cats[key];
  },

  // Persistence
  save() {
    Storage.set('categories', this._cats);
  },

  load() {
    const stored = Storage.get('categories', null);
    if (stored && typeof stored === 'object') {
      for (const [key, val] of Object.entries(stored)) {
        this._cats[key] = { ...this.get(key), ...val };
      }
    }
  },

  // Get all as flat objects for backward compat (CAT, CAT_LABEL, CAT_DEFAULT_EST)
  getAllColors() {
    const m = {};
    for (const [k, v] of Object.entries(this._cats)) {
      m[k] = { bg: v.bg, border: v.border };
    }
    return m;
  },

  getAllLabels() {
    const m = {};
    for (const [k, v] of Object.entries(this._cats)) {
      m[k] = v.label;
    }
    return m;
  },

  getAllEstimates() {
    const m = {};
    for (const [k, v] of Object.entries(this._cats)) {
      m[k] = v.defaultEst;
    }
    return m;
  },

  // Get defaults (for reset)
  getDefaults() {
    return DEFAULT_CATEGORIES;
  },
};

// Initialize on import
CategoryRegistry.init();

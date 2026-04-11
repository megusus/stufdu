// ════════════════════════════════════════
// ── Storage Abstraction Layer ──
// ════════════════════════════════════════

import { CONFIG } from './config.js';

export const Storage = {
  _prefix: CONFIG.storagePrefix,

  _key(k) {
    return this._prefix ? this._prefix + '-' + k : k;
  },

  // JSON get/set with automatic parse/stringify + try/catch
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this._key(key));
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('Storage.get failed:', key, e.message);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(this._key(key), JSON.stringify(value));
    } catch (e) {
      console.warn('Storage.set failed:', key, e.message);
    }
  },

  remove(key) {
    localStorage.removeItem(this._key(key));
  },

  // Raw access (no JSON) for simple string values like theme
  getRaw(key, fallback = '') {
    return localStorage.getItem(this._key(key)) ?? fallback;
  },

  setRaw(key, value) {
    localStorage.setItem(this._key(key), String(value));
  },

  // Session storage (for auth)
  sessionGet(key) {
    return sessionStorage.getItem(this._key(key));
  },

  sessionSet(key, value) {
    sessionStorage.setItem(this._key(key), String(value));
  },

  sessionRemove(key) {
    sessionStorage.removeItem(this._key(key));
  },

  // Session JSON get/set
  sessionGetJSON(key, fallback = null) {
    try {
      const raw = sessionStorage.getItem(this._key(key));
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  },

  sessionSetJSON(key, value) {
    sessionStorage.setItem(this._key(key), JSON.stringify(value));
  },

  // Check storage quota
  getUsageBytes() {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        total += k.length + (localStorage.getItem(k) || '').length;
      }
      return total;
    } catch (e) { return 0; }
  },

  // Check if nearing quota
  checkQuota() {
    const usage = this.getUsageBytes();
    if (usage > 4 * 1024 * 1024) {
      return true; // near full
    }
    return false;
  },
};

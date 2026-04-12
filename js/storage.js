// ════════════════════════════════════════
// ── Storage Abstraction Layer ──
// ════════════════════════════════════════

import { CONFIG } from './config.js';

export const Storage = {
  _prefix: CONFIG.storagePrefix,

  init(prefix = CONFIG.storagePrefix) {
    this._prefix = prefix || '';
  },

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

  // ── IndexedDB async API ──
  // Provides larger storage (50MB+) for big datasets.
  // Modules can opt in; existing sync API untouched.
  _idb: null,

  async _openIDB() {
    if (this._idb) return this._idb;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('study-plan-idb', 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv');
        }
      };
      req.onsuccess  = e => { this._idb = e.target.result; resolve(this._idb); };
      req.onerror    = e => reject(e.target.error);
    });
  },

  async idbGet(key, fallback = null) {
    try {
      const db = await this._openIDB();
      return new Promise((resolve) => {
        const tx  = db.transaction('kv', 'readonly');
        const req = tx.objectStore('kv').get(this._key(key));
        req.onsuccess = e => resolve(e.target.result ?? fallback);
        req.onerror   = () => resolve(fallback);
      });
    } catch (e) {
      // Fallback to localStorage
      return this.get(key, fallback);
    }
  },

  async idbSet(key, value) {
    try {
      const db = await this._openIDB();
      return new Promise((resolve, reject) => {
        const tx  = db.transaction('kv', 'readwrite');
        const req = tx.objectStore('kv').put(value, this._key(key));
        req.onsuccess = () => resolve();
        req.onerror   = e => reject(e.target.error);
      });
    } catch (e) {
      // Fallback to localStorage
      this.set(key, value);
    }
  },

  async idbRemove(key) {
    try {
      const db = await this._openIDB();
      return new Promise((resolve) => {
        const tx  = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').delete(this._key(key));
        tx.oncomplete = () => resolve();
        tx.onerror    = () => resolve();
      });
    } catch (e) {
      this.remove(key);
    }
  },

  // Write-through: sync to localStorage AND async to IndexedDB
  // Use for large data that may hit localStorage limits
  setLarge(key, value) {
    this.set(key, value);
    this.idbSet(key, value).catch(() => {});
  },
};

// ════════════════════════════════════════
// ── Firebase Sync ──
// ════════════════════════════════════════

import { CONFIG } from './config.js';
import { Storage } from './storage.js';
import { state, getWeekKey, loadHistory, loadScratchpad, invalidateProgressCache, saveLinks, saveDeadlines } from './state.js';

// ── Config persistence ──
export function getSyncConfig() {
  return Storage.get('sync-config', null);
}

export function saveSyncConfig(config) {
  Storage.set('sync-config', config);
}

export function getSyncCreds() {
  return Storage.sessionGetJSON('sync-creds', null);
}

export function saveSyncCreds(email) {
  Storage.sessionSetJSON('sync-creds', { email });
}

// ── Firebase SDK loader ──
export function loadFirebaseSDK() {
  if (window.firebase && window.firebase.auth && window.firebase.database) return Promise.resolve();
  if (state.firebaseSDKPromise) return state.firebaseSDKPromise;

  const scripts = [
    ['https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js', 'Firebase app SDK'],
    ['https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js', 'Firebase auth SDK'],
    ['https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js', 'Firebase database SDK'],
  ];

  state.firebaseSDKPromise = scripts.reduce((promise, [src, label]) => {
    return promise.then(() => new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${label}`));
      document.head.appendChild(script);
    }));
  }, Promise.resolve()).catch(err => {
    state.firebaseSDKPromise = null;
    throw err;
  });

  return state.firebaseSDKPromise;
}

// ── Config parser ──
export function parseFirebaseConfig(text) {
  function fillDatabaseURL(obj) {
    if (!obj.databaseURL && obj.projectId) {
      obj.databaseURL = 'https://' + obj.projectId + '-default-rtdb.firebaseio.com';
    }
    return (obj.apiKey && obj.projectId) ? obj : null;
  }
  try { const obj = JSON.parse(text); if (fillDatabaseURL(obj)) return obj; } catch (e) { }
  const match = text.match(/\{[^{}]*apiKey[^{}]*\}/s);
  if (match) {
    try {
      const jsonStr = match[0].replace(/(['"])?(\w+)(['"])?\s*:/g, '"$2":').replace(/'/g, '"').replace(/,\s*}/g, '}');
      const obj = JSON.parse(jsonStr);
      if (obj && typeof obj === 'object' && fillDatabaseURL(obj)) return obj;
    } catch (e) { }
  }
  return null;
}

// ── Sync dot UI ──
export function updateSyncDot() {
  const dot = document.getElementById('sync-dot');
  if (!dot) return;
  dot.className = 'sync-dot ' + ((getSyncConfig() || CONFIG.firebase) ? state.syncStatus : 'hidden');
  dot.title = state.syncStatus === 'connected' ? 'Synced' :
    state.syncStatus === 'syncing' ? 'Syncing\u2026' : 'Offline';
}

// ── Attach realtime listeners ──
export function attachSyncListeners(render) {
  const db = firebase.database();
  const base = 'users/' + state.syncUid + '/study/';

  if (state.syncConnectionRef && state.syncConnectionListener) state.syncConnectionRef.off('value', state.syncConnectionListener);
  state.syncConnectionRef = db.ref('.info/connected');
  state.syncConnectionListener = state.syncConnectionRef.on('value', snap => {
    state.syncStatus = snap.val() ? 'connected' : 'offline';
    updateSyncDot();
  });

  if (state.syncRef && state.syncListener) state.syncRef.off('value', state.syncListener);
  state.syncRef = db.ref(base + getWeekKey());
  state.syncListener = state.syncRef.on('value', snap => {
    if (state.ignoreNextRemote) { state.ignoreNextRemote = false; return; }
    if (snap.exists()) {
      state.checked = snap.val();
      invalidateProgressCache();
      Storage.set(getWeekKey(), state.checked);
      render();
    }
  });

  if (state.syncNotesRef && state.syncNotesListener) state.syncNotesRef.off('value', state.syncNotesListener);
  state.syncNotesRef = db.ref(base + getWeekKey() + '-notes');
  state.syncNotesListener = state.syncNotesRef.on('value', snap => {
    if (snap.exists()) { state.taskNotes = snap.val(); Storage.set(getWeekKey() + '-notes', state.taskNotes); render(); }
  });

  if (state.syncDeferRef && state.syncDeferListener) state.syncDeferRef.off('value', state.syncDeferListener);
  state.syncDeferRef = db.ref(base + getWeekKey() + '-defer');
  state.syncDeferListener = state.syncDeferRef.on('value', snap => {
    if (snap.exists()) { state.taskDeferred = snap.val(); invalidateProgressCache(); Storage.set(getWeekKey() + '-defer', state.taskDeferred); render(); }
  });

  if (state.syncHistoryRef && state.syncHistoryListener) state.syncHistoryRef.off('value', state.syncHistoryListener);
  state.syncHistoryRef = db.ref(base + 'history');
  state.syncHistoryListener = state.syncHistoryRef.on('value', snap => {
    if (snap.exists()) Storage.set('history', snap.val());
  });

  if (state.syncLinksRef && state.syncLinksListener) state.syncLinksRef.off('value', state.syncLinksListener);
  state.syncLinksRef = db.ref(base + 'links');
  state.syncLinksListener = state.syncLinksRef.on('value', snap => {
    if (snap.exists()) { state.taskLinks = snap.val(); saveLinks(); render(); }
  });

  if (state.syncDeadlinesRef && state.syncDeadlinesListener) state.syncDeadlinesRef.off('value', state.syncDeadlinesListener);
  state.syncDeadlinesRef = db.ref(base + 'deadlines');
  state.syncDeadlinesListener = state.syncDeadlinesRef.on('value', snap => {
    if (snap.exists()) { state.deadlines = snap.val(); saveDeadlines(); render(); }
  });

  if (state.syncScratchRef && state.syncScratchListener) state.syncScratchRef.off('value', state.syncScratchListener);
  state.syncScratchRef = db.ref(base + 'scratchpad');
  state.syncScratchListener = state.syncScratchRef.on('value', snap => {
    const val = snap.exists() ? snap.val() : '';
    Storage.setRaw('scratch', val);
    const ta = document.getElementById('scratchpad-text');
    if (ta && document.activeElement !== ta) ta.value = val;
  });
}

// ── Push local state to Firebase ──
let syncPushTimer = null;
export function syncPush() {
  if (!state.firebaseReady || !state.syncRef) return;
  clearTimeout(syncPushTimer);
  syncPushTimer = setTimeout(() => {
    state.ignoreNextRemote = true;
    state.syncRef.set(state.checked).catch(err => {
      state.ignoreNextRemote = false;
      console.error('Sync write failed:', err.message);
    });
    if (state.syncNotesRef) state.syncNotesRef.set(state.taskNotes).catch(err => console.warn('Notes sync failed:', err.message));
    if (state.syncDeferRef) state.syncDeferRef.set(state.taskDeferred).catch(err => console.warn('Defer sync failed:', err.message));
    if (state.syncHistoryRef) state.syncHistoryRef.set(loadHistory()).catch(err => console.warn('History sync failed:', err.message));
    if (state.syncLinksRef) state.syncLinksRef.set(state.taskLinks).catch(err => console.warn('Links sync failed:', err.message));
    if (state.syncDeadlinesRef) state.syncDeadlinesRef.set(state.deadlines).catch(err => console.warn('Deadlines sync failed:', err.message));
    if (state.syncScratchRef) state.syncScratchRef.set(loadScratchpad()).catch(err => console.warn('Scratchpad sync failed:', err.message));
  }, CONFIG.syncDebounceMs);
}

// ── Init sync (first-time connect) ──
export async function initSync(config, email, password, render) {
  state.syncStatus = 'syncing';
  updateSyncDot();

  await loadFirebaseSDK();

  if (!firebase.apps.length) {
    firebase.initializeApp(config);
  }

  if (!firebase.auth().currentUser) {
    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        await firebase.auth().createUserWithEmailAndPassword(email, password);
      } else {
        throw err;
      }
    }
  }

  state.syncUid = firebase.auth().currentUser.uid;
  attachSyncListeners(render);
  state.firebaseReady = true;
  saveSyncConfig(config);
  saveSyncCreds(email);
  syncPush();
}

// ── Connect via UI ──
export async function connectSync(render, showToast) {
  const input = document.getElementById('sync-config-input');
  const emailInput = document.getElementById('sync-email');
  const passInput = document.getElementById('sync-password');
  const msg = document.getElementById('sync-msg');
  if (!input || !msg) return;

  const config = parseFirebaseConfig(input.value.trim());
  if (!config) {
    msg.className = 'sync-msg err';
    msg.textContent = 'Could not parse config. Paste the full firebaseConfig object.';
    return;
  }

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value : '';
  if (!email || !password) {
    msg.className = 'sync-msg err';
    msg.textContent = 'Enter an email and password.';
    return;
  }

  msg.className = 'sync-msg wait';
  msg.textContent = 'Connecting\u2026';

  try {
    await initSync(config, email, password, render);
    render();
    showToast('Sync connected');
  } catch (err) {
    state.firebaseReady = false;
    state.syncStatus = 'offline';
    updateSyncDot();
    msg.className = 'sync-msg err';
    const friendly = err.code === 'auth/wrong-password' ? 'Wrong password.' :
      err.code === 'auth/invalid-email' ? 'Invalid email.' :
        err.code === 'auth/weak-password' ? 'Password must be at least 6 characters.' :
          err.message;
    msg.textContent = 'Failed: ' + friendly;
  }
}

// ── Disconnect ──
export function disconnectSync(render, showToast) {
  if (state.syncRef && state.syncListener) state.syncRef.off('value', state.syncListener);
  if (state.syncConnectionRef && state.syncConnectionListener) state.syncConnectionRef.off('value', state.syncConnectionListener);
  if (state.syncHistoryRef && state.syncHistoryListener) state.syncHistoryRef.off('value', state.syncHistoryListener);
  if (state.syncNotesRef && state.syncNotesListener) state.syncNotesRef.off('value', state.syncNotesListener);
  if (state.syncDeferRef && state.syncDeferListener) state.syncDeferRef.off('value', state.syncDeferListener);
  if (state.syncLinksRef && state.syncLinksListener) state.syncLinksRef.off('value', state.syncLinksListener);
  if (state.syncDeadlinesRef && state.syncDeadlinesListener) state.syncDeadlinesRef.off('value', state.syncDeadlinesListener);
  if (state.syncScratchRef && state.syncScratchListener) state.syncScratchRef.off('value', state.syncScratchListener);
  try {
    if (firebase.apps.length) firebase.auth().signOut().catch(err => console.warn('Sign-out failed:', err.message));
  } catch (e) { console.warn('Disconnect error:', e.message); }
  Storage.remove('sync-config');
  Storage.sessionRemove('sync-creds');
  state.firebaseReady = false;
  state.syncRef = null; state.syncListener = null;
  state.syncConnectionRef = null; state.syncConnectionListener = null;
  state.syncHistoryRef = null; state.syncHistoryListener = null;
  state.syncNotesRef = null; state.syncNotesListener = null;
  state.syncDeferRef = null; state.syncDeferListener = null;
  state.syncLinksRef = null; state.syncLinksListener = null;
  state.syncDeadlinesRef = null; state.syncDeadlinesListener = null;
  state.syncScratchRef = null; state.syncScratchListener = null;
  state.syncUid = null;
  state.syncStatus = 'offline';
  render();
  showToast('Sync disconnected');
}

// ── Auto-reconnect on page load ──
export async function setupStoredSync(render) {
  const config = CONFIG.firebase || getSyncConfig();
  if (!config) return;

  try {
    await loadFirebaseSDK();
    if (!firebase.apps.length) firebase.initializeApp(config);

    const user = await new Promise((resolve) => {
      const unsub = firebase.auth().onAuthStateChanged(u => { unsub(); resolve(u); });
    });

    if (!user) {
      state.syncStatus = 'offline';
      updateSyncDot();
      return;
    }

    state.syncUid = user.uid;
    state.syncStatus = 'syncing';
    updateSyncDot();
    attachSyncListeners(render);
    state.firebaseReady = true;
    saveSyncCreds(user.email);
    syncPush();
    render();
  } catch (err) {
    state.firebaseReady = false;
    state.syncStatus = 'offline';
    updateSyncDot();
    console.warn('Auto-sync failed:', err.message);
  }
}

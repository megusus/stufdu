// ════════════════════════════════════════
// ── Sync Conflict Detection & Resolution ──
// ════════════════════════════════════════

import { Storage } from './storage.js';

// ── Conflict store ──
let _pendingConflict = null;

export function hasPendingConflict()    { return !!_pendingConflict; }
export function getPendingConflict()    { return _pendingConflict; }
export function clearPendingConflict()  { _pendingConflict = null; }

/**
 * Compare local and remote snapshots for a given key.
 * Returns a conflict descriptor if values differ, otherwise null.
 */
export function detectConflict(key, localValue, remoteValue) {
  if (!localValue && !remoteValue) return null;
  if (JSON.stringify(localValue) === JSON.stringify(remoteValue)) return null;

  return {
    key,
    local:     localValue,
    remote:    remoteValue,
    detectedAt: Date.now(),
  };
}

/**
 * Register a conflict so the UI can surface it.
 * Merges trivial conflicts automatically (e.g., both sides mark same task done).
 * Returns true if manual resolution is needed.
 */
export function registerConflict(key, localValue, remoteValue) {
  const auto = _tryAutoMerge(key, localValue, remoteValue);
  if (auto.resolved) {
    Storage.set(key, auto.result);
    return false;
  }
  _pendingConflict = { key, local: localValue, remote: remoteValue, detectedAt: Date.now() };
  return true;
}

function _tryAutoMerge(key, local, remote) {
  // For task-checked objects: take union of all done/skip values
  if (key.match(/^w\d+$/) && typeof local === 'object' && typeof remote === 'object') {
    const merged = { ...remote, ...local };
    // If remote has a "done" for a key not in local, keep it
    for (const [id, val] of Object.entries(remote)) {
      if (!local[id] && (val === 'done' || val === true)) {
        merged[id] = val;
      }
    }
    return { resolved: true, result: merged };
  }
  // For arrays (deadlines, reading list): take the longer/newer one
  if (Array.isArray(local) && Array.isArray(remote)) {
    const result = remote.length >= local.length ? remote : local;
    return { resolved: true, result };
  }
  return { resolved: false };
}

/**
 * Resolve a conflict by choosing a side.
 * @param {'local'|'remote'} side
 */
export function resolveConflict(side) {
  if (!_pendingConflict) return;
  const value = side === 'local' ? _pendingConflict.local : _pendingConflict.remote;
  Storage.set(_pendingConflict.key, value);
  _pendingConflict = null;
}

// ── Conflict Modal HTML ──
export function renderConflictModal(escapeHtml) {
  if (!_pendingConflict) return '';
  const c = _pendingConflict;

  const localPreview  = _preview(c.local);
  const remotePreview = _preview(c.remote);
  const ago = Math.round((Date.now() - c.detectedAt) / 1000);

  return `<div id="conflict-modal-overlay" style="
    position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9000;
    display:flex;align-items:center;justify-content:center;padding:20px">
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;
      max-width:500px;width:100%;padding:24px;font-size:13px">
      <div style="font-size:15px;font-weight:700;color:var(--text-bright);margin-bottom:6px">⚠️ Sync Conflict</div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:16px">
        Local and remote data for <code style="color:var(--accent)">${escapeHtml(c.key)}</code>
        differ &mdash; detected ${ago}s ago.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div>
          <div style="font-size:10px;font-weight:600;color:var(--dim);margin-bottom:6px;text-transform:uppercase">Local (mine)</div>
          <pre style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;
            font-size:10px;overflow:auto;max-height:140px;white-space:pre-wrap;word-break:break-all;margin:0">${escapeHtml(localPreview)}</pre>
        </div>
        <div>
          <div style="font-size:10px;font-weight:600;color:var(--dim);margin-bottom:6px;text-transform:uppercase">Remote (cloud)</div>
          <pre style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;
            font-size:10px;overflow:auto;max-height:140px;white-space:pre-wrap;word-break:break-all;margin:0">${escapeHtml(remotePreview)}</pre>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="data-btn" data-action="resolveConflict" data-side="local"
          style="flex:1;color:#00d2ff;border-color:#00d2ff44;padding:10px">Keep Mine</button>
        <button class="data-btn" data-action="resolveConflict" data-side="remote"
          style="flex:1;padding:10px">Use Cloud</button>
        <button class="data-btn" data-action="dismissConflict"
          style="padding:10px;color:var(--dim);border-color:var(--border)">Dismiss</button>
      </div>
    </div>
  </div>`;
}

function _preview(value) {
  const s = JSON.stringify(value, null, 2);
  return s.length > 400 ? s.slice(0, 400) + '\n...' : s;
}

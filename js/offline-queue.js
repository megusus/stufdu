// ════════════════════════════════════════
// ── Offline Mutation Queue ──
// ════════════════════════════════════════
// Queues state mutations when offline and replays on reconnect.

import { Storage } from './storage.js';

const QUEUE_KEY = 'offline-queue';

// { id, type, key, value, updatedAt }
export function loadQueue() {
  return Storage.get(QUEUE_KEY, []);
}

function _saveQueue(q) {
  Storage.set(QUEUE_KEY, q);
}

export function enqueue(type, key, value) {
  const q = loadQueue();
  // Deduplicate: if same type+key already queued, replace
  const idx = q.findIndex(item => item.type === type && item.key === key);
  const entry = { id: `q-${Date.now()}`, type, key, value, updatedAt: new Date().toISOString() };
  if (idx >= 0) q[idx] = entry;
  else q.push(entry);
  _saveQueue(q);
}

export function dequeue(id) {
  _saveQueue(loadQueue().filter(item => item.id !== id));
}

export function clearQueue() {
  _saveQueue([]);
}

export function getQueueSize() {
  return loadQueue().length;
}

// ── Multi-tab sync with BroadcastChannel ──

let _channel = null;
let _onMessage = null;

export function initBroadcastChannel(onMessage) {
  if (!window.BroadcastChannel) return;
  _onMessage = onMessage;
  try {
    _channel = new BroadcastChannel('studyhub-sync');
    _channel.onmessage = (e) => {
      if (_onMessage && e.data?.type === 'state-update') {
        _onMessage(e.data);
      }
    };
  } catch (e) {
    console.warn('[broadcast] BroadcastChannel not available:', e);
  }
}

export function broadcastStateUpdate(key, value) {
  if (_channel) {
    try {
      _channel.postMessage({ type: 'state-update', key, value, ts: Date.now() });
    } catch (e) { /* ignore */ }
  }
}

// ── Replay queue on reconnect ──

export async function replayQueue(syncPushFn, showToast) {
  const q = loadQueue();
  if (q.length === 0) return;

  let replayed = 0;
  for (const item of q) {
    try {
      await syncPushFn();
      dequeue(item.id);
      replayed++;
    } catch (e) {
      console.warn('[offline-queue] Replay failed for', item.id, e);
      break;
    }
  }

  if (replayed > 0 && showToast) {
    showToast(`Synced ${replayed} offline change${replayed !== 1 ? 's' : ''}`);
  }
}

// ── Online detection ──

export function initOnlineDetection(onOnline) {
  window.addEventListener('online', () => {
    if (onOnline) onOnline();
  });
}

// ════════════════════════════════════════
// ── Quick Capture Inbox ──
// ════════════════════════════════════════

import { Storage } from './storage.js';

const INBOX_KEY = 'inbox';

// ── Load / Save ──

export function loadInbox() {
  return Storage.get(INBOX_KEY, []);
}

function _saveInbox(items) {
  Storage.set(INBOX_KEY, items);
}

// ── Mutations ──

export function addToInbox(text) {
  if (!text.trim()) return null;
  const items = loadInbox();
  const item = { id: 'inbox-' + Date.now(), text: text.trim(), createdAt: new Date().toISOString() };
  items.unshift(item);
  _saveInbox(items);
  return item;
}

export function removeFromInbox(id) {
  const items = loadInbox().filter(i => i.id !== id);
  _saveInbox(items);
}

export function clearInbox() {
  _saveInbox([]);
}

export function getInboxCount() {
  return loadInbox().length;
}

// ── Move to other systems ──

export function moveInboxToDeadline(id, name, date, cat) {
  removeFromInbox(id);
  // Returns a deadline object — caller adds to state.deadlines
  return { name, date, cat: cat || 'homework' };
}

export function moveInboxToScratchpad(id, currentScratch) {
  const items = loadInbox();
  const item = items.find(i => i.id === id);
  if (!item) return currentScratch;
  removeFromInbox(id);
  return (currentScratch ? currentScratch + '\n' : '') + item.text;
}

// ════════════════════════════════════════
// ── AES-GCM Encryption at Rest ──
// ════════════════════════════════════════
// Opt-in encryption for sensitive storage keys using Web Crypto API.
// The key is derived from the user's password hash via PBKDF2.
// Requires HTTPS / localhost (crypto.subtle).

import { Storage } from './storage.js';

const ALGO      = 'AES-GCM';
const KEY_LEN   = 256;
const PBKDF_ITER = 100_000;

// Keys to encrypt when encryption is enabled
export const ENCRYPTABLE_KEYS = [
  'grades', 'lecture-notes', 'scratch', 'task-blocked-by',
  'weekly-reviews', 'daily-plans', 'goals',
];

let _cryptoKey = null; // cached CryptoKey

export function isEncryptionAvailable() {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

export function isEncryptionEnabled() {
  return !!Storage.getRaw('encryption-enabled', '');
}

export async function enableEncryption(passwordHash) {
  if (!isEncryptionAvailable()) throw new Error('Web Crypto not available (requires HTTPS)');
  _cryptoKey = await _deriveKey(passwordHash);
  Storage.setRaw('encryption-enabled', '1');
  Storage.setRaw('enc-salt', _arrayToHex(await _getOrCreateSalt()));
}

export function disableEncryption() {
  _cryptoKey = null;
  Storage.setRaw('encryption-enabled', '');
}

export async function initEncryption(passwordHash) {
  if (!isEncryptionEnabled() || !isEncryptionAvailable()) return;
  try {
    _cryptoKey = await _deriveKey(passwordHash);
  } catch (e) {
    console.warn('[encryption] Failed to init:', e.message);
  }
}

// ── Encrypt / decrypt a value ──
export async function encryptValue(plaintext) {
  if (!_cryptoKey) throw new Error('Encryption key not loaded');
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(plaintext));
  const ct   = await crypto.subtle.encrypt({ name: ALGO, iv }, _cryptoKey, data);
  return _arrayToHex(iv) + ':' + _arrayToHex(new Uint8Array(ct));
}

export async function decryptValue(ciphertext) {
  if (!_cryptoKey) throw new Error('Encryption key not loaded');
  const [ivHex, ctHex] = ciphertext.split(':');
  const iv = _hexToArray(ivHex);
  const ct = _hexToArray(ctHex);
  const pt = await crypto.subtle.decrypt({ name: ALGO, iv }, _cryptoKey, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}

// ── Encrypted storage helpers ──
export async function encryptedGet(key, fallback = null) {
  if (!isEncryptionEnabled() || !_cryptoKey) return Storage.get(key, fallback);
  const raw = localStorage.getItem(Storage._key(key));
  if (!raw) return fallback;
  try {
    if (raw.startsWith('{') || raw.startsWith('[')) return JSON.parse(raw); // not encrypted yet
    return await decryptValue(raw);
  } catch { return fallback; }
}

export async function encryptedSet(key, value) {
  if (!isEncryptionEnabled() || !_cryptoKey) { Storage.set(key, value); return; }
  try {
    const ct = await encryptValue(value);
    localStorage.setItem(Storage._key(key), ct);
  } catch { Storage.set(key, value); }
}

// ── Key derivation ──
async function _deriveKey(passwordHash) {
  const salt       = await _getOrCreateSalt();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passwordHash),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF_ITER, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGO, length: KEY_LEN },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function _getOrCreateSalt() {
  const stored = Storage.getRaw('enc-salt', '');
  if (stored) return _hexToArray(stored);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  Storage.setRaw('enc-salt', _arrayToHex(salt));
  return salt;
}

function _arrayToHex(arr) { return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join(''); }
function _hexToArray(hex) { return new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16))); }

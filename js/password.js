// ════════════════════════════════════════
// ── Password Gate ──
// ════════════════════════════════════════

import { CONFIG } from './config.js';
import { Storage } from './storage.js';

async function hashPass(pass) {
  const data = new TextEncoder().encode(pass);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function unlock() {
  document.getElementById('lock-screen').style.display = 'none';
  document.getElementById('app-wrapper').style.display = 'block';
  Storage.sessionSet('auth', '1');
}

export function initPasswordGate(onUnlocked) {
  // Check if already authenticated this session
  if (Storage.sessionGet('auth') === '1') {
    unlock();
    if (onUnlocked) onUnlocked();
    return;
  }

  const lockInput = document.getElementById('lock-input');
  if (!lockInput) return;

  lockInput.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const hash = await hashPass(lockInput.value);
    if (hash === CONFIG.passwordHash) {
      unlock();
      if (onUnlocked) onUnlocked();
    } else {
      const errEl = document.getElementById('lock-error');
      errEl.style.display = 'block';
      lockInput.value = '';
      lockInput.style.borderColor = '#e94560';
      setTimeout(() => { errEl.style.display = 'none'; lockInput.style.borderColor = ''; }, 2000);
    }
  });
}

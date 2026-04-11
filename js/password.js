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
  // Already authenticated (inline script or previous session)?
  if (Storage.sessionGet('auth') === '1') {
    unlock();
    if (onUnlocked) onUnlocked();
    return;
  }

  const lockScreen = document.getElementById('lock-screen');
  // If lock screen is already hidden, the inline script unlocked us
  if (lockScreen && lockScreen.style.display === 'none') {
    if (onUnlocked) onUnlocked();
    return;
  }

  const lockInput = document.getElementById('lock-input');
  if (!lockInput) return;

  async function tryUnlock() {
    try {
      const hash = await hashPass(lockInput.value);
      if (hash === CONFIG.passwordHash) {
        unlock();
        if (onUnlocked) onUnlocked();
      } else {
        const errEl = document.getElementById('lock-error');
        if (errEl) errEl.style.display = 'block';
        lockInput.value = '';
        lockInput.style.borderColor = '#e94560';
        setTimeout(() => {
          if (errEl) errEl.style.display = 'none';
          lockInput.style.borderColor = '';
          lockInput.focus();
        }, 2000);
      }
    } catch (err) {
      console.error('[password] Hash error:', err);
      const errEl = document.getElementById('lock-error');
      if (errEl) {
        errEl.textContent = 'Cannot verify password (requires HTTPS)';
        errEl.style.display = 'block';
      }
    }
  }

  // Replace the input to remove any inline-script listeners, then re-attach
  const fresh = lockInput.cloneNode(true);
  lockInput.parentNode.replaceChild(fresh, lockInput);
  fresh.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryUnlock();
  });
  fresh.focus();

  const lockBtn = document.getElementById('lock-submit');
  if (lockBtn) {
    const freshBtn = lockBtn.cloneNode(true);
    lockBtn.parentNode.replaceChild(freshBtn, lockBtn);
    freshBtn.addEventListener('click', tryUnlock);
  }
}

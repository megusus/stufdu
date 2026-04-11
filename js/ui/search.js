// ════════════════════════════════════════
// ── Search & Filter ──
// ════════════════════════════════════════

import { CONFIG } from '../config.js';
import { state } from '../state.js';

let _searchTimer = null;

export function setSearch(q, doRender) {
  state.searchQuery = q.toLowerCase().trim();
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => {
    doRender();
    const inp = document.getElementById('search-input');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }, CONFIG.searchDebounceMs);
}

export function clearSearch(doRender) {
  state.searchQuery = '';
  doRender();
  const inp = document.getElementById('search-input');
  if (inp) { inp.value = ''; inp.focus(); }
}

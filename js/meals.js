// ════════════════════════════════════════
// ── Meal Widget Logic ──
// ════════════════════════════════════════

import { CONFIG } from './config.js';
import { Storage } from './storage.js';
import { state, nowInTZ, saveMeals, haptic } from './state.js';

// ── Parsers ──

export function parseMealString(str) {
  if (!str || typeof str !== 'string') return [];
  return str.split(/[\r\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
}

export function parseSKSApiResponse(data) {
  const newData = {};
  if (!Array.isArray(data)) return newData;
  for (const item of data) {
    let dateKey = null;
    if (item.created_at) dateKey = item.created_at.substring(0, 10);
    if (!dateKey) continue;
    newData[dateKey] = {
      kahvalti: parseMealString(item.breakfast_tr || item.breakfast || ''),
      ogle: parseMealString(item.lunch_tr || item.lunch || ''),
      aksam: parseMealString(item.dinner_tr || item.dinner || ''),
      vegan: parseMealString(item.vegan_tr || item.vegan || ''),
    };
  }
  return newData;
}

export function parseMealText(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const newData = {};
  let currentDate = null;
  let currentType = 'ogle';
  const months = { 'ocak': 1, '\u015fubat': 2, 'subat': 2, 'mart': 3, 'nisan': 4, 'may\u0131s': 5, 'mayis': 5, 'haziran': 6, 'temmuz': 7, 'a\u011fustos': 8, 'agustos': 8, 'eyl\u00fcl': 9, 'eylul': 9, 'ekim': 10, 'kas\u0131m': 11, 'kasim': 11, 'aral\u0131k': 12, 'aralik': 12 };
  for (const line of lines) {
    const lower = line.toLowerCase();
    const dateMatch2 = line.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    const dateMatch3 = line.match(/(\d{4})-(\d{2})-(\d{2})/);
    const dateMatch1 = line.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (dateMatch3) { currentDate = dateMatch3[0]; if (!newData[currentDate]) newData[currentDate] = { kahvalti: [], ogle: [], aksam: [], vegan: [] }; continue; }
    if (dateMatch2) { currentDate = `${dateMatch2[3]}-${dateMatch2[2].padStart(2, '0')}-${dateMatch2[1].padStart(2, '0')}`; if (!newData[currentDate]) newData[currentDate] = { kahvalti: [], ogle: [], aksam: [], vegan: [] }; continue; }
    if (dateMatch1 && months[dateMatch1[2].toLowerCase()]) { const m = months[dateMatch1[2].toLowerCase()]; currentDate = `${dateMatch1[3]}-${String(m).padStart(2, '0')}-${dateMatch1[1].padStart(2, '0')}`; if (!newData[currentDate]) newData[currentDate] = { kahvalti: [], ogle: [], aksam: [], vegan: [] }; continue; }
    if (lower.includes('kahvalt') || lower.includes('breakfast')) { currentType = 'kahvalti'; continue; }
    if (lower.includes('\u00f6\u011fle') || lower.includes('ogle') || lower.includes('lunch')) { currentType = 'ogle'; continue; }
    if (lower.includes('ak\u015fam') || lower.includes('aksam') || lower.includes('dinner')) { currentType = 'aksam'; continue; }
    if (lower.includes('vegan')) { currentType = 'vegan'; continue; }
    if (currentDate && newData[currentDate]) {
      if (lower === 'tarih' || lower === 'g\u00fcn' || lower === 'gun' || lower === 'men\u00fc' || lower === 'menu') continue;
      const clean = line.replace(/^\d+[\.)]\]\s*/, '').replace(/\t+/g, ' ').trim();
      if (clean.length > 1 && clean.length < 100) newData[currentDate][currentType].push(clean);
    }
  }
  return newData;
}

// ── Meal actions ──

export async function fetchMeals(render, showToast) {
  state.mealFetchStatus = 'fetching';
  render();
  const now = nowInTZ();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  try {
    const url = `${CONFIG.mealApiUrl}?category=lunch&month=${month}&year=${year}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const json = await res.json();
      const items = Array.isArray(json) ? json : (json.data || []);
      const parsed = parseSKSApiResponse(items);
      if (Object.keys(parsed).length > 0) {
        Object.assign(state.mealData, parsed);
        saveMeals();
        state.mealFetchStatus = 'ok';
        render();
        showToast(`Loaded meals for ${Object.keys(parsed).length} days`);
        return;
      }
    }
  } catch (e) { console.warn('SKS API failed:', e.message); }
  state.mealFetchStatus = 'error';
  state.mealShowPaste = true;
  render();
}

export function savePastedMeals(render, showToast) {
  const ta = document.getElementById('meal-paste-input');
  if (!ta || !ta.value.trim()) { showToast('Paste meal data first'); return; }
  const parsed = parseMealText(ta.value);
  const count = Object.keys(parsed).length;
  if (count === 0) { showToast('Could not parse any dates from text'); return; }
  Object.assign(state.mealData, parsed);
  saveMeals();
  state.mealShowPaste = false;
  haptic('success');
  render();
  showToast(`Loaded meals for ${count} day${count > 1 ? 's' : ''}`);
}

export function toggleMealPaste(render) { state.mealShowPaste = !state.mealShowPaste; render(); }

export function clearMealData(render, showToast) {
  state.mealData = {};
  Storage.remove('meals');
  render();
  showToast('Meal data cleared');
}

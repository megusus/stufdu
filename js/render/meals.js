// ════════════════════════════════════════
// ── Meal Card Renderer ──
// ════════════════════════════════════════

import { state, escapeHtml, getDayMeals, getRelevantMealTypes, todayIdx } from '../state.js';
import { getDayLabel } from '../schedule.js';

export function renderMealCard(dayName, selectedDay) {
  try { return _renderMealCardInner(dayName, selectedDay); }
  catch (err) { console.error('[render] Meal card failed:', err); return ''; }
}
function _renderMealCardInner(dayName, selectedDay) {
  const isToday = selectedDay === todayIdx;
  const dayMeals = getDayMeals(selectedDay);
  if (!dayMeals || (!dayMeals.kahvalti.length && !dayMeals.ogle.length && !dayMeals.aksam.length && !(dayMeals.vegan && dayMeals.vegan.length))) {
    return '';
  }

  const mealTitle = isToday ? "Today's Menu" : `${getDayLabel(dayName)}'s Menu`;
  const relevantTypes = isToday ? getRelevantMealTypes() : ['kahvalti', 'ogle', 'aksam'];
  let html = `<div class="meal-card">
    <div class="meal-card-header">
      <div class="meal-card-title">\ud83c\udf7d\ufe0f ${mealTitle}</div>
      <button class="meal-card-refresh" data-action="fetchMeals">Refresh</button>
    </div>
    <div class="meal-items">`;

  if (dayMeals.kahvalti.length && relevantTypes.includes('kahvalti')) {
    html += `<div class="meal-type-label">Kahvalt\u0131</div>`;
    dayMeals.kahvalti.forEach(item => {
      html += `<div class="meal-item"><div class="meal-item-dot"></div>${escapeHtml(item)}</div>`;
    });
  }
  if (dayMeals.ogle.length && relevantTypes.includes('ogle')) {
    html += `<div class="meal-type-label">\u00d6\u011fle</div>`;
    dayMeals.ogle.forEach(item => {
      html += `<div class="meal-item"><div class="meal-item-dot"></div>${escapeHtml(item)}</div>`;
    });
  }
  if (dayMeals.aksam.length && relevantTypes.includes('aksam')) {
    html += `<div class="meal-type-label">Ak\u015fam</div>`;
    dayMeals.aksam.forEach(item => {
      html += `<div class="meal-item"><div class="meal-item-dot"></div>${escapeHtml(item)}</div>`;
    });
  }
  if (dayMeals.vegan && dayMeals.vegan.length) {
    html += `<div class="meal-type-label" style="color:#4caf50">\ud83c\udf31 Vegan</div>`;
    dayMeals.vegan.forEach(item => {
      html += `<div class="meal-item"><div class="meal-item-dot" style="background:#4caf50"></div>${escapeHtml(item)}</div>`;
    });
  }
  html += `</div></div>`;
  return html;
}

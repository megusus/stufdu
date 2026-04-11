// ════════════════════════════════════════
// ── Meal Card Renderer ──
// ════════════════════════════════════════

/**
 * Pure renderer: receives RenderContext, returns HTML string.
 * @param {import('./context.js').RenderContext} ctx
 */
export function renderMealCard(ctx) {
  const { state, dayName, escapeHtml, nowInTZ } = ctx;
  if (!state.mealData || Object.keys(state.mealData).length === 0) return '';

  const now = nowInTZ();
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayMeal = state.mealData[dateKey];
  if (!todayMeal) return '';

  const hour = now.getHours();
  let mealType = 'ogle';
  let mealLabel = '\u00d6\u011fle';
  if (hour < 10) { mealType = 'kahvalti'; mealLabel = 'Kahvalt\u0131'; }
  else if (hour >= 17) { mealType = 'aksam'; mealLabel = 'Ak\u015fam'; }

  const items = todayMeal[mealType] || [];
  const veganItems = todayMeal.vegan || [];
  if (items.length === 0 && veganItems.length === 0) return '';

  let html = `<div class="meal-card">
    <div class="meal-title">\ud83c\udf7d\ufe0f ${mealLabel} Men\u00fcs\u00fc</div>
    <div class="meal-items">${items.map(i => escapeHtml(i)).join(' \u00b7 ')}</div>`;
  if (veganItems.length > 0) {
    html += `<div class="meal-items vegan">\ud83c\udf31 ${veganItems.map(i => escapeHtml(i)).join(' \u00b7 ')}</div>`;
  }
  html += '</div>';

  return html;
}

// ════════════════════════════════════════
// ── Grades View Renderer ──
// ════════════════════════════════════════

import {
  loadGrades, getCatAverage, getOverallAverage, getLetter, getGradeColor,
} from '../grades.js';

export function renderGradesView(ctx) {
  try { return _renderGradesInner(ctx); }
  catch (err) {
    console.error('[render] Grades failed:', err);
    return `<div style="padding:24px;color:#e94560">Grades error: ${ctx.escapeHtml(String(err))}</div>`;
  }
}

function _renderGradesInner(ctx) {
  const { escapeHtml, categories } = ctx;
  const grades = loadGrades();
  const overall = getOverallAverage();
  const overallColor = getGradeColor(overall);
  const catKeys = categories.keys();

  let html = `<div class="view-page">
    <div class="view-page-header">
      <h1 class="view-page-title">📊 Grades</h1>
      <div class="view-page-sub">
        ${overall !== null
          ? `Overall: <strong style="color:${overallColor}">${overall}% (${getLetter(overall)})</strong>`
          : 'No grades recorded yet'}
      </div>
    </div>`;

  // Add grade form
  html += `<div class="grades-add-form" data-stop>
    <div class="review-section-title" style="font-size:12px;margin-bottom:10px">Add Assessment</div>
    <div class="grades-form-row">
      <select class="editor-select" id="grade-cat">
        ${catKeys.map(k => `<option value="${k}">${escapeHtml(categories.getLabel(k) || k)}</option>`).join('')}
      </select>
      <input class="inbox-capture-input" id="grade-name" type="text" placeholder="Assessment name" style="flex:2">
      <select class="editor-select" id="grade-type">
        <option value="exam">Exam</option>
        <option value="hw">Homework</option>
        <option value="quiz">Quiz</option>
        <option value="project">Project</option>
      </select>
    </div>
    <div class="grades-form-row">
      <input class="settings-input" id="grade-score" type="number" placeholder="Score" style="width:80px">
      <span style="font-size:12px;color:var(--dim)"> / </span>
      <input class="settings-input" id="grade-max" type="number" placeholder="Max" value="100" style="width:80px">
      <span style="font-size:12px;color:var(--dim)">Weight:</span>
      <input class="settings-input" id="grade-weight" type="number" placeholder="1" value="1" min="0.1" step="0.1" style="width:60px">
      <input class="settings-input" id="grade-date" type="date" value="${new Date().toISOString().slice(0,10)}" style="width:130px">
      <button class="data-btn" data-action="addGrade" style="color:var(--accent);border-color:#00d2ff44">+ Add</button>
    </div>
  </div>`;

  // Per-subject breakdown
  const hasAny = catKeys.some(k => (grades[k] || []).length > 0);
  if (!hasAny) {
    html += `<div class="inbox-empty">
      <div class="inbox-empty-icon">📊</div>
      <div class="inbox-empty-title">No grades yet</div>
      <div class="inbox-empty-sub">Add your first assessment above.</div>
    </div>`;
  } else {
    catKeys.forEach(cat => {
      const items = grades[cat] || [];
      if (items.length === 0) return;
      const avg = getCatAverage(cat);
      const avgColor = getGradeColor(avg);
      const c = categories.getColor(cat);

      html += `<div class="grade-cat-card">
        <div class="grade-cat-header">
          <div class="grade-cat-dot" style="background:${c.border}"></div>
          <div class="grade-cat-name">${escapeHtml(categories.getLabel(cat) || cat)}</div>
          <div class="grade-cat-avg" style="color:${avgColor}">${avg}% (${getLetter(avg)})</div>
        </div>
        <div class="grade-items">`;
      items.sort((a,b) => b.date.localeCompare(a.date)).forEach(g => {
        const pct = Math.round((g.score / g.maxScore) * 100);
        const color = getGradeColor(pct);
        html += `<div class="grade-item">
          <div class="grade-item-name">${escapeHtml(g.name)}</div>
          <div class="grade-item-type">${g.type}</div>
          <div class="grade-item-date">${g.date}</div>
          <div class="grade-item-score" style="color:${color}">${g.score}/${g.maxScore} (${pct}%)</div>
          <button class="editor-remove-btn" data-action="removeGrade" data-cat="${escapeHtml(cat)}" data-id="${escapeHtml(g.id)}" title="Remove">✕</button>
        </div>`;
      });
      html += `</div></div>`;
    });
  }

  html += `</div>`; // .view-page
  return html;
}

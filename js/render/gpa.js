// ════════════════════════════════════════
// ── GPA View Renderer ──
// ════════════════════════════════════════

import { calculateGPA, predictGPANeeded, GRADING_SCALES, loadGPAScale, loadCreditHours } from '../gpa.js';
import { CategoryRegistry } from '../categories.js';

export function renderGPAView(ctx) {
  try {
    const { escapeHtml } = ctx;
    const activeScale = loadGPAScale();
    const credits     = loadCreditHours();
    const { gpa, totalCredits, rows, scale } = calculateGPA(activeScale);
    const cats = CategoryRegistry.keys();

    let html = `<div class="view-page">
      <div class="view-page-header">
        <h1 class="view-page-title">🎓 GPA Calculator</h1>
        <div class="view-page-sub">Weighted GPA from your grade book · scale: ${escapeHtml(GRADING_SCALES[activeScale]?.label ?? activeScale)}</div>
      </div>`;

    // Scale selector
    html += `<div class="home-card" style="margin-bottom:12px">
      <div class="home-card-label">Grading Scale</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        ${Object.entries(GRADING_SCALES).map(([k, s]) =>
          `<button class="data-btn" data-action="setGPAScale" data-scale="${k}"
            style="${activeScale === k ? 'color:#00d2ff;border-color:#00d2ff44' : 'color:var(--dim);border-color:var(--border)'}">
            ${escapeHtml(s.label)}
          </button>`
        ).join('')}
      </div>
    </div>`;

    // GPA result card
    if (gpa !== null) {
      const color = gpa >= 3.5 ? '#00e676' : gpa >= 3.0 ? '#00d2ff' : gpa >= 2.0 ? '#ffab00' : '#e94560';
      html += `<div class="home-card home-card--wide" style="margin-bottom:12px;text-align:center;padding:24px">
        <div style="font-size:48px;font-weight:700;color:${color}">${gpa.toFixed(2)}</div>
        <div style="font-size:13px;color:var(--dim);margin-top:4px">GPA · ${totalCredits} credits total</div>
      </div>`;
    } else {
      html += `<div class="home-card" style="margin-bottom:12px">
        <div class="home-card-empty">Set credit hours below to calculate GPA</div>
      </div>`;
    }

    // Credit hours + per-course breakdown
    html += `<div class="home-card" style="margin-bottom:12px">
      <div class="home-card-label">Course Credits & Grades</div>
      <table style="width:100%;font-size:11px;border-collapse:collapse;margin-top:10px">
        <tr style="color:var(--dim);text-transform:uppercase;font-size:9px;letter-spacing:0.5px">
          <th style="text-align:left;padding:4px 8px">Course</th>
          <th style="text-align:center;padding:4px 8px">Credits</th>
          <th style="text-align:center;padding:4px 8px">Avg%</th>
          <th style="text-align:center;padding:4px 8px">Letter</th>
          <th style="text-align:center;padding:4px 8px">Points</th>
        </tr>`;

    cats.forEach(cat => {
      const label  = CategoryRegistry.getLabel(cat) || cat;
      const credit = credits[cat] ?? '';
      const row    = rows.find(r => r.cat === cat);
      html += `<tr style="border-top:1px solid var(--border)">
        <td style="padding:7px 8px;color:var(--text-bright);font-weight:600">${escapeHtml(label)}</td>
        <td style="padding:7px 8px;text-align:center">
          <input type="number" min="0" max="20" step="0.5" value="${escapeHtml(String(credit))}"
            style="width:52px;font-family:inherit;font-size:11px;background:var(--bg);color:var(--text);
            border:1px solid var(--border);border-radius:6px;padding:3px 6px;text-align:center"
            data-change-action="setCreditHours" data-cat="${escapeHtml(cat)}">
        </td>
        <td style="padding:7px 8px;text-align:center;color:var(--muted)">${row ? row.avg + '%' : '—'}</td>
        <td style="padding:7px 8px;text-align:center;font-weight:700;color:${row ? '#00d2ff' : 'var(--dim)'}">${row ? row.letter : '—'}</td>
        <td style="padding:7px 8px;text-align:center;color:var(--muted)">${row ? row.points.toFixed(1) : '—'}</td>
      </tr>`;
    });

    html += `</table></div>`;

    // GPA predictor
    html += `<div class="home-card" style="margin-bottom:12px">
      <div class="home-card-label">🎯 Target GPA Predictor</div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:10px">
        <label style="font-size:12px;color:var(--dim)">I want GPA:</label>
        <input type="number" min="0" max="4" step="0.1" id="gpa-target-input" value="3.5"
          style="width:70px;font-family:inherit;font-size:13px;font-weight:700;background:var(--bg);
          color:var(--text);border:1px solid var(--border);border-radius:8px;padding:6px 10px;text-align:center">
        <button class="data-btn" data-action="computeGPAPredictor"
          style="color:#00d2ff;border-color:#00d2ff44">Calculate</button>
      </div>
      <div id="gpa-predict-result" style="margin-top:10px;font-size:12px;color:var(--muted)"></div>
    </div>`;

    // Scale reference table
    html += `<div class="home-card">
      <div class="home-card-label">Scale Reference — ${escapeHtml(scale ? (GRADING_SCALES[activeScale]?.label ?? '') : '')}</div>
      <table style="width:100%;font-size:11px;border-collapse:collapse;margin-top:8px">
        <tr style="color:var(--dim);font-size:9px;text-transform:uppercase;letter-spacing:0.5px">
          <th style="text-align:left;padding:3px 8px">Letter</th>
          <th style="text-align:center;padding:3px 8px">Min %</th>
          <th style="text-align:center;padding:3px 8px">Points</th>
        </tr>
        ${(scale?.grades || []).map(g => `<tr style="border-top:1px solid var(--border)">
          <td style="padding:5px 8px;font-weight:700;color:var(--text-bright)">${g.letter}</td>
          <td style="padding:5px 8px;text-align:center;color:var(--muted)">${g.min}%</td>
          <td style="padding:5px 8px;text-align:center;color:#00d2ff">${g.points.toFixed(1)}</td>
        </tr>`).join('')}
      </table>
    </div>

    </div>`;

    return html;
  } catch (err) {
    console.error('[render] GPA failed:', err);
    return `<div style="padding:24px;color:#e94560">GPA render error: ${ctx.escapeHtml(String(err))}</div>`;
  }
}

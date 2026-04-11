// ════════════════════════════════════════
// ── Grade Tracker ──
// ════════════════════════════════════════

import { Storage } from './storage.js';

const GRADES_KEY = 'grades';

// { [cat]: [{ id, name, score, maxScore, weight, date, type }] }

export function loadGrades() {
  return Storage.get(GRADES_KEY, {});
}

function _saveGrades(grades) {
  Storage.set(GRADES_KEY, grades);
}

export function addGrade(cat, { name, score, maxScore, weight, date, type }) {
  const grades = loadGrades();
  if (!grades[cat]) grades[cat] = [];
  grades[cat].push({
    id: 'grade-' + Date.now(),
    name: name.trim(),
    score: Number(score),
    maxScore: Number(maxScore) || 100,
    weight: Number(weight) || 1,
    date: date || new Date().toISOString().slice(0,10),
    type: type || 'exam',
  });
  _saveGrades(grades);
}

export function removeGrade(cat, id) {
  const grades = loadGrades();
  if (grades[cat]) grades[cat] = grades[cat].filter(g => g.id !== id);
  _saveGrades(grades);
}

/** Weighted average percentage for a category (0-100) */
export function getCatAverage(cat) {
  const grades = loadGrades();
  const items = grades[cat] || [];
  if (items.length === 0) return null;
  const totalWeight = items.reduce((s, g) => s + g.weight, 0);
  if (totalWeight === 0) return null;
  const weighted = items.reduce((s, g) => s + (g.score / g.maxScore) * g.weight, 0);
  return Math.round((weighted / totalWeight) * 100);
}

/** Overall weighted GPA-style % across all categories */
export function getOverallAverage() {
  const grades = loadGrades();
  const cats = Object.keys(grades).filter(c => grades[c].length > 0);
  if (cats.length === 0) return null;
  const avgs = cats.map(c => getCatAverage(c)).filter(a => a !== null);
  return avgs.length === 0 ? null : Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length);
}

/** Letter grade from 0-100 percentage */
export function getLetter(pct) {
  if (pct === null) return '—';
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

export function getGradeColor(pct) {
  if (pct === null) return 'var(--dim)';
  if (pct >= 85) return '#00e676';
  if (pct >= 70) return '#00d2ff';
  if (pct >= 55) return '#ffab00';
  return '#e94560';
}

// ════════════════════════════════════════
// ── GPA Calculator ──
// ════════════════════════════════════════
// Supports Turkish YOK 4.0 scale (default), US 4.0, and custom scales.

import { Storage }             from './storage.js';
import { loadGrades, getCatAverage } from './grades.js';
import { CategoryRegistry }    from './categories.js';

// ── Grading Scales ──
export const GRADING_SCALES = {
  yok: {
    label: 'Turkish YOK (4.0)',
    grades: [
      { letter: 'AA', min: 90, points: 4.0 },
      { letter: 'BA', min: 85, points: 3.5 },
      { letter: 'BB', min: 80, points: 3.0 },
      { letter: 'CB', min: 75, points: 2.5 },
      { letter: 'CC', min: 70, points: 2.0 },
      { letter: 'DC', min: 60, points: 1.5 },
      { letter: 'DD', min: 50, points: 1.0 },
      { letter: 'FD', min: 40, points: 0.5 },
      { letter: 'FF', min: 0,  points: 0.0 },
    ],
  },
  us: {
    label: 'US 4.0',
    grades: [
      { letter: 'A+', min: 97, points: 4.0 },
      { letter: 'A',  min: 93, points: 4.0 },
      { letter: 'A-', min: 90, points: 3.7 },
      { letter: 'B+', min: 87, points: 3.3 },
      { letter: 'B',  min: 83, points: 3.0 },
      { letter: 'B-', min: 80, points: 2.7 },
      { letter: 'C+', min: 77, points: 2.3 },
      { letter: 'C',  min: 73, points: 2.0 },
      { letter: 'C-', min: 70, points: 1.7 },
      { letter: 'D+', min: 67, points: 1.3 },
      { letter: 'D',  min: 60, points: 1.0 },
      { letter: 'F',  min: 0,  points: 0.0 },
    ],
  },
  eu: {
    label: 'European ECTS',
    grades: [
      { letter: 'A', min: 86, points: 4.0 },
      { letter: 'B', min: 76, points: 3.0 },
      { letter: 'C', min: 66, points: 2.0 },
      { letter: 'D', min: 56, points: 1.0 },
      { letter: 'E', min: 46, points: 0.5 },
      { letter: 'F', min: 0,  points: 0.0 },
    ],
  },
};

// ── Credit hours per category ──
export function loadCreditHours()     { return Storage.get('credit-hours', {}); }
export function saveCreditHours(map)  { Storage.set('credit-hours', map); }

// ── Active scale ──
export function loadGPAScale()        { return Storage.getRaw('gpa-scale', 'yok') || 'yok'; }
export function saveGPAScale(key)     { Storage.setRaw('gpa-scale', key); }

// ── Core calculation ──
export function pctToPoints(pct, scaleKey = null) {
  const key    = scaleKey || loadGPAScale();
  const scale  = GRADING_SCALES[key] || GRADING_SCALES.yok;
  const entry  = scale.grades.find(g => pct >= g.min);
  return entry ? { points: entry.points, letter: entry.letter } : { points: 0, letter: 'FF' };
}

export function calculateGPA(scaleKey = null) {
  const key        = scaleKey || loadGPAScale();
  const grades     = loadGrades();
  const credits    = loadCreditHours();
  const cats       = CategoryRegistry.keys();

  let totalPoints = 0, totalCredits = 0;
  const rows = [];

  cats.forEach(cat => {
    const avg = getCatAverage(cat);
    if (avg === null) return;
    const credit = parseFloat(credits[cat]) || 0;
    if (credit <= 0) return;
    const { points, letter } = pctToPoints(avg, key);
    totalPoints  += points * credit;
    totalCredits += credit;
    rows.push({ cat, label: CategoryRegistry.getLabel(cat) || cat, avg, points, letter, credit });
  });

  const gpa = totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : null;
  return { gpa, totalCredits, rows, scale: GRADING_SCALES[key] };
}

// ── "What grade do I need?" predictor ──
// Given a target GPA, current state, and remaining courses (not yet graded),
// returns the minimum average % needed in each ungraded course.
export function predictGPANeeded(targetGPA, scaleKey = null) {
  const key     = scaleKey || loadGPAScale();
  const { gpa, totalCredits, rows } = calculateGPA(key);
  const credits = loadCreditHours();
  const grades  = loadGrades();
  const cats    = CategoryRegistry.keys();

  // Courses with credit hours but no grades yet
  const ungraded = cats.filter(cat => {
    const credit = parseFloat(credits[cat]) || 0;
    if (credit <= 0) return false;
    return !getCatAverage(cat);
  });

  if (ungraded.length === 0) return { possible: false, message: 'All courses have grades.' };

  const ungradedCredits = ungraded.reduce((s, c) => s + (parseFloat(credits[c]) || 0), 0);
  const neededPoints    = targetGPA * (totalCredits + ungradedCredits) - (gpa ?? 0) * totalCredits;
  const neededPPU       = neededPoints / ungradedCredits; // points per credit unit needed
  const neededPct       = neededPPU >= 4.0 ? '>100% (impossible)' : _pointsToPct(neededPPU, key);

  return {
    possible: neededPPU <= 4.0,
    neededPointsAvg: Math.round(neededPPU * 100) / 100,
    neededPct,
    ungradedCourses: ungraded.map(c => CategoryRegistry.getLabel(c) || c),
    message: neededPPU > 4.0
      ? `Target GPA of ${targetGPA} is not achievable even with 100% on remaining courses.`
      : `You need approx. ${neededPct}% avg on ${ungraded.length} remaining course(s) to reach ${targetGPA} GPA.`,
  };
}

function _pointsToPct(points, scaleKey) {
  const scale = GRADING_SCALES[scaleKey] || GRADING_SCALES.yok;
  // Find the grade band where these points fall, return its min %
  const sorted = [...scale.grades].sort((a, b) => a.points - b.points);
  const found  = sorted.find(g => g.points >= points);
  return found ? `${found.min}%` : '100%';
}

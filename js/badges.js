// ════════════════════════════════════════
// ── Achievement Badge System ──
// ════════════════════════════════════════

import { Storage } from './storage.js';

export const BADGE_DEFS = [
  { id: 'first-task',   icon: '⭐', name: 'First Step',     desc: 'Complete your first task' },
  { id: 'perfect-day',  icon: '🏆', name: 'Perfect Day',     desc: 'Complete 100% of tasks in a day' },
  { id: 'streak-3wk',   icon: '🔥', name: 'On a Roll',       desc: '3 consecutive weeks above 50%' },
  { id: 'streak-7wk',   icon: '💎', name: 'Diamond Streak',  desc: '7 consecutive weeks above 50%' },
  { id: 'habit-3',      icon: '✅', name: 'Habit Starter',   desc: '3-day streak on any habit' },
  { id: 'habit-7',      icon: '🎯', name: 'Habit Master',    desc: '7-day streak on any habit' },
  { id: 'bookworm',     icon: '📚', name: 'Bookworm',        desc: '5+ books in reading list' },
  { id: 'grade-a',      icon: '🎓', name: 'Top Student',     desc: 'Achieve 90%+ grade average' },
  { id: 'time-master',  icon: '⏱',  name: 'Time Master',     desc: 'Track 2+ hours in a single day' },
  { id: 'early-bird',   icon: '🌅', name: 'Early Bird',      desc: 'Complete a task before 8am' },
  { id: 'night-owl',    icon: '🦉', name: 'Night Owl',       desc: 'Complete a task after 10pm' },
  { id: 'goal-getter',  icon: '🎯', name: 'Goal Getter',     desc: 'Complete any goal' },
  { id: 'reviewer',     icon: '📋', name: 'Reflector',       desc: 'Complete 3 weekly reviews' },
  { id: 'inbox-zero',   icon: '📥', name: 'Inbox Zero',      desc: 'Triage all inbox items' },
  { id: 'centurion',    icon: '💯', name: 'Centurion',       desc: 'Complete 100 tasks total' },
  { id: 'multi-sub',    icon: '⚡', name: 'Multi-Subject',   desc: 'Complete tasks in 3+ subjects in one day' },
  { id: 'flash-10',     icon: '🧠', name: 'Flash Learner',   desc: 'Review 10 flashcards' },
  { id: 'flash-100',    icon: '🔬', name: 'Memory Palace',   desc: 'Review 100 flashcards' },
];

const _defMap = Object.fromEntries(BADGE_DEFS.map(b => [b.id, b]));

export function loadBadges()      { return Storage.get('badges', {}); }
export function saveBadges(b)     { Storage.set('badges', b); }
export function hasBadge(id)      { return !!loadBadges()[id]; }

// Returns true if newly earned (false if already had it)
export function earnBadge(id) {
  const badges = loadBadges();
  if (badges[id]) return false;
  badges[id] = { earnedAt: Date.now() };
  saveBadges(badges);
  return true;
}

/**
 * Check all conditions and earn any newly triggered badges.
 * Returns array of newly earned badge ids so callers can toast them.
 *
 * @param {object} params - snapshot of relevant state
 */
export function checkBadges({
  totalDone = 0,
  dayPct = 0,
  weekHistory = {},
  habitStreaks = {},
  readingCount = 0,
  gradeAvg = null,
  timeTodayMins = 0,
  completionHour = null,
  weeklyReviewCount = 0,
  inboxEmpty = false,
  catsToday = 0,
  goalsCompleted = 0,
  flashcardsReviewed = 0,
}) {
  const earned = [];

  const _try = (id, condition) => {
    if (condition && earnBadge(id)) earned.push(id);
  };

  _try('first-task',  totalDone >= 1);
  _try('centurion',   totalDone >= 100);
  _try('perfect-day', dayPct >= 100);
  _try('early-bird',  completionHour !== null && completionHour < 8);
  _try('night-owl',   completionHour !== null && completionHour >= 22);
  _try('bookworm',    readingCount >= 5);
  _try('grade-a',     gradeAvg !== null && gradeAvg >= 90);
  _try('time-master', timeTodayMins >= 120);
  _try('reviewer',    weeklyReviewCount >= 3);
  _try('inbox-zero',  inboxEmpty);
  _try('multi-sub',   catsToday >= 3);
  _try('goal-getter', goalsCompleted >= 1);
  _try('flash-10',    flashcardsReviewed >= 10);
  _try('flash-100',   flashcardsReviewed >= 100);

  const maxHabitStreak = Math.max(0, ...Object.values(habitStreaks));
  _try('habit-3', maxHabitStreak >= 3);
  _try('habit-7', maxHabitStreak >= 7);

  // Consecutive weeks above 50%
  const sortedWeeks = Object.entries(weekHistory).sort((a, b) => a[0].localeCompare(b[0]));
  let consecutive = 0, maxConsecutive = 0;
  for (const [, pct] of sortedWeeks) {
    if (pct >= 50) { consecutive++; maxConsecutive = Math.max(maxConsecutive, consecutive); }
    else consecutive = 0;
  }
  _try('streak-3wk', maxConsecutive >= 3);
  _try('streak-7wk', maxConsecutive >= 7);

  return earned;
}

export function getBadgeDef(id) { return _defMap[id]; }

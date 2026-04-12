// ════════════════════════════════════════
// ── Achievement Progression + Challenges ──
// ════════════════════════════════════════

import { Storage } from './storage.js';

const PROFILE_KEY = 'achievement-profile';
const CLAIMS_KEY = 'achievement-daily-claims';

export const XP_REWARDS = {
  task: 10,
  habit: 15,
  focus: 20,
  review: 25,
  challenge: 40,
};

export const DAILY_CHALLENGES = [
  { id: 'three-before-noon', icon: '☀️', title: 'Morning Strike', desc: 'Complete 3 tasks before noon', metric: 'earlyDone', target: 3, xp: 40 },
  { id: 'two-hour-track', icon: '⏱', title: 'Deep Ledger', desc: 'Track 2 hours of study time', metric: 'timeMins', target: 120, xp: 45 },
  { id: 'habit-lock', icon: '🔥', title: 'Keep The Chain', desc: 'Check off every active habit', metric: 'habitsDone', targetMetric: 'habitTotal', xp: 35 },
  { id: 'clean-day', icon: '✓', title: 'Clean Sweep', desc: 'Finish every task scheduled today', metric: 'todayDone', targetMetric: 'todayTotal', xp: 55 },
  { id: 'two-subjects', icon: '◇', title: 'Cross-Train', desc: 'Complete tasks in 2 different subjects', metric: 'subjectsDone', target: 2, xp: 40 },
];

function _dateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function _challengeForDate(date = new Date()) {
  const key = _dateKey(date);
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
  return DAILY_CHALLENGES[hash % DAILY_CHALLENGES.length];
}

export function loadAchievementProfile() {
  const raw = Storage.get(PROFILE_KEY, {});
  return {
    xp: Math.max(0, Number(raw.xp) || 0),
    shields: Math.max(0, Number(raw.shields) || 0),
    milestones: raw.milestones && typeof raw.milestones === 'object' ? raw.milestones : {},
    events: Array.isArray(raw.events) ? raw.events.slice(0, 8) : [],
  };
}

function _saveProfile(profile) {
  Storage.set(PROFILE_KEY, {
    xp: profile.xp,
    shields: profile.shields,
    milestones: profile.milestones || {},
    events: (profile.events || []).slice(0, 8),
  });
}

export function getLevelInfo(xp) {
  let level = 1;
  let floor = 0;
  let next = 100;
  while (xp >= next) {
    level++;
    floor = next;
    next += 100 + (level - 1) * 50;
  }
  const span = Math.max(1, next - floor);
  return {
    level,
    floor,
    next,
    intoLevel: xp - floor,
    needed: next - xp,
    pct: Math.max(0, Math.min(100, Math.round(((xp - floor) / span) * 100))),
  };
}

export function awardXP(label, amount) {
  const profile = loadAchievementProfile();
  const oldLevel = getLevelInfo(profile.xp).level;
  profile.xp += Math.max(0, Number(amount) || 0);
  const newLevel = getLevelInfo(profile.xp).level;
  let shieldGranted = false;
  if (newLevel > oldLevel && newLevel % 5 === 0) {
    profile.shields += 1;
    shieldGranted = true;
  }
  profile.events = [
    { label, amount, at: Date.now() },
    ...(profile.events || []),
  ].slice(0, 8);
  _saveProfile(profile);
  return { profile, oldLevel, newLevel, leveledUp: newLevel > oldLevel, shieldGranted };
}

export function awardActivityXP(key, label, amount) {
  const profile = loadAchievementProfile();
  const marker = `xp:${key}`;
  if (profile.milestones[marker]) {
    return { profile, skipped: true, leveledUp: false, shieldGranted: false };
  }
  profile.milestones[marker] = Date.now();
  _saveProfile(profile);
  return awardXP(label, amount);
}

export function grantShield(label = 'Streak shield earned') {
  const profile = loadAchievementProfile();
  profile.shields += 1;
  profile.events = [{ label, amount: 0, at: Date.now(), shield: true }, ...(profile.events || [])].slice(0, 8);
  _saveProfile(profile);
  return profile;
}

export function loadDailyClaims() {
  return Storage.get(CLAIMS_KEY, {});
}

function _saveDailyClaims(claims) {
  Storage.set(CLAIMS_KEY, claims);
}

export function getDailyChallenge(snapshot, date = new Date()) {
  const key = _dateKey(date);
  const def = _challengeForDate(date);
  const target = Math.max(1, def.targetMetric ? Number(snapshot[def.targetMetric] || 0) : Number(def.target || 1));
  const progress = Math.max(0, Math.min(target, Number(snapshot[def.metric] || 0)));
  const claims = loadDailyClaims();
  return {
    ...def,
    dateKey: key,
    target,
    progress,
    pct: Math.round((progress / target) * 100),
    complete: progress >= target,
    claimed: claims[key] === def.id,
  };
}

export function claimDailyChallenge(snapshot, date = new Date()) {
  const challenge = getDailyChallenge(snapshot, date);
  if (!challenge.complete || challenge.claimed) return { ok: false, challenge };
  const claims = loadDailyClaims();
  claims[challenge.dateKey] = challenge.id;
  _saveDailyClaims(claims);
  const result = awardXP(`Daily challenge: ${challenge.title}`, challenge.xp);
  const claimCount = Object.keys(claims).length;
  if (claimCount > 0 && claimCount % 3 === 0) {
    grantShield('Daily challenge streak shield');
    result.shieldGranted = true;
  }
  return { ok: true, challenge, result };
}

export function syncAchievementMilestones(snapshot) {
  const profile = loadAchievementProfile();
  const unlocked = [];
  const tests = [
    { id: 'tasks-100', label: '100 tasks completed', xp: 90, ok: snapshot.totalDone >= 100 },
    { id: 'streak-10', label: '10-week streak', xp: 100, ok: snapshot.longestWeekStreak >= 10 },
    { id: 'straight-a', label: '90% grade average', xp: 80, ok: snapshot.gradeAvg !== null && snapshot.gradeAvg >= 90 },
  ];

  tests.forEach(t => {
    if (!t.ok || profile.milestones[t.id]) return;
    profile.milestones[t.id] = Date.now();
    unlocked.push(t);
  });

  if (snapshot.weekPct >= 100 && snapshot.weekKey && !profile.milestones[`perfect-${snapshot.weekKey}`]) {
    profile.milestones[`perfect-${snapshot.weekKey}`] = Date.now();
    profile.shields += 1;
    profile.events = [{ label: 'Perfect week shield', amount: 0, at: Date.now(), shield: true }, ...(profile.events || [])].slice(0, 8);
    unlocked.push({ id: 'perfect-week', label: 'Perfect week shield', xp: 0, shield: true });
  }

  _saveProfile(profile);
  unlocked.filter(t => t.xp > 0).forEach(t => awardXP(`Milestone: ${t.label}`, t.xp));
  return unlocked;
}

export function getPersonalBests(snapshot) {
  const historyEntries = Object.entries(snapshot.history || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const bestWeek = historyEntries.reduce((best, [key, pct]) => pct > best.pct ? { key, pct } : best, { key: '—', pct: 0 });
  let streak = 0;
  let longest = 0;
  historyEntries.forEach(([, pct]) => {
    if (pct >= 50) { streak++; longest = Math.max(longest, streak); }
    else streak = 0;
  });

  const bestDay = (snapshot.dayProgress || []).reduce((best, day) => {
    if (day.done > best.done) return day;
    if (day.done === best.done && day.pct > best.pct) return day;
    return best;
  }, { label: '—', done: 0, pct: 0 });

  return {
    bestWeek,
    longestStreak: longest,
    bestDay,
    mostTrackedMins: snapshot.weeklyTimeMins || 0,
  };
}

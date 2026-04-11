// ════════════════════════════════════════
// ── Centralized State Container ──
// ════════════════════════════════════════

import { CONFIG } from './config.js';
import { Storage } from './storage.js';
import { CategoryRegistry } from './categories.js';
import { DAYS, schedule, findItemById } from './schedule.js';

// ── Constants ──
export const STATUS_DONE = 'done';
export const STATUS_SKIP = 'skip';
export const STATUS_PROGRESS = 'progress';
export const STATUS_BLOCKED = 'blocked';

// ── Time utilities ──
let _tzCache = null;
let _tzCacheTime = 0;
export function nowInTZ() {
  const now = Date.now();
  if (_tzCache && now - _tzCacheTime < 1000) return _tzCache;
  const str = new Date().toLocaleString('en-US', { timeZone: CONFIG.timezone });
  _tzCache = new Date(str);
  _tzCacheTime = now;
  return _tzCache;
}

export function getISOWeek(d) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export function getWeekKey() { return 'w' + getISOWeek(nowInTZ()); }
export function getWeekNum() { return getISOWeek(nowInTZ()); }

// ── State ──
const today = nowInTZ().getDay();
export const todayIdx = today === 0 ? 6 : today - 1;

export const state = {
  checked: {},       // { id: "done"|"skip"|"progress"|"blocked"|true }
  taskNotes: {},     // { id: "note text" }
  taskDeferred: {},  // { id: "DayName" }
  lockedDays: {},    // { "Monday": true, ... }
  taskLinks: {},     // { taskId: ["url1", "url2"] }
  deadlines: [],     // [{ name, date (YYYY-MM-DD), cat }]

  selectedDay: todayIdx,
  viewMode: 'day',
  openPanels: {},
  openActions: null,
  openNoteInput: null,
  openLectureNotes: null,
  lectureNotes: {},   // { taskId: "multi-line notes" }
  taskBlockedBy: {},  // { taskId: [taskId, ...] }
  openDeferPicker: null,
  openLinkInput: null,
  lastToggle: null,
  toastTimer: null,
  fabOpen: false,
  activeFilter: null,
  weekViewCollapsed: {},
  lastDayDirection: null,
  justCompletedId: null,
  justSkippedId: null,
  celebrationShown: {},
  pastWeekViewing: null,
  focusMode: false,
  searchQuery: '',
  showShortcuts: false,
  fontScale: 'normal',
  showDeadlineForm: false,
  scratchpadOpen: false,

  // Reading list
  readingList: [],
  readingSyncStatus: null,
  readingLastSync: null,
  readingShowCSV: false,

  // Meals
  mealData: {},
  mealFetchStatus: '',
  mealShowPaste: false,

  // Sync
  firebaseReady: false,
  syncRef: null,
  syncStatus: 'offline',
  syncListener: null,
  ignoreNextRemote: false,
  firebaseSDKPromise: null,
  syncConnectionRef: null,
  syncConnectionListener: null,
  syncHistoryRef: null,
  syncHistoryListener: null,
  syncNotesRef: null,
  syncNotesListener: null,
  syncDeferRef: null,
  syncDeferListener: null,
  syncLinksRef: null,
  syncLinksListener: null,
  syncDeadlinesRef: null,
  syncDeadlinesListener: null,
  syncScratchRef: null,
  syncScratchListener: null,
  syncUid: null,

  // Category management
  catEditKey: null,
  showCatAddForm: false,

  // Section management (editor panel)
  renamingSectionIdx: null,  // { day, idx } | null
  addingSectionDay: null,    // dayName | null

  // Day management (editor panel)
  renamingDayName: null,     // dayName | null
  showDayManager: false,

  // Notifications
  notifEnabled: typeof Notification !== 'undefined' && Notification.permission === 'granted',
  notifTimers: [],
};

// ── Status helpers ──
export function getStatus(id) {
  const v = state.checked[id];
  if (v === true || v === STATUS_DONE) return STATUS_DONE;
  if (v === STATUS_SKIP || v === STATUS_PROGRESS || v === STATUS_BLOCKED) return v;
  return '';
}

// ── Estimate helpers ──
export function getEstimate(item) {
  if (item.est !== undefined && item.est !== null) return item.est;
  const defaultEst = CategoryRegistry.getEstimate(item.cat);
  return defaultEst !== undefined && defaultEst !== null ? defaultEst : 60;
}

export function formatEst(min) {
  if (min <= 0) return '';
  if (min < 60) return min + 'm';
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ── HTML escaping ──
export function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Progress (cached per render cycle) ──
let _progressCache = {};
export function invalidateProgressCache() { _progressCache = {}; }

export function getDayProgress(dayName) {
  if (_progressCache[dayName]) return _progressCache[dayName];
  const day = schedule[dayName];
  let total = 0, done = 0, estRemain = 0;
  day.sections.forEach(s => s.items.forEach(item => {
    if (state.taskDeferred[item.id] && state.taskDeferred[item.id] !== dayName) return;
    total++;
    const st = getStatus(item.id);
    if (st === STATUS_DONE || st === STATUS_SKIP) done++;
    else estRemain += getEstimate(item);
  }));
  Object.entries(state.taskDeferred).forEach(([id, target]) => {
    if (target === dayName) {
      let isOwnTask = false;
      for (const sec of day.sections) {
        for (const it of sec.items) { if (it.id === id) { isOwnTask = true; break; } }
        if (isOwnTask) break;
      }
      if (isOwnTask) return;
      total++;
      const st = getStatus(id);
      if (st === STATUS_DONE || st === STATUS_SKIP) done++;
      else {
        const item = findItemById(id);
        estRemain += item ? getEstimate(item) : 60;
      }
    }
  });
  const result = { total, done, pct: total ? Math.round((done / total) * 100) : 0, estRemain };
  _progressCache[dayName] = result;
  return result;
}

export function getWeeklyProgress() {
  if (_progressCache._weekly) return _progressCache._weekly;
  let total = 0, done = 0, estRemain = 0;
  DAYS.forEach(d => { const p = getDayProgress(d); total += p.total; done += p.done; estRemain += p.estRemain; });
  const result = { total, done, pct: total ? Math.round((done / total) * 100) : 0, estRemain };
  _progressCache._weekly = result;
  return result;
}

// ── Persistence ──
export function loadState() {
  state.checked = Storage.get(getWeekKey(), {});
  state.taskNotes = Storage.get(getWeekKey() + '-notes', {});
  state.taskDeferred = Storage.get(getWeekKey() + '-defer', {});
  state.lockedDays = Storage.get(getWeekKey() + '-lock', {});
  state.taskLinks = Storage.get('links', {});
  state.lectureNotes = Storage.get('lecture-notes', {});
  state.taskBlockedBy = Storage.get('task-blocked-by', {});
  state.deadlines = Storage.get('deadlines', []);
  state.mealData = Storage.get('meals', {});
  state.fontScale = Storage.getRaw('fontscale', 'normal') || 'normal';
  // Reading list
  state.readingList = Storage.get('reading-list', null) || READING_LIST_DEFAULT;
  state.readingLastSync = Storage.getRaw('reading-sync-ts', '') || null;
}

let _saveTimer = null;
export function saveState() {
  invalidateProgressCache();
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    Storage.set(getWeekKey(), state.checked);
    Storage.set(getWeekKey() + '-notes', state.taskNotes);
    Storage.set(getWeekKey() + '-defer', state.taskDeferred);
    Storage.set(getWeekKey() + '-lock', state.lockedDays);
    saveHistory();
  }, CONFIG.saveDebounceMs);
}

export function saveLinks() {
  Storage.set('links', state.taskLinks);
}

export function saveLectureNotes() {
  Storage.set('lecture-notes', state.lectureNotes);
}

export function saveTaskBlockedBy() {
  Storage.set('task-blocked-by', state.taskBlockedBy);
}

/** Auto-check blocked status: a task is blocked if any of its blockedBy tasks are not done */
export function isActuallyBlocked(taskId) {
  const blockers = state.taskBlockedBy[taskId];
  if (!blockers || blockers.length === 0) return false;
  return blockers.some(bid => {
    const s = state.checked[bid];
    return !s || (s !== 'done' && s !== true);
  });
}

export function saveDeadlines() {
  Storage.set('deadlines', state.deadlines);
}

export function saveMeals() {
  Storage.set('meals', state.mealData);
}

export function saveReadingList() {
  Storage.set('reading-list', state.readingList);
}

// ── History / Streak ──
export function saveHistory() {
  try {
    const hist = Storage.get('history', {});
    hist[getWeekKey()] = getWeeklyProgress().pct;
    Storage.set('history', hist);
  } catch (e) { console.warn('Failed to save history:', e.message); }
}

export function loadHistory() {
  return Storage.get('history', {});
}

// ── Scratchpad ──
export function loadScratchpad() { return Storage.getRaw('scratch', ''); }
export function saveScratchpad(text) { Storage.setRaw('scratch', text); }

// ── Day helpers ──
export function getTaskDay(id) {
  if (state.taskDeferred[id]) return state.taskDeferred[id];
  for (const dName of DAYS) {
    for (const sec of (schedule[dName]?.sections || [])) {
      for (const item of (sec.items || [])) {
        if (item.id === id) return dName;
      }
    }
  }
  return null;
}

export function isDayLocked(dayName) { return !!state.lockedDays[dayName]; }
export function isTaskLocked(id) {
  const day = getTaskDay(id);
  return day && isDayLocked(day);
}

// ── Haptics ──
const _isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
export function haptic(style) {
  if (!_isMobile || !navigator.vibrate) return;
  switch (style) {
    case 'light':   navigator.vibrate(8); break;
    case 'medium':  navigator.vibrate(15); break;
    case 'heavy':   navigator.vibrate(25); break;
    case 'success': navigator.vibrate([8, 60, 12]); break;
    case 'error':   navigator.vibrate([20, 40, 20, 40, 20]); break;
    case 'select':  navigator.vibrate(4); break;
    default:        navigator.vibrate(10);
  }
}

// ── Meal helpers ──
export function getTodayMeals() {
  const now = nowInTZ();
  const key = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
  return state.mealData[key] || null;
}

export function getDayMeals(dayIdx) {
  const now = nowInTZ();
  const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const diff = dayIdx - currentDay;
  const target = new Date(now);
  target.setDate(target.getDate() + diff);
  const key = target.getFullYear() + '-' +
    String(target.getMonth() + 1).padStart(2, '0') + '-' +
    String(target.getDate()).padStart(2, '0');
  return state.mealData[key] || null;
}

export function getRelevantMealTypes() {
  const h = nowInTZ().getHours();
  if (h < 10) return ['kahvalti', 'ogle'];
  if (h < 14) return ['ogle', 'aksam'];
  if (h < 18) return ['aksam', 'ogle'];
  return ['aksam'];
}

// ── Subject streaks ──
export function getSubjectStreaks() {
  const catCounts = {};
  DAYS.forEach(dayName => {
    (schedule[dayName]?.sections || []).forEach(s => (s.items || []).forEach(item => {
      if (state.taskDeferred[item.id] && state.taskDeferred[item.id] !== dayName) return;
      const cat = item.cat;
      if (!cat || cat === 'routine' || cat === 'reflect') return;
      if (!catCounts[cat]) catCounts[cat] = { total: 0, done: 0 };
      catCounts[cat].total++;
      const st = getStatus(item.id);
      if (st === STATUS_DONE) catCounts[cat].done++;
    }));
  });
  return catCounts;
}

// ── Skip debt ──
export function getSkipDebt() {
  const debt = {};
  DAYS.forEach(dayName => {
    (schedule[dayName]?.sections || []).forEach(s => (s.items || []).forEach(item => {
      if (getStatus(item.id) === STATUS_SKIP) {
        const cat = item.cat;
        if (!cat || cat === 'routine') return;
        const label = CategoryRegistry.getLabel(cat) || cat;
        if (!debt[label]) debt[label] = 0;
        debt[label]++;
      }
    }));
  });
  return debt;
}

// ── Time-aware sections ──
export function getCurrentSectionIndex(sections) {
  const now = nowInTZ();
  const h = now.getHours() + now.getMinutes() / 60;
  const times = sections.map((s, i) => {
    for (const item of s.items) {
      const m = item.text.match(/(\d{1,2}):(\d{2})/);
      if (m) return parseInt(m[1]) + parseInt(m[2]) / 60;
    }
    const l = s.label.toLowerCase();
    if (l.includes('before') || l.includes('morning') || l.includes('core')) return 8;
    if (l.includes('after') || l.includes('afternoon')) return 15;
    if (l.includes('evening')) return 18;
    if (l.includes('class') || l.includes('meeting')) return 9;
    return 8 + i * 3;
  });
  let idx = 0;
  for (let i = 0; i < times.length; i++) { if (h >= times[i]) idx = i; }
  return idx;
}

// ── Commute ──
export function getCommuteInfo() {
  const dayName = DAYS[state.selectedDay];
  const day = schedule[dayName];
  if (!day) return null;
  if (!day.leave) return null;
  const now = nowInTZ();
  if (state.selectedDay !== todayIdx) return { label: `Leave at ${day.leave}`, mins: null };
  const [lh, lm] = day.leave.split(':').map(Number);
  const leaveMin = lh * 60 + lm;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const diff = leaveMin - nowMin;
  if (diff <= 0) return null;
  return { label: `Leave in`, mins: diff, time: day.leave };
}

// ── Weekly summary ──
export function generateWeeklySummary() {
  const wp = getWeeklyProgress();
  const skipDebt = getSkipDebt();
  const streaks = getSubjectStreaks();
  return { wp, skipDebt, streaks };
}

// ── Days until helper ──
export function getDaysUntil(dateStr) {
  const now = nowInTZ(); now.setHours(0,0,0,0);
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(now.getTime());
  target.setFullYear(y, m - 1, d);
  return Math.round((target - now) / 86400000);
}

// ── Past week data ──
export function getPastWeekData(weekKey) {
  return Storage.get(weekKey, {});
}

// ── Default reading list ──
export const READING_LIST_DEFAULT = [
  { title: "Enlightenment Now: The Case for Reason, Science, Humanism, and Progress", author: "Steven Pinker" },
  { title: "The Structure of Scientific Revolutions", author: "Thomas S. Kuhn" },
  { title: "The Logic of Scientific Discovery", author: "Karl Popper" },
  { title: "The 48 Laws of Power", author: "Robert Greene" },
  { title: "On War", author: "Carl von Clausewitz" },
  { title: "The Art of War", author: "Sun Tzu" },
  { title: "Two Concepts of Liberty", author: "Isaiah Berlin" },
  { title: "The Crooked Timber of Humanity: Chapters in the History of Ideas", author: "Isaiah Berlin" },
  { title: "The Open Society and Its Enemies", author: "Karl Popper" },
  { title: "Lectures on the Philosophy of History", author: "Georg Wilhelm Friedrich Hegel" },
  { title: "I Will Never See the World Again", author: "Ahmet Altan" },
  { title: "Passive Revolution: Absorbing the Islamic Challenge to Capitalism", author: "Cihan Tu\u011fal" },
  { title: "Being Different in Turkey", author: "Binnaz Toprak" },
  { title: "A Study of History, abridged", author: "Arnold Joseph Toynbee" },
  { title: "The Decline of the West", author: "Oswald Spengler" },
  { title: "The Decline and Fall of the Roman Empire", author: "Edward Gibbon" },
  { title: "History of the Peloponnesian War", author: "Thucydides" },
  { title: "The Muqaddimah: An Introduction to History", author: "Ibn Khaldun" },
  { title: "The Young Turk Legacy and Nation Building", author: "Erik-Jan Z\u00fcrcher" },
  { title: "The Making of Modern Turkey", author: "Feroz Ahmad" },
  { title: "The Development of Secularism in Turkey", author: "Niyazi Berkes" },
  { title: "Corporatist Ideology in Kemalist Turkey: Progress Or Order?", author: "Taha Parla" },
  { title: "Atat\u00fcrk: An Intellectual Biography", author: "M. \u015e\u00fckr\u00fc Hanio\u011flu" },
  { title: "The Politicization of Islam", author: "Kemal H. Karpat" },
  { title: "The Ottoman Empire: The Classical Age 1300-1600", author: "Halil \u0130nalc\u0131k" },
  { title: "Osman's Dream: The History of the Ottoman Empire", author: "Caroline Finkel" },
  { title: "The Ottoman Empire, 1700-1922", author: "Donald Quataert" },
  { title: "A Brief History of the Late Ottoman Empire", author: "M. \u015e\u00fckr\u00fc Hanio\u011flu" },
  { title: "The Fall of the Ottomans: The Great War in the Middle East", author: "Eugene Rogan" },
  { title: "The First Total War: Napoleon's Europe And the Birth of Warfare As We Know It", author: "David A. Bell" },
  { title: "The Coming of the French Revolution", author: "Georges Lefebvre" },
  { title: "Citizens: A Chronicle of the French Revolution", author: "Simon Schama" },
  { title: "Political Order and Political Decay", author: "Francis Fukuyama" },
  { title: "The Origins of Political Order", author: "Francis Fukuyama" },
  { title: "Coercion, Capital, and European States, A.D. 990-1992", author: "Charles Tilly" },
  { title: "The Ethnic Origins of Nations", author: "Anthony D. Smith" },
  { title: "Nations and Nationalism since 1780", author: "Eric J. Hobsbawm" },
  { title: "Imagined Communities", author: "Benedict Anderson" },
  { title: "Nations and Nationalism", author: "Ernest Gellner" },
  { title: "The Protestant Ethic and the Spirit of Capitalism", author: "Max Weber" },
  { title: "Politics As a Vocation", author: "Max Weber" },
  { title: "The Vocation Lectures", author: "Max Weber" },
  { title: "The Concept of the Political", author: "Carl Schmitt" },
  { title: "On Revolution", author: "Hannah Arendt" },
  { title: "The Origins of Totalitarianism", author: "Hannah Arendt" },
  { title: "The Communist Manifesto", author: "Karl Marx" },
  { title: "Reflections on the Revolution in France", author: "Edmund Burke" },
  { title: "The Old Regime and the French Revolution", author: "Alexis de Tocqueville" },
  { title: "Democracy in America", author: "Alexis de Tocqueville" },
  { title: "Discourses on Livy", author: "Niccol\u00f2 Machiavelli" },
  { title: "Prens", author: "Niccol\u00f2 Machiavelli" },
  { title: "The Science of Mechanics", author: "Ernst Mach" },
  { title: "The Study of Sociology", author: "Herbert Spencer" },
  { title: "Utilitarianism", author: "John Stuart Mill" },
  { title: "Introduction to Positive Philosophy", author: "Auguste Comte" },
  { title: "An Enquiry Concerning Human Understanding", author: "David Hume" },
  { title: "Leviathan (Cambridge Texts)", author: "Thomas Hobbes" },
  { title: "Voltaire's Philosophical Dictionary", author: "Voltaire" },
  { title: "Discourse on the Method", author: "Ren\u00e9 Descartes" },
  { title: "Lider ve Demagog", author: "\u015eevket S\u00fcreyya Aydemir" },
  { title: "\u0130nk\u0131lap ve Kadro", author: "\u015eevket S\u00fcreyya Aydemir" },
  { title: "Atat\u00fcrk Devrimi Sosyolojisi", author: "Kurt Steinhaus" },
  { title: "Atat\u00fcrk: Kurucu Felsefenin Evrimi", author: "Zafer Toprak" },
  { title: "\u0130nk\u0131lap ve \u0130stiklal", author: "Recep Peker" },
  { title: "D\u00f6n\u00fc\u015f\u00fcm", author: "Franz Kafka" },
  { title: "Anne Karenina", author: "Leo Tolstoy" },
  { title: "Dead Poets Society", author: "N.H. Kleinbaum" },
  { title: "Atat\u00fcrk Hakk\u0131nda Hat\u0131ralar ve Belgeler", author: "Afet \u0130nan" },
  { title: "Atat\u00fcrk: The Rebirth Of A Nation", author: "John Patrick Douglas Balfour" },
  { title: "21. Y\u00fczy\u0131lda T\u00fcrk Milliyet\u00e7ili\u011finin Prati\u011fi", author: "M. Bahad\u0131rhan Din\u00e7aslan" },
  { title: "Siyasetten Etimolojiye L\u00fczumlu Bilgiler", author: "M. Bahad\u0131rhan Din\u00e7aslan" },
  { title: "Sek\u00fcler Milliyet\u00e7ilik", author: "M. Bahad\u0131rhan Din\u00e7aslan" },
  { title: "T\u00fcrk\u00e7\u00fcl\u00fc\u011f\u00fcn Esaslar\u0131", author: "Ziya G\u00f6kalp" },
  { title: "T\u00fcrklerin D\u00fcnyas\u0131", author: "Ahmet Ta\u015fa\u011f\u0131l" },
  { title: "Cumhuriyetin 100 \u0130smi", author: "Emrah Safa G\u00fcrkan" },
  { title: "Cumhuriyet'in 100 G\u00fcn\u00fc", author: "Emrah Safa G\u00fcrkan" },
  { title: "The Spirit of the Laws", author: "Montesquieu" },
  { title: "Second Treatise of Government", author: "John Locke" },
  { title: "Hayat\u0131n Anlam\u0131", author: "Arthur Schopenhauer" },
  { title: "Eski T\u00fcrk Boylar\u0131", author: "Ahmet Ta\u015fa\u011f\u0131l" },
  { title: "T\u00fcrk Model Devleti: G\u00f6k T\u00fcrkler", author: "Ahmet Ta\u015fa\u011f\u0131l" },
  { title: "Bozk\u0131rlar\u0131n \u0130lk \u0130mparatorlu\u011fu Hunlar", author: "Ahmet Ta\u015fa\u011f\u0131l" },
  { title: "G\u00f6k-T\u00fcrkler, I-II-III", author: "Ahmet Ta\u015fa\u011f\u0131l" },
  { title: "\u0130lk T\u00fcrkler", author: "Ahmet Ta\u015fa\u011f\u0131l" },
  { title: "G\u00f6kb\u00f6r\u00fc'n\u00fcn \u0130zinde", author: "Ahmet Ta\u015fa\u011f\u0131l" },
  { title: "Bozk\u0131r\u0131n Ka\u011fanl\u0131klar\u0131", author: "Ahmet Ta\u015fa\u011f\u0131l" },
  { title: "The Empire of the Steppes: A History of Central Asia", author: "Ren\u00e9 Grousset" },
  { title: "K\u00f6k Tengri'nin \u00c7ocuklar\u0131", author: "Ahmet Ta\u015fa\u011f\u0131l" },
  { title: "T\u00fcrklerin Tarihi: Pasifik'ten Akdeniz'e 2000 Y\u0131l", author: "Jean-Paul Roux" },
  { title: "Turkey: A Modern History", author: "Erik-Jan Z\u00fcrcher" },
  { title: "Bozkurt", author: "H.C. Armstrong" },
  { title: "Atat\u00fcrk: Modern T\u00fcrkiye'nin Kurucusu", author: "Andrew Mango" },
  { title: "Hasan Ali Y\u00fccel ve T\u00fcrk Ayd\u0131nlanmas\u0131", author: "A.M. Cel\u00e2l \u015eeng\u00f6r" },
  { title: "Trajik Ba\u015far\u0131: T\u00fcrk Dil Reformu", author: "Geoffrey Lewis" },
  { title: "Cumal\u0131 Ordug\u00e2h\u0131", author: "Mustafa Kemal Atat\u00fcrk" },
  { title: "Atat\u00fcrk'\u00fcn T.B.M.M. A\u00e7\u0131k Oturumlar\u0131ndaki Konu\u015fmalar\u0131", author: "Mustafa Kemal Atat\u00fcrk" },
  { title: "Atat\u00fcrk'\u00fcn \u00d6zdeyisleri", author: "Mustafa Kemal Atat\u00fcrk" },
  { title: "Mektuplar\u0131m", author: "Mustafa Kemal Atat\u00fcrk" },
  { title: "Din ve Laiklik \u00dczerine", author: "Mustafa Kemal Atat\u00fcrk" },
  { title: "G\u00fcne\u015f - Dil Teorisi", author: "Mustafa Kemal Atat\u00fcrk" },
  { title: "T\u00fcrk Gencinin El Kitab\u0131", author: "Mustafa Kemal Atat\u00fcrk" },
  { title: "Bursa Nutku", author: "Mustafa Kemal Atat\u00fcrk" },
  { title: "Medeni Bilgiler", author: "Mustafa Kemal Atat\u00fcrk" },
  { title: "Karlsbad'da Ge\u00e7en G\u00fcnlerim", author: "Mustafa Kemal Atat\u00fcrk" },
  { title: "Zabit ve Kumandan ile Hasbihal", author: "Mustafa Kemal Atat\u00fcrk" },
  { title: "The Social Contract and Discourses", author: "Jean-Jacques Rousseau" },
  { title: "Emile, or On Education", author: "Jean-Jacques Rousseau" },
  { title: "Confessions", author: "Jean-Jacques Rousseau" },
  { title: "The Social Contract (Discourse on Inequality)", author: "Jean-Jacques Rousseau" },
  { title: "The Basic Political Writings", author: "Jean-Jacques Rousseau" },
  { title: "Utopia", author: "Thomas More" },
  { title: "Politics", author: "Aristotle" },
  { title: "On Liberty", author: "John Stuart Mill" },
  { title: "The Social Contract", author: "Jean-Jacques Rousseau" },
  { title: "The Republic", author: "Plato" },
  { title: "Leviathan", author: "Thomas Hobbes" },
  { title: "Suyu Arayan Adam", author: "\u015eevket S\u00fcreyya Aydemir" },
  { title: "\u00c7ankaya", author: "Falih R\u0131fk\u0131 Atay" },
  { title: "Zeyinda\u011f\u0131", author: "Falih R\u0131fk\u0131 Atay" },
  { title: "The Village of Stepanchikovo", author: "Fyodor Dostoevsky" },
  { title: "The House of the Dead", author: "Fyodor Dostoevsky" },
  { title: "The Dream of a Ridiculous Man", author: "Fyodor Dostoevsky" },
  { title: "The Double", author: "Fyodor Dostoevsky" },
  { title: "Demons", author: "Fyodor Dostoevsky" },
  { title: "The Idiot", author: "Fyodor Dostoevsky" },
  { title: "The Brothers Karamazov", author: "Fyodor Dostoevsky" },
];

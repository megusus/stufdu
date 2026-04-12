// ════════════════════════════════════════
// ── Pomodoro / Deep Work Timer ──
// ════════════════════════════════════════

import { Storage } from './storage.js';

const DEFAULTS = {
  workMins:             25,
  breakMins:             5,
  longBreakMins:        15,
  sessionsBeforeLong:    4,
};

export function loadPomodoroConfig()    { return { ...DEFAULTS, ...Storage.get('pomodoro-config', {}) }; }
export function savePomodoroConfig(cfg) { Storage.set('pomodoro-config', cfg); }

// ── Session state (in-memory only) ──
let _session  = null;
let _interval = null;
let _onTick   = null;
let _onPhaseChange = null;

export function getSession()          { return _session; }
export function isRunning()           { return !!_interval; }
export function getRemainingSecs() {
  if (!_session) return 0;
  const elapsed = Math.floor((Date.now() - _session.startedAt) / 1000);
  return Math.max(0, _session.durationSecs - elapsed);
}

/**
 * Start a new work session.
 * @param {string} taskText - label for the current task
 * @param {function} onTick - called every second with current session
 * @param {function} onPhaseChange - called when work→break or break→work
 */
export function startPomodoro(taskText, onTick, onPhaseChange) {
  stopPomodoro();
  const cfg = loadPomodoroConfig();
  _onTick = onTick;
  _onPhaseChange = onPhaseChange;
  _session = {
    type:              'work',
    taskText:          taskText || '',
    startedAt:         Date.now(),
    durationSecs:      cfg.workMins * 60,
    sessionsCompleted: _session?.sessionsCompleted ?? 0,
  };
  _interval = setInterval(_tick, 1000);
  _onTick?.(_session);
  return _session;
}

export function stopPomodoro() {
  if (_interval) { clearInterval(_interval); _interval = null; }
  const s = _session;
  _session = null;
  return s;
}

export function pausePomodoro() {
  if (_interval) { clearInterval(_interval); _interval = null; }
  if (_session) _session.pausedAt = Date.now();
}

export function resumePomodoro() {
  if (!_session || _interval) return;
  if (_session.pausedAt) {
    _session.startedAt += Date.now() - _session.pausedAt;
    delete _session.pausedAt;
  }
  _interval = setInterval(_tick, 1000);
}

// Skip the current break and start a new work session
export function skipBreak() {
  if (!_session || _session.type === 'work') return;
  _beginWork();
}

function _tick() {
  if (!_session) return;
  const remaining = getRemainingSecs();
  if (remaining <= 0) {
    _phaseComplete();
  } else {
    _onTick?.(_session);
  }
}

function _phaseComplete() {
  if (!_session) return;
  if (_session.type === 'work') {
    const completed = (_session.sessionsCompleted || 0) + 1;
    _session = { ..._session, sessionsCompleted: completed };
    _beginBreak(completed);
  } else {
    _beginWork();
  }
  _notify();
}

function _beginWork() {
  const cfg = loadPomodoroConfig();
  const completed = _session?.sessionsCompleted ?? 0;
  _session = {
    type:              'work',
    taskText:          _session?.taskText ?? '',
    startedAt:         Date.now(),
    durationSecs:      cfg.workMins * 60,
    sessionsCompleted: completed,
  };
  _onPhaseChange?.(_session);
  _onTick?.(_session);
}

function _beginBreak(completed) {
  const cfg = loadPomodoroConfig();
  const isLong = completed % cfg.sessionsBeforeLong === 0;
  _session = {
    type:              isLong ? 'longBreak' : 'break',
    taskText:          _session?.taskText ?? '',
    startedAt:         Date.now(),
    durationSecs:      (isLong ? cfg.longBreakMins : cfg.breakMins) * 60,
    sessionsCompleted: completed,
  };
  _onPhaseChange?.(_session);
  _onTick?.(_session);
}

function _notify() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const msg = _session?.type === 'work'
    ? 'Break over — time to focus! 🎯'
    : _session?.type === 'longBreak'
      ? 'Pomodoro complete! Take a long break ☕'
      : 'Pomodoro complete! Take a short break 🌿';
  new Notification('Study Plan', { body: msg, icon: '' });
}

// ════════════════════════════════════════
// ── Global Search (Cmd+K) ──
// ════════════════════════════════════════

import { state, escapeHtml, loadScratchpad, getStatus, STATUS_DONE, STATUS_SKIP } from '../state.js';
import { DAYS, schedule, getDayLabel } from '../schedule.js';
import { CategoryRegistry } from '../categories.js';
import { navigate } from '../router.js';
import { loadInbox } from '../inbox.js';
import { loadHabits } from '../habits.js';
import { loadGoals } from '../goals.js';
import { loadGrades } from '../grades.js';
import { loadDecks, loadCards } from '../flashcards.js';

let _onActionCallback = null;
export function setSearchActionCallback(fn) { _onActionCallback = fn; }

let _open = false;
let _query = '';
let _results = [];
let _selectedIdx = 0;
let _overlayEl = null;

export function isGlobalSearchOpen() { return _open; }

export function openGlobalSearch() {
  _open = true;
  _query = '';
  _results = [];
  _selectedIdx = 0;
  _renderOverlay();
}

export function closeGlobalSearch() {
  _open = false;
  if (_overlayEl) { _overlayEl.remove(); _overlayEl = null; }
}

export function toggleGlobalSearch() {
  if (_open) closeGlobalSearch();
  else openGlobalSearch();
}

function _search(query) {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  const results = [];

  // Search tasks
  DAYS.forEach(day => {
    const dayData = schedule[day];
    if (!dayData) return;
    (dayData.sections || []).forEach(sec => {
      sec.items.forEach(item => {
        const text = item.text.toLowerCase();
        const hint = (item.hint || '').toLowerCase();
        if (text.includes(q) || hint.includes(q)) {
          const s = getStatus(item.id);
          const statusIcon = s === STATUS_DONE ? '✓' : s === STATUS_SKIP ? '✕' : '';
          const c = CategoryRegistry.getColor(item.cat);
          const isDone = s === STATUS_DONE || s === true;
          results.push({
            type: 'task',
            icon: statusIcon || '○',
            text: item.text,
            sub: `${getDayLabel(day)} · ${sec.label}`,
            color: c.border,
            taskId: item.id,
            taskDay: day,
            isDone,
            action: () => { navigate('schedule'); state.selectedDay = DAYS.indexOf(day); },
          });
        }
      });
    });
  });

  // Search deadlines
  state.deadlines.forEach(dl => {
    if (dl.name.toLowerCase().includes(q)) {
      results.push({
        type: 'deadline',
        icon: '📅',
        text: dl.name,
        sub: dl.date,
        color: '#b44aff',
        action: () => navigate('stats'),
      });
    }
  });

  // Search reading list
  state.readingList.forEach(book => {
    if (book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q)) {
      results.push({
        type: 'book',
        icon: '📚',
        text: book.title,
        sub: book.author,
        color: '#cf7aff',
        action: () => navigate('tools'),
      });
    }
  });

  // Search scratchpad
  const scratch = loadScratchpad();
  if (scratch && scratch.toLowerCase().includes(q)) {
    const lines = scratch.split('\n');
    const matchLine = lines.find(l => l.toLowerCase().includes(q));
    results.push({
      type: 'scratchpad',
      icon: '📝',
      text: 'Scratchpad',
      sub: matchLine ? matchLine.trim().slice(0, 60) : 'Match found',
      color: 'var(--accent)',
      action: () => { navigate('home'); state.scratchpadOpen = true; },
    });
  }

  // Search lecture notes
  Object.entries(state.lectureNotes || {}).forEach(([taskId, notes]) => {
    if (notes.toLowerCase().includes(q)) {
      results.push({
        type: 'lecture-note',
        icon: '📝',
        text: notes.slice(0, 60),
        sub: 'Lecture note',
        color: '#cf7aff',
        action: () => navigate('schedule'),
      });
    }
  });

  // Search inbox
  loadInbox().forEach(item => {
    if (item.text.toLowerCase().includes(q)) {
      results.push({
        type: 'inbox',
        icon: '📥',
        text: item.text,
        sub: 'In inbox · not yet triaged',
        color: '#ffab00',
        action: () => navigate('inbox'),
      });
    }
  });

  // Search task notes
  Object.entries(state.taskNotes || {}).forEach(([taskId, note]) => {
    if (!note || !note.toLowerCase().includes(q)) return;
    // Find task text
    let taskText = taskId, day = '';
    for (const d of DAYS) {
      for (const sec of (schedule[d]?.sections || [])) {
        const item = sec.items.find(it => it.id === taskId);
        if (item) { taskText = item.text; day = d; break; }
      }
      if (day) break;
    }
    results.push({
      type: 'note',
      icon: '📝',
      text: note.slice(0, 60),
      sub: `Note on: ${taskText.slice(0, 40)} · ${getDayLabel(day)}`,
      color: '#ffab00',
      taskId,
      action: () => { navigate('schedule'); if (day) state.selectedDay = DAYS.indexOf(day); },
    });
  });

  // Search habits
  try {
    loadHabits().forEach(h => {
      if (h.name.toLowerCase().includes(q)) {
        results.push({ type: 'habit', icon: h.icon || '🏃', text: h.name, sub: 'Habit · ' + (h.frequency || 'daily'), color: h.color || '#00e676', action: () => navigate('habits') });
      }
    });
  } catch {}

  // Search goals
  try {
    loadGoals().forEach(g => {
      if (g.label.toLowerCase().includes(q)) {
        results.push({ type: 'goal', icon: g.icon || '🎯', text: g.label, sub: `Goal · ${g.current}/${g.target}${g.unit}`, color: '#00d2ff', action: () => navigate('stats') });
      }
    });
  } catch {}

  // Search grades (assessment names)
  try {
    const grades = loadGrades();
    Object.entries(grades).forEach(([cat, assessments]) => {
      const catLabel = CategoryRegistry.getLabel(cat) || cat;
      (assessments || []).forEach(g => {
        if (g.name.toLowerCase().includes(q)) {
          results.push({ type: 'grade', icon: '📊', text: g.name, sub: `Grade · ${catLabel} · ${g.score}/${g.maxScore}`, color: '#00d2ff', action: () => navigate('grades') });
        }
      });
    });
  } catch {}

  // Search flashcard decks and cards
  try {
    loadDecks().forEach(deck => {
      if (deck.name.toLowerCase().includes(q)) {
        results.push({ type: 'deck', icon: '🧠', text: deck.name, sub: 'Flashcard deck', color: '#cf7aff', action: () => navigate('flashcards') });
      }
    });
    loadCards().forEach(card => {
      if (card.front.toLowerCase().includes(q) || card.back.toLowerCase().includes(q)) {
        results.push({ type: 'flashcard', icon: '🃏', text: card.front.slice(0, 60), sub: `Flashcard · Answer: ${card.back.slice(0, 40)}`, color: '#cf7aff', action: () => navigate('flashcards') });
      }
    });
  } catch {}

  // Search categories
  CategoryRegistry.keys().forEach(k => {
    const label = CategoryRegistry.getLabel(k) || k;
    if (label.toLowerCase().includes(q) || k.toLowerCase().includes(q)) {
      results.push({ type: 'category', icon: '🏷', text: label, sub: `Category · key: ${k}`, color: CategoryRegistry.getColor(k).border, action: () => navigate('tools') });
    }
  });

  // Search views (all 12)
  const views = [
    { name: 'Home Dashboard',  route: 'home'       },
    { name: 'Schedule',        route: 'schedule'   },
    { name: 'Ideal Week',      route: 'ideal'      },
    { name: 'Tools',           route: 'tools'      },
    { name: 'Stats',           route: 'stats'      },
    { name: 'Weekly Review',   route: 'review'     },
    { name: 'Inbox',           route: 'inbox'      },
    { name: 'Habits',          route: 'habits'     },
    { name: 'Grades',          route: 'grades'     },
    { name: 'Eisenhower Matrix', route: 'matrix'   },
    { name: 'Calendar',        route: 'calendar'   },
    { name: 'Flashcards',      route: 'flashcards' },
  ];
  views.forEach(v => {
    if (v.name.toLowerCase().includes(q)) {
      results.push({ type: 'view', icon: '→', text: v.name, sub: `Navigate to #${v.route}`, color: 'var(--accent)', action: () => navigate(v.route) });
    }
  });

  return results.slice(0, 24);
}

function _renderOverlay() {
  if (!_overlayEl) {
    _overlayEl = document.createElement('div');
    _overlayEl.className = 'gsearch-overlay';
    _overlayEl.id = 'gsearch-overlay';
    _overlayEl.addEventListener('click', e => {
      if (e.target === _overlayEl) closeGlobalSearch();
    });
    document.body.appendChild(_overlayEl);
  }

  const resultsHtml = _results.length > 0
    ? _results.map((r, i) => `<div class="gsearch-result ${i === _selectedIdx ? 'active' : ''}" data-gsearch-idx="${i}">
        <span class="gsearch-result-icon" style="color:${r.color}">${r.icon}</span>
        <div class="gsearch-result-body">
          <div class="gsearch-result-text">${escapeHtml(r.text)}</div>
          <div class="gsearch-result-sub">${escapeHtml(r.sub)}</div>
        </div>
        ${r.taskId ? `<span class="gsearch-actions" data-stop>
          <button class="gsearch-action-btn" data-gsearch-action="toggle" data-task-id="${r.taskId}" title="${r.isDone ? 'Undo' : 'Done'}">${r.isDone ? '↩' : '✓'}</button>
          <button class="gsearch-action-btn" data-gsearch-action="skip" data-task-id="${r.taskId}" title="Skip">✕</button>
        </span>` : ''}
        <span class="gsearch-result-type">${r.type}</span>
      </div>`).join('')
    : _query.trim()
      ? `<div class="gsearch-empty">No results for "${escapeHtml(_query)}"</div>`
      : `<div class="gsearch-empty">Type to search tasks, deadlines, books, scratchpad...</div>`;

  _overlayEl.innerHTML = `<div class="gsearch-box">
    <div class="gsearch-input-row">
      <span class="gsearch-icon">🔍</span>
      <input class="gsearch-input" id="gsearch-input" type="text" placeholder="Search everything..." value="${escapeHtml(_query)}" autofocus>
      <kbd class="gsearch-kbd">ESC</kbd>
    </div>
    <div class="gsearch-results" id="gsearch-results">${resultsHtml}</div>
  </div>`;

  const input = _overlayEl.querySelector('#gsearch-input');
  if (input) {
    input.focus();
    input.addEventListener('input', () => {
      _query = input.value;
      _results = _search(_query);
      _selectedIdx = 0;
      _updateResults();
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); _selectedIdx = Math.min(_selectedIdx + 1, _results.length - 1); _updateResults(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); _selectedIdx = Math.max(_selectedIdx - 1, 0); _updateResults(); }
      if (e.key === 'Enter' && _results[_selectedIdx]) {
        e.preventDefault();
        const result = _results[_selectedIdx];
        closeGlobalSearch();
        result.action();
      }
      if (e.key === 'Escape') { e.preventDefault(); closeGlobalSearch(); }
    });
  }

  // Click on results
  _overlayEl.addEventListener('click', e => {
    // Quick action buttons
    const actionBtn = e.target.closest('[data-gsearch-action]');
    if (actionBtn) {
      e.stopPropagation();
      const act = actionBtn.dataset.gsearchAction;
      const taskId = actionBtn.dataset.taskId;
      if (_onActionCallback && taskId) {
        _onActionCallback(act, taskId);
        _results = _search(_query);
        _updateResults();
      }
      return;
    }
    const resultEl = e.target.closest('[data-gsearch-idx]');
    if (resultEl) {
      const idx = parseInt(resultEl.dataset.gsearchIdx, 10);
      if (_results[idx]) {
        closeGlobalSearch();
        _results[idx].action();
      }
    }
  });
}

function _updateResults() {
  const container = document.getElementById('gsearch-results');
  if (!container) return;

  if (_results.length > 0) {
    container.innerHTML = _results.map((r, i) => `<div class="gsearch-result ${i === _selectedIdx ? 'active' : ''}" data-gsearch-idx="${i}">
      <span class="gsearch-result-icon" style="color:${r.color}">${r.icon}</span>
      <div class="gsearch-result-body">
        <div class="gsearch-result-text">${escapeHtml(r.text)}</div>
        <div class="gsearch-result-sub">${escapeHtml(r.sub)}</div>
      </div>
      ${r.taskId ? `<span class="gsearch-actions" data-stop>
        <button class="gsearch-action-btn" data-gsearch-action="toggle" data-task-id="${r.taskId}" title="${r.isDone ? 'Undo' : 'Done'}">${r.isDone ? '↩' : '✓'}</button>
        <button class="gsearch-action-btn" data-gsearch-action="skip" data-task-id="${r.taskId}" title="Skip">✕</button>
      </span>` : ''}
      <span class="gsearch-result-type">${r.type}</span>
    </div>`).join('');
  } else if (_query.trim()) {
    container.innerHTML = `<div class="gsearch-empty">No results for "${escapeHtml(_query)}"</div>`;
  } else {
    container.innerHTML = `<div class="gsearch-empty">Type to search tasks, deadlines, books, scratchpad...</div>`;
  }

  // Scroll active into view
  const active = container.querySelector('.gsearch-result.active');
  if (active) active.scrollIntoView({ block: 'nearest' });
}

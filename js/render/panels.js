// ════════════════════════════════════════
// ── Side Panels Renderer ──
// ════════════════════════════════════════

/**
 * Pure renderer: receives RenderContext, returns HTML string.
 * @param {import('./context.js').RenderContext} ctx
 */
import { THEME_PRESETS, currentPreset } from '../ui/theme.js';
import { loadRecurringTasks } from '../recurrence.js';

const _panelErr = (ctx, err) =>
  `<div style="padding:10px 12px;margin:4px 0;font-size:11px;color:#e94560;background:#1a0808;border:1px solid #e9456033;border-radius:8px">
    ⚠️ <strong>Panels</strong> failed to render &mdash;
    <code style="font-size:9px;font-family:monospace">${ctx.escapeHtml(String(err).slice(0, 120))}</code>
  </div>`;

// All panels as accordions (original behavior — used in legacy/fallback only)
export function renderPanels(ctx) {
  try { return _renderPanelsInner(ctx, 'all', false); }
  catch (err) { console.error('[render] Panels failed:', err); return _panelErr(ctx, err); }
}

// Schedule-specific panels (overview, fa, how, cut, rhythm, editor)
export function renderSchedulePanels(ctx) {
  try { return _renderPanelsInner(ctx, 'schedule', false); }
  catch (err) { console.error('[render] SchedulePanels failed:', err); return _panelErr(ctx, err); }
}

// Tool panels — start open by default (sync, meals, reading, data, notifs, categories, settings)
export function renderToolPanels(ctx) {
  try { return _renderPanelsInner(ctx, 'tools', true); }
  catch (err) { console.error('[render] ToolPanels failed:', err); return _panelErr(ctx, err); }
}

// Stat panels — start open by default (streak, summary, deadlines)
export function renderStatPanels(ctx) {
  try { return _renderPanelsInner(ctx, 'stats', true); }
  catch (err) { console.error('[render] StatPanels failed:', err); return _panelErr(ctx, err); }
}

function _renderPanelsInner(ctx, group = 'all', defaultOpen = false) {
  const { config, state, days, dayConfig, schedule, dayName, day, wp,
          escapeHtml, formatEst, getStatus, getDayProgress, getDayLabel, getShortLabel,
          categories, buildOverviewData, getSubjectStreaks,
          generateWeeklySummary, getPastWeekData, loadHistory, getDaysUntil,
          hasSyncConfig, weekKey,
          STATUS_DONE, STATUS_SKIP, STATUS_PROGRESS } = ctx;
  const getWeekKey = () => weekKey;

  let html = '';

  function lazyPanel(id, title, titleStyle, contentFn, panelGroup = 'schedule') {
    if (group !== 'all' && panelGroup !== group) return;

    if (defaultOpen) {
      // View-section mode: always expanded, no toggle header (used in tools/stats views)
      html += `<div class="panel view-section">
        <div class="panel-header open view-section-header">
          <div class="panel-title"${titleStyle ? ` style="${titleStyle}"` : ''}>${title}</div>
        </div>
        <div class="panel-content open" id="panel-${id}">`;
      try { contentFn(); }
      catch (err) {
        console.error(`[render] Panel "${id}" failed:`, err);
        html += `<div style="padding:10px 12px;font-size:11px;color:#e94560;background:#1a0808;border-radius:6px">
          \u26a0\ufe0f Panel failed to render &mdash; <code style="font-size:9px;font-family:monospace">${escapeHtml(String(err).slice(0, 120))}</code>
        </div>`;
      }
      html += `</div></div>`;
    } else {
      // Standard accordion (schedule view)
      const isOpen = !!state.openPanels[id];
      html += `<div class="panel">
        <div class="panel-header ${isOpen ? 'open' : ''}" data-panel-id="${id}" data-action="togglePanel" data-panel="${id}"
             role="button" aria-expanded="${isOpen}" aria-controls="panel-${id}" tabindex="0">
          <div class="panel-title"${titleStyle ? ` style="${titleStyle}"` : ''}>${title}</div><div class="panel-arrow">\u25bc</div>
        </div>
        <div class="panel-content ${isOpen ? 'open' : ''}" id="panel-${id}">`;
      if (isOpen) {
        try { contentFn(); }
        catch (err) {
          console.error(`[render] Panel "${id}" failed:`, err);
          html += `<div style="padding:10px 12px;font-size:11px;color:#e94560;background:#1a0808;border-radius:6px">
            \u26a0\ufe0f Panel failed to render &mdash; <code style="font-size:9px;font-family:monospace">${escapeHtml(String(err).slice(0, 120))}</code>
          </div>`;
        }
      }
      html += `</div></div>`;
    }
  }

  // Weekly overview
  const overviewData = buildOverviewData();
  lazyPanel('overview', 'Weekly Pattern', '', () => {
    overviewData.forEach(row => {
      html += `<div class="overview-row">
        <div class="overview-day" style="color:${row.color}">${row.day}</div>
        <div class="overview-tag" style="background:${row.color}15;color:${row.color};border:1px solid ${row.color}30">${row.tag}</div>
        <div class="overview-desc">${row.desc}</div>
      </div>`;
    });
  });

  // FA Engine
  lazyPanel('fa', 'FA Weekly Engine', '', () => {
    html += `<div style="font-size:12px;color:#71717a;line-height:1.8">
      <span style="color:#ff9100;font-weight:600">Thu</span> Meeting \u2192 feedback + follow-up questions<br>
      <span style="color:#ffab00;font-weight:600">Thu\u2013Fri</span> Start follow-ups while conversation is fresh<br>
      <span style="color:#00d2ff;font-weight:600">Sat\u2013Sun</span> Bulk deep work (fueled by Thu feedback)<br>
      <span style="color:#b44aff;font-weight:600">Mon\u2013Tue</span> Continue exercises, build intuition arguments<br>
      <span style="color:#00e676;font-weight:600">Wed</span> Polish & prep material to present Thursday
    </div>`;
  });

  // How it works
  lazyPanel('how', 'How this works', '', () => {
    html += `<div class="info" style="background:#0a1628;border:1px solid rgba(0,210,255,0.13);color:#8899aa">
      <p><strong>No fixed times except class, wake & FA meeting.</strong> Work through tasks in order. Finish early? Take the slack.</p>
      <p><strong>Every course block = homework.</strong> The schedule routes hw to optimal days based on lecture timing.</p>
      <p><strong>Analysis IV has the only external check.</strong> Mon lecture \u2192 Mon/Tue hw \u2192 Wed office hours. Other courses: hw + check with AI.</p>
    </div>`;
  });

  // Cut order
  lazyPanel('cut', 'Bad day? Cut order', 'color:#e94560', () => {
    html += `<div class="info" style="background:#1a0a0a;border:1px solid rgba(233,69,96,0.13);color:#aa8888">
      <p>1. Next-day previews</p><p>2. Physics II / Comp Math hw</p><p>3. Number Theory II hw</p><p>4. Algebra II hw</p>
      <p style="color:#aabbcc">\u2014 protected below \u2014</p>
      <p style="color:#aabbcc">5. Analysis IV hw (office hours deadline)</p>
      <p style="color:#aabbcc">6. FA blocks (whole week \u2192 Thursday)</p>
    </div>`;
  });

  // Reading list
  lazyPanel('readinglist', `Reading List (${state.readingList.length} books)`, 'color:#cf7aff', () => {
    html += `<div class="data-controls" style="margin-bottom:10px">
      <button class="data-btn" data-action="syncGoodreads" style="color:#cf7aff;border-color:#cf7aff33">
        ${state.readingSyncStatus === 'syncing' ? 'Syncing\u2026' : '\ud83d\udd04 Sync RSS'}
      </button>
      <button class="data-btn" data-action="readingToggleCSV" style="color:#b44aff;border-color:#b44aff33">
        \ud83d\udcc4 Import CSV
      </button>
      ${state.readingList.length > 0 ? '<button class="data-btn" data-action="readingResetList" style="color:#e94560;border-color:#e9456033">\u2715 Reset</button>' : ''}
    </div>`;
    if (state.readingLastSync) {
      const ago = Math.round((Date.now() - new Date(state.readingLastSync).getTime()) / 60000);
      const label = ago < 1 ? 'just now' : ago < 60 ? ago + 'm ago' : ago < 1440 ? Math.round(ago / 60) + 'h ago' : Math.round(ago / 1440) + 'd ago';
      html += `<div style="font-size:10px;color:var(--muted);margin-bottom:8px">Last sync: ${label}</div>`;
    }
    if (state.readingSyncStatus === 'ok') html += `<div class="meal-status ok" style="margin-bottom:8px">Synced successfully.</div>`;
    else if (state.readingSyncStatus === 'error') html += `<div class="meal-status err" style="margin-bottom:8px">RSS sync failed. Use CSV import to load all books.</div>`;
    else if (state.readingSyncStatus === 'syncing') html += `<div class="meal-status wait" style="margin-bottom:8px">Fetching from Goodreads RSS\u2026</div>`;
    if (state.readingShowCSV) {
      html += `<div style="margin-bottom:10px">
        <div style="margin-bottom:6px"><label class="data-btn" style="color:#cf7aff;border-color:#cf7aff33;cursor:pointer;display:inline-block">\ud83d\udcc1 Choose CSV file<input type="file" id="goodreads-file-input" accept=".csv" data-change-action="handleGoodreadsFile" style="display:none"></label></div>
        <textarea class="meal-paste-area" id="goodreads-csv-input" placeholder="Or paste your Goodreads CSV export here."></textarea>
        <button class="data-btn" data-action="saveGoodreadsCSV" style="width:100%;color:#cf7aff;border-color:#cf7aff44;margin-top:4px">Parse & Save</button>
      </div>`;
    }
    html += `<div class="info" style="background:#1a0f1f;border:1px solid rgba(207,122,255,0.13);color:#bb99cc;font-size:12px;line-height:1.9;max-height:400px;overflow-y:auto">`;
    state.readingList.forEach((book, i) => {
      html += `<p style="margin:0;padding:2px 0">${i + 1}. <strong>${escapeHtml(book.title)}</strong> <span style="color:#71717a">\u2014 ${escapeHtml(book.author)}</span></p>`;
    });
    html += `</div>`;
  }, 'tools');

  // 3-week rhythm
  lazyPanel('rhythm', '3-week rhythm', 'color:#00e676', () => {
    html += `<div class="info" style="background:#0a1a18;border:1px solid rgba(0,230,118,0.13);color:#88aa99">
      <p><strong>Weeks 1\u20132:</strong> Every course block = homework only.</p>
      <p><strong>Week 3:</strong> Swap one session per course for a once-over of the last 3 weeks.</p>
    </div>`;
  });

  // Streak
  lazyPanel('streak', 'Weekly Streak', '', () => {
    const hist = loadHistory();
    const recentWeeks = Object.entries(hist).sort((a, b) => a[0].localeCompare(b[0])).slice(-8);
    if (recentWeeks.length > 0) {
      html += `<div class="past-week-nav">`;
      recentWeeks.forEach(([key, pct]) => {
        const isCurrent = key === weekKey;
        const isViewing = state.pastWeekViewing === key || (!state.pastWeekViewing && isCurrent);
        html += `<button class="past-week-btn ${isViewing ? 'active' : ''}" data-action="viewPastWeek" data-week="${key}">${key.replace(config.storagePrefix + '-', '')} (${pct}%)</button>`;
      });
      html += `</div>`;
      html += `<div class="streak-chart" style="margin-bottom:20px">`;
      recentWeeks.forEach(([key, pct]) => {
        const isCurrent = key === weekKey;
        html += `<div class="streak-bar${isCurrent ? ' current' : ''}" style="height:${Math.max(pct, 4)}%" title="${key}: ${pct}%">
          <div class="streak-bar-label">${key.replace(config.storagePrefix + '-', '')}</div>
        </div>`;
      });
      html += `</div>`;
      if (state.pastWeekViewing) {
        const pastData = getPastWeekData(state.pastWeekViewing);
        const pastEntries = Object.entries(pastData);
        if (pastEntries.length > 0) {
          html += `<div style="font-size:10px;color:var(--dim);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">${state.pastWeekViewing} Task States</div>`;
          html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">`;
          pastEntries.forEach(([id, status]) => {
            const color = status === STATUS_DONE ? 'var(--accent)' : status === STATUS_SKIP ? '#e94560' : status === STATUS_PROGRESS ? '#ffab00' : 'var(--dim)';
            html += `<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:${color}18;color:${color};border:1px solid ${color}30">${id}: ${status === true ? STATUS_DONE : status}</span>`;
          });
          html += `</div>`;
        } else {
          html += `<div style="font-size:11px;color:var(--dim)">No data found for this week.</div>`;
        }
      }
    } else {
      html += `<div class="streak-empty">Complete tasks to start tracking your streak.</div>`;
    }
    const subjectStreaks = getSubjectStreaks();
    const streakEntries = Object.entries(subjectStreaks);
    if (streakEntries.length > 0) {
      html += `<div style="font-size:10px;color:var(--dim);margin:14px 0 6px;text-transform:uppercase;letter-spacing:1px">Subject Progress</div>`;
      html += `<div class="subject-streaks">`;
      streakEntries.sort((a, b) => (b[1].done / b[1].total) - (a[1].done / a[1].total)).forEach(([cat, data]) => {
        const c = categories.getColor(cat);
        const label = categories.getLabel(cat) || cat;
        const pct = data.total ? Math.round((data.done / data.total) * 100) : 0;
        html += `<div class="subject-streak-card" style="border-color:${c.border}22">
          <div class="subject-streak-label" style="color:${c.border}">${label}</div>
          <div class="subject-streak-bar"><div class="subject-streak-fill" style="width:${pct}%;background:${c.border}"></div></div>
          <div class="subject-streak-val">${data.done}/${data.total} \u00b7 ${pct}%</div>
        </div>`;
      });
      html += `</div>`;
    }
  }, 'stats');

  // Sync panel
  lazyPanel('sync', `Sync ${hasSyncConfig && state.firebaseReady ? '<span style="color:#00e676;font-size:9px;margin-left:6px">\u25cf connected</span>' : ''}`, '', () => {
    if (hasSyncConfig && state.firebaseReady) {
      html += `<div style="font-size:11px;color:#00e676;margin-bottom:10px">Syncing across all your devices.</div>
        <button class="data-btn" data-action="disconnectSync" style="width:100%;color:#e94560;border-color:#e9456033">Disconnect Sync</button>`;
    } else if (hasSyncConfig && !state.firebaseReady) {
      html += `<div style="font-size:11px;color:#ffab00;margin-bottom:10px">Connecting\u2026</div>
        <button class="data-btn" data-action="disconnectSync" style="width:100%">Disconnect</button>`;
    } else {
      html += `<div class="sync-info">Paste your Firebase config and set a password to sync across devices.</div>
        <textarea class="sync-input" id="sync-config-input" placeholder='Paste firebaseConfig here'></textarea>
        <input class="sync-input" id="sync-email" type="email" placeholder="Email" style="min-height:auto;resize:none;margin-bottom:4px">
        <input class="sync-input" id="sync-password" type="password" placeholder="Password (min 6 chars)" style="min-height:auto;resize:none;margin-bottom:8px">
        <button class="data-btn" data-action="connectSync" style="width:100%;color:var(--accent);border-color:#00d2ff44">Connect Sync</button>
        <div id="sync-msg" class="sync-msg"></div>`;
    }
  }, 'tools');

  // Schedule editor
  lazyPanel('editor', 'Edit Schedule', '', () => {

    // ── Day manager toggle ──
    html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="font-size:10px;color:var(--dim)">Editing <strong style="color:var(--text)">${escapeHtml(getDayLabel(dayName))}</strong></div>
      <button class="cat-row-btn" data-action="toggleDayManager" style="${state.showDayManager ? 'color:var(--accent);border-color:var(--accent)44' : ''}">
        \ud83d\uddd3\ufe0f ${state.showDayManager ? 'Hide' : 'Manage'} Days
      </button>
    </div>`;

    // ── Day manager panel ──
    if (state.showDayManager) {
      html += `<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:14px">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:8px;font-weight:600">Active Days & Labels</div>`;
      days.forEach((d, di) => {
        const cfg = dayConfig[d];
        const isRenamingDay = state.renamingDayName === d;
        const label = getDayLabel(d);
        html += `<div class="cat-list-row" style="margin-bottom:5px">
          <input type="checkbox" ${cfg.active ? 'checked' : ''}
                 data-stop
                 data-action="toggleDayActive" data-day="${d}" style="cursor:pointer;flex-shrink:0">
          ${isRenamingDay
            ? `<input class="editor-input" id="day-rename-${d}" type="text" value="${escapeHtml(label)}" placeholder="${escapeHtml(d)}..."
                      style="flex:1;min-width:0" data-key-action="clickMappedActionOnEnterEscape" data-enter-action="saveDayAlias" data-escape-action="cancelDayRename" data-day="${escapeHtml(d)}" data-stop>`
            : `<span class="cat-row-key" style="flex:1">${escapeHtml(label)}${cfg.alias ? ` <span style="color:var(--dim);font-size:9px">(${d})</span>` : ''}</span>`
          }
          ${isRenamingDay
            ? `<button class="editor-add-btn" data-action="saveDayAlias" data-day="${d}">Save</button>
               <button class="cat-row-btn" data-action="cancelDayRename">\u2715</button>`
            : `<button class="cat-row-btn" data-action="startDayRename" data-day="${d}" title="Set display name">\u270f\ufe0f</button>
               ${cfg.alias ? `<button class="cat-row-btn danger" data-action="clearDayAlias" data-day="${d}" title="Reset to default">\u21a9</button>` : ''}
               ${days.length > 1 ? `<button class="cat-row-btn danger" data-action="removeDay" data-day="${d}" title="Delete day">\u00d7</button>` : ''}`
          }
        </div>`;
      });
      html += `<div class="editor-add-row" style="margin-top:10px">
        <input class="editor-input" id="editor-new-day-name" type="text" placeholder="New day name...">
        <button class="editor-add-btn" data-action="addDay">+ Day</button>
      </div>`;
      html += `</div>`;
    }

    // ── Day details ──
    html += `<div class="editor-section">
      <div class="editor-section-header">
        <span class="editor-section-label">Day Details</span>
      </div>
      <div class="settings-row"><label>Wake time</label><input class="settings-input" id="editor-wake-${dayName}" type="time" value="${escapeHtml(day.wake || '08:00')}"></div>
      <div class="settings-row"><label>Leave time</label><input class="settings-input" id="editor-leave-${dayName}" type="time" value="${escapeHtml(day.leave || '')}"></div>
      <div class="settings-row"><label>Day note</label><input class="settings-input" id="editor-meta-${dayName}" value="${escapeHtml(day.meta || '')}" placeholder="Optional note"></div>
      <button class="editor-add-btn" style="width:100%;margin-top:6px" data-action="saveDayMeta" data-day="${dayName}">Save Details</button>
    </div>`;

    // ── Section list for selected day ──
    day.sections.forEach((section, sIdx) => {
      const isRenaming = state.renamingSectionIdx &&
                         state.renamingSectionIdx.day === dayName &&
                         state.renamingSectionIdx.idx === sIdx;
      const canDelete = day.sections.length > 1;
      const isFirst = sIdx === 0;
      const isLast  = sIdx === day.sections.length - 1;
      html += `<div class="editor-section">`;
      if (isRenaming) {
        html += `<div class="editor-section-rename-row">
          <input class="editor-input" id="editor-section-rename-${sIdx}" type="text" value="${escapeHtml(section.label)}" placeholder="Section name..."
                 data-key-action="clickMappedActionOnEnterEscape" data-enter-action="renameSectionSave" data-escape-action="renameSectionCancel" data-day="${escapeHtml(dayName)}" data-i="${sIdx}" data-stop>
          <button class="editor-add-btn" data-action="renameSectionSave" data-day="${dayName}" data-i="${sIdx}">Save</button>
          <button class="cat-row-btn" data-action="renameSectionCancel">Cancel</button>
        </div>`;
      } else {
        html += `<div class="editor-section-header">
          <span class="editor-section-label">${escapeHtml(section.label)}</span>
          <span class="editor-section-actions">
            <button class="cat-row-btn" data-action="moveSectionUp"   data-day="${dayName}" data-i="${sIdx}" title="Move section up"   ${isFirst ? 'disabled style="opacity:.3"' : ''}>\u2191</button>
            <button class="cat-row-btn" data-action="moveSectionDown" data-day="${dayName}" data-i="${sIdx}" title="Move section down" ${isLast  ? 'disabled style="opacity:.3"' : ''}>\u2193</button>
            <button class="cat-row-btn" data-action="renameSectionStart" data-day="${dayName}" data-i="${sIdx}" title="Rename">\u270f\ufe0f</button>
            ${canDelete ? `<button class="cat-row-btn danger" data-action="removeSectionFromDay" data-day="${dayName}" data-i="${sIdx}" title="${section.items.length ? 'Delete section + ' + section.items.length + ' task(s)' : 'Delete empty section'}">\u2715</button>` : ''}
          </span>
        </div>`;
      }
      section.items.forEach((item, iIdx) => {
        const isFirstItem = iIdx === 0;
        const isLastItem  = iIdx === section.items.length - 1;
        html += `<div class="editor-item">
          <span class="editor-item-reorder">
            <button class="editor-reorder-btn" data-action="moveTaskUp"   data-day="${dayName}" data-i="${sIdx}" data-j="${iIdx}" ${isFirstItem ? 'disabled' : ''}>\u2191</button>
            <button class="editor-reorder-btn" data-action="moveTaskDown" data-day="${dayName}" data-i="${sIdx}" data-j="${iIdx}" ${isLastItem  ? 'disabled' : ''}>\u2193</button>
          </span>
          <span class="editor-item-text">${escapeHtml(item.text)}</span>
          <span class="editor-item-cat">${categories.getLabel(item.cat) || item.cat}</span>
          <button class="editor-remove-btn" data-action="removeTaskFromSchedule" data-day="${dayName}" data-i="${sIdx}" data-j="${iIdx}" title="Remove">\u2715</button>
        </div>`;
      });
      html += `<div class="editor-add-row">
        <input class="editor-input" id="editor-text-${sIdx}" type="text" placeholder="Task text...">
        <select class="editor-select" id="editor-cat-${sIdx}">`;
      categories.keys().forEach(k => {
        html += `<option value="${k}">${categories.getLabel(k) || k}</option>`;
      });
      html += `</select>
        <button class="editor-add-btn" data-action="addTaskToSection" data-day="${dayName}" data-i="${sIdx}">+ Add</button>
      </div></div>`;
    });

    // ── Add section ──
    if (state.addingSectionDay === dayName) {
      html += `<div class="editor-section" style="border-color:var(--accent)44">
        <div class="editor-section-rename-row">
          <input class="editor-input" id="editor-new-section-label" type="text" placeholder="Section name (e.g. Afternoon)..."
                 data-key-action="clickMappedActionOnEnterEscape" data-enter-action="addSectionConfirm" data-escape-action="addSectionCancel" data-day="${escapeHtml(dayName)}" data-stop>
          <button class="editor-add-btn" data-action="addSectionConfirm" data-day="${dayName}">\u2713 Add</button>
          <button class="cat-row-btn" data-action="addSectionCancel">Cancel</button>
        </div>
      </div>`;
    } else {
      html += `<button class="editor-add-btn" style="width:100%;margin-top:6px;color:var(--accent);border-color:var(--accent)44;background:none" data-action="addSectionStart" data-day="${dayName}">+ Add Section</button>`;
    }

    // ── Schedule export / import / new semester ──
    html += `<div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border)">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--dim);margin-bottom:8px;font-weight:600">Schedule File</div>
      <div class="data-controls">
        <button class="data-btn" data-action="exportSchedule" style="color:var(--accent);border-color:#00d2ff33">\u2193 Export</button>
        <button class="data-btn" data-action="importSchedule" style="color:var(--accent);border-color:#00d2ff33">\u2191 Import</button>
        <button class="data-btn" data-action="resetDefaultSchedule" style="color:#e94560;border-color:#e9456033">\u21ba Default</button>
        <button class="data-btn" data-action="newSemester" style="color:#ff9100;border-color:#ff910033">\ud83c\udf93 New Semester</button>
      </div>
      </div>`;
  }); // schedule: editor

  // Meal panel
  const hasMealData = Object.keys(state.mealData).length > 0;
  lazyPanel('meal', `\ud83c\udf7d\ufe0f Yemekhane${hasMealData ? ' <span style="font-size:9px;color:#00e676">\u2022 ' + Object.keys(state.mealData).length + ' days</span>' : ''}`, 'color:#ff9100', () => {
    html += `<div style="font-size:10px;color:var(--dim);margin-bottom:10px">Istanbul \u00dc Yemekhane menu. Auto-fetch from SKS or paste manually.</div>
      <div class="data-controls" style="margin-bottom:10px">
        <button class="data-btn" data-action="fetchMeals" style="color:#ff9100;border-color:#ff910033">${state.mealFetchStatus === 'fetching' ? 'Fetching\u2026' : '\ud83d\udd04 Auto-fetch'}</button>
        <button class="data-btn" data-action="toggleMealPaste" style="color:#b44aff;border-color:#b44aff33">\u270f\ufe0f Paste menu</button>
        ${hasMealData ? '<button class="data-btn" data-action="clearMealData" style="color:#e94560;border-color:#e9456033">\u2715 Clear</button>' : ''}
      </div>`;
    if (state.mealFetchStatus === 'ok') html += `<div class="meal-status ok">Fetched and parsed successfully.</div>`;
    else if (state.mealFetchStatus === 'error') html += `<div class="meal-status err">Auto-fetch failed. Paste the menu below or try again.</div>`;
    else if (state.mealFetchStatus === 'fetching') html += `<div class="meal-status wait">Fetching from university API\u2026</div>`;
    if (state.mealShowPaste) {
      html += `<textarea class="meal-paste-area" id="meal-paste-input" placeholder="Paste the weekly menu here."></textarea>
        <button class="data-btn" data-action="savePastedMeals" style="width:100%;color:#ff9100;border-color:#ff910044;margin-top:4px">Parse & Save</button>`;
    }
    if (hasMealData) {
      const mealDates = Object.keys(state.mealData).sort();
      html += `<div style="margin-top:10px;font-size:10px;color:var(--dim);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">Stored (${mealDates.length} days)</div>`;
      mealDates.slice(-5).forEach(date => {
        const m = state.mealData[date];
        const items = [...(m.kahvalti || []), ...(m.ogle || []), ...(m.aksam || [])];
        html += `<div style="font-size:10px;color:var(--text);margin-bottom:4px"><span style="color:#ff9100;font-weight:600">${date}</span><span style="color:var(--dim)"> \u2014 ${items.slice(0, 3).join(', ')}${items.length > 3 ? '\u2026' : ''}</span></div>`;
      });
    }
  }, 'tools');

  // Recurring tasks
  const recTasks = loadRecurringTasks();
  lazyPanel('recurrence', `🔁 Recurring Tasks${recTasks.length ? ` (${recTasks.length})` : ''}`, 'color:#00d2ff', () => {
    html += `<div style="font-size:10px;color:var(--dim);margin-bottom:10px">Auto-injected into your day view based on recurrence rules.</div>`;
    recTasks.forEach(t => {
      const ruleLabel = t.recurrence.type === 'daily' ? 'Every day'
        : t.recurrence.type === 'weekdays' ? 'Mon-Fri'
        : t.recurrence.type === 'weekly' ? `Every ${t.recurrence.targetDay || '?'}`
        : `Custom: ${(t.recurrence.days || []).join(', ')}`;
      html += `<div class="editor-item">
        <span class="editor-item-text" style="flex:1">${escapeHtml(t.text)}</span>
        <span style="font-size:9px;color:var(--dim)">${ruleLabel}</span>
        <span class="editor-item-cat">${categories.getLabel(t.cat) || t.cat}</span>
        <button class="editor-remove-btn" data-action="removeRecurringTask" data-id="${escapeHtml(t.id)}" title="Remove">✕</button>
      </div>`;
    });
    html += `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
      <div class="grades-form-row">
        <input class="inbox-capture-input" id="rec-text" type="text" placeholder="Task text..." style="flex:2">
        <select class="editor-select" id="rec-cat">
          ${categories.keys().map(k => `<option value="${k}">${escapeHtml(categories.getLabel(k) || k)}</option>`).join('')}
        </select>
      </div>
      <div class="grades-form-row" style="margin-top:4px">
        <select class="editor-select" id="rec-type">
          <option value="daily">Daily</option>
          <option value="weekdays" selected>Weekdays (Mon-Fri)</option>
          <option value="weekly">Weekly</option>
        </select>
        <select class="editor-select" id="rec-target-day" style="display:none">
          ${days.map(d => `<option value="${d}">${escapeHtml(getDayLabel(d))}</option>`).join('')}
        </select>
        <button class="data-btn" data-action="addRecurringTask" style="color:var(--accent);border-color:#00d2ff44">+ Add</button>
      </div>
    </div>`;
  }, 'tools');

  // Data
  lazyPanel('data', 'Data', '', () => {
    html += `<div class="data-controls">
      <button class="data-btn" data-action="exportData">Export JSON</button>
      <button class="data-btn" data-action="importData">Import JSON</button>
      <button class="data-btn" data-action="exportCalendar" style="color:#b44aff;border-color:#b44aff33">\ud83d\udcc5 .ics</button>
      <button class="data-btn" data-action="shareProgress" style="color:#00e676;border-color:#00e67633">\ud83d\udce4 Share</button>
      <button class="data-btn" data-action="downloadBackup" style="color:#00d2ff;border-color:#00d2ff33">⬇ Download Backup</button>
      <label class="data-btn" style="color:#ffab00;border-color:#ffab0033;cursor:pointer;display:inline-block">⬆ Upload Backup<input type="file" id="backup-file-input" accept=".json" data-change-action="uploadBackup" style="display:none"></label>
      <button class="data-btn" data-action="exportWeeklySummary" style="color:#cf7aff;border-color:#cf7aff33">📊 Export Week</button>
    </div>`;
  }, 'tools');

  // Deadlines
  lazyPanel('deadlines', '\ud83d\udcc5 Deadlines', 'color:#b44aff', () => {
    state.deadlines.forEach((dl, idx) => {
      const daysLeft = getDaysUntil(dl.date);
      const cls = daysLeft < 0 ? 'urgent' : daysLeft <= 3 ? 'urgent' : daysLeft <= 7 ? 'soon' : 'ok';
      const label = daysLeft < 0 ? `${-daysLeft}d ago` : daysLeft === 0 ? 'TODAY' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`;
      html += `<div class="deadline-item">
        <span class="deadline-name">${escapeHtml(dl.name)} <span style="font-size:9px;color:var(--dim)">${dl.date}</span></span>
        <span style="display:flex;align-items:center;gap:6px"><span class="deadline-days ${cls}">${label}</span><button class="editor-remove-btn" data-action="removeDeadline" data-i="${idx}">\u2715</button></span>
      </div>`;
    });
    if (state.showDeadlineForm) {
      html += `<div class="deadline-form">
        <input id="dl-name" placeholder="Name (e.g. Midterm)">
        <input id="dl-date" type="date">
        <select id="dl-cat">${categories.keys().map(k => `<option value="${k}">${categories.getLabel(k)||k}</option>`).join('')}</select>
        <button class="data-btn" data-action="addDeadline">Add</button>
      </div>`;
    } else {
      html += `<button class="deadline-add" data-action="showDeadlineForm">+ Add deadline</button>`;
    }
  }, 'stats');

  // Weekly summary
  lazyPanel('summary', '\ud83d\udccb Weekly Summary', '', () => {
    const s = generateWeeklySummary();
    html += `<div class="summary-card">
      <div class="summary-stat"><span class="summary-label">Tasks completed</span><span class="summary-value">${s.wp.done}/${s.wp.total} (${s.wp.pct}%)</span></div>
    </div>`;
    const debtEntries = Object.entries(s.skipDebt).filter(([,c]) => c >= 1);
    if (debtEntries.length > 0) {
      html += `<div style="font-size:10px;color:var(--dim);margin:8px 0 4px;text-transform:uppercase;letter-spacing:1px">Skip Debt</div>`;
      debtEntries.forEach(([label, count]) => {
        html += `<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#e94560">${label}</span><span style="font-weight:600;color:#e94560">${count}</span></div>`;
      });
    }
  }, 'stats');

  // Notifications
  lazyPanel('notifs', '\ud83d\udd14 Notifications', '', () => {
    html += `<div style="font-size:11px;color:var(--muted);margin-bottom:8px">Get reminders for classes and leave times.</div>`;
    if (state.notifEnabled) {
      html += `<div style="font-size:11px;color:#00e676;margin-bottom:6px">\u2713 Notifications enabled</div>`;
    } else {
      html += `<button class="data-btn" data-action="requestNotifPermission" style="width:100%;color:var(--accent);border-color:#00d2ff44">Enable Notifications</button>`;
    }
  }, 'tools');

  // Categories
  lazyPanel('categories', '\ud83c\udfa8 Categories', 'color:var(--muted)', () => {
    html += `<div style="display:flex;flex-direction:column;gap:6px">`;
    categories.keys().forEach(key => {
      const cat = categories.get(key);
      const isEditing = state.catEditKey === key;
      if (isEditing) {
        const safeBg = /^#[0-9a-fA-F]{6}$/.test(cat.bg) ? cat.bg : '#1a1a1a';
        html += `<div class="cat-edit-row" style="border-color:${cat.border}55">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
            <div style="width:14px;height:14px;border-radius:4px;background:${cat.border};flex-shrink:0"></div>
            <span style="font-size:11px;font-weight:600;color:var(--text)">${escapeHtml(key)}</span>
          </div>
          <div class="settings-row"><label>Label (badge text)</label><input class="settings-input" id="cat-label-${key}" value="${escapeHtml(cat.label)}" placeholder="e.g. FA, HW, READ" maxlength="8" data-stop></div>
          <div style="display:flex;gap:8px">
            <div class="settings-row" style="flex:1"><label>Accent / border color</label><input class="settings-input" type="color" id="cat-border-${key}" value="${cat.border}" data-stop></div>
            <div class="settings-row" style="flex:1"><label>Background color</label><input class="settings-input" type="color" id="cat-bg-${key}" value="${safeBg}" data-stop></div>
          </div>
          <div class="settings-row"><label>Default estimate (min, 0 = no estimate)</label><input class="settings-input" type="number" id="cat-est-${key}" min="0" max="480" value="${cat.defaultEst}" data-stop></div>
          <div style="display:flex;gap:6px;margin-top:6px">
            <button class="data-btn" data-action="saveCatEdit" data-key="${key}" style="flex:1;color:var(--accent);border-color:#00d2ff44">\ud83d\udcbe Save</button>
            <button class="data-btn" data-action="editCat" data-key="${key}" style="flex:1">Cancel</button>
          </div>
        </div>`;
      } else {
        html += `<div class="cat-list-row">
          <div class="cat-swatch" style="background:${cat.border}"></div>
          <div class="cat-row-key">${escapeHtml(key)}</div>
          ${cat.label ? `<div class="cat-row-badge" style="background:${cat.border}18;color:${cat.border};border-color:${cat.border}33">${escapeHtml(cat.label)}</div>` : '<div style="width:20px"></div>'}
          <div class="cat-row-est">${cat.defaultEst ? cat.defaultEst + 'm' : '\u2014'}</div>
          <button class="cat-row-btn" data-action="editCat" data-key="${key}">Edit</button>
          <button class="cat-row-btn danger" data-action="deleteCat" data-key="${key}">\u00d7</button>
        </div>`;
      }
    });
    // Add new form
    if (state.showCatAddForm) {
      html += `<div class="cat-edit-row" style="border-color:var(--border);margin-top:4px">
        <div style="font-size:11px;font-weight:600;color:var(--text);margin-bottom:10px">New Category</div>
        <div class="settings-row"><label>Key (unique slug, lowercase)</label><input class="settings-input" id="cat-new-key" placeholder="e.g. physics2" maxlength="24" data-key-action="addCatOnEnter" data-stop></div>
        <div class="settings-row"><label>Label (badge text, optional)</label><input class="settings-input" id="cat-new-label" placeholder="PHY" maxlength="8" data-stop></div>
        <div style="display:flex;gap:8px">
          <div class="settings-row" style="flex:1"><label>Accent color</label><input class="settings-input" type="color" id="cat-new-border" value="#00d2ff" data-stop></div>
          <div class="settings-row" style="flex:1"><label>Background</label><input class="settings-input" type="color" id="cat-new-bg" value="#091a28" data-stop></div>
        </div>
        <div class="settings-row"><label>Default estimate (min)</label><input class="settings-input" type="number" id="cat-new-est" min="0" max="480" value="60" data-stop></div>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button class="data-btn" data-action="addCat" style="flex:1;color:var(--accent);border-color:#00d2ff44">+ Add</button>
          <button class="data-btn" data-action="showCatAddFormOff" style="flex:1">Cancel</button>
        </div>
      </div>`;
    } else {
      html += `<button class="data-btn" data-action="showCatAddFormOn" style="width:100%;color:var(--accent);border-color:#00d2ff22;margin-top:4px">+ New Category</button>`;
    }
    html += `<button class="data-btn" data-action="resetCatToDefaults" style="width:100%;color:#e94560;border-color:#e9456033;margin-top:2px">\u21ba Reset to Defaults</button>`;
    html += `</div>`;
  }, 'tools');

  // Pomodoro timer settings
  lazyPanel('pomodoro', '🍅 Pomodoro Timer', 'color:var(--muted)', () => {
    const { loadPomodoroConfig: _lpc } = (() => ({ loadPomodoroConfig: null }))();
    // Defaults (config loaded client-side)
    html += `<div style="display:flex;flex-direction:column;gap:0">
      <div class="settings-section">
        <div class="settings-section-label">Session Lengths</div>
        <div class="settings-row"><label>Work (minutes)</label>
          <input class="settings-input" type="number" id="pomo-work" min="1" max="120" value="25"></div>
        <div class="settings-row"><label>Short break (minutes)</label>
          <input class="settings-input" type="number" id="pomo-break" min="1" max="30" value="5"></div>
        <div class="settings-row"><label>Long break (minutes)</label>
          <input class="settings-input" type="number" id="pomo-long" min="1" max="60" value="15"></div>
        <div class="settings-row"><label>Sessions before long break</label>
          <input class="settings-input" type="number" id="pomo-sessions" min="1" max="10" value="4"></div>
      </div>
      <button class="data-btn" data-action="savePomodoroConfig"
        style="width:100%;color:var(--accent);border-color:#00d2ff44;margin-top:4px">💾 Save Pomodoro Settings</button>
      <div style="font-size:11px;color:var(--dim);margin-top:10px">
        Start a Pomodoro from any task's action menu. The timer bar appears at the bottom of the screen.
      </div>
    </div>`;
  }, 'tools');

  // Settings
  const TIMEZONES = ['Europe/Istanbul','Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Sao_Paulo','Asia/Tokyo','Asia/Shanghai','Asia/Seoul','Asia/Kolkata','Asia/Dubai','Australia/Sydney','Pacific/Auckland'];
  lazyPanel('settings', '\u2699\ufe0f Settings', 'color:var(--muted)', () => {
    html += `<div style="display:flex;flex-direction:column;gap:0">
      <div class="settings-section">
        <div class="settings-section-label">Identity</div>
        <div class="settings-row"><label>App Title</label><input class="settings-input" id="cfg-appTitle" value="${escapeHtml(config.appTitle)}" placeholder="Study Plan"></div>
        <div class="settings-row"><label>Semester Name</label><input class="settings-input" id="cfg-semester" value="${escapeHtml(config.semester)}" placeholder="Spring 2026 \u00b7 4th Semester"></div>
        <div class="settings-row"><label>Header Tag</label><input class="settings-input" id="cfg-headerTag" value="${escapeHtml(config.headerTag)}" placeholder="FA \u2265 18h/week \u00b7 preview \u2192 class \u2192 hw"></div>
      </div>
      <div class="settings-section">
        <div class="settings-section-label">Environment</div>
        <div class="settings-row"><label>Timezone</label><select class="settings-input" id="cfg-timezone">${TIMEZONES.map(tz => `<option value="${tz}"${config.timezone === tz ? ' selected' : ''}>${tz}</option>`).join('')}</select></div>
      </div>
      <div class="settings-section">
        <div class="settings-section-label">Appearance</div>
        <div class="settings-row" style="align-items:flex-start;flex-direction:column;gap:6px">
          <label>Theme Preset</label>
          <div class="theme-preset-grid">
            ${Object.entries(THEME_PRESETS).map(([key, preset]) =>
              `<button class="theme-preset-btn ${currentPreset === key ? 'active' : ''}"
                data-action="setThemePreset" data-key="${key}">${escapeHtml(preset.label)}</button>`
            ).join('')}
          </div>
        </div>
        <div class="settings-row" style="align-items:flex-start;flex-direction:column;gap:6px">
          <label>Accent Color</label>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            ${['#00d2ff','#00e676','#ff6d00','#ff4081','#7c4dff','#ffab00','#cf7aff','#e94560'].map(c =>
              `<button class="accent-swatch" data-action="setAccentColor" data-value="${c}"
                style="background:${c}" title="${c}"></button>`
            ).join('')}
            <input type="color" id="accent-color-picker" value="#00d2ff"
              data-change-action="setAccentColor"
              style="width:32px;height:32px;border:1px solid var(--border2);border-radius:6px;cursor:pointer;padding:2px;background:none">
            <button class="data-btn" data-action="resetAccentColor" style="font-size:10px;color:var(--dim)">Reset</button>
          </div>
        </div>
        <div class="settings-section-label">UI Defaults</div>
        <div class="settings-row"><label>Toast Duration (ms)</label><input class="settings-input" type="number" id="cfg-toastDuration" min="500" max="10000" value="${config.toastDuration}"></div>
        <div class="settings-row"><label>Swipe Threshold (px)</label><input class="settings-input" type="number" id="cfg-swipeThreshold" min="20" max="200" value="${config.swipeThreshold}"></div>
      </div>
      <div class="settings-section">
        <div class="settings-section-label">External APIs</div>
        <div class="settings-row"><label>Meal API URL</label><input class="settings-input" id="cfg-mealApiUrl" value="${escapeHtml(config.mealApiUrl)}" placeholder="https://sks.istanbul.edu.tr/..."></div>
        <div class="settings-row"><label>Goodreads RSS URL</label><input class="settings-input" id="cfg-goodreadsRss" value="${escapeHtml(config.goodreadsRss)}" placeholder="https://www.goodreads.com/..."></div>
      </div>
      <button class="data-btn" data-action="applySettings" style="width:100%;color:var(--accent);border-color:#00d2ff44;margin-top:4px">\ud83d\udcbe Save Settings</button>
      <button class="data-btn" data-action="resetSettings" style="width:100%;color:#e94560;border-color:#e9456033;margin-top:6px">\u21ba Reset to Defaults</button>
      <div class="settings-save-note">Changes take effect immediately. Reset requires a page reload.</div>
    </div>`;
  }, 'tools');

  return html;
}

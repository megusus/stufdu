// ════════════════════════════════════════
// ── Task Item Renderer ──
// ════════════════════════════════════════

import { renderMarkdown, markdownExcerpt } from '../markdown.js';

/**
 * Pure renderer: receives RenderContext + item data, returns HTML string.
 * @param {import('./context.js').RenderContext} ctx
 * @param {Object} item - task item {id, text, hint, cat, est?}
 * @param {string} dayName
 * @param {string} [extraClass]
 * @param {string} [fromDay] - original day if deferred
 */
export function renderItem(ctx, item, dayName, extraClass, fromDay, dragAttrs) {
  const { state, escapeHtml, formatEst, getEstimate, getStatus, categories, days,
          STATUS_DONE, STATUS_SKIP, STATUS_PROGRESS, STATUS_BLOCKED } = ctx;

  const st = getStatus(item.id);
  const c = categories.getColor(item.cat);
  const label = categories.getLabel(item.cat);
  const est = getEstimate(item);

  let cls = 'item';
  if (st === STATUS_DONE) cls += ' done';
  else if (st === STATUS_SKIP) cls += ' skip';
  else if (st === STATUS_PROGRESS) cls += ' progress';
  else if (st === STATUS_BLOCKED) cls += ' blocked';
  if (state.justCompletedId === item.id) cls += ' just-completed';
  if (state.justSkippedId === item.id) cls += ' just-skipped';
  if (extraClass) cls += ' ' + extraClass;

  const check = st === STATUS_DONE ? '\u2713' : st === STATUS_SKIP ? '\u2716' : st === STATUS_PROGRESS ? '\u25b6' : st === STATUS_BLOCKED ? '\u26d4' : '';
  const checkCls = st ? `check ${st}` : 'check';
  const deferBadge = state.taskDeferred[item.id] && state.taskDeferred[item.id] !== dayName
    ? ` <span class="defer-badge">\u2192 ${escapeHtml(state.taskDeferred[item.id])}</span>` : '';
  const fromBadge = fromDay ? ` <span class="defer-from">from ${escapeHtml(fromDay)}</span>` : '';

  const statusText = st === STATUS_DONE ? 'completed' : st === STATUS_SKIP ? 'skipped' : st === STATUS_PROGRESS ? 'in progress' : st === STATUS_BLOCKED ? 'blocked' : 'not started';
  const ariaChecked = st === STATUS_DONE ? 'true' : st === STATUS_PROGRESS ? 'mixed' : 'false';

  let html = `<div class="${cls}" data-task-id="${item.id}" data-action="handleItemClick" data-id="${item.id}"
    data-context-action="showTaskCtxMenu" data-touchstart-action="handleLongPressStart" data-touchend-action="handleLongPressEnd"
    role="checkbox" aria-checked="${ariaChecked}" aria-label="${escapeHtml(item.text)} — ${statusText}"
    style="border-left-color:${c.border}" ${dragAttrs || ''}>`;

  html += `<div class="${checkCls}" data-action="toggle" data-id="${item.id}">${check}</div>`;
  html += `<div class="item-content">`;
  html += `<div class="item-text">${escapeHtml(item.text)}${deferBadge}${fromBadge}</div>`;
  if (item.hint) html += `<div class="item-hint">${escapeHtml(item.hint)}</div>`;
  // Blocked-by badge
  const blockers = state.taskBlockedBy?.[item.id];
  if (blockers?.length && st !== STATUS_DONE) {
    const allClear = blockers.every(bid => {
      const bs = state.checked[bid]; return bs === true || bs === 'done';
    });
    if (!allClear) {
      html += `<div class="item-blocked-label">⛔ blocked by ${blockers.length} task${blockers.length !== 1 ? 's' : ''}</div>`;
    }
  }
  html += `<div class="item-meta">`;
  if (label) html += `<span class="item-cat" style="background:${c.border}18;color:${c.border};border-color:${c.border}33">${escapeHtml(label)}</span>`;
  if (est) html += `<span class="item-est">${formatEst(est)}</span>`;
  html += `</div>`;

  // Notes
  const note = state.taskNotes[item.id];
  if (note) html += `<div class="item-note">\ud83d\udcdd ${escapeHtml(note)}</div>`;

  // Links
  const links = state.taskLinks[item.id];
  if (links && links.length) {
    html += '<div class="item-links">';
    links.forEach((url, idx) => {
      const domain = (() => { try { return new URL(url).hostname; } catch { return url; } })();
      html += `<a class="item-link" href="${escapeHtml(url)}" target="_blank" rel="noopener" data-stop>\ud83d\udd17 ${escapeHtml(domain)}</a>`;
      html += `<button class="item-link-remove" data-action="removeLink" data-id="${item.id}" data-idx="${idx}" data-stop title="Remove">\u00d7</button>`;
    });
    html += '</div>';
  }

  html += '</div>'; // .item-content

  // Action button
  html += `<button class="item-actions-btn" data-action="toggleActionMenu" data-id="${item.id}" data-stop title="Actions">\u22ee</button>`;

  html += '</div>'; // .item

  // Action menu
  if (state.openActions === item.id) {
    html += `<div class="action-menu" data-stop>
      <button class="action-btn skip" data-action="setTaskStatus" data-id="${item.id}" data-status="${STATUS_SKIP}">Skip</button>
      <button class="action-btn progress" data-action="setTaskStatus" data-id="${item.id}" data-status="${STATUS_PROGRESS}">In Progress</button>
      <button class="action-btn blocked" data-action="setTaskStatus" data-id="${item.id}" data-status="${STATUS_BLOCKED}">Blocked</button>
      <button class="action-btn" data-action="showNoteInput" data-id="${item.id}">\ud83d\udcdd Note</button>
      <button class="action-btn" data-action="addLink" data-id="${item.id}">\ud83d\udd17 Link</button>
      <button class="action-btn" data-action="openLectureNotes" data-id="${item.id}">\ud83d\udcdd Lecture Notes</button>
      <button class="action-btn" data-action="startTimeTrack" data-id="${item.id}" data-text="${item.text.replace(/"/g,'&quot;').slice(0,60)}">\u23f1 Track</button>
      <button class="action-btn" data-action="startPomodoro" data-task-text="${item.text.replace(/"/g,'&quot;').slice(0,60)}">🍅 Pomodoro</button>
      <button class="action-btn" data-action="startFocusSession" data-id="${item.id}" data-text="${item.text.replace(/"/g,'&quot;').slice(0,60)}">🎯 Focus</button>
      <button class="action-btn" data-action="scheduleReview" data-id="${item.id}" data-text="${item.text.replace(/"/g,'&quot;').slice(0,60)}" data-cat="${item.cat}">🧠 Spaced Review</button>
      <button class="action-btn" data-action="showBlockerPicker" data-id="${item.id}">⛔ Set Blocker</button>
      <button class="action-btn defer" data-action="showDeferPicker" data-id="${item.id}">\u2192 Defer</button>
      <button class="action-btn danger" data-action="clearTask" data-id="${item.id}">\u2715 Clear</button>
    </div>`;
  }

  // Note input
  if (state.openNoteInput === item.id) {
    html += `<div class="note-input-wrap" data-stop>
      <input id="note-input-${item.id}" class="note-input" type="text" placeholder="Add a note\u2026"
        value="${escapeHtml(note || '')}" data-key-action="saveNoteOnEnter" data-id="${item.id}">
    </div>`;
  }

  // Lecture notes
  const lectureNote = state.lectureNotes?.[item.id];
  if (lectureNote) {
    html += `<div class="lecture-note-preview" data-action="openLectureNotes" data-id="${item.id}" data-stop>
      📝 <span class="lecture-note-preview-text">${escapeHtml(markdownExcerpt(lectureNote, 96))}</span>
    </div>`;
  }
  if (state.openLectureNotes === item.id) {
    const previewId = `lecture-notes-preview-${item.id}`;
    const editorId = `lecture-notes-${item.id}`;
    const notePreview = renderMarkdown(lectureNote || '') || '<div class="markdown-empty">Preview formulas, lists, links, and checkboxes here.</div>';
    html += `<div class="lecture-notes-editor" data-stop>
      <div class="markdown-toolbar">
        <button class="markdown-tool-btn" data-action="markdownShortcut" data-target="${editorId}" data-command="heading" title="Heading">H</button>
        <button class="markdown-tool-btn" data-action="markdownShortcut" data-target="${editorId}" data-command="bold" title="Bold">B</button>
        <button class="markdown-tool-btn" data-action="markdownShortcut" data-target="${editorId}" data-command="italic" title="Italic">I</button>
        <button class="markdown-tool-btn" data-action="markdownShortcut" data-target="${editorId}" data-command="list" title="List">•</button>
        <button class="markdown-tool-btn" data-action="markdownShortcut" data-target="${editorId}" data-command="checkbox" title="Checkbox">☐</button>
        <button class="markdown-tool-btn" data-action="markdownShortcut" data-target="${editorId}" data-command="code" title="Inline code">{ }</button>
        <button class="markdown-tool-btn" data-action="markdownShortcut" data-target="${editorId}" data-command="fence" title="Code block">&#96;&#96;&#96;</button>
        <button class="markdown-tool-btn" data-action="markdownShortcut" data-target="${editorId}" data-command="link" title="Link">↗</button>
      </div>
      <div class="lecture-markdown-grid">
        <textarea id="${editorId}" class="lecture-notes-textarea lecture-notes-textarea--markdown"
          placeholder="# Lecture notes&#10;- definition&#10;- [ ] theorem to revisit"
          data-input-action="updateMarkdownPreview" data-preview-id="${previewId}"
          data-stop>${escapeHtml(lectureNote || '')}</textarea>
        <div class="markdown-preview lecture-markdown-preview" id="${previewId}" data-stop>${notePreview}</div>
      </div>
      <div class="lecture-notes-actions">
        <button class="data-btn" data-action="saveLectureNotes" data-id="${item.id}"
          style="color:var(--accent);border-color:#00d2ff44">Save</button>
        <button class="data-btn" data-action="closeLectureNotes"
          style="color:var(--dim)">Close</button>
      </div>
    </div>`;
  }

  // Link input
  if (state.openLinkInput === item.id) {
    html += `<div class="note-input-wrap" data-stop>
      <input id="link-input-${item.id}" class="note-input" type="url" placeholder="Paste a URL\u2026"
        data-key-action="saveLinkOnEnterOrClose" data-id="${item.id}">
    </div>`;
  }

  // Defer picker
  if (state.openDeferPicker === item.id) {
    html += '<div class="defer-picker" data-stop>';
    days.forEach(d => {
      if (d === dayName) return;
      html += `<button class="defer-day-btn" data-action="deferTask" data-id="${item.id}" data-day="${d}">${escapeHtml(d)}</button>`;
    });
    html += '</div>';
  }

  // Blocker picker
  if (state.openBlockerPicker === item.id) {
    html += '<div class="defer-picker blocker-picker" data-stop>';
    html += '<div style="font-size:9px;color:var(--dim);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Pick a blocking task:</div>';
    const currentBlockers = state.taskBlockedBy?.[item.id] || [];
    days.forEach(d => {
      const dayData = ctx.schedule[d];
      if (!dayData) return;
      dayData.sections.forEach(sec => {
        sec.items.forEach(it => {
          if (it.id === item.id) return;
          const isBlocker = currentBlockers.includes(it.id);
          html += `<button class="defer-day-btn${isBlocker ? ' active' : ''}" style="${isBlocker ? 'color:#e94560;border-color:#e94560' : ''}"
            data-action="toggleBlocker" data-id="${item.id}" data-blocker="${it.id}"
            title="${escapeHtml(d)}">${isBlocker ? '⛔ ' : ''}${escapeHtml(it.text.slice(0,35))}</button>`;
        });
      });
    });
    html += '<button class="defer-day-btn" data-action="closeBlockerPicker" style="color:var(--dim);margin-top:4px">Done</button>';
    html += '</div>';
  }

  return html;
}

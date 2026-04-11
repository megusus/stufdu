// ════════════════════════════════════════
// ── Task Item Renderer ──
// ════════════════════════════════════════

import { CategoryRegistry } from '../categories.js';
import { DAYS } from '../schedule.js';
import {
  state, getStatus, getEstimate, formatEst, escapeHtml,
  STATUS_DONE, STATUS_SKIP, STATUS_PROGRESS, STATUS_BLOCKED,
} from '../state.js';

export function renderItem(item, dayName, extraClass, fromDay) {
  try {
    return _renderItemInner(item, dayName, extraClass, fromDay);
  } catch (err) {
    console.error('[render] Task item failed:', err, item);
    return `<div class="item" style="padding:8px 12px;color:#e94560;font-size:11px;border-left:2px solid #e94560">
      \u26a0\ufe0f Failed to render: <em>${escapeHtml(item?.text ?? '?')}</em>
      <span style="font-size:9px;color:var(--dim);margin-left:6px;font-family:monospace">${escapeHtml(String(err).slice(0, 80))}</span>
    </div>`;
  }
}

function _renderItemInner(item, dayName, extraClass, fromDay) {
  const c = CategoryRegistry.getColor(item.cat);
  const st = getStatus(item.id);
  const isDeferred = state.taskDeferred[item.id] && state.taskDeferred[item.id] !== dayName;
  if (state.focusMode && (st === STATUS_DONE || st === STATUS_SKIP) && !isDeferred) return '';
  if (state.searchQuery && !item.text.toLowerCase().includes(state.searchQuery) && !(item.hint && item.hint.toLowerCase().includes(state.searchQuery))) return '';

  let cls = 'item';
  if (st === STATUS_DONE) cls += ' done';
  else if (st === STATUS_SKIP) cls += ' skip';
  else if (st === STATUS_PROGRESS) cls += ' progress';
  else if (st === STATUS_BLOCKED) cls += ' blocked';
  if (isDeferred) cls += ' deferred-out';
  if (extraClass) cls += ' ' + extraClass;
  if (state.justCompletedId === item.id) cls += ' just-completed';
  if (state.justSkippedId === item.id) cls += ' just-skipped';
  if (state.activeFilter && item.cat !== state.activeFilter) cls += ' item-filtered-out';

  const textColor = item.cat === "class" || item.cat === "fameeting" ? c.border : "var(--text)";
  const catLabel = CategoryRegistry.getLabel(item.cat);
  const note = state.taskNotes[item.id];
  const hasActions = state.openActions === item.id;
  const hasNoteInput = state.openNoteInput === item.id;
  const hasDeferPicker = state.openDeferPicker === item.id;

  let h = `
    <div class="item-swipe-wrap" data-swipe-id="${item.id}">
      <div class="swipe-bg swipe-bg-right">\u2713 Done</div>
      <div class="swipe-bg swipe-bg-left">\u23ed Skip</div>
      <div class="swipe-indicator swipe-indicator-right">\u2713</div>
      <div class="swipe-indicator swipe-indicator-left">\u2716</div>
      <div class="item-swipe-inner">
    <div class="${cls}" role="checkbox" aria-checked="${st === STATUS_DONE}" tabindex="0"
         data-task-id="${item.id}" style="background:${c.bg};border:1px solid ${c.border}22"
         oncontextmenu="showTaskCtxMenu('${item.id}',event)">
      <div class="item-bar" style="background:${c.border}"></div>
      <div class="item-body"
           data-action="handleItemClick" data-id="${item.id}"
           ontouchstart="handleLongPressStart('${item.id}',event)"
           ontouchend="handleLongPressEnd()" ontouchmove="handleLongPressEnd()">
        <div class="item-check" aria-hidden="true"></div>
        <div class="item-info">
          <div class="item-text" style="color:${textColor}">${escapeHtml(item.text)}${note ? '<span class="note-icon">\ud83d\udcdd</span>' : ''}</div>
          ${item.hint ? `<div class="item-hint">${escapeHtml(item.hint)}</div>` : ''}
          ${catLabel ? `<div class="item-cat" style="color:${c.border}">${catLabel}${st !== STATUS_DONE && st !== STATUS_SKIP && getEstimate(item) > 0 ? `<span class="est-badge">~${formatEst(getEstimate(item))}</span>` : ''}</div>` : (st !== STATUS_DONE && st !== STATUS_SKIP && getEstimate(item) > 0 ? `<div class="item-cat est-badge">~${formatEst(getEstimate(item))}</div>` : '')}
          ${fromDay ? `<div class="deferred-from">\u2192 from ${fromDay}</div>` : ''}
          ${note ? `<div class="item-note">${escapeHtml(note)}</div>` : ''}
          ${state.taskLinks[item.id] && state.taskLinks[item.id].length ? `<div class="item-links">${state.taskLinks[item.id].map((url, li) => { let host; try { host = new URL(url).hostname.replace('www.',''); } catch(e) { host = url.slice(0,20); } return `<a class="item-link" href="${escapeHtml(url)}" target="_blank" onclick="event.stopPropagation()" title="${escapeHtml(url)}">\ud83d\udd17 ${host.slice(0,20)}</a>`; }).join('')}</div>` : ''}
        </div>
        <div class="item-actions-btn" data-action="toggleActionMenu" data-id="${item.id}">\u22ee</div>
      </div>`;

  // Action bar
  if (hasActions) {
    h += `<div class="item-action-bar open">
      <button class="action-btn act-skip"     data-action="setTaskStatus" data-id="${item.id}" data-status="skip">\u23ed Skip</button>
      <button class="action-btn act-progress" data-action="setTaskStatus" data-id="${item.id}" data-status="progress">\ud83d\udfe0 Progress</button>
      <button class="action-btn act-note"     data-action="showNoteInput" data-id="${item.id}">\ud83d\udcdd Note</button>
      <button class="action-btn act-defer"    data-action="showDeferPicker" data-id="${item.id}">\u2192 Defer</button>
      <button class="action-btn act-clear"    data-action="clearTask" data-id="${item.id}">\u2715 Clear</button>
      <button class="action-btn" data-action="startPomo" data-id="${item.id}" style="color:#e94560;border-color:#e9456033">\u23f1 Focus</button>
      <button class="action-btn" data-action="addLink"   data-id="${item.id}" style="color:var(--accent);border-color:#00d2ff33">\ud83d\udd17 Link</button>
    </div>`;
  }

  // Note input (onkeydown needs saveNote on window — not a click, so stays inline)
  if (hasNoteInput) {
    h += `<textarea class="note-input" id="note-input-${item.id}"
         placeholder="Add a note\u2026"
         onclick="event.stopPropagation()"
         onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();saveNote('${item.id}')}">${escapeHtml(note || '')}</textarea>`;
  }

  // Link input (onkeydown needs saveLink on window — not a click, so stays inline)
  if (state.openLinkInput === item.id) {
    h += `<div style="padding:4px 12px 8px;display:flex;gap:4px">
      <input id="link-input-${item.id}" type="url" placeholder="https://\u2026"
             style="flex:1;font-family:inherit;font-size:11px;background:var(--bg);color:var(--text);border:1px solid var(--accent);border-radius:6px;padding:6px 10px;outline:none"
             onclick="event.stopPropagation()"
             onkeydown="if(event.key==='Enter'){event.preventDefault();saveLink('${item.id}')};if(event.key==='Escape'){openLinkInput=null;render()}">
      <button class="action-btn" data-action="saveLink" data-id="${item.id}" style="color:var(--accent);border-color:#00d2ff33">\ud83d\udd17 Add</button>
    </div>`;
  }

  // Defer picker
  if (hasDeferPicker) {
    h += `<div class="defer-picker open">`;
    DAYS.forEach(d => {
      if (d !== dayName) {
        h += `<button class="defer-day-btn" data-action="deferTask" data-id="${item.id}" data-day="${d}">${d.slice(0, 3)}</button>`;
      }
    });
    h += `</div>`;
  }

  h += `</div></div></div>`; // close item + swipe-inner + swipe-wrap
  return h;
}

// ════════════════════════════════════════
// ── Drag & Drop Engine ──
// ════════════════════════════════════════

let _render = null;
let _dragState = null; // { taskId, fromDay, fromSectionIdx, fromItemIdx }

export function initDragDrop(renderFn) {
  _render = renderFn;
  document.addEventListener('dragover', _onDragOver, { passive: false });
  document.addEventListener('drop', _onDrop);
  document.addEventListener('dragend', _onDragEnd);
}

export function getDragState() { return _dragState; }

export function handleDragStart(taskId, fromDay, fromSectionIdx, fromItemIdx) {
  _dragState = { taskId, fromDay, fromSectionIdx: +fromSectionIdx, fromItemIdx: +fromItemIdx };
}

function _onDragOver(e) {
  if (!_dragState) return;
  const target = e.target.closest('[data-drop-zone]') || e.target.closest('[data-week-drop-day]');
  if (target) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.drop-zone-active').forEach(el => el.classList.remove('drop-zone-active'));
    target.classList.add('drop-zone-active');
  }
}

function _onDrop(e) {
  if (!_dragState) return;

  // Day-view drop zones
  const target = e.target.closest('[data-drop-zone]');
  if (target) {
    e.preventDefault();
    const toDay = target.dataset.dropDay;
    const toSectionIdx = +target.dataset.dropSection;
    import('../schedule.js').then(({ moveTaskBetweenSections, saveScheduleToStorage }) => {
      const { fromDay, fromSectionIdx, fromItemIdx } = _dragState;
      if (toDay === fromDay && toSectionIdx === fromSectionIdx) { _clearDrag(); return; }
      moveTaskBetweenSections(fromDay, fromSectionIdx, fromItemIdx, toDay, toSectionIdx);
      saveScheduleToStorage();
      _clearDrag();
      if (_render) _render();
    });
    return;
  }

  // Week-view cross-day drop
  const weekTarget = e.target.closest('[data-week-drop-day]');
  if (weekTarget) {
    e.preventDefault();
    const toDay = weekTarget.dataset.weekDropDay;
    import('../schedule.js').then(({ moveTaskBetweenSections, saveScheduleToStorage, schedule }) => {
      const { fromDay, fromSectionIdx, fromItemIdx } = _dragState;
      if (toDay === fromDay) { _clearDrag(); return; }
      const toSectionIdx = 0; // drop into first section of target day
      moveTaskBetweenSections(fromDay, fromSectionIdx, fromItemIdx, toDay, toSectionIdx);
      saveScheduleToStorage();
      _clearDrag();
      if (_render) _render();
    });
    return;
  }

  _clearDrag();
}

function _onDragEnd() {
  document.querySelectorAll('.drop-zone-active').forEach(el => el.classList.remove('drop-zone-active'));
  _clearDrag();
}

function _clearDrag() {
  _dragState = null;
}

// ════════════════════════════════════════
// ── Swipe Gestures & Long Press ──
// ════════════════════════════════════════

import { CONFIG } from '../config.js';
import { state, haptic, STATUS_SKIP } from '../state.js';
import { DAYS, dayConfig } from '../schedule.js';

function getSwipeThreshold() {
  return Number(CONFIG.swipeThreshold) || 60;
}

// ── Task swipe (swipe right=done, swipe left=skip) ──
let swipeState = null;

export function initSwipeListeners(toggle, setTaskStatus) {
  document.addEventListener('touchstart', function (e) {
    const wrap = e.target.closest('.item-swipe-wrap');
    if (!wrap) return;
    const touch = e.touches[0];
    swipeState = {
      id: wrap.dataset.swipeId,
      startX: touch.clientX,
      startY: touch.clientY,
      el: wrap,
      inner: wrap.querySelector('.item-swipe-inner'),
      bgRight: wrap.querySelector('.swipe-bg-right'),
      bgLeft: wrap.querySelector('.swipe-bg-left'),
      locked: false,
      swiping: false,
    };
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!swipeState) return;
    const touch = e.touches[0];
    const dx = touch.clientX - swipeState.startX;
    const dy = touch.clientY - swipeState.startY;

    if (!swipeState.locked && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      swipeState = null;
      return;
    }
    if (Math.abs(dx) > 10) swipeState.locked = true;
    if (!swipeState.locked) return;

    swipeState.swiping = true;
    const clamped = Math.max(-150, Math.min(150, dx));
    swipeState.inner.style.transition = 'none';
    swipeState.inner.style.transform = `translateX(${clamped}px)`;

    const indRight = swipeState.el.querySelector('.swipe-indicator-right');
    const indLeft = swipeState.el.querySelector('.swipe-indicator-left');

    const threshold = getSwipeThreshold();
    if (clamped > threshold) {
      swipeState.bgRight.classList.add('visible');
      swipeState.bgLeft.classList.remove('visible');
      if (indRight && !indRight.classList.contains('active')) {
        indRight.classList.add('active');
        haptic('light');
      }
      if (indLeft) indLeft.classList.remove('active');
    } else if (clamped < -threshold) {
      swipeState.bgLeft.classList.add('visible');
      swipeState.bgRight.classList.remove('visible');
      if (indLeft && !indLeft.classList.contains('active')) {
        indLeft.classList.add('active');
        haptic('light');
      }
      if (indRight) indRight.classList.remove('active');
    } else {
      swipeState.bgRight.classList.remove('visible');
      swipeState.bgLeft.classList.remove('visible');
      if (indRight) indRight.classList.remove('active');
      if (indLeft) indLeft.classList.remove('active');
    }
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (!swipeState || !swipeState.swiping) {
      swipeState = null;
      return;
    }
    const inner = swipeState.inner;
    const transform = inner.style.transform;
    const match = transform.match(/translateX\(([-.0-9]+)px\)/);
    const dx = match ? parseFloat(match[1]) : 0;

    inner.style.transition = 'transform 0.2s ease-out';
    inner.style.transform = 'translateX(0)';

    const threshold = getSwipeThreshold();
    if (dx > threshold) {
      haptic('success');
      toggle(swipeState.id);
    } else if (dx < -threshold) {
      haptic('medium');
      setTaskStatus(swipeState.id, STATUS_SKIP);
    }

    swipeState = null;
  }, { passive: true });
}

// ── Long press ──
let longPressTimer = null;
let longPressTriggered = false;

export function handleLongPressStart(id, e, toggleActionMenu) {
  longPressTriggered = false;
  longPressTimer = setTimeout(() => {
    longPressTriggered = true;
    toggleActionMenu(id);
    haptic('medium');
  }, 400);
}

export function handleLongPressEnd() {
  clearTimeout(longPressTimer);
}

export function handleItemClick(id, e, toggle) {
  if (longPressTriggered) {
    longPressTriggered = false;
    e.stopPropagation();
    e.preventDefault();
    return;
  }
  toggle(id);
}

// ── Page swipe (day navigation) ──
export function initPageSwipe(selectDay) {
  let touchStartX = 0, touchStartY = 0;
  let pageSwipeBlocked = false;

  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    pageSwipeBlocked = !!e.target.closest('.item-swipe-wrap') || touchStartX < 30 || touchStartX > window.innerWidth - 30;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (pageSwipeBlocked) { pageSwipeBlocked = false; return; }
    const diffX = e.changedTouches[0].screenX - touchStartX;
    const diffY = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(diffY) > Math.abs(diffX)) return;
    if (Math.abs(diffX) > getSwipeThreshold()) {
      // Skip inactive days when swiping
      if (diffX < 0) {
        let next = state.selectedDay + 1;
        while (next < DAYS.length && dayConfig[DAYS[next]]?.active === false) next++;
        if (next < DAYS.length) selectDay(next);
      } else {
        let prev = state.selectedDay - 1;
        while (prev >= 0 && dayConfig[DAYS[prev]]?.active === false) prev--;
        if (prev >= 0) selectDay(prev);
      }
    }
  }, { passive: true });
}

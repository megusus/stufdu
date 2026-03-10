# Study Plan App — Improvement Analysis

## Overview

**stufdu** is a single-file (`index.html`, ~2200 lines) vanilla JS study planner.
It tracks weekly tasks across 7 courses with task states, notes, deferral, streaks, and optional Firebase cloud sync.

---

## Security (High Priority)

### 1. Plain-text password storage
- **Location**: `index.html:1563-1564`
- Firebase email/password credentials stored unencrypted in `localStorage`.
- **Fix**: Use `sessionStorage` or re-prompt credentials each session.

### 2. `new Function()` used for config parsing
- **Location**: `index.html:1607`
- Essentially equivalent to `eval()` — can execute arbitrary code from user input.
- **Fix**: Replace with a proper `JSON.parse()` call with validation.

### 3. HTML injection risk
- **Location**: `index.html:1299, 2146`
- User-controlled strings (notes, imported data) rendered via `innerHTML`.
- **Fix**: Use `textContent` for user data or sanitize before insertion.

---

## Error Handling (High Priority)

### 4. Silent catch blocks
- **Locations**: Lines 1261, 1265, 1269, 1279, 1288, 1708–1712
- Empty `catch` blocks swallow errors — data loss and sync failures go unnoticed.
- **Fix**: Log errors or surface them to the user.

### 5. No import validation
- Imported JSON has no schema validation, no sanitization, no bounds checking.
- **Fix**: Validate structure and sanitize all imported data.

---

## Code Quality (Medium Priority)

### 6. Monolithic render function (~340 lines)
- **Location**: `index.html:1810-2148`
- Regenerates entire DOM on every state change.
- **Fix**: Split into smaller component functions; consider incremental DOM updates.

### 7. No sync debouncing
- **Location**: `syncPush()` at line 1700
- Every change triggers a Firebase write immediately.
- **Fix**: Debounce/throttle sync writes.

### 8. Missing null checks
- DOM queries like `document.querySelector(...)` can return `null` without guards.
- **Fix**: Add defensive null checks before `.style` or property access.

### 9. Magic strings
- `'sp26-w'` prefix and state strings (`"done"`, `"skip"`, `"progress"`) repeated throughout.
- **Fix**: Extract to named constants.

---

## Testing & Documentation (Medium Priority)

### 10. Zero test coverage
- Complex logic (ISO week calc, deferred task counting, sync conflict resolution) is untested.
- **Fix**: Add unit tests for core logic.

### 11. No README
- No setup instructions, data model docs, or Firebase schema description.

### 12. Messy git history
- 7 of 9 commits have gibberish messages.

---

## Accessibility & UX (Lower Priority)

### 13. Color-only state indicators
- Red = skip, orange = progress — not accessible to colorblind users.
- **Fix**: Add icons or patterns alongside colors.

### 14. Incomplete PWA
- Manifest exists but no service worker — offline support doesn't work.

### 15. Single responsive breakpoint
- Only `max-width: 400px`. Tablets (400–1024px) may have layout issues.

### 16. Hardcoded schedule data
- All courses/tasks baked into JS (lines 1016–1180). No UI to edit.
- Limits reusability for other students or semesters.

---

## Quick Wins

| Fix | Effort | Impact |
|-----|--------|--------|
| Replace `new Function()` with `JSON.parse` | 5 min | High (security) |
| Switch password to `sessionStorage` | 5 min | High (security) |
| Add error logging to empty catch blocks | 10 min | High (reliability) |
| Extract magic strings to constants | 15 min | Medium (maintainability) |
| Add sync debouncing | 10 min | Medium (performance) |
| Add null checks before DOM queries | 10 min | Medium (stability) |

# Study Plan Hub — Feature Extension Plan

> **28 features** across 10 phases. Each phase is self-contained and builds on the previous. Estimated scope: large.

---

## Phase 0: Bug Fixes & Foundation (do first)

### 0A. Fix `removeLink` not wired in dispatch (#36)
- **File:** `js/init.js`
- **Problem:** `removeLink` is imported but never registered in `initDispatch` — clicking the ✕ on link chips does nothing
- **Fix:** Add `removeLink: ({ id, idx }) => removeLink(id, +idx)` to the dispatch map

### 0B. Fix migration key inconsistency (#37)
- **File:** `js/migration.js`
- **Problem:** `STATIC_KEYS` lists `reading-last-sync` but the app uses `reading-sync-ts`
- **Fix:** Update the migration key to `reading-sync-ts`

### 0C. Fix ideal vs actual semantics (#38)
- **Files:** `js/ideal.js`, `js/render/ideal.js`
- **Problem:** The compare view counts only `done` tasks, but `getIdealGap()` counts `done + skip` as "actualDone"
- **Fix:** Align both to count only `done` (skip ≠ done) and update the compare renderer

### 0D. Deep linking for review/ideal steps (#39)
- **Files:** `js/router.js`, `js/render/index.js`, `js/review.js`, `js/ideal.js`
- **Problem:** Review step and ideal mode are in-memory — refresh loses position
- **Fix:** Extend hash format to `#review/2`, `#ideal/compare`; parse sub-view in `currentSubView()`; restore state on hash change

---

## Phase 1: Quick Capture Inbox (#22)

### 1A. Data model
- **New key:** `{prefix}-inbox` — array of `{ id, text, createdAt, source? }`
- **State field:** `state.inbox`
- **Functions:** `addToInbox(text)`, `removeFromInbox(id)`, `moveInboxToTask(id, day, section)`, `moveInboxToDeadline(id)`, `clearInbox()`
- **File:** `js/inbox.js` (new)

### 1B. Floating capture button
- Always visible (bottom-right, above FAB when on schedule)
- Single text input → instant capture
- Keyboard shortcut: `n` for new capture

### 1C. Inbox triage view
- Accessible from home dashboard card + nav
- Each item has actions: → Task (pick day/section), → Deadline, → Scratchpad, ✕ Delete
- Badge count on nav item

### 1D. Integration
- Global search indexes inbox items
- Home dashboard card shows inbox count
- Daily planning ritual (Phase 3) starts by triaging inbox

---

## Phase 2: Habit Streaks (#5)

### 2A. Data model
- **New key:** `{prefix}-habits` — array of `{ id, name, icon, frequency: 'daily'|'weekdays'|'custom', customDays?: [], color }`
- **New key:** `{prefix}-habit-log` — `{ 'YYYY-MM-DD': { habitId: true } }`
- **File:** `js/habits.js` (new)

### 2B. Habit definition UI
- In Tools view → new "Habits" panel
- Add/edit/delete habits with name, icon (emoji picker), frequency, color
- Presets: Exercise, Reading, Water, Sleep 8h, Meditate, Stretch, French, Journal

### 2C. Daily check-in
- Home dashboard card: today's habits with toggle buttons
- Day view: habit checklist section at top (collapsible)
- Quick-check from any view via a floating habits pill

### 2D. Streak visualization
- Per-habit: current streak, best streak, completion calendar (mini grid)
- Stats view: habits panel with aggregate weekly/monthly completion %
- Weekly review: habit data integrated into Step 0 overview

---

## Phase 3: Daily Planning Ritual (#6)

### 3A. Morning flow (3-step wizard)
- **Step 1 — Triage:** Show inbox items → route to task/deadline/dismiss
- **Step 2 — Priorities:** Show today's tasks → drag to reorder, mark ★ must-do vs ○ nice-to-have
- **Step 3 — Intention:** One-line daily intention text field

### 3B. Data model
- **New key:** `{prefix}-daily-plans` — `{ 'YYYY-MM-DD': { intention, priorities: [taskId], mustDo: [taskId], plannedAt } }`
- **File:** `js/daily-plan.js` (new)

### 3C. Integration
- Auto-prompt on first visit of the day (dismissible)
- Home dashboard: "Plan your day" card if not planned yet; shows intention if planned
- Day view: ★ badge on must-do tasks, priority order option
- Weekly review: "You planned X/7 days" stat
- Global search: searches intentions

---

## Phase 4: Task Time Tracking (#1)

### 4A. Lightweight timer (not pomodoro)
- Per-task "tap to start" / "tap to stop" — no rounds, no breaks
- Floating mini-bar when tracking (reuse old pomo-bar positioning)
- Only one task tracked at a time

### 4B. Data model
- **New key:** `{prefix}-time-log` — `{ 'YYYY-MM-DD': { taskId: totalMinutes } }`
- **State fields:** `state.activeTimer: { taskId, startedAt }` (in-memory only)
- **File:** `js/time-tracking.js` (new)

### 4C. UI touchpoints
- Task action menu: "⏱ Track time" button
- Task context menu: same
- Day view: small elapsed badge on tasks with logged time today
- Home dashboard: "Xh Ym tracked today" stat

### 4D. Analytics integration
- Stats view: time-by-subject chart (replaces old heatmap slot)
- Weekly review: total tracked time, time per subject, time per day
- Subject streaks: incorporate time data

---

## Phase 5: Academic Features (#3, #9, #10)

### 5A. Grade tracker (#3)
- **New key:** `{prefix}-grades` — `{ subjectCat: [{ name, score, maxScore, weight, date, type: 'exam'|'hw'|'quiz'|'project' }] }`
- **File:** `js/grades.js` (new)
- **Renderer:** `js/render/grades.js` (new)
- Stats view: new "Grades" panel — per-subject grade list, weighted average, trend chart
- Home dashboard: GPA card with current weighted average
- Weekly review: grade changes this week

### 5B. Eisenhower matrix view (#9)
- **New route:** `#matrix` (or sub-view of schedule)
- Four quadrants: Urgent+Important, Not Urgent+Important, Urgent+Not Important, Neither
- Auto-classify: deadline within 3 days = urgent, category weight/estimate = importance
- Manual override: drag tasks between quadrants
- **File:** `js/render/matrix.js` (new)

### 5C. Lecture notes (#10)
- Extend task data: `item.notes` — multi-line text field (not just `hint`)
- Task detail panel: expandable notes area with basic Markdown rendering (bold, links, lists)
- Notes searchable via global search
- **Files:** modify `js/schedule.js` (item schema), `js/render/task-item.js` (detail panel), `js/ui/global-search.js` (index notes)

---

## Phase 6: Advanced Task Management (#18, #19, #20)

### 6A. Drag-and-drop reordering (#18)
- **Day view:** drag tasks within a section, drag between sections
- **Schedule editor:** drag to reorder sections, drag tasks between sections
- **Week view:** drag tasks between days
- Implementation: HTML5 Drag & Drop API with touch polyfill for mobile
- Save reordered schedule to storage after each drop
- **File:** `js/ui/drag-drop.js` (new)

### 6B. Task recurrence (#19)
- Task property: `recurrence: null | { type: 'daily'|'weekdays'|'weekly'|'custom', days?: [] }`
- **New key:** `{prefix}-recurring-tasks` — template array
- On week rollover (or daily check): auto-populate recurring tasks into schedule
- UI: task editor field "Repeat: None / Daily / Weekdays / Weekly / Custom"
- Recurring badge on task items
- **File:** `js/recurrence.js` (new)

### 6C. Task dependencies (#20)
- Task property: `blockedBy: [taskId]`
- Visual: dimmed task with "blocked by X" label; auto-unblocks when dependency completed
- Existing `STATUS_BLOCKED` used properly
- UI: in task detail/editor, "Depends on:" selector (pick from same day's tasks)
- **Files:** modify `js/schedule.js`, `js/render/task-item.js`, `js/state.js` (getStatus logic)

---

## Phase 7: Calendar & Planning Views (#21, #23, #25)

### 7A. Multi-week calendar view (#21)
- **New route:** `#calendar`
- Month grid: cells show completion % color + deadline dots + exam markers
- Click a day → navigate to that day in schedule view
- 4-week and month toggle
- **File:** `js/render/calendar.js` (new)

### 7B. Home dashboard customization (#23)
- **New key:** `{prefix}-dashboard-config` — `{ cards: [{ id, visible, order, size: 'sm'|'md'|'lg' }] }`
- Settings or dashboard edit mode: toggle cards, drag to reorder, resize
- Card catalog: all available widgets with preview
- **File:** `js/dashboard-config.js` (new), modify `js/render/home.js`

### 7C. Onboarding wizard (#25)
- First-run detection: no `{prefix}-custom-schedule` in storage
- 4-step flow:
  1. Welcome + name/semester
  2. Set wake time + class days
  3. Add first subjects (category quick-add)
  4. Add first few tasks → "You're ready!"
- Skip button on every step
- Creates initial custom schedule + categories
- **File:** `js/onboarding.js` (new), `js/render/onboarding.js` (new)

---

## Phase 8: Theming & UI Polish (#24)

### 8A. Accent color picker
- Settings panel: color wheel or preset swatches (cyan, purple, green, orange, pink, red)
- Store in `{prefix}-accent-color`
- Apply via CSS custom property `--accent` override on `:root`

### 8B. Preset themes
- Beyond dark/light: Nord, Solarized, Rosé Pine, Catppuccin, High Contrast
- Each theme = set of CSS variable overrides
- Theme picker in settings with live preview
- **New key:** `{prefix}-theme-preset`

### 8C. Background patterns (optional)
- Subtle dot grid, cross-hatch, or gradient options
- CSS-only (background-image patterns)

---

## Phase 9: Data & Sync (#29, #30, #40)

### 9A. Multi-device real-time sync improvements (#29)
- **Conflict resolution:** last-write-wins with timestamp comparison
- **Multi-tab:** `BroadcastChannel` API to sync state between tabs
- **Sync indicator:** persistent status dot in nav (green = synced, yellow = syncing, red = conflict)
- **Conflict UI:** when detected, show diff and let user pick "mine" or "theirs"
- **Files:** modify `js/sync.js`, new `js/sync-conflict.js`

### 9B. Cloud backup (#30)
- Auto-export full JSON snapshot weekly to Firebase Storage (or RTDB `/backups/`)
- Manual backup button in Data panel
- Restore from backup: list available backups, pick one, confirm
- **Keep last 8 backups** (auto-prune older)

### 9C. Offline conflict resolution (#40)
- Queue offline mutations in `{prefix}-offline-queue`
- On reconnect: replay queue with conflict detection
- Merge strategy: field-level last-write-wins with `updatedAt` timestamps
- **File:** `js/offline-queue.js` (new)

---

## Phase 10: Analytics & Intelligence (#31, #32, #33, #34, #35)

### 10A. Burnout detection (#31)
- Track weekly completion % in `history`
- If 3+ consecutive weeks declining OR completion drops below 40%: surface warning
- Home dashboard: alert card with suggestion ("Take a lighter day", "Drop lowest-priority task")
- Weekly review: burnout risk indicator

### 10B. Time-of-day patterns (#32)
- Log completion timestamp when task toggled done: `{prefix}-completion-times` — `{ taskId: 'HH:MM' }`
- After 2+ weeks of data: compute hourly completion distribution
- Stats view: "Your productive hours" chart (bar chart by hour)
- Suggestion engine: "You complete 70% of tasks before noon — schedule hard tasks in the morning"

### 10C. Subject difficulty rating (#33)
- Auto-computed from: skip rate, defer rate, completion rate, average time spent (if tracked)
- Per-category difficulty score (1–5 scale)
- Stats view: difficulty ranking table
- Schedule suggestions: "Physics is your hardest subject (4.2/5) — allow extra buffer time"

### 10D. Comparative analytics (#34)
- Compare current week to: last week, 4-week average, best week, same week last month
- Stats view: comparison card with delta arrows
- Home dashboard: "You're X% above/below your average" badge

### 10E. Goal setting & milestones (#35)
- **New key:** `{prefix}-goals` — `[{ id, type: 'weekly-pct'|'streak'|'subject'|'reading'|'habit'|'custom', target, current, deadline? }]`
- **File:** `js/goals.js` (new)
- Goals panel in Stats view: define goals, track progress, celebrate milestones
- Preset goals: "85%+ weekly", "Complete all FA tasks", "Read 10 books this semester"
- Home dashboard: top goal progress bar
- Weekly review: goal progress step (between subjects and reflection)

---

## Phase 11: Testing (#41)

### 11A. Expand unit tests
- Add tests for: `router.js`, `ideal.js`, `review.js`, `inbox.js`, `habits.js`, `grades.js`, `recurrence.js`, `goals.js`
- Test dispatch action handlers (mock render + showToast)
- Test data migration scenarios

### 11B. DOM/render tests
- Lightweight render tests: call renderer with mock context, assert HTML contains expected elements
- Test each view renderer: home, schedule, ideal, tools, stats, review, calendar, matrix

### 11C. Integration tests
- Full flow tests: add task → toggle done → verify progress → verify review data
- Sync round-trip: push → pull → verify state

---

## Dependency Graph

```
Phase 0 (bugs) ─────────────────────────────────────────────────── always first
    │
    ├── Phase 1 (inbox) ──── Phase 3 (daily planning) uses inbox triage
    │
    ├── Phase 2 (habits) ──── standalone, feeds into Phase 3 + review
    │
    ├── Phase 4 (time tracking) ──── Phase 10 (analytics) uses time data
    │
    ├── Phase 5 (academic) ──── standalone
    │     └── 5B (matrix) needs tasks to exist
    │
    ├── Phase 6 (task mgmt) ──── 6B (recurrence) needs schedule editor
    │     └── 6C (dependencies) needs status logic
    │
    ├── Phase 7 (views/UX) ──── 7C (onboarding) should be done last
    │
    ├── Phase 8 (theming) ──── standalone, purely visual
    │
    ├── Phase 9 (sync) ──── builds on existing Firebase
    │
    ├── Phase 10 (analytics) ──── needs Phase 4 for time data
    │     └── 10E (goals) needs Phase 2 for habit goals
    │
    └── Phase 11 (testing) ──── always last, covers all features
```

## Execution Order (recommended)

1. **Phase 0** — bugs (small, immediate, unblocks trust)
2. **Phase 1** — inbox (quick win, enables Phase 3)
3. **Phase 2** — habits (high value, standalone)
4. **Phase 3** — daily planning (uses inbox + habits)
5. **Phase 4** — time tracking (feeds analytics)
6. **Phase 8** — theming (visual polish, morale boost)
7. **Phase 5** — academic features (grades, matrix, notes)
8. **Phase 6** — task management (drag-drop, recurrence, deps)
9. **Phase 7** — calendar, dashboard config, onboarding
10. **Phase 10** — analytics & intelligence
11. **Phase 9** — sync improvements
12. **Phase 11** — testing

---

## New Files Summary

| File | Purpose |
|------|---------|
| `js/inbox.js` | Quick capture inbox state |
| `js/habits.js` | Habit definitions + daily log |
| `js/daily-plan.js` | Morning planning ritual state |
| `js/time-tracking.js` | Per-task time tracking |
| `js/grades.js` | Grade/assessment tracker |
| `js/recurrence.js` | Recurring task engine |
| `js/goals.js` | Goal setting & milestone tracking |
| `js/onboarding.js` | First-run wizard logic |
| `js/dashboard-config.js` | Home card customization |
| `js/sync-conflict.js` | Sync conflict resolution |
| `js/offline-queue.js` | Offline mutation queue |
| `js/ui/drag-drop.js` | Drag-and-drop engine |
| `js/render/calendar.js` | Month/4-week calendar view |
| `js/render/matrix.js` | Eisenhower matrix view |
| `js/render/grades.js` | Grade tracker renderer |
| `js/render/onboarding.js` | Onboarding wizard renderer |

## New Storage Keys

| Key | Content |
|-----|---------|
| `{p}-inbox` | Capture inbox items |
| `{p}-habits` | Habit definitions |
| `{p}-habit-log` | Daily habit completions |
| `{p}-daily-plans` | Morning plans + intentions |
| `{p}-time-log` | Per-task time data |
| `{p}-grades` | Assessment scores |
| `{p}-recurring-tasks` | Recurrence templates |
| `{p}-dashboard-config` | Home card layout |
| `{p}-goals` | Goal definitions + progress |
| `{p}-accent-color` | Custom accent color |
| `{p}-theme-preset` | Theme preset name |
| `{p}-completion-times` | Task completion timestamps |
| `{p}-offline-queue` | Pending offline mutations |

## New Routes

| Hash | View |
|------|------|
| `#calendar` | Multi-week calendar |
| `#matrix` | Eisenhower matrix |
| `#review/N` | Review wizard at step N |
| `#ideal/compare` | Ideal week compare mode |

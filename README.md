# stufdu — Study Plan App

A no-build vanilla JS PWA study planner with configurable schedules, categories, settings, local persistence, and optional Firebase cloud sync.

## Features

- **Weekly task tracking** — tasks organized by configurable days, sections, and tasks
- **Task states** — done, skip, in-progress, and blocked with undo support
- **Notes & deferral** — add notes to tasks, defer tasks to other days
- **Configurable schedule** — add/remove days, edit day metadata, add/remove/reorder sections and tasks, import/export JSON
- **Configurable categories** — add/edit/remove task categories, colors, labels, and default estimates
- **Settings panel** — edit timezone, semester labels, timer defaults, and API URLs without source changes
- **Weekly streak** — tracks completion percentage across weeks
- **Firebase sync** — optional real-time sync via Firebase Realtime Database
- **PWA** — installable with offline support via service worker
- **Dark/light mode** — warm yellowish light theme, dark default
- **Swipe navigation** — swipe between days on mobile
- **Export/import** — JSON data backup and restore
- **Storage migration** — automatic detection and migration when storage prefix changes
- **Focus timer & heatmap** — pomodoro timer with activity heatmap

## Setup

1. Open `index.html` in a browser. That's it — no build step needed.
2. For PWA install, serve from a web server (e.g. `npx serve .`).

## Firebase Sync (Optional)

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Email/Password** authentication
3. Create a **Realtime Database** with these rules:
   ```json
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "$uid === auth.uid",
           ".write": "$uid === auth.uid"
         }
       }
     }
   }
   ```
4. Copy your Firebase config from Project Settings > General > Your apps
5. In the app, open the **Sync** panel, paste the config, enter email/password, and connect

To skip manual setup, set `CONFIG.firebase` in `js/config.js` or save a config through the in-app Sync panel.

## Data Model

### localStorage Keys

All persistent keys use `CONFIG.storagePrefix` as a prefix. With the default prefix:

| Key | Contents |
|-----|----------|
| `sp26-w{N}` | Task states for ISO week N (`{ "mon-1": "done", ... }`) |
| `sp26-w{N}-notes` | Notes per task (`{ "mon-1": "some note" }`) |
| `sp26-w{N}-defer` | Deferred tasks (`{ "mon-1": "Friday" }`) |
| `sp26-w{N}-lock` | Day lock states (`{ "Monday": true }`) |
| `sp26-history` | Weekly completion percentages (`{ "sp26-w10": 85 }`) |
| `sp26-links` | Task links (`{ "mon-1": ["https://..."] }`) |
| `sp26-deadlines` | Deadline entries (`[{ name, date, cat }]`) |
| `sp26-meals` | Cached meal data by date |
| `sp26-reading-list` | Reading list entries |
| `sp26-sync-config` | Firebase config object |
| `sp26-theme` | `"dark"` or `"light"` |
| `sp26-custom-schedule` | User-edited schedule JSON |
| `sp26-day-config` | Active-day flags and display aliases |
| `sp26-categories` | Category registry overrides |
| `sp26-config` | Settings overrides |
| `sp26-scratch` | Scratchpad text |
| `sp26-pomo-log` | Focus timer session log |
| `sp26-fontscale` | Font scale preference |
| `sp26-timer-min` | Focus timer default minutes |

### Storage Prefix Migration

When `CONFIG.storagePrefix` changes (e.g. from `sp25` to `sp26`), the app automatically:
1. Detects old-prefix keys in localStorage on boot
2. Offers the user a confirmation dialog to copy data to the new prefix
3. Copies all known key types (static keys + week-based keys)
4. **Does not delete** old keys — they serve as a rollback safety net

Migration can also be triggered manually when changing the prefix in Settings.

### Firebase Schema

```
users/{uid}/study/
  sp26-w{N}/          # task states
  sp26-w{N}-notes/    # task notes
  sp26-w{N}-defer/    # deferred tasks
  history/            # weekly streaks
```

## Schedule Structure

The default schedule lives in `js/schedule.js`, and user edits are persisted to `sp26-custom-schedule`. Each day has:
- `wake` — wake-up time
- `leave` — time to leave (null for home days)
- `meta` — optional day note (e.g. "FA meeting day")
- `sections[]` — array of time blocks, each with `label` and `items[]`

Each item has:
- `id` — unique ID matching `{prefix}-{n}` pattern (e.g. `mon-1` or `researchday-1`)
- `text` — task description
- `hint` — optional helper text
- `cat` — category key managed by `CategoryRegistry`
- `est` — optional time estimate override (minutes)

## Category Schema

Categories are managed through `CategoryRegistry` in `js/categories.js`:
- `key` — unique slug (lowercase, alphanumeric + hyphens)
- `label` — short badge text shown on task items (e.g. "FA", "HW")
- `border` — accent/border color (hex)
- `bg` — background color (hex)
- `defaultEst` — default time estimate in minutes (0 = no estimate)

Built-in categories: `fa`, `homework`, `class`, `review`, `reading`, `reflect`, `fameeting`, `preview`, `project`

## Config Override Format

Settings are stored in `CONFIG.config` (localStorage key `sp26-config`). Settable fields:

| Field | Type | Description |
|-------|------|-------------|
| `appTitle` | string | App header title |
| `semester` | string | Semester display name |
| `headerTag` | string | Subtitle below title |
| `timezone` | string | IANA timezone (e.g. `Europe/Istanbul`) |
| `focusTimerDefault` | number | Default timer minutes |
| `toastDuration` | number | Toast notification duration (ms) |
| `swipeThreshold` | number | Swipe gesture threshold (px) |
| `mealApiUrl` | string | University meal API endpoint |
| `goodreadsRss` | string | Goodreads RSS feed URL |

## File Structure

```
index.html              — HTML shell + CSS
js/config.js            — centralized config and overrides
js/storage.js           — prefixed storage abstraction
js/categories.js        — CategoryRegistry
js/schedule.js          — default/custom schedule management
js/state.js             — state container and derived data
js/init.js              — app boot, event wiring, keyboard shortcuts
js/meals.js             — meal parsing, fetching, saving
js/data.js              — export/import/calendar/deadlines/notifications/maintenance
js/migration.js         — storage-prefix detection and migration
js/password.js          — password gate
js/reading.js           — Goodreads import/sync
js/sync.js              — Firebase real-time sync
js/render/
  index.js              — render orchestrator with batching
  context.js            — RenderContext builder (pure data assembly)
  header.js             — header controls renderer
  day-view.js           — day view renderer
  week-view.js          — week view renderer
  panels.js             — side panels renderer
  task-item.js          — individual task item renderer
  meals.js              — meal card renderer
  fab.js                — floating action button renderer
  scratchpad.js         — scratchpad renderer
js/ui/
  dispatch.js           — delegated event dispatcher
  toggle.js             — task/UI state toggle functions
  timer.js              — focus timer (pomodoro)
  theme.js              — dark/light theme management
  search.js             — search state management
  swipe.js              — swipe gesture handlers
  settings.js           — settings apply/reset handlers
  categories-editor.js  — category management handlers
sw.js                   — service worker cache
tests.html              — browser unit tests (136 tests)
```

## Testing

Open `tests.html` in a browser. Tests run against the real ES modules — any function drift is caught immediately.

The test suite covers:
- **Core logic**: ISO week calculation, HTML escaping, formatting, estimates, status, progress
- **Categories**: registry CRUD, color/label/estimate lookup
- **Schedule**: day/section/task creation, export/import, reset
- **Storage**: prefix isolation, key management
- **Migration**: prefix detection, key copying, non-destructive behavior
- **Meal parsing**: string parsing, text parsing with multiple date formats
- **Validation**: task ID patterns, status values, sanitization
- **Service worker**: ASSETS list completeness
- **Firebase sync**: documented stubs for manual verification

## Architecture

### Render Context Pattern

All renderers are **pure functions** that receive a `RenderContext` object built once per render cycle by `js/render/context.js`. This eliminates direct imports of global state/config/categories from render modules, improving testability and decoupling.

### Event Dispatch

UI interactions use a centralized dispatcher (`js/ui/dispatch.js`). DOM elements carry `data-action` attributes; the dispatcher routes clicks, input, change, keydown, focus, contextmenu, and touch events to registered handler functions. No `window.*` globals are used.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` `→` | Navigate days |
| `/` | Focus search |
| `?` | Toggle shortcut help |
| `f` | Toggle focus mode |
| `w` `d` | Switch to week/day view |
| `+` `-` | Toggle font size |
| `Esc` | Close: context menu → shortcuts → search → scratchpad → FAB → panels |

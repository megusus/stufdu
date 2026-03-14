# stufdu — Study Plan App

A single-page vanilla JS study planner for tracking weekly university tasks across 7 courses, with Firebase cloud sync.

## Features

- **Weekly task tracking** — tasks organized by day, section (morning/class/afternoon/evening)
- **Task states** — done, skip, in-progress with undo support
- **Notes & deferral** — add notes to tasks, defer tasks to other days
- **Weekly streak** — tracks completion percentage across weeks
- **Firebase sync** — optional real-time sync via Firebase Realtime Database
- **PWA** — installable with offline support via service worker
- **Dark/light mode** — warm yellowish light theme, dark default
- **Swipe navigation** — swipe between days on mobile
- **Export/import** — JSON data backup and restore

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

### Hardcoded Config

To skip manual setup, edit `HARDCODED_CONFIG` in `index.html`:

```js
const HARDCODED_CONFIG = {
  apiKey: "AIza...",
  authDomain: "my-app.firebaseapp.com",
  databaseURL: "https://my-app-default-rtdb.firebaseio.com",
  projectId: "my-app"
};
```

## Data Model

### localStorage Keys

| Key | Contents |
|-----|----------|
| `sp26-w{N}` | Task states for ISO week N (`{ "mon-1": "done", ... }`) |
| `sp26-w{N}-notes` | Notes per task (`{ "mon-1": "some note" }`) |
| `sp26-w{N}-defer` | Deferred tasks (`{ "mon-1": "Friday" }`) |
| `sp26-history` | Weekly completion percentages (`{ "sp26-w10": 85 }`) |
| `sp26-sync-config` | Firebase config object |
| `sp26-theme` | `"dark"` or `"light"` |

### Firebase Schema

```
users/{uid}/study/
  sp26-w{N}/          # task states
  sp26-w{N}-notes/    # task notes
  sp26-w{N}-defer/    # deferred tasks
  history/            # weekly streaks
```

## Schedule Structure

Tasks are defined in the `schedule` object. Each day has:
- `wake` — wake-up time
- `leave` — time to leave (null for home days)
- `meta` — optional day note (e.g. "FA meeting day")
- `sections[]` — array of time blocks, each with `label` and `items[]`

Each item has:
- `id` — unique ID matching `{day3}-{n}` pattern (e.g. `mon-1`)
- `text` — task description
- `hint` — optional helper text
- `cat` — category key (maps to colors in `CAT` object)

## File Structure

```
index.html  — entire application (HTML + CSS + JS)
sw.js       — service worker for offline caching
```

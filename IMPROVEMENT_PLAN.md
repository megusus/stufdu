# Study Plan — UI/UX Overhaul & Calendar Redesign

**Date:** 2026-04-12
**Scope:** Full visual overhaul, animation system redesign, calendar feature rebuild
**Approach:** Vanilla JS / CSS — no framework dependencies, no build step

---

## Table of Contents

1. [Design Philosophy & Aesthetic Direction](#1-design-philosophy--aesthetic-direction)
2. [Typography Overhaul](#2-typography-overhaul)
3. [Color System Redesign](#3-color-system-redesign)
4. [Spatial Composition & Layout](#4-spatial-composition--layout)
5. [Animation System Overhaul](#5-animation-system-overhaul)
6. [Component-Level UI Redesign](#6-component-level-ui-redesign)
7. [Calendar: Full Rebuild](#7-calendar-full-rebuild)
8. [Navigation & Routing](#8-navigation--routing)
9. [Dashboard & Home View](#9-dashboard--home-view)
10. [Stats & Analytics Views](#10-stats--analytics-views)
11. [Theme System Upgrade](#11-theme-system-upgrade)
12. [Accessibility Hardening](#12-accessibility-hardening)
13. [Mobile Experience](#13-mobile-experience)
14. [Performance & Polish](#14-performance--polish)
15. [Implementation Order](#15-implementation-order)

---

## 1. Design Philosophy & Aesthetic Direction

### Current State

The app uses JetBrains Mono + Source Serif 4, a functional dark palette (`#09090b` base), and a light warm theme. The aesthetic is *utilitarian-developer* — clean but generic. Inline styles are scattered throughout renderers (stats heatmap, calendar cells), CSS variables exist but are underused in JS-rendered HTML, and the 5400-line `legacy.css` carries dead weight. The overall impression: competent, but visually forgettable.

### Target Aesthetic: **Refined Academic**

Think: a premium leather-bound planner that opens to reveal a digital interface. The vibe sits between Notion's structured clarity and Things 3's tactile warmth, with a scholarly edge — not cold SaaS, not playful toy.

**Key Principles:**

- **Intentional density:** Study planners need information density. Don't hide data behind clicks — show it, but with visual hierarchy that guides the eye
- **Quiet confidence:** No gratuitous gradients, no glow-for-glow's-sake. Every visual flourish should communicate state or draw attention to what matters
- **Textural depth:** Subtle paper-grain noise in light mode, matte glass layering in dark mode. Flat is boring; skeuomorphic is dated — find the middle
- **Kinetic feedback:** Every interaction should feel physically responsive. Checkboxes should *snap*, views should *slide*, progress should *fill*

### What Must Change

| Area | Current | Target |
|------|---------|--------|
| Overall impression | Generic dev-tool | Premium academic planner |
| Visual density | Sparse with wasted space | Dense but scannable |
| Inline styles | ~200+ inline `style=` in JS | All styles via CSS classes |
| CSS architecture | 5400-line legacy monolith | Modular layers, zero dead CSS |
| Micro-interactions | Basic transitions, few | Rich, purposeful, choreographed |
| Calendar | Flat colored grid | Full interactive scheduling surface |

---

## 2. Typography Overhaul

### Current State

- `--font-ui`: JetBrains Mono (monospace — good for code, poor for UI labels)
- `--font-body` / `--font-reading`: Source Serif 4 (readable but unremarkable)
- Type scale: 9px–24px with hard pixel values
- No typographic rhythm or vertical spacing system

### Redesign

**Font Stack:**

```css
/* Display & headings — characterful, geometric */
--font-display: 'DM Serif Display', Georgia, serif;

/* UI labels, navigation, buttons — clean geometric sans */
--font-ui: 'General Sans', 'Satoshi', system-ui, sans-serif;

/* Body text, task descriptions, notes */
--font-body: 'Source Serif 4', Georgia, serif;  /* keep — it's good */

/* Code/data — monospace for numbers, IDs, time displays */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;  /* keep — scope it down */
```

> **Why General Sans / Satoshi:** These are distinctive geometric sans-serifs that avoid the Inter/Roboto/system-font trap. They have personality without being distracting. Both are available free via Fontshare.
>
> **Why DM Serif Display:** For view titles and calendar month headers — it has the scholarly gravity that matches the academic planner identity. Pairs beautifully with geometric sans.

**Type Scale — Fluid with `clamp()`:**

```css
--t-xs:   clamp(0.625rem, 0.55rem + 0.2vw, 0.7rem);    /* ~10-11px */
--t-sm:   clamp(0.725rem, 0.65rem + 0.25vw, 0.8rem);   /* ~11.5-13px */
--t-md:   clamp(0.8125rem, 0.75rem + 0.2vw, 0.9rem);   /* ~13-14.5px */
--t-lg:   clamp(1rem, 0.9rem + 0.3vw, 1.15rem);         /* ~16-18px */
--t-xl:   clamp(1.25rem, 1.1rem + 0.5vw, 1.5rem);       /* ~20-24px */
--t-2xl:  clamp(1.5rem, 1.3rem + 0.7vw, 1.875rem);      /* ~24-30px */
--t-3xl:  clamp(2rem, 1.6rem + 1.2vw, 2.5rem);           /* ~32-40px */
```

**Vertical Rhythm:**

- Establish a 4px baseline grid
- All margins/paddings snap to multiples of 4px
- Line heights: headings at 1.2, body at 1.6, UI labels at 1.3
- Paragraph spacing: 1em between blocks, 0.25em between tightly related elements

**Specific Changes:**

| Element | Current | New |
|---------|---------|-----|
| View titles (`h1`) | JetBrains Mono, emoji prefix | DM Serif Display, no emoji, larger |
| Nav labels | JetBrains Mono | General Sans, medium weight |
| Task text | Source Serif 4 | Source Serif 4 (keep) |
| Time estimates | Unstyled | JetBrains Mono, tabular-nums |
| Calendar dates | Default | JetBrains Mono tabular-nums for alignment |
| Buttons | Mixed | General Sans, semibold, letter-spacing 0.02em |
| Stats numbers | Inline styled | JetBrains Mono, larger, tabular-nums |

---

## 3. Color System Redesign

### Current State

The token system (`--bg`, `--surface`, `--accent`, etc.) is solid but underutilized — JS renderers bypass it with hardcoded hex values (`#00e676`, `#ffab00`, `#e94560` appear ~40 times in JS). The semantic colors work but lack depth (no gradient support, no contextual tints).

### Redesign

**Dark Theme — "Obsidian":**

```css
:root {
  /* Surface hierarchy — 5 levels for card stacking */
  --bg:        #0a0a0c;
  --surface-0: #101014;     /* base cards */
  --surface-1: #16161a;     /* elevated cards, sidebar */
  --surface-2: #1c1c22;     /* modals, dropdowns */
  --surface-3: #24242c;     /* hover states, active items */

  /* Text hierarchy */
  --text-primary:   #ebebef;
  --text-secondary: #9898a4;
  --text-tertiary:  #5c5c6a;
  --text-ghost:     #3a3a44;

  /* Accent — teal with depth */
  --accent:         #2dd4bf;
  --accent-hover:   #5eead4;
  --accent-dim:     rgba(45, 212, 191, 0.12);
  --accent-ring:    rgba(45, 212, 191, 0.30);
  --accent-gradient: linear-gradient(135deg, #2dd4bf, #06b6d4);

  /* Semantic — richer variants with gradients */
  --success:          #34d399;
  --success-dim:      rgba(52, 211, 153, 0.10);
  --success-gradient: linear-gradient(135deg, #34d399, #6ee7b7);

  --warning:          #fbbf24;
  --warning-dim:      rgba(251, 191, 36, 0.10);
  --warning-gradient: linear-gradient(135deg, #fbbf24, #fcd34d);

  --danger:           #f87171;
  --danger-dim:       rgba(248, 113, 113, 0.10);
  --danger-gradient:  linear-gradient(135deg, #f87171, #fca5a5);

  /* Category palette — 8 distinct hues for task categories */
  --cat-1: #818cf8;  /* indigo — math/theory */
  --cat-2: #fb923c;  /* orange — reading */
  --cat-3: #34d399;  /* emerald — homework */
  --cat-4: #f472b6;  /* pink — projects */
  --cat-5: #38bdf8;  /* sky — lectures */
  --cat-6: #a78bfa;  /* violet — review */
  --cat-7: #fbbf24;  /* amber — routine */
  --cat-8: #4ade80;  /* green — wellness */

  /* Surfaces */
  --glass-bg:     rgba(16, 16, 20, 0.72);
  --glass-border: rgba(255, 255, 255, 0.06);
  --glass-blur:   blur(20px) saturate(180%);
  --noise-opacity: 0.03;
}
```

**Light Theme — "Parchment":**

```css
[data-theme="light"] {
  --bg:        #f7f4ee;
  --surface-0: #efebe3;
  --surface-1: #e8e2d8;
  --surface-2: #dfd8ca;
  --surface-3: #d4ccbc;

  --text-primary:   #1c1917;
  --text-secondary: #57534e;
  --text-tertiary:  #a8a29e;
  --text-ghost:     #d6d3d1;

  --accent:          #0d9488;
  --accent-hover:    #0f766e;
  --accent-dim:      rgba(13, 148, 136, 0.08);
  --accent-gradient: linear-gradient(135deg, #0d9488, #14b8a6);

  --noise-opacity: 0.04;  /* paper grain texture */
}
```

**Noise/Texture Overlay:**

```css
.app::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: var(--noise-opacity);
  background-image: url("data:image/svg+xml,..."); /* subtle noise SVG */
  mix-blend-mode: overlay;
}
```

**Migration Task:** Grep all JS files for hardcoded color values (`#00e676`, `#00d2ff`, `#ffab00`, `#e94560`, `#333`, etc.) and replace with CSS class references. The calendar, stats heatmap, and progress bars are the worst offenders.

---

## 4. Spatial Composition & Layout

### Current State

- Sidebar + main content + bottom tabs (mobile)
- Everything is box-in-box with consistent padding
- No asymmetry, no visual hierarchy beyond font size
- Calendar is a flat uniform grid — every cell identical weight

### Redesign

**Layout Grid:**

```css
.app-layout {
  display: grid;
  grid-template-columns: var(--sidebar-width, 240px) 1fr;
  grid-template-rows: auto 1fr;
  min-height: 100dvh;
}

/* Sidebar — sticky, full height, subtle left border accent */
.sidebar {
  position: sticky;
  top: 0;
  height: 100dvh;
  border-right: 1px solid var(--glass-border);
  background: var(--surface-1);
  backdrop-filter: var(--glass-blur);
}
```

**Content Area — Asymmetric Zones:**

Instead of one monolithic scroll area, structure views into *focal zones*:

```
┌──────────────────────────────────────────────────┐
│  [Hero Zone — view title, key metric, today CTA] │  ← fixed, compact
├──────────────────────────────────────────────────┤
│  [Primary Zone]           │  [Context Zone]       │  ← scrollable
│  Main content (schedule,  │  Side panel: deadlines│
│  calendar grid, stats)    │  quick stats, notes   │
│                           │                       │
└──────────────────────────────────────────────────┘
```

For calendar: the Context Zone shows a day detail panel when a cell is selected — no more full page navigation for peeking at one day.

**Card Elevation System:**

```css
.card-0 { background: var(--surface-0); box-shadow: none; }
.card-1 { background: var(--surface-1); box-shadow: var(--sh-sm); }
.card-2 { background: var(--surface-2); box-shadow: var(--sh-md); }
.card-float {
  background: var(--surface-2);
  box-shadow: var(--sh-lg);
  border: 1px solid var(--glass-border);
}
```

**Spacing Scale — Harmonized:**

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  24px;
--space-6:  32px;
--space-7:  48px;
--space-8:  64px;
--space-9:  96px;
```

---

## 5. Animation System Overhaul

### Current State

The animation layer is thin:
- `animations.css`: only 2 keyframes (skeleton-sweep, skeleton-fade) + prefers-reduced-motion media query (27 lines total)
- `legacy.css`: ~30 scattered `@keyframes` (taskPop, checkPop, bounceCheck, shakeX, completionGlow, confettiSpray, shimmer, etc.)
- Most transitions are identical `transition: all 0.15s` — generic, no easing variety, no orchestration
- View transitions use the basic View Transitions API cross-fade
- No stagger animations, no scroll-triggered effects, no physics-based curves
- Celebration confetti uses basic CSS keyframes with no variation

### Target: Choreographed Motion Language

Every animation should serve one of three purposes:
1. **Feedback** — confirm an action happened (check, skip, complete)
2. **Orientation** — show spatial relationships (view transitions, panel opens)
3. **Delight** — reward progress (celebrations, streaks, achievements)

### 5.1 Easing System

Replace the universal `ease` / `ease-out` with purpose-built curves:

```css
:root {
  /* Snappy — for UI feedback (toggles, checks, buttons) */
  --ease-snap:    cubic-bezier(0.2, 0, 0, 1);

  /* Smooth — for layout shifts (panels, sidebars, drawers) */
  --ease-smooth:  cubic-bezier(0.4, 0, 0.2, 1);

  /* Bounce — for celebratory/playful moments (badges, streaks) */
  --ease-bounce:  cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Spring — for physical-feeling motion (drag, snap-back) */
  --ease-spring:  cubic-bezier(0.175, 0.885, 0.32, 1.275);

  /* Dramatic — for view-level transitions */
  --ease-dramatic: cubic-bezier(0.16, 1, 0.3, 1);

  /* Duration scale */
  --dur-instant:  80ms;
  --dur-fast:     150ms;
  --dur-normal:   250ms;
  --dur-slow:     400ms;
  --dur-dramatic: 600ms;
}
```

### 5.2 View Transitions — Directional & Layered

Currently: basic cross-fade via View Transitions API.

**Redesign — directional slide with parallax depth:**

```css
/* Forward navigation (deeper into content) */
::view-transition-old(main-content) {
  animation: var(--dur-normal) var(--ease-dramatic) slide-out-left;
  /* Old content slides left and slightly scales down */
}
::view-transition-new(main-content) {
  animation: var(--dur-normal) var(--ease-dramatic) slide-in-right;
  /* New content slides in from right */
}

@keyframes slide-out-left {
  to {
    transform: translateX(-8%) scale(0.97);
    opacity: 0;
    filter: blur(2px);
  }
}
@keyframes slide-in-right {
  from {
    transform: translateX(12%);
    opacity: 0;
    filter: blur(2px);
  }
}

/* Backward navigation — reverse direction */
/* Going "back" slides content right → left */

/* Vertical transitions for modals/overlays */
::view-transition-old(modal) {
  animation: var(--dur-normal) var(--ease-snap) fade-scale-out;
}
::view-transition-new(modal) {
  animation: var(--dur-slow) var(--ease-spring) fade-scale-in;
}
```

The router already tracks navigation direction (`_lastDirection`) — wire this into `view-transition-name` classes.

### 5.3 Task Interactions — Tactile Feedback

**Checkbox toggle:**

```css
/* Replace current checkPop with multi-stage animation */
@keyframes check-complete {
  0%   { transform: scale(1); }
  20%  { transform: scale(0.85); }              /* Press in */
  50%  { transform: scale(1.15); }              /* Pop out */
  70%  { transform: scale(0.95); }              /* Settle */
  100% { transform: scale(1); }
}

/* The checkmark itself draws in with SVG stroke animation */
@keyframes check-draw {
  from { stroke-dashoffset: 24; }
  to   { stroke-dashoffset: 0; }
}

/* Completion glow — radiates from checkbox outward */
@keyframes completion-ring {
  from {
    box-shadow: 0 0 0 0 var(--success);
    opacity: 1;
  }
  to {
    box-shadow: 0 0 0 16px var(--success);
    opacity: 0;
  }
}
```

**Task row — done state:**

```css
.item.just-completed {
  animation: task-done var(--dur-slow) var(--ease-snap);
}

@keyframes task-done {
  0%   { background: transparent; }
  30%  { background: var(--success-dim); transform: translateX(4px); }
  100% { background: transparent; transform: translateX(0); }
}

/* The task text fades to muted with a strikethrough that draws left-to-right */
.item.done .item-text {
  background: linear-gradient(90deg, var(--text-tertiary) 50%, transparent 50%);
  background-size: 200% 2px;
  background-position: right bottom;
  background-repeat: no-repeat;
  transition: background-position var(--dur-slow) var(--ease-smooth),
              color var(--dur-normal) var(--ease-smooth);
}
.item.done .item-text {
  background-position: left bottom;
  color: var(--text-tertiary);
}
```

**Skip — shake + fade:**

```css
@keyframes task-skip {
  0%, 100% { transform: translateX(0); }
  15%      { transform: translateX(-6px); }
  30%      { transform: translateX(5px); }
  45%      { transform: translateX(-3px); }
  60%      { transform: translateX(2px); }
}
.item.just-skipped {
  animation: task-skip var(--dur-slow) var(--ease-snap);
}
```

### 5.4 Stagger Animations — Orchestrated Entry

Currently: all items appear at once or with basic `sectionAppear`.

**Redesign — staggered cascade:**

```css
/* Section items stagger on view entry */
.item {
  opacity: 0;
  transform: translateY(8px);
  animation: item-enter var(--dur-normal) var(--ease-dramatic) forwards;
}

@keyframes item-enter {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Stagger via CSS custom property set by JS renderer */
.item:nth-child(1)  { animation-delay: 0ms; }
.item:nth-child(2)  { animation-delay: 40ms; }
.item:nth-child(3)  { animation-delay: 80ms; }
.item:nth-child(4)  { animation-delay: 120ms; }
.item:nth-child(5)  { animation-delay: 160ms; }
.item:nth-child(6)  { animation-delay: 200ms; }
.item:nth-child(7)  { animation-delay: 240ms; }
.item:nth-child(8)  { animation-delay: 280ms; }
.item:nth-child(9)  { animation-delay: 320ms; }
.item:nth-child(10) { animation-delay: 360ms; }
/* Cap at 360ms — anything beyond enters at 360ms */
.item:nth-child(n+11) { animation-delay: 360ms; }
```

**Calendar cells — wave reveal on view load:**

```css
/* Calendar cells ripple outward from today */
.cal-cell {
  opacity: 0;
  transform: scale(0.9);
  animation: cell-pop var(--dur-normal) var(--ease-spring) forwards;
  /* Delay set via inline CSS variable from JS: style="--cell-i: N" */
  animation-delay: calc(var(--cell-i, 0) * 25ms);
}

@keyframes cell-pop {
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

### 5.5 Progress Bar Animations

Currently: `transition: width 0.5s` with a shimmer overlay.

**Redesign — liquid fill with momentum:**

```css
.progress-fill {
  transition: width var(--dur-slow) var(--ease-spring);
  position: relative;
  overflow: hidden;
}

/* Liquid edge effect — the leading edge of the bar has a meniscus */
.progress-fill::after {
  content: '';
  position: absolute;
  right: -6px;
  top: 0;
  bottom: 0;
  width: 12px;
  background: inherit;
  filter: blur(4px);
  opacity: 0.6;
  border-radius: 50%;
  animation: meniscus-pulse 2s ease-in-out infinite;
}

@keyframes meniscus-pulse {
  0%, 100% { transform: scaleX(1); opacity: 0.4; }
  50%      { transform: scaleX(1.3); opacity: 0.7; }
}

/* When progress hits 100%, burst effect */
.progress-fill.complete::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: complete-flash var(--dur-dramatic) var(--ease-smooth) forwards;
}

@keyframes complete-flash {
  from { transform: translateX(-100%); }
  to   { transform: translateX(100%); }
}
```

### 5.6 Celebration System — Redesigned

Currently: basic CSS confetti with fixed particle count.

**Redesign — tiered celebration based on achievement magnitude:**

```
Tier 1 — Single task done:     Checkbox ring pulse + brief row highlight
Tier 2 — Section cleared:      Sparkle sweep across section + subtle screen flash
Tier 3 — Day 100%:             Confetti burst from progress bar + celebratory banner
Tier 4 — Week streak/badge:    Full-screen confetti rain + floating badge animation
```

**Confetti — JS-driven canvas overlay (not CSS):**

Replace CSS `@keyframes confettiSpray` with a lightweight canvas-based confetti system:

```javascript
// Concept: ~40 particles, physics-based (gravity + wind), 3 shapes (rect, circle, triangle)
// Particles use category colors from --cat-1 through --cat-8
// Duration: 2.5s, then canvas is removed
// Trigger: called from celebration handler, not CSS class
```

This allows:
- Variable particle count per tier
- Physics (gravity, air resistance, rotation)
- Shapes and colors that match the app's palette
- Performance control (requestAnimationFrame with auto-cleanup)

### 5.7 Scroll-Triggered Animations

New capability — elements animate as they enter the viewport:

```javascript
// Use IntersectionObserver for scroll-triggered reveals
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

// Observe all .animate-on-scroll elements after render
document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
```

```css
.animate-on-scroll {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity var(--dur-slow) var(--ease-dramatic),
              transform var(--dur-slow) var(--ease-dramatic);
}
.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}
```

Apply to: stats cards, dashboard cards, calendar legend, analytics panels.

### 5.8 Hover & Active Micro-Interactions

Currently: `transition: all 0.15s` on most interactive elements — no personality.

**Redesign:**

```css
/* Buttons — press feedback */
.btn {
  transition: transform var(--dur-instant) var(--ease-snap),
              background var(--dur-fast) var(--ease-smooth),
              box-shadow var(--dur-fast) var(--ease-smooth);
}
.btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--sh-sm);
}
.btn:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: none;
  transition-duration: var(--dur-instant);
}

/* Cards — subtle lift */
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--sh-md);
  transition: transform var(--dur-normal) var(--ease-smooth),
              box-shadow var(--dur-normal) var(--ease-smooth);
}

/* Nav links — underline draw */
.sidebar-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 16px;
  right: 16px;
  height: 2px;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--dur-normal) var(--ease-dramatic);
}
.sidebar-link:hover::after,
.sidebar-link.active::after {
  transform: scaleX(1);
}

/* Calendar cells — glow on hover */
.cal-cell:hover {
  background: var(--surface-3);
  box-shadow: 0 0 0 1px var(--accent-ring);
  transform: scale(1.03);
  z-index: 2;
  transition: all var(--dur-fast) var(--ease-snap);
}

/* Task items — border accent intensifies on hover */
.item:hover {
  background: var(--surface-2);
  border-left-width: 4px;
  transition: background var(--dur-fast) var(--ease-smooth),
              border-left-width var(--dur-instant) var(--ease-snap);
}
```

### 5.9 Prefers-Reduced-Motion

Expand the current reduced-motion handling:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.1ms !important;
    scroll-behavior: auto !important;
  }

  /* Allow opacity transitions only — they're not disorienting */
  .item, .card, .cal-cell, .animate-on-scroll {
    transition: opacity var(--dur-fast) linear !important;
    transform: none !important;
  }

  /* Disable confetti canvas entirely */
  .confetti-canvas { display: none !important; }

  /* Disable view transition animations */
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

---

## 6. Component-Level UI Redesign

### 6.1 Task Items (`js/render/task-item.js`)

**Current:** `div.item` with inline `style="border-left-color:..."`, text-character checkboxes (✓, ✕, ▶, ⛔), flat layout.

**Redesign:**

```
┌─ 4px category bar (full height, rounded left edge)
│  ┌──────────────────────────────────────────────────────┐
│  │  [SVG checkbox]  Task text                    [45m]  │
│  │                  Hint text in muted color            │
│  │                  [Category pill]  [Deadline badge]   │
│  │                  ↳ Note preview (1 line, truncated)  │
│  └──────────────────────────────────────────────────────┘
```

Changes:
- **SVG checkboxes** instead of text characters — proper circle → checkmark draw animation
- **Category pill** below text instead of relying solely on border color (border color stays as accent)
- **Time estimate** right-aligned in `font-mono`, visually distinct
- **Note preview** shown as a subtle one-liner when a task has notes (currently hidden behind action menu)
- **Blocked state** shows a lock icon overlay on checkbox instead of text ⛔
- **Progress state** shows a partial-fill ring on the checkbox SVG
- **Hover state** reveals quick-action icons (skip, note, defer) inline without opening a menu

### 6.2 Section Headers

**Current:** Simple text with section label, item count.

**Redesign:**
- Time block range displayed prominently: `09:00 — 11:30`
- Section progress as inline micro-bar next to the label
- Collapse/expand chevron with rotation animation
- Section completion triggers a subtle shimmer across the header

### 6.3 Buttons & Controls

**Current:** `.view-btn` with basic active state toggle.

**Redesign:**
- Segmented control pattern for mode toggles (4-week/month, day/week)
- Active state uses `--accent-gradient` fill with subtle shadow
- Pill shape (`border-radius: var(--r-pill)`) for primary actions
- Ghost variant (transparent bg, accent border) for secondary actions
- Icon-only buttons get a tooltip on hover (CSS-only with `::after` pseudo-element)

### 6.4 Cards (Dashboard, Analytics)

**Current:** Inline-styled `div` blocks with no consistent card component.

**Redesign:**
- Consistent `.card` base class with 3 elevation levels
- Cards have a subtle top-edge accent stripe (2px, category or accent colored)
- Glass morphism variant for overlay cards: `backdrop-filter: blur(20px)`
- Card headers use `--font-ui` semibold, card bodies use `--font-body`
- Analytics cards get a subtle grid-line background pattern

### 6.5 Modals & Overlays

**Current:** `.action-sheet` with `sheet-up` animation.

**Redesign:**
- Backdrop uses `backdrop-filter: blur(8px)` + dark overlay
- Modal enters with scale(0.95) → scale(1) + opacity fade (spring easing)
- Close triggers reverse animation before DOM removal
- Action sheets on mobile slide up with over-scroll rubber-band physics
- Focus trap (already exists) + `Escape` key handling

### 6.6 Toasts / Notifications

**Current:** Bottom-positioned toast with `toastIn` bounce.

**Redesign:**
- Stack multiple toasts (newest on top, older ones compress)
- Color-coded left stripe: success (green), warning (amber), error (red), info (teal)
- Progress bar at bottom for auto-dismiss timing
- Swipe-to-dismiss on mobile
- Exit animation: slide right + fade

### 6.7 Progress Bars

**Current:** Two progress bars in header (weekly/daily), inline-styled widths.

**Redesign:**
- Rounded pill shape with `overflow: hidden`
- Fill uses `--accent-gradient` (or semantic color gradient based on %)
- Percentage label inside the bar when width allows, outside when narrow
- Subtle inner shadow on the track for depth
- Fill animation on load with spring easing
- 100% state: gradient shifts to success green + brief shimmer flash

---

## 7. Calendar: Full Rebuild

This is the centerpiece of the overhaul. The current calendar (`js/render/calendar.js`, 153 lines) is a minimal grid with colored cells — functional but far below the app's potential.

### 7.1 Current Problems

1. **Data poverty:** Past days show only week-level historical averages, not actual per-day data — every day in a past week shows the same percentage
2. **No interaction depth:** Clicking a cell navigates away entirely (full view switch to that day's schedule)
3. **No future planning:** Future days are empty — no visibility into upcoming workload
4. **Flat visual hierarchy:** Every cell is identical weight — today doesn't stand out enough
5. **No deadline detail:** Deadline dots exist but show no useful info without hovering
6. **Two modes only:** 4-week and month — no week zoom, no year overview
7. **No time dimension:** No way to see the *shape* of a day (when study sessions are, how long)
8. **All inline colors:** Hardcoded `#00e676` etc. instead of CSS variables

### 7.2 New Calendar Architecture

**Three tiers of zoom:**

```
Year Overview → Month View → Week Detail
     ↑               ↑            ↑
  heatmap grid    enhanced grid   timeline
  quick nav       day cells       hourly blocks
```

**Data Model Enhancement — Per-Day History:**

Currently history is stored per-week (`w15: 85`). Add per-day storage:

```javascript
// New: store daily snapshots alongside weekly
// history: { "w15": 85, "2026-04-10": { pct: 75, done: 6, total: 8, mins: 180 } }
// This enables actual per-day colors in the calendar grid
```

Store daily snapshots at end-of-day (or on last task toggle of the day). Include: `pct`, `done` count, `total` count, `mins` tracked. This is the single most impactful data change for the calendar.

### 7.3 Month View — Redesigned Grid

```
┌─────────────────────────────────────────────────────────────────────┐
│  ◀  April 2026  ▶                              [Year] [Month] [Week]│
├─────────────────────────────────────────────────────────────────────┤
│   Mon       Tue       Wed       Thu       Fri       Sat      Sun   │
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───┐│
│ │  30   │ │  31   │ │   1   │ │   2   │ │   3   │ │   4   │ │ 5 ││
│ │ ░░░░░ │ │ █████ │ │ ████░ │ │ ███░░ │ │ █░░░░ │ │       │ │   ││
│ │       │ │  ✓    │ │  75%  │ │  60%  │ │  20%  │ │  off  │ │off││
│ │ ● HW  │ │       │ │       │ │ ●● DL │ │       │ │       │ │   ││
│ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───┘│
│                                                                     │
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───┐│
│ │   6   │ │   7   │ │   8   │ │   9   │ │  10   │ │  11   │ │12 ││
│ │       │ │       │ │       │ │       │ │       │ │       │ │   ││
│ │ today │ │ 8 tasks│ │6 tasks│ │5 tasks│ │       │ │       │ │   ││
│ │ ▓▓▓▓░ │ │       │ │  ● DL │ │       │ │       │ │       │ │   ││
│ │  62%  │ │       │ │       │ │       │ │       │ │       │ │   ││
│ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───┘│
│                          ...                                        │
├─────────────────────────────────────────────────────────────────────┤
│  Legend: ● Deadline  ✓ Complete  ▓ Progress                         │
└─────────────────────────────────────────────────────────────────────┘
```

**Cell Content (enriched):**

| Condition | Cell Shows |
|-----------|-----------|
| Past day (with data) | Progress bar fill, percentage, completion checkmark if 100% |
| Past day (no data) | Subtle "—" or blank (schedule-less day) |
| Today | Highlighted border ring (accent glow), live progress, task count remaining |
| Future day (this week) | Template task count, upcoming deadlines |
| Future day (next weeks) | Deadline indicators, workload estimate from schedule template |
| Deadline day | Colored dot(s) with category color, tooltip with deadline name |
| No-schedule day (Sat/Sun) | Dimmed, smaller, "off" label if no schedule defined |

**Today Cell — Special Treatment:**

```css
.cal-cell.today {
  background: var(--accent-dim);
  border: 2px solid var(--accent);
  box-shadow: 0 0 20px var(--accent-ring), inset 0 0 20px var(--accent-dim);
  position: relative;
  z-index: 2;
}

/* Subtle breathing glow */
.cal-cell.today::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  border: 1px solid var(--accent);
  opacity: 0.3;
  animation: today-breathe 3s ease-in-out infinite;
}

@keyframes today-breathe {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(1.02); }
}
```

### 7.4 Week Detail View — Timeline

A new view mode: clicking a week row (or zooming in) shows a detailed timeline:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Week 15  •  April 6 — 12                              [◀] [▶]     │
├────────┬────────────────────────────────────────────────────────────┤
│        │  08    09    10    11    12    13    14    15    16    17   │
│  Mon   │  ████████████████  ░░░░░░░░░░            ████████████      │
│        │  FA Deep Work      Break        HW + Reading               │
│  Tue   │        ████████████████████████████                        │
│        │        Lecture + Lab session                                │
│  Wed   │  ████████████            ████████████████████████████      │
│        │  Analysis           FA Exercises + Review                   │
│  Thu   │                          ████████████████                  │
│        │                          Physics Lab                       │
│  Fri   │  ████████████████████████████████████                      │
│        │  Review + Flashcards + Weekly Review                       │
│  Sat   │                                                            │
│  Sun   │                                                            │
├────────┴────────────────────────────────────────────────────────────┤
│  Weekly totals: 32 tasks  •  ~18h estimated  •  78% complete        │
└─────────────────────────────────────────────────────────────────────┘
```

This visualizes the *shape* of the study week — when study blocks happen, how dense they are, where the gaps are. Study sessions are colored by category.

**Implementation:**
- Parse `wake` and `leave` times from schedule data to determine the active window
- Map sections to time blocks using `est` (estimated minutes) for width
- Each block is a `div` positioned with `left: calc(...)` based on start time
- Blocks use category colors (`--cat-N`)
- Completed tasks show solid fill; pending shows striped pattern; skipped shows dimmed

### 7.5 Year Overview — Contribution Heatmap

Currently in stats view only. Move a compact version into the calendar as its zoomed-out mode:

```
┌────────────────────────────────────────────────────────────────┐
│  2026                                                          │
│  Jan  ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪                       │
│  Feb  ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪                          │
│  Mar  ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪                       │
│  Apr  ▪▪▪▪▪▪▪▪▪▪▪▪░░░░░░░░░░░░░░░░░░                         │
│  ...                                                           │
│  Each ▪ = one day, color = completion %                        │
│  Click a month → zoom to that month view                       │
└────────────────────────────────────────────────────────────────┘
```

### 7.6 Day Detail Side Panel

**The key UX improvement:** Clicking a calendar cell opens a *side panel* instead of navigating away.

```
┌─────────────────────────────────┬──────────────────────────┐
│                                 │  ← April 10, Thursday    │
│   [  Calendar Month Grid  ]    │                          │
│                                 │  Progress: ████████░ 75% │
│                                 │                          │
│       clicked cell: Apr 10      │  ── Before class ──      │
│              ↓                  │  ✓ Functional Analysis   │
│       highlighted with ring     │  ✓ Review notes          │
│                                 │  ○ Problem set           │
│                                 │                          │
│                                 │  ── After class ──       │
│                                 │  ✓ Lab writeup           │
│                                 │  ○ Reading ch. 5-6       │
│                                 │  ○ Flashcard review      │
│                                 │                          │
│                                 │  Deadlines:              │
│                                 │  ● HW 3 (2 days left)   │
│                                 │                          │
│                                 │  [Open full day →]       │
└─────────────────────────────────┴──────────────────────────┘
```

**Implementation:**
- Panel slides in from the right (`transform: translateX(100%)` → `translateX(0)`)
- Shows: day name, date, progress bar, task list (read-only summary), deadlines for that day
- "Open full day" button navigates to the schedule view for that day
- Panel closes on: click outside, press Escape, click another cell (which opens new detail)
- On mobile: panel slides up as a bottom sheet instead of side panel

### 7.7 Calendar Deadline Improvements

**Current:** Up to 3 anonymous dots per day.

**Redesign:**
- Deadline dots use category color (not generic dot color)
- Hover on a deadline dot → tooltip with: name, category, days remaining
- Deadline count badge if >3 deadlines on a day
- Days with deadlines get a subtle top-edge stripe in the deadline's category color
- Deadlines within 2 days get a pulsing dot animation
- Overdue deadlines (past date, not marked done) get a danger-colored indicator

### 7.8 Calendar Navigation

**Current:** No month/week navigation — only current 4 weeks or current month.

**Redesign:**
- **Month nav:** `◀ April 2026 ▶` header with prev/next buttons
- **Keyboard nav:** Arrow keys move between cells, Enter opens day detail
- **Swipe nav:** On mobile, swipe left/right to change months
- **Today button:** "Today" pill button to jump back to current date
- **Zoom gestures:** Pinch-to-zoom on mobile could switch between year/month/week views

### 7.9 Calendar + Deadlines Integration

Add the ability to manage deadlines directly from the calendar:

- **Click empty future day → "Add deadline" quick action**
- **Drag a deadline dot to a different day → reschedule** (stretch goal)
- **Deadline detail popup:** Click a deadline dot → shows name, category, related tasks, option to mark complete or edit

### 7.10 iCal Export Enhancement

The existing `js/ical.js` should be wired into the calendar UI:

- "Export" button in calendar header → generates `.ics` file for visible date range
- Includes: study blocks as events, deadlines as all-day events with alarms
- Category colors map to iCal event categories

---

## 8. Navigation & Routing

### Current State

Sidebar with all 13 views listed, bottom tabs for mobile with pin/unpin customization. Hash-based routing. Navigation is functional but flat — no grouping, no visual hierarchy.

### Redesign

**Grouped Navigation:**

```
PLAN
  📋 Schedule
  📅 Calendar
  🎯 Matrix
  📥 Inbox

TRACK
  📊 Stats
  🏆 Habits
  📝 Grades
  🎓 GPA

STUDY
  🃏 Flashcards
  📖 Review
  ⏱️ Tools

SETTINGS (footer)
  ⚙ Customize
  🎨 Theme
```

**Sidebar Polish:**
- Active item: accent-colored left edge bar (3px, animated slide) instead of background fill
- Hover: subtle background tint
- Group headers: uppercase `--font-ui` at `--t-xs`, letter-spacing 0.08em, `--text-tertiary`
- Collapse groups to icons only → `[|]` toggle button at the top
- Badge counts (inbox, flashcards due) use small pill badges, not text

**Mobile Bottom Tabs:**
- Max 5 visible tabs (4 pinned + "More")
- Active tab has a floating indicator dot above the icon (animates between tabs)
- Long-press a tab to reorder (already exists — add visual drag feedback)

**Transition Between Views:**
- Track navigation direction (forward/backward/lateral)
- Forward: content slides left
- Backward: content slides right
- Same-level lateral (e.g., switching days): cross-fade only
- These use the View Transitions API with custom `::view-transition` animations from section 5.2

---

## 9. Dashboard & Home View

### Current State

The home view (`js/render/home.js`) has a briefing card, progress cards, reading list, goals, habits, deadlines, and scratchpad. Cards are configurable (show/hide/reorder via dashboard config). It's information-rich but visually uniform.

### Redesign

**Hero Zone (fixed top):**

```
┌──────────────────────────────────────────────────────────────────┐
│  Good Morning                                         Thu Apr 12 │
│                                                                  │
│  ⛅ Moderate day  •  6 tasks  •  ~3h 20m               ███▓░ 62% │
│                                                                  │
│  ⚡ Next: Problem Set 4 — Functional Analysis (45m)     [Start]  │
└──────────────────────────────────────────────────────────────────┘
```

- Time-of-day gradient background (warm amber for morning, cool blue for evening — CSS `linear-gradient` keyed to hour)
- The "Next" task is the first unchecked item, shown as a CTA with a prominent Start button (links to that task in schedule view)
- Progress bar is a thick inline bar with the percentage right-aligned

**Card Grid — Masonry-ish:**

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-5);
  align-items: start; /* allows different heights */
}
```

Cards auto-flow into available space. Large cards (streaks, heatmap) span 2 columns on wide screens.

**Card Redesign:**

Each card gets:
- A top accent stripe (2px) in a unique color per card type
- An icon + title header row with a kebab menu (⋮) for card actions (hide, resize, move)
- Smooth expand/collapse for "Show more" content
- Loading skeleton while data computes

**New Dashboard Cards to Add:**

1. **Mini Calendar** — Compact 1-week strip showing today highlighted, progress dots per day, click to go to calendar
2. **Upcoming Deadlines Timeline** — Vertical timeline showing next 5 deadlines with relative time ("in 2 days"), connected by a line
3. **Focus Timer Widget** — If Pomodoro is active, show remaining time + session count; if not, show "Start focus session" CTA
4. **Weekly Comparison** — Sparkline showing this week vs. last week vs. average

---

## 10. Stats & Analytics Views

### Current State

Stats view has a heatmap, badges, burnout risk, goals, streaks, and comparative stats. All rendered with inline styles. The heatmap uses hardcoded colors and small 20x20px cells.

### Redesign

**Contribution Heatmap:**
- GitHub-style full calendar grid (53 weeks × 7 days)
- Cells use `border-radius: 2px` and proper spacing
- Hover a cell → tooltip with date, percentage, task count
- Color scale uses 5 levels from CSS variables (not hardcoded hex)
- Month labels along the top
- Day-of-week labels along the left (Mon, Wed, Fri)

**Achievement Badges:**
- Badge icons get a circular mount with a gradient border ring
- Unlocked badges have full color; locked ones are grayscale with a lock overlay
- New badge unlock → animated reveal (scale from 0 + golden ring explosion)
- Badge detail panel on click: description, unlock date, criteria

**Analytics Cards — Data Visualization:**

Replace inline-styled number displays with proper mini-charts:

| Metric | Current | New |
|--------|---------|-----|
| Weekly history | Colored squares | Bar chart with hover tooltips |
| Hourly patterns | Text | Radial clock diagram |
| Subject difficulty | Text | Horizontal bar chart with category colors |
| Burnout risk | Text + number | Gauge meter with needle animation |
| Streak | Number | Flame icon with level + calendar highlight |

**Burnout Gauge:**

```
     Low          Med          High
  ┌───┬───┬───┬───┬───┬───┬───┬───┐
  │ ■ │ ■ │ ■ │ ■ │ ▪ │ ▪ │ ▪ │ ▪ │
  └───┴───┴───┴───┴───┴───┴───┴───┘
              ▲ current (42%)

  Suggestions: "Energy is moderate — consider
  a lighter study session today"
```

---

## 11. Theme System Upgrade

### Current State

Dark/light toggle + named presets (Dracula, Nord, Solarized) + accent color picker. Solid implementation, needs visual polish.

### Redesign

**Theme Preview Cards:**
- Instead of a dropdown, show theme options as small preview swatches (mini app screenshots rendered with that theme's colors)
- Active theme has a checkmark overlay
- Switching themes applies a smooth cross-fade (0.3s on `background-color` and `color` transitions on `*`)

**New Themes to Add:**

| Theme | Palette | Character |
|-------|---------|-----------|
| **Midnight** | Deep navy (#0f172a) + electric blue (#3b82f6) | High contrast, sharp |
| **Rosewood** | Charcoal (#1c1917) + warm rose (#e11d48) | Warm, literary |
| **Forest** | Deep green (#052e16) + mint (#34d399) | Organic, calming |
| **Paper** | True white (#ffffff) + ink black (#171717) | Brutalist minimal |
| **Amber** | Sepia (#451a03) + golden (#f59e0b) | Warm reading mode |

**Time-Based Auto-Theme:**
- Optional: automatically shift between light (6am–6pm) and dark themes
- Transition is gradual over 30 minutes (not abrupt), using CSS transitions on the root variables

**Accent Color as System:**
- Current accent picker sets one color. Extend to derive a *system* from the chosen accent:
  - `--accent` (chosen color)
  - `--accent-hover` (lighter)
  - `--accent-dim` (12% opacity)
  - `--accent-ring` (30% opacity)
  - `--accent-contrast` (calculated readable text color for accent backgrounds)
  - All generated in JS from HSL math

---

## 12. Accessibility Hardening

### Current State

Good foundation: skip link, ARIA roles on tasks and progress bars, focus visible styles, modal focus trapping, screen reader announcer region.

### Gaps to Fill

**Keyboard Navigation:**
- Calendar grid: arrow key navigation between cells (currently click-only)
- Tab through day cells → Enter to open detail panel
- Escape closes any open panel/modal (partially done)
- Keyboard shortcuts panel (already exists) — make discoverable via `?` hint in footer

**Focus Management:**
- After view transitions, focus should move to the view's `h1` heading
- After closing a modal, focus returns to the trigger element (partially implemented — verify all modals)
- Calendar day detail panel: focus first interactive element when opened

**Semantic Improvements:**
- Calendar grid: `role="grid"`, rows with `role="row"`, cells with `role="gridcell"`
- Calendar cell aria-label: "April 10, Thursday, 75% complete, 1 deadline"
- Day navigation arrows: `aria-label="Previous month"` / `"Next month"`
- Theme toggle: `aria-pressed` state
- Progress bars: verify `aria-valuenow` updates live (may need `aria-live` region)

**Color Contrast:**
- Audit all text/background combinations against WCAG 2.1 AA (4.5:1 for text, 3:1 for large text)
- The current light theme `--muted: #7c6f64` on `--surface: #f2ead8` may fail — verify and adjust
- Calendar cell progress colors need sufficient contrast against cell backgrounds

**High Contrast Mode:**

```css
@media (forced-colors: active) {
  .cal-cell {
    border: 2px solid CanvasText;
  }
  .cal-cell.today {
    border: 3px solid Highlight;
  }
  .progress-fill {
    background: Highlight;
  }
}
```

---

## 13. Mobile Experience

### Current State

Responsive via media queries at 480px and 768px. Sidebar hidden, bottom tabs shown. Touch targets exist (long-press for context menu). Action sheets slide up.

### Redesign

**Touch Targets:**
- Minimum 44×44px for all interactive elements (some buttons and calendar cells may be under this)
- Calendar cells on mobile: minimum 48px height, comfortable tap spacing

**Swipe Gestures:**
- Swipe left on task → quick skip
- Swipe right on task → quick complete
- Swipe left/right on calendar → navigate months
- Pull-down on schedule → refresh/recalculate

**Mobile Calendar — Full-Width Cards:**

On screens < 600px, switch calendar from 7-column grid to a **scrollable week strip** + day detail below:

```
┌──────────────────────────────────────────────┐
│  ◀   April 6 – 12   ▶                       │
│                                              │
│  [Mon] [Tue] [Wed] [THU] [Fri] [Sat] [Sun]  │
│    ●     ●     ●    ★●    ○     ○     ○     │
│   85%   72%   90%  62%                       │
│                                              │
├──────────────────────────────────────────────┤
│  Thursday, April 10                          │
│                                              │
│  ✓ Functional Analysis    ✓ Review notes     │
│  ○ Problem set            ○ Lab writeup      │
│  ○ Reading ch. 5-6        ○ Flashcard review │
│                                              │
│  ● HW 3 due in 2 days                       │
│                                              │
│  [Open full schedule →]                      │
└──────────────────────────────────────────────┘
```

The horizontal week strip is swipeable. Tapping a day updates the detail section below (no page navigation). This is far more usable on mobile than a cramped 7×5 grid.

**Bottom Sheet Redesign:**
- Rounded top corners (16px radius)
- Drag handle indicator (pill shape, 40×4px, centered)
- Snap points: 30% (peek), 60% (comfortable), 90% (full)
- Velocity-based flick dismiss (not just distance)
- Backdrop blur instead of solid overlay

**Mobile Dashboard:**
- Cards stack single-column
- Hero zone is compact (2 lines instead of 4)
- Mini calendar strip replaces full calendar card

---

## 14. Performance & Polish

### CSS Architecture Cleanup

**Current:** 5400-line `legacy.css` + 8 smaller layer files.

**Target:** Break `legacy.css` into thematic modules:

```
css/
  main.css              ← layer imports only
  base.css              ← reset, typography, root variables
  layout.css            ← grid, sidebar, main, bottom-tabs
  components/
    buttons.css
    cards.css
    progress.css
    forms.css
    badges.css
    toast.css
    modal.css
  views/
    schedule.css
    calendar.css         ← NEW: all calendar-specific styles
    stats.css
    home.css
    habits.css
    flashcards.css
  themes.css             ← dark/light/preset overrides
  animations.css         ← ALL keyframes and transition utilities
  accessibility.css      ← focus, reduced-motion, forced-colors
  utilities.css          ← helper classes
```

**Inline Style Elimination:**

Every inline `style=` in JS renderers should be replaced with CSS classes. Audit and replace:

| File | Inline styles | Action |
|------|--------------|--------|
| `stats-view.js` | ~100+ (`style="width:20px;height:20px;..."`) | Extract to `.heatmap-cell`, `.stat-val`, etc. |
| `calendar.js` | ~15 (`style="width:${pct}%;background:${color}"`) | Use CSS classes: `.cal-fill-100`, `.cal-fill-60`, etc. or CSS variables |
| `home.js` | ~40 | Extract to dashboard card classes |
| `task-item.js` | ~5 (`style="border-left-color:${c.border}"`) | Use `style="--cat-color: ${c.border}"` + CSS `border-left-color: var(--cat-color)` |
| `panels.js` | ~30 | Extract to panel classes |

**Rendering Performance:**
- Add `content-visibility: auto` on off-screen sections and calendar rows
- Use `will-change: transform` on elements that animate frequently (but remove after animation)
- Calendar cell ripple effect: calculate lazily on first interaction, not on render

**Service Worker:**
- Bump cache version strategy to content-hash based (instead of manual `v28` increment)
- Cache new font files (General Sans, DM Serif Display)
- Pre-cache calendar detail panel template

---

## 15. Implementation Order

Ordered by dependency chain and user impact. Each phase is independently shippable.

### Phase 1: Foundation (CSS Architecture + Tokens)

**Files:** `css/*`, `legacy.css` decomposition

1. Define new CSS variable system (colors, typography, spacing, easing, durations)
2. Split `legacy.css` into modular files under `css/components/` and `css/views/`
3. Load new fonts (General Sans/Satoshi, DM Serif Display) via Google Fonts / Fontshare
4. Update `@layer` order in `main.css`
5. Apply new type scale and font assignments globally
6. Verify nothing breaks — this phase is purely structural

**Risk:** Low — CSS refactor, no JS logic changes.

### Phase 2: Animation System

**Files:** `css/animations.css` (expand significantly), view-transition CSS, JS `IntersectionObserver` utility

1. Define easing variables and duration scale
2. Rewrite all `@keyframes` in `legacy.css` → move to `animations.css`
3. Replace all `transition: all 0.15s` with specific property transitions + named easings
4. Implement stagger animation system (CSS `nth-child` delays)
5. Implement scroll-triggered animation utility (IntersectionObserver)
6. Implement directional view transitions (tied to router direction)
7. Rewrite task completion/skip animations (SVG checkbox, ring pulse, row highlight)
8. Add hover/active micro-interactions for buttons, cards, nav links
9. Implement `prefers-reduced-motion` comprehensive override
10. Build canvas-based confetti system (replace CSS confetti)

**Risk:** Medium — touches many files, but animation changes are visually verifiable and don't affect data/logic.

### Phase 3: Component Overhaul

**Files:** `js/render/task-item.js`, `js/render/nav.js`, `js/render/header.js`, component CSS files

1. Redesign task items (SVG checkbox, layout structure, hover quick-actions)
2. Redesign section headers (time range, inline progress)
3. Redesign buttons/controls (segmented control pattern, pill shapes)
4. Redesign cards (elevation system, accent stripes, consistent structure)
5. Redesign modals/overlays (glass backdrop, spring animation)
6. Redesign toasts (stacking, color-coded stripe, progress bar)
7. Redesign progress bars (liquid fill, completion flash)
8. Eliminate inline styles from all JS renderers (replace with CSS classes + CSS variables)

**Risk:** Medium — each component can be updated independently.

### Phase 4: Navigation & Layout

**Files:** `js/render/nav.js`, `js/router.js`, layout CSS

1. Implement grouped navigation in sidebar
2. Add collapsible sidebar (icon-only mode)
3. Redesign mobile bottom tabs (floating indicator dot)
4. Wire directional view transitions into router
5. Implement sidebar link animations (underline draw, active indicator slide)

**Risk:** Low-Medium — navigation is self-contained.

### Phase 5: Calendar Rebuild

**Files:** `js/render/calendar.js` (near-complete rewrite), new `css/views/calendar.css`, state.js (daily history)

1. Implement per-day history storage in state.js (save daily snapshots)
2. Rewrite month view grid with enriched cells (percentage, task count, category dots)
3. Implement today cell special treatment (glow, breathing animation)
4. Implement month navigation (prev/next arrows, month/year header)
5. Build day detail side panel (slide-in, task summary, deadlines)
6. Build week detail timeline view (hourly blocks, category colors)
7. Build year overview heatmap (contribution grid, click-to-zoom)
8. Add calendar keyboard navigation (arrow keys, Enter, Escape)
9. Implement deadline management from calendar (add, view detail)
10. Wire iCal export into calendar header
11. Mobile: implement week strip + day detail layout
12. Mobile: implement swipe navigation between months
13. Calendar cell wave reveal animation (staggered from today outward)
14. ARIA: grid roles, cell labels, screen reader announcements

**Risk:** High — most complex phase, touches data model. Build incrementally, test each sub-feature.

### Phase 6: Dashboard & Stats

**Files:** `js/render/home.js`, `js/render/stats-view.js`, dashboard CSS

1. Implement hero zone (greeting, forecast, next task CTA)
2. Redesign dashboard card grid (masonry layout, consistent card structure)
3. Add new cards (mini calendar strip, deadline timeline, focus timer widget)
4. Redesign stats heatmap (full GitHub-style calendar, tooltips)
5. Redesign badges display (circular mounts, unlock animation)
6. Add mini-chart visualizations (bar charts, gauge meter, radial clock)
7. Implement scroll-triggered reveals for stats cards

**Risk:** Medium — data sources already exist, this is presentation-layer work.

### Phase 7: Theme & Polish

**Files:** `js/ui/theme.js`, theme CSS, new theme definitions

1. Add new theme presets (Midnight, Rosewood, Forest, Paper, Amber)
2. Implement theme preview cards UI
3. Implement accent color system (auto-derive hover/dim/ring/contrast)
4. Add noise texture overlay
5. Implement time-based auto-theme (optional setting)
6. Cross-theme audit: verify all components look correct in every theme
7. WCAG contrast audit across all themes

**Risk:** Low — additive, doesn't break existing functionality.

### Phase 8: Mobile Polish

**Files:** Mobile-specific CSS, touch gesture JS

1. Audit all touch targets (44×44px minimum)
2. Implement swipe gestures (task skip/complete, calendar navigation)
3. Implement mobile calendar week-strip layout
4. Redesign bottom sheet (snap points, drag handle, velocity dismiss)
5. Optimize mobile dashboard layout (compact hero, stacked cards)
6. Test on real devices (iOS Safari, Android Chrome)

**Risk:** Medium — gesture code needs careful testing across devices.

---

## Appendix: File Impact Map

Files requiring changes, grouped by magnitude:

**Heavy rewrites (>60% new code):**
- `js/render/calendar.js` → full rebuild with 3 view modes + side panel
- `css/animations.css` → expand from 27 lines to ~300+ lines
- `css/legacy.css` → decompose into 12+ smaller files

**Significant changes (30-60% modified):**
- `js/render/task-item.js` → SVG checkbox, new layout structure
- `js/render/home.js` → hero zone, card grid redesign
- `js/render/stats-view.js` → chart components, heatmap rewrite
- `js/render/nav.js` → grouped nav, sidebar collapse
- `js/ui/theme.js` → new themes, accent system, auto-theme
- `js/render/header.js` → progress bar redesign
- `css/base.css` → new type scale, font imports
- `css/themes.css` → 5 new theme definitions

**Moderate changes (10-30% modified):**
- `js/router.js` → directional transition metadata
- `js/state.js` → daily history storage functions
- `js/render/index.js` → scroll-observer hookup, stagger classes
- `js/render/panels.js` → card consistency, inline style removal
- `js/init.js` → new calendar action handlers, gesture setup
- `js/ui/a11y.js` → calendar grid ARIA, focus management extensions
- `sw.js` → new font caches, updated asset list
- `index.html` → noise overlay element, new font links

**New files:**
- `css/views/calendar.css`
- `css/components/buttons.css`
- `css/components/cards.css`
- `css/components/progress.css`
- `css/components/modal.css`
- `css/components/toast.css`
- `css/components/badges.css`
- `css/components/forms.css`
- `css/views/schedule.css`
- `css/views/stats.css`
- `css/views/home.css`
- `js/ui/confetti.js` (canvas-based celebration system)
- `js/ui/gestures.js` (swipe/pinch handlers)
- `js/ui/scroll-reveal.js` (IntersectionObserver utility)

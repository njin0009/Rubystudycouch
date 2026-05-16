# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server (localhost:5173)
npm run build        # tsc type-check + Vite production build → dist/
npm run typecheck    # tsc --noEmit (no emit, just check)
npm run preview      # Serve dist/ locally
```

No test suite exists yet. Use `npm run typecheck` to verify type correctness.

## Architecture

### The two-layer split

The app has two distinct layers that coexist:

1. **React shell** (`src/`) — handles auth, nav, drag state, and Supabase integration.
2. **Legacy vanilla JS engine** (`public/assets/js/app.js`) — owns all quiz logic, screen routing, localStorage state, and DOM rendering.

These layers communicate exclusively through:
- **Custom DOM events** dispatched on `window`:
  - `studycouch:screen-change` (detail = screen ID) — legacy → React, updates the nav pill's active item
  - `studycouch:quiz-state` (detail = boolean) — legacy → React, signals when a quiz session is active/inactive
- **`window.*` globals** set by `app.js` that React calls: `goHome`, `showProgress`, `showReview`, `showBookmarks`, `showCheck`, `goQuiz`, `hydrateFromCloud`, `restoreCurrentScreen`, `resetAllData`
- **`window.StudyCouchSync`** — set by `LegacyStudyCoach.tsx` from `src/lib/studySync.ts`; the legacy app calls this to persist data to Supabase

### Screen routing

Screens are plain `<div id="*-screen" class="screen">` elements in `legacyMarkup.ts`. Only the `.active` class is toggled (via `showScreen()` in `app.js`) — React never re-renders this DOM. Screens: `home-screen`, `quiz-screen`, `result-screen`, `progress-screen`, `review-screen`, `bookmarks-screen`, `check-screen`.

### State persistence

- **`window.S`** — the single mutable JS object for all runtime quiz state (`qs`, `idx`, `ans`, `wrongMap`, `bmMap`, `markMap`, `correctMap`, `currentScreen`, `timer`, etc.). Persisted to `localStorage` via `save()` / `load()`.
- **Supabase tables**: `question_attempts`, `saved_questions`, `important_questions`, `question_notes`, `study_checkins`. Synced via `window.StudyCouchSync` (which wraps `src/lib/studySync.ts`).
- On app boot, `app.js` calls `load()` (localStorage), then `hydrateFromCloud()` (Supabase) to merge cloud data on top.

### React component responsibilities

- **`App.tsx`** — Supabase session gating, draggable nav pill wrapper (position in localStorage as `studycouch_nav_position`), account menu.
- **`LegacyStudyCoach.tsx`** — sequentially loads PDF.js CDN → `questions.js` → `app.js` via dynamic `<script>` tags; renders `legacyMarkup` via `dangerouslySetInnerHTML`; calls `hydrateFromCloud()` + `restoreCurrentScreen()` if scripts are already loaded (remount case).
- **`3d-adaptive-navigation-bar.tsx`** — Framer Motion spring pill. Expands to 520px (5 items) or 620px (6 items when quiz is active and user is off quiz-screen). Has 300ms click-block after expansion to prevent touch-synthesised accidental navigation.

### Critical `app.js` / `dist/` sync requirement

`public/assets/js/app.js` is served directly by Vite in dev but must be **manually copied to `dist/assets/js/app.js`** after edits, since Vite does not process files in `public/` through its transform pipeline. Run:

```bash
cp public/assets/js/app.js dist/assets/js/app.js
```

### Environment variables

Defined in `.env.local` (gitignored). Required:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Type declarations for legacy globals

All `window.*` bindings used by React code are typed in `src/vite-env.d.ts`. Add new globals there when bridging a new function from `app.js` to React.

### Path alias

`@/*` resolves to `src/*` (configured in both `vite.config.ts` and `tsconfig.app.json`).

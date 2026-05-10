# StudyCouch Web App

This folder contains the StudyCouch frontend app.

## Current Structure

```text
apps/web/
├── index.html
├── package.json
├── public/
│   ├── favicon.ico
│   ├── favicon.svg
│   └── assets/js/
│       ├── app.js
│       └── questions.js
├── tailwind.config.ts
├── postcss.config.js
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── components/
    │   └── ui/
    │       ├── animated-characters-login-page.tsx
    │       ├── 3d-adaptive-navigation-bar.tsx
    │       ├── countdown-timer.tsx
    │       ├── button.tsx
    │       ├── checkbox.tsx
    │       ├── input.tsx
    │       └── label.tsx
    ├── lib/
    │   ├── utils.ts
    │   ├── supabase.ts
    │   ├── studySync.ts
    │   └── supabaseHealth.ts
    ├── features/
    │   └── auth/
    │       ├── AuthPanel.tsx
    │       └── auth.css
    ├── legacy/
    │   ├── LegacyStudyCoach.tsx
    │   └── legacyMarkup.ts
    └── styles/
        └── legacy.css
```

## File Responsibilities

- `index.html`: Vite entry document. Keep only document metadata, font links, `#root`, and the Vite module script here.
- `package.json`: Frontend package scripts and dependencies. Change this when adding libraries or changing local/build commands. `framer-motion` powers the draggable centered navigation pill, and `@ark-ui/react` is available for the React countdown timer component.
- `package-lock.json`: Exact dependency lockfile. Commit it after `npm install`.
- `vite.config.ts`: Vite configuration for React and build behavior.
- `tailwind.config.ts`: Tailwind theme and content scanning. Keep `src/**/*.{ts,tsx}` here so shadcn classes are included in builds.
- `postcss.config.js`: PostCSS pipeline for Tailwind and autoprefixer.
- `tsconfig.json`: TypeScript project reference file.
- `tsconfig.app.json`: TypeScript compiler options for app source files, including incremental typecheck cache settings.
- `.env.example`: Environment variable template. Add new public variable names here without real values.
- `public/assets/js/questions.js`: Static question data served directly by Vite.
- `public/assets/js/app.js`: Legacy quiz runtime. It currently owns localStorage state, quiz flow, progress, review, bookmarks, notes, check-ins, and PDF interactions. It restores signed-in users' Supabase study snapshot and active quiz session on startup, keeps the current screen after reloads, provides the editable CLF-C02 timer widget, then syncs attempts, saved questions, important marks, notes, and check-ins through `window.StudyCouchSync`. Its document click handler is guarded so it does not crash on the login page.
- `public/favicon.ico`: Browser fallback tab icon. Some browsers request `/favicon.ico` automatically even when SVG is configured.
- `public/favicon.svg`: Browser tab icon referenced by `index.html`.
- `src/main.tsx`: React bootstrap file.
- `src/App.tsx`: Top-level React shell. It gates the app so unauthenticated users see the login/register page first, and authenticated users see the legacy quiz app with a compact account menu for sign-out and local data cleanup.
- `src/vite-env.d.ts`: Type declarations for Vite and global browser objects used by legacy scripts.
- `src/components/ui`: Default shadcn-compatible component folder. This matters because shared UI imports use `@/components/ui/...`, so keeping this path avoids custom import rewrites.
- `src/components/ui/3d-adaptive-navigation-bar.tsx`: Centered Framer Motion navigation pill for the authenticated StudyCouch app. It calls the legacy global navigation functions while the old UI is being migrated.
- `src/components/ui/countdown-timer.tsx`: shadcn-path timer component using Ark UI Timer primitives and lucide icons. The current legacy quiz page mirrors this card style in `public/assets/js/app.js` until the quiz screen is fully migrated to React.
- `src/components/ui/animated-characters-login-page.tsx`: Animated login/register page. It handles Supabase email/password login, registration, and Google OAuth. Registration passwords must be 6-12 characters and include uppercase, lowercase, number, and symbol characters. It explains that newly registered users may need to confirm their email before login if Supabase email confirmation is enabled.
- `src/components/ui/button.tsx`: shadcn-style button primitive.
- `src/components/ui/input.tsx`: shadcn-style input primitive.
- `src/components/ui/checkbox.tsx`: shadcn-style checkbox primitive.
- `src/components/ui/label.tsx`: shadcn-style label primitive.
- `src/lib/utils.ts`: `cn` helper for combining Tailwind class names.
- `src/lib/supabase.ts`: Shared Supabase client. All frontend backend calls should import this instead of creating new clients. It also enforces Supabase `apikey` and bearer headers on outgoing Supabase requests.
- `src/lib/supabaseHealth.ts`: Small helper for testing whether Supabase can be reached from the frontend.
- `src/lib/studySync.ts`: Shared study-data sync layer. It loads signed-in users' study snapshot from `question_attempts`, `saved_questions`, `important_questions`, `question_notes`, and `study_checkins`, writes new changes back to those tables, and clears cloud study records when the user chooses Clean data.
- `src/features/auth/AuthPanel.tsx`: Supabase magic-link login, current session display, profile upsert, and sign-out UI.
- `src/features/auth/auth.css`: Styles for the login panel.
- `src/legacy/LegacyStudyCoach.tsx`: React bridge that renders legacy markup and loads PDF.js, `questions.js`, and `app.js`.
- `src/legacy/legacyMarkup.ts`: Extracted legacy HTML. Treat this as temporary migration material.
- `src/styles/legacy.css`: Existing stylesheet from the original static app.

## Migration Strategy

The app is already running through React, TypeScript, and Vite. The old quiz interface is currently mounted by `LegacyStudyCoach.tsx` so the existing functionality stays intact.

As the UI is redesigned, move pieces out of `legacy` into feature modules:

```text
src/
├── app/
├── pages/
├── components/
├── features/
│   ├── auth/
│   ├── projects/
│   ├── quiz/
│   ├── progress/
│   └── documents/
├── lib/
├── data/
└── types/
```

Keep new backend integration code in `src/lib`.

## Update Rule

When frontend code changes, update this README if any of these are true:

- A file or folder is added, removed, renamed, or moved.
- A command in `package.json` changes.
- A dependency is added or removed.
- A legacy feature is rewritten as a React component.
- A new environment variable is needed.
- Build, deployment, or local setup behavior changes.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

# StudyCouch Architecture

## Is GitHub + Cloudflare Pages + Supabase Suitable?

Yes. For this MVP, this is the simplest stable architecture:

- GitHub stores the code and project history.
- Cloudflare Pages hosts the static frontend with automatic deploys.
- Supabase adds Auth, Postgres, Row Level Security, and cross-device study history later.

This avoids an early AWS-heavy backend. AWS can still be added later for document parsing, OCR, or AI features without replacing the MVP stack.

## Frontend Structure

```text
apps/web/index.html                         Vite HTML entry
apps/web/src/main.tsx                       React root
apps/web/src/App.tsx                        Auth-gated app shell
apps/web/src/components/ui                  shadcn-style reusable UI components
apps/web/src/components/ui/animated-characters-login-page.tsx  Login/register entry page
apps/web/src/lib/studySync.ts               Writes quiz attempts to Supabase
apps/web/src/legacy/LegacyStudyCoach.tsx    Temporary wrapper for the existing quiz app
apps/web/src/legacy/legacyMarkup.ts         Legacy HTML markup mounted by React
apps/web/src/styles/legacy.css              Existing visual system
apps/web/public/assets/js/questions.js      Static CLF-C02 question bank
apps/web/public/assets/js/app.js            Existing quiz engine and local state logic
```

The app is currently local-first. Data is stored in `localStorage`, which keeps the MVP fast and deployable without a backend. Supabase should be added as a sync layer after the Vite shell is stable.

Current sync behavior:

- The legacy quiz engine still updates `localStorage` for immediate local progress.
- After each answered question, `public/assets/js/app.js` calls `window.StudyCouchSync.recordAttempt`.
- `src/lib/studySync.ts` writes the attempt to `public.question_attempts` using the current Supabase Auth user.
- RLS keeps attempts scoped to the signed-in user's `user_id`.

As the frontend is redesigned, move code from `legacy` into this target shape:

```text
apps/web/
├── src/
│   ├── app/
│   ├── pages/
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── quiz/
│   │   ├── progress/
│   │   └── documents/
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── storage.ts
│   ├── data/
│   └── types/
```

This keeps UI, domain features, backend clients, and shared types separate.

## Backend Structure

```text
supabase/migrations/
├── 001_initial_schema.sql
├── 002_projects_documents.sql
└── 003_auth_profile_trigger.sql
```

Recommended Supabase responsibilities:

- Auth: Google login and magic link first.
- Database: persist progress, attempts, notes, bookmarks, check-ins, and sessions.
- Projects: group imported PDFs and generated question sets.
- Storage: keep uploaded PDFs under user-owned paths, with metadata in `documents`.
- RLS: every user can read and write only their own study data.
- Profile trigger: new users in `auth.users` are mirrored into `public.profiles`.

Local Auth setup:

- Site URL: `http://localhost:5173`
- Redirect URL allow list: `http://localhost:5173/**`
- Production should add the Cloudflare Pages URL after deployment.
- Password policy: 6-12 characters in the frontend, with uppercase, lowercase, number, and symbol required. Supabase Auth should also require minimum length 6 and lowercase, uppercase, digit, and symbol characters.

## Iteration Plan

1. Vite GitHub version: keep the current app inside `apps/web`, add README, deploy on Cloudflare Pages.
2. Supabase Auth: add login/logout and user identity display.
3. Cloud sync: mirror local progress to Supabase after login.
4. Projects and documents: add project creation, PDF uploads, and per-project question sets.
5. React/Vite redesign: migrate the static app into typed components and feature modules.
6. Study analytics: use stored attempts and sessions for stronger dashboards.

## Future AWS Fit

AWS is better as a later processing layer:

- Textract for PDF extraction
- Bedrock for explanation generation or weak-area coaching
- S3 for document storage if uploaded files become part of the product

For now, keeping the frontend static and the database in Supabase is the fastest path to a portfolio-ready product.

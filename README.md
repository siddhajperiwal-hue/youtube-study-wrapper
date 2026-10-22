# StudyDesk

An intentional-learning wrapper for YouTube. Paste a playlist and StudyDesk turns it into a course:
chapters with progress tracking, per-chapter notes with clickable video timestamps, AI-generated
quizzes and flashcards (Gemini), a review gym, study streaks, and a dashboard that tells you what to
study next.

## Project layout

```
├── app/                    Next.js 16 application (run all npm commands here)
│   ├── src/app/            routes: dashboard, course, learning page, API routes
│   ├── src/components/     UI components used by the pages
│   ├── src/lib/            data access, caching, Gemini/YouTube helpers, notes utilities
│   ├── src/styles/         page stylesheets (theme tokens live in src/app/globals.css)
│   └── supabase_schema.sql database schema
├── docs/
│   ├── product/            core idea, MVP scope, functionality spec, admin page
│   ├── design/             UI description, brand brief, page specs, HTML mockups
│   ├── architecture/       backend architecture
│   └── production-readiness.md   launch checklist
├── scratch/                local debugging scripts and data backups (git-ignored)
└── CLAUDE.md               guidance for Claude Code
```

## Running locally

```bash
cd app
cp .env.example .env.local   # fill in Supabase, Gemini and YouTube keys
npm install
npm run dev                  # http://localhost:3000
```

Other commands (from `app/`): `npm test` (Vitest), `npm run lint`, `npm run build && npm start`
(production build).

## Status

Working MVP, not yet production-ready (no login yet). See
[`docs/production-readiness.md`](docs/production-readiness.md).

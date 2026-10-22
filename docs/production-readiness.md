# StudyDesk — Production Readiness Checklist

Everything that still has to be built or fixed before StudyDesk can go live for real users.
Items come from the security review and bug-fixing sessions on 2026-10-22.

**How to use this file:** tick items (`[x]`) as they're done. When you're ready to launch, ask Claude
to "review docs/production-readiness.md". It should check every item against the code (not just the
ticks), run the verification steps, and then set up deployment.

Priority levels:
- **P0:** launch blocker. Do not put the app on the internet without these.
- **P1:** required before anyone other than you uses it.
- **P2:** should do soon after launch.

---

## 1. Authentication & accounts — P0

Login shipped 2026-10-22: email + password and Google via Supabase Auth, no guest fallback.
Remaining: the Supabase dashboard setup below (Google provider, redirect URLs, SMTP).

- [x] **Sign-up / login / logout UI** using Supabase Auth (email + password and/or Google OAuth).
  - Login and sign-up pages, a "Sign out" item in the dashboard profile menu (`#profileDropdownMenu` in `app/src/components/dashboard/DashboardHeader.tsx`).
  - Session refresh via Next.js proxy/middleware (`@supabase/ssr` pattern), so `getClaims()` always sees a fresh token. Check `app/node_modules/next/dist/docs/` for the Next 16 name/convention (middleware vs proxy) before writing it.
  - Password reset and email confirmation flows (Supabase templates + redirect URLs).
- [x] **Remove the `DEFAULT_USER_ID` fallback.** `getEffectiveUserId()` must not invent a user.
  Unauthenticated API calls return **401**, and unauthenticated page visits redirect to login.
  - Update `app/src/lib/__tests__/auth-helpers.test.ts` (it currently asserts the fallback).
  - Decide what happens to the existing data owned by `ff8106e0-febd-4795-9885-eadb55cc098a`
    (reassign it to your real account after you sign up).
- [x] **Profiles row on sign-up** (the `handle_new_user` trigger in `supabase_schema.sql` is installed and working).
- [x] **Clear client caches on sign-out.** Call `invalidateCache()` from `app/src/lib/cache.ts`, and clear any persisted cache if one is added later, so the next user on the same browser never sees the previous user's data.

- [ ] **Supabase dashboard setup** (Authentication settings):
  - URL Configuration: Site URL = production domain; Redirect URLs include `http://localhost:3000/auth/callback` and `https://<domain>/auth/callback`.
  - Google provider: OAuth client from Google Cloud Console (redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`), client ID/secret pasted into Supabase → Providers → Google.
  - Custom SMTP: Supabase's built-in email sender is limited to a few emails per hour, which is too few for real sign-ups.
  - Optional: email templates linking to `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup` (and `type=recovery`) so confirmation/reset links work even when opened in a different browser.

**Verify:** signed-out `curl` to every `/api/*` route returns 401. Two test accounts can't see or change each other's courses, notes, progress or streaks.

## 2. Per-user limits — P0

- [ ] **Max 3 courses per user (for now).**
  - **Server-side (the real limit):** in `POST /api/courses` (`app/src/app/api/courses/route.ts`), count the user's rows in `courses` before importing. If the user already has 3, return **403** with a clear message and do **not** call the YouTube API or Gemini.
  - **UI:** the dashboard shows "3 of 3 courses used". "Add Course" is disabled at the limit with an explanation, and deleting a course frees a slot.
  - Keep the limit in one constant (e.g. `MAX_COURSES_PER_USER = 3`) so it's easy to raise later.
  - Optional hardening: enforce it in the database too (trigger or check), so a race between two parallel requests can't create a 4th course.
- [ ] **Rate limits on endpoints that cost money/quota** (per user, plus per IP for anything callable before login):
  - `POST /api/courses/validate` (YouTube Data API quota)
  - `POST /api/courses` (YouTube + Gemini for the first 3 videos)
  - `GET /api/courses/[id]/chapters/[videoId]` (may trigger Gemini generation)
  - `GET /api/courses/[id]/recall?force=true`
  - Write-heavy endpoints: `/api/progress`, `/api/study/heartbeat`, `/api/notes/*` (protects against scripts spamming them).
  - Needs a shared store in production (e.g. Upstash Redis / Vercel KV, or a Supabase table). In-memory counters don't work across serverless instances.
- [ ] **Daily Gemini budget per user** (e.g. max N video generations/day), and a global kill switch (env var) to pause AI generation if costs spike.

**Verify:** a 4th course import returns 403 and makes no YouTube/Gemini calls. Hammering `validate` gets 429 after the limit.

## 3. Authorization (ownership checks) — P0/P1

All API routes use the **service-role key** (`app/src/lib/supabase/admin.ts`), which **bypasses
Row Level Security**. The RLS policies in `supabase_schema.sql` therefore protect nothing today, and
every route must check ownership itself.

- [ ] **Fix writes that trust a `courseId` without checking it belongs to the user:**
  - `PUT /api/notes/[courseId]/[videoId]` upserts on `(course_id, video_id)`. It can **overwrite another user's notes row and reassign it** to the caller.
  - `POST /api/progress` reads `courses` by `id` only, then upserts `chapter_progress` and updates `courses.last_accessed_at` for any course.
  - `POST /api/courses/[id]/quiz/submit` upserts `chapter_progress` for any course.
  - Fix: before writing, confirm `courses.id = courseId AND user_id = userId`, and that `videoId` belongs to that course's playlist. Return 404 otherwise.
- [ ] **Audit every other route** the same way: `bookmarks`, `questions/[id]/report`, `recall`, `review`, `quiz`, `dashboard/cards`, `streak`, `study/heartbeat`.
- [ ] **Defense in depth (recommended):** use the **user-scoped** Supabase client (`app/src/lib/supabase/server.ts`, anon key + user session) for per-user tables, so RLS applies. Keep the service-role client only for shared content and background jobs (AI generation, playlist import).
  - Review the RLS policies once they're actually in force (e.g. `notes` uniqueness is `(course_id, video_id)` without `user_id`).

**Verify:** with two accounts, every write route called with the *other* user's `courseId` / `videoId` is rejected, and the other user's rows are unchanged.

## 4. Remaining security hardening — P1

- [ ] **YouTube `postMessage` origin check** (learning page, `handleMsg` in `app/src/components/learning/useYouTubePlayer.ts`) uses `e.origin.includes("youtube.com")`, which `https://youtube.com.evil.example` also passes. Compare against exact origins (`https://www.youtube.com`, `https://www.youtube-nocookie.com`) **and** require `e.source === playerIframeRef.current.contentWindow`.
- [ ] **Don't return raw `err.message` to the browser** from API routes. Log it server-side and return a generic message.
- [ ] **Security headers** in `next.config.ts`: Content-Security-Policy (allow `youtube-nocookie.com` frames, `img.youtube.com`, Supabase, Google Fonts), `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`.
- [ ] **Validate all request bodies with zod.** `bookmarks`, `questions/[id]/report`, `quiz/submit`, `courses/validate` and `PATCH /api/courses/[id]` currently read `req.json()` without schemas. Whitelist the fields `PATCH` may change.
- [ ] **Bounded input sizes:** cap note size (`NoteUpdateSchema`), report text length, and the playlist size imported (very large playlists = many DB rows and API calls).
- [ ] **Gemini prompt-injection awareness:** transcripts/descriptions are untrusted input. Keep validating the model output with zod (already done) and never render model output as HTML.

Already fine (keep it that way):
- Service-role and Gemini keys are only used server-side; `.env*` is git-ignored; only the URL and anon key are `NEXT_PUBLIC_`.
- Supabase queries are parameterized, so there's no SQL injection.
- Notes HTML comes from TipTap's escaping serializer. Description links are restricted to `http(s)`.
- `npm audit --omit=dev`: 0 vulnerabilities (as of 2026-10-22). Re-run before launch.

## 5. Remove prototype / dev leftovers — P0

- [ ] **"PROTOTYPE TRIGGERS" strip** on the learning page (`PrototypeStrip` in `app/src/components/learning/LearningModals.tsx`: "24h Recall", "100% Quiz", "20m Break" buttons). Remove it, or only render it in development.
- [ ] **Misleading save labels:** the learning page says "Saved locally" (`NotesPanel.tsx`) although notes are saved to the database, and the course Notes tab (`NotesTab.tsx`) shows a static "● Saved locally" on a read-only view.
- [ ] **Unsplash fallback thumbnails** (hotlinked images) in `PriorityCourseCard.tsx`, `CourseLibrary.tsx` and `CourseHero.tsx`. Replace with a local placeholder.
- [ ] **Build log noise:** `/api/dashboard/cards` and `/api/streak` catch Next's prerender bail-out and log it as "error" during `next build`. Let that signal propagate (or exclude it in the catch) so real errors stand out.

## 6. Known bugs / UX gaps still open — P1

- [x] **Shared button styles only existed in `dashboard.css`.** Fixed 2026-10-22: shared UI styles moved to `app/src/styles/components.css`, loaded on every page.
- [ ] **AI content that never finishes:** some chapters sit in `video_content.status = pending` or `failed` (seen on the "Agritalk" course). Add retry with backoff and a visible "quiz not available / retry" state. Consider a real job queue (`generation_jobs` table exists but is unused) instead of in-process `after()` work.
- [ ] **Dev-only:** "Duplicate use of selection JSON ID gapcursor" comes from a long-running `next dev`. Restart the dev server (delete `app/.next` if needed). Not a production issue.
- [ ] **Flashcard reports are silently lost:** flashcard ids are sent to `POST /api/questions/[id]/report`, whose `question_reports.question_id` references `questions(id)`, so the insert fails. Fix with the `content_reports` table in `docs/product/admin-page.md` (Section 6).
- [ ] Keep fixing bugs you find, and add them here if they're not done before launch.

## 7. Deployment setup — P0

- [ ] **Put the project in git** (it isn't a repository yet). The root `.gitignore` already excludes
  `scratch/` (it contains **backups of real notes and questions** plus debugging scripts), `.env*`,
  `.next/` and `node_modules/`. Double-check `git status` before the first commit.
- [ ] **Host:** Vercel is the natural fit (Next 16, `after()`, Partial Prerendering). Root directory = `app/`.
- [ ] **Environment variables** set in the host dashboard (never committed): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `YOUTUBE_API_KEY` (+ rate-limit store keys).
- [ ] **Rotate keys** that have lived in local files during development, before launch (service-role, Gemini, YouTube).
- [ ] **Restrict the API keys:** YouTube key restricted to the YouTube Data API (and server use). Set Gemini usage/billing caps and alerts in Google Cloud.
- [ ] **Supabase Auth settings:** Site URL and redirect URLs set to the production domain. Email templates, SMTP for real email sending.
- [ ] **Region:** host the app in the **same region as the Supabase project**, or move Supabase to Mumbai (`ap-south-1`). Each DB round trip currently costs ~0.4 s from India, and this is the biggest remaining speed factor.
- [ ] **Custom domain + HTTPS** (automatic on Vercel).
- [ ] **Supabase backups / point-in-time recovery** enabled (depends on plan).
- [ ] **`npm run build` passes** with no errors (it does as of 2026-10-22), and `npm test` (56 tests) passes.

## 8. Operations & monitoring — P1/P2

- [ ] **Error tracking** (e.g. Sentry) for client and server errors.
- [ ] **Usage/cost dashboards and alerts** for Gemini and the YouTube API quota.
- [ ] **Logging:** structured server logs without personal data or note contents.
- [ ] **Uptime check** on the production URL.
- [ ] **Analytics** if wanted (PostHog keys are already sketched in `app/.env.example`). Add a cookie/consent notice if required.

## 9. Legal & trust — P1

- [ ] **Privacy policy** (what's stored: notes, progress, study time, and that Gemini processes video transcripts) and **terms of use**.
- [ ] **Account deletion / data export** (users can delete their account and all their data). Course delete exists, but account delete doesn't.
- [ ] **YouTube API Terms of Service compliance:** branding, embedded player rules, not storing data beyond what the terms allow.

## 10. Performance — P2 (nice to have)

Measured 2026-10-22 on a production build (`npm run build && npm start`): in-app page changes are
mostly instant. Full page loads take 0.5–1.7 s, dominated by Supabase round trips (~0.4 s each).

- [ ] **Server cache for shared, rarely-changing data** with Next's `"use cache"` (`cacheComponents` is on): playlist/video metadata, chapter lists, resources, questions, flashcards. Invalidate with cache tags when content is generated.
- [ ] **Persist the client cache across reloads** (`sessionStorage`/IndexedDB) with stale-while-revalidate. Clear it on sign-out.
- [ ] **Move Supabase / hosting into the same region** (see Deployment). This is the biggest single win.
- [ ] Optional, larger: move page data loading into Server Components with streaming, so prefetched routes include their data.

## 11. Testing before launch — P1

- [ ] **Automated tests for auth and authorization:** every API route returns 401 when signed out, and rejects another user's IDs.
- [ ] **Test for the 3-course limit** (server-side 403 with no external calls).
- [ ] **End-to-end smoke test** of the main flow (sign up → import playlist → watch chapter → notes → quiz → dashboard), e.g. with Playwright. UI behaviour currently has no automated tests (it has been checked manually with headless Chrome).
- [ ] **Run `npm audit` and `npm run lint`** (lint currently reports ~100 pre-existing `no-explicit-any` errors; decide whether to fix them or relax the rule).

---

### Launch-day minimum (if you need to go live fast)

Sections **1, 2, 3, 5 and 7** done. That means real login, no default user, the 3-course limit and
rate limits, ownership checks, the prototype strip removed, keys rotated, and the `scratch/` data kept out of git.
Everything else can follow shortly after.

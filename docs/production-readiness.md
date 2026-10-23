# StudyDesk — Production Readiness Checklist

Everything that has to be built or fixed before StudyDesk can go live for real users, and what is
already done. Items come from the security reviews and bug-fixing sessions of 2026-10-22/23.
**Last verified against the code: 2026-10-23** (each open item below was re-checked in the source,
not just its tick box).

**How to use this file:** tick items (`[x]`) as they're done. When you're ready to launch, ask Claude
to "review docs/production-readiness.md". It should check every item against the code (not just the
ticks), run the verification steps, and then set up deployment.

Priority levels:
- **P0:** launch blocker. Do not put the app on the internet without these.
- **P1:** required before anyone other than you uses it.
- **P2:** should do soon after launch.

---

## Status at a glance (2026-10-23)

**Done**
- Real login (email + password, Google) with no guest fallback; every API route returns 401 when signed out; `src/proxy.ts` gates pages and `/api/*`.
- Admin page locked to `ADMIN_EMAILS`, checked server-side on every `/api/admin/*` request.
- Secrets kept out of git; code in a private GitHub repo.
- Quiz submission checks course ownership; AI generation can't double-insert questions; failed generations retry with limits and are logged.
- Flashcard reports fixed (needs the admin migration run); admin dashboard shows Gemini spend, quota errors and generation failures.

**Still open before launch (P0)**
1. **Cost abuse:** no 3-course limit, no rate limits, no per-user AI budget, no global AI kill switch (Section 2). *Most likely real-world attack.*
2. **Ownership gaps:** `PUT /api/notes/...` and `POST /api/progress` write to any course id; `GET /api/courses/[id]/review` reads any course's progress (Section 3).
3. **Prototype test buttons** still on the learning page (Section 5).
4. **Deployment hygiene:** rotate all keys, restrict them, set Google Cloud spend caps, production URLs in Supabase/Google, SMTP (Sections 1 and 7).

5. **External limits:** transcripts may be blocked from cloud servers; YouTube quota, Gemini rate limits and Supabase plan limits (Section 12, which also has the recommended launch order).

**Still open (P1):** security headers, exact YouTube `postMessage` origin check, generic error messages, zod on the last few routes (Section 4); privacy policy and account deletion (Section 9); error tracking (Section 8).

---

## 1. Authentication & accounts — P0

Login shipped 2026-10-22: email + password and Google via Supabase Auth, no guest fallback.

- [x] **Sign-up / login / logout UI** using Supabase Auth (email + password and Google OAuth): `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`; "Sign out" in the dashboard profile menu.
- [x] **Session refresh + sign-in gate** in `app/src/proxy.ts` (Next 16's name for middleware).
- [x] **Removed the `DEFAULT_USER_ID` fallback.** `getEffectiveUserId()` returns null when signed out; all API routes return **401**; signed-out page visits redirect to `/login`. The old guest account's data was given to the owner's account (email changed to the owner's).
- [x] **Profiles row on sign-up** (the `handle_new_user` trigger is installed and working).
- [x] **Clear client caches on sign-out** (`invalidateCache()` + full page reload).
- [x] **Supabase dashboard, local setup:** Google provider enabled (verified via `/auth/v1/settings`), `http://localhost:3000/auth/callback` in Redirect URLs.
- [ ] **Supabase dashboard, production setup:**
  - Site URL = production domain; add `https://<domain>/auth/callback` to Redirect URLs.
  - Google Cloud OAuth: add the production domain; move the OAuth consent screen from **Testing** to **In production** (in Testing mode only listed test users can sign in).
  - **Custom SMTP:** Supabase's built-in sender allows only a few emails per hour, too few for real sign-ups and password resets.
  - Optional: email templates linking to `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup` (and `type=recovery`) so confirmation/reset links work even when opened in a different browser.

**Verify:** signed-out `curl` to every `/api/*` route returns 401 (automated for the proxy; spot-checked on routes). Two test accounts can't see or change each other's courses, notes, progress or streaks (blocked by Section 3).

## 2. Per-user limits — P0 (biggest open risk)

Background generation now covers **whole playlists** (`generatePlaylistContent`), so one imported
playlist can mean dozens of Gemini calls. Without these limits, any signed-up user can run up the
Gemini bill.

- [ ] **Max 3 courses per user (for now).**
  - **Server-side (the real limit):** in `POST /api/courses` (`app/src/app/api/courses/route.ts`), count the user's rows in `courses` before importing. If the user already has 3, return **403** with a clear message and do **not** call the YouTube API or Gemini.
  - **UI:** the dashboard shows "3 of 3 courses used". "Add Course" is disabled at the limit with an explanation, and deleting a course frees a slot.
  - Keep the limit in one constant (e.g. `MAX_COURSES_PER_USER = 3`) so it's easy to raise later.
  - Optional hardening: enforce it in the database too (trigger or check), so two parallel requests can't create a 4th course.
- [ ] **Cap playlist size on import** (e.g. 100 videos), so one import can't queue hundreds of Gemini calls.
- [ ] **Rate limits on endpoints that cost money/quota** (per user):
  - `POST /api/courses/validate` (YouTube Data API quota)
  - `POST /api/courses` (YouTube API + queues Gemini generation for the whole playlist)
  - `GET /api/courses/[id]/chapters/[videoId]` and `GET /api/courses/[id]/quiz` (retry failed Gemini generation on every real visit)
  - `POST /api/feedback`, `POST /api/questions/[id]/report` (spam)
  - Write-heavy endpoints: `/api/progress`, `/api/study/heartbeat`, `/api/notes/*`.
  - Store: a Supabase table works on any host; in-memory counters only work while there is a single server instance.
- [ ] **Daily Gemini budget per user** (e.g. max N generations/day) and a **global kill switch** (env var, e.g. `AI_GENERATION_ENABLED=false`) checked in `generateContentForVideo`.
- [ ] **Cap retries on chapter visits.** Background runs stop after `MAX_BACKGROUND_ATTEMPTS` (3) failures, but `GET .../chapters/[videoId]` and `GET .../quiz` retry a failed video on every non-prefetch visit with no cap.

**Verify:** a 4th course import returns 403 and makes no YouTube/Gemini calls. Hammering `validate` gets 429 after the limit. With the kill switch off, no Gemini calls happen.

## 3. Authorization (ownership checks) — P0

All API routes use the **service-role key** (`app/src/lib/supabase/admin.ts`), which **bypasses
Row Level Security**. The RLS policies in `supabase_schema.sql` therefore protect nothing, and
every route must check ownership itself. (Course ids are random UUIDs, which makes these hard to
exploit by guessing, but that is not a defence.)

- [x] **`POST /api/courses/[id]/quiz/submit`** verifies `courses.id = courseId AND user_id = userId` before writing (fixed 2026-10-23, with tests).
- [ ] **`PUT /api/notes/[courseId]/[videoId]`** upserts on `(course_id, video_id)` with no course ownership check. It can **overwrite another user's notes row and reassign it** to the caller. (`GET` on the same route does filter by `user_id`.)
- [ ] **`POST /api/progress`** reads `courses` by `id` only, then upserts `chapter_progress` and updates `courses.last_accessed_at` for any course.
- [ ] **`GET /api/courses/[id]/review`** reads `chapter_progress` by `course_id` only, so any signed-in user can see which chapters of another user's course are completed (and that course's shared questions/flashcards).
- Fix for all three: confirm `courses.id = courseId AND user_id = userId` in the same `Promise.all` wave, and that `videoId` belongs to that course's playlist. Return 404 otherwise.
- [x] **Audited, OK:** `bookmarks`, `questions/[id]/report`, `dashboard/cards`, `streak`, `study/heartbeat` (all scoped by `user_id`); `recall`, `GET /api/courses/[id]`, `PATCH`/`DELETE /api/courses/[id]` (filter by `user_id`); `/api/admin/*` (`requireAdmin()`); `GET .../quiz` returns shared questions only (no per-user data).
- [ ] **Defense in depth (recommended):** use the **user-scoped** Supabase client (`app/src/lib/supabase/server.ts`, anon key + user session) for per-user tables, so RLS applies. Keep the service-role client only for shared content, admin and background jobs.
  - Review the RLS policies once they're actually in force (e.g. `notes` uniqueness is `(course_id, video_id)` without `user_id`).

**Verify:** with two accounts, every route called with the *other* user's `courseId` / `videoId` is rejected, and the other user's rows are unchanged. Add these as route tests (like `quiz-submit.test.ts`).

## 4. Remaining security hardening — P1

- [ ] **YouTube `postMessage` origin check** (`useYouTubePlayer.ts`, `handleMsg`) uses `e.origin.includes("youtube.com")`, which `https://youtube.com.evil.example` also passes. Compare against exact origins (`https://www.youtube.com`, `https://www.youtube-nocookie.com`) **and** require `e.source === iframe.contentWindow`.
- [ ] **Don't return raw `err.message` to the browser** from API routes. 17 route files still do; log server-side and return a generic message.
- [ ] **Security headers** in `next.config.ts`: Content-Security-Policy (allow `youtube-nocookie.com` frames, `img.youtube.com`, Supabase, Google Fonts), `frame-ancestors`/`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS.
- [ ] **Validate the remaining request bodies with zod:** `bookmarks`, `courses/validate`, and `PATCH /api/courses/[id]` (its fields are already whitelisted and ownership-checked; types and lengths aren't). Done: `quiz/submit`, `questions/[id]/report`, `feedback`, admin routes, auth.
- [ ] **Bounded input sizes:** cap note size (`NoteUpdateSchema` accepts any JSON) and course name length. Report reason (2,000) and feedback (4,000) are capped.
- [ ] **Gemini prompt-injection awareness:** transcripts/descriptions are untrusted input. Keep validating model output with zod (done) and never render it as HTML (currently true).

Already fine (keep it that way):
- Service-role, Gemini, YouTube keys and `ADMIN_EMAILS` are server-only; `.env*` is git-ignored; only the Supabase URL and anon key are `NEXT_PUBLIC_`.
- Supabase queries are parameterized, so there's no SQL injection.
- Passwords are handled entirely by Supabase Auth; the app never sees or stores them.
- Auth redirects only go to same-site paths (`safeNextPath`), so login links can't redirect to other sites.
- Notes HTML (course Notes tab, PDF) comes from TipTap's escaping serializer of the user's own notes. Description links are restricted to `http(s)`.
- `npm audit --omit=dev`: 0 vulnerabilities as of 2026-10-22. Re-run before launch.

## 5. Remove prototype / dev leftovers — P0

- [ ] **"PROTOTYPE TRIGGERS" strip** on the learning page (`PrototypeStrip` in `app/src/components/learning/LearningModals.tsx`: "24h Recall", "100% Quiz", "20m Break"). Remove it, or render it only in development.
- [ ] **Misleading save labels:** the learning page says "Saved locally" (`NotesPanel.tsx`) although notes are saved to the database; the course Notes tab (`NotesTab.tsx`) shows a static "● Saved locally".
- [ ] **Unsplash fallback thumbnails** (hotlinked images) in `PriorityCourseCard.tsx`, `CourseLibrary.tsx` and `CourseHero.tsx`. Replace with a local placeholder.
- [ ] **Build log noise:** `/api/dashboard/cards` and `/api/streak` log Next's prerender bail-out as "error" during `next build`.

## 6. Known bugs / UX gaps

- [x] **Shared button styles only existed in `dashboard.css`.** Fixed 2026-10-22 (`components.css`).
- [x] **AI content that never finishes.** Fixed 2026-10-22: DB claim per video (no duplicate sets), whole-playlist background queue, limited retries, every attempt logged in `generation_jobs`; the quiz shows "Generating your quiz…" and waits instead of skipping.
- [x] **Skipped quizzes counted as Mastered** ("Watched (Quiz Skipped)" stayed 0). Fixed 2026-10-23; the 12 affected chapters were corrected in the database.
- [x] **Chapter descriptions missing** on the course page, and **layout width changing between course tabs**. Fixed 2026-10-23.
- [ ] **Flashcard reports:** fixed in code 2026-10-22, but they only save once `app/supabase/migrations/20261022_admin_page.sql` has been run in Supabase (also needed for AI cost tracking, the feedback inbox and editable admin settings).
- [ ] **6 videos still have doubled question/flashcard sets** from before the duplicate fix ("Flask Tutorials" #1, #4, #6, #8, #9 and one Class 10 Trigonometry video). Clean up the extra set (one has 3 saved answers).
- [ ] **Dev-only:** "Duplicate use of selection JSON ID gapcursor" from a long-running `next dev`. Restart it. Not a production issue.
- [ ] Keep fixing bugs you find, and add them here if they're not done before launch.

## 7. Deployment setup — P0

- [x] **Project in git:** private repo https://github.com/siddhajperiwal-hue/youtube-study-wrapper (`main`). `scratch/`, `.env*`, `.next/`, `node_modules/` are git-ignored; commit and push after every finished change (see `CLAUDE.md`).
- [ ] **Host.** Background AI generation runs in `after()` and can take many minutes per playlist, so it needs a **long-running server**: Railway or Render (`npm run build` / `npm run start`, root directory `app/`) works as-is. Vercel (serverless) would cut long runs short unless generation moves to a queue or cron job.
- [ ] **Environment variables** set in the host dashboard (never committed): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `YOUTUBE_API_KEY`, `ADMIN_EMAILS` (+ any rate-limit store keys).
- [ ] **Rotate keys** before launch: service-role, Gemini and YouTube keys have lived in local files and development scripts.
- [ ] **Restrict the API keys and cap spend:** YouTube key restricted to the YouTube Data API; Gemini usage/billing caps and budget alerts in Google Cloud (the admin page's budget is only an estimate and doesn't stop spending).
- [ ] **Region:** host the app in the **same region as the Supabase project** (or move Supabase to Mumbai, `ap-south-1`). Each DB round trip currently costs ~0.4 s from India.
- [ ] **Custom domain + HTTPS.**
- [ ] **Supabase backups / point-in-time recovery** enabled (depends on plan).
- [x] **`npm run build` passes** (verified 2026-10-23) and `npm test` passes (92 tests).

## 8. Operations & monitoring — P1/P2

- [ ] **Error tracking** (e.g. Sentry) for client and server errors.
- [x] **Usage/cost view:** the admin page (`/admin`) shows users, activity, estimated Gemini spend vs budget, quota/rate-limit errors, generation failures with reasons, DB size, reports and feedback.
- [ ] **Alerts** (email when Gemini spend, quota errors or failures spike; YouTube API quota).
- [ ] **Logging:** structured server logs without personal data or note contents.
- [ ] **Uptime check** on the production URL.
- [ ] **Analytics** if wanted (PostHog keys are sketched in `app/.env.example`). Add a cookie/consent notice if required.

## 9. Legal & trust — P1

- [ ] **Privacy policy** (what's stored: email, notes, progress, study time, feedback; that Gemini processes video transcripts) and **terms of use**.
- [ ] **Account deletion / data export** (course delete exists, account delete doesn't).
- [ ] **YouTube API Terms of Service compliance:** branding, embedded player rules, not storing data beyond what the terms allow.

## 10. Performance — P2 (nice to have)

Measured 2026-10-22 on a production build: in-app page changes are mostly instant. Full page loads
take 0.5–1.7 s, dominated by Supabase round trips (~0.4 s each).

- [ ] **Server cache for shared, rarely-changing data** with Next's `"use cache"`: playlist/video metadata, chapter lists, resources, questions, flashcards. Invalidate with cache tags when content is generated.
- [ ] **Persist the client cache across reloads** (`sessionStorage`/IndexedDB) with stale-while-revalidate. Clear it on sign-out.
- [ ] **Move Supabase / hosting into the same region** (see Deployment). The biggest single win.
- [ ] **Admin overview aggregation in SQL** once data grows (it currently fetches raw rows and aggregates in Node).

## 11. Testing before launch — P1

- [~] **Automated tests for auth and authorization:** done for the proxy (signed-out redirects / 401), `getEffectiveUserId`, admin routes (401/403), `quiz/submit` (other user's course → 404), feedback and reports. Still to add: cross-user tests for notes, progress and review (with the Section 3 fixes), and a 401 test per route.
- [ ] **Test for the 3-course limit** (server-side 403 with no external calls).
- [ ] **End-to-end smoke test** of the main flow (sign up → import playlist → watch chapter → notes → quiz → dashboard), e.g. with Playwright. UI behaviour is checked manually with headless Chrome.
- [ ] **Run `npm audit` and `npm run lint`** (lint reports ~100 pre-existing `no-explicit-any` errors; decide whether to fix them or relax the rule).

## 12. Traffic & external-service limits — P0/P1

What breaks first once real users (or lots of them) arrive. Added 2026-10-23. Heavy traffic mostly
turns into **cost and third-party limits**, not a crashed site. AI content is shared per playlist, so
1,000 users importing the same playlist cost one generation, but every *new* playlist costs one Gemini
call per video (Section 2 covers the limits that cap this).

- [ ] **Test transcripts from the production server right after the first deploy.** `youtube-transcript` works from a home connection, but YouTube often blocks transcript requests from cloud/datacenter IPs (Railway, Render, AWS). Then every video fails generation and quizzes stay on "Generating your quiz…". *Likely the first thing to break, even with no traffic.* If it's blocked: use a residential proxy or a paid transcript API.
- [ ] **YouTube Data API quota:** 10,000 units/day by default. Once it's used up, "Add course" and validation fail until midnight Pacific time. Watch usage in Google Cloud; request a quota increase if needed. Rate limits on `validate`/import (Section 2) protect it.
- [ ] **Gemini rate limits** (requests per minute/day, by billing tier): bursts of imports cause failures and retries. The `CANDIDATE_MODELS` fallback helps only up to a point; check the tier's limits and the quota errors on the admin page.
- [ ] **Supabase plan limits:** the free plan has a 500 MB database and pauses the project after a week of inactivity (site errors until you un-pause it). Its built-in email sender only sends a few emails per hour (custom SMTP, Section 1). Move to a paid plan before real launch.
- [ ] **Background generation shares the web server.** `generatePlaylistContent()` runs inside the same process that serves pages, one video at a time per playlist. Many simultaneous imports slow pages and make new courses wait a long time for quizzes. A restart or redeploy stops in-progress runs (stale `pending` claims are retried later, so content is only delayed). If load grows, move generation to a separate worker/queue.
- [ ] **Write load from active learners:** every open chapter sends `/api/study/heartbeat` and progress saves. Fine for hundreds of users; at thousands concurrent, check Supabase connection/CPU usage and consider batching heartbeats.
- [ ] **Single server = single point of failure.** The host restarts a crashed process, but you won't know about outages without error tracking and an uptime check (Section 8).

### Recommended launch order

1. **Google Cloud spend cap + budget alerts** on the Gemini/YouTube project (5 minutes; protects against the worst case).
2. **Limits (Section 2):** 3-course limit, playlist size cap, rate limits, per-user AI budget, `AI_GENERATION_ENABLED` kill switch.
3. **Ownership fixes (Section 3):** notes, progress, review.
4. **Remove prototype leftovers (Section 5)** and **rotate keys (Section 7)**.
5. **Deploy** to Railway/Render in the same region as Supabase, then immediately **test transcript fetching from the server** (above).
6. **Production auth setup (Section 1):** custom SMTP, Site URL/redirect URLs, Google OAuth consent screen → "In production".
7. **Monitoring (Section 8):** Sentry + uptime check.
8. **Privacy policy and account deletion (Section 9)** before inviting people beyond friends/testers.

---

### Launch-day minimum (if you need to go live fast)

Sections **2, 3, 5 and 7** done, plus the production part of Section 1. That means the 3-course
limit, rate limits and AI kill switch; ownership checks on notes, progress and review; the prototype
strip removed; keys rotated and restricted with Google Cloud spend caps; production URLs and SMTP in
Supabase. Everything else can follow shortly after.

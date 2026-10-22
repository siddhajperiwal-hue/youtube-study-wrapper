# Admin Page Specification: Study YouTube Wrapper (MVP)

**Platform:** Desktop Web  
**Scope:** Admin Dashboard (Phase 1: Essential Metrics, Financial Burn & Operational Health)  
**Route:** `/admin` (Restricted to Superadmin / Developer roles via Supabase Auth RLS)  
**Reference Documents:**
- [mvp.md](mvp.md)
- [ui-description.md](../design/ui-description.md)
- [backend-architecture.md](../architecture/backend-architecture.md)
- Mockup: [admin-page.html](../design/mockups/admin-page.html)

---

## 1. Purpose & Overview

The Admin Page provides the product owner and development team with a single, clear command center to monitor:
1. **User Growth & Daily Activity:** Signups, active learners, and streak completion.
2. **AI Consumption & Gemini Credits:** Token usage, cost per imported playlist, and remaining API credit balance.
3. **Server & Infrastructure Expenses:** Hosting, database limits, background worker quotas, and YouTube Data API limits.
4. **Content & System Quality:** Content generation queue health, missing transcripts, and user-reported questions.

> **Design Principle:** Keep it simple, numerical, and actionable for MVP. Avoid over-engineered predictive charts or deep cohort cohorts for now; focus on real-time numbers, operational safety, and cost control.

---

## 2. Layout Structure & Navigation

```
┌────────────────────────────────────────────────────────────────────────┐
│ Top Bar: Admin Console | Environment (Prod/Dev) | Time Filter | Refresh │
├────────────────────────────────────────────────────────────────────────┤
│ Section 1: At-a-Glance KPI Scorecards (Users, Gemini $, Server $, Hours)│
├────────────────────────────────────────────────────────────────────────┤
│ Section 2: Gemini AI Credits & Generation Pipeline                     │
├────────────────────────────────────────────────────────────────────────┤
│ Section 3: Server & Infrastructure Cost Monitor                        │
├────────────────────────────────────────────────────────────────────────┤
│ Section 4: User Growth & Habit / Streak Analytics                      │
├────────────────────────────────────────────────────────────────────────┤
│ Section 5: Content Quality & Moderation (Flagged Questions & Jobs)     │
├────────────────────────────────────────────────────────────────────────┤
│ Section 6: Reports & Feedback Inbox (question/flashcard reports + user │
│            feedback, with status workflow)                             │
└────────────────────────────────────────────────────────────────────────┘
```

### Top Bar & Global Controls
- **Page Title:** `Admin Console`
- **Environment Indicator:** Badge showing `Production` or `Staging`.
- **Global Time Range Filter:**
  - `Today (UTC)` (Default)
  - `Last 7 Days`
  - `Last 30 Days`
  - `All Time`
- **Auto-Refresh Toggle:** `Off` / `30s` / `1m` / `5m` + Manual `Refresh Now` button.
- **Quick Links:** Link back to User App (`/`) | Supabase Studio | Vercel Console | PostHog.
- **Inbox badge:** `🔔 7 new` = count of `new` items in the Reports & Feedback Inbox (Section 6); clicking scrolls to it.

---

## 3. Section Specifications

### 3.1 Section 1: At-a-Glance Top KPI Cards
Four primary summary cards displayed prominently across the top fold:

| Card Title | Primary Metric | Sub-text / Trend Indicator | Data Source |
| :--- | :--- | :--- | :--- |
| **Total Registered Users** | `1,248` | `+34 today` (vs yesterday) | `profiles` table count |
| **Gemini AI Spend (Current Month)** | `$14.80 / ₹1,332` | `~34.2M tokens` consumed | Gemini API Billing / `generation_jobs` |
| **Est. Monthly Server Cost** | `$45.00 / ₹4,050` | Fixed tiers: Supabase Pro + Vercel Pro | Fixed billings + usage add-ons |
| **Total Active Study Hours** | `412.5 hrs` | `84 hrs logged today` | Sum of `daily_study.active_seconds` |

---

### 3.2 Section 2: Gemini Credits & AI Usage

Because AI question generation is the core variable cost of the application, this section tracks token consumption, costs, and cache efficiency.

#### Key Metrics & Cards:
1. **Total Gemini API Cost (Filtered Range):**
   - Dollar & Rupee conversion (e.g., `$14.80` / `₹1,332`).
2. **Total Tokens Processed:**
   - **Input Tokens:** Tokens from video analysis & transcript parsing (e.g., ~470k tokens/hour of video).
   - **Output Tokens:** Generated questions, answers, explanations, and flashcards.
3. **Global Cache Savings Rate:**
   - Displays the percentage of course imports that were **100% free** because another user had already imported that playlist (e.g., `42% Cache Hit Rate — Saved ~$11.20`).
4. **Average Cost per Imported Course:**
   - Average Gemini spend per unique YouTube playlist imported (e.g., `~$0.35 / playlist`).

#### Pipeline Status Breakdown:
A compact status badge row showing background question generator health:
- `Completed Jobs:` 890 videos (97.2%)
- `In Queue / Processing:` 12 videos (1.3%)
- `Failed / Retrying:` 4 videos (0.4%)
- `Unavailable (No Transcript/Restricted):` 10 videos (1.1%)

---

### 3.3 Section 3: Server & Third-Party Infrastructure Cost Monitor

Tracks recurring fixed monthly bills and API quota consumption to prevent unexpected overages or service outages.

| Service | Plan / Fixed Cost | Current Usage / Quota Status | Warning Threshold |
| :--- | :--- | :--- | :--- |
| **Vercel** (Frontend & Route Handlers) | **Pro Plan:** $20/mo (~₹1,800) | Bandwidth: `18 GB / 1 TB`<br>Edge Invocations: `120k / 1M` | Alert at > 80% bandwidth |
| **Supabase** (Postgres DB, Storage & Auth) | **Pro Plan:** $25/mo (~₹2,250) | Database Size: `180 MB / 8 GB`<br>MAU: `1,248 / 100,000` | Alert at > 75% storage |
| **YouTube Data API v3** | **Free Tier:** $0.00 | `2,400 / 10,000` quota units used today | **Warning at > 8,000 units** (Import throttling) |
| **Inngest / BullMQ** (Background Worker) | **Free / Starter:** $0.00 | `8,200 / 50,000` job steps this month | Alert at > 40,000 steps |
| **PostHog & Sentry** (Telemetry & Errors) | **Free Tiers:** $0.00 | PostHog Events: `240k / 1M`<br>Sentry Errors: `1,100 / 5k` | Safe |

**Total Estimated Monthly Burn:** `~$45.00 base + ~$15.00 Gemini = ~$60.00 / month (≈ ₹5,400/month)`.

---

### 3.4 Section 4: User Growth & Habit Analytics

Simple metrics measuring product adoption, streak consistency, and user engagement without needing complex external dashboards.

#### User Counts:
- **Total Signed-Up Users:** All accounts created in Supabase Auth.
- **Daily Active Learners (DAU):** Users with at least 1 heartbeat event or video session today.
- **Weekly Active Learners (WAU):** Users active within the last 7 calendar days.
- **DAU / WAU Ratio (Stickiness):** Healthy target is > 20%.

#### Habit & Streak Health:
- **Active Streaks Today:** Count of users who hit the minimum 20-minute video watch requirement today.
- **Average Daily Watch Time:** Mean active study minutes per active learner (e.g., `38.4 mins/user`).
- **Streak Distribution (Simple Breakdown):**
  - `1 - 3 Days:` 60% of active users
  - `4 - 7 Days:` 25% of active users
  - `8 - 30 Days:` 12% of active users
  - `30+ Days:` 3% of active users

#### Content Consumption Counts:
- **Total Playlists in Database:** Unique imported YouTube playlists.
- **Total User Course Enrolments:** Total rows in `courses`.
- **Top Enrolled Playlists:** Simple top 5 list (Playlist Title, Channel Name, Enrolled Learners count).
- **Chapter Completion Breakdown:**
  - `Completed with Quiz:` (Users who finished video + submitted quiz)
  - `Completed without Quiz:` (Users who finished video + skipped quiz)
  - `Quizzes Disabled by User:` (Users who toggled quiz setting off)

---

### 3.5 Section 5: Content Quality & Moderation (Actionable MVP Queue)

A practical table allowing the admin to inspect issues flagged by users or system failures.

#### 1. Reported AI Questions Queue
> Superseded by the full inbox in **Section 6** (reports + general feedback, with statuses). Keep this
> table only as a compact "top flagged items" summary, or drop it in favour of Section 6.

When learners click **"Report Question"** on the Dashboard Quick Quiz or Chapter Quiz:
- Columns:
  - `Date / Time`
  - `Course / Video Name`
  - `Question Text`
  - `User Reason / Feedback`
  - `Report Count` (Flagged multiple times by different users)
  - `Action Buttons:` [Mark Valid / Dismiss] | [Regenerate Question] | [Delete Question]

#### 2. Failed Video Generation Logs
Videos that failed to process through Gemini (e.g., rate limits, missing captions, age restrictions):
- Columns:
  - `YouTube Video ID & Title`
  - `Error Reason` (e.g., `RateLimitExceeded`, `NoTranscriptAvailable`, `VideoRestricted`)
  - `Attempts:` (e.g., `3/3`)
  - `Action Buttons:` [Retry Job] | [Mark as "Quiz Unavailable"]

---

### 3.6 Section 6: Reports & Feedback Inbox

One place where the admin receives **everything users send**: reports on AI-generated questions and
flashcards, and general feedback (bugs, ideas, complaints). Each item moves through a simple status
workflow so nothing is lost or handled twice.

#### Where items come from (user side)
| Source | Entry point in the app | Item type |
| :--- | :--- | :--- |
| Report a question | "⚑ Report" on Dashboard Quick Quiz, Course Review tab, Learning page quiz & recall overlays | `question` report |
| Report a flashcard | "⚑ Report" on Dashboard Recall Flashcard and Course Review flashcards | `flashcard` report |
| General feedback | **New:** "Send Feedback" item in the dashboard profile menu (and a small link on the learning page): type (Bug / Idea / Other), message, optional "include the page I'm on" | `feedback` |

#### Inbox layout
- **Tabs:** `All` · `Question & Flashcard Reports` · `Feedback`, each with a count of `new` items.
- **Filters:** Status (`New` default, `In Review`, `Resolved`, `Dismissed`, `All`), time range (global filter), course.
- **Reports are grouped per item:** one row per reported question/flashcard with the **report count**
  and the latest reason; expanding the row shows every individual report (category, reason, date, user).
- **Row content (reports):** Date of latest report · Course / Chapter · Question text (or flashcard front) ·
  Categories (e.g. `Incorrect Answer ×3`, `Typo ×1`) · Count · Status · Actions.
- **Expanded view (reports):** full question with all options, the stored correct answer and explanation
  (or flashcard front/back), so the admin can judge without opening the database.
- **Row content (feedback):** Date · Type badge (`Bug` / `Idea` / `Other`) · Message (clamped, full text on
  expand) · Page it was sent from · User · Status · Actions.

#### Actions
| Item | Action | Effect |
| :--- | :--- | :--- |
| Question / flashcard report | **Hide item** | Sets the question/flashcard `status = 'removed'` (it stops appearing anywhere) and marks all its reports `resolved`. |
| | **Keep (dismiss)** | Marks the reports `dismissed`; the item stays live. |
| | **Edit** *(optional for MVP)* | Inline-edit text / options / correct answer / explanation, then resolve. |
| | **Regenerate** *(post-MVP)* | Generation currently works per video, not per question, so defer. |
| Feedback | **Mark in review / Resolve / Dismiss** | Status change. |
| Any | **Admin note** | Private note stored on the item (e.g. "fixed in v1.2"). |

- Hiding a question must keep the deck and the quiz working (it simply has one question fewer).
- **Auto-hide rule (optional):** if an item is reported by 3 or more different users, set it to `flagged`
  (hidden from learners) until the admin reviews it.

#### Data model changes
The current `question_reports` table can't support this inbox:
- **Flashcard reports are lost today:** the app sends flashcard ids to `POST /api/questions/[id]/report`, but
  `question_reports.question_id` references `questions(id)`, so the insert fails the foreign key and the
  report is silently dropped.
- There is no status column, so nothing can be marked as handled.

Proposed tables (replace `question_reports`; migrate its rows with `item_type = 'question'`):

```sql
-- Reports on AI-generated study items
CREATE TABLE public.content_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_type TEXT NOT NULL CHECK (item_type IN ('question', 'flashcard')),
  item_id UUID NOT NULL,                       -- questions.id or flashcards.id (validated in the API)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  context TEXT CHECK (context IN ('dashboard', 'review', 'chapter_quiz', 'recall')),
  category TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved', 'dismissed')),
  admin_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (item_type, item_id, user_id)         -- one report per user per item (re-reporting updates it)
);

-- General product feedback
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'idea', 'other')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 3 AND 4000),
  page_url TEXT,                               -- only if the user ticks "include the page I'm on"
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved', 'dismissed')),
  admin_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### API (every admin route checks the admin role on the server; never rely on hiding the page)
- `POST /api/reports` `{ itemType, itemId, courseId?, context, category, reason }`: replaces
  `/api/questions/[id]/report`; verifies the item exists for its type; rate-limited per user.
- `POST /api/feedback` `{ type, message, pageUrl? }`: rate-limited (e.g. 5 per hour per user).
- `GET /api/admin/inbox?tab=&status=&courseId=&range=`: grouped reports + feedback, newest first, paginated.
- `PATCH /api/admin/reports/[itemType]/[itemId]` `{ action: 'hide' | 'keep' | 'note', note? }`
- `PATCH /api/admin/feedback/[id]` `{ status?, note? }`

#### MVP acceptance
- A report on a question **and** on a flashcard both appear in the inbox after one refresh.
- Hiding a reported question removes it from the dashboard quiz, the review tab and the chapter quiz.
- Feedback sent from the profile menu appears under `Feedback`, with the page it came from (if ticked).
- A non-admin account gets **403** from every `/api/admin/*` route.

---

## 4. Simple Database Queries (Reference for Backend Implementation)

For quick development, these metrics can be queried directly via Supabase route handlers or an edge function:

```sql
-- 1. Total Registered Users
SELECT COUNT(*) AS total_users FROM profiles;

-- 2. Today's Active Learners (Logged watch time today)
SELECT COUNT(DISTINCT user_id) AS active_today 
FROM daily_study 
WHERE local_date = CURRENT_DATE AND active_seconds > 0;

-- 3. Today's Streak Qualifiers (>= 20 minutes)
SELECT COUNT(DISTINCT user_id) AS qualified_streak_today 
FROM daily_study 
WHERE local_date = CURRENT_DATE AND active_seconds >= 1200;

-- 4. Total Playlists & Global Videos Stored
SELECT 
  (SELECT COUNT(*) FROM playlists) AS total_playlists,
  (SELECT COUNT(*) FROM videos) AS total_videos,
  (SELECT COUNT(*) FROM questions) AS total_questions;

-- 5. Pending Reported Questions
SELECT qr.id, q.text, qr.reason, qr.created_at, v.title AS video_title
FROM question_reports qr
JOIN questions q ON qr.question_id = q.id
JOIN videos v ON q.video_id = v.id
ORDER BY qr.created_at DESC
LIMIT 10;
```

---

## 4.5 Implementation Plan (agreed 2026-10-22, to execute after login ships)

**Status (2026-10-22): Phases 1–3 built** (`/admin`): users, activity, 30-day trends, AI token spend vs budget, generation health, learning stats, DB size & plan costs, reports inbox (questions + flashcards), feedback inbox, editable settings. Requires running `app/supabase/migrations/20261022_admin_page.sql` once. Phases 4 (live Supabase/hosting usage APIs) and 5 (revenue, needs payments) remain.

**Prerequisites**
- Real login (no `DEFAULT_USER_ID` guest fallback). Until then every guest is the same user, so user counts are meaningless.
- Admin access: decide who is an admin (`ADMIN_EMAILS` env var or a `role` on `profiles`) and check it server-side in every `/api/admin/*` route. These routes use the service-role key across all users, so they must never fall back to a guest user.

**Where each metric comes from**

| Metric | Source | Notes |
| :--- | :--- | :--- |
| Users: online now / DAU / WAU | `study_sessions`, `daily_study`, study heartbeat (online now = heartbeat in the last ~2 min) | Own DB |
| Signups / total users | `auth.users` via service role (or `profiles`) | Own DB |
| Gemini spend | Log `usageMetadata` token counts + model per attempt in `generation_jobs`; cost = tokens × model price table | Small change in `src/lib/gemini.ts` |
| Gemini "credits left" | No Google API returns remaining balance. Use a manually entered monthly budget minus logged spend; flag 429 `RESOURCE_EXHAUSTED` errors from `generation_jobs` as "quota hit"; real billing needs a Cloud Billing → BigQuery export | |
| Generation health | `video_content.status` + `generation_jobs` (status, error) | Already recorded |
| Feedback | `question_reports` (exists) + new `feedback` table and in-app "Send feedback" form | |
| Database cost | Fixed plan price (entered manually) + DB size via a `pg_database_size` SQL function; exact bill via Supabase Management API (access token) | |
| Server cost | Fixed plan price (entered manually); usage via the host's API (e.g. Vercel) | Depends on deployment |
| Revenue | Needs payments first (Stripe / Razorpay); webhooks fill a `payments` table | Not possible yet |

**Phases**
1. **Phase 1 — existing data:** `/admin` page behind admin check; one `/api/admin/overview` route (all queries in one `Promise.all` wave). Users (signups, online now, DAU/WAU), study hours, courses/playlists, generation health with failure reasons, question-report inbox. Fixed monthly costs (Supabase, hosting, Gemini budget) stored in an `admin_settings` table editable on the page.
2. **Phase 2 — Gemini cost tracking:** add token/model columns to `generation_jobs`, record them per attempt; show month-to-date spend, cost per playlist, budget remaining, quota-error alert.
3. **Phase 3 — feedback:** `feedback` table + in-app form; admin inbox with new / seen / resolved status (Section 6).
4. **Phase 4 — live infra usage:** Supabase Management API + hosting provider API.
5. **Phase 5 — revenue:** after payments exist — MRR / all-time revenue, paying users, revenue minus costs.

---

## 5. Future Expansion (Deferred to Post-MVP)

When ready to drift into complex analytics, the admin page can add:
1. **Retention Cohorts:** Day 1, Day 7, Day 30 learner retention matrices.
2. **Quiz Item Difficulty Analysis:** Automatic flagging of questions with < 20% or > 95% pass rates.
3. **Pomodoro Longevity Correlation:** Comparing study duration of break-takers vs break-skippers.
4. **Per-Course Drop-off Funnel:** Identifying exact chapters where learners abandon a playlist.
5. **Dynamic Cost Projections:** Forecasting month-end AI bills based on user growth rate.

# Study YouTube Wrapper: Backend Architecture (MVP)

Desktop web app, English only. Covers the Dashboard, Course page, Learning page and Add Course modal from your UI description, plus the analytics events from your MVP file.

## 1. Design principles

1. **Playlist content is global; user progress is private.** Videos, question banks, summaries and links are generated once per playlist and shared. Progress, notes, answers and streaks belong to one user.
2. **Generate once, serve forever.** AI work happens in a background queue, never while the user waits. The app only reads stored results.
3. **The question generator doesn't care where its input comes from.** It takes "content about a video" so you can swap the source (Gemini watching the video, a transcript API, a pasted transcript) without touching the rest of the app.
4. **Keep it boring.** One language (TypeScript), one database (Postgres), one queue. Add pieces only when a feature needs them.

## 2. Recommended stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | Next.js (React, TypeScript) | One codebase for pages and API |
| Notes editor | TipTap | Custom timestamp element, Markdown export |
| Player | YouTube IFrame Player API | Pause, seek, current time, state events |
| API | Next.js route handlers (REST, JSON) | No separate server to run |
| Database + auth | Supabase (Postgres, Auth, Row Level Security) | Login and per-user data rules built in |
| Background jobs | Inngest (or BullMQ with Redis) | Retries, rate limiting, multi-step jobs |
| AI | Gemini API (video by YouTube URL) for questions, flashcards, summary | See the Gemini section below |
| Analytics | PostHog | Matches your event list, funnels and retention built in |
| Errors | Sentry | Catches failures in jobs and API |

These are suggestions. Every piece can be swapped, as long as you keep the same boundaries.

## 3. System diagram

```
 Browser (Next.js app)
   |  Dashboard / Course / Learning pages
   |  YouTube IFrame player, TipTap notes, timers, overlays
   v
 API layer (Next.js route handlers)  --->  Auth (Supabase Auth, JWT)
   |         |                              
   |         +--> YouTube Data API  (playlist + video metadata)
   |         +--> PostHog           (product events)
   v
 Postgres (Supabase)  <------------------------+
   ^                                            |
   |                                    Background worker (Inngest)
   +-- reads/writes questions, summaries -------+
                                                +--> Gemini API (watches video, returns JSON)
                                                +--> fallback sources (transcript API, pasted text)
```

## 4. Data model

### 4.1 Global content (shared by all users)

| Table | Key columns | Notes |
| --- | --- | --- |
| `playlists` | id, youtube\_playlist\_id (unique), title, video\_count, last\_synced\_at | One row per playlist, whoever imports it first |
| `videos` | id, playlist\_id, youtube\_video\_id, position, title, duration\_sec, description, embeddable, status (`ok`, `private`, `deleted`, `not_embeddable`) | Description kept in full for the Resources tab |
| `video_resources` | video\_id, url, label, domain, category (`github`, `drive`, `pdf`, `web`) | Extracted from the description when the video is imported |
| `video_content` | video\_id, summary, topics (json), source (`gemini_url`, `transcript_api`, `pasted`, `none`), status (`pending`, `ready`, `failed`, `unavailable`), model, prompt\_version, generated\_at | One row per video |
| `questions` | id, video\_id, topic, text, options (json, 4), correct\_index, explanation, difficulty, timestamp\_sec, status (`active`, `flagged`, `removed`) | The question bank, about 30 per video |
| `flashcards` | id, video\_id, topic, front, back, status | Same idea as questions |
| `question_reports` | id, question\_id, user\_id, reason, created\_at | Feeds the Report button |

### 4.2 Per-user data (private, protected by Row Level Security)

| Table | Key columns | Notes |
| --- | --- | --- |
| `profiles` | user\_id, timezone, created\_at | Timezone decides when "today" starts |
| `courses` | id, user\_id, playlist\_id, name, quizzes\_enabled, flashcards\_enabled, deadline\_date (nullable), created\_at, last\_accessed\_at | The user's enrolment in a playlist |
| `chapter_progress` | course\_id, video\_id, status (`not_started`, `completed`, `completed_without_quiz`), last\_position\_sec, watched\_seconds, completed\_at | One row per chapter. Never downgrade a completed status when settings change |
| `quiz_attempts` | id, course\_id, video\_id, started\_at, completed\_at, skipped, score | One per quiz attempt |
| `answers` | id, attempt\_id (nullable), user\_id, question\_id, is\_correct, time\_taken\_sec, context (`chapter_quiz`, `recall`, `dashboard`, `review`), answered\_at | Powers recall selection and accuracy stats |
| `notes` | course\_id, video\_id, content (TipTap JSON), updated\_at, version | One document per chapter, or one per course (see open decisions) |
| `daily_study` | user\_id, local\_date, active\_seconds, updated\_at | One row per day, used for the streak |
| `study_sessions` | id, user\_id, course\_id, started\_at, ended\_at, active\_seconds | For retention and recall gap analysis |
| `bookmarks` | user\_id, question\_id | "Review Later" items |

### 4.3 System

| Table | Key columns |
| --- | --- |
| `generation_jobs` | id, video\_id, source\_tried, status, attempts, error, started\_at, finished\_at |

## 5. Core flows

### 5.1 Add Course (import)

1. Browser sends the playlist URL to `POST /api/courses/validate`. Server parses the playlist ID, rejects single-video links with the message from your spec, and returns the playlist title.
2. Browser sends `POST /api/courses` with name, toggles and optional deadline.
3. Server checks whether the playlist already exists in `playlists`.
   - **Exists:** reuse it. Create the course row and chapter rows. Done in seconds.
   - **New:** call the YouTube Data API (`playlistItems.list`, 50 per page, then `videos.list` for duration, description, embeddable and status). Upsert `playlists` and `videos`, extract links into `video_resources`, then queue generation jobs.
4. Server returns right away. The Dashboard shows the course with a "preparing questions" state per chapter.

YouTube listing calls cost about 1 quota unit each against a default 10,000 per day, so imports are cheap.

### 5.2 Content generation pipeline (background)

One job per video. Order the jobs so the first 3 chapters finish first, then the rest.

1. **Check cache.** If `video_content.status = ready` for this prompt version, stop.
2. **Pick the question count.** About one question per 1-2 minutes of video, capped at 30. Use `duration_sec`.
3. **Try sources in order:**
   1. Gemini with the YouTube URL (low media resolution, JSON output).
   2. Paid transcript API, then Gemini or another model on the text.
   3. Title, description and chapter timestamps for lighter questions.
   4. Mark `unavailable` and show "Quiz unavailable for this video".
4. **One call returns everything:** summary, topics, questions, flashcards.
5. **Validate in code.** Reject items with missing fields, not 4 options, an out-of-range `correct_index`, or near-duplicate question text. If too many fail, retry once for the missing number.
6. **Save** in one database transaction, with `source`, `model` and `prompt_version`.
7. **On failure:** retry with backoff, then mark `failed` and log to Sentry.

Rules for the worker: limit concurrency to stay under the Gemini rate limit, make jobs idempotent (running twice never creates duplicate questions), and record `prompt_version` so you can regenerate a bank when you improve the prompt.

### 5.3 Learning page

- **Load:** `GET /api/courses/:id/chapters/:videoId` returns video metadata, last position, notes and whether a quiz is ready.
- **Progress save:** the browser sends the current position every 15 to 30 seconds and on pause or leave. Store `last_position_sec` and `watched_seconds`.
- **Chapter complete:** the server decides, not the browser. Quizzes off: complete once about 90% is actually watched. Quizzes on: complete once the quiz is submitted or skipped. Return the next chapter.
- **Quiz:** `GET .../quiz` returns a random set from the bank, avoiding questions the user saw recently. `POST .../quiz/submit` stores the answers and returns the score with explanations.
- **Resume recall:** if `now - last_accessed_at` is 24 hours or more, `GET /api/courses/:id/recall` picks 1-2 questions from completed chapters, preferring ones answered wrong before.
- **Break timer:** runs in the browser only. It sends events (`break_prompted`, `break_started`, `break_skipped`, `break_completed`) to PostHog. Nothing needs storing in your database.

### 5.4 Study streak

- The browser counts active seconds only while the video is playing and the tab is focused. It sends a batched update about every 60 seconds and when the tab closes, instead of a request every 30 seconds.
- The server adds the seconds to `daily_study` for the user's local date (using `profiles.timezone`).
- A day counts when `active_seconds` reaches the threshold (20 minutes in your UI description; your MVP file says 10-20, so pick one and keep it as a single config value).
- **Streak = consecutive qualifying days ending today or yesterday.** Calculate it when reading rather than storing a counter, so a corrected record fixes the streak automatically.
- Later: a "freeze" for sick days is just a flag on a date.

### 5.5 Dashboard

- **Priority Course Card (Card 1 - Last Played Course Rule):** One query selecting the single course where a video was last played (`ORDER BY last_accessed_at DESC LIMIT 1`). Updates every time video playback/progress is saved, ensuring Card 1 dynamically shifts to the active course rather than staying the same course every time.
- **Course list:** Query joining `courses` and `chapter_progress`. Supports user-selectable sorting: Priority sort (courses with deadlines first by `pending minutes / days remaining`, then by `last_accessed_at`), Recently played (`last_accessed_at DESC`), Completion %, and Alphabetical.
- **Quick Quiz card (Completed Chapters Only & Strictly Non-Repeating):**
  - Fetches 1 question sampled strictly from chapters the user has completed across **any** enrolled course (`chapter_progress.is_completed = true`).
  - Chapters currently in progress or untouched are 100% excluded.
  - Client sends `?exclude_ids=id1,id2,...` (or server uses session memory) so **questions never repeat**.
  - Returns `{ question, remaining_pool_count, is_exhausted: boolean }`. When pool is exhausted, the UI presents a completed deck screen with a manual reset option.
- **Recall card (Completed Chapters Only & Strictly Non-Repeating):**
  - Fetches 1 flashcard strictly from chapters the user has completed across **any** enrolled course (`chapter_progress.is_completed = true`).
  - Upcoming/uncompleted chapters are never shown.
  - Client sends `?exclude_ids=...` so **flashcards never repeat**. Returns `{ flashcard, remaining_pool_count, is_exhausted: boolean }`.
- Neither card writes to `daily_study`.

### 5.6 Notes

- Autosave with a debounce of about 1-2 seconds: `PUT /api/notes/:courseId/:videoId` with the TipTap JSON and the last known `version`.
- If the version is behind (second tab open), return a conflict and let the client reload. Last-write-wins is acceptable at MVP.
- Timestamps are stored inside the document as a node holding `{videoId, seconds}`. The editor decides whether a click seeks or asks for confirmation, based on the active chapter.
- **Export:** generate Markdown in the browser from the stored JSON. The compiled document is every chapter's notes joined in order, so no extra table is needed.
- Track only metadata (`char_length`, `has_timestamp`), never note content.

### 5.7 Playlist re-sync

Run when a course is opened, at most once per day per playlist. Add new videos, mark removed or private ones, and never regenerate questions that already exist. Users keep their progress on chapters that disappear.

## 6. API summary

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/courses/validate` | Check playlist URL, return title |
| POST | `/api/courses` | Create course (and import if new) |
| GET | `/api/courses` | Dashboard list with progress |
| GET / PATCH / DELETE | `/api/courses/:id` | Course page, settings, delete |
| GET | `/api/courses/:id/chapters?cursor=` | Chapter list, 25 per batch |
| GET | `/api/courses/:id/resources` | Links grouped by chapter |
| GET | `/api/courses/:id/review` | Revision questions and flashcards |
| GET / PUT | `/api/notes/:courseId/:videoId` | Read and autosave notes |
| GET | `/api/courses/:id/notes/export` | Compiled notes |
| POST | `/api/progress` | Position and watched seconds |
| POST | `/api/study/heartbeat` | Batched active seconds |
| GET / POST | `.../quiz`, `.../quiz/submit` | Chapter quiz |
| GET | `/api/courses/:id/recall` | Resume recall questions |
| GET | `/api/dashboard/quick-quiz`, `/api/dashboard/recall-card` | Dashboard cards |
| POST | `/api/questions/:id/report` | Report a bad question |
| GET | `/api/streak` | Current streak and today's minutes |

All routes need a logged-in user, validate input with a schema library (such as Zod), and rate-limit anything that costs money or writes often.

## 7. Security and privacy

- **Row Level Security** on every per-user table: users can only read and write their own rows. Global tables are read-only for users, writable only by the worker with a server-side key.
- API keys (YouTube, Gemini, PostHog server key) live only in server environment variables.
- Deleting a course removes `courses`, `chapter_progress`, `notes`, `answers` and `quiz_attempts` for that user through cascading deletes. Global content stays, since other users share it.
- Account deletion removes all rows for that user.
- Analytics events carry IDs and counts only. No note text, ever.

## 8. Analytics events

Send from the browser to PostHog using the event names in your MVP file: `quiz_shown`, `quiz_started`, `quiz_skipped`, `question_answered`, `quiz_completed`, `note_created`, `note_edited`, `compiled_doc_viewed`, `compiled_doc_exported`, `focus_block_completed`, `break_prompted`, `break_started`, `break_skipped`, `break_completed`, `recall_shown`, `recall_started`, `recall_skipped`, `recall_question_answered`, `recall_completed`, `deadline_set`, `deadline_changed`, `deadline_met`, `deadline_missed`, `priority_course_clicked`.

Keep the database tables for things the product needs to function (progress, answers, daily minutes). Use PostHog for measuring whether features get used.

## 9. Failure and edge cases

| Case | Handling |
| --- | --- |
| Single-video URL | Rejected in `validate` with the spec message |
| Private or deleted video | `videos.status` set, flagged in the chapter list, skipped in autoplay |
| Not embeddable | Flag it and link out to YouTube instead of the player |
| No usable content for questions | `video_content.status = unavailable`, show the "Quiz unavailable" message |
| Generation failed | Retry, then `failed`; chapter still works without a quiz |
| Large playlist (100+) | Paginate the API fetch, lazy-load 25 chapters, generate the first 3 chapters first |
| Quizzes turned off mid-course | Never change existing `completed` statuses |
| User in a new timezone | Store the date used at write time; don't recompute old days |
| Video ad interrupts playback | Don't count ad time as active; rely on player state events |

## 10. Cost model

Exact prices change, so work from these inputs and check the current price pages.

- **Gemini:** about 100 tokens per second of video at low resolution plus 32 for audio, so a one-hour video is roughly 470,000 input tokens, plus a few thousand output tokens for 30 questions. Cost per video = tokens times the current per-token price. Caching per playlist means each video is processed once, no matter how many users.
- **Hosting (rough, check current plans):** Supabase Pro about $25 (≈ ₹2,250) per month and Vercel Pro about $20 (≈ ₹1,800) per month, at roughly ₹90 to the dollar. Free tiers are enough to build and test.
- **YouTube Data API:** free within the default quota.
- **PostHog and Sentry:** free tiers cover an early product.

## 11. Build order

1. Auth, `courses`, `playlists`, `videos`. Import via YouTube Data API. Dashboard and Course page with progress.
2. Learning page: player, progress saving, chapter completion.
3. Notes with autosave and export.
4. Break timer, heartbeat and streak.
5. Generation pipeline and quiz overlay. Test Gemini on 20 real playlists before building more UI around it.
6. Resume recall, Dashboard cards, Review tab, Report button.
7. Analytics events throughout, added as each feature ships rather than at the end.

## 12. Open decisions

1. **Notes structure:** one continuous document per course (UI description) or one page per chapter (your Learning page spec). The `notes` table supports either, but pick before building the editor.
2. **Streak threshold:** 10, 15 or 20 minutes.
3. **Completion rule:** 90% watched versus 100% watched. I recommend 90%.
4. **Shared question banks:** storing AI content derived from other people's videos and sharing it across users is a grey area. Get proper advice before launching publicly.
5. **YouTube player overlays:** YouTube's API rules restrict placing elements in front of the embedded player. The safest design is to pause the video and replace the player area with your panel. Read the current policy before building the overlays.

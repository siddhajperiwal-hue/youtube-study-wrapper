# MVP Specification: Study YouTube Wrapper

**Scope:** Minimum Viable Product (Desktop Only)  
**Document:** MVP  
**Reference Document:** [ui-description.md](file:///c:/Users/siddh/OneDrive/Desktop/siddhaj/youtube%20wrapper%20app/UI%20UX/UI%20DESCRIPTION.md)  

---

## 1. Core In-Scope Features & Telemetry

### 1.1 Course Organization & Progress Tracking
- **Function:** Centralized dashboard holding all enrolled YouTube playlists, tracking completion progress and deadlines.

### 1.2 End-of-Chapter Quizzes & Flashcards
- **Function:** Active recall gate at the end of each chapter (1 video = 1 chapter). Formats restricted strictly to **MCQs** and **Flashcards**. (Future toggle: post-Pomodoro quizzes).
- **Events to Collect:**
  - `quiz_shown`, `quiz_started`, `quiz_skipped`
  - `question_answered`: `question_id`, `is_correct`, `time_taken_seconds`
  - `quiz_completed`: `final_score`
  - *(Later: `quiz_toggle_changed`)*
- **Core Metrics:** Attempt rate (`started / shown`), skip rate, average score per chapter, completion correlation (quiz takers vs. skippers).

### 1.3 In-Session Notes Pad & Compiled Document
- **Function:** Synchronized rich text pad alongside video playback. Optional click-to-anchor `[MM:SS]` timestamps. Auto-compiled into an exportable single course document.
- **Events to Collect (Privacy-preserving: metadata only, no note content):**
  - `note_created`: `char_length`, `has_timestamp`
  - `note_edited`
  - `compiled_doc_viewed`, `compiled_doc_exported`
- **Core Metrics:** % sessions with $\ge 1$ note, notes per video, timestamp adoption rate, compiled document export rate.

### 1.4 Scientific Pomodoro Breaks
- **Function:** Skippable break timer after a focus block (default: 20 min). Prompts the learner to step away, walk, and rest eyes.
- **Events to Collect:**
  - `focus_block_completed`
  - `break_prompted`, `break_started`, `break_skipped`, `break_completed`
  - *(Optional: 1-tap "Was this useful?" feedback)*
- **Core Metrics:** Break skip vs. completion rate, average focus block length, study longevity correlation.

### 1.5 Study Streak
- **Function:** Daily habit tracker incentivizing consistency.
- **Events to Collect:**
  - `study_sessions`: `start_time`, `end_time`, `active_minutes`, `timezone`
  - Heartbeat event emitted every 30 seconds while video is playing and browser tab is focused.
  - Streak qualification threshold: minimum 10–20 active minutes per day.
- **Core Metrics:** Streak distribution curve, Day 1 / 7 / 30 retention, re-engagement rate after broken streak.

### 1.6 Resume Recall Protocol
- **Function:** Refresher questions drawn from earlier completed quizzes shown when resuming a course after an absence.
- **Events to Collect:**
  - `recall_shown`, `recall_started`, `recall_skipped`
  - `recall_question_answered`: `days_since_last_session`, `question_id`, `is_correct`
  - `recall_completed`
- **Core Metrics:** Retention curve accuracy over time; validates long-term knowledge consolidation.

### 1.7 Course Deadlines & Dynamic Priority Sorting
- **Function:** Optional deadline on courses. Top-fold priority card dynamically selects the course where a video was last played on (`last_accessed_at`), while the dashboard library sorts courses by priority (pending work vs. deadline proximity) or recent activity.
- **Events to Collect:**
  - `deadline_set`: `days_remaining`
  - `deadline_changed`, `deadline_met`, `deadline_missed`
  - `priority_course_clicked` (tracks if user opens the top-ranked recommendation)
- **Core Metrics:** % courses with deadlines, completion rate (with vs. without deadline), deadline hit rate, recommendation click-through.

---

## 2. Deferred Features (Post-MVP Roadmap)

1. **Fixed Course Time Scheduling:** Calendar time blocking / scheduling.
2. **AI Course Summaries:** Auto-generated chapter and full-course summary text.
3. **Full Spaced Repetition (SRS):** Automated multi-day SRS review intervals.
4. **Subject Burnout Reminder:** Automatic alert to switch subjects after 2 hours.
5. **Pre-Session Settle Ritual:** 2-minute calming/deep-breath onboarding.
6. **Social & Competition:** Study streak leaderboard, "Buddy Up" cohort study.
7. **Comprehensive Diagnostics:** Topic-level strengths/weaknesses analytics matrix.
8. **Curated Course Directory & Syllabus Mapper:** In-app YouTube course directory and exam syllabus mapping.
9. **Crowd Heatmap:** Visual highlight of the "most noted parts" of a video.

# UI Description: Study YouTube Wrapper (MVP)

**Platform:** Desktop only  
**Language:** English only  
**Scope:** Content, layout hierarchy, user flows, and functional rules (Visual styling to follow)  
**Target Audience:** AI Agents & Developers  

---

## 1. System Overview

A desktop web application designed to turn passive YouTube course watching into an active, classroom-like learning experience.

### Core Mechanisms
- **Active Recall:** End-of-chapter quizzes and return-session recall cards.
- **Contextual Note-Taking:** Timestamp-linked notes alongside video playback.
- **Structured Pacing:** Built-in Pomodoro/focus timer (default: 20 min study / 5 min break).
- **Habit Formation:** Daily study streak requiring active video watch time (minimum 20 minutes).

### Core Surface Areas (3 Pages + 1 Modal)
1. **Dashboard** (`/`)
2. **Course Page** (`/course/:id`)
3. **Learning Page** (`/course/:id/learn/:chapterId`)
4. **Add Course Modal** (Global overlay)

---

## 2. Global User Flows

```
[New User] ───────────────> Dashboard (Empty State) ──> Open Add Course Modal ──> Confirm ──> Dashboard (Populated)
[Normal Study Day] ───────> Dashboard ──────────────> Click "Resume" on Card ───────> Learning Page
[Review Day] ─────────────> Dashboard ──────────────> Click Course Card ───────────> Course Page ──> Review Tab / Learning Page
[Leaving / Exiting] ──────> Learning Page ──────────> Navigate back to Dashboard or Course Page (Stats & streak automatically update)
```

- **Add Course Trigger:** Accessible from both the Dashboard and the top-level app header at all times (not a one-time onboarding step).
- **Chapter Completion Moment:** Occurs automatically when a video ends and its quiz is either answered, skipped, or if no quiz exists. This triggers an immediate micro-reward (chapter checked off, progress updated, "Next Chapter" unlocked). There is no artificial "Start/Stop Session" button.

---

## 3. Page Specifications

### 3.1 Dashboard (`/`)
**Purpose:** Daily decision center for what to study, quick memory reactivation, and streak tracking.

#### Component Layout (Top-to-Bottom Priority):
1. **Header / Top Action Bar:**
   - App title/logo.
   - Global **"Add Course"** button.

2. **Top Engagement Cards (Side-by-side or stacked top priority):**
   - **Card 1 — Quick Quiz (Completed Chapters Only & Non-Repeating):**
     - Sourced **exclusively from previously completed chapters** across any enrolled course. Chapters in-progress or unstarted are strictly excluded.
     - **Strict No-Repeat Rule:** A question never repeats during the practice session. Cycling with "Next Question →" draws from unseen completed questions until the pool is exhausted (displaying an All Caught Up summary with manual deck reset).
     - Explicitly labels the **Topic Name**, **Chapter Number**, and **Source Course** above the question.
     - Option to submit answer with instant feedback (Botanical Green for correct, Terracotta Red for incorrect, with concise explanation).
     - Small **"Report Question"** button for inaccurate AI questions.
   - **Card 2 — Recall Card (Flip Card — Completed Chapters Only & Non-Repeating):**
     - Sourced **exclusively from previously completed chapters** across any enrolled course.
     - **Strict No-Repeat Rule:** Flashcards never repeat during the review session. Advancing via "Got it ✓" or cycling moves to the next unvisited completed flashcard.
     - Front: Prompts active recall with a specific question (e.g., *"Can you explain what a decorator does and when you would use one?"*).
     - Must explicitly state the **Course Name**, **Chapter**, and **Topic/Language Domain** to prevent cross-topic ambiguity (e.g., Python vs. Java).
     - Back (on click/flip): Shows a concise reference explanation and self-assessment actions ("Got it ✓" and "Review Later").
   - *Note:* Interactions with Card 1 and Card 2 do **not** contribute to the daily study streak.

3. **Study Streak Widget:**
   - Visual counter showing consecutive active study days.
   - Progress bar toward today's 20-minute video watch goal.

4. **Course List Section & Top Priority Card:**
   - **Top Priority Resumption Card (Card 1):** Dynamically features **the course that a video was last played on** (`last_accessed_at`), ensuring it shifts whenever the learner changes courses rather than staying fixed to one course.
   - **Sort Controls:**
     - Default: **Priority** (Courses with deadlines rank first by urgency—ratio of pending lessons to remaining days; courses without deadlines appear beneath them, ordered by most recently studied).
     - Alternatives: Alphabetical, Completion percentage, Recently accessed.
   - **Course Card Content:**
     - Course title.
     - Progress indicator (percentage and completed chapters count).
     - Target deadline (or "No deadline set").
     - **"Resume" Button:** Direct deep-link to the current unfinished lesson on the Learning Page.
     - **Card Body Click (outside Resume):** Navigates to the Course Page.

5. **Empty State (New Users):**
   - Shown when user has 0 courses.
   - Welcoming prompt explaining the workflow and a prominent "Add Your First Course" button.

---

### 3.2 Add Course Modal (Pop-up)
**Purpose:** Validate and configure a YouTube playlist before importing it into the system.

#### Fields & Controls:
- **YouTube Playlist URL Input:** Text field with automatic validation on paste. 
  - *MVP Constraint:* Accepts **playlists only**. Pasting a standalone single video URL displays an inline message: *"MVP supports playlists only. Please provide a playlist link."*
- **Course Name Field:** Auto-populated from the YouTube playlist title upon URL validation; fully editable by the user.
- **Course Settings Toggles:**
  - `Generate Flashcards`: Checkbox/toggle (Default: On).
  - `End-of-Chapter Quizzes`: Checkbox/toggle (Default: On).
  - `Target Deadline`: Date picker (Optional).
- **Actions:**
  - `Cancel` (Dismisses modal).
  - `Confirm / Import Course` (Triggers background processing and redirects to Dashboard with new course visible).

---

### 3.3 Course Page (`/course/:id`)
**Purpose:** Course management, organization, and review hub. Not used for active video consumption.

#### Layout & Tabs:

1. **Course Header:**
   - Course title (editable).
   - Overall progress metrics:
     - Total chapters.
     - Chapters fully completed (watched + quiz completed).
     - Chapters completed without quiz (watched + quiz skipped).
     - Incomplete chapters.
   - Deadline countdown indicator.
   - Prominent **"Resume Course"** button (routes to Learning Page).
   - Optional: Compact progress pie chart / ring (included only if visually clean).

2. **Tab 1: Overview & Chapter List (Default Tab):**
   - Sequential list of all videos/chapters in the playlist.
   - Per-chapter metadata: video title, duration, status badge (`Not Started`, `Completed`, `Completed without Quiz`).
   - Direct click on any chapter navigates directly to that chapter in the Learning Page.

3. **Tab 2: Resources:**
   - **Chapter-Grouped Directory:** Aggregates and groups all links extracted from each video's description under its respective chapter heading.
   - **Icon-Categorized Links:** Each resource displays a category/platform icon (e.g., GitHub/Code, Google Drive/Docs, PDF/Cheatsheet, Web Link) alongside the creator's descriptive line text and clean destination domain.
   - **Target Behavior:** All links open in a new tab (`target="_blank"`).
   - **Empty State:** Chapters with no description links display a subtle note: *"No external links in this video."* Chapters with links are prominently listed for quick retrieval.

4. **Tab 3: Review (Revision Only):**
   - **Topic Revision Questions:** Quick practice questions drawn strictly from previously completed chapters/topics in this course (not an exhaustive question dump, but a targeted revision set).
   - **Flashcard Deck:** Interactive revision flashcards covering key concepts from completed lessons.

5. **Tab 4: Notes:**
   - Unified document aggregating the user's notes across all chapters of the course.
   - In-place editable.
   - **Export Button:** Download notes as Markdown (`.md`) or copy formatted text.

6. **Tab 5: Settings:**
   - Rename course.
   - Toggle flashcard generation (On/Off).
   - Toggle end-of-chapter questions (On/Off).
   - Set/edit/remove deadline.
   - **Danger Zone:** Delete course and associated local data.

---

### 3.4 Learning Page (`/course/:id/learn/:chapterId`)
**Purpose:** Dedicated study theater. Holds the video player, timestamped notes pad, focus timer, and chapter quiz.

#### Operating Modes:

#### A. Normal Mode (Default)
- **Top / Header Bar:**
  - Course title link (returns to Course Page).
  - Focus Timer widget (displays current countdown: e.g., 20m work / 5m break).
  - **"Focus Mode"** toggle button.
- **Left Column (Primary):**
  - **Embedded Video Player:** Standard player controls with keyboard shortcut support.
  - **Collapsible Video Description:** Placed directly under the video player; collapsed by default. Expanding displays the complete publisher description and referenced links without leaving the page.
  - **Chapter Navigation:** Previous / Next video controls and quick chapter dropdown selector.
- **Right Column (Secondary):**
  - **Rich Text Notes Pad:**
    - Continuous scrollable document across the entire course. Scrolling up reveals notes taken in previous chapters.
    - Automatic header insertion when landing on a chapter: `### Chapter X - [Topic Name]` (editable / removable).
    - **"Insert Timestamp" Button:** Adds a clickable `[MM:SS]` badge at the cursor.
    - **Timestamp Click Behavior (Option C):**
      - Clicking a timestamp belonging to the **currently active chapter** immediately seeks the video to that second.
      - Timestamps belonging to **other chapters** display an explicit chapter badge (e.g., `Ch 2 • [04:12]`) and require an explicit confirmation action (*"Switch to Chapter 2 at 04:12?"*) to navigate, preventing accidental loss of current playback context.

#### B. Focus Mode (Distraction-Free)
- Full-screen or maximized layout.
- Hides standard chapter navigation controls, headers, and extraneous widgets.
- Floating / slide-over button to toggle the right-side notes pad on and off.
- Navigation restriction: User stays focused on the current chapter until complete.
- **Next Chapter Action:** A "Next Chapter" button appears only after the video is finished and the quiz is answered or skipped.

---

## 4. Video Player Overlays & Event Triggers (Learning Page)

> **Universal Overlay Rule:**  
> All three learning moments (**Resume Recall**, **End-of-Chapter Quiz**, and **Scientific Break**) completely overlay the video player.  
> - The video is automatically **paused and hidden from view** while an overlay is active.  
> - Each overlay features a prominent, easy **"Skip" button** that immediately dismisses the prompt and returns the learner directly to the video.

### 4.1 Resume Recall Overlay
- **Trigger:** Returning to a course after **24 hours or more of inactivity**.
- **Behavior:** Overlays and hides the video before playback begins.
- **Content:** 1–2 quick refresher questions pulled from the course's earlier completed chapters.
- **Actions:**
  - `Submit Answer`: Instant answer verification.
  - `Skip to Video`: Immediately dismisses the overlay and reveals/starts the video.

### 4.2 End-of-Chapter Quiz Overlay
- **Trigger:** Video reaches 100% completion (if quizzes are enabled).
- **Behavior:** Overlays and hides the video at the end of the chapter.
- **Content:**
  - 2–5 focused multiple-choice questions testing core concepts.
  - Topic attribution on each question.
  - "Report this question" link on each item.
- **Actions:**
  - `Submit Answers`: Completes chapter and unlocks the next lesson.
  - `Skip Quiz`: Marks chapter as "Completed without Questions" and unlocks the next lesson.

### 4.3 Scientific Break Overlay
- **Trigger:** Focus timer completes a 20-minute study interval (in both Normal Mode and Focus Mode).
- **Behavior:** Immediately pauses and hides the video, taking over the player area.
- **Content:**
  - 5-minute countdown timer.
  - Reminder: *"Step away from your desk, rest your eyes, and take a walk. Continuous cramming reduces memory consolidation."*
- **Actions:**
  - `Skip Break / Resume`: Closes overlay and resumes video (with an automatic 5-second rewind so spoken context is retained).

### 4.4 Quiz & Break Conflict Resolution
- If the 20-minute break timer expires mid-video: Video pauses and triggers the Scientific Break overlay immediately.
- If the break timer coincides with video completion: The End-of-Chapter Quiz overlay triggers first. Once answered or skipped, the Scientific Break overlay triggers before moving to the next chapter.

---

## 5. Core Rules & Backend Expectations

### 5.1 Completion Rule
- **When Quizzes are ON:** A chapter is marked complete when the video reaches 100% AND its questions have been either answered or skipped.
- **When Quizzes are OFF:** Reaching 100% playback automatically completes both the video and the chapter immediately.
- **Mid-Course Setting Change:** If a learner disables quizzes halfway through a course, all previously completed chapters permanently retain their **"Completed"** status (even if quizzes were skipped in those chapters). Progress is never invalidated or revoked when toggling settings.

### 5.2 Streak Tracking Rule
- A study day counts toward the **Study Streak** if and only if the learner logs at least **20 cumulative minutes** of video watch time on that calendar day.
- Dashboard quiz/recall card flips do **not** contribute to streak watch minutes.

### 5.3 AI Question Generation & Caching
- When a playlist is imported:
  1. Backend fetches video transcripts.
  2. AI generates questions and flashcards tagged with unambiguous topic names.
  3. Generated questions are stored globally per playlist in the database, shared by any user enrolled in that playlist (prevents redundant API calls).
- Learners have a "Report Question" flag to log faulty/hallucinated questions.

### 5.4 Edge Case Handling
- **Invalid / Single Video URL:** Inline validation error in Add Course modal before submission (*"MVP supports YouTube playlists only"*).
- **Private / Deleted Videos:** Flagged in chapter list as unavailable; skipped in autoplay queue.
- **Missing Transcripts:** Gracefully fallback: AI question generation disabled for that chapter with a message: *"Quiz unavailable: No transcript found for this video."*
- **Large Playlists (100+ videos):** Lazy-load chapters in batches of 25 in the Course Page to ensure instant rendering.

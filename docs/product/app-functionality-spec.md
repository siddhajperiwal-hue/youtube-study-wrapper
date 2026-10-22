# Complete App Functionality Specification: Study YouTube Wrapper (Desktop MVP)

**Target Document:** `app-functionality-spec.md`  
**Platform:** Desktop Web Only (1024px to 1920px, 1280px base grid)  
**Target Audience:** AI Software Engineers, Full-Stack Developers, and UX Architects  
**Purpose:** An exhaustive, click-by-click, state-by-state, and event-by-event technical specification for building the entire Study YouTube Wrapper product without guesswork or ambiguity.

---

## Table of Contents
1. [System Architecture & Core Philosophy](#1-system-architecture--core-philosophy)
2. [Global Navigation, Shell & Universal Modals](#2-global-navigation-shell--universal-modals)
   - [2.1 Global Top Navigation Bar (Dashboard & Course Page)](#21-global-top-navigation-bar-dashboard--course-page)
   - [2.2 Profile & Utilities Dropdown Menu](#22-profile--utilities-dropdown-menu)
   - [2.3 Global "Add Course" Modal Sheet](#23-global-add-course-modal-sheet)
   - [2.4 Universal "Report Question / Flashcard" Popover Pattern](#24-universal-report-question--flashcard-popover-pattern)
3. [Dashboard Page (`/`) — Complete Interactive Specification](#3-dashboard-page----complete-interactive-specification)
   - [3.1 User Lifecycle State Adapters](#31-user-lifecycle-state-adapters)
   - [3.2 Top-Fold 3-Card Focus Deck](#32-top-fold-3-card-focus-deck)
   - [3.3 "Other Enrolled Courses" Section & Course Library](#33-other-enrolled-courses-section--course-library)
4. [Course Page (`/course/:id`) — Complete Interactive Specification](#4-course-page-courseid----complete-interactive-specification)
   - [4.1 Course Hero & Progress Summary Section](#41-course-hero--progress-summary-section)
   - [4.2 5-Tab Navigation Bar & Tab Controller](#42-5-tab-navigation-bar--tab-controller)
   - [4.3 Tab 1: Overview & Chapter Syllabus](#43-tab-1-overview--chapter-syllabus)
   - [4.4 Tab 2: Resources & Extracted Directory](#44-tab-2-resources--extracted-directory)
   - [4.5 Tab 3: Review (Active Revision Gym)](#45-tab-3-review-active-revision-gym)
   - [4.6 Tab 4: Notes (Unified Course Notes Document & Export)](#46-tab-4-notes-unified-course-notes-document--export)
   - [4.7 Tab 5: Settings (Course Administration & Danger Zone)](#47-tab-5-settings-course-administration--danger-zone)
5. [Learning Page (`/course/:id/learn/:chapterId`) — Study Theater](#5-learning-page-courseidlearnchapterid----study-theater)
   - [5.1 Operating Modes Overview (Normal vs. Focus Mode)](#51-operating-modes-overview-normal-vs-focus-mode)
   - [5.2 Dedicated Study Top Bar (State B & State C)](#52-dedicated-study-top-bar-state-b--state-c)
   - [5.3 Scientific Focus Timer & Interval Controller Popover](#53-scientific-focus-timer--interval-controller-popover)
   - [5.4 Left Column (60%): 16:9 Video Player Theater](#54-left-column-60-169-video-player-theater)
   - [5.5 Right Column (40%): Synchronized Rich Text Notes Pad](#55-right-column-40-synchronized-rich-text-notes-pad)
   - [5.6 The Guarded Timestamp Seeking Model (Option C)](#56-the-guarded-timestamp-seeking-model-option-c)
   - [5.7 Focus Mode Mechanics (100vw × 100vh Full Cinema Experience)](#57-focus-mode-mechanics-100vw--100vh-full-cinema-experience)
6. [The 3 Critical Learning Moments & Video Player Overlays](#6-the-3-critical-learning-moments--video-player-overlays)
   - [6.1 Universal Video Scrim & Overlay Rules](#61-universal-video-scrim--overlay-rules)
   - [6.2 Overlay 1: Resume Recall Overlay](#62-overlay-1-resume-recall-overlay)
   - [6.3 Overlay 2: End-of-Chapter Knowledge Check Quiz Overlay](#63-overlay-2-end-of-chapter-knowledge-check-quiz-overlay)
   - [6.4 Overlay 3: Scientific Rest Break Overlay & 5-Second Rewind](#64-overlay-3-scientific-rest-break-overlay--5-second-rewind)
   - [6.5 Overlay Conflict Resolution Hierarchy Matrix](#65-overlay-conflict-resolution-hierarchy-matrix)
7. [Cross-Cutting Systems, Rules & State Engines](#7-cross-cutting-systems-rules--state-engines)
   - [7.1 Chapter Completion & Setting Invariance Rules](#71-chapter-completion--setting-invariance-rules)
   - [7.2 Study Streak & Heartbeat Engine](#72-study-streak--heartbeat-engine)
   - [7.3 Dynamic Priority Course Sorting Algorithm](#73-dynamic-priority-course-sorting-algorithm)
   - [7.4 AI Question Generation Pipeline & Global Caching Model](#74-ai-question-generation-pipeline--global-caching-model)
   - [7.5 Keyboard Shortcuts & Accessibility Engine](#75-keyboard-shortcuts--accessibility-engine)
   - [7.6 Full Telemetry & Product Analytics Event Dictionary](#76-full-telemetry--product-analytics-event-dictionary)
   - [7.7 Failure, Resilience & Edge-Case Matrix](#77-failure-resilience--edge-case-matrix)

---

## 1. System Architecture & Core Philosophy

### 1.1 Core Mission
The Study YouTube Wrapper transforms passive YouTube playlist viewing into a structured, classroom-like learning experience. It replaces algorithmic rabbit holes and passive distraction with:
- **Active Recall:** End-of-chapter knowledge checks, returning refresher cards, and flashcard revision decks.
- **Contextual Note-Taking:** In-session notes synchronized with video playback through clickable `[MM:SS]` timestamps, compiled automatically into a unified course document.
- **Scientific Pacing:** Built-in Pomodoro focus intervals (default: 20 min study / 5 min break) with mandatory detachment pauses and spoken-context rewind.
- **Habit Formation:** Daily study streak tracking requiring at least 20 minutes of active video watch time per calendar day.

### 1.2 Surface Division & Cognitive Boundaries
To protect working memory and cognitive focus, the application strictly separates **Browsing Surfaces** from the **Study Surface**:
1. **Global Browsing Surfaces (`/` and `/course/:id`):** Include the global 56px Top Bar for platform navigation, course ingestion, habit streak visibility, profile utilities, and course administration.
2. **Dedicated Study Surface (`/course/:id/learn/:chapterId`):** Completely **omits the global navigation bar**. It renders a dedicated study header with local session controls only (return arrow, truncated lesson title, focus timer controller, focus mode toggle). Browsing distractions and external links are eliminated.

### 1.3 Design System & "The Quiet Study Desk" Tokens
- **Theme Philosophy:** Modeled after a physical study desk: warm paper, natural daylight, soft slate ink, and calm botanical greenery.
- **Canvas (`--color-bg-app`):** Warm Paper Off-White (`#FAF6EF`) in Light Mode; Deep Obsidian/Warm Espresso (`#141312`) in Dark Mode.
- **Surfaces (`--color-surface`):** Clean White (`#FFFFFF`) in Light Mode; Warm Charcoal Stone (`#1E1C1A`) in Dark Mode.
- **Tactile Linen Paper (`--color-surface-muted`):** Soft Linen Paper (`#F0EBE0`) in Light Mode; Warm Dark Linen (`#292623`) in Dark Mode. Used for the notes pad, tag chips, and empty tracks.
- **Primary Ink (`--color-primary`):** Deep Forest Green (`#2F5D50`) in Light Mode; Soft Pine Green (`#4E917D`) in Dark Mode.
- **The Amber Rule (`--color-accent`: `#D9962B` / `#E5A94E`):** Strictly reserved for **Deadlines $\le 3$ days remaining**. It **never** appears casually for generic priority badges, streak badges, or standard buttons.
- **Success (`--color-success`):** Botanical Green (`#2E7D4F` / `#4CAF79`).
- **Error / Destructive (`--color-error`):** Terracotta Red (`#B5473A`).
- **Typography Duality:** `Source Serif 4` for page titles, course headings, and compiled notes; `Inter` for UI controls, inputs, timers, and quiz options; `JetBrains Mono` for code snippets and tabular timestamps.

---

## 2. Global Navigation, Shell & Universal Modals

### 2.1 Global Top Navigation Bar (Dashboard & Course Page)
- **Position & Dimensions:** Fixed sticky header at `top: 0; width: 100%; height: 56px; z-index: 100;` on `var(--color-surface)`. Border bottom: `1px solid var(--color-border)`.
- **Inner Container:** Centered flex row, `max-width: 1320px; height: 100%; margin: 0 auto; padding: 0 24px; justify-content: space-between; align-items: center;`.
- **Left Zone — Brand Identity:**
  - **Clickable Group:** Contains an SVG organic book/leaf icon inside a `28px × 28px` container (`background: var(--color-primary); border-radius: 6px; fill: #FFFFFF`) and the wordmark `"StudyDesk"` (`Source Serif 4`, 20px, weight 600, color `var(--color-text-primary)`).
  - **Click Action:** Always routes to Dashboard (`/`). Re-clicking from Dashboard scrolls smoothly to the top of the page.
- **Right Zone — Utilities & Actions (Flex row, gap 12px):**
  1. **Habit Streak Badge:**
     - Pill chip (`height: 32px; padding: 0 14px; border-radius: 9999px; background: var(--color-surface-muted); border: 1px solid var(--color-border)`).
     - Left icon: Flame / leaf stroke SVG icon.
     - Label: Tabular text (e.g., `"5 Day Streak"`).
     - **Active State (`.active-today`):** If the user has logged $\ge 20$ active video minutes on the current local calendar day: border turns botanical green (`var(--color-success)`), icon & text turn `var(--color-primary)`, background turns `rgba(47, 93, 80, 0.08)`.
     - **Pending State:** Neutral slate (`var(--color-text-secondary)`) when $< 20$ minutes have been logged today.
     - **Hover Tooltip:** Floating tooltip appears: *"5 consecutive study days. Watch 20 minutes today to maintain your streak (X mins remaining today)."*
     - **Click Action:** Opens the Profile Dropdown or scrolls to the study streak section.
  2. **`+ Add Course` Button:**
     - Dimensions: `height: 38px; padding: 0 16px; border-radius: 8px; border: none; background: var(--color-primary); color: #FFFFFF; font-family: Inter; font-size: 14px; font-weight: 600; cursor: pointer;`.
     - Left icon: Plus sign (`+`).
     - **Click Action:** Summons the global **Add Course Modal Sheet** overlay.
  3. **Profile & Utilities Avatar Button:**
     - Dimensions: `36px × 36px` circular button (`border-radius: 50%; border: 1px solid var(--color-border); background: var(--color-surface); cursor: pointer; display: flex; align-items: center; justify-content: center;`).
     - Content: Minimalist user silhouette line icon (`👤`) or user initials (`"S"`).
     - **Click Action:** Toggles the visibility of the Profile & Utilities Dropdown Menu.

---

### 2.2 Profile & Utilities Dropdown Menu
- **Container:** Positioned absolutely: `top: 50px; right: 24px; width: 230px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; box-shadow: 0 8px 24px rgba(38, 51, 46, 0.14); z-index: 150; padding: 8px 0;`.
- **Dismissal Triggers:**
  - Clicking anywhere outside the dropdown menu.
  - Pressing the <kbd>Esc</kbd> key.
  - Clicking any selectable menu item inside.
- **Menu Items & Click Behaviors:**
  1. **Account Header Row (Non-clickable):**
     - Displays `Student Account` / `Self-paced Learner` with user email (`Inter`, 12px, muted text).
  2. **Divider Line:** `height: 1px; background: var(--color-border); margin: 6px 0;`.
  3. **Theme Toggle Item (`#themeToggleItem`):**
     - Icon: Sun / Moon outline.
     - Label: `"Dark Mode"` (or `"Light Mode"`).
     - Current Status Pill: Shows `"Espresso"` or `"Warm Paper"`.
     - **Click Action:** 
       - Toggles `data-theme="dark"` attribute on `<html>` / `<body>`.
       - Persists selection to `localStorage.setItem('studydesk_theme', 'dark' | 'light')`.
       - Updates toggle label and icon instantly.
       - Dispatches CSS custom property updates across all open components.
  4. **Keyboard Shortcuts Item (`#shortcutsItem`):**
     - Icon: Keyboard outline.
     - Label: `"Keyboard Shortcuts"`.
     - Right accelerator badge: `<kbd>?</kbd>`.
     - **Click Action:** Summons the interactive Shortcuts Modal Sheet detailing all video, notes, and navigation shortcuts.
  5. **Export Local Data Backup Item (`#backupItem`):**
     - Icon: Download arrow / disk outline.
     - Label: `"Export Local Backup"`.
     - **Click Action:**
       - Queries all enrolled courses, chapter progress records, quiz attempts, and user notes from local store or cache.
       - Generates a timestamped JSON file: `studydesk-backup-YYYY-MM-DD.json`.
       - Triggers browser file download automatically.
       - Shows confirmation toast: `"Local backup downloaded successfully."`
  6. **Divider Line:** `height: 1px; background: var(--color-border); margin: 6px 0;`.
  7. **App Settings Item (`#appSettingsItem`):**
     - Icon: Gear outline.
     - Label: `"App Settings"`.
     - **Click Action:** If on the Course Page, directly switches to Tab 5 (Settings). If on the Dashboard, opens the global settings drawer for default focus durations (20m work / 5m break) and sync settings.

---

### 2.3 Global "Add Course" Modal Sheet
- **Container & Backdrop:** Dark semi-transparent backdrop scrim (`background: rgba(23, 28, 26, 0.75); position: fixed; inset: 0; z-index: 200; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);`).
- **Modal Card:** Centered sheet (`width: 540px; max-width: 90vw; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; box-shadow: 0 12px 32px rgba(38, 51, 46, 0.2); overflow: hidden;`).
- **Header:**
  - Title: `"Import YouTube Playlist"` (`Source Serif 4`, 22px, weight 600).
  - Subtitle: *"Enter a public YouTube playlist URL to structure your course with notes, quizzes, and focus intervals."*
  - Close button: `[✕]` top-right corner.
- **Form Controls & Validations:**
  1. **YouTube Playlist URL Input Field:**
     - `<input type="url" id="playlistUrlInput" placeholder="https://www.youtube.com/playlist?list=..." />`.
     - **Automatic Validation Trigger (on Paste or Change):**
       - Regex check for `list=([a-zA-Z0-9_-]+)`.
       - **Single Video URL Trap:** If the URL matches `watch?v=...` without a playlist parameter, or if the user pastes a standalone video link:
         - The input border turns Terracotta Red (`var(--color-error)`).
         - An inline validation error message appears immediately below the input:  
           `"MVP supports playlists only. Please provide a playlist link."`
         - The "Confirm / Import Course" button remains **disabled**.
       - **Valid Playlist URL:**
         - Input border turns Botanical Green (`var(--color-success)`).
         - Triggers API call `POST /api/courses/validate` with payload `{ url }`.
         - The server returns `{ playlistId, title, videoCount, thumbnail }`.
         - Automatically populates the Course Name field below with the returned playlist title.
  2. **Course Name Field:**
     - `<input type="text" id="courseNameInput" placeholder="Course Title..." />`.
     - Auto-populated upon valid URL parse, but fully editable by the user.
  3. **Course Learning Preferences (Toggles):**
     - **Toggle 1: `End-of-Chapter Quizzes`:** Checkbox/switch (Default: **Checked / ON**). Description: *"Generate active recall quizzes at the end of each video."*
     - **Toggle 2: `Generate Recall Flashcards`:** Checkbox/switch (Default: **Checked / ON**). Description: *"Generate flashcards for the Course Review hub."*
  4. **Target Deadline Date Picker (Optional):**
     - `<input type="date" id="targetDeadlineInput" min="today" />`.
     - Label: `"Target Completion Date (Optional)"`.
     - Helper note: *"If set, courses will be prioritized on your dashboard and display urgency badges when due within 3 days."*
- **Action Buttons (Modal Footer):**
  - **`[ Cancel ]` Button:** Ghost button. Dismisses the modal, clears all form fields, and cancels any pending validation API requests.
  - **`[ Confirm / Import Course ]` Button:**
    - Primary button (`background: var(--color-primary); color: #FFFFFF`). Disabled until a valid playlist URL is verified.
    - **Click Action:**
      1. Sets button to loading spinner state (`"Importing Playlist..."`).
      2. Dispatches `POST /api/courses` with `{ playlistUrl, name, quizzesEnabled, flashcardsEnabled, deadlineDate }`.
      3. Server checks if playlist already exists in global cache:
         - If cached: Instantly enrolls user and creates local course progress rows.
         - If new: Fetches playlist items via YouTube Data API, queues background Gemini generation jobs for the first 3 chapters, extracts description links.
      4. Closes modal sheet with smooth fade-out.
      5. Redirects to `/` (Dashboard) or `/course/:id`, displaying the newly imported course with a non-blocking toast: `"Course imported successfully. Questions are being prepared."`
      6. Emits PostHog event: `course_imported` (or `deadline_set` if deadline was chosen).

---

### 2.4 Universal "Report Question / Flashcard" Popover Pattern
To prevent instructional inaccuracies or AI hallucinations without halting the study session, all question items across the entire app use an identical, non-destructive report pattern.

- **Trigger Elements:**
  - Standalone MCQ (Dashboard Quick Quiz): `[ ⚑ Report ]` in footer row.
  - 3D Flashcard (Dashboard & Review Tab): `[ ⚑ Report ]` in top-right utility slot on **both Front and Back faces**.
  - Learning Page Overlays (Resume Recall & End-of-Chapter Quiz): `[ ⚑ Report ]` adjacent to question counter.
  - Course Review Practice Questions: `[ ⚑ Report ]` in question header.
- **Crucial Event Isolation Rule:**
  - Clicking `[ ⚑ Report ]` on any rotating flashcard executes `event.stopPropagation()` immediately. This ensures the card **never** flips or triggers 3D animation when clicking report.
- **Report Card Popover Dimensions & Positioning:**
  - Dimensions: `width: 360px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; box-shadow: 0 8px 24px rgba(38, 51, 46, 0.16); padding: 18px; z-index: 300;`.
  - Position: Floats directly over or anchored beneath the flagged question element.
- **Card Contents:**
  1. Header Row: Line flag icon + Title `"Report Issue"` + `[✕]` close button.
  2. Category Selection Pills (Single-select):
     - `[ Incorrect Answer Key ]`
     - `[ Typo / Formatting ]`
     - `[ Ambiguous Phrasing ]`
     - `[ Other ]`
     - *Interaction:* Clicking a pill applies `border-color: var(--color-primary); background: rgba(47, 93, 80, 0.08); font-weight: 600;`.
  3. Reason Textarea:
     - Placeholder: *"Briefly describe what is wrong with this question or explanation..."*.
     - Min-height: `72px`.
  4. Actions:
     - `[ Cancel ]`: Discards text and closes the popover without submitting. Focus returns to parent question.
     - `[ Submit Report ]`: Enabled once a category is selected or text is entered.
- **Submission Lifecycle:**
  1. Dispatches `POST /api/questions/:id/report` with `{ questionId, category, reason }`.
  2. Smoothly closes the popover.
  3. Displays non-intrusive confirmation toast: `"Report submitted. Thank you for helping keep study cards accurate."`
  4. **Non-Destructive Guarantee:** Reporting a question **never** resets selected answers, never pauses background timers, never skips chapters, and never wipes existing user notes.

---

## 3. Dashboard Page (`/`) — Complete Interactive Specification

### 3.1 User Lifecycle State Adapters
The Dashboard layout dynamically reorganizes based on the learner's progress:

| User Lifecycle State | Top Fold Layout | Course Library Section |
| :--- | :--- | :--- |
| **State 1: Brand New User** (0 courses enrolled) | Top 3-card deck is completely hidden. Displays centered Onboarding Welcome Card with book icon, copy, and prominent `+ Add Your First Course` CTA button. | Hidden. |
| **State 2: Early Learner** ($\ge 1$ course enrolled, but 0 chapters completed yet) | Quick Quiz and Flashcard cards are **automatically hidden** (preventing empty-state questions). **Priority Course Card expands to 100% full width**, prompting learner to begin Chapter 1. | Displays full library grid of enrolled courses. |
| **State 3: Active Learner** ($\ge 1$ chapter completed) | Full **3-Card Focus Deck** side-by-side grid (~38% Priority Course | ~31% Quick Quiz | ~31% Flashcard). | Displays full library grid of enrolled courses. |

---

### 3.2 Top-Fold 3-Card Focus Deck

- **Top‑Fold Deck Layout Constraint:** The three cards are displayed side‑by‑side with fixed dimensions (Priority Card ~38% width, Quick Quiz ~31%, Recall Flashcard ~31%). Each card has a fixed height of 150px; overflow is hidden and text is truncated with ellipsis. Full content is accessible via tooltip on hover.

#### Card 1: Continue Studying (Priority Course Card)
- **Role:** Immediate resumption of the learner's most recently active course ("Pick up where you left off").
- **Selection Algorithm (Last Played Course Rule):**
  1. The Priority Course Card is **strictly selected as the course that a video was last played on** (ordered descending by `last_accessed_at` / playback activity timestamp).
  2. Whenever a learner starts, watches, or resumes a video in any course, that course's `last_accessed_at` timestamp updates in real-time, immediately making it the featured Priority Course on the Dashboard upon return.
  3. This ensures the card is **not the same course every time**—it dynamically shifts whenever the learner changes courses.
  4. If a learner is newly enrolled with multiple courses but has not played any video yet, the most recently enrolled course (`created_at`) is featured.
  5. **Deadline Badge Invariance:** If the selected last-played course happens to have an active deadline, its deadline badge is displayed normally (including the Warm Amber Badge if $\le 3$ days remain). Deadlines inform urgency indicators, but playback activity governs Card 1 selection.
- **Visual Container:**
  - Card with `border-left: 4px solid var(--color-primary)` (Forest Green accent bar).
  - Background `var(--color-surface); padding: 20px; border-radius: 12px; box-shadow: var(--shadow-sm);`.
- **Card Elements & Click Behaviors:**
  1. **Eyebrow:** Line bookmark icon + `"PRIORITY COURSE"` (`11px, bold, uppercase, color: var(--color-primary)`).
  2. **Split Info Row:**
     - 16:9 Thumbnail (width `130px`, height `73px`, radius `8px`).
     - Course Title: `Source Serif 4`, 18px, semi-bold (`var(--color-text-primary)`).
     - Current Active Lesson: `Inter`, 13px, secondary text (e.g., `"Ch 4 • Functions & Decorators"`).
  3. **Progress Bar & Deadline Pill:**
     - Horizontal progress track: Height `6px`, background `var(--color-surface-muted)`, fill `var(--color-primary)` (e.g., `width: 43%`).
     - Meta text: `"6 of 14 Chapters (43%)"`.
     - **Deadline Badge:**
       - If remaining days $\le 3$: Displays **Warm Amber Badge** (`background: rgba(217, 150, 43, 0.12); border: 1px solid var(--color-accent); color: var(--color-accent); font-weight: 600;` e.g., `"📅 3 days left"`).
       - If remaining days $> 3$: Displays neutral slate badge (e.g., `"📅 11 days left"`).
       - If no deadline: Badge is hidden.
  4. **Action Buttons:**
     - **`[ RESUME COURSE → ]` Primary CTA:**
       - Dimensions: `height: 40px; padding: 0 20px; background: var(--color-primary); color: #FFFFFF; border-radius: 8px; font-weight: 600;`.
       - **Click Action:** Immediately routes to `/course/:id/learn/:chapterId` at the exact last unfinished chapter and saved video second.
       - Dispatches PostHog event: `priority_course_clicked` with `{ course_id, chapter_id, deadline_remaining_days }`.
     - **`[ Overview ↗ ]` Ghost Button:**
       - Color `var(--color-primary)`.
       - **Click Action:** Routes to `/course/:id` (Course Page overview).

---

#### Card 2: Quick Quiz (Standalone MCQ Card)
- **Role:** Fast, single-question retrieval practice covering concepts from completed chapters across any enrolled course.
- **Card Elements & Click Behaviors:**
  1. **Source & Topic Attribution Row:**
     - Topic Badge: Pill showing `[ Course Name • Topic ]` (e.g., `Python 3 • Functions`).
     - Right slot: `[ ⚑ Report ]` flag button (triggers Report Question popover).
  2. **Question Statement:**
     - `Inter`, 14px, font-weight 600 (e.g., *"What is the primary purpose of the @functools.wraps decorator?"*).
  3. **Interactive Option Buttons (A, B, C):**
     - Minimum height `44px`, full width, `text-align: left`, padding `10px 14px`, border `1px solid var(--color-border)`, radius `8px`.
     - **Hover State:** Background tints to `var(--color-surface-muted)`.
     - **Click / Selection Action (Instant Verification — No Submit Button Needed):**
       - If correct option clicked:
         - Option border and background highlight Botanical Green (`#2E7D4F`, `rgba(46, 125, 79, 0.1)`).
         - Displays checkmark icon `✓` and concise explanation text below the options.
         - Emits PostHog event: `question_answered` with `{ question_id, is_correct: true, context: 'dashboard' }`.
       - If incorrect option clicked:
         - Clicked option highlights Terracotta Red (`#B5473A`, `rgba(181, 71, 58, 0.1)`).
         - Correct option simultaneously highlights Botanical Green with `✓`.
         - Displays explanatory text explaining why the correct answer is right.
         - Emits PostHog event: `question_answered` with `{ question_id, is_correct: false, context: 'dashboard' }`.
       - Note: Interactions on this card do **not** contribute to daily streak watch minutes.
  4. **Footer Action Row:**
     - **`[ Next Question → ]` Button:**
       - Ghost button (`color: var(--color-primary)`).
       - **Click Action:** Fetches another random completed question from the local/cached question pool, resetting option states with a smooth 150ms crossfade.

---

#### Card 3: Recall Flashcard (3D Rotating Card)
- **Role:** Deep conceptual retrieval via a tactile, rotating flashcard.
- **Visual Container:** 3D perspective wrapper (`perspective: 1000px; min-height: 220px; cursor: pointer;`).
- **Interactive Rotation Mechanics:**
  - Clicking the card container (or pressing <kbd>Enter</kbd> / <kbd>Space</kbd> while focused) triggers a smooth `transform: rotateY(180deg)` transition (250ms ease-out).
  - Clicking `[ ⚑ Report ]` triggers `event.stopPropagation()` so the card does **not** rotate.
- **Front Face Elements:**
  - Header: Topic Badge (e.g., `Python • Decorators`) + `[ ⚑ Report ]` button.
  - Question Headline: `Source Serif 4`, 16px, weight 600 (`"Can you recall this topic: Python decorators?"`).
  - Sub-prompt: *"Explain what a decorator does and give a real-world scenario where you would use one."*
  - Bottom indicator: `[ ⟲ Click card to rotate & reveal answer ]`.
- **Back Face Elements (Revealed at 180°):**
  - Header: Reference Topic Attribution + `[ ⚑ Report ]` button.
  - Concise reference explanation detailing the theoretical concept and code usage.
  - **Self-Assessment Action Buttons:**
    - **`[ Got it ✓ ]` Button:**
      - Style: Botanical green text and outline.
      - **Click Action:** Marks the topic reviewed for today. Dispatches PostHog event `recall_question_answered`. Cycles to the next flashcard or displays checkmark state.
    - **`[ Review Later ⟳ ]` Button:**
      - Style: Secondary outline button.
      - **Click Action:** **Saves this card directly into the Course Page's Review tab (`bookmarks` table)**. Shows subtle toast: *"Saved to course Review tab for revision."*

---

### 3.3 "Other Enrolled Courses" Section & Course Library

#### Section Controls Bar
- Left: Section Title `"Other Courses (X)"` (where X accurately excludes the Priority Course shown in the top fold).
- Right Group (Flex row, gap 12px):
  1. **Course Search Input Field:**
     - Input width `240px; height: 36px; border: 1px solid var(--color-border); border-radius: 8px; padding-left: 32px;`.
     - Embedded search magnifying glass icon.
     - **Behavior:** Real-time client-side substring filtering matching course titles and creator names.
     - Clear button `[✕]` appears when text is entered; clicking `✕` wipes input and restores all courses.
  2. **Sort by Dropdown Selector:**
     - Dropdown with options:
       - `Priority (Deadline Urgency)` (Default)
       - `Recently Studied`
       - `Completion %`
       - `Alphabetical (A–Z)`
     - **Change Action:** Immediately re-sorts the CSS grid of course cards without page reload.

#### Individual Course Card Grid (3 Columns)
Each course card is rendered as a clean clickable article (`<article class="course-card">`):
- **Card Dimensions & Styling:** Background `var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm); transition: transform 150ms, box-shadow 150ms;`.
- **Hover State:** `transform: translateY(-2px); box-shadow: 0 4px 12px rgba(38, 51, 46, 0.10);`.
- **Elements:**
  1. **Thumbnail Container (16:9):**
     - Fluid image container with `border-radius: 8px`.
     - Bottom-right overlay pill: Displays **total chapter count** (e.g., `"14 chapters"`).
  2. **Course Title:** `Inter`, 15px, semi-bold, 2-line clamp with ellipsis.
  3. **Creator / Channel Name:** `Inter`, 13px, secondary text (`var(--color-text-secondary)`).
  4. **Progress Bar & Numerical Meta:**
     - Linear progress bar: Height `6px`, background `var(--color-surface-muted)`, fill `var(--color-primary)`.
     - Metric: `"8 of 14 Chapters (57%)"`.
  5. **Deadline Badge (Conditional):**
     - If deadline is set and remaining days $\le 3$: Displays **Warm Amber Badge** (`"📅 2 days left"`).
     - If remaining days $> 3$: Displays neutral badge (`"📅 Nov 28"`).
     - If no deadline: Hidden.
  6. **Card Footer Actions:**
     - **`[ Resume ]` / `[ Review Course ]` Button:**
       - If progress $< 100\%$: Displays `Resume` button (`height: 34px; padding: 0 14px; background: var(--color-primary); color: #FFFFFF; border-radius: 6px; font-weight: 600;`). Deep-links directly to `/course/:id/learn/:nextUnfinishedChapterId`.
       - If progress $= 100\%$: Displays `Review Course` button (`background: var(--color-surface-muted); color: var(--color-primary)`). Routes to Course Page Review Tab (`/course/:id?tab=review`).
     - **`[ Details → ]` Ghost Link:**
       - Routes to Course Page Overview (`/course/:id`).
  7. **Card Body Click:**
     - Clicking anywhere on the card surface (outside the `Resume` button) routes to `/course/:id`.

---

## 4. Course Page (`/course/:id`) — Complete Interactive Specification

### 4.1 Course Hero & Progress Summary Section
- **Breadcrumb Navigation:**
  - Located above hero: `← Dashboard  /  [Course Title]`.
  - **Click Action:** Clicking `"← Dashboard"` routes back to `/`.
- **Hero Card Container:** Background `var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 24px; box-shadow: var(--shadow-sm); display: flex; justify-content: space-between; align-items: center;`.
- **Left Hero Block (Course Information & Segmented Metric):**
  1. 16:9 Thumbnail (`200px × 112px; border-radius: 8px;`) with total chapter count overlay badge.
  2. Course Title: `Source Serif 4`, 26px, semi-bold (`var(--color-text-primary)`).
  3. Creator Row: Channel name (e.g., *"By Corey Schafer"*) + external link `"Playlist on YouTube ↗"` (`target="_blank" rel="noopener noreferrer"`).
  4. **Headline Metric:** `"8 of 14 Chapters Studied (57%)"`.
  5. **Segmented Progress Bar:**
     - Visual bar: Height `8px`, border-radius `4px`, background `var(--color-surface-muted)`.
     - Segment 1 (Mastered / Quiz Passed): Forest Green (`#2F5D50`), width proportional to chapters passed.
     - Segment 2 (Watched / Quiz Skipped): Muted Botanical Sage (`#7A9A8B`), width proportional to chapters skipped.
     - Segment 3 (Remaining): Track background (`#F0EBE0`), width proportional to remaining chapters.
  6. **Detailed Stat Legend:**
     - `● X Mastered (Quiz Passed)` (Forest Green indicator dot).
     - `● Y Watched (Quiz Skipped)` (Muted Sage indicator dot).
     - `○ Z Remaining` (Muted border circle).
  7. **Target Deadline Pill:**
     - If $\le 3$ days remaining: Amber badge `📅 3 days left (Nov 20)`.
     - If $> 3$ days remaining: Neutral badge `📅 Nov 28 • 11 days left`.
     - If no deadline set: Ghost button `+ Set target deadline` (clicking jumps directly to Tab 5: Settings).
- **Right Hero Block (Resume CTA):**
  - **`[ Resume Chapter X → ]` Button:**
    - Dimensions: `height: 48px; padding: 0 24px; background: var(--color-primary); color: #FFFFFF; border-radius: 10px; font-weight: 600; font-size: 15px;`.
    - Subtitle: *"Next up: Chapter X • [Chapter Title] (Duration)"*.
    - **Click Action:** Direct one-click route to `/course/:id/learn/:chapterId`.

---

### 4.2 5-Tab Navigation Bar & Tab Controller
- **Height:** `48px; border-bottom: 1px solid var(--color-border); display: flex; gap: 32px;`.
- **Sticky Behavior:** Becomes fixed beneath the 56px top bar when scrolled past the hero card.
- **Tab Items:**
  1. `Overview (14)`: Sequential chapter list and completion badges.
  2. `Resources (28)`: Extracted description links and code repositories.
  3. `Review (8)`: Revision question pool and saved flashcards.
  4. `Notes`: Single continuous course document aggregating notes across all chapters.
  5. `Settings`: Course configuration, toggles, deadlines, and deletion.
- **Interactive Switching Logic:**
  - Clicking any tab updates the URL search query parameter (e.g., `/course/:id?tab=resources`) without a full page refresh.
  - Active tab label highlights in bold `var(--color-primary)` with a sliding `2px solid var(--color-primary)` underline indicator.
  - Unselected tabs hover with background tint `var(--color-surface-muted)`.
  - Tab state is retained across browser refreshes.

---

### 4.3 Tab 1: Overview & Chapter Syllabus
- **Filter & Search Bar:**
  - Left: Chapter search input (`width: 260px; height: 38px; placeholder: "Filter chapters by title..."`). Live client-side text filtering.
  - Right: Filter pills: `All (14)`, `Completed (8)`, `Incomplete (6)`. Clicking a pill isolates matching chapter rows.
- **Chapter List Rows (`<article class="chapter-row">`):**
  - Container: Background `var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; padding: 16px 20px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;`.
  - Hover: Border highlights `var(--color-primary)` with subtle elevation.
  - **Left Metadata:**
    - Tabular Index Badge: `01`, `02`, `03`... (`font-weight: 600; color: var(--color-text-secondary); width: 32px;`).
    - Chapter Title: `Inter`, 16px, semi-bold (`var(--color-text-primary)`).
    - Summary / Description Excerpt: 1-line truncation (`var(--color-text-secondary)`).
  - **Right Metadata & Status Badges:**
    - Duration: Tabular digits (e.g., `31:10`).
    - **Status Badges (3 Mutually Exclusive States):**
      1. `✓ Mastered`: Botanical green pill (`#2E7D4F` text, `#EAF5EE` bg). Applied when video was watched AND quiz was answered.
      2. `👁 Watched`: Muted sage pill (`#5F6B65` text, `#F0EBE0` bg). Applied when video was watched, but quiz was skipped.
      3. `● Up Next` (Forest green dot) if current unfinished chapter, or `○ Not Started` (muted outline circle) if pending.
    - **Row Action Buttons:**
      - If incomplete / up next: `[ Continue Chapter → ]` or `[ Start Chapter → ]` (Primary button).
      - If completed: `[ Rewatch ↺ ]` (Ghost button).
  - **Click Action:** Clicking anywhere on the row navigates directly to `/course/:id/learn/:chapterId` on the Learning Page.

---

### 4.4 Tab 2: Resources & Extracted Directory
- **Purpose:** Solves the messy YouTube description problem by parsing and organizing all links by chapter.
- **Controls:** Course-wide resource search bar (`"Search resources across course..."`).
- **Chapter Accordion Blocks:**
  - Each chapter header displays: `▼ CHAPTER 01: [TITLE] (3 links)`.
  - Clicking the header expands/collapses the chapter's resource list.
  - **Empty Chapter State:** If no links exist in that video's description, renders: *"No external links in this video."*
- **Resource Item Row Specifications:**
  - **Category Auto-Detection & Line Icons:**
    - `💻 Code / Repository`: Detected if domain matches `github.com`, `gitlab.com`, `replit.com`.
    - `📄 Documentation / PDF`: Detected if domain matches `docs.*`, `*.pdf`, `peps.python.org`, `arxiv.org`.
    - `🛠 Tool / Environment`: Detected if domain points to software downloads (`python.org/downloads`, `brew.sh`, `code.visualstudio.com`).
    - `🌐 Web Article`: Default fallback for general external links.
  - **Row Elements:**
    - Category Tag Pill.
    - Resource Title: Clean descriptive label extracted from the description line.
    - Destination Domain Pill: Clean domain (e.g., `github.com`).
    - External Link Icon `↗`.
  - **Click Action:** Opens the destination link in a new browser tab (`target="_blank" rel="noopener noreferrer"`).

---

### 4.5 Tab 3: Review (Active Revision Gym)
- **Role:** Dedicated active recall center covering material **only from completed chapters**.
- **Empty State (0 Completed Chapters):**
  - Displays calm empty state: Book icon + headline *"Revision unlocks with progress."* + copy *"Complete your first chapter and quiz to unlock practice questions and flashcards here."* + CTA `Go to Chapter 1 →`.
- **Dual-Pane Split Layout (50% Practice Questions | 50% Saved Flashcards):**
  1. **Left Pane — Practice Question Card:**
     - Displays 1 multiple-choice question drawn from completed chapters.
     - Topic badge & source chapter attribution.
     - `[ ⚑ Report ]` flag button (triggers Report Question popover).
     - Interactive Option Buttons (A, B, C): Click triggers instant verification (green check for correct + explanation; red cross for incorrect).
     - `[ Next Practice Question → ]` Button: Cycles through the pool of completed chapter questions.
  2. **Right Pane — Saved Flashcard Deck:**
     - Displays interactive 3D rotating flashcards saved by the user (via "Review Later" on Dashboard) or generated for completed lessons.
     - Header: Topic Badge + `[ ⚑ Report ]` button on both Front and Back faces (with `stopPropagation`).
     - Click card body / press <kbd>Enter</kbd> to rotate 180° and reveal reference explanation.
     - **Back Face Action Buttons:**
       - **`[ Got It ✓ ]` Button:** Marks flashcard mastered, removing it from active review rotation.
       - **`[ Keep in Review ⟳ ]` Button:** Retains card in the course review queue for future revision sessions.

---

### 4.6 Tab 4: Notes (Unified Course Notes Document & Export)
- **The Unified Document Model:**
  - Rather than fragmenting notes into detached cards, **all notes taken across all chapters flow seamlessly into a single, comprehensive course document** styled like an authentic scholarly paper or formatted Markdown article.
- **Document Header Toolbar:**
  - Left: Title `"Course Notes"` + Word count badge (e.g., `1,420 words • 6 chapters annotated`).
  - Right Actions:
    - **`[ Copy Markdown ]` Button:** Copies entire compiled Markdown text to system clipboard. Displays temporary 2-second toast: `"Copied to clipboard! ✓"`.
    - **`[ Download .md ]` Button:** Generates and triggers browser file download of `[course-title]-notes.md`.
    - Auto-Save Indicator: Green dot + `"● Saved locally"`.
- **Canvas Styling & Document Formatting:**
  - Background: Soft Linen Paper `var(--color-surface-muted)` (`#F0EBE0` Light / `#292623` Dark).
  - Typography: `Source Serif 4` for all headings and body prose.
  - Structure:
    ```markdown
    # [Course Title] — Course Notes

    ### Chapter 01: [Chapter Name]
    [User notes...]
    - [04:15] Clickable timestamp note...

    ### Chapter 02: [Chapter Name]
    [User notes...]
    - [12:30] Clickable timestamp note...
    ```
- **Clickable Timestamp Badges `[MM:SS]`:**
  - Injected as pill badges (`background: var(--color-surface); border: 1px solid var(--color-border); font-family: Inter; tabular-nums`).
  - **Click Action:** Deep-links directly into the Learning Page at that exact chapter and video timestamp: `/course/:id/learn/:chapterId?t=seconds`.
- **In-Place Editing:**
  - Entire notes canvas is directly editable (`contenteditable="true"` or TipTap editor).
  - Changes are debounced (1 second) and automatically saved to `localStorage` and `PUT /api/notes/:courseId/:videoId`.

---

### 4.7 Tab 5: Settings (Course Administration & Danger Zone)
- **1. Course Identity:**
  - Course Title input (editable). Saved on input blur or clicking "Save Changes".
  - Source Playlist URL (read-only text with external link icon).
- **2. Learning Preferences (Toggles):**
  - **`End-of-Chapter Quizzes` Toggle:** If toggled OFF, videos reaching 100% completion automatically mark the chapter as "Mastered" without prompting a quiz.
  - **`Generate Recall Flashcards` Toggle:** Controls automatic flashcard creation.
  - **`20-Minute Focus Breaks` Toggle:** Enables/disables automatic 20-minute study break prompts.
  - **Non-Invalidation Rule:** Toggling quizzes OFF halfway through a course **never** revokes or downgrades existing "Mastered" or "Watched" statuses on previously finished chapters.
- **3. Target Deadline Configuration:**
  - HTML5 Date Picker (`<input type="date">`).
  - `[ Clear Deadline ]` Button: Resets deadline to null.
- **4. Danger Zone & Two-Step Delete Modal:**
  - Border: Terracotta Red (`var(--color-error)`).
  - Destructive Button: `[ Delete Course... ]` (`background: var(--color-error); color: #FFFFFF`).
  - **Two-Step Delete Confirmation Modal:**
    - Background scrim over entire screen.
    - Heading: *"Are you sure you want to delete this course?"*
    - Warning: *"This action cannot be undone. All chapters, your notes (X words), and quiz records will be erased."*
    - **Confirmation Input:** Learner must type the exact word `"DELETE"` into an input field.
    - The `[ Permanently Delete Course ]` button remains disabled until `"DELETE"` matches exactly.
    - **Click Action:** Sends `DELETE /api/courses/:id`. Deletes user-private rows (progress, notes, quiz attempts), retains global shared playlist content, and redirects to Dashboard (`/`).

---

## 5. Learning Page (`/course/:id/learn/:chapterId`) — Study Theater

### 5.1 Operating Modes Overview (Normal vs. Focus Mode)
The Learning Page is an intentional study environment with two distinct operating states:
1. **Normal Mode (Default):** Asymmetric **60% Video Player (Left) / 40% Notes Pad (Right)** fluid workspace.
2. **Focus Mode (Distraction-Free):** **100vw × 100vh Full-Screen Cinema Canvas**. The video player expands edge-to-edge. Extraneous headers and navigation hide. The notes pad slides out as a stretchable overlay drawer when summoned.

---

### 5.2 Dedicated Study Top Bar (State B & State C)
The Learning Page completely **omits the global top navigation bar**. It renders a dedicated study top bar (`height: 56px; border-bottom: 1px solid var(--color-border); z-index: 100;`). In Focus Mode, this header auto-hides and gently reveals only on mouse hover near the top edge.

- **Left Zone — Return Navigation:**
  - **`[ ← Back to Course ]` Link:**
    - Arrow outline icon + text.
    - **Click Action:** Safely pauses video playback, flushes debounced notes to storage, and routes back to `/course/:id` (Course Page syllabus) without losing state.
- **Center Zone — Progress Context:**
  - Displays truncated title: `[Course Title]  •  Ch [X]: [Chapter Title]` (`Source Serif 4`, 15px, semi-bold, max-width 480px, ellipsis).
- **Right Zone — Study Controls:**
  1. **Focus Timer Widget & Interval Controller Pill:** (Detailed in Section 5.3).
  2. **Notes Drawer Toggle Button (`[ 📝 Notes ]`):** Present in the top bar to summon the notes drawer in Focus Mode without covering the video.
  3. **Focus Mode Toggle Button:**
     - Line icon + label `"Focus Mode"` (or `"Exit Focus Mode ✕"`).
     - **Click Action / Key `<kbd>f</kbd>`:** Toggles between Normal Mode and Full-Screen Focus Mode.

---

### 5.3 Scientific Focus Timer & Interval Controller Popover
- **Default Baseline:** Scientifically calibrated **20 minutes study / 5 minutes rest break**.
- **Top Bar Pill Display:**
  - Pill badge (`background: var(--color-surface-muted); border: 1px solid var(--color-border); border-radius: 9999px; padding: 4px 12px; cursor: pointer;`).
  - Clock icon + live tabular countdown (e.g., `⏱ 20:00` counting down: `⏱ 18:42`) + dropdown chevron `▾`.
- **Timer Configuration Popover:**
  - Clicking the pill opens the configuration popover floating directly beneath the badge.
  - **Customizable Interval Controls:**
    - **Focus Duration Presets:** Pill buttons: `20m (Default)`, `25m`, `30m`, `45m`, `50m` + stepper inputs for minute-by-minute customization.
    - **Break Duration Presets:** Pill buttons: `5m (Default)`, `8m`, `10m`, `15m` + stepper inputs.
    - **Status & Control Row:** Live state indicator + `[ Pause Timer ]` / `[ Resume Timer ]` toggle button.
    - **Action Buttons:** `[ Apply & Restart ]` (resets timer to new configured interval) and `[ Reset to Default (20m / 5m) ]`.
  - **Dismissal:** Closes smoothly on outside click, pressing <kbd>Esc</kbd>, or re-clicking the timer pill.
- **Timer Execution Rule:**
  - The focus timer counts down **only while the video is playing and the browser tab is focused**.
  - If the user pauses the video or switches tabs, the focus timer automatically pauses.

---

### 5.4 Left Column (60%): 16:9 Video Player Theater
- **Player Container:** Strict fluid `16:9` aspect ratio container (`aspect-ratio: 16 / 9; width: 100%; max-height: calc(100vh - 210px); background: #000000; position: relative;`).
- **YouTube IFrame API Integration:**
  - Parameter configuration: `enablejsapi=1`, `modestbranding=1`, `rel=0`, `controls=1`, `iv_load_policy=3`.
  - Custom keyboard listener handles study shortcuts (`Space`, `k`, `j`, `l`, `t`, `f`, `Esc`, `1-3`).
- **Chapter Controls Bar (Immediately Beneath Player):**
  - **`[ ◀ Previous Ch ]` Button:** Navigates to previous chapter. Disabled if on Chapter 1.
  - **Chapter Quick-Selector Dropdown:**
    - Displays current chapter (e.g., `Chapter 04: Functions & Decorators (31:10)`).
    - Clicking displays the full chapter menu with completion icons (`✓ Mastered`, `👁 Watched`, `● In Progress`).
    - Selecting any chapter switches playback without reloading the page.
  - **`[ Next Ch ▶ ]` Button:**
    - Navigates to the next chapter.
    - In **Focus Mode**, this button is hidden until the video reaches completion and the quiz is answered or skipped.
- **Collapsible Description & Extracted Resources:**
  - Located beneath chapter navigation; collapsed by default.
  - Clicking header `▼ Video Description & Extracted Resources (X links)` expands container with smooth 150ms animation.
  - Contains quick resource pills (`[💻 Code]`, `[📄 Doc]`) and formatted publisher text.

---

### 5.5 Right Column (40%): Synchronized Rich Text Notes Pad

#### Tactile Styling & Surface
- Dimensions: Width 40%, height `calc(100vh - 56px)`, border-left: `1px solid var(--color-border)`.
- Background: Soft Linen Paper `var(--color-surface-muted)` (`#F0EBE0` Light / `#292623` Dark).

#### Notes Action Toolbar
- Height: `44px; padding: 0 16px; background: var(--color-surface); border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center;`.
- **Primary Tool: `[ ⏱ Insert [MM:SS] ]` Button:**
  - Shortcut: <kbd>Alt + T</kbd> (or <kbd>t</kbd> when video player is focused).
  - Injects a clickable pill timestamp badge `[MM:SS]` at the current note cursor position representing the exact active playback second.
- **Formatting Tools:** Bold (`B`), Italic (`I`), Bullet List (`• List`), Code Block (`< / >`).
- **Auto-Save Status:** Dot indicator + `"● Saved locally"` (debounced auto-save every 500ms to `localStorage` and `PUT /api/notes/:courseId/:videoId`).

#### Dedicated One-Page-Per-Chapter Architecture (The Discrete Sheet Model)
- **Problem Solved:** Viewing notes from previous chapters simultaneously creates visual noise and cognitive clutter.
- **Dedicated Viewport Page (`min-height: calc(100vh - 102px)`):**
  - Every chapter is allocated its own full-height digital notebook sheet.
  - Even if a chapter has only 1 line of notes, its sheet occupies the full height of the viewport. No other chapter's notes are visible in the initial view.
- **Pinned Initial Focus:**
  - Loading Chapter X anchors the notes container directly to Chapter X's dedicated page.
- **Scroll-Up Retrieval:**
  - Notes from earlier chapters (Chapters 1, 2, 3...) sit above the current sheet in the scroll track and are revealed **only when the learner intentionally scrolls up**.
- **Page Boundary:**
  - Each sheet features a header: `PAGE X OF Y • CHAPTER X` and a prominent chapter title: `### Chapter X: [Topic]`.
  - Sheets are separated by a scholarly dashed divider (`border-bottom: 2px dashed var(--color-border)`).

---

### 5.6 The Guarded Timestamp Seeking Model (Option C)
Clicking a timestamp pill in the notes pad executes distinct behaviors based on chapter context:

1. **Same-Chapter Timestamp Click (`[10:12]`):**
   - The timestamp belongs to the video currently playing.
   - **Click Action:** Immediately seeks the video player to second `612` without reloading. Video continues playback seamlessly.
2. **Other-Chapter Timestamp Click (`Ch 2 • [04:12]`):**
   - The timestamp belongs to an earlier or different chapter.
   - **Click Action:** Displays a non-modal guarded confirmation toast/sheet:
     > *"Switch to Chapter 02 at 04:12? Current playback will pause."*  
     > `[ Switch Chapter ]`   `[ Cancel ]`
   - Clicking `[ Switch Chapter ]` saves current playback time, pauses video, and loads Chapter 2 at second 252.
   - Clicking `[ Cancel ]` dismisses the prompt without interrupting active playback.

---

### 5.7 Focus Mode Mechanics (100vw × 100vh Full Cinema Experience)
Triggered via the `"Focus Mode"` top bar button or key <kbd>f</kbd>:

1. **100vw × 100vh Full-Viewport Video Occupancy:**
   - The video player breaks out of standard column constraints, expanding to completely fill the learner's display edge-to-edge.
   - Sidebars, chapter lists, and extraneous chrome are hidden.
2. **Auto-Hiding Collapsible Top Bar:**
   - The top header auto-hides off-screen.
   - Gently reveals when the user moves the mouse near the top edge of the screen.
   - Contains: `← Back to Course`, lesson title, timer widget, **`[ 📝 Notes ]` drawer toggle**, and `[ Exit Focus Mode ✕ ]`.
3. **Floating Slide-Over Notes Drawer (Triggered from Top Bar):**
   - Floating buttons directly on the video screen are completely removed to prevent obscuring the video scrubber and overlays.
   - Opening notes is triggered by clicking `[ 📝 Notes ]` in the top bar or pressing <kbd>n</kbd> / <kbd>Alt + N</kbd>.
   - The notes pad slides in from the right edge as a floating card overlay (`position: fixed; right: 0; top: 0; bottom: 0; z-index: 105; box-shadow: -8px 0 24px rgba(38, 51, 46, 0.2);`).
   - **Zero Video Shrinkage:** The video **does not resize or shrink**. The notes drawer floats cleanly above the right side of the video canvas.
4. **Stretchable Resizable Width (Draggable Handle):**
   - The left border of the floating notes drawer features an interactive drag handle (`cursor: ew-resize`).
   - The learner can drag horizontally to resize the notepad anywhere from `320px` (compact jotting margin) to `750px` (or 60% viewport width for extensive code notes).
5. **Dedicated "Push Back Notes" Control:**
   - The notes toolbar includes a prominent **`[ ⇥ Push Back Notes ]`** button.
   - Clicking retracts the notes drawer smoothly off-screen (`transform: translateX(100%)`).
   - Pressing <kbd>Esc</kbd> (when notes are open) also pushes back the notes drawer.
6. **Navigation Lock:**
   - Chapter switching controls are locked. The "Next Chapter" button appears only after the video ends and the quiz is resolved or skipped.

---

## 6. The 3 Critical Learning Moments & Video Player Overlays

### 6.1 Universal Video Scrim & Overlay Rules
All three learning moments follow strict universal rules:
1. **Takeover:** The overlay completely takes over the 16:9 player container (or the full viewport in Focus Mode).
2. **Video Paused & Hidden:** The video is **automatically paused and completely hidden from view** behind a dark scrim (`background: rgba(20, 19, 18, 0.94); backdrop-filter: blur(4px); z-index: 50;`).
3. **Effortless Skip:** Every overlay includes a prominent, low-friction **`Skip` button** (ghost style, muted text) so no learner is trapped or penalized.

---

### 6.2 Overlay 1: Resume Recall Overlay
- **Trigger:** Resuming a course after **$\ge 24$ hours of inactivity**.
- **Timing:** Appears immediately upon page load, **before video playback begins**.
- **Content:**
  - Eyebrow: `[Leaf Icon]  WELCOME BACK • QUICK REFRESHER` + `[ ⚑ Report ]` button.
  - Sub-prompt: *"It's been 2 days since your last session. Let's recall Chapter 3:"*
  - 1–2 multiple-choice questions drawn from previous completed chapters.
- **Actions & Logic:**
  - `[ Check Answer ]`: Instant answer check. Correct highlights Botanical Green; incorrect highlights Terracotta Red with reference explanation.
  - `[ Skip to Video ↗ ]`: Immediately dismisses overlay and auto-starts video playback.
  - `[ ⚑ Report ]`: Opens Report Question popover without resetting the overlay or skipping the question.
  - Telemetry: Emits `recall_shown`, `recall_started`, `recall_skipped`, or `recall_question_answered`.

---

### 6.3 Overlay 2: End-of-Chapter Knowledge Check Quiz Overlay
- **Trigger:** Video reaches 100% completion (if *End-of-Chapter Quizzes* is toggled ON).
- **Timing:** Triggers automatically as the video concludes.
- **Content:**
  - Header: `CHAPTER [X] COMPLETE • KNOWLEDGE CHECK`
  - Counter & Attribution: `Question 1 of 2 • Topic: [Topic Name]` + `[ ⚑ Report ]` button.
  - 2–5 focused multiple-choice questions testing core concepts.
- **Actions & Completion Logic:**
  - Option Selection: Clicking option A, B, or C (or keys `1`, `2`, `3`) selects choice with outline highlight.
  - **`[ Submit & Continue → ]` Button:**
    - Submits answers via `POST .../quiz/submit`.
    - Marks chapter status permanently as **"Mastered (Quiz Passed)"**.
    - Micro-reward: Checkmark animation, chapter checked off, unlocks next lesson.
    - If conflict with break timer exists, advances to Break Overlay; otherwise loads next chapter.
  - **`[ Skip Quiz ]` Ghost Button:**
    - Marks chapter status permanently as **"Watched (Quiz Skipped)"**.
    - Unlocks next lesson without penalty.
  - `[ ⚑ Report ]`: Opens Report Question popover without resetting selections or skipping the quiz.
  - Telemetry: Emits `quiz_shown`, `quiz_started`, `quiz_skipped`, `question_answered`, and `quiz_completed`.

---

### 6.4 Overlay 3: Scientific Rest Break Overlay & 5-Second Rewind
- **Trigger:** The focus timer finishes the active study interval (default **20 minutes**, or user-customized e.g. 30 minutes).
- **Behavior:** Pauses video playback instantly and overlays the entire player canvas.
- **Duration:** Dynamically counts down the configured rest break (default **5 minutes**, or user-customized e.g. 8 minutes).
- **Content:**
  - Walking / coffee cup line icon.
  - Live countdown: `TIME REMAINING: 04:58`.
  - Cognitive guidance: *"Step away from your desk, rest your eyes, and stretch your legs. Continuous cramming reduces synaptic memory consolidation."*
- **The 5-Second Spoken Context Rewind Rule:**
  - When the user clicks **`[ Skip Break / Resume Video → ]`** OR when the break timer reaches `00:00`:
  - 1. The overlay dismisses smoothly.
  - 2. The player **automatically rewinds 5 seconds** before resuming playback (`currentTime = Math.max(0, currentTime - 5)`).
  - 3. Playback resumes. This restores spoken context and linguistic continuity so the learner immediately reconnects with the instructor's thoughts.
- **Telemetry:** Emits `focus_block_completed`, `break_prompted`, `break_started`, `break_skipped`, and `break_completed`.

---

### 6.5 Overlay Conflict Resolution Hierarchy Matrix
When multiple events collide, the system resolves them via strict priority order:

| Collision Scenario | Simultaneous Events | Resolution Hierarchy & Execution Order |
| :--- | :--- | :--- |
| **Case A: Mid-Playback Expiration** | 20-minute focus break timer reaches `00:00` while video is playing. | **Break Wins:** Video pauses instantly and displays the Scientific Break overlay. Video resumes with 5s rewind when break ends or is skipped. |
| **Case B: Coinciding Completion** | 20-minute focus break timer reaches `00:00` at the exact second the video reaches 100%. | **Quiz Wins First, Then Break:** 1. End-of-Chapter Quiz overlay triggers first. 2. Once the quiz is submitted or skipped, the Scientific Break overlay displays immediately. 3. Only after the break ends or is skipped does the next chapter load. |
| **Case C: Returning Learner** | User opens a course after $\ge 24$ hours of inactivity. | **Resume Recall Wins:** Displays before video starts. Break timer does **not** begin counting down until the recall overlay is dismissed and the video actually starts playing. |

---

## 7. Cross-Cutting Systems, Rules & State Engines

### 7.1 Chapter Completion & Setting Invariance Rules
- **Rule 1 (Quizzes ON):** A chapter is marked completed when video reaches 100% (or $\ge 90\%$ watched threshold) AND the quiz is either answered (`Mastered`) or skipped (`Watched`).
- **Rule 2 (Quizzes OFF):** Reaching the watch threshold automatically completes the video and marks the chapter as `Mastered` immediately.
- **Rule 3 (Setting Invariance):** If a user changes course settings (e.g., turning quizzes OFF mid-course), **all previously completed chapters permanently retain their existing completion status**. Progress is never invalidated, downgraded, or revoked when toggling settings.

---

### 7.2 Study Streak & Heartbeat Engine
- **Qualification Threshold:** A calendar day counts toward the **Daily Study Streak** if and only if the learner logs at least **20 cumulative minutes** (1,200 active seconds) of video watch time on that local calendar day.
- **Heartbeat Mechanism:**
  - While a video is actively playing AND the browser tab is focused, the client tracks active watch seconds.
  - The browser dispatches a batched heartbeat payload to `POST /api/study/heartbeat` every 60 seconds and upon window unload.
  - If the video is paused, buffering, or if the user switches to another browser tab, the heartbeat stops immediately.
- **Streak Calculation:**
  - Streak = consecutive qualifying days ending today or yesterday.
  - Calculated dynamically from `daily_study` rows using the user's local timezone (`profiles.timezone`).
- **Streak Invariance:** Dashboard Quick Quiz submissions and Flashcard flips do **not** contribute to the 20-minute video watch streak.

---

### 7.3 Dynamic Priority Course & Library Sorting Engine
1. **Top-Fold Priority Course Selection (Last Played Rule):**
   - The top-fold "Continue Studying" priority slot (Card 1) is dynamically assigned to **the course where a video was last played** (`last_accessed_at` timestamp). It dynamically reflects real-time study activity rather than remaining locked to a single course.
2. **Library Grid Sort Controls:**
   - In the "Other Courses" library section, users can order their remaining courses using the sort control:
     - **Priority Sort (Default):** Courses with deadlines sorted by Urgency Score ($\text{Urgency Score} = \frac{\text{Total Pending Video Minutes Remaining}}{\text{Days Remaining Until Target Deadline}}$), followed by courses without deadlines sorted by `last_accessed_at`. Any course with $\le 3$ days remaining displays the Warm Amber Badge.
     - **Recently Played / Accessed:** Sorted descending by `last_accessed_at`.
     - **Completion %:** Sorted descending by percentage of completed chapters.
     - **Alphabetical:** Sorted A-Z by course title.

---

### 7.4 AI Question Generation Pipeline & Global Caching Model
1. **Global Playlist Caching:**
   - Playlists, video metadata, question banks, and flashcards are generated once and stored globally in shared tables (`playlists`, `videos`, `questions`, `flashcards`).
   - If User B enrolls in a playlist previously imported by User A, User B is enrolled instantly with zero AI generation latency.
2. **Generation Queue Priority:**
   - Background worker processes Chapter 1, Chapter 2, and Chapter 3 first, enabling immediate study while subsequent chapters generate in the background.
3. **Fallback Transcript Chain:**
   - 1. Gemini processing video directly by URL.
   - 2. Transcript API -> LLM question extraction.
   - 3. Video title, description, and chapter timestamps.
   - 4. If all fail: Marks chapter `video_content.status = unavailable` and gracefully displays: *"Quiz unavailable: No transcript found for this video."* The chapter functions normally with video and notes.

---

### 7.5 Keyboard Shortcuts & Accessibility Engine
All interactive triggers can be operated entirely from the keyboard:

| Key Binding | Target Surface | Interaction Triggered |
| :--- | :--- | :--- |
| <kbd>Space</kbd> or <kbd>k</kbd> | Video Player / Global | Toggle Play / Pause |
| <kbd>j</kbd> or <kbd>←</kbd> | Video Player / Global | Rewind 5 seconds |
| <kbd>l</kbd> or <kbd>→</kbd> | Video Player / Global | Fast-forward 5 seconds |
| <kbd>t</kbd> or <kbd>Alt + T</kbd> | Notes Pad | Inject clickable timestamp pill `[MM:SS]` at cursor |
| <kbd>n</kbd> or <kbd>Alt + N</kbd> | Focus Mode | Toggle Floating Notes Drawer open / closed |
| <kbd>f</kbd> | Learning Page | Toggle Focus Mode (Enter / Exit) |
| <kbd>Esc</kbd> | Universal | 1. Dismiss Report Popover / Timer Popover<br>2. Push back Notes Drawer in Focus Mode<br>3. Dismiss active overlay<br>4. Exit Focus Mode |
| <kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd> | Quiz Overlays | Select MCQ Option A, B, or C |
| <kbd>?</kbd> | Dashboard / Course Page | Summon Keyboard Shortcuts Cheat Sheet modal |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Flashcard Container | Rotate 3D Flashcard 180° to reveal answer |

---

### 7.6 Full Telemetry & Product Analytics Event Dictionary
All analytics events are emitted from the browser to PostHog with strict privacy compliance (metadata only; **zero user note content is ever captured**):

| Event Name | Trigger Context | Payload Schema |
| :--- | :--- | :--- |
| `priority_course_clicked` | Dashboard Card 1 Resume clicked | `{ course_id, chapter_id, deadline_remaining_days }` |
| `quiz_shown` | Chapter quiz overlay displayed | `{ course_id, video_id, question_count }` |
| `quiz_started` | User selects first quiz option | `{ course_id, video_id }` |
| `quiz_skipped` | User clicks "Skip Quiz" button | `{ course_id, video_id, time_spent_sec }` |
| `question_answered` | Option selected on MCQ | `{ question_id, is_correct: boolean, time_taken_sec, context: 'chapter_quiz' \| 'dashboard' \| 'review' }` |
| `quiz_completed` | All quiz questions submitted | `{ course_id, video_id, final_score, total_questions }` |
| `note_created` | User types first character in chapter note | `{ course_id, video_id, char_length, has_timestamp: boolean }` |
| `note_edited` | Notes updated and saved | `{ course_id, video_id, char_length, version }` |
| `compiled_doc_viewed` | Course Page Notes tab opened | `{ course_id, total_words, total_chapters_annotated }` |
| `compiled_doc_exported` | Markdown downloaded or copied | `{ course_id, export_type: 'download_md' \| 'copy_clipboard', char_length }` |
| `focus_block_completed` | 20m focus study block ends | `{ course_id, video_id, interval_minutes }` |
| `break_prompted` | Break overlay takes over screen | `{ course_id, video_id, configured_break_minutes }` |
| `break_started` | Break countdown begins | `{ course_id, video_id }` |
| `break_skipped` | User clicks "Skip Break / Resume" | `{ course_id, video_id, break_seconds_elapsed }` |
| `break_completed` | Break timer reaches 00:00 | `{ course_id, video_id, total_break_seconds }` |
| `recall_shown` | Resume recall overlay displayed | `{ course_id, days_since_last_session }` |
| `recall_started` | User interacts with recall card | `{ course_id, question_id }` |
| `recall_skipped` | User clicks "Skip to Video" | `{ course_id, days_since_last_session }` |
| `recall_question_answered`| Answer submitted on recall | `{ course_id, question_id, is_correct: boolean, days_since_last_session }` |
| `recall_completed` | Recall refresher dismissed | `{ course_id, score }` |
| `deadline_set` | Target deadline selected | `{ course_id, days_remaining, target_date }` |
| `deadline_changed` | Deadline modified | `{ course_id, new_days_remaining }` |
| `deadline_met` | Final chapter completed before deadline | `{ course_id, days_ahead_of_deadline }` |
| `deadline_missed` | Deadline passes with incomplete chapters | `{ course_id, chapters_remaining }` |

---

### 7.7 Failure, Resilience & Edge-Case Matrix

| Failure / Edge Case | System Detection Point | User-Facing Behavior & Functional Resolution |
| :--- | :--- | :--- |
| **Standalone Video Link Pasted** | Add Course modal input regex | Input borders Terracotta Red; displays inline error: *"MVP supports playlists only. Please provide a playlist link."* Confirm button disabled. |
| **Private or Deleted Video** | YouTube Data API sync | Chapter row flagged with `Unavailable` pill; automatically bypassed in player autoplay queue. Existing user notes for this chapter are preserved. |
| **Video Not Embeddable** | API `status.embeddable = false` | Chapter row displays badge `Watch on YouTube ↗`; clicking launches external tab. |
| **Missing / Failed Transcripts** | Gemini pipeline retry failure | Video content marked `unavailable`. When video concludes, renders: *"Quiz unavailable: No transcript found for this video."* Video and notes function normally. |
| **Large Playlists (100+ Videos)** | Playlist import | Backend paginates YouTube API; Course Page lazy-loads chapters in batches of 25. First 3 chapters are queued first for AI generation. |
| **Network Loss During Note-Taking** | Notes editor auto-save | TipTap saves directly to browser `localStorage`. Status indicator changes from green to amber: `"● Offline — Saved locally"`. Flushes to server when connection restores. |
| **Ad Interrupts Playback** | YouTube player state event | Watch timer and focus countdown pause automatically during ad playback. Streak heartbeat records only verified video playback. |
| **Conflicting Edits (Multi-Tab)** | Notes `PUT` version check | Server checks version; returns 409 conflict. Client displays prompt: *"Notes updated in another tab. Reload latest version?"* |

---

## 8. Developer Implementation Roadmap & Verification Checklist

When using this specification to implement or verify the Study YouTube Wrapper codebase, follow this sequential execution order:

1. **Database & API Foundation:**
   - [ ] Implement Supabase schema (`playlists`, `videos`, `video_resources`, `video_content`, `questions`, `flashcards`, `question_reports`, `courses`, `chapter_progress`, `quiz_attempts`, `answers`, `notes`, `daily_study`, `study_sessions`, `bookmarks`).
   - [ ] Configure Row Level Security (global shared tables read-only for users; per-user tables strictly isolated).
2. **Global Navigation & Add Course Pipeline:**
   - [ ] Build 56px Top Bar on `/` and `/course/:id` with Brand Link, Habit Streak Badge, `+ Add Course` button, and Profile dropdown.
   - [ ] Build Add Course modal with playlist URL validation (single-video rejection), title extraction, toggles, and deadline picker.
   - [ ] Build universal `[ ⚑ Report ]` popover card with category selection, reason textarea, and `event.stopPropagation()` on flashcards.
3. **Dashboard (`/`):**
   - [ ] State 1: Brand new user onboarding card.
   - [ ] State 2: Early learner full-width priority card.
   - [ ] State 3: 3-Card Focus Deck (Priority Course with $\le 3$ days Amber Rule, Quick Quiz MCQ with instant feedback, 3D rotating Flashcard with "Review Later").
   - [ ] Course library grid with search bar, clear `✕`, sort selector, and course cards.
4. **Course Page (`/course/:id`):**
   - [ ] Hero summary card with 4-part segmented progress bar (Mastered vs. Watched vs. Remaining) and deadline chip.
   - [ ] 5-Tab controller (`Overview`, `Resources`, `Review`, `Notes`, `Settings`).
   - [ ] Tab 1: Chapter syllabus with search, filter pills (`All`, `Completed`, `Incomplete`), and status badges.
   - [ ] Tab 2: Chapter-grouped resources directory with auto-detected category icons (`Code`, `Doc`, `Tool`, `Web`).
   - [ ] Tab 3: Dual-pane revision gym with practice questions and saved flashcards.
   - [ ] Tab 4: Unified continuous course notes document with word count, auto-save, `[Copy Markdown]`, `[Download .md]`, and clickable timestamp pills.
   - [ ] Tab 5: Course settings, toggles (non-invalidation rule), deadline picker, and two-step delete modal requiring typing `"DELETE"`.
5. **Learning Page (`/course/:id/learn/:chapterId`):**
   - [ ] Dedicated study header with `← Back to Course`, truncated title, customizable timer controller popover (presets & steppers), and focus mode toggle.
   - [ ] 60% Left column with 16:9 YouTube IFrame player, keyboard shortcuts, chapter navigation, and collapsible description.
   - [ ] 40% Right column with linen paper notes pad, discrete one-page-per-chapter layout, scroll-up retrieval, toolbar, and auto-save.
   - [ ] Option C Guarded Seeking: Same-chapter seeks immediately; different-chapter shows confirmation dialog.
   - [ ] Focus Mode: 100vw × 100vh full-screen cinema canvas, auto-hiding top bar on hover, floating resizable slide-over notes drawer (320px–750px), and `[ ⇥ Push Back Notes ]` button.
6. **The 3 Critical Learning Overlays:**
   - [ ] Scrim rules: Video automatically paused and completely hidden; ghost skip button present.
   - [ ] Overlay 1: Resume Recall Overlay ($\ge 24$h inactivity trigger).
   - [ ] Overlay 2: End-of-Chapter Quiz Overlay (100% video trigger) with "Mastered" vs. "Watched (Quiz Skipped)" paths.
   - [ ] Overlay 3: Scientific Break Overlay (20m study interval trigger) with **5-second spoken context rewind** upon resumption.
   - [ ] Overlay collision resolution matrix (Break wins mid-video; Quiz wins first at video completion; Recall wins on return).
7. **Habit Streak & Telemetry:**
   - [ ] Implement active watch heartbeat (emits only while video is playing and tab is focused).
   - [ ] 20-minute daily threshold calculation.
   - [ ] Instrument all 24 PostHog analytics events with metadata-only payloads.

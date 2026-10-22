# Dashboard Screen Specification (Desktop MVP)

**File Target:** `dashboard.md`  
**Route:** `/`  
**Purpose:** Daily decision hub, course priority management, quick active recall, and streak habit tracking.  
**Platform:** Desktop web only (1280px base grid, fluid 1024px–1920px).  
**Visual Theme:** "The Quiet Study Desk" (Warm Paper `#FAF6EF` Light Mode, Warm Espresso `#141312` Dark Mode).  
**Icon Style:** Subtle line icons (no cartoon emojis).  
**Tone & Voice:** Calm, encouraging tutor. Zero guilt copy.  

---

## 1. Page Architecture & Visual Wireframe

The Dashboard layout adapts cleanly to the learner's current progress state. When active completed topics exist, the top fold displays a **3-Card Focus Deck** placed directly below the greeting.

### 1.1 Structural Wireframe (Desktop Viewport ≥ 1200px — Active Learner State)

```
+-------------------------------------------------------------------------------------------------------------------------+
| [TOP BAR: 56px] [Logo: StudyDesk]                                 [Streak: [Leaf] 5 Days]   [+ Add Course]         [👤] |
+-------------------------------------------------------------------------------------------------------------------------+
| <MAIN CONTAINER (max-width: 1320px, centered)>                                                                          |
|                                                                                                                         |
| [GREETING]                                                                                                              |
| "Welcome back. Let's pick up where you left off."                                                                        |
|                                                                                                                         |
| +---------------------------------------------------------------------------------------------------------------------+ |
| | TOP FOLD: 3-CARD ACTIVE DECK (Side-by-Side Grid: ~38% | ~31% | ~31%)                                                | |
| |                                                                                                                     | |
| | [CARD 1: CONTINUE STUDYING]          [CARD 2: QUICK QUIZ (MCQ)]              [CARD 3: RECALL FLASHCARD]             | |
| | +----------------------------------+ +-------------------------------------+ +-----------------------------------+ | |
| | | [Bookmark Icon] PRIORITY COURSE  | | [Check-Circle Icon] QUICK QUIZ      | | [Rotate Icon] FLASHCARD [Report ⚑]| | |
| | | [Thumb 16:9] (130px width)       | | Topic: Python • Functions           | | Topic: Python • Decorators        | | |
| | | Python 3: From Scratch to Prod.  | |                                     | |                                   | | |
| | | Ch 4 • Functions & Decorators    | | "What is the primary purpose of     | | "Can you recall this topic:       | | |
| | | [==========---------] 6/14 (43%) | |  the @functools.wraps decorator?"   | |  Python decorators?"              | | |
| | | [Deadline: 3 days left (Amber)]  | |                                     | |                                   | | |
| | |                                  | | [Button: Option A]                  | | [Front Face: Click to rotate ⟲]   | | |
| | | [ RESUME COURSE → ] [Overview ↗] | | [Button: Option B (Instant Correct)]| |                                   | | |
| | |                                  | | [Button: Option C]                  | | [Back Face: 180° rotation reveals | | |
| | |                                  | |                                     | |  answer; 'Got it' / 'Review Later'| | |
| | |                                  | | [Next Question →]       [Report ⚑]  | |  saves card to Course Review tab] | | |
| | | +----------------------------------+ +-------------------------------------+ +-----------------------------------+ | |
| | +---------------------------------------------------------------------------------------------------------------------+ |
|                                                                                                                         |
| [SECTION: OTHER ENROLLED COURSES]                                                                                       |
| Header: "Other Courses (3)"                    [🔍 Search courses...]                         Sort by: [ Priority ▾ ]   |
|                                                                                                                         |
| [COURSE CARD GRID - 3 Columns]                                                                                          |
| +-------------------------------+ +-------------------------------+ +-------------------------------+                 |
| | Course 2: JavaScript Deep Dive| | Course 3: DSA Graph Traversal | | Course 4: Figma Mastery       |                 |
| | 20 chapters • 12/20 (60%)     | | 18 chapters • 2/18 (11%)      | | 14 chapters • 14/14 Completed |                 |
| | [Resume] [Details →]          | | [Resume] [Details →]          | | [Review Course] [Details →]   |                 |
| +-------------------------------+ +-------------------------------+ +-------------------------------+                 |
+-------------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Adaptive Dashboard States (Zero-Assumption Scenarios)

The Dashboard gracefully handles three distinct user lifecycle states:

### State 1: Brand New User (0 Enrolled Courses)
- **Greeting:** `"Welcome to your study space."` (Neutral and welcoming, not "Welcome back").
- **Layout:** The top deck and course library are hidden. A single calm, centered onboarding card is shown.
- **Content:**
  - Subtle line icon of an open book / study desk.
  - Headline: `"Your study space is ready."`
  - Body: *"Paste any YouTube course playlist link to organize your learning, take synced notes, and study with active chapter quizzes."*
  - Primary CTA: `+ Add Your First Course` (opens Add Course modal).

### State 2: Enrolled, But No Chapters Completed Yet (Early Learner)
- **Problem Solved:** When a user has added courses but has not finished any video/quiz yet, the question bank has no completed topics to pull from.
- **Layout Behavior:**
  - Both recall cards (Quick Quiz and Flashcard) are **automatically hidden**.
  - The **Priority Course Card expands full-width** across the top fold, placing 100% focus on starting Chapter 1 without awkward empty card placeholders.
  - Once the learner completes their first chapter, the MCQ and Flashcard dynamically appear on subsequent visits.

### State 3: Active Learner (Completed Topics Available)
- Displays the complete 3-card top deck (Priority Course + Quick Quiz MCQ + Rotating Flashcard).

---

## 3. Strict Color Palette & Amber Usage Rule

To ensure visual clarity and avoid diluting the semantic meaning of colors:
1. **Amber (`--color-accent`: `#D9962B` / `#E5A94E`):**
   - **Strictly reserved for NEAR DEADLINES ONLY** (courses due within $\le 3$ days).
   - Never used for streak badges, generic priority badges, or body text.
   - Eliminates the previous contrast violation: all badges and headings use dark text or Forest Green for full WCAG AAA readability.
2. **Forest Green (`--color-primary`: `#2F5D50` / `#4E917D`):**
   - Carries all primary structure: top priority indicator bar, primary CTA buttons (`Resume Course`), active navigation, and streak icon.
3. **Neutral Soft Green (`--color-success`: `#2E7D4F` / `#4CAF79`):**
   - Used for correct quiz feedback and completed course checkmarks.

---

## 4. Component-by-Component Specifications

### 4.1 Global Top Navigation Bar (Option C - Exact Specification)
- **Position & Dimensions:** Fixed sticky header (`height: 56px`, `z-index: 100`, background: `var(--color-surface)`, border-bottom: `1px solid var(--color-border)`).
- **Inner Centered Container:** `max-width: 1320px`, centered with `margin: 0 auto`, `padding: 0 var(--space-m)` (`24px`), flex layout with `justify-content: space-between; align-items: center;`. Ensures identical horizontal edge alignment across Dashboard and Course Page.
- **Left Zone (Brand & Universal Home Navigation):**
  - **Brand Group Link:** Clicking anywhere navigates to `dashboard.html` (`/`).
  - **Icon Mark:** Organic book/leaf SVG mark in a `28px × 28px` rounded container (`border-radius: 6px`, background: `var(--color-primary)`, white 16px SVG glyph).
  - **Wordmark:** `"StudyDesk"` (`Source Serif 4`, 20px, semi-bold weight 600, `color: var(--color-text-primary)`).
- **Right Zone (Action & Utility Cluster, flex row, gap: 12px):**
  1. **Habit Streak Badge:**
     - Pill chip (`height: 32px`, `padding: 6px 14px`, border-radius: `var(--radius-pill)`, background: `var(--color-surface-muted)`, border: `1px solid var(--color-border)`).
     - Content: Line flame/leaf icon (`stroke: currentColor`) + tabular text `"5 Day Streak"` (`Inter`, 13px, font-weight 600).
     - State: When today's 20m threshold is completed, applies `.active-today` (botanical green border and text `var(--color-primary)`, background `rgba(47, 93, 80, 0.1)`); neutral slate when pending.
  2. **Primary CTA: `+ Add Course` Button:**
     - Dimensions: `height: 38px`, `padding: 0 16px`, border-radius: `8px` (`var(--radius-sm)`).
     - Styling: Background `var(--color-primary)`, text `#FFFFFF`, font-family `var(--font-sans)`, font-size `14px`, font-weight 600, border: none.
     - Content: Plus line icon (`+`) + label `+ Add Course`.
     - Behavior: Summons the universal Add Course Modal Sheet.
  3. **Profile & Utilities Avatar Button (Circular Icon):**
     - Dimensions: `36px × 36px` circular button (`border-radius: 50%`, border: `1px solid var(--color-border)`, background: `var(--color-surface)`).
     - Content: Minimalist user line icon (`👤`).
     - **Profile & Utilities Dropdown Menu on Click (Width: 230px, right-aligned):**
       - **Account Header:** `Your Account` and the signed-in email.
       - **Divider line:** `1px solid var(--color-border-subtle)`.
       - **Theme Toggle (`#themeToggleItem`):** Switches between `Warm Paper (Light)` and `Warm Espresso (Dark)` with immediate `localStorage` persistence.
       - **Divider line:** `1px solid var(--color-border-subtle)`.
       - **Send Feedback (`#feedbackItem`):** Opens the feedback modal (lands in the admin page's feedback inbox).
       - **Admin Dashboard (`#adminItem`):** Only for admins (`ADMIN_EMAILS`); links to `/admin`.
       - **Sign out (`#signOutItem`).**
       - The Shortcuts Modal Sheet is no longer in the menu; it still opens by pressing <kbd>?</kbd>.
     - **Dismissal:** Automatically closes on outside click or pressing <kbd>Esc</kbd>.

---

### 4.2 Top-Fold 3-Card Deck

#### Card 1: Continue Studying (Priority Course #1 — Compact Layout)
- **Role:** Immediate resumption of the active course ("Pick up where you left off").
- **Priority Logic (Last Played Course Rule):**
  - Strictly selects **the course that a video was last played on** (`last_accessed_at` / playback activity timestamp).
  - Every time a learner plays or resumes a video in any course, that course becomes the top-ranked Priority Course upon returning to the Dashboard.
  - Ensures the priority course is **not the same course every time**—it dynamically shifts based on active study session context.
  - If the user has never played any video yet, defaults to the most recently enrolled course (`created_at`).
  - Active deadlines on the selected course still display their deadline badge (e.g., Warm Amber Badge if $\le 3$ days remain).
- **Card Specs:**
  - Background: `var(--color-surface)`, radius: `12px`, padding: `20px`, shadow: `var(--shadow-sm)`.
  - Left Accent Bar: `4px solid var(--color-primary)` (Forest Green, keeping amber strictly for deadlines).
- **Internal Elements:**
  1. **Eyebrow:** Line icon + `"PRIORITY COURSE"` (`11px`, bold, uppercase, color: `var(--color-primary)`).
  2. **Split Info Row:**
     - 16:9 Thumbnail (width: `130px`, height: `73px`, radius: `8px`).
     - Course Title: `Source Serif 4`, 18px, weight: 600.
     - Current Lesson: `Inter`, 13px, color: `var(--color-text-secondary)` (`"Ch 4 • Functions & Decorators"`).
  3. **Progress Bar & Deadline:**
     - Bar: Height `6px`, track: `var(--color-surface-muted)`, fill: `var(--color-primary)` (`width: 43%`).
     - Meta: `"6 of 14 Chapters (43%)"`.
     - Deadline Chip: If $\le 3$ days remain, displays amber badge: `"📅 3 days left"`.
  4. **Action Row:**
     - **"Resume Course →" Button:** Height `40px`, background: `var(--color-primary)`, text: `#FFFFFF`, radius: `8px`. Deep-links directly to the player at the current chapter.
     - **"Overview ↗" Link:** Ghost button, color: `var(--color-primary)`.

#### Card 2: Quick Quiz (Standalone MCQ Card)
- **Role:** Instant active recall multiple-choice question strictly sourced from **previously completed chapters across any enrolled course**.
- **Completed Chapters Only Filtering Rule:**
  - Questions are pulled strictly from chapters where the user has completed the lesson (`is_completed = true`).
  - Chapters currently in progress or not yet begun are completely excluded.
  - Cross-course capability: questions can originate from any enrolled course that has at least 1 completed chapter.
- **Strict No-Repeat Guarantee:**
  - **A question never repeats** during a practice session.
  - The client/server keeps a session set of served question IDs (`seenQuestionIds`).
  - Clicking `"Next Question →"` draws the next unvisited question from the completed chapter pool without replacement.
  - When all questions from completed chapters are exhausted, an encouraging "All Caught Up" state is displayed with a `[ Reset Practice Deck ⟳ ]` action and prompt to complete more chapters to unlock new questions.
- **Card Specs:** Background: `var(--color-surface)`, radius: `12px`, padding: `20px`, shadow: `var(--shadow-sm)`.
- **Internal Elements:**
  1. **Topic & Source Attribution Pill:** Badge indicating course, chapter, and topic (e.g., `Quick Quiz • Python 3 (Ch 4) • Functions`).
  2. **Question Counter:** e.g., `Question 1 of 8 (Completed Chapters Pool)`.
  3. **Question Text:** `Inter`, 14px, weight: 600, color: `var(--color-text-primary)` (e.g., *"What is the primary purpose of the @functools.wraps decorator?"*).
  4. **Interactive Options (Real Keyboard-Accessible `<button>` Elements):**
     - Full-width interactive buttons with `tabindex="0"`.
     - Default: `1px solid var(--color-border)`, background: `var(--color-surface)`.
     - Hover: background `var(--color-surface-muted)`.
     - Click: **Instant verification** (No submit button needed). Correct option highlights green with checkmark icon; incorrect option highlights terracotta with cross icon.
  5. **Footer Row & Report Question Option:**
     - `"Next Question →"` button to cycle the next non-repeating completed chapter question.
     - **`"⚑ Report"` Option:**
       - Subtle line button (`color: var(--color-text-secondary)`).
       - Clicking opens the **Report Question Card** popover floating directly over the quiz card.
       - **Report Card Contents:**
         - Header: `"Report Question"` + Close `[✕]` icon.
         - Category Pills: `[ Incorrect Answer ]`, `[ Typo / Grammar ]`, `[ Unclear ]`, `[ Other ]`.
         - Reason Input: Textarea to write the reason (placeholder: *"Explain the issue with this question..."*).
         - Actions: `[ Cancel ]` (ghost button, dismisses popover) and `[ Submit ]` (primary button, records report and shows non-blocking toast: *"Report submitted. Thank you for your feedback."*).
       - Non-destructive: Reporting does not reset question state or wipe answered choices.

#### Card 3: Recall Flashcard (3D Rotating Card)
- **Role:** Conceptual active recall prompt that rotates on click, strictly sourced from **previously completed chapters across any enrolled course**.
- **Completed Chapters Only Filtering Rule:**
  - Flashcards belong strictly to chapters marked completed (`is_completed = true`) across any enrolled course.
  - Material from upcoming or incomplete chapters is never exposed.
- **Strict No-Repeat Guarantee:**
  - **A flashcard never repeats** during a review session.
  - The client/server tracks served card IDs (`seenFlashcardIds`).
  - Advancing with `[ Got it ✓ ]` or cycling displays the next unvisited flashcard without replacement.
  - When all flashcards from completed chapters have been reviewed, renders an "All Caught Up" summary with a restart option (`[ Review Deck Again ⟳ ]`).
- **Card Specs:** 3D perspective container (`perspective: 1000px`), radius: `12px`, min-height: `220px`.
- **Interaction & Rotation Behavior:**
  - Accessible via keyboard Enter/Space or mouse click.
  - **Front Face:**
    - Header Row: Topic & Course Pill (`Active Recall • Python 3 (Ch 4) • Decorators`) + Counter (`Card 1 of 6`) + **`[ ⚑ Report ]` Button**.
    - Main Question: `"Can you recall this topic: Python decorators?"` (`Source Serif 4`, 16px, weight: 600).
    - Sub-prompt: *"Can you explain what a decorator does and give a real-world scenario where you would use one?"*
    - Bottom Prompt: `[ ⟲ Click card to rotate & reveal answer ]`.
  - **Back Face (180° Flip):**
    - Header Row: Topic Reference + **`[ ⚑ Report ]` Button**.
    - Smooth 250ms rotation reveals the concise reference explanation.
    - **Self-Assessment Actions:**
      - `[ Got it ✓ ]`: Marks the topic reviewed for today, smoothly flips to the front, and advances to the next unvisited completed chapter flashcard without repetition.
      - `[ Review Later ⟳ ]`: **Saves this card to the Course Page's Review tab** for targeted revision, flips front, and advances to the next unvisited flashcard.
    - Flip-back trigger: Clicking card body flips card back to front.
  - **Report Flashcard Option (Universal on Both Faces):**
    - **Event Isolation:** Clicking `[ ⚑ Report ]` executes `event.stopPropagation()` so the 3D card does **not** flip or rotate.
    - **Report Card Popover:**
      - Opens a small card overlay directly on top of the flashcard.
      - Reason Input: Multi-line textarea to write why the flashcard prompt or answer needs correction.
      - Action Buttons: `[ Cancel ]` (discards input and dismisses popover) and `[ Submit ]` (saves report, closes popover, and displays toast: *"Report submitted. Thank you for helping keep study cards accurate."*).

---

### 4.3 Other Enrolled Courses Section (Full-Width Library)
- **Header Row (Flex between):**
  - **Title:** `"Other Courses"` + accurate badge count `"(3)"` (Prevents duplicating the Priority Course shown above).
  - **Controls Group (Flex gap: 12px):**
    - **Course Search Bar (Left of Sort):**
      - Input field with embedded line search icon.
      - Width: `240px`, height: `36px`, border: `1px solid var(--color-border)`, radius: `8px`.
      - Placeholder: `"Search courses..."`.
      - Behavior: Real-time filtering by course title and creator name, with a 1-click `✕` clear button.
    - **Sort by Dropdown (Right of Search):**
      - Label: `"Sort by:"`.
      - Options: `Priority (Deadline Urgency)` (default), `Recently Studied`, `Completion %`, `Alphabetical (A–Z)`.
- **Course Card Grid:**
  - 3 columns (`grid-template-columns: repeat(3, 1fr)`, gap: `20px`).
- **Individual Course Card Specification:**
  - Thumbnail: 16:9 image with **total chapter count** badge (e.g., `"14 chapters"` instead of confusing single-video timestamp).
  - Title: 15px semi-bold, max 2 lines with ellipsis.
  - Creator: Channel name.
  - Progress: Linear bar + `"12 of 20 Chapters (60%)"`.
  - Deadline Badge: Shown only if deadline exists; amber only if $\le 3$ days.
  - Actions: `Resume` button (or `Review Course` if 100% complete) + `Details →` link.

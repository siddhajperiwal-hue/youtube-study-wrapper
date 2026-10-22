# Course Page Specification (Desktop MVP)

**File Target:** `course-page.md`  
**Route:** `/course/:id`  
**Purpose:** Course management, chapter syllabus navigation, aggregated resource library, unified notes document, active revision hub, and course settings.  
**Platform:** Desktop web only (1280px base grid, fluid 1024px–1400px centered container).  
**Visual Theme:** "The Quiet Study Desk" (Warm Paper `#FAF6EF` Light Mode, Warm Espresso `#141312` Dark Mode).  
**Tone & Voice:** Scholarly, structured, calm, and respectful. Zero gamified panic.

---

## 1. Page Architecture & Structural Wireframe

The Course Page acts as the comprehensive syllabus and administrative desk for a single enrolled playlist. It is **not** used for active video consumption (which takes place on the Learning Page), but serves as the control center before and after study sessions.

### 1.1 Structural Wireframe (Desktop Viewport ≥ 1200px)

```
+-------------------------------------------------------------------------------------------------------------------------+
| [TOP BAR: 56px] [Logo: StudyDesk]                                 [Streak: [Leaf] 5 Days]   [+ Add Course]         [👤] |
+-------------------------------------------------------------------------------------------------------------------------+
| <MAIN CONTAINER (max-width: 1320px, centered, padding: 32px 24px)>                                                      |
|                                                                                                                         |
| [BREADCRUMB]  ← Back to Dashboard  /  Python 3: From Scratch to Production                                             |
|                                                                                                                         |
| +---------------------------------------------------------------------------------------------------------------------+ |
| | HERO SECTION: COURSE HEADER & PROGRESS SUMMARY                                                                      | |
| |                                                                                                                     | |
| | +-----------------------+   Python 3: From Scratch to Production                     [ RESUME CHAPTER 4 → ]         | |
| | | [Thumb 16:9]          |   By Corey Schafer • 14 Chapters • Playlist on YouTube ↗   Next: Functions & Decorators   | |
| | | 200px × 112px         |                                                                                           | |
| | | [14 Chapters Pill]    |   PROGRESS BREAKDOWN:                                                                     | |
| | +-----------------------+   [============================---------------------------] 57% Studied (8 of 14)         | |
| |                             - 6 Mastered (Quiz Passed)  •  2 Watched (Quiz Skipped)  •  6 Remaining                 | |
| |                             Target Deadline: [📅 3 days left (Nov 20) - Amber Badge]                                | |
| +---------------------------------------------------------------------------------------------------------------------+ |
|                                                                                                                         |
| [TAB NAVIGATION BAR (5 Tabs, 48px height, sticky or inline)]                                                            |
| [ 1. Overview (14) ]  [ 2. Resources (28) ]  [ 3. Review (8) ]  [ 4. Notes ]  [ 5. Settings ]                           |
| ======================================================================================================================= |
|                                                                                                                         |
| [ACTIVE TAB CONTENT AREA]                                                                                               |
|                                                                                                                         |
| (When Tab 1: Overview is active)                                                                                        |
| Header: "Chapter Syllabus"        [🔍 Search chapters...]        Filters: [All (14)] [Completed (8)] [Incomplete (6)]  |
|                                                                                                                         |
| +---------------------------------------------------------------------------------------------------------------------+ |
| | [01]  Chapter 1: Installation, Virtualenv & Tooling                Duration: 18:40  | [✓ Mastered]  [ Rewatch ↺ ]   | |
| +---------------------------------------------------------------------------------------------------------------------+ |
| | [02]  Chapter 2: Data Types, Strings & Mutability                  Duration: 22:15  | [✓ Mastered]  [ Rewatch ↺ ]   | |
| +---------------------------------------------------------------------------------------------------------------------+ |
| | [03]  Chapter 3: Conditionals, Loops & Iterables                   Duration: 25:04  | [👁 Watched]   [ Rewatch ↺ ]   | |
| +---------------------------------------------------------------------------------------------------------------------+ |
| | [04]  Chapter 4: Functions, Closures & Decorators (CURRENT)        Duration: 31:10  | [● Up Next]   [ Continue → ]  | |
| +---------------------------------------------------------------------------------------------------------------------+ |
| | [05]  Chapter 5: Object-Oriented Programming & Dunder Methods      Duration: 42:00  | [○ Pending]   [ Start → ]     | |
| +---------------------------------------------------------------------------------------------------------------------+ |
| | ... [Chapters 06 – 14]                                                                                              | |
| +---------------------------------------------------------------------------------------------------------------------+ |
+-------------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Design System & Token Adherence

All elements adhere strictly to the "Quiet Study Desk" visual tokens established in `brand-brief.md`:

1. **Canvas & Surfaces:**
   - App Canvas: `var(--color-bg-app)` (`#FAF6EF` Light / `#141312` Dark).
   - Content Containers & Cards: `var(--color-surface)` (`#FFFFFF` Light / `#1E1C1A` Dark).
   - Notes Paper Canvas: `var(--color-surface-muted)` (`#F0EBE0` Light / `#292623` Dark).
   - Dividers & Outlines: `var(--color-border)` (`#DAD3C4` Light / `#383430` Dark).
2. **Typography Hierarchy:**
   - Course Title & Tab Headings: `Source Serif 4`, weights 600.
   - UI Controls, Tab Labels, Chapter Titles & Durations: `Inter`, weights 400/500/600.
   - Numeric Durations & Timestamps: `Inter` with `font-variant-numeric: tabular-nums`.
   - Body Text: Minimum `16px` with `1.6` line-height for zero eye strain.
3. **The Amber Rule Discipline:**
   - Warm Amber (`#D9962B` / `#E5A94E`) is strictly restricted to **Deadlines $\le 3$ days remaining**.
   - Completed badges use Botanical Green (`#2E7D4F`).
   - "Watched without quiz" badges use Soft Muted Sage (`#5F6B65` / `#F0EBE0`).
   - Primary buttons and active highlights use Forest Green (`#2F5D50`).

---

## 3. Section-by-Section Functional Specifications

### 3.1 Global Top Navigation Bar (Option C - Exact Specification) & Breadcrumb Navigation

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
       - **Account Header:** Displays user identity (`Student Account` / `Self-paced Learner`).
       - **Divider line:** `1px solid var(--color-border-subtle)`.
       - **Theme Toggle (`#themeToggleItem`):** Switches between `Warm Paper (Light)` and `Warm Espresso (Dark)` with immediate `localStorage` persistence.
       - **Keyboard Shortcuts (`#shortcutsItem`):** Summons the interactive Shortcuts Modal Sheet (`Space`, `J`, `L`, `T`, `F`, `?`, `Esc`). Can also be summoned directly by pressing <kbd>?</kbd>.
       - **Export Local Backup (`#backupItem`):** Downloads structured JSON archive containing enrolled courses, progress, and study notes.
       - **Divider line:** `1px solid var(--color-border-subtle)`.
       - **App Settings (`#appSettingsItem`):** In Course Page, directly activates the Settings tab (`tab-settings`) and scrolls into view; surfaces study session preferences.
     - **Dismissal:** Automatically closes on outside click or pressing <kbd>Esc</kbd>.
- **Breadcrumb Navigation:**
  - Placed directly beneath top bar with `24px` top margin.
  - Layout: `← Dashboard  /  Python 3: From Scratch to Production`.
  - Behavior: "← Dashboard" link is keyboard accessible (`Enter` navigates back to `/`).

---

### 3.2 Course Hero & Progress Summary Section

A single unified card providing the high-level pulse of the course.

- **Container Specs:** Background `var(--color-surface)`, border: `1px solid var(--color-border)`, radius: `12px`, padding: `24px`, shadow: `var(--shadow-sm)`.
- **Layout Split:** 2-column flex layout (Left: Media + Course Metadata + Progress Breakdown; Right: Urgent Actions & Resume CTA).
- **Elements:**
  1. **Course Thumbnail:**
     - Dimensions: `200px` width $\times$ `112px` height (16:9 ratio).
     - Radius: `8px`.
     - Overlay Badge: Pill in bottom-right corner showing total chapter count (`14 Chapters`).
  2. **Course Title & Channel Metadata:**
     - Title: `Source Serif 4`, 26px, semi-bold (`color: var(--color-text-primary)`).
     - Subtitle / Author Row: `Inter`, 14px, `color: var(--color-text-secondary)`.
       - Channel name: e.g., *"By Corey Schafer"*.
       - External Source Link: *"Playlist on YouTube ↗"* (opens in new tab with `target="_blank" rel="noopener noreferrer"`).
  3. **4-Part Metric & Segmented Progress Bar:**
     - **Headline Metric:** `"8 of 14 Chapters Studied (57%)"`.
     - **Segmented Visual Bar:** Height `8px`, border-radius `4px`, background `var(--color-surface-muted)`.
       - Segment 1 (Mastered / Quiz Passed): Forest Green (`#2F5D50`), width `43%` (6 chapters).
       - Segment 2 (Watched / Quiz Skipped): Muted Botanical Sage (`#7A9A8B`), width `14%` (2 chapters).
       - Segment 3 (Remaining): Track background (`#F0EBE0` / `#292623`), width `43%` (6 chapters).
     - **Detailed Stat Legend (Horizontal Strip):**
       - `● 6 Mastered (Quiz Passed)` (Forest Green indicator dot).
       - `● 2 Watched (Quiz Skipped)` (Muted Sage indicator dot).
       - `○ 6 Remaining` (Muted border circle).
  4. **Target Deadline Chip:**
     - If $\le 3$ days remaining: Amber badge `📅 3 days left (Nov 20)` with amber border and background.
     - If $> 3$ days remaining: Neutral badge `📅 Nov 28 • 11 days left`.
     - If no deadline set: Muted link button `+ Set target deadline` (jumps to Settings tab).
  5. **Primary Action: "Resume Course" Hero Button:**
     - Right-aligned block.
     - Primary Button: `Resume Chapter 4 →` (Height `48px`, padding `0 24px`, radius `10px`, background `var(--color-primary)`, text `#FFFFFF`, font-weight 600).
     - Sub-caption: *"Next up: Chapter 4 • Functions & Decorators (31:10)"*.
     - Behavior: One-click deep-link to `/course/:id/learn/chapter-4` on the Learning Page.

---

### 3.3 Universal Tab Navigation Bar

- **Positioning:** Inline under the hero section with `28px` margin. Sticky beneath top bar when scrolled past hero.
- **Height:** `48px`.
- **Border:** `1px solid var(--color-border)` bottom dividing line.
- **Tab Items (5 Tabs):**
  1. `Overview (14)`: Default view. Complete sequential chapter list and status.
  2. `Resources (28)`: External links and code repositories aggregated from video descriptions.
  3. `Review (8)`: Active revision flashcards and practice questions from completed chapters.
  4. `Notes`: Unified, course-wide editable notes document with export.
  5. `Settings`: Course title, deadline configuration, quiz toggles, and deletion.
- **Active State Indicator:**
  - Active tab text is bold with `color: var(--color-primary)`.
  - Bottom indicator bar: `2px solid var(--color-primary)` sliding under the active label.
  - Hover state: Background `var(--color-surface-muted)`, smooth 150ms transition.

---

## 4. Tab 1: Overview & Chapter List (Default View)

The primary roadmap for navigating the course sequentially.

### 4.1 Syllabus Controls & Filters
- **Flex Row (Between):**
  - Left: **Chapter Search Field:**
    - Input: `height: 38px`, `width: 260px`, `border: 1px solid var(--color-border)`, radius `8px`.
    - Placeholder: `"Filter chapters by title..."`.
    - Real-time client-side filter with clear `✕` button.
  - Right: **Status Filter Chips:**
    - Pill buttons: `All (14)`, `Completed (8)`, `Incomplete (6)`.
    - Active pill: `background: var(--color-primary)`, text: `#FFFFFF`.

### 4.2 Chapter Row Structure
Each chapter is rendered as a clean, accessible list row (`<article class="chapter-row">`).

```
+-------------------------------------------------------------------------------------------------------------------------+
| [04]  Functions, Closures & Decorators                              31:10  |  [● In Progress]  [ Continue Chapter → ]   |
|       Covers scope, first-class functions, inner wrappers, and @wraps.                                                  |
+-------------------------------------------------------------------------------------------------------------------------+
```

- **Row Specs:**
  - Container: Background `var(--color-surface)`, border: `1px solid var(--color-border)`, radius: `10px`, padding: `16px 20px`, margin-bottom: `10px`.
  - Hover: `border-color: var(--color-primary)`, subtle elevation `var(--shadow-sm)`.
  - Keyboard accessible: Entire card or action button focusable via `Tab`.
- **Left Column:**
  - **Index Badge:** Tabular chapter index `01`, `02`, `03`... (`font-weight: 600`, color `var(--color-text-secondary)`).
  - **Chapter Title:** `Inter`, 16px, semi-bold (`color: var(--color-text-primary)`).
  - **Short Summary / Description Excerpt:** 13px, truncated to 1 line, `color: var(--color-text-secondary)`.
- **Right Column (Metadata & Actions):**
  - **Duration:** `Inter tabular-nums`, 14px (e.g., `31:10`).
  - **Status Pill (3 Mutually Exclusive States):**
    1. **Mastered:** `✓ Mastered` — Botanical green pill (`#2E7D4F` text, `#EAF5EE` bg). Video watched and quiz completed.
    2. **Watched (Quiz Skipped):** `👁 Watched` — Muted slate pill (`#5F6B65` text, `#F0EBE0` bg). Video watched, but quiz was skipped.
    3. **In Progress / Not Started:**
       - If currently active: `● Up Next` (Forest Green dot + text).
       - If not started: `○ Not Started` (Muted outline circle).
  - **Action Button:**
    - Active / Incomplete Chapter: `Continue Chapter →` or `Start Chapter →` (Primary button, height `36px`, padding `0 16px`).
    - Completed Chapter: `Rewatch ↺` (Ghost button, color `var(--color-text-secondary)`).
  - **Click Behavior:** Clicking anywhere on the row routes directly to `/course/:id/learn/:chapterId`.

---

## 5. Tab 2: Resources (Extracted Description Links)

Solves the messy YouTube description problem by parsing and categorizing all creator links by chapter.

### 5.1 Purpose & Aggregation Logic
- Parses each video description in the playlist for HTTP/HTTPS links.
- Strips affiliate link clutter where possible, presenting clean external references.
- Groups all discovered links under their respective chapter accordion / section.

### 5.2 Chapter-Grouped Directory Wireframe

```
+-------------------------------------------------------------------------------------------------------------------------+
| RESOURCES & REPOSITORIES (28 links found across 14 chapters)                       [🔍 Search resources across course]  |
|                                                                                                                         |
| ▼ CHAPTER 01: INSTALLATION & TOOLING                                                                   (3 links)        |
|   +-------------------------------------------------------------------------------------------------------------------+ |
|   | [💻 Code]  Official GitHub Repository for Course Code                  github.com/coreyms/python-code        [↗]   | |
|   | [📄 Doc]   Python 3.12 Official Documentation                         docs.python.org                       [↗]   | |
|   | [🛠 Tool]  VS Code Python Extension Pack                              marketplace.visualstudio.com          [↗]   | |
|   +-------------------------------------------------------------------------------------------------------------------+ |
|                                                                                                                         |
| ▼ CHAPTER 04: FUNCTIONS, CLOSURES & DECORATORS                                                         (2 links)        |
|   +-------------------------------------------------------------------------------------------------------------------+ |
|   | [💻 Code]  Decorator Examples & Wrap Boilerplate                       github.com/coreyms/python-code/ch4    [↗]   | |
|   | [📄 Doc]   PEP 318 – Decorators for Functions and Methods             peps.python.org/pep-0318              [↗]   | |
|   +-------------------------------------------------------------------------------------------------------------------+ |
|                                                                                                                         |
| ▶ CHAPTER 05: OBJECT-ORIENTED PROGRAMMING                                                              (No links)       |
|   "No external resources referenced in this video description."                                                         |
+-------------------------------------------------------------------------------------------------------------------------+
```

### 5.3 Categorized Resource Item Specs
- **Category Detection & Line Icons:**
  - `💻 Code / Repository`: Detected if domain matches `github.com`, `gitlab.com`, `replit.com`, etc.
  - `📄 Documentation / PDF`: Detected if domain matches `docs.*`, `*.pdf`, `notion.site`, `arxiv.org`.
  - `🛠 Tool / Environment`: Detected if link points to software/extensions (`python.org/downloads`, `brew.sh`).
  - `🌐 External Article`: Default fallback for general web resources.
- **Link Row Elements:**
  - Line icon of category + Category tag.
  - Resource Title: Clean descriptive title extracted from the description line.
  - Destination Domain Pill: e.g., `github.com` (Truncated clean domain, `12px tabular-nums`).
  - External Link Icon: `↗` indicating new browser tab (`target="_blank" rel="noopener noreferrer"`).
- **Empty State per Chapter:** If a chapter has no links, it renders a subtle italicized note: *"No external links in this video."*

---

## 6. Tab 3: Review (Revision Only)

A dedicated active recall gym strictly covering concepts from **already completed chapters**. Never dumps unlearned material.

### 6.1 Layout Architecture (Dual-Pane Split: 50% Practice Questions | 50% Saved Flashcards)

```
+-------------------------------------------------------------------------------------------------------------------------+
| REVIEW & ACTIVE RECALL (8 Completed Topics Ready for Revision)                                                          |
|                                                                                                                         |
| +---------------------------------------------------+ +---------------------------------------------------------------+ |
| | PRACTICE QUESTION (1 of 6 available)   [Report ⚑] | | SAVED FLASHCARDS (3 in review deck)                [Report ⚑] | |
| | Topic: Chapter 4 • Decorators                     | | Topic: Chapter 2 • Mutability                                 | |
| |                                                   | |                                                               | |
| | "What is the primary purpose of applying          | | +-----------------------------------------------------------+ | |
| |  functools.wraps to an inner decorator function?" | | | [ROTATING CARD - FRONT FACE]                              | | |
| |                                                   | | | Topic: Ch 2 • Mutability vs Immutability    [Report ⚑]   | | |
| | [A] To optimize runtime execution speed           | | |                                                           | | |
| | [B] To preserve original function metadata (name) | | | "What happens in memory when you modify a list            | | |
| | [C] To prevent recursive stack overflows          | | |  versus concatenating a string in Python?"                | | |
| |                                                   | | |                                                           | | |
| | Status: Instant feedback on click                 | | | [ ⟲ Click or press Enter to rotate & view answer ]        | | |
| |                                                   | | +-----------------------------------------------------------+ | |
| | [Next Practice Question →]                        | | Actions on Back: [ ✓ Got It ]   [ ⟳ Keep in Review ]          | |
| +---------------------------------------------------+ +---------------------------------------------------------------+ |
+-------------------------------------------------------------------------------------------------------------------------+
```

### 6.2 Component Specifications
1. **Practice Question Card:**
   - Same accessible button options as Dashboard Quick Quiz.
   - Immediate feedback upon click (Green check for correct + explanatory note; Red terracotta for incorrect).
   - "Next Question →" button to cycle through the completed question pool.
   - **`[ ⚑ Report ]` Button & Popover Card:**
     - Placed in the practice question header metadata row.
     - Clicking summons the **Report Question Card** popover directly over the practice question container.
     - Contains issue category selection pills (`[ Incorrect Answer ]`, `[ Typo / Formatting ]`, `[ Ambiguous Phrasing ]`, `[ Other ]`).
     - Reason Textarea: Input field to write the explanation (placeholder: *"Explain what is wrong with this practice question..."*).
     - Action Buttons: `[ Cancel ]` (ghost button, dismisses card) and `[ Submit ]` (primary button, records report and shows confirmation toast: *"Report submitted. Thank you for your feedback."*).
     - Non-destructive: Does not reset question state or wipe answered choices.
2. **Rotating Flashcard Deck:**
   - 3D flip card mechanism matching the Dashboard spec (`perspective: 1000px`, 250ms flip).
   - Back face actions:
     - `[ Got It ✓ ]`: Marks the card mastered and removes it from immediate review.
     - `[ Keep in Review ⟳ ]`: Retains card in the course review queue.
   - **`[ ⚑ Report ]` Button & Popover Card (Front & Back Faces):**
     - Placed in the top-right utility row on both the Front Face and Back Face of the flashcard.
     - **Event Isolation:** Clicking `[ ⚑ Report ]` executes `event.stopPropagation()` so the 3D card does **not** flip or rotate.
     - Opens a small card overlay directly on top of the flashcard with reason textarea, `[ Cancel ]`, and `[ Submit ]` buttons.
     - Submitting shows a toast: *"Report submitted. Thank you for helping keep study cards accurate."*
3. **Zero Completed Chapters State:**
   - If user has 0 completed chapters, renders a centered calm state:
     - Line icon: Open book.
     - Headline: *"Revision unlocks with progress."*
     - Body: *"Complete your first chapter and quiz to unlock targeted practice questions and recall flashcards here."*
     - CTA: `Go to Chapter 1 →`.

---

## 7. Tab 4: Notes (Unified Course Notes Document)

Aggregates all timestamped notes taken during study sessions into a single, cohesive course document.

### 7.1 Notes Canvas & Toolbar
- **Header Actions (Flex between):**
  - Left: Title: `"Course Notes"` + Word count badge (`1,420 words • 6 chapters annotated`).
  - Right:
    - **"Copy Markdown" Button:** Copies entire raw markdown text to clipboard with 2-second "Copied! ✓" toast feedback.
    - **"Download .md" Button:** Triggers browser download of `python-3-from-scratch-notes.md`.
    - Auto-save indicator: `● Saved locally`.
- **Canvas Styling:**
  - Background: Soft Linen Paper `var(--color-surface-muted)` (`#F0EBE0` Light / `#292623` Dark).
  - Padding: `32px 40px`.
  - Border radius: `12px`.
  - Border: `1px solid var(--color-border)`.
  - Font: `Source Serif 4` for headings and body notes (classic book typography).

### 7.2 Synchronized Note Structure & Unified Continuous Document
- **Single Continuous Document (No Blocks / No Segmented Cards):**
  - Notes across all chapters flow seamlessly within a single, cohesive document sheet (styled like an authentic longform scholarly paper or clean Markdown document).
  - Eliminates artificial boxes, cards, or per-chapter sheet wrappers.
  - Formatted cleanly with typography hierarchy (`# Document Title`, `### Chapter Headings`, standard prose paragraphs, bulleted takeaways, and inline code blocks):
    ```markdown
    # Python 3: From Scratch to Production — Course Notes

    ### Chapter 01: Installation, Virtualenv & Tooling
    Always isolate package dependencies per project using virtual environments. Never install third-party packages into the global system interpreter.
    - [04:15] Initialize via `python -m venv .venv` in the repository root.
    - [08:50] Activate via `source .venv/bin/activate` on Unix or `.venv\Scripts\activate` on Windows.

    ### Chapter 02: Data Types, Strings & Mutability
    Understanding variable memory addresses is foundational to preventing subtle bugs with default parameters:
    - [12:30] Never use mutable objects (like `[]` or `{}`) as default parameters. Python evaluates defaults once at definition time.
    - [16:50] Use `None` as the sentinel default and assign inside the function body.

    ### Chapter 03: Conditionals, Loops & Iterables
    Python loops rely on iterator protocols rather than index counting:
    - [06:50] Prefer `enumerate(iterable, start=1)` over manual index incrementation.
    - [14:50] The `else` clause on a `for` loop executes only if the loop completes without hitting a `break` statement.

    ### Chapter 04: Functions, Closures & Decorators
    Decorators wrap functions using higher-order closures to augment behavior without modifying source code:
    - [10:12] Always import `from functools import wraps` and decorate wrappers with `@wraps(func)` to preserve original function docstrings and `__name__`.
    ```
- **Clickable Timestamp Pills:**
  - Pills: `[MM:SS]` formatted chip (`Inter`, tabular numbers, `font-size: 13px`).
  - Click behavior: Deep-links directly into the Learning Page at that exact video timestamp: `/course/:id/learn/chapter-1?t=255`.
- **In-Place Editing:**
  - Entire document is directly editable in-place (`contenteditable="true"`), with live debounced auto-saving to local storage.

---

## 8. Tab 5: Settings (Course Configuration & Management)

Administrative and learning controls for this specific course.

### 8.1 Settings Groups

```
+-------------------------------------------------------------------------------------------------------------------------+
| COURSE SETTINGS                                                                                                         |
|                                                                                                                         |
| 1. COURSE IDENTITY                                                                                                      |
|    Course Title:                                                                                                        |
|    [ Python 3: From Scratch to Production                                                    ]                          |
|    Source Playlist URL:                                                                                                 |
|    https://www.youtube.com/playlist?list=PL-osiE80TeTt2d9bfVyMT88NdZ3wVvH_E (Read-only)                                 |
|                                                                                                                         |
| 2. LEARNING PREFERENCES                                                                                                 |
|    [X] End-of-Chapter Quizzes: Require active quiz completion before marking chapter as mastered.                       |
|    [X] Generate Recall Flashcards: Automatically produce flashcards for the Review tab.                                 |
|    [X] 20-Minute Focus Breaks: Auto-pause player every 20 minutes for a scientific rest interval.                       |
|                                                                                                                         |
| 3. TARGET DEADLINE                                                                                                      |
|    Target Completion Date: [ 2026-11-20 📅 ]         [ Clear Deadline ]                                                 |
|    (Displays amber countdown badges across dashboard and course header when within 3 days).                             |
|                                                                                                                         |
| 4. DANGER ZONE                                                                                                          |
|    +------------------------------------------------------------------------------------------------------------------+ |
|    | Delete this course                                                                                               | |
|    | Once deleted, all progress records, custom notes, and review questions will be permanently removed.              | |
|    |                                                                                         [ Delete Course... ]     | |
|    +------------------------------------------------------------------------------------------------------------------+ |
+-------------------------------------------------------------------------------------------------------------------------+
```

### 8.2 Component Specifications
1. **Course Identity:**
   - Input for Course Title (editable). Saved on blur or via "Save Changes" button.
2. **Active Learning Toggles:**
   - Semantic accessible toggle switches with clear descriptions.
   - Toggling *End-of-Chapter Quizzes* off allows videos to be marked "Mastered" without quiz completion.
3. **Deadline Selector:**
   - Standard HTML5 date picker input (`<input type="date">`).
   - "Clear Deadline" button resets deadline to null.
4. **Danger Zone & Delete Confirmation Modal:**
   - Card background: Subtle light terracotta wash (`rgba(181, 71, 58, 0.04)`), border: `1px solid var(--color-error)`.
   - Action Button: Destructive red button `Delete Course...` (`#B5473A`).
   - **Confirmation Modal:**
     - Modal sheet over semi-transparent scrim (`rgba(23, 28, 26, 0.75)`).
     - Heading: *"Are you sure you want to delete this course?"*
     - Warning: *"This action cannot be undone. All 14 chapters, your notes (1,420 words), and quiz records will be erased."*
     - Confirmation Input: Requires user to type the word `"DELETE"` to enable the final confirmation button.
     - Actions: `Cancel` (dismisses modal) | `Permanently Delete` (deletes from local storage and redirects to `/`).

---

## 9. Responsive Breakpoints & Viewport Adaptations

Although the app is strictly targeted for desktop browsers, it cleanly scales across desktop monitor sizes:

| Viewport Range | Layout Adjustments |
| :--- | :--- |
| **≥ 1440px (Wide Desktop)** | Main container max-width `1320px`, centered. Dual-pane review is 50% / 50%. Chapter rows have generous padding (`20px`). |
| **1200px – 1439px (Standard)** | Base design target. Hero section is 2-column flex. Tab navigation is fully visible without scrolling. |
| **1024px – 1199px (Compact Laptop)**| Main container padding `20px 16px`. Hero right-side CTA stacks below course metadata. Review tab practice question and flashcard stack vertically into 1 column. |

---

## 10. Summary Checklist for HTML/CSS/JS Prototype Implementation

When generating `course-page.html`, the following interactive features must be fully functional:
- [x] Top bar with theme toggle (Warm Paper light mode $\leftrightarrow$ Warm Espresso dark mode).
- [x] Functional 5-tab switcher (`Overview`, `Resources`, `Review`, `Notes`, `Settings`).
- [x] Real-time chapter search and filter pills (`All`, `Completed`, `Incomplete`).
- [x] Direct navigation buttons routing to Learning Page with chapter query params.
- [x] Grouped accordion/list in Resources tab with external link icons and domain pills.
- [x] Working Practice Quiz with instant correct/incorrect feedback.
- [x] 3D rotating Flashcard with front/back flip and "Got It" / "Keep in Review" state triggers.
- [x] Notes pad with "Copy Markdown" and "Download .md" buttons.
- [x] Settings form with deadline picker, learning toggles, and two-step delete confirmation modal.
- [x] Working Report Question and Report Flashcard popover cards with reason textarea, `[Cancel]`, and `[Submit]` actions.

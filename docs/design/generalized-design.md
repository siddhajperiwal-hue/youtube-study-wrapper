# Generalized UI/UX Design System (Desktop MVP)

**Scope:** Global navigation, structural layout rules, design tokens, and universal component standards across all pages.  
**Platform:** Desktop web only  
**Document:** Generalized design  

---

## 1. Global Navigation Architecture: Surface-Specific Header Strategy

To protect learner focus and respect cognitive boundaries, the application enforces a strict architectural division:
- **Global Browsing Surfaces (Dashboard & Course Page):** Feature the universal 56px Global Top Navigation Bar for platform orientation, course ingestion, habit tracking, and utilities.
- **Dedicated Study Surface (Learning Page):** Completely **omits the global navigation bar**. The study theater operates in a self-contained environment with local session controls only, eliminating browsing distractions while in a learning flow.

---

### 1.1 Structural Dimensions (Browsing Pages)
- **Applies to:** `Dashboard` (`/`) and `Course Page` (`/course/:id`) only.
- **Height:** Fixed `56px`.
- **Position:** Fixed / sticky to the top of the viewport (`z-index: 100`).
- **Border:** Subtle `1px solid var(--color-border)` dividing navigation from page canvas.
- **Background:** `var(--color-surface)` (`#FFFFFF` Light / `#1E1C1A` Dark) with soft ambient elevation (`var(--shadow-sm)`).

---

### 1.2 Global Navbar Layout & Component Placement (Option C)

```
+---------------------------------------------------------------------------------------------------------+
| [Logo: StudyDesk]                                              [Leaf: 5 Days]    [+ Add Course]    [👤] |
+---------------------------------------------------------------------------------------------------------+
                                                                                                      |
                                                                        +-----------------------------+
                                                                        | PROFILE & UTILITIES DROPDOWN|
                                                                        | --------------------------- |
                                                                        | 🌙 / ☀️ Theme: Espresso/Paper|
                                                                        | ⌨ Keyboard Shortcuts ( ? )  |
                                                                        | 💾 Export Local Data Backup |
                                                                        | ⚙ App Settings             |
                                                                        +-----------------------------+
```

#### Left Zone: Brand Identity & Home Navigation
- **Wordmark & Logo:** `StudyDesk`
  - Font: `Source Serif 4`, 20px, semi-bold (`var(--color-text-primary)`).
  - Paired with an organic book leaf SVG mark (`28px × 28px` container, `var(--color-primary)`).
  - **Interaction:** Clicking anywhere on the brand group routes directly to the Dashboard (`/`). Universal web standard for home navigation—eliminates redundant "Dashboard" text links.

#### Right Zone: Action & Utility Cluster (Left-to-Right Hierarchy)
1. **Study Streak Badge (Daily Habit Anchor):**
   - Visual: Pill chip (`var(--color-surface-muted)`, border: `1px solid var(--color-border)`).
   - Content: Subtle leaf/flame line icon + tabular text (e.g., `5 Day Streak`).
   - State Behavior:
     - **Active Today:** Botanical green border and icon (`#2E7D4F`) once 20 active minutes of video have been watched on that calendar day.
     - **Pending Today:** Neutral slate border and icon (`#5F6B65`) when the daily watch threshold has not yet been achieved.
   - Tooltip: *"5 consecutive study days. Watch 20 minutes today to maintain your streak."*
2. **`+ Add Course` Button (Primary Ingestion Action):**
   - Visual: High-visibility primary button (`background: var(--color-primary)`, text: `#FFFFFF`, radius: `8px`, height: `38px`, padding: `0 16px`).
   - Content: Plus line icon + label `+ Add Course`.
   - Interaction: Accessible click target that immediately summons the global **Add Course Modal Sheet** from both the Dashboard and the Course Page.
3. **Profile & Utilities Avatar (Circular Icon):**
   - Dimensions: `36px × 36px` circular button on the far right (`border-radius: 50%`, border: `1px solid var(--color-border)`).
   - Visual: Clean initials avatar (e.g., `S` for Student) or a minimalist line avatar icon (`👤`).
   - Role: Acts as the unified utility anchor for personal app settings, preventing the top bar from becoming cluttered with standalone toggles.
   - **Dropdown Menu on Click (Width: 220px, right-aligned):**
     - **Theme Toggle:** Switch between `Warm Paper (Light)` and `Warm Espresso (Dark)`.
     - **Keyboard Shortcuts:** Opens modal cheat sheet (`Space`, `J`, `L`, `T`, `F`).
     - **Data & Backups:** Export full markdown notes archive or backup local database.
     - **App Preferences:** Configure default focus interval (20m) and break lengths (5m).

---

### 1.3 Learning Page Exemption (No Global Navbar)

The Learning Page (`/course/:id/learn/:chapterId`) **does not render this global navigation bar**:
- **Why Excluded:** 
  1. Prevents accidental exits from an active video lecture or focus timer block.
  2. Protects 100% of vertical screen height for video and notes.
  3. Prevents visual clutter from streak badges and course ingestion while in deep focus.
- **In-Session Top Bar (State B):** The Learning Page uses its own dedicated in-session study header:
  - Contextual `← Back to Course` button (safely pauses playback and returns to syllabus).
  - Truncated Course and Chapter name.
  - Active Scientific Focus countdown timer (`⏱ 20:00`).
  - Distraction-Free Focus Mode toggle button.
- **Distraction-Free Mode (State C):** Even the in-session bar auto-hides entirely to maximize video canvas.

---

## 2. Layout Grid & Viewport Containers

- **Browsing Pages (Dashboard & Course Page):**
  - **Container:** Centered layout with maximum width of `1280px` – `1360px` with generous side padding (`24px` – `32px`) to avoid visual fatigue across wide displays.
- **Study Page (Learning Page):**
  - **Container:** Full-width fluid layout (`100vw`, `100vh`) to maximize the side-by-side workspace:
    - **Video Column (Left):** `60%` width (constrained strictly to 16:9 aspect ratio).
    - **Notes Column (Right):** `40%` width with independent internal vertical scrolling and dedicated one-page-per-chapter layout.

---

## 3. Universal Component Standard: Question Cards & Flashcards "Report Issue" Pattern

To maintain high instructional quality and allow learners to flag errors (typos, incorrect answer keys, ambiguous phrasing, or broken explanations), all question cards and flashcards throughout the application adhere to a unified **"Report Issue"** micro-interaction pattern.

### 3.1 Scope of Application
This pattern applies strictly to:
1. **All Question Cards:**
   - Dashboard: Quick Quiz Card (Standalone MCQ).
   - Learning Page: Resume Recall Refresher Overlay (Overlay 1 MCQ).
   - Learning Page: End-of-Chapter Knowledge Check Overlay (Overlay 2 MCQ).
   - Course Page: Review Tab Practice Questions.
2. **All Flashcards:**
   - Dashboard: 3D Rotating Recall Flashcard.
   - Course Page: Review Tab Saved Flashcard Deck.

---

### 3.2 Visual Trigger Specification
- **Button Element:** `[ ⚑ Report ]` (or icon button `⚑`).
- **Placement:**
  - **Question Cards:** Header or footer metadata row, right-aligned opposite the question counter or progress status.
  - **Flashcards:** Top-right utility slot on both the Front Face and Back Face of the card.
- **Styling:**
  - Background: Transparent (`ghost`).
  - Font: `Inter`, 12px, weight 500, color: `var(--color-text-secondary)`.
  - Icon: Flag outline SVG (`14px × 14px`, stroke: `currentColor`).
  - Hover: Subtle surface tint (`background: var(--color-surface-muted)`, color: `var(--color-text-primary)`).
- **Critical Flashcard Event Handling:**
  - Clicking `[ ⚑ Report ]` on a 3D rotating flashcard invokes `event.stopPropagation()` to prevent triggering the card's 180° flip animation.

---

### 3.3 The Report Card Popover / Sheet Wireframe

```
+-----------------------------------------------------------------------+
| ⚑ REPORT QUESTION / FLASHCARD                                     [✕] |
| --------------------------------------------------------------------- |
| Help us keep course materials accurate and clear.                     |
|                                                                       |
| ISSUE CATEGORY:                                                       |
| [ Incorrect Answer ]   [ Typo / Grammar ]   [ Unclear ]   [ Other ]   |
|                                                                       |
| REASON / DETAILS:                                                     |
| +-------------------------------------------------------------------+ |
| | Briefly explain the issue (e.g., Option B is marked correct, but  | |
| | the explanation describes Option A)...                            | |
| +-------------------------------------------------------------------+ |
|                                                                       |
| [ Cancel ]                                           [ Submit Report ]|
+-----------------------------------------------------------------------+
```

---

### 3.4 Component Specifications & Interaction Lifecycle

1. **Card Container & Elevation:**
   - Width: `340px – 380px`.
   - Background: `var(--color-surface)` (`#FFFFFF` Light / `#1E1C1A` Dark).
   - Border: `1px solid var(--color-border)`.
   - Radius: `10px` (`var(--radius-md)`).
   - Shadow: `var(--shadow-md)` (elevated floating popover).
   - Position: Anchored popover directly beneath the flag trigger, or centered lightweight overlay card with backdrop scrim (`rgba(20, 19, 18, 0.4)`).
2. **Category Selection Pills (Quick Triage):**
   - Options: `[ Incorrect Answer ]`, `[ Typo / Formatting ]`, `[ Ambiguous Phrasing ]`, `[ Outdated Info ]`, `[ Other ]`.
   - Interaction: Single-select toggle pills (`height: 26px`, font size: `11px`). Selected pill applies active border and accent background.
3. **Reason Text Area:**
   - Height: `76px` min-height, vertical resize only or fixed.
   - Font: `Inter`, 13px, line-height `1.5`.
   - Border: `1px solid var(--color-border)`, radius `6px`.
   - Focus: `border-color: var(--color-primary)` with subtle focus ring.
   - Placeholder: *"Briefly describe what needs correction..."*
4. **Action Buttons:**
   - **`[ Cancel ]` Button:**
     - Style: Ghost / secondary (`height: 32px`, padding: `0 12px`, border: `1px solid var(--color-border)`, radius: `6px`).
     - Behavior: Discards unsaved text, closes the card popover, and returns focus to the parent question or flashcard.
   - **`[ Submit Report ]` Button:**
     - Style: Primary action (`height: 32px`, padding: `0 14px`, background: `var(--color-primary)`, color: `#FFFFFF`, radius: `6px`, font-weight: 600).
     - Validation: Enabled once text is entered or an issue category is selected.
     - Behavior on Click:
       1. Dispatches report payload to local storage or report feedback queue.
       2. Closes the report card smoothly.
       3. Displays a non-intrusive confirmation toast: `"Report submitted. Thank you for helping keep study materials accurate."`
5. **Non-Destructive Guarantee:**
   - Reporting a question or flashcard **never** resets selected answers, does not reset active video playback, does not pause background focus timers, and does not advance or skip the chapter.
6. **Dismissal & Accessibility:**
   - Closes on clicking outside the card, pressing <kbd>Esc</kbd>, or clicking the `[✕]` close icon.


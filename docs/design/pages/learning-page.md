# Learning Page Specification (Desktop MVP)

**File Target:** `learning-page.md`  
**Route:** `/course/:id/learn/:chapterId`  
**Purpose:** Dedicated distraction-free study theater combining synchronized 16:9 video playback, continuous timestamped notes pad, scientific focus intervals, and active recall overlays.  
**Platform:** Desktop web only (100vw fluid split, minimum width 1024px, optimized for 1280px–1920px).  
**Visual Theme:** "The Quiet Study Desk" (Warm Paper `#FAF6EF` Light Mode; zero-distraction editorial study palette. Dark mode switcher is intentionally omitted on the Learning Page to maintain uninterrupted visual focus and paper fidelity).  
**Tone & Voice:** Quiet, supportive, academically rigorous, and zero-guilt.

---

## 1. Page Architecture & Structural Wireframes

The Learning Page eliminates extraneous browsing clutter, adopting an asymmetric **60% Video / 40% Notes** split layout. This preserves source material fidelity on the left while providing an expansive, tactile notepad on the right.

### 1.1 Structural Wireframe: Normal Mode (Default 60/40 Split)

```
+-------------------------------------------------------------------------------------------------------------------------+
| [TOP BAR: 56px] [← Back to Course]      Python 3: Ch 4 — Functions & Decorators        [⏱ 20:00 ▾]    [ ⛶ Focus Mode ] |
+-------------------------------------------------------------------------------------------------------------------------+
| <MAIN VIEWPORT: 100vw, height: calc(100vh - 56px), overflow: hidden, display: flex>                                    |
|                                                                                                                         |
| LEFT COLUMN: 60% Width (Scrollable)                   | RIGHT COLUMN: 40% Width (Fixed Notebook)                        |
|                                                       | (Background: var(--color-surface-muted), soft linen paper)      |
| +---------------------------------------------------+ | +-------------------------------------------------------------+ |
| | 16:9 EMBEDDED VIDEO PLAYER CONTAINER              | | | [NOTES TOOLBAR]                                             | |
| | (Player dimensions: fluid 16:9 ratio)             | | | [⏱ Insert Timestamp] [B] [I] [List]        ● Auto-saved      | |
| |                                                   | | +-------------------------------------------------------------+ |
| | [ Playback Video: Corey Schafer — Decorators ]     | | | [CONTINUOUS SCROLLABLE NOTES CANVAS]                        | |
| | [ Time: 12:45 / 31:10 ]                           | | |                                                             | |
| |                                                   | | | ### Chapter 03: Conditionals & Loops                        | |
| | +-----------------------------------------------+ | | | - [06:50] Prefer enumerate() over manual indexes.           | |
| | | (OVERLAY SCRIM CONTAINER - Paused & Hidden)   | | |                                                             | |
| | +-----------------------------------------------+ | | | ### Chapter 04: Functions, Closures & Decorators            | |
| +---------------------------------------------------+ | | | - Higher-order functions can take functions as arguments.  | |
|                                                       | | | - [10:12] Decorators wrap existing functions:               | |
| [CHAPTER CONTROLS BAR]                                | | |   ```python                                                 | |
| [◀ Previous Ch]   [ Chapter 04: Decorators ▾ ]   [Next Ch ▶] | |   def my_decorator(func):                                   | |
|                                                       | | |       @wraps(func)                                          | |
| +---------------------------------------------------+ | | |   ```                                                       | |
| | COLLAPSIBLE VIDEO DESCRIPTION                     | | | - [12:45] Active cursor position...                         | |
| | ▼ Video Description & Extracted Resources         | | |                                                             | |
| |   "In this video, we learn how decorators work    | | |                                                             | |
| |    under the hood using closures..."              | | |                                                             | |
| |   - [💻 GitHub Repo: Decorator Examples]           | | |                                                             | |
| |   - [📄 PEP 318 Documentation]                    | | |                                                             | |
| +---------------------------------------------------+ | +-------------------------------------------------------------+ |
+-------------------------------------------------------------------------------------------------------------------------+
```

---

### 1.2 Structural Wireframe: Focus Mode (Distraction-Free)

```
+-------------------------------------------------------------------------------------------------------------------------+
| [COLLAPSIBLE TOP BAR: Reveals on hover] [← Back]  Python 3: Ch 4      [⏱ 20:00 ▾]  [ 📝 Notes ]  [ Exit Focus Mode ✕ ]  |
+-------------------------------------------------------------------------------------------------------------------------+
| <FULL VIEWPORT VIDEO CANVAS: 100vw × 100vh Edge-to-Edge Player Occupancy>                                               |
|                                                                                                                         |
|                                                                                                                         |
|                                              VIDEO OCCUPIES 100% OF THE SCREEN                                          |
|                                   (Clean cinema canvas — zero floating buttons over video/overlay)                      |
|                                                                                                                         |
|                                                                                                                         |
|                                                        +--+-----------------------------------------------------------+ |
|                                                        |  | [NOTES TOOLBAR]               [ ⇥ Push Back Notes ]       | |
|                                                        |D | [⏱ Insert Time] [B] [I]                     ● Auto-saved  | |
|                                                        |R |+----------------------------------------------------------+ |
|                                                        |A | [STRETCHABLE FLOATING OVERLAY NOTEPAD]                    | |
|                                                        |G | (Slides over video without displacing or shrinking video) | |
|                                                        |  |                                                           | |
|                                                        |H | ### Chapter 04: Functions & Decorators                     | |
|                                                        |A | - [10:12] Decorators wrap existing functions:             | |
|                                                        |N | - Stretchable width (320px – 750px)                       | |
|                                                        |D |                                                           | |
|                                                        |L |                                                           | |
|                                                        |E |                                                           | |
|                                                        +--+-----------------------------------------------------------+ |
+-------------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Global Navigation: Adaptive Study Top Bar (State B & C)

The Top Bar adapts from browsing mode into **Focused Study State** (height: `56px`, fixed sticky, `z-index: 100`, border-bottom: `1px solid var(--color-border)`). In Focus Mode, it becomes a collapsible header that auto-hides and gently reveals on mouse hover near the top edge.

### 2.1 Left Zone: Contextual Return
- **`← Back to Course` Link:**
  - Font: `Inter`, 14px, weight 500, color: `var(--color-text-secondary)`.
  - Icon: Left arrow outline (`16px`).
  - Behavior: Safely routes back to `/course/:id` (Course Page) without resetting video playback time or active notes.

### 2.2 Center Zone: Title Truncation
- Displays current progress position: `[Course Title]  •  Ch [X]: [Chapter Title]`.
- Max-width: `480px`, styled with CSS `text-overflow: ellipsis; white-space: nowrap; overflow: hidden;`.
- Font: `Source Serif 4`, 15px, semi-bold (`color: var(--color-text-primary)`).

### 2.3 Right Zone: Focus Tools
1. **Scientific Focus Timer Widget & Interval Controller:**
   - **Pill Display:** Compact badge (`background: var(--color-surface-muted)`, border: `1px solid var(--color-border)`, radius: `var(--radius-pill)`). Displays clock line icon + tabular countdown digits (e.g., `⏱ 20:00` or live counting `⏱ 18:42`) + subtle dropdown chevron `▾`.
   - **Click Action:** Clicking the pill opens the **Timer Configuration Popover** (`.timer-config-popover`), positioned directly beneath the pill (`position: absolute; top: calc(100% + 8px); right: 0; z-index: 125;`).
   - **Customizable Intervals:**
     - **Focus Duration Control:** Fine-tunes active study session length (e.g., customizable to 30 mins, 45 mins, 50 mins, or stepper control). Defaults to **20 minutes**.
     - **Rest Break Duration Control:** Fine-tunes detachment break length (e.g., customizable to 8 mins, 10 mins, or stepper control). Defaults to **5 minutes**.
     - **Default Baseline:** Preserves the scientifically proven **20m Focus / 5m Break** ratio by default.
   - **Popover Controls:**
     - Quick preset pill buttons (Focus: `20m (Default)`, `25m`, `30m`, `45m`; Break: `5m (Default)`, `8m`, `10m`).
     - Stepper inputs for fine minute-by-minute adjustments.
     - Live timer status indicator with quick Pause / Resume toggle button.
     - Primary `Apply & Restart` button and `Reset to Default (20m / 5m)` button.
   - **Dismissal:** Closes smoothly upon clicking outside, pressing `Esc`, or re-clicking the timer pill.
2. **Notes Drawer Toggle Button (`[ 📝 Notes ]`):**
   - Placed in the top navigation bar. In Focus Mode, this collapsible bar hosts the notes drawer trigger, completely removing floating triggers from the video surface to prevent covering video overlays or scrubber controls.
3. **Focus Mode Toggle Button:**
   - Height `36px`, padding `0 14px`, border: `1px solid var(--color-border)`, radius: `8px`.
   - Line icon (`Maximize / Expand`) + label `"Focus Mode"` (or `"Exit Focus Mode ✕"` when active).
   - Behavior: Toggles full-screen distraction-free layout (State C).
   *(Note: The dark mode switcher is omitted on the Learning Page to provide pure paper fidelity and eliminate study distraction).*

---

## 3. Left Column (60%): Video Theater & Controls

The primary consumption zone, constrained to fluid proportions and strict keyboard accessibility.

### 3.1 16:9 Video Player Container
- **Aspect Ratio:** Fixed `16:9` ratio (`aspect-ratio: 16 / 9`, width: `100%`, max-height: `calc(100vh - 210px)`).
- **Background:** `#000000` (prevents border flashes during stream buffering).
- **Embedded Player Integration:**
  - YouTube IFrame Player API integration.
  - Video parameters: `enablejsapi=1`, `modestbranding=1`, `rel=0`, `controls=1`, `iv_load_policy=3`.
  - Custom keyboard event bindings:
    - `Space` / `k`: Play/Pause.
    - `j` / `Left Arrow`: Rewind 5 seconds.
    - `l` / `Right Arrow`: Fast-forward 5 seconds.
    - `t`: Insert timestamp badge into notes pad at current playback second.
    - `f`: Toggle Focus Mode.

---

### 3.2 Chapter Navigation Bar
Placed immediately below the 16:9 player container.

- **Layout:** Flex row with space-between alignment, padding: `10px 0`.
- **Controls:**
  1. **Previous Chapter Button (`◀ Previous`):**
     - Ghost button, disabled if on Chapter 1.
     - Navigates to `/course/:id/learn/:prevChapterId`.
  2. **Chapter Quick-Selector Dropdown:**
     - Select menu displaying `Chapter 04: Functions & Decorators (31:10)`.
     - Clicking reveals full playlist menu with status indicators (`✓ Mastered`, `👁 Watched`, `● In Progress`).
     - Selecting any chapter instantly loads that chapter's video without refreshing the page.
  3. **Next Chapter Button (`Next Ch ▶`):**
     - Primary button if current chapter is complete; secondary button if in-progress.
     - In **Focus Mode**, this button is hidden until the chapter video completes and the quiz overlay is resolved or skipped.

---

### 3.3 Collapsible Video Description & Extracted Resources
Directly beneath chapter navigation. Collapsed by default to avoid visual clutter and eye distraction.

- **Toggle Header:**
  - Flex row with chevron icon: `▼ Video Description & Extracted Resources (2 links)`.
  - Clicking smoothly toggles the description body (150ms ease-out transition).
- **Expanded Content Container:**
  - Background: `var(--color-surface)`, border: `1px solid var(--color-border)`, radius: `8px`, padding: `16px 20px`.
  - Max-height: `240px`, vertical scroll with styled minimalist scrollbar.
  - **Section 1: Quick Resources:** Clickable pills for code repositories and documents (`[💻 GitHub Starter Code]`, `[📄 PEP 318 Specs]`).
  - **Section 2: Raw Publisher Description:** Formatted publisher text, preserving timestamps and notes.

---

## 4. Right Column (40%): Synchronized Rich Text Notes Pad

A distraction-free, tactile study notebook styled after physical soft linen paper.

### 4.1 Tactile Surface Styling & Dimensions
- **Container Specs:** Width `40%`, height `calc(100vh - 56px)`, border-left: `1px solid var(--color-border)`.
- **Background:** Soft Linen Paper `var(--color-surface-muted)` (`#F0EBE0` Light / `#292623` Dark).
- **Layout:** Flex column (Fixed toolbar at top + independently scrollable canvas below).

### 4.2 Notes Action Toolbar
- **Height:** `44px`, padding: `0 16px`, background: `var(--color-surface)`, border-bottom: `1px solid var(--color-border)`.
- **Controls Group (Left):**
  - **"Insert Timestamp" Button (Primary Tool):**
    - Button label: `⏱ Insert [MM:SS]` (Shortcut: `Alt + T` or `t` when player focused).
    - Injects a clickable pill timestamp `[MM:SS]` at the exact cursor position in the notes pad.
  - Formatting Actions: Bold (`B`), Italic (`I`), Bullet List (`• List`), Code Block (`< / >`).
- **Status Indicator (Right):**
  - Subtle green dot + label: `● Saved locally` (debounced auto-save every 500ms to browser localStorage).

---

### 4.3 Dedicated One-Page-Per-Chapter Architecture (The Discrete Sheet Model)
- **Problem Solved:** When studying Chapter 4, seeing notes from Chapter 1, 2, and 3 simultaneously clutters working memory.
- **The Discrete Sheet Model:**
  - **Full-Viewport Dedicated Page (`min-height: calc(100vh - 102px)`):** Every single chapter is allocated its own dedicated, full-height digital notebook page.
  - **Zero Visual Bleed:** Even if a chapter has only 1–2 brief lines of notes, its page occupies the full height of the viewport. No other chapter's notes are visible in the initial view.
  - **Pinned Initial Focus:** When the Learning Page loads for Chapter X (e.g., Chapter 4), the notes container automatically anchors directly to Chapter X's dedicated page.
  - **Scroll-Up Retrieval:** Notes from earlier chapters (Chapters 1, 2, 3) sit above the current chapter in the vertical scroll track and are revealed **only when the learner intentionally scrolls up**.
  - **Page Metadata & Boundary:**
    - Each page features a subtle header: `PAGE 04 OF 14 • CHAPTER 04` and a prominent chapter title: `### Chapter 04: Functions, Closures & Decorators`.
    - Pages are separated by an elegant bookish dashed divider (`border-bottom: 2px dashed var(--color-border)`), reinforcing the physical notebook paper metaphor.
- **Typography:**
  - Headings: `Source Serif 4`, weight 600, color `var(--color-primary)`.
  - Body: `Source Serif 4`, size `16px`, line-height `1.75` (mimics a classic scholarly textbook).
  - Code Snippets: `JetBrains Mono`, size `13px`, background `var(--color-surface)`.

---

### 4.4 Timestamp Click Navigation (Option C — The Guarded Seeking Model)

To prevent accidental loss of playback context when reviewing past notes:

1. **Same-Chapter Timestamps:**
   - Visual: `[10:12]` (Pill badge, background `var(--color-surface)`, border: `1px solid var(--color-border)`, color: `var(--color-primary)`).
   - Click Behavior: Immediately seeks the active video player to second `612` without reloading.
2. **Other-Chapter Timestamps:**
   - Visual: `Ch 2 • [04:12]` (Explicit chapter prefix badge).
   - Click Behavior: Triggers a non-modal confirmation toast/sheet:
     > *"Switch to Chapter 02 at 04:12? Current playback will pause."*  
     > Actions: `[ Switch Chapter ]`  `[ Cancel ]`
   - Prevents accidental chapter switching when learner simply wanted to read older notes.

---

## 5. Video Player Overlays (The 3 Critical Learning Moments)

> **Universal Overlay Rule:**  
> All three learning moments completely take over the 16:9 video player area.  
> - The video is **automatically paused and hidden from view** behind a dark scrim (`rgba(20, 19, 18, 0.92)`).  
> - Every overlay contains a prominent, low-friction **"Skip" button** (`var(--color-text-secondary)`, ghost style) to ensure no learner feels trapped or penalized.

---

### 5.1 Overlay 1: Resume Recall Overlay

- **Trigger:** Resuming a course after **$\ge 24$ hours of inactivity**.
- **Timing:** Displays immediately upon loading the page, before the video starts.
- **Purpose:** Warms up working memory by retrieving concepts studied in the previous session.

```
+---------------------------------------------------------------------------------+
| OVERLAY: RESUME RECALL (Paused & Hidden Video Scrim)                            |
|                                                                                 |
|   [Leaf Outline]  WELCOME BACK • QUICK REFRESHER                    [⚑ Report]  |
|   It's been 2 days since your last session. Let's recall Chapter 3:             |
|                                                                                 |
|   "In Python, what is the key difference between using a generator function     |
|    with 'yield' versus returning a standard list?"                              |
|                                                                                 |
|   [A] Generators compute items lazily on demand, using O(1) memory              |
|   [B] Generators run on multiple CPU cores in parallel                          |
|   [C] Generators are strictly immutable tuples                                  |
|                                                                                 |
|   [ Check Answer ]                                              [ Skip to Video ↗ ] |
+---------------------------------------------------------------------------------+
```

- **Actions & Logic:**
  - `Check Answer`: Instant right/wrong verification. Correct highlights botanical green (`#2E7D4F`); incorrect highlights terracotta (`#B5473A`) with a concise explanation.
  - `Skip to Video ↗`: Immediately dismisses the overlay and auto-starts video playback.
  - **`[ ⚑ Report ]` Option:**
    - Placed in the upper-right corner of the recall header.
    - Clicking summons the **Report Question Card** popover floating above the active question.
    - **Report Card Fields:**
      - Header: `"Report Recall Question"` + Close `[✕]` icon.
      - Category Pills: `[ Incorrect Answer ]`, `[ Typo / Phrasing ]`, `[ Unclear ]`, `[ Other ]`.
      - Reason Input: Textarea to write the issue explanation (placeholder: *"Explain the issue with this recall question..."*).
      - Action Buttons: `[ Cancel ]` (dismisses popover without saving) and `[ Submit ]` (saves feedback, closes card, and displays toast: *"Report submitted. Thank you for your feedback."*).
    - Non-destructive: Does not pause, reset, or auto-skip the recall overlay.

---

### 5.2 Overlay 2: End-of-Chapter Quiz Overlay

- **Trigger:** Video reaches 100% completion (if *End-of-Chapter Quizzes* is toggled ON in Course Settings).
- **Timing:** Triggers automatically as the video concludes.
- **Purpose:** Active consolidation of core concepts before moving forward.

```
+---------------------------------------------------------------------------------+
| OVERLAY: CHAPTER 04 COMPLETE • KNOWLEDGE CHECK                                 |
|                                                                                 |
|   Question 1 of 2  •  Topic: Functions & Decorators               [⚑ Report]    |
|   "Why must @functools.wraps be applied to the inner wrapper function?"         |
|                                                                                 |
|   [A] To optimize bytecode execution speed in CPython                           |
|   [B] To preserve original function metadata (__name__ and __doc__)             |
|   [C] To allow passing keyword arguments dynamically                            |
|                                                                                 |
|   [ Submit & Continue → ]                                 [ Skip Quiz (Watched) ]|
+---------------------------------------------------------------------------------+
```

- **Actions & Completion Logic:**
  - `Submit & Continue →`: Unlocks the next chapter and marks this chapter as **"Mastered (Quiz Passed)"**.
  - `Skip Quiz`: Unlocks the next chapter and marks this chapter as **"Watched (Quiz Skipped)"**.
  - **`[ ⚑ Report ]` Option:**
    - Located adjacent to question counter/topic metadata (`Question 1 of 2 • Topic: Functions & Decorators [⚑ Report]`).
    - Clicking summons the **Report Question Card** popover floating above the quiz container.
    - **Report Card Fields:**
      - Header: `"Report Quiz Question"` + Close `[✕]` icon.
      - Category Pills: `[ Incorrect Answer Key ]`, `[ Typo / Formatting ]`, `[ Ambiguous Phrasing ]`, `[ Other ]`.
      - Reason Input: Multi-line textarea to write the issue explanation (placeholder: *"Explain what is wrong with this question or options..."*).
      - Action Buttons: `[ Cancel ]` (ghost button, dismisses card) and `[ Submit ]` (primary button, submits feedback and shows non-blocking toast: *"Report submitted. Thank you for helping keep quiz questions accurate."*).
    - Non-destructive: Does not uncheck selected options, does not close or submit the quiz, and does not alter chapter progression.
  - **No Punishment:** Progress is recorded either way; the learner is never blocked from continuing.

---

### 5.3 Overlay 3: Scientific Break Overlay

- **Trigger:** Focus timer completes the active study interval (default **20 minutes**, or customized e.g. 30 minutes via the top bar timer controller).
- **Behavior:** Pauses video playback instantly and overlays the entire 16:9 frame (or full screen in Focus Mode).
- **Duration:** Dynamically corresponds to the configured break duration (default **5 minutes**, or customized e.g. 8 minutes).
- **Purpose:** Aligns with cognitive load research—preventing the "cramming illusion" and consolidating memory through brief cognitive detachment.

```
+---------------------------------------------------------------------------------+
| OVERLAY: SCIENTIFIC FOCUS BREAK (Take Configured Break, e.g. 5m / 8m)           |
|                                                                                 |
|   [Coffee / Walk Line Icon]                                                     |
|                                                                                 |
|   TIME REMAINING:   04:58 (or Configured Break Duration)                        |
|                                                                                 |
|   "Step away from your desk, rest your eyes, and stretch your legs.             |
|    Continuous cramming reduces synaptic memory consolidation."                  |
|                                                                                 |
|   [ Skip Break / Resume Video → ] (Will rewind 5s to refresh spoken context)     |
+---------------------------------------------------------------------------------+
```

- **Special Playback Rule (The 5-Second Rewind):**
  - When the user clicks `Skip Break / Resume Video` or when the break timer reaches `00:00`, the player **automatically rewinds 5 seconds** before resuming playback.
  - **Why:** Re-establishes spoken context and syntax continuity so the learner doesn't lose their train of thought.

---

### 5.4 Overlay Conflict Resolution Matrix

When multiple triggers occur simultaneously, the system resolves them according to the following strict hierarchy:

| Scenario | Collision Event | Priority Resolution |
| :--- | :--- | :--- |
| **Case A** | Break timer hits `00:00` in the middle of playback. | **Break Wins:** Video immediately pauses and presents the 5-minute Scientific Break overlay. |
| **Case B** | Break timer hits `00:00` at the exact moment the video finishes. | **Quiz Wins First:** The End-of-Chapter Quiz overlay triggers first. Once submitted or skipped, the Scientific Break overlay displays *before* the next chapter begins. |
| **Case C** | User opens course after 24 hours of inactivity. | **Resume Recall Wins:** Displays before video starts. Break timer does not begin counting down until video actually starts playing. |

---

## 6. Operating Modes: Normal Mode vs. Focus Mode

The learner can toggle between modes at any time using the `Focus Mode` button or pressing key `f`.

### 6.1 Mode Comparison Matrix

| Interface Element | Normal Mode (Default) | Focus Mode (Distraction-Free) |
| :--- | :--- | :--- |
| **Layout Split & Video Occupancy** | 60% Left (Video) / 40% Right (Notes) | **100vw × 100vh Full-Screen Occupancy** (Video fills entire screen edge-to-edge without letterbox constraints) |
| **Top Navigation Bar** | Sticky visible `56px` header | **Collapsible Top Nav Bar**; auto-hidden, reveals on mouse hover near top edge, housing `← Back`, Timer, **`[ 📝 Notes ]` button**, and `Exit Focus Mode` |
| **Notes Drawer Trigger** | Permanently docked beside player in 40% column | **Integrated into Collapsible Top Nav Bar** (`[ 📝 Notes ]` button); zero floating buttons on screen or overlays |
| **Notes Pad Presentation** | Continuously visible beside player in 40% column | **Floating Slide-Over Drawer**; sits on top of video on the right without shifting or shrinking the video |
| **Notes Pad Resizability** | Fixed 40% column width | **Stretchable & Resizable** (320px – 750px) via draggable left-edge resize handle |
| **Push Back Notes Control** | N/A (Always visible beside video) | **Dedicated "Push Back Notes" Button** (`[ ⇥ Push Back Notes ]`) in notes toolbar + top bar `[ 📝 Notes ]` button + `Esc` key |
| **Chapter Navigation** | Previous / Dropdown / Next buttons | **Locked** to current chapter until video completes and quiz is resolved/skipped |
| **Exit Trigger** | Always in normal mode | `Exit Focus Mode` button in collapsible top bar, or `f` / `Esc` key (when notes are closed) |

### 6.2 Focus Mode Enhancements & Interactions

1. **Full-Viewport Video Occupancy (100vw × 100vh):**
   - When entering Focus Mode, the video player breaks out of standard column constraints, expanding to completely fill the learner's display (`100vw × 100vh`).
   - The surrounding chrome, chapter controls, and sidebars are eliminated, turning the screen into a dedicated edge-to-edge cinema display.

2. **Non-Disruptive Floating Notes Overlay (Triggered from Collapsible Top Nav Bar):**
   - Floating screen buttons have been completely removed to avoid obscuring the video player, scrubber, and critical recall overlays.
   - Opening the notes drawer in Focus Mode is triggered directly from the **collapsible top navigation bar** via the dedicated `[ 📝 Notes ]` button (or keyboard shortcut `n` / `Alt + N`).
   - When opened, the notes pad slides in from the right edge as a floating card overlay (`position: fixed; right: 0; top: 0; bottom: 0; z-index: 105;`).
   - Crucially, the video **does not resize, shrink, or shift** when notes are opened. The notes float cleanly above the right side of the video canvas, allowing uninterrupted viewing.

3. **Stretchable Notepad Width (Draggable Handle):**
   - The left border of the floating notes drawer features an interactive drag handle (`.notes-resize-handle`, `cursor: ew-resize`).
   - The learner can click and drag horizontally to smoothly adjust notepad width anywhere from `320px` (minimalist jotting margin) to `750px` (or 60% viewport for extensive code blocks and diagrams).

4. **Dedicated "Push Back Notes" Dismissal:**
   - To return instantly to pure video without hunting for external buttons, the notes toolbar contains a dedicated **"Push Back Notes" button** (`[ ⇥ Push Back Notes ]` / `[ Push Back ]`).
   - Clicking this button smoothly transitions the notes overlay back off-screen to the right (`transform: translateX(100%)`), restoring an unobstructed full-screen view.

---

## 7. Keyboard Shortcuts & Accessibility Standards

Designed for complete hands-on-keyboard study workflows without touching the mouse:

| Key Binding | Functionality | Context |
| :--- | :--- | :--- |
| `Space` or `k` | Toggle Play / Pause | Video player focused or global |
| `j` / `Left Arrow` | Rewind 5 seconds | Global |
| `l` / `Right Arrow`| Fast-forward 5 seconds | Global |
| `t` or `Alt + T` | Injects timestamp `[MM:SS]` at active note cursor | Notes pad |
| `n` or `Alt + N` | Toggle Notes Drawer (in Focus Mode) | Focus Mode |
| `f` | Toggle Focus Mode (Enter / Exit) | Global |
| `Esc` | Dismiss active overlay / Push back open notes in Focus Mode / Exit Focus Mode | Overlays & Focus Mode |
| `1`, `2`, `3` | Select MCQ option A, B, or C | Active Quiz Overlays |

---

## 8. Responsive Adaptations (Desktop Breakpoints)

| Viewport Range | Layout Adjustments |
| :--- | :--- |
| **≥ 1440px (Wide Desktop)** | 60% Video / 40% Notes split. Notes pad line length constrained to 75 characters with centered margins. |
| **1200px – 1439px (Standard)**| Base target. Video height adjusts cleanly to 16:9 aspect ratio. Top bar fully expanded. |
| **1024px – 1199px (Compact Laptop)**| Video column adjusts to 58%, Notes column to 42%. Chapter title in top bar truncates earlier. |

---

## 9. Summary Checklist for HTML/CSS/JS Prototype Implementation

When generating `learning-page.html`, the following interactive features must be fully functional:
- [x] Fixed State B Top Bar with `← Back to Course`, **customizable Scientific Focus Timer with interval controller popover (adjustable focus e.g. 30m and break e.g. 8m durations; default 20m/5m baseline)**, and Focus Mode button (Dark mode switcher removed for pure distraction-free paper focus).
- [x] Responsive 60/40 fluid layout container in Normal Mode.
- [x] Video player container with standard playback simulation and time scrubber.
- [x] Chapter navigation bar with Previous, Next, and interactive chapter selector dropdown.
- [x] Collapsible video description with expandable extracted resource pills.
- [x] Dedicated one-page-per-chapter discrete sheet notes pad with scroll-up retrieval.
- [x] Full-featured linen paper notes pad with live word counter and auto-save indicator.
- [x] Working "Insert Timestamp" button injecting clickable timestamp pills.
- [x] Same-chapter timestamp clicks seek video; different-chapter timestamp clicks show guarded confirmation.
- [x] Working **Resume Recall Overlay** (24h simulation trigger) with instant question check and skip button.
- [x] Working **End-of-Chapter Quiz Overlay** (triggered at 100% video) with option selection, submit, and skip.
- [x] Working **Scientific Break Overlay** (triggered dynamically by active study interval countdown or test trigger) with dynamic break countdown and 5s rewind on resume.
- [x] **Seamless Focus Mode transition with collapsible auto-hiding top bar.**
- [x] **Focus Mode 100vw × 100vh Full-Screen Video Occupancy** without letterbox gaps or shrunk layout.
- [x] **Notes drawer toggle integrated directly into the collapsible top nav bar**, eliminating floating buttons that cover video overlays.
- [x] **Right-side floating slide-over notes drawer** that overlays the video without displacing or shrinking video content.
- [x] **Stretchable / resizable notepad** with draggable left-edge handle (`cursor: ew-resize`, 320px–750px width).
- [x] **Explicit "Push Back Notes" action button** in notes toolbar for intuitive single-click drawer retraction.
- [x] **Report Question Popover Cards** on both Resume Recall and Chapter Quiz overlays with issue categories, reason textarea, `[Cancel]`, and `[Submit]` actions.

# Brand UI Brief & Visual Design System

**Product:** Study YouTube Wrapper (Desktop MVP)  
**Document:** brand UI brief document  
**Concept:** The Quiet Study Desk (Warm, Natural, Focused)  
**Target Viewports:** Desktop Web (1280px base, responsive 1024px to 1920px)  
**Language:** English only  

---

## 1. Brand Essence & Visual Identity

### 1.1 The Concept: "The Quiet Study Desk"
The visual identity is modeled after a physical study desk: warm paper, natural daylight, soft slate ink, and calm greenery.
- **What it IS:** A quiet, distraction-free study room that treats the learner like an intelligent adult. It feels tactile, focused, and scholarly.
- **What it is NOT:** It is not a sterile B2B SaaS dashboard, not a neon gamified arcade with flashing badges, and not an intimidating exam-panic portal.

### 1.2 Cognitive Design Heuristics (Binding Rules)
1. **Low Glare for Long Sessions:** Staring at pure white (`#FFFFFF`) or high-contrast pure black (`#000000`) for 2-hour study blocks causes eye fatigue. We use a warm paper background (`#FAF6EF`) and deep organic slate ink (`#26332E`).
2. **One Focal Point per Screen (The Amber Rule):** Warm Amber (`#D9962B`) is strictly reserved for milestone celebrations, the current streak tick, and the single highest-urgency deadline. It never appears casually.
3. **Typography Duality (The Book & The Tool):**
   - **Source Serif 4:** For headings, page titles, and the compiled notes document. Creates the warmth and authority of a textbook.
   - **Inter:** For interface labels, interactive buttons, quiz choices, and timers. Delivers neutral clarity and tabular number alignment.
4. **Grouping with White Space over Boxes:** Unrelated groups are separated by at least $2\times$ the internal gap ($24\text{px}$–$32\text{px}$). No unnecessary nested container borders.

---

## 2. Complete Color Palette & Design Tokens

### 2.1 Light Theme (Default Study Environment)

| Token Name | Hex Code | Visual Swatch | Semantic Use & Accessibility Rationale |
| :--- | :--- | :--- | :--- |
| `--color-primary` | `#2F5D50` | Deep Forest Green | Primary buttons, active nav indicators, page headers. *Contrast: 6.9:1 on bg (WCAG AAA).* |
| `--color-accent` | `#D9962B` | Warm Gold / Amber | **One per screen:** streak flame, nearest deadline, chapter-complete celebration. *Contrast: 5.1:1 with dark text.* |
| `--color-bg-app` | `#FAF6EF` | Warm Paper Off-White | Canvas background. Lowers digital glare compared to pure white. |
| `--color-surface` | `#FFFFFF` | Clean White | Cards, modal sheets, dropdown menus. Clean separation from warm background. |
| `--color-surface-muted` | `#F0EBE0` | Soft Linen Paper | Notes pad background, chip badges, empty state tracks. |
| `--color-text-primary` | `#26332E` | Deep Forest Ink | All main headings, body reading text, and quiz questions. *Contrast: 12.4:1 (WCAG AAA).* |
| `--color-text-secondary`| `#5F6B65` | Muted Sage Slate | Metadata, author names, timestamps, placeholders. *Contrast: 5.1:1 (WCAG AA).* |
| `--color-border` | `#DAD3C4` | Subtle Sandstone | Input borders, delicate dividers (decorative only). |
| `--color-success` | `#2E7D4F` | Botanical Green | Correct quiz feedback, completed checkmarks (always paired with icon + label). |
| `--color-error` | `#B5473A` | Terracotta Red | Inaccurate answers, validation errors (never harsh neon red; paired with icon). |

---

### 2.2 Dark Theme (Night Study Sessions — Warm Espresso & Charcoal)

| Token Name | Hex Code | Semantic Role |
| :--- | :--- | :--- |
| `--color-bg-app` | `#141312` | Deep Warm Obsidian / Espresso background (no green cast). |
| `--color-surface` | `#1E1C1A` | Warm charcoal stone for cards and dialogs. |
| `--color-surface-muted` | `#292623` | Warm tactile dark linen for the notes pad canvas. |
| `--color-primary` | `#4E917D` | Soft Pine Green for action buttons. |
| `--color-accent` | `#E5A94E` | Luminous warm amber reward accent. |
| `--color-text-primary` | `#F3EFEA` | Soft warm linen cream reading text (zero eye fatigue). |
| `--color-text-secondary`| `#9E968D` | Warm stone slate for metadata and captions. |
| `--color-border` | `#383430` | Subtle warm dark divider. |

---

## 3. Typography Specimen & Scale

### 3.1 Typeface Families
- **Display & Headings:** `Source Serif 4`, Georgia, serif  
  *(Conveys scholarship, focus, and organic warmth)*
- **Interface & Body:** `Inter`, system-ui, -apple-system, sans-serif  
  *(Engineered for digital screens, small-size legibility, and tabular figures)*
- **Code & Numeric Timestamps:** `Inter` (with `font-variant-numeric: tabular-nums`) / `JetBrains Mono` for code snippets.

### 3.2 Desktop Typographic Hierarchy

| Level | Size | Weight | Line Height | Font Family | Example Context |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `36px` – `40px` | 600 (Semi-Bold) | 1.20 | Source Serif 4 | Milestone completions, landing headlines |
| **H1** | `28px` | 600 (Semi-Bold) | 1.25 | Source Serif 4 | Page headers ("Your Courses", Course Title) |
| **H2** | `22px` | 600 (Semi-Bold) | 1.30 | Source Serif 4 | Section headers ("Overview", "Resources") |
| **H3** | `17px` | 600 (Semi-Bold) | 1.40 | Inter | Course card titles, question prompts |
| **Body (Default)**| `16px` | 400 (Regular) | 1.60 | Inter | All reading text, quiz questions, explanations |
| **Body Small** | `14px` | 400 (Regular) | 1.50 | Inter | Chapter metadata, duration, secondary labels |
| **Caption** | `12px` | 500 (Medium) | 1.50 | Inter | Video timestamps, footers, helper hints |
| **Button** | `15px` | 500 (Medium) | 1.00 | Inter | Interactive CTA labels |

#### Readability Rules:
- **Body text never falls below `16px`** to protect tired evening learners.
- **Reading Line Length:** Constrained to **60–75 characters per line** in the notes pad and quiz explanations.
- **Left-Aligned Only:** Never justify text.

---

## 4. Spacing System & Layout Geometry

### 4.1 8-Point Modular Grid
- Base unit = `8px` (`4px` permitted exclusively for micro-spacing inside compact components like badges).

| Token | Value | Applied Usage |
| :--- | :--- | :--- |
| `--space-xs` | `8px` | Icon-to-text gaps, chip internal padding, tight metadata rows |
| `--space-s` | `16px` | Component internal padding, list item gaps |
| `--space-m` | `24px` | Standard card padding, space between adjacent content blocks |
| `--space-l` | `32px` | Gaps between major sections |
| `--space-xl` | `48px` | Page-level top/bottom margins |
| `--space-xxl`| `64px` – `80px`| Hero spacing, major landing transitions |

### 4.2 Border Radii (Soft Geometry)
- **Buttons & Action Cards:** `12px` (Soft, modern, non-aggressive)
- **Form Inputs:** `8px`
- **Pills / Status Chips / Timestamps:** `9999px` (Full circular pill)
- **Modals / Takeover Sheets:** `16px` top corners

### 4.3 Ambient Elevation (No Heavy Shadows)
- **Cards & Containers:** `box-shadow: 0 1px 3px rgba(38, 51, 46, 0.08)` (delicate organic shadow, keeps layout flat and paper-like).
- **Elevated Modals / Pop-ups:** `box-shadow: 0 8px 24px rgba(38, 51, 46, 0.14)`.

---

## 5. Universal UI Component Specifications

### 5.1 Buttons & Interactive Controls
- **Standard Button Height:** `48px` minimum click target (Fitts's Law).
- **Variants:**
  1. **Primary Button:** `#2F5D50` background, `#FFFFFF` text, `12px` radius. Used for the single primary action per view (e.g., "Resume Course", "Submit Answer").
  2. **Reward Button (Rare):** `#D9962B` background, `#26332E` dark text. Used exclusively at chapter completion and streak increments.
  3. **Secondary / Outline:** Transparent background, `1.5px solid #2F5D50` border, `#2F5D50` text.
  4. **Ghost / Skip Button:** Transparent background, `#5F6B65` secondary text, no border. Used for "Skip Quiz" and "Skip Break" so skipping is effortless and non-stigmatizing.
  5. **Destructive Button:** `#B5473A` background, `#FFFFFF` text. Used exclusively for "Delete Course".

---

### 5.2 Cards & Course Surfaces
- **Background:** Pure white (`#FFFFFF`) on light paper canvas (`#FAF6EF`).
- **Padding:** `24px`.
- **States:**
  - *Default:* `1px solid transparent`, subtle shadow.
  - *Hover:* Elevated shadow `0 4px 12px rgba(38, 51, 46, 0.10)`, smooth 150ms transition.
  - *Priority Highlight:* Subtle warm amber left accent bar (`3px solid #D9962B`) for the #1 nearest-deadline course.

---

### 5.3 Form Inputs & Search
- **Height:** `48px`.
- **Background:** `#FFFFFF`, `1px solid #DAD3C4` border, `8px` radius.
- **Focus State:** `2px solid #2F5D50` outline with `2px` offset.
- **Labeling:** Persistent text label visible above the field (never placeholder-only).

---

### 5.4 Video Player & Synchronized Notes Canvas
- **Video Aspect Ratio:** Strictly `16:9` fluid container.
- **Notes Pad Surface:** Soft Linen Paper (`#F0EBE0`), borderless and quiet, giving the tactile feeling of taking notes in a physical notebook beside the screen.
- **Timestamp Chip:** Pill badge with `#F0EBE0` background, `#2F5D50` text, tabular figures (`[04:22]`).

---

### 5.5 Quizzes & Interactive Overlays
- **Quiz Choices:** Minimum `56px` height full-width clickable rows.
  - *Hover:* `#F0EBE0` background.
  - *Selected:* `2px solid #2F5D50` outline.
  - *Correct / Incorrect:* Colored border + explicit check/cross icon + text explanation.
- **Overlays:** Dark semi-transparent scrim (`rgba(23, 28, 26, 0.85)`) over the video, fully centering the active recall card.

---

## 6. Micro-Interactions & Brand Voice

### 6.1 UI Voice & Copywriting Tone
- **Calm, Encouraging Tutor:** Plain English, concise, respectful. No patronizing praise ("AMAZING!!!").
- **Neutral Habit Reinforcement:** Never guilt or alarm the user.
  - *Bad:* "You broke your streak! You're falling behind!"
  - *Good:* "Welcome back. Every day you study counts. Let's pick up where you left off."

### 6.2 Motion Guidelines
- **Duration:** `150ms` – `250ms` ease-out transitions.
- **Policy:** Zero bouncy cartoon animations. Strictly respect `prefers-reduced-motion`.

# School Kompass — UI Redesign + Feature Build

**Date:** 2026-04-14  
**Status:** Approved  

---

## Overview

Full UI overhaul of School Kompass (React Native / Expo) plus implementation of two missing features — Study Guides and Quiz. Flashcards keep their existing logic, reskinned only. The goal is a focused, dopamine-satisfying study tool that actually gets used.

---

## Design System

### Color Tokens

| Token | Dark (default) | Light |
|---|---|---|
| `--bg` | `#0a0f0a` | `#f8f5f0` |
| `--surface` | `#121a12` | `#ffffff` |
| `--border` | `rgba(144,208,96,0.15)` | `rgba(0,0,0,0.08)` |
| `--accent-green` | `#90d060` | `#5eaa64` |
| `--accent-gold` | `#e8aa40` | `#d46b1a` |
| `--text` | `#f0ead8` | `#1a1a1a` |
| `--text-muted` | `rgba(240,234,216,0.4)` | `rgba(0,0,0,0.4)` |

Tokens live in `constants/Colors.ts`. Each class is assigned either green or gold as its accent color (alternating on creation).

### Theme Toggle
- Dark mode is default.
- A theme toggle icon sits in the top-right of the home screen header.
- `useColorScheme` hook already exists — wire the toggle to override it and persist to AsyncStorage.

### Typography
- System font (SF Pro on iOS) throughout.
- Monospace (`font-family: monospace`) only for code labels, course codes, and small uppercase metadata.
- Body text in reader: 17px, line-height 1.7.
- Section labels: 10px uppercase, letter-spacing 0.1em, muted color.

### Shared Components to Create
- `ClassCard` — big card with colored left bar
- `SectionLabel` — small uppercase label
- `PillPlayer` — floating audio player
- `BottomSheet` — slide-up modal (reuse existing animation pattern)
- `LoadingState` — skeleton placeholder cards matching the shape of real content

---

## Screens

### Screen 1 — Home (Classes)

**Route:** `/(tabs)/(class)/chooseclass`

**Layout:**
- `SafeAreaView` with `--bg` background.
- Header row: `MY CLASSES` section label left, theme toggle + add button right.
- Scrollable list of `ClassCard` components.
- Empty state: dashed border card, centered `+` and `ADD CLASS` — tapping it opens the add modal.

**ClassCard:**
- Full-width, `--surface` background, `border-radius: 12`.
- 4px left border in the class's assigned accent color (green or gold).
- Class name (16px, `--text`), course code below in accent color (10px monospace uppercase).
- Content type badges row: `STUDY GUIDE` `FLASHCARDS` `QUIZ` — small pill labels in muted color. Badge turns accent color if that content type has items.
- Guide count chip top-right: accent-colored border, accent text, e.g. `4 guides`.
- Trash icon right side for delete (existing behavior).

**Loading state:** 3 skeleton `ClassCard` shapes with animated opacity pulse.

**Add Class modal:** Existing bottom-sheet animation, reskinned. Name + description fields, submit button in accent green.

---

### Screen 2 — Class Detail

**Route:** `/(tabs)/(class)/study` (receives selected class via context)

**Layout:**
- Header: back arrow (accent green `‹`) + class name + course code right-aligned.
- Three tabs: **Guides** · **Flashcards** · **Quiz**.
  - Active tab: bottom border in class accent color, text in accent color.
  - Inactive tabs: `--text-muted`.
- Tab content renders below.

**Guides Tab:**
- List of guide cards: title, estimated read time (word count ÷ 200wpm, rounded to nearest minute), `▶` icon right.
- `+` button in header area to add a new guide.
- Add guide: bottom sheet, two fields — Title and Content (multiline text input for paste). No PDF upload for now.
- Tapping a guide navigates to the Reader screen.
- Loading state: 2 skeleton guide card shapes.

**Flashcards Tab:**
- Existing flip-card logic, reskinned to match new design system.
- Card front/back use `--surface`, border in class accent color.
- Flip animation unchanged.

**Quiz Tab:**
- `⚡ QUIZ ME` button — opens guide picker if the class has multiple guides, otherwise goes straight to generation.
- No quiz history for MVP — each session generates fresh.
- Loading state while AI generates questions.

---

### Screen 3 — Reader

**Route:** New screen, e.g. `/(tabs)/(class)/reader`

**Layout:**
- Header: back arrow + guide title.
- Scrollable `ScrollView` with `react-native-markdown-display`.
  - Body: 17px, `--text`, line-height 1.7.
  - `h1`/`h2`/`h3`: class accent color.
  - `code` / inline code: `--surface` background, accent text, monospace.
  - Bold: `--text` at full opacity.
- Bottom padding of `80px` to clear the pill player.
- **PillPlayer** overlaid at the bottom (see below).

**PillPlayer:**
- Centered horizontally, `14px` above bottom safe area inset.
- `--surface` background, 1px border in accent green, `border-radius: 40`.
- Contents (left to right): speed toggle pill (`1x` / `1.5x` / `2x`, cycles on tap) · play/pause circle button (accent green, `#0a0f0a` icon) · stop button (muted).
- Play/pause uses `expo-speech` to read the full guide text.
- Speed toggle passes `rate` to `expo-speech` options.
- Player state: `idle` | `playing` | `paused`.
- **No scrub bar.** Designed to add it when Replicate TTS + local file saving lands later.

---

### Screen 4 — Quiz

**Route:** New screen, e.g. `/(tabs)/(class)/quiz`

**Layout:**
- Header: back arrow + `Quiz — [Guide Title]`.
- **Generation state:** centered spinner + `Generating questions...` label while OpenRouter call runs.
- **Question view:** one question at a time.
  - Question text (18px, `--text`).
  - 4 answer options as tappable cards — `--surface` border, tap to select turns border to accent color.
  - `NEXT` button (disabled until an answer is selected) in accent green.
- **Score screen:** after last question, show `X / Y correct`, breakdown list, `TRY AGAIN` and `BACK TO CLASS` buttons.

**AI Integration:**
- Uses existing `openRouterChat` client.
- Prompt: given the full guide text, return 10 multiple-choice questions as JSON array `[{ question, options: [A,B,C,D], answer }]`.
- Use `json_repair` (already installed) for resilient parsing.
- Model: same as currently in use (`arcee-ai/trinity-large-preview:free` or swap for a capable free model).
- Questions generated fresh each session — no persistence needed for MVP.

---

## Data

No schema changes needed. Existing `ClassContext` + local storage hooks cover all new screens. Study guide text is stored as a plain string field. Quiz questions are generated on the fly and not persisted.

---

## What's Not In Scope

- PDF upload / OCR (future)
- Replicate TTS + audio file scrubbing (future)
- Vector search / RAG (future)
- Read-along word highlighting (future)
- Adaptive quiz difficulty (future)
- Push notifications (already set up separately)

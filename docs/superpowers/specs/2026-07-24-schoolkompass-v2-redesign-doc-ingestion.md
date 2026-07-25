# School Kompass v2 — Document Ingestion + Redesign Pass 2 + Weak-Spots Tracking

**Date:** 2026-07-24
**Status:** Draft — pending user review
**Builds on:** `2026-04-14-school-kompass-redesign.md` (mostly shipped — palette, tabs, reader, quiz flow all live). That spec explicitly deferred "PDF upload / OCR" to later. This is that later.

---

## Overview

Three independent pieces of work, planned together because they'll be handed off in one pass:

1. **Document ingestion** — drop a PDF or photo into guide/flashcard/quiz creation and have AI generate the study material directly from it, including using actual ER diagram images (not just text descriptions) in the generated content.
2. **Redesign pass 2** — the app functions but "feels bare-bones": flat layout/typography with no real polish, and no motion/feedback. This pass adds real typographic identity, a shared component system, and interaction polish across all 5 screens.
3. **Weak-spots tracking** — surface what the user keeps getting wrong on quizzes, using data (`wrongCount`) that's already collected but never surfaced.

Explicitly **cut from this plan** (considered, rejected for scope — see "Deferred" section): SQL query practice mode, spaced repetition scheduling, auto-built glossary, fill-in-the-blank diagram labeling.

---

## Part 1 — Document Ingestion

### Goal

Today, study guides are typed by hand, and flashcards/quizzes are generated from pasted plain text via `openRouterChat` (`google/gemini-2.0-flash-lite-001`, text-only). There is no way to use an uploaded document as source material, and diagrams are invisible to the current pipeline entirely.

v2 adds: drop in one or more PDFs and/or photos, and AI generates the guide / flashcard set / quiz directly — including showing the actual ER diagram image next to any question or guide section that's about a diagram, not just a text description of it.

### UX Flow

- Available from all three creation flows (guide, flashcards, quiz) as an alternative to the existing paste-text flow — paste-text stays exactly as-is, unchanged.
- User picks one or more files via `expo-document-picker` (PDFs, already installed) and/or camera/photo library (`expo-image-picker`, new dependency).
- Multiple files in one generation are combined into a single source (e.g. 3 lecture PDFs → one guide/flashcard-set/quiz covering all of them).
- No intermediate review step — straight from upload to generated content (matches the existing "paste and generate" pattern, just with a file input instead of a text box).
- No hard cap on flashcard/quiz question count — the AI generates however many the material actually supports. A soft ~150-item ceiling exists purely as a technical guardrail against a single runaway model response, not a product-facing limit.

### Pipeline

1. Client uploads raw file(s) to Convex file storage.
2. A Convex Node action (`"use node"`) is invoked with the storage IDs + target content type (guide / flashcards / quiz) + classId:
   - PDFs: render each page to an image (e.g. `pdf-img-convert`).
   - Photos: pass through as-is.
   - All page images, in order, go into one vision-capable model call.
3. Model: swap from `gemini-2.0-flash-lite-001` (text-only) to a multimodal model — e.g. `google/gemini-2.0-flash-001` — for this pipeline specifically. Still cheap, not free-tier; direct cost of real diagram understanding.
4. Model returns structured output for the target content type. For any diagram-based flashcard/question/guide-section, it also returns which page image it references and a bounding box for the diagram's location on that page.
5. **Diagram cropping (reliability-hardened):**
   - Use Gemini's documented object-detection prompt format for the bounding box.
   - Pad the returned box ~8% before cropping, to absorb minor inaccuracy.
   - If the box is degenerate (near-zero area) or covers almost the entire page, skip cropping — use the whole page image instead (no point cropping when the diagram basically *is* the page).
   - If the box is missing or fails to parse, silently fall back to the whole-page image rather than showing a broken/garbage crop.
6. Cropped/whole-page diagram images are saved to Convex file storage and attached to the relevant card/question/guide section.
7. The original uploaded file(s) are deleted from storage once processing succeeds. Only the derived diagram images that are now part of the actual generated content persist — this is different from "keeping the source doc," which the user explicitly does not want (simpler, no extra storage cost, matches how `sourceText` works today as a processed blob rather than a retained original).

### Schema Changes

```ts
// cardSchema (flashcardSets)
imageStorageId: v.optional(v.id("_storage"))

// quizQuestionSchema (quizzes)
imageStorageId: v.optional(v.id("_storage"))

// studyGuides
images: v.optional(v.array(v.object({
  storageId: v.id("_storage"),
  position: v.number(), // index into a `[[image:N]]` marker in the guide text
})))
```

Guide text gets lightweight inline markers (`[[image:0]]`) that the reader UI swaps for the actual `<Image>` component — avoids building a full rich-text/blocks schema for what is otherwise still a plain-text guide.

### Error Handling

If extraction fails outright (unreadable file, model returns unparseable output), surface a clear error and don't save a partial/broken set — same pattern as the existing flashcard-generation error handling (`flashcardError` state), extended to cover file-processing failures too.

---

## Part 2 — Redesign Pass 2

### Typography

- **Display/header font:** Instrument Serif — warm, elegant, has real character; pairs naturally with the existing green/gold nature palette.
- **Body font:** Hanken Grotesk — clean readability at small sizes.
- **Monospace accent:** JetBrains Mono — used specifically for SQL/schema snippets in study content, giving technical material real visual distinction from prose without abandoning the warm palette.
- Loaded via `expo-font` / `@expo-google-fonts/*`.

### Color Tokens

`constants/Colors.ts` currently has no `error`/`success` tokens — the quiz screen uses ad-hoc inline hex (`'#ff4444'`). Add real `error`/`success` tokens for both light and dark, designed to sit alongside the existing green/gold family so correct/incorrect states feel designed rather than bolted on.

### Shared UI Kit

Each screen currently hand-rolls its own card/button/sheet styles inline — a real contributor to `study.tsx` being 1,113 lines and nothing feeling consistent. Pull out a small `components/ui/` kit:

- `Button` — with built-in press feedback (scale-down)
- `Card`
- `Pill` / `Badge`
- `ProgressBar`
- `Sheet` — codifies the existing ad-hoc slide-up spring animation into one shared config so every modal moves identically

This is the one piece of underlying-code cleanup folded into the redesign, because it's what actually makes "redesign every screen in one pass" tractable rather than a copy-paste exercise across 5 files.

### Motion

- Standardize the slide-up sheet spring animation (`tension: 65, friction: 11` — already used ad hoc) into the shared `Sheet` component.
- Press feedback (scale-down) on all buttons/cards via the shared `Button`/`Card` components.
- Completion animation when generation finishes (flashcards/quiz/guide).
- Score-reveal animation on quiz completion.
- Multi-step progress indicator for document processing — replaces the current plain log-line text (`generateLog` array) with a visual step sequence: *Reading document → Extracting diagrams → Generating flashcards → Saving.*

### Screens (all 5, one pass)

- **`chooseclass`** — `ClassCard` gets real hierarchy: display-font class name, muted description, styled stat pills (guide/flashcard/quiz counts) using the shared `Pill` component.
- **`study`** — flashcard flip gets more tactile motion; star/hide iconography cleaned up; all "add" sheets migrate to the shared `Sheet`/`Button` components.
- **`quiz-screen`** — correct/incorrect states use the new `error`/`success` tokens instead of inline hex; score screen gets the reveal animation.
- **`reader`** — generous line-height with the new body font; inline diagram images (from Part 1) styled with rounded corners + caption, rendered at `[[image:N]]` marker positions.
- **`read-listen`** — visual polish pass only; the TrackPlayer sleep-timer warnings are known-benign upstream package bugs (confirmed earlier this session) and are explicitly out of scope here.

---

## Part 3 — Weak-Spots Tracking

### Goal

`quizAttempts` already stores `wrongCount`, `score`, `total`, `timeSeconds` per attempt, but none of it is surfaced anywhere beyond the immediate post-quiz score screen. Turn existing data into actual study guidance.

### Design

- A lightweight aggregation (Convex query) over `quizAttempts` per `classId`: which quizzes have the highest wrong-rate, trending better/worse over recent attempts.
- Surfaced as a small section on the class screen (`chooseclass` or `study`'s guide tab) — not a new full screen for v1. e.g. "You keep missing: [Quiz title] — 3/5 wrong last attempt."
- No new schema needed — this is purely a read/aggregation over existing `quizAttempts` data plus a UI element.

---

## Deferred (considered, cut from this plan for scope)

- **SQL query practice mode** — type real SQL against a schema, AI checks correctness and explains mistakes. Real value for the class, but a genuinely separate interaction mode (needs its own generation prompt, its own UI, and SQL-correctness evaluation) — worth its own spec later rather than folding into this pass.
- **Spaced repetition scheduling** for flashcards — bigger lift than it looks (a whole scheduling system), cut to keep this plan sane.
- **Auto-built glossary** of terms across guides.
- **Fill-in-the-blank diagram labeling** — a variant of the diagram-quiz work in Part 1, could be added later once the base diagram-image pipeline is proven.

---

## Out of Scope (carried over from v1, still true)

- Vector search / RAG
- Read-along word highlighting
- Adaptive quiz difficulty
- Replicate TTS + audio scrubbing (PillPlayer's scrub bar is still deferred)

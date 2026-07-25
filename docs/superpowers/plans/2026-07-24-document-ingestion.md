# Document Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user drop in PDFs and/or photos when creating a study guide, flashcard set, or quiz, and have AI generate the content directly from them — including showing the actual ER diagram image next to diagram-based questions.

**Architecture:** Client uploads raw files to Convex file storage. A Convex Node action renders PDF pages to images, calls a vision-capable model on OpenRouter with all page images, parses the structured response, crops diagram images (with padding + fallback for reliability), stores each crop and resolves it to a public URL, then saves everything through the **existing** `flashcardSets.add` / `quizzes.add` / `studyGuides.add` mutations (no new save-path mutations needed), and deletes the original uploaded files.

**Tech Stack:** Expo (`expo-document-picker`, new: `expo-image-picker`), Convex (Node action + file storage), OpenRouter (`google/gemini-2.0-flash-001`), new: `pdf-to-img` (PDF rasterization), new: `jimp` (pure-JS image cropping, no native deps — safer inside a sandboxed Convex action than `sharp`).

## Global Constraints

- This repo has **zero existing automated tests** for Convex functions or React Native screens (confirmed: no `*.test.*` files, no `convex-test`, no `@testing-library/react-native` installed; `jest`/`jest-expo` is configured but unused).
- Per task, testing approach is: **pure, side-effect-free logic gets real Jest unit tests (TDD)**; **Convex mutations/actions and RN screen wiring get an explicit manual verification checklist** instead, matching this codebase's existing convention of zero automated coverage for that layer. This is a deliberate scope decision, not a skipped step — do not add `convex-test`/`vitest`/RNTL infrastructure as part of this plan.
- Follow existing Convex conventions exactly (from `convex/_generated/ai/guidelines.md`): argument validators on every function, `internalMutation`/`internalAction` for anything not meant to be called from arbitrary internet clients, `ctx.runMutation` for cross-function calls from actions (using `api.*` for the existing public mutations reused here — see Task 6).
- `"use node";` goes at the top of files with Node-only actions; those files must not also export queries/mutations (put actions needing Node in their own file).
- Model for this pipeline: `google/gemini-2.0-flash-001` (multimodal) — the existing text-only `google/gemini-2.0-flash-lite-001` stays as-is for the paste-text flow, untouched.
- No hard product-facing cap on generated flashcard/question count. A soft ~150-item technical ceiling exists only to bound a single model response.
- Guide diagrams render as **standard markdown images** (`![alt](url)`) directly in the guide's existing `text` field — `reader.tsx` already renders `text` through `react-native-markdown-display` (confirmed: `import Markdown from 'react-native-markdown-display'`), which supports image syntax out of the box. This means **no schema change and no new rendering code is needed for guide diagrams** — they work the moment this plan ships, independent of the separate redesign plan.
- Flashcard/quiz diagram images are stored as a resolved **URL string** (`imageUrl`), not a raw storage ID — Convex's `ctx.storage.getUrl()` returns a stable public URL at save time, so the client never needs a separate lookup query to display them.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `convex/schema.ts` | Modify | Add `imageUrl` (string) to card/question schemas only — no change to `studyGuides` |
| `convex/lib/documentIngestion.ts` | New | Pure functions: bounding-box padding/fallback logic, model-output JSON extraction |
| `convex/lib/documentIngestion.test.ts` | New | Jest unit tests for the above |
| `convex/files.ts` | New | `generateUploadUrl` (public mutation), `deleteFiles` (internal mutation) |
| `convex/documentIngestion.ts` | New | `"use node"` — `processDocuments` action: PDF render → vision call → crop → save → cleanup |
| `convex/flashcardSets.ts` | Modify | Local `cardSchema` copy gets optional `imageUrl` (no new mutation — `add` is reused as-is) |
| `convex/quizzes.ts` | Modify | Local `quizQuestionSchema` copy gets optional `imageUrl` (no new mutation — `add` is reused as-is) |
| `hooks/useDocumentUpload.ts` | New | Client hook: pick files (doc + camera/library), upload to Convex storage, call `processDocuments`, expose progress state |
| `components/ProgressSteps.tsx` | New | Visual multi-step progress indicator |
| `app/(tabs)/(class)/study.tsx` | Modify | Wire doc-upload option into Add Flashcards + Add Guide sheets |
| `app/(tabs)/(class)/quiz-screen.tsx` | Modify | Wire doc-upload option into quiz generation |

---

### Task 1: Spike — confirm the PDF processing path

This task exists because whether PDF rasterization works inside Convex's sandboxed Node action runtime is genuinely unverified, and the rest of the pipeline's code depends on which path wins. Do not skip this — do not assume either path works without running it.

**Files:**
- Create: `convex/documentIngestionSpike.ts` (temporary — deleted at the end of this task)

**Interfaces:**
- Produces: a decision recorded as a one-line comment at the top of `convex/documentIngestion.ts` in Task 6 (`// PDF path: <A|B>, confirmed <date>`) that Task 6 depends on.

- [ ] **Step 1: Install the candidate PDF library**

```bash
npm install pdf-to-img jimp
```

- [ ] **Step 2: Write a throwaway spike action**

```typescript
// convex/documentIngestionSpike.ts
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { pdf } from "pdf-to-img";

export const spikePdfRender = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const blob = await ctx.storage.get(storageId);
    if (!blob) throw new Error("File not found in storage");
    const buffer = Buffer.from(await blob.arrayBuffer());

    const document = await pdf(buffer, { scale: 2 });
    const pages: Buffer[] = [];
    for await (const pageBuffer of document) {
      pages.push(pageBuffer);
    }
    return { pageCount: pages.length, firstPageBytes: pages[0]?.length ?? 0 };
  },
});
```

- [ ] **Step 3: Upload a real test PDF and run the spike**

Use a small (1-3 page) PDF with at least one diagram on it — e.g. export a School Kompass lecture slide deck to PDF, or use any sample PDF.

```bash
npx convex dev
```

In a second terminal, from the Convex dashboard's Functions tab (or `npx convex run`), call `documentIngestionSpike:spikePdfRender` with a `storageId` — first upload the test file via the dashboard's File Storage tab to get a `storageId`.

```bash
npx convex run documentIngestionSpike:spikePdfRender '{"storageId": "<paste storage id here>"}'
```

**Decision criteria:**
- If this returns `{ pageCount: N, firstPageBytes: <number > 0> }` for N ≥ 1 → **Path A wins** (rasterize via `pdf-to-img`, proceed to Task 6 as written).
- If it throws (native binary load failure, timeout, or similar) → **Path B**: skip rasterization for PDFs entirely. Instead, send the raw PDF bytes as a `file` content part directly to the Gemini vision call in Task 6 (Gemini's API accepts inline PDF documents natively). Task 6 includes both code paths — use the Path B branch instead.

- [ ] **Step 4: Record the decision and delete the spike file**

Add this comment as the first line of `convex/documentIngestion.ts` (created in Task 6):
```typescript
// PDF path: A (pdf-to-img rasterization) — confirmed working <today's date>
```
or
```typescript
// PDF path: B (native PDF input to Gemini) — pdf-to-img failed in Convex Node sandbox, confirmed <today's date>
```

```bash
rm convex/documentIngestionSpike.ts
git add -A
git commit -m "chore: spike PDF rendering path for document ingestion"
```

---

### Task 2: Pure logic — diagram crop resolution

**Files:**
- Create: `convex/lib/documentIngestion.ts`
- Test: `convex/lib/documentIngestion.test.ts`

**Interfaces:**
- Produces: `resolveDiagramCrop(box: BoundingBox | null, pageWidth: number, pageHeight: number): CropResult` — used by Task 6's action.
- Produces: `BoundingBox = { xMin: number, yMin: number, xMax: number, yMax: number }` (pixel coordinates), `CropResult = { crop: BoundingBox | null }` (`null` crop means "use the whole page image, don't crop").

- [ ] **Step 1: Write the failing tests**

```typescript
// convex/lib/documentIngestion.test.ts
import { resolveDiagramCrop } from "./documentIngestion";

describe("resolveDiagramCrop", () => {
  const pageWidth = 1000;
  const pageHeight = 1400;

  it("pads a valid, reasonably-sized box by ~8%", () => {
    const box = { xMin: 100, yMin: 100, xMax: 300, yMax: 300 }; // 200x200, 4% of page area
    const result = resolveDiagramCrop(box, pageWidth, pageHeight);
    expect(result.crop).not.toBeNull();
    const padding = 200 * 0.08; // 8% of the box's width
    expect(result.crop!.xMin).toBeCloseTo(100 - padding, 0);
    expect(result.crop!.xMax).toBeCloseTo(300 + padding, 0);
  });

  it("clamps the padded box to page bounds", () => {
    const box = { xMin: 5, yMin: 5, xMax: 995, yMax: 200 };
    const result = resolveDiagramCrop(box, pageWidth, pageHeight);
    expect(result.crop!.xMin).toBeGreaterThanOrEqual(0);
    expect(result.crop!.xMax).toBeLessThanOrEqual(pageWidth);
  });

  it("falls back to the whole page when the box is degenerate (near-zero area)", () => {
    const box = { xMin: 500, yMin: 500, xMax: 501, yMax: 500.5 };
    const result = resolveDiagramCrop(box, pageWidth, pageHeight);
    expect(result.crop).toBeNull();
  });

  it("falls back to the whole page when the box covers almost the entire page", () => {
    const box = { xMin: 5, yMin: 5, xMax: 995, yMax: 1395 }; // ~99% of page area
    const result = resolveDiagramCrop(box, pageWidth, pageHeight);
    expect(result.crop).toBeNull();
  });

  it("falls back to the whole page when the box is null", () => {
    const result = resolveDiagramCrop(null, pageWidth, pageHeight);
    expect(result.crop).toBeNull();
  });

  it("falls back to the whole page when the box has invalid coordinates (xMax < xMin)", () => {
    const box = { xMin: 300, yMin: 100, xMax: 100, yMax: 300 };
    const result = resolveDiagramCrop(box, pageWidth, pageHeight);
    expect(result.crop).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx jest convex/lib/documentIngestion.test.ts
```
Expected: FAIL — `Cannot find module './documentIngestion'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```typescript
// convex/lib/documentIngestion.ts

export type BoundingBox = { xMin: number; yMin: number; xMax: number; yMax: number };
export type CropResult = { crop: BoundingBox | null };

const PADDING_RATIO = 0.08;
const MIN_AREA_RATIO = 0.002; // below this fraction of page area, treat as degenerate
const MAX_AREA_RATIO = 0.92; // above this fraction of page area, just use the whole page

function isValidBox(box: BoundingBox): boolean {
  return (
    Number.isFinite(box.xMin) &&
    Number.isFinite(box.yMin) &&
    Number.isFinite(box.xMax) &&
    Number.isFinite(box.yMax) &&
    box.xMax > box.xMin &&
    box.yMax > box.yMin
  );
}

export function resolveDiagramCrop(
  box: BoundingBox | null,
  pageWidth: number,
  pageHeight: number
): CropResult {
  if (!box || !isValidBox(box)) return { crop: null };

  const boxWidth = box.xMax - box.xMin;
  const boxHeight = box.yMax - box.yMin;
  const areaRatio = (boxWidth * boxHeight) / (pageWidth * pageHeight);

  if (areaRatio < MIN_AREA_RATIO || areaRatio > MAX_AREA_RATIO) {
    return { crop: null };
  }

  const xPadding = boxWidth * PADDING_RATIO;
  const yPadding = boxHeight * PADDING_RATIO;

  return {
    crop: {
      xMin: Math.max(0, box.xMin - xPadding),
      yMin: Math.max(0, box.yMin - yPadding),
      xMax: Math.min(pageWidth, box.xMax + xPadding),
      yMax: Math.min(pageHeight, box.yMax + yPadding),
    },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx jest convex/lib/documentIngestion.test.ts
```
Expected: PASS, all 6 tests.

- [ ] **Step 5: Commit**

```bash
git add convex/lib/documentIngestion.ts convex/lib/documentIngestion.test.ts
git commit -m "feat: add diagram crop resolution logic with padding and fallback"
```

---

### Task 3: Pure logic — model output JSON extraction

The existing flashcard generation in `study.tsx` (line ~349) already does `raw.match(/\[[\s\S]*\]/)` then `JSON.parse`. This task pulls that pattern into a shared, tested function that also handles guide content (a JSON object, not array) and quiz content, so `processDocuments` (Task 6) doesn't duplicate ad-hoc regex parsing.

**Files:**
- Modify: `convex/lib/documentIngestion.ts`
- Modify: `convex/lib/documentIngestion.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `extractJson<T>(raw: string, shape: "array" | "object"): T` — throws `Error` with a descriptive message if no valid JSON of the requested shape is found. Used by Task 6.

- [ ] **Step 1: Add the failing tests**

```typescript
// append to convex/lib/documentIngestion.test.ts
import { extractJson } from "./documentIngestion";

describe("extractJson", () => {
  it("extracts a JSON array from surrounding prose", () => {
    const raw = 'Here is the output:\n[{"question": "What is a PK?"}]\nDone.';
    const result = extractJson<{ question: string }[]>(raw, "array");
    expect(result).toEqual([{ question: "What is a PK?" }]);
  });

  it("extracts a JSON object from surrounding prose", () => {
    const raw = 'Sure!\n{"title": "Chapter 1", "text": "Notes here"}\nEnjoy.';
    const result = extractJson<{ title: string; text: string }>(raw, "object");
    expect(result).toEqual({ title: "Chapter 1", text: "Notes here" });
  });

  it("throws a descriptive error when no array is found for shape=array", () => {
    expect(() => extractJson("no json here", "array")).toThrow(
      "Could not find a JSON array in the model response"
    );
  });

  it("throws a descriptive error when no object is found for shape=object", () => {
    expect(() => extractJson("no json here", "object")).toThrow(
      "Could not find a JSON object in the model response"
    );
  });

  it("throws when the matched text is not valid JSON", () => {
    expect(() => extractJson("[not valid json]", "array")).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest convex/lib/documentIngestion.test.ts
```
Expected: FAIL — `extractJson` is not exported.

- [ ] **Step 3: Implement**

```typescript
// append to convex/lib/documentIngestion.ts

export function extractJson<T>(raw: string, shape: "array" | "object"): T {
  const pattern = shape === "array" ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = raw.match(pattern);
  if (!match) {
    throw new Error(
      `Could not find a JSON ${shape} in the model response`
    );
  }
  return JSON.parse(match[0]) as T;
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx jest convex/lib/documentIngestion.test.ts
```
Expected: PASS, all 11 tests.

- [ ] **Step 5: Commit**

```bash
git add convex/lib/documentIngestion.ts convex/lib/documentIngestion.test.ts
git commit -m "feat: add shared JSON extraction for AI model responses"
```

---

### Task 4: Schema changes

**Files:**
- Modify: `convex/schema.ts`

**Interfaces:**
- Produces: `cardSchema.imageUrl?: string`, `quizQuestionSchema.imageUrl?: string`. `studyGuides` is untouched — diagrams live directly in `text` as markdown image syntax (see Global Constraints). Task 5 writes these fields via the reused `add` mutations; the separate redesign plan's flashcard/quiz screens read them.

- [ ] **Step 1: Edit the schema**

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const cardSchema = v.object({
  id: v.string(),
  question: v.string(),
  answers: v.array(v.string()),
  explanation: v.string(),
  starred: v.boolean(),
  hidden: v.boolean(),
  imageUrl: v.optional(v.string()),
});

const quizQuestionSchema = v.object({
  question: v.string(),
  options: v.array(v.string()),
  correctAnswers: v.array(v.string()),
  type: v.union(v.literal('single'), v.literal('multi')),
  selectCount: v.number(),
  imageUrl: v.optional(v.string()),
});

export default defineSchema({
  classes: defineTable({
    name: v.string(),
    description: v.string(),
  }),

  studyGuides: defineTable({
    classId: v.string(),
    title: v.string(),
    text: v.string(),
    audioFile: v.union(v.string(), v.null()),
    lastModified: v.string(),
  }).index("by_classId", ["classId"]),

  flashcardSets: defineTable({
    classId: v.string(),
    title: v.optional(v.string()),
    sourceText: v.string(),
    cards: v.array(cardSchema),
    lastModified: v.string(),
  }).index("by_classId", ["classId"]),

  quizzes: defineTable({
    classId: v.string(),
    title: v.string(),
    questions: v.array(quizQuestionSchema),
    lastModified: v.string(),
  }).index("by_classId", ["classId"]),

  quizAttempts: defineTable({
    quizId: v.string(),
    classId: v.string(),
    score: v.number(),
    total: v.number(),
    wrongCount: v.number(),
    timeSeconds: v.number(),
    takenAt: v.string(),
  }).index("by_quizId", ["quizId"]),
});
```

- [ ] **Step 2: Mirror the same field in the local schema copies**

`convex/flashcardSets.ts` and `convex/quizzes.ts` each redefine `cardSchema`/`quizQuestionSchema` as local consts (not imported from `convex/schema.ts`) — this is the existing pattern in this codebase. Add `imageUrl: v.optional(v.string())` to both local copies now, so the existing public `add`/`update` mutations already accept it before Task 6 needs to call them:

In `convex/flashcardSets.ts`, find the local `cardSchema` near the top and add the field:
```typescript
const cardSchema = v.object({
  id: v.string(),
  question: v.string(),
  answers: v.array(v.string()),
  explanation: v.string(),
  starred: v.boolean(),
  hidden: v.boolean(),
  imageUrl: v.optional(v.string()),
});
```

In `convex/quizzes.ts`, find the local `quizQuestionSchema` near the top and add the field:
```typescript
const quizQuestionSchema = v.object({
  question: v.string(),
  options: v.array(v.string()),
  correctAnswers: v.array(v.string()),
  type: v.union(v.literal('single'), v.literal('multi')),
  selectCount: v.number(),
  imageUrl: v.optional(v.string()),
});
```

- [ ] **Step 3: Manual verification**

```bash
npx convex dev
```
Expected: Convex pushes the schema successfully with no errors, and `npx tsc --noEmit` shows no new type errors. Existing documents are untouched — the new field is optional, so old flashcard/quiz records remain valid.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/flashcardSets.ts convex/quizzes.ts
git commit -m "feat: add optional imageUrl field to cards and quiz questions"
```

---

### Task 5: File storage plumbing

**Files:**
- Create: `convex/files.ts`

**Interfaces:**
- Produces: `api.files.generateUploadUrl` (public mutation, no args, returns `string`) — called by `useDocumentUpload` (Task 8).
- Produces: `internal.files.deleteFiles` (internal mutation, args `{ storageIds: Id<"_storage">[] }`) — called by `processDocuments` (Task 6) after generation succeeds.

- [ ] **Step 1: Write the file**

```typescript
// convex/files.ts
import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const deleteFiles = internalMutation({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, { storageIds }) => {
    for (const storageId of storageIds) {
      await ctx.storage.delete(storageId);
    }
  },
});
```

- [ ] **Step 2: Manual verification**

```bash
npx convex dev
```
From the Convex dashboard Functions tab, run `files:generateUploadUrl` with no args — expect a valid HTTPS URL string back. Upload a small test file to that URL via `curl -F "file=@test.pdf" <url>`, note the returned `storageId`, then run `files:deleteFiles` with `{"storageIds": ["<that id>"]}` and confirm the file no longer appears in the dashboard's File Storage tab.

- [ ] **Step 3: Commit**

```bash
git add convex/files.ts
git commit -m "feat: add Convex file storage upload/delete plumbing"
```

---

### Task 6: `processDocuments` Node action

This is the core orchestration: fetch uploaded files, rasterize PDFs (Path A) or pass PDFs natively (Path B, per Task 1's decision), call the vision model, parse the response, crop diagram images, save content through the **existing** `add` mutations, clean up.

**Files:**
- Create: `convex/documentIngestion.ts`

**Interfaces:**
- Consumes: `resolveDiagramCrop`, `extractJson` from `./lib/documentIngestion` (Tasks 2-3); `internal.files.deleteFiles` (Task 5); `api.flashcardSets.add`, `api.quizzes.add`, `api.studyGuides.add` (existing, unmodified — see `hooks/useDataFetch.ts` for their exact call shapes).
- Produces: `api.documentIngestion.processDocuments` (public action), args `{ classId: v.string(), storageIds: v.array(v.id("_storage")), contentType: v.union(v.literal("guide"), v.literal("flashcards"), v.literal("quiz")), title: v.optional(v.string()) }`, returns `{ id: string }`. Called by `useDocumentUpload` (Task 8).

- [ ] **Step 1: Write the action (Path A — `pdf-to-img` rasterization)**

```typescript
// PDF path: A (pdf-to-img rasterization) — confirmed working <fill in date from Task 1>
"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { pdf } from "pdf-to-img";
import { Jimp } from "jimp";
import { resolveDiagramCrop, extractJson, type BoundingBox } from "./lib/documentIngestion";

const VISION_MODEL = "google/gemini-2.0-flash-001";

type PageImage = { base64: string; width: number; height: number };
type DiagramRef = { pageIndex: number; box: BoundingBox } | undefined;

async function renderPagesFromFile(buffer: Buffer, isPdf: boolean): Promise<PageImage[]> {
  if (!isPdf) {
    const image = await Jimp.read(buffer);
    return [{ base64: (await image.getBase64("image/png")).split(",")[1], width: image.width, height: image.height }];
  }
  const document = await pdf(buffer, { scale: 2 });
  const pages: PageImage[] = [];
  for await (const pageBuffer of document) {
    const image = await Jimp.read(pageBuffer);
    pages.push({ base64: (await image.getBase64("image/png")).split(",")[1], width: image.width, height: image.height });
  }
  return pages;
}

function promptFor(contentType: "guide" | "flashcards" | "quiz"): string {
  const base = `You are analyzing study material page images for a database class. Some pages may contain ER diagrams, schema diagrams, or tables. When a piece of content is based on a diagram, include a "diagramRef" field: { "pageIndex": <0-based index into the provided images>, "box": { "xMin": <px>, "yMin": <px>, "xMax": <px>, "yMax": <px> } } giving the diagram's approximate pixel location on that page. Omit "diagramRef" entirely for non-diagram content.`;

  if (contentType === "flashcards") {
    return `${base}\n\nGenerate as many flashcards as the material actually supports (no artificial cap) as a raw JSON array. No markdown, no explanation — only the JSON array.\nFormat: [{"question": "...", "answers": ["..."], "explanation": "...", "diagramRef": { "pageIndex": 0, "box": {...} } }]`;
  }
  if (contentType === "quiz") {
    return `${base}\n\nGenerate as many multiple-choice questions as the material actually supports (no artificial cap) as a raw JSON array. No markdown, no explanation — only the JSON array.\nFormat: [{"question": "...", "options": ["A","B","C","D"], "correctAnswers": ["A"], "type": "single", "selectCount": 1, "diagramRef": {...} }]`;
  }
  return `${base}\n\nWrite organized study guide notes covering all the material, formatted as markdown, as a raw JSON object. No explanation outside the JSON — only the JSON object.\nWhen a section should show a diagram, insert a placeholder token "[[image:N]]" (N = a 0-based index you assign, starting at 0) on its own line directly in the "text" field at that point, and list each referenced diagram in "images".\nFormat: {"title": "...", "text": "## Section\\n\\n[[image:0]]\\n\\nmore markdown notes here...", "images": [{"index": 0, "diagramRef": {...}}]}`;
}

async function callVisionModel(pages: PageImage[], contentType: "guide" | "flashcards" | "quiz"): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured in Convex environment");

  const content: any[] = [{ type: "text", text: promptFor(contentType) }];
  for (const page of pages) {
    content.push({ type: "image_url", image_url: { url: `data:image/png;base64,${page.base64}` } });
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [{ role: "user", content }],
      temperature: 0.3,
      max_tokens: 12000,
    }),
  });
  if (!response.ok) throw new Error(`OpenRouter request failed: ${response.status} ${await response.text()}`);
  const json = await response.json();
  return json.choices[0].message.content as string;
}

/** Crops (or falls back to whole page) and stores the diagram image, returning its public URL. */
async function cropAndStoreUrl(ctx: any, pages: PageImage[], diagramRef: DiagramRef): Promise<string | undefined> {
  if (!diagramRef) return undefined;
  const page = pages[diagramRef.pageIndex];
  if (!page) return undefined;

  const { crop } = resolveDiagramCrop(diagramRef.box, page.width, page.height);
  const image = await Jimp.read(Buffer.from(page.base64, "base64"));
  if (crop) {
    image.crop({
      x: Math.round(crop.xMin),
      y: Math.round(crop.yMin),
      w: Math.round(crop.xMax - crop.xMin),
      h: Math.round(crop.yMax - crop.yMin),
    });
  }
  const outputBuffer = await image.getBuffer("image/png");
  const storageId = await ctx.storage.store(new Blob([outputBuffer], { type: "image/png" }));
  const url = await ctx.storage.getUrl(storageId);
  return url ?? undefined;
}

export const processDocuments = action({
  args: {
    classId: v.string(),
    storageIds: v.array(v.id("_storage")),
    contentType: v.union(v.literal("guide"), v.literal("flashcards"), v.literal("quiz")),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { classId, storageIds, contentType, title }) => {
    const allPages: PageImage[] = [];
    for (const storageId of storageIds) {
      const blob = await ctx.storage.get(storageId);
      if (!blob) throw new Error(`File ${storageId} not found in storage`);
      const buffer = Buffer.from(await blob.arrayBuffer());
      const isPdf = blob.type === "application/pdf";
      const pages = await renderPagesFromFile(buffer, isPdf);
      allPages.push(...pages);
    }

    const raw = await callVisionModel(allPages, contentType);
    const now = new Date().toISOString();

    let id: string;
    if (contentType === "flashcards") {
      const parsed = extractJson<any[]>(raw, "array");
      const cards = [];
      for (let i = 0; i < parsed.length; i++) {
        const c = parsed[i];
        const imageUrl = await cropAndStoreUrl(ctx, allPages, c.diagramRef);
        cards.push({
          id: `${Date.now()}-${i}`,
          question: c.question,
          answers: Array.isArray(c.answers) ? c.answers : [c.answers],
          explanation: c.explanation ?? "",
          starred: false,
          hidden: false,
          imageUrl,
        });
      }
      const docId = await ctx.runMutation(api.flashcardSets.add, {
        classId,
        title: title?.trim() || "Flashcard Set",
        sourceText: "[Generated from uploaded document]",
        cards,
        lastModified: now,
      });
      id = docId.toString();
    } else if (contentType === "quiz") {
      const parsed = extractJson<any[]>(raw, "array");
      const questions = [];
      for (const q of parsed) {
        const imageUrl = await cropAndStoreUrl(ctx, allPages, q.diagramRef);
        questions.push({
          question: q.question,
          options: q.options,
          correctAnswers: q.correctAnswers,
          type: q.type ?? "single",
          selectCount: q.selectCount ?? 1,
          imageUrl,
        });
      }
      const docId = await ctx.runMutation(api.quizzes.add, {
        classId,
        title: title?.trim() || "Quiz",
        questions,
        lastModified: now,
      });
      id = docId.toString();
    } else {
      const parsed = extractJson<{ title: string; text: string; images: { index: number; diagramRef: DiagramRef }[] }>(raw, "object");
      let text = parsed.text;
      for (const img of parsed.images ?? []) {
        const url = await cropAndStoreUrl(ctx, allPages, img.diagramRef);
        text = text.replace(`[[image:${img.index}]]`, url ? `![Diagram](${url})` : "");
      }
      const docId = await ctx.runMutation(api.studyGuides.add, {
        classId,
        title: title?.trim() || parsed.title || "Study Guide",
        text,
        audioFile: null,
        lastModified: now,
      });
      id = docId.toString();
    }

    await ctx.runMutation(internal.files.deleteFiles, { storageIds });
    return { id };
  },
});
```

- [ ] **Step 2: If Task 1 chose Path B instead (native PDF input), replace `renderPagesFromFile` and the storage-iteration loop in `processDocuments`**

```typescript
// PDF path: B (native PDF input to Gemini) — replaces renderPagesFromFile and part of the handler above

// Photos still rasterize to a single PageImage via Jimp as above.
// PDFs are NOT rasterized — instead, pass the raw PDF bytes as a `file` content part
// alongside any photo images, and skip per-page diagramRef.pageIndex bookkeeping for
// PDF-sourced diagrams (diagramRef.pageIndex refers only to indices within `photoPages`;
// diagrams from PDF content have no crop and always fall back to descriptive text —
// document this limitation in the guide/flashcard/quiz prompt for Path B).

async function callVisionModelPathB(
  photoPages: PageImage[],
  pdfBuffers: Buffer[],
  contentType: "guide" | "flashcards" | "quiz"
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured in Convex environment");

  const content: any[] = [{ type: "text", text: promptFor(contentType) }];
  for (const buf of pdfBuffers) {
    content.push({ type: "file", file: { filename: "document.pdf", file_data: `data:application/pdf;base64,${buf.toString("base64")}` } });
  }
  for (const page of photoPages) {
    content.push({ type: "image_url", image_url: { url: `data:image/png;base64,${page.base64}` } });
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: VISION_MODEL, messages: [{ role: "user", content }], temperature: 0.3, max_tokens: 12000 }),
  });
  if (!response.ok) throw new Error(`OpenRouter request failed: ${response.status} ${await response.text()}`);
  const json = await response.json();
  return json.choices[0].message.content as string;
}
```

- [ ] **Step 3: Set the OpenRouter API key in Convex's environment**

```bash
npx convex env set OPENROUTER_API_KEY "<your key>"
```

- [ ] **Step 4: Manual end-to-end verification**

Using the Convex dashboard: upload a real 1-3 page PDF with a diagram (or a photo of one) via File Storage, note its `storageId`, then run:

```bash
npx convex run documentIngestion:processDocuments '{"classId": "<a real classId>", "storageIds": ["<storage id>"], "contentType": "flashcards", "title": "Test Import"}'
```

Expected: returns `{ id: "<a flashcardSets doc id>" }`. In the dashboard's Data tab, open that `flashcardSets` row and confirm: cards were generated, at least one card (if the source had a diagram) has a non-empty `imageUrl`, and opening that URL in a browser shows the cropped (or whole-page) diagram image. Also confirm the original uploaded file's `storageId` no longer appears in File Storage (cleanup ran).

Repeat with `"contentType": "quiz"` and `"contentType": "guide"`. For the guide, confirm the saved `text` contains a real `![Diagram](https://...)` markdown image tag (not a raw `[[image:N]]` marker) at the position the AI chose.

- [ ] **Step 5: Commit**

```bash
git add convex/documentIngestion.ts
git commit -m "feat: add processDocuments action for AI-generated study material from uploaded files"
```

---

### Task 7: `expo-image-picker` + `useDocumentUpload` hook

**Files:**
- Create: `hooks/useDocumentUpload.ts`

**Interfaces:**
- Consumes: `api.files.generateUploadUrl`, `api.documentIngestion.processDocuments` (Tasks 5-6).
- Produces: `useDocumentUpload()` returning `{ pickAndUpload: (contentType: "guide"|"flashcards"|"quiz", classId: string, title?: string) => Promise<{ id: string } | null>, pickPhotoAndUpload: (same signature), uploading: boolean, currentStep: string | null, error: string | null }`. Consumed by Task 9 (`study.tsx`) and Task 10 (`quiz-screen.tsx`).

- [ ] **Step 1: Install `expo-image-picker`**

```bash
npx expo install expo-image-picker
```

- [ ] **Step 2: Write the hook**

```typescript
// hooks/useDocumentUpload.ts
import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type ContentType = "guide" | "flashcards" | "quiz";

export const useDocumentUpload = () => {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const processDocuments = useAction(api.documentIngestion.processDocuments);
  const [uploading, setUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadOne = async (uri: string, mimeType: string): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uri);
    const blob = await response.blob();
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": mimeType },
      body: blob,
    });
    if (!result.ok) throw new Error(`Upload failed: ${result.status}`);
    const { storageId } = await result.json();
    return storageId;
  };

  const pickAndUpload = async (
    contentType: ContentType,
    classId: string,
    title?: string
  ): Promise<{ id: string } | null> => {
    setError(null);
    try {
      const docResult = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (docResult.canceled || docResult.assets.length === 0) return null;

      setUploading(true);
      setCurrentStep("Uploading document...");
      const storageIds: Id<"_storage">[] = [];
      for (const asset of docResult.assets) {
        const mimeType = asset.mimeType ?? "application/octet-stream";
        storageIds.push(await uploadOne(asset.uri, mimeType));
      }

      setCurrentStep("Reading document...");
      const result = await processDocuments({ classId, storageIds, contentType, title });
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process document");
      return null;
    } finally {
      setUploading(false);
      setCurrentStep(null);
    }
  };

  const pickPhotoAndUpload = async (
    contentType: ContentType,
    classId: string,
    title?: string
  ): Promise<{ id: string } | null> => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is required to take a photo");
      return null;
    }
    const photoResult = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (photoResult.canceled || photoResult.assets.length === 0) return null;

    setUploading(true);
    setCurrentStep("Uploading photo...");
    try {
      const storageId = await uploadOne(photoResult.assets[0].uri, "image/jpeg");
      setCurrentStep("Reading document...");
      const result = await processDocuments({ classId, storageIds: [storageId], contentType, title });
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process photo");
      return null;
    } finally {
      setUploading(false);
      setCurrentStep(null);
    }
  };

  return { pickAndUpload, pickPhotoAndUpload, uploading, currentStep, error };
};
```

- [ ] **Step 3: Manual verification**

Add a temporary test button anywhere in `app/(tabs)/(class)/study.tsx` (removed in Task 9 once real wiring lands) that calls `pickAndUpload("flashcards", classId)` and logs the result. Run the app (`skool`), tap it, pick a real PDF, confirm a new flashcard set appears in the Flashcards tab with generated cards.

- [ ] **Step 4: Commit**

```bash
git add hooks/useDocumentUpload.ts
git commit -m "feat: add useDocumentUpload hook for picking and uploading study documents"
```

---

### Task 8: `ProgressSteps` component

**Files:**
- Create: `components/ProgressSteps.tsx`

**Interfaces:**
- Produces: `<ProgressSteps steps={string[]} currentStep={string | null} />` — renders each step, highlighting the active one and checking off completed ones (steps before `currentStep` in the array). Consumed by Tasks 9-10.

- [ ] **Step 1: Write the component**

```tsx
// components/ProgressSteps.tsx
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";

type ProgressStepsProps = {
  steps: string[];
  currentStep: string | null;
};

export function ProgressSteps({ steps, currentStep }: ProgressStepsProps) {
  const { theme } = useTheme();
  const C = Colors[theme];
  const currentIndex = currentStep ? steps.indexOf(currentStep) : -1;

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isDone = currentIndex > index || currentIndex === -1;
        const isActive = index === currentIndex;
        const color = isActive ? C.accentGreen : isDone ? C.text : C.textMuted;
        return (
          <View key={step} style={styles.row}>
            <Text style={[styles.marker, { color }]}>
              {isDone && currentIndex !== -1 ? "✓" : isActive ? "●" : "○"}
            </Text>
            <Text style={[styles.label, { color }]}>{step}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  marker: { fontSize: 14, width: 16, textAlign: "center" },
  label: { fontSize: 13 },
});
```

- [ ] **Step 2: Manual verification**

Temporarily render `<ProgressSteps steps={["Reading document", "Extracting diagrams", "Generating flashcards", "Saving"]} currentStep="Extracting diagrams" />` in any screen, confirm the first step shows a checkmark, the second shows a filled dot in accent green, and the remaining two show hollow circles in muted text.

- [ ] **Step 3: Commit**

```bash
git add components/ProgressSteps.tsx
git commit -m "feat: add ProgressSteps component for multi-step generation feedback"
```

---

### Task 9: Wire into `study.tsx` (Add Flashcards + Add Guide sheets)

**Files:**
- Modify: `app/(tabs)/(class)/study.tsx`

**Interfaces:**
- Consumes: `useDocumentUpload` (Task 7), `ProgressSteps` (Task 8).

- [ ] **Step 1: Remove the temporary test button from Task 7's verification, if still present**

- [ ] **Step 2: In the Add Flashcards sheet, add an upload option alongside the existing paste-text `TextInput`**

Add near the top of the component, alongside the existing `flashcardSourceText` state (around line 316 per the current file):

```typescript
const { pickAndUpload, uploading: docUploading, currentStep: docStep, error: docError } = useDocumentUpload();

const handleUploadFlashcards = async () => {
  const result = await pickAndUpload("flashcards", classItem.id, flashcardSetTitle);
  if (result) hideAddFlashcards();
};
```

In the Add Flashcards sheet's JSX, add a button above or below the existing source-text `TextInput` (matching the sheet's existing button styling patterns):

```tsx
<TouchableOpacity onPress={handleUploadFlashcards} disabled={docUploading} style={[styles.submitBtn, { backgroundColor: C.fadedGrey }]}>
  <Text style={{ color: C.text }}>Upload a document instead</Text>
</TouchableOpacity>
{docUploading && <ProgressSteps steps={["Uploading document...", "Reading document...", "Generating flashcards..."]} currentStep={docStep} />}
{docError && <Text style={{ color: "#ff4444" }}>{docError}</Text>}
```

- [ ] **Step 3: Repeat for the Add Guide sheet**

Same pattern, using `pickAndUpload("guide", classItem.id, newGuideTitle)` instead, wired next to the existing `newGuideContent` `TextInput`.

- [ ] **Step 4: Manual verification**

Run `skool`, open a class, open Add Flashcards, tap "Upload a document instead", pick a real PDF with a diagram, confirm the progress steps render and a new flashcard set appears with at least one image-bearing card if the source had a diagram. Repeat for Add Guide — open the resulting guide in the Reader screen and confirm the diagram image actually renders inline (this works today, without waiting on the separate redesign plan, because `reader.tsx` already renders `text` through `react-native-markdown-display`).

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/(class)/study.tsx"
git commit -m "feat: wire document upload into Add Flashcards and Add Guide flows"
```

---

### Task 10: Wire into `quiz-screen.tsx`

**Files:**
- Modify: `app/(tabs)/(class)/quiz-screen.tsx`

**Interfaces:**
- Consumes: `useDocumentUpload` (Task 7), `ProgressSteps` (Task 8).

- [ ] **Step 1: Add the same upload option to wherever quiz generation is currently triggered**

```typescript
const { pickAndUpload, uploading: docUploading, currentStep: docStep, error: docError } = useDocumentUpload();

const handleUploadQuiz = async () => {
  const result = await pickAndUpload("quiz", classId);
  if (result) {
    // existing navigation-to-generated-quiz logic goes here, matching how
    // the current AI-generated quiz flow routes after `addQuiz` succeeds
  }
};
```

Add a button alongside the existing quiz-generation trigger, and render `<ProgressSteps steps={["Uploading document...", "Reading document...", "Generating quiz..."]} currentStep={docStep} />` while `docUploading` is true, matching Task 9's pattern.

- [ ] **Step 2: Manual verification**

Run `skool`, trigger quiz generation via document upload, confirm a quiz is generated and any diagram-based question shows a non-empty `imageUrl` in the Convex dashboard's Data tab, and that opening the URL shows the diagram image.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/(class)/quiz-screen.tsx"
git commit -m "feat: wire document upload into quiz generation flow"
```

---

## Self-Review

**Spec coverage:** Multi-file combine (Task 6 accepts `storageIds: array`, all pages concatenated into one model call) ✓. No hard cap (prompt says "no artificial cap", soft 150 ceiling noted as constraint) ✓. Diagram image display, not just text (`imageUrl` end-to-end from crop → schema → save → renders via existing markdown/URL) ✓. Padded-crop-with-fallback (Task 2, tested) ✓. Discard original file after generating (Task 6 calls `deleteFiles` at the end) ✓. Both PDFs and photos (Task 6's `renderPagesFromFile` branches on `blob.type`) ✓. Paste-text flow untouched (Tasks 9-10 add upload as an additional option, don't remove the existing `TextInput` flow) ✓.

**Placeholder scan:** No TBD/TODO. Task 6 Step 2 (Path B) is a genuine alternative-path fork with real code, not a placeholder — it's conditional on Task 1's actual finding, which is the honest state of things given the PDF-rendering approach is unverified until Task 1 runs.

**Type consistency:** `imageUrl` name matches across schema (Task 4), the local `cardSchema`/`quizQuestionSchema` copies in `flashcardSets.ts`/`quizzes.ts` (Task 4 Step 2), and `processDocuments` (Task 6). `pickAndUpload`/`pickPhotoAndUpload` signatures in Task 7 match their usage in Tasks 9-10.

**Simplification applied during self-review:** Originally planned separate `addFromIngestion` internal mutations per content type plus a custom `studyGuides.images` schema field and `[[image:N]]` client-side renderer. Cut both after confirming (a) `flashcardSets.add`/`quizzes.add`/`studyGuides.add` already accept the exact shape needed once their local card/question schemas gain `imageUrl`, and (b) `reader.tsx` already renders guide text through `react-native-markdown-display`, which natively supports `![alt](url)` images — so resolving the `[[image:N]]` marker to real markdown syntax *before* saving (inside the action, once the URL is known) needs zero new schema or rendering code. This cut 3 tasks and 2 schema fields with no loss of functionality.

// PDF path: A (pdf-to-img rasterization) — confirmed working 2026-07-25
"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { pdf } from "pdf-to-img";
import { Jimp } from "jimp";
import { resolveDiagramCrop, extractJson, type BoundingBox } from "./lib/documentIngestion";

// google/gemini-2.0-flash-001 (per brief) returns 404 "No endpoints found" on OpenRouter as of
// 2026-07-25 — the 2.0 Gemini line has been deprecated/retired. Using its closest available
// vision-capable successor instead.
const VISION_MODEL = "google/gemini-2.5-flash-lite";

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
  try {
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
  } catch (err) {
    console.error("cropAndStoreUrl failed for diagramRef", diagramRef, err);
    return undefined;
  }
}

export const processDocuments = action({
  args: {
    classId: v.string(),
    storageIds: v.array(v.id("_storage")),
    contentType: v.union(v.literal("guide"), v.literal("flashcards"), v.literal("quiz")),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { classId, storageIds, contentType, title }) => {
    try {
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
          if (typeof c?.question !== "string" || c.question.trim() === "") {
            console.error("Skipping flashcard item with invalid question", c);
            continue;
          }
          const answers = Array.isArray(c.answers)
            ? c.answers.filter((a: unknown) => typeof a === "string" && a.trim())
            : typeof c.answers === "string" && c.answers.trim()
              ? [c.answers]
              : [];
          if (answers.length === 0) {
            console.error("Skipping flashcard item with invalid answers", c);
            continue;
          }
          const explanation = typeof c.explanation === "string" ? c.explanation : "";
          const imageUrl = await cropAndStoreUrl(ctx, allPages, c.diagramRef);
          cards.push({
            id: `${Date.now()}-${i}`,
            question: c.question,
            answers,
            explanation,
            starred: false,
            hidden: false,
            imageUrl,
          });
        }
        if (cards.length === 0) {
          throw new Error(
            `All ${parsed.length} generated flashcards were invalid — model output did not match the expected shape`
          );
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
        const questions: {
          question: string;
          options: string[];
          correctAnswers: string[];
          type: "single" | "multi";
          selectCount: number;
          imageUrl: string | undefined;
        }[] = [];
        for (const q of parsed) {
          const hasValidQuestion = typeof q?.question === "string" && q.question.trim() !== "";
          const hasValidOptions =
            Array.isArray(q?.options) && q.options.length > 0 && q.options.every((o: unknown) => typeof o === "string");
          const hasValidCorrectAnswers =
            Array.isArray(q?.correctAnswers) && q.correctAnswers.every((a: unknown) => typeof a === "string");
          if (!hasValidQuestion || !hasValidOptions || !hasValidCorrectAnswers) {
            console.error("Skipping quiz item with invalid shape", q);
            continue;
          }
          const imageUrl = await cropAndStoreUrl(ctx, allPages, q.diagramRef);
          const correctAnswers = (q.correctAnswers as unknown[]).filter(
            (a: unknown): a is string => typeof a === "string"
          );
          const type: "single" | "multi" = q.type === "multi" ? "multi" : "single";
          const selectCount = type === "multi" ? Math.max(1, correctAnswers.length) : 1;
          questions.push({
            question: q.question,
            options: q.options,
            correctAnswers,
            type,
            selectCount,
            imageUrl,
          });
        }
        if (questions.length === 0) {
          throw new Error(
            `All ${parsed.length} generated quiz questions were invalid — model output did not match the expected shape`
          );
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
        if (typeof parsed.text !== "string" || parsed.text.trim() === "") {
          throw new Error("Model response missing guide text");
        }
        let text = parsed.text;
        for (const img of parsed.images ?? []) {
          const url = await cropAndStoreUrl(ctx, allPages, img.diagramRef);
          text = text.replaceAll(`[[image:${img.index}]]`, url ? `![Diagram](${url})` : "");
        }
        text = text.replace(/\[\[image:\d+\]\]/g, "");
        const docId = await ctx.runMutation(api.studyGuides.add, {
          classId,
          title: title?.trim() || parsed.title || "Study Guide",
          text,
          audioFile: null,
          lastModified: now,
        });
        id = docId.toString();
      }

      return { id };
    } finally {
      try {
        await ctx.runMutation(internal.files.deleteFiles, { storageIds });
      } catch (err) {
        console.error("Failed to delete uploaded files during cleanup", storageIds, err);
      }
    }
  },
});

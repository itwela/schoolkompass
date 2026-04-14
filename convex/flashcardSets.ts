import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const cardSchema = v.object({
  id: v.string(),
  question: v.string(),
  answers: v.array(v.string()),
  explanation: v.string(),
  starred: v.boolean(),
  hidden: v.boolean(),
});

export const list = query({
  args: { classId: v.string() },
  handler: async (ctx, { classId }) => {
    return await ctx.db
      .query("flashcardSets")
      .withIndex("by_classId", (q) => q.eq("classId", classId))
      .collect();
  },
});

export const add = mutation({
  args: {
    classId: v.string(),
    title: v.optional(v.string()),
    sourceText: v.string(),
    cards: v.array(cardSchema),
    lastModified: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("flashcardSets", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("flashcardSets"),
    title: v.optional(v.string()),
    sourceText: v.string(),
    cards: v.array(cardSchema),
    lastModified: v.string(),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("flashcardSets") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const clear = mutation({
  args: { classId: v.string() },
  handler: async (ctx, { classId }) => {
    const sets = await ctx.db
      .query("flashcardSets")
      .withIndex("by_classId", (q) => q.eq("classId", classId))
      .collect();
    for (const set of sets) await ctx.db.delete(set._id);
  },
});

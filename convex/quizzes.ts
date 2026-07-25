import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const quizQuestionSchema = v.object({
  question: v.string(),
  options: v.array(v.string()),
  correctAnswers: v.array(v.string()),
  type: v.union(v.literal('single'), v.literal('multi')),
  selectCount: v.number(),
  imageUrl: v.optional(v.string()),
});

export const list = query({
  args: { classId: v.string() },
  handler: async (ctx, { classId }) => {
    return await ctx.db
      .query("quizzes")
      .withIndex("by_classId", (q) => q.eq("classId", classId))
      .collect();
  },
});

export const add = mutation({
  args: {
    classId: v.string(),
    title: v.string(),
    questions: v.array(quizQuestionSchema),
    lastModified: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("quizzes", args);
  },
});

export const rename = mutation({
  args: { id: v.id("quizzes"), title: v.string() },
  handler: async (ctx, { id, title }) => {
    await ctx.db.patch(id, { title });
  },
});

export const remove = mutation({
  args: { id: v.id("quizzes") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

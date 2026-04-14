import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    quizContent: v.array(
      v.object({
        id: v.string(),
        question: v.string(),
        answer: v.string(),
      })
    ),
    lastModified: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("quizzes", args);
  },
});

export const remove = mutation({
  args: { id: v.id("quizzes") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

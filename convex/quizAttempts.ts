import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const add = mutation({
  args: {
    quizId: v.string(),
    classId: v.string(),
    score: v.number(),
    total: v.number(),
    wrongCount: v.number(),
    timeSeconds: v.number(),
    takenAt: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("quizAttempts", args);
  },
});

export const listByQuiz = query({
  args: { quizId: v.string() },
  handler: async (ctx, { quizId }) => {
    if (!quizId) return [];
    return await ctx.db
      .query("quizAttempts")
      .withIndex("by_quizId", (q) => q.eq("quizId", quizId))
      .order("desc")
      .collect();
  },
});

export const listByClass = query({
  args: { classId: v.string() },
  handler: async (ctx, { classId }) => {
    if (!classId) return [];
    return await ctx.db
      .query("quizAttempts")
      .withIndex("by_classId", (q) => q.eq("classId", classId))
      .collect();
  },
});

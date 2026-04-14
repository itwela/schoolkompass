import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("classes").collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, { name, description }) => {
    return await ctx.db.insert("classes", { name, description });
  },
});

// Cascade-deletes all associated studyGuides, flashcardSets, and quizzes
export const remove = mutation({
  args: { id: v.id("classes") },
  handler: async (ctx, { id }) => {
    const classId = id.toString();

    const guides = await ctx.db
      .query("studyGuides")
      .withIndex("by_classId", (q) => q.eq("classId", classId))
      .collect();
    for (const g of guides) await ctx.db.delete(g._id);

    const sets = await ctx.db
      .query("flashcardSets")
      .withIndex("by_classId", (q) => q.eq("classId", classId))
      .collect();
    for (const s of sets) await ctx.db.delete(s._id);

    const quizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_classId", (q) => q.eq("classId", classId))
      .collect();
    for (const q of quizzes) await ctx.db.delete(q._id);

    await ctx.db.delete(id);
  },
});

// Deletes all classes and all associated data
export const removeAll = mutation({
  args: {},
  handler: async (ctx) => {
    const allGuides = await ctx.db.query("studyGuides").collect();
    for (const g of allGuides) await ctx.db.delete(g._id);

    const allSets = await ctx.db.query("flashcardSets").collect();
    for (const s of allSets) await ctx.db.delete(s._id);

    const allQuizzes = await ctx.db.query("quizzes").collect();
    for (const q of allQuizzes) await ctx.db.delete(q._id);

    const allClasses = await ctx.db.query("classes").collect();
    for (const c of allClasses) await ctx.db.delete(c._id);
  },
});

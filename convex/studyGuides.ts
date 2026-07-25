import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { classId: v.string() },
  handler: async (ctx, { classId }) => {
    return await ctx.db
      .query("studyGuides")
      .withIndex("by_classId", (q) => q.eq("classId", classId))
      .collect();
  },
});

export const add = mutation({
  args: {
    classId: v.string(),
    title: v.string(),
    text: v.string(),
    audioFile: v.union(v.string(), v.null()),
    lastModified: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("studyGuides", args);
  },
});

export const rename = mutation({
  args: { id: v.id("studyGuides"), title: v.string() },
  handler: async (ctx, { id, title }) => {
    await ctx.db.patch(id, { title });
  },
});

export const remove = mutation({
  args: { id: v.id("studyGuides") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

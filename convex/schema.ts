import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const cardSchema = v.object({
  id: v.string(),
  question: v.string(),
  answers: v.array(v.string()),
  explanation: v.string(),
  starred: v.boolean(),
  hidden: v.boolean(),
});

const quizItemSchema = v.object({
  id: v.string(),
  question: v.string(),
  answer: v.string(),
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
    quizContent: v.array(quizItemSchema),
    lastModified: v.string(),
  }).index("by_classId", ["classId"]),
});

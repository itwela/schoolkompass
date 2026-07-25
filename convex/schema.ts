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

const quizQuestionSchema = v.object({
  question: v.string(),
  options: v.array(v.string()),
  correctAnswers: v.array(v.string()),
  type: v.union(v.literal('single'), v.literal('multi')),
  selectCount: v.number(),
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
  })
    .index("by_quizId", ["quizId"])
    .index("by_classId", ["classId"]),
});

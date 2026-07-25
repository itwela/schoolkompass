import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { computeWeakSpots, type WeakSpot } from "@/convex/lib/weakSpots";

export const useWeakSpots = (classId: string) => {
  const attempts = useQuery(api.quizAttempts.listByClass, classId ? { classId } : "skip");
  const quizzes = useQuery(api.quizzes.list, classId ? { classId } : "skip");

  const loading = attempts === undefined || quizzes === undefined;

  const weakSpots: WeakSpot[] = loading
    ? []
    : computeWeakSpots(
        attempts.map((a) => ({ quizId: a.quizId, wrongCount: a.wrongCount, total: a.total, takenAt: a.takenAt })),
        Object.fromEntries(quizzes.map((q) => [q._id.toString(), q.title])),
        3
      );

  return { weakSpots, loading };
};

export type AttemptInput = { quizId: string; wrongCount: number; total: number; takenAt: string };

export type WeakSpot = {
  quizId: string;
  title: string;
  wrongRate: number;
  latestWrongCount: number;
  latestTotal: number;
  attemptCount: number;
  trend: "improving" | "worsening" | "steady" | null;
};

export function computeWeakSpots(
  attempts: AttemptInput[],
  titleByQuizId: Record<string, string>,
  limit: number = 5
): WeakSpot[] {
  const byQuiz = new Map<string, AttemptInput[]>();
  for (const attempt of attempts) {
    const list = byQuiz.get(attempt.quizId) ?? [];
    list.push(attempt);
    byQuiz.set(attempt.quizId, list);
  }

  const results: WeakSpot[] = [];
  for (const [quizId, quizAttempts] of byQuiz) {
    const sorted = [...quizAttempts].sort(
      (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
    );
    // Skip attempts with total <= 0 to avoid NaN and Infinity
    const validAttempts = sorted.filter((a) => a.total > 0);
    if (validAttempts.length === 0) continue;

    const rates = validAttempts.map((a) => a.wrongCount / a.total);
    const avgWrongRate = rates.reduce((sum, r) => sum + r, 0) / rates.length;

    if (avgWrongRate <= 0) continue;

    let trend: WeakSpot["trend"] = null;
    if (validAttempts.length >= 2) {
      const [latest, previous] = rates;
      trend = latest < previous ? "improving" : latest > previous ? "worsening" : "steady";
    }

    results.push({
      quizId,
      title: titleByQuizId[quizId] ?? quizId,
      wrongRate: avgWrongRate,
      latestWrongCount: validAttempts[0].wrongCount,
      latestTotal: validAttempts[0].total,
      attemptCount: validAttempts.length,
      trend,
    });
  }

  return results.sort((a, b) => b.wrongRate - a.wrongRate).slice(0, limit);
}

import { computeWeakSpots, type AttemptInput } from "./weakSpots";

describe("computeWeakSpots", () => {
  const titles = { "quiz-1": "Normalization", "quiz-2": "SQL Joins", "quiz-3": "ACID Properties" };

  it("returns an empty array for no attempts", () => {
    expect(computeWeakSpots([], titles)).toEqual([]);
  });

  it("excludes quizzes with a 0% wrong rate across all attempts", () => {
    const attempts: AttemptInput[] = [
      { quizId: "quiz-1", wrongCount: 0, total: 5, takenAt: "2026-07-01T00:00:00Z" },
    ];
    expect(computeWeakSpots(attempts, titles)).toEqual([]);
  });

  it("sorts by wrong-rate descending (worst first)", () => {
    const attempts: AttemptInput[] = [
      { quizId: "quiz-1", wrongCount: 1, total: 10, takenAt: "2026-07-01T00:00:00Z" }, // 10%
      { quizId: "quiz-2", wrongCount: 4, total: 5, takenAt: "2026-07-01T00:00:00Z" }, // 80%
      { quizId: "quiz-3", wrongCount: 2, total: 8, takenAt: "2026-07-01T00:00:00Z" }, // 25%
    ];
    const result = computeWeakSpots(attempts, titles);
    expect(result.map((w) => w.quizId)).toEqual(["quiz-2", "quiz-3", "quiz-1"]);
  });

  it("averages wrong-rate across multiple attempts of the same quiz", () => {
    const attempts: AttemptInput[] = [
      { quizId: "quiz-1", wrongCount: 5, total: 10, takenAt: "2026-07-01T00:00:00Z" }, // 50%
      { quizId: "quiz-1", wrongCount: 1, total: 10, takenAt: "2026-07-02T00:00:00Z" }, // 10%
    ];
    const result = computeWeakSpots(attempts, titles);
    expect(result[0].wrongRate).toBeCloseTo(0.3, 5); // (50% + 10%) / 2
    expect(result[0].attemptCount).toBe(2);
  });

  it("reports the most recent attempt's raw wrongCount/total, not an average", () => {
    const attempts: AttemptInput[] = [
      { quizId: "quiz-1", wrongCount: 5, total: 10, takenAt: "2026-07-01T00:00:00Z" },
      { quizId: "quiz-1", wrongCount: 2, total: 10, takenAt: "2026-07-05T00:00:00Z" },
    ];
    const result = computeWeakSpots(attempts, titles);
    expect(result[0].latestWrongCount).toBe(2);
    expect(result[0].latestTotal).toBe(10);
  });

  it("computes trend as improving when the most recent attempt has a lower wrong-rate than the previous one", () => {
    const attempts: AttemptInput[] = [
      { quizId: "quiz-1", wrongCount: 5, total: 10, takenAt: "2026-07-01T00:00:00Z" }, // 50%
      { quizId: "quiz-1", wrongCount: 1, total: 10, takenAt: "2026-07-05T00:00:00Z" }, // 10%, most recent
    ];
    expect(computeWeakSpots(attempts, titles)[0].trend).toBe("improving");
  });

  it("computes trend as worsening when the most recent attempt has a higher wrong-rate than the previous one", () => {
    const attempts: AttemptInput[] = [
      { quizId: "quiz-1", wrongCount: 1, total: 10, takenAt: "2026-07-01T00:00:00Z" }, // 10%
      { quizId: "quiz-1", wrongCount: 5, total: 10, takenAt: "2026-07-05T00:00:00Z" }, // 50%, most recent
    ];
    expect(computeWeakSpots(attempts, titles)[0].trend).toBe("worsening");
  });

  it("computes trend as null when there's only one attempt", () => {
    const attempts: AttemptInput[] = [{ quizId: "quiz-1", wrongCount: 2, total: 10, takenAt: "2026-07-01T00:00:00Z" }];
    expect(computeWeakSpots(attempts, titles)[0].trend).toBeNull();
  });

  it("respects the limit parameter", () => {
    const attempts: AttemptInput[] = [
      { quizId: "quiz-1", wrongCount: 1, total: 10, takenAt: "2026-07-01T00:00:00Z" },
      { quizId: "quiz-2", wrongCount: 4, total: 5, takenAt: "2026-07-01T00:00:00Z" },
      { quizId: "quiz-3", wrongCount: 2, total: 8, takenAt: "2026-07-01T00:00:00Z" },
    ];
    expect(computeWeakSpots(attempts, titles, 2)).toHaveLength(2);
  });

  it("falls back to the raw quizId as title when no title is provided", () => {
    const attempts: AttemptInput[] = [{ quizId: "quiz-unknown", wrongCount: 1, total: 5, takenAt: "2026-07-01T00:00:00Z" }];
    expect(computeWeakSpots(attempts, {})[0].title).toBe("quiz-unknown");
  });
});

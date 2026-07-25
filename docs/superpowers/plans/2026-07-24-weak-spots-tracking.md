# Weak-Spots Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface which quizzes the user keeps getting wrong, using `quizAttempts` data (`wrongCount`, `score`, `total`) that's already collected on every quiz completion but never shown anywhere beyond the immediate post-quiz score screen.

**Architecture:** Add a `by_classId` index to the existing `quizAttempts` table, a pure aggregation function that groups attempts by quiz and ranks by wrong-rate with a simple improving/worsening trend, a Convex query exposing that per class, a client hook wiring it together, and a small read-only section on the class screen.

**Tech Stack:** No new dependencies — pure additions on top of existing Convex + React Native/Expo.

## Global Constraints

- This repo has **zero existing automated tests** for Convex functions or React Native screens. Per task: **the aggregation logic (genuinely pure, no I/O) gets real Jest unit tests (TDD)**; the Convex query and UI wiring get manual verification checklists, matching this codebase's existing convention.
- This plan does **not** depend on the separate redesign plan's `components/ui/` kit (`Card`, `Pill`, etc.) — it uses plain `View`/`Text`/`StyleSheet` matching the styling patterns already in `study.tsx`, so it produces working software whether or not the redesign plan has landed yet.
- No schema changes to existing fields — `quizAttempts` already has everything needed (`classId`, `quizId`, `wrongCount`, `total`, `takenAt`); this plan only adds an index.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `convex/schema.ts` | Modify | Add `by_classId` index to `quizAttempts` |
| `convex/lib/weakSpots.ts` | New | Pure aggregation: group attempts by quiz, rank by wrong-rate, compute trend |
| `convex/lib/weakSpots.test.ts` | New | Jest unit tests for the above |
| `convex/quizAttempts.ts` | Modify | Add `listByClass` query using the new index |
| `hooks/useWeakSpots.ts` | New | Combines `listByClass` + quiz titles via `computeWeakSpots` |
| `app/(tabs)/(class)/study.tsx` | Modify | Render a small "Weak Spots" section |

---

### Task 1: Pure logic — weak-spot aggregation

**Files:**
- Create: `convex/lib/weakSpots.ts`
- Test: `convex/lib/weakSpots.test.ts`

**Interfaces:**
- Produces: `computeWeakSpots(attempts: AttemptInput[], titleByQuizId: Record<string, string>, limit?: number): WeakSpot[]`
- Produces: `AttemptInput = { quizId: string, wrongCount: number, total: number, takenAt: string }`
- Produces: `WeakSpot = { quizId: string, title: string, wrongRate: number, latestWrongCount: number, latestTotal: number, attemptCount: number, trend: "improving" | "worsening" | "steady" | null }`
- Consumed by Task 3 (`quizAttempts.listByClass`, run server-side) — this is pure so it's testable in isolation, but is called from a Convex query handler, not the client.

- [ ] **Step 1: Write the failing tests**

```typescript
// convex/lib/weakSpots.test.ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx jest convex/lib/weakSpots.test.ts
```
Expected: FAIL — `Cannot find module './weakSpots'`.

- [ ] **Step 3: Implement**

```typescript
// convex/lib/weakSpots.ts

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
    const rates = sorted.map((a) => a.wrongCount / a.total);
    const avgWrongRate = rates.reduce((sum, r) => sum + r, 0) / rates.length;

    if (avgWrongRate <= 0) continue;

    let trend: WeakSpot["trend"] = null;
    if (sorted.length >= 2) {
      const [latest, previous] = rates;
      trend = latest < previous ? "improving" : latest > previous ? "worsening" : "steady";
    }

    results.push({
      quizId,
      title: titleByQuizId[quizId] ?? quizId,
      wrongRate: avgWrongRate,
      latestWrongCount: sorted[0].wrongCount,
      latestTotal: sorted[0].total,
      attemptCount: sorted.length,
      trend,
    });
  }

  return results.sort((a, b) => b.wrongRate - a.wrongRate).slice(0, limit);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx jest convex/lib/weakSpots.test.ts
```
Expected: PASS, all 10 tests.

- [ ] **Step 5: Commit**

```bash
git add convex/lib/weakSpots.ts convex/lib/weakSpots.test.ts
git commit -m "feat: add pure weak-spot aggregation logic"
```

---

### Task 2: Add `by_classId` index to `quizAttempts`

**Files:**
- Modify: `convex/schema.ts`

**Interfaces:**
- Produces: the `by_classId` index on `quizAttempts`, used by Task 3's `listByClass` query.

- [ ] **Step 1: Add the index**

```typescript
// convex/schema.ts — quizAttempts table only, rest of schema.ts unchanged
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
```

- [ ] **Step 2: Manual verification**

```bash
npx convex dev
```
Expected: pushes cleanly. In the dashboard's Data tab, the `quizAttempts` table's Indexes section shows both `by_quizId` and `by_classId`.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add by_classId index to quizAttempts"
```

---

### Task 3: `quizAttempts.listByClass` query

**Files:**
- Modify: `convex/quizAttempts.ts`

**Interfaces:**
- Produces: `api.quizAttempts.listByClass` (public query), args `{ classId: v.string() }`, returns the raw `quizAttempts` docs for that class. Consumed by Task 4's hook.

- [ ] **Step 1: Add the query**

```typescript
// append to convex/quizAttempts.ts
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
```

- [ ] **Step 2: Manual verification**

```bash
npx convex dev
```
From the dashboard, run `quizAttempts:listByClass` with a real `classId` that has quiz attempts — expect an array of attempt docs matching that `classId`, same shape as `listByQuiz`'s results.

- [ ] **Step 3: Commit**

```bash
git add convex/quizAttempts.ts
git commit -m "feat: add listByClass query to quizAttempts"
```

---

### Task 4: `useWeakSpots` hook

**Files:**
- Create: `hooks/useWeakSpots.ts`

**Interfaces:**
- Consumes: `api.quizAttempts.listByClass` (Task 3), `computeWeakSpots` (Task 1), `api.quizzes.list` (existing).
- Produces: `useWeakSpots(classId: string)` returning `{ weakSpots: WeakSpot[], loading: boolean }`. Consumed by Task 5.

- [ ] **Step 1: Write the hook**

```typescript
// hooks/useWeakSpots.ts
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
```

- [ ] **Step 2: Manual verification**

Temporarily log `useWeakSpots(classId).weakSpots` in any screen that has a real `classId` with at least 2 quiz attempts on the same quiz (take the same quiz twice via the app to generate this data), confirm the logged array matches expectations (worst quiz first, correct `trend`).

- [ ] **Step 3: Commit**

```bash
git add hooks/useWeakSpots.ts
git commit -m "feat: add useWeakSpots hook"
```

---

### Task 5: Render the Weak Spots section

**Files:**
- Modify: `app/(tabs)/(class)/study.tsx`

**Interfaces:**
- Consumes: `useWeakSpots` (Task 4).

- [ ] **Step 1: Wire the hook and render a section above the existing tab content**

```typescript
const { weakSpots } = useWeakSpots(classItem.id);
```

```tsx
{weakSpots.length > 0 && (
  <View style={[weakSpotStyles.container, { backgroundColor: C.surface, borderColor: C.border }]}>
    <Text style={[weakSpotStyles.heading, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>
      YOU KEEP MISSING
    </Text>
    {weakSpots.map((spot) => (
      <View key={spot.quizId} style={weakSpotStyles.row}>
        <Text style={[weakSpotStyles.title, { color: C.text }]} numberOfLines={1}>
          {spot.title}
        </Text>
        <Text style={[weakSpotStyles.detail, { color: C.textMuted }]}>
          {spot.latestWrongCount}/{spot.latestTotal} wrong last attempt
          {spot.trend === 'improving' ? ' ↑' : spot.trend === 'worsening' ? ' ↓' : ''}
        </Text>
      </View>
    ))}
  </View>
)}
```

```typescript
const weakSpotStyles = StyleSheet.create({
  container: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12, gap: 8 },
  heading: { fontSize: 10, letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, flex: 1, marginRight: 8 },
  detail: { fontSize: 12 },
});
```

Place this block just above the existing tab bar (`Guides · Flashcards · Quiz`) so it's visible regardless of which tab is active.

- [ ] **Step 2: Manual verification**

Run `skool`, take the same quiz twice with different scores (get some questions wrong both times), navigate back to the class screen, confirm the "YOU KEEP MISSING" section appears showing that quiz with the most recent wrong count and a trend arrow. Confirm the section doesn't render at all for a class with no quiz attempts yet (empty `weakSpots` array → nothing renders).

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/(class)/study.tsx"
git commit -m "feat: render weak-spots section on class screen"
```

---

## Self-Review

**Spec coverage:** Aggregation over existing `quizAttempts` data (Task 1) ✓. No new schema fields, only an index (Task 2) ✓. Surfaced on the class screen, not a new full screen (Task 5) ✓.

**Placeholder scan:** No TBD/TODO. All code blocks are complete and runnable as written.

**Type consistency:** `WeakSpot` shape from Task 1 matches exactly what `useWeakSpots` (Task 4) returns and what Task 5's JSX destructures (`title`, `latestWrongCount`, `latestTotal`, `trend`, `quizId`).

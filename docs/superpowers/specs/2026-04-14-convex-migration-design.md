# Convex Migration Design

## Goal

Replace AsyncStorage with Convex as the data layer for School Kompass. All app data becomes real-time and persistent in the cloud. No auth — single user.

## Architecture

**Drop-in replacement strategy.** The existing hook interface (`useClassesLocal`, `useStudyGuidesLocal`, `useFlashcardSetsLocal`, `useQuizzesLocal`) stays identical. Only the internals of `hooks/useDataFetch.ts` change — AsyncStorage calls swap for Convex `useQuery`/`useMutation`. No component or screen files need to change.

A new `convex/` directory holds the schema and all server-side functions. The app is wrapped in `ConvexProvider` in `app/_layout.tsx`.

## Tech Stack

- `convex` npm package
- `convex/react` for `useQuery`, `useMutation`
- Convex dashboard for the backend (run `npx convex dev` to set up)

## Schema

Four tables. All IDs are Convex `Id<"tableName">` on the server; components continue to use string IDs via `.toString()`.

### `classes`
```ts
{ name: string, description: string }
```

### `studyGuides`
```ts
{
  classId: Id<"classes">,
  title: string,
  text: string,
  audioFile: string | null,
  lastModified: string,
}
```

### `flashcardSets`
```ts
{
  classId: Id<"classes">,
  title: string | undefined,
  sourceText: string,
  cards: Array<{
    id: string,
    question: string,
    answers: string[],
    explanation: string,
    starred: boolean,
    hidden: boolean,
  }>,
  lastModified: string,
}
```

### `quizzes`
```ts
{
  classId: Id<"classes">,
  title: string,
  quizContent: Array<{ id: string, question: string, answer: string }>,
  lastModified: string,
}
```

`cards` and `quizContent` remain nested arrays — no separate tables needed.

## Convex Functions

Each table gets a dedicated file in `convex/`:

**`convex/classes.ts`**
- `list` query — returns all classes
- `add` mutation — inserts a class
- `remove` mutation — deletes by id
- `removeAll` mutation — deletes all classes

**`convex/studyGuides.ts`**
- `list` query — returns all guides for a classId
- `add` mutation
- `remove` mutation

**`convex/flashcardSets.ts`**
- `list` query — returns all sets for a classId
- `add` mutation
- `update` mutation — replaces entire set document (used for card star/hide/update)
- `remove` mutation
- `clear` mutation — deletes all sets for a classId

**`convex/quizzes.ts`**
- `list` query — returns all quizzes for a classId
- `add` mutation
- `remove` mutation

## Hook Replacements (`hooks/useDataFetch.ts`)

Each hook uses `useQuery` and `useMutation` from `convex/react`. The return shape is identical to the current AsyncStorage version:

```ts
// Before (AsyncStorage)
const { classes, loading, addClass, deleteClass } = useClassesLocal();

// After (Convex) — same call, same return shape
const { classes, loading, addClass, deleteClass } = useClassesLocal();
```

**ID handling:** Convex returns `_id` as a Convex `Id` object. Each hook maps results to plain objects with `id: doc._id.toString()` so the rest of the app never sees Convex types.

**Loading state:** `useQuery` returns `undefined` while loading. Hooks map `undefined` → `loading: true`, array → `loading: false`.

## Provider Setup (`app/_layout.tsx`)

Wrap the existing root layout in `ConvexProvider`:

```tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      {/* existing providers */}
    </ConvexProvider>
  );
}
```

`EXPO_PUBLIC_CONVEX_URL` is set in `.env.local` after running `npx convex dev`.

## File Changes

- **Create:** `convex/schema.ts`, `convex/classes.ts`, `convex/studyGuides.ts`, `convex/flashcardSets.ts`, `convex/quizzes.ts`
- **Modify:** `hooks/useDataFetch.ts` — replace all AsyncStorage logic with Convex hooks
- **Modify:** `app/_layout.tsx` — add ConvexProvider
- **Modify:** `.env.local` — add EXPO_PUBLIC_CONVEX_URL (created during `npx convex dev`)
- **No changes** to any screen or component files

## Error Handling

Convex mutations throw on failure. Each hook wraps mutations in try/catch and surfaces errors via the existing `error` state field, same as the AsyncStorage version.

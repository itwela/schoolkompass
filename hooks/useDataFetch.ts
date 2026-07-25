import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswers: string[];
  type: 'single' | 'multi';
  selectCount: number;
}

// ─── Types (unchanged — rest of app imports these) ────────────────────────────

interface Class {
  id: string;
  name: string;
  description: string;
}

interface WhisperTimestamp {
  start: number;
  end: number;
  text: string;
}

interface StudyGuide {
  id: string;
  title: string;
  text: string;
  audioFile?: string | null;
  timestamps?: WhisperTimestamp[];
  lastModified: string;
}

export interface SavedQuiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  lastModified: string;
}

interface Flashcard {
  id: string;
  question: string;
  answers: string[];
  explanation: string;
  starred: boolean;
  hidden: boolean;
}

interface FlashcardSet {
  id: string;
  title?: string;
  sourceText: string;
  cards: Flashcard[];
  lastModified: string;
}

// ─── useClassesLocal ──────────────────────────────────────────────────────────

export const useClassesLocal = () => {
  const rawClasses = useQuery(api.classes.list);
  const addMutation = useMutation(api.classes.add);
  const removeMutation = useMutation(api.classes.remove);
  const removeAllMutation = useMutation(api.classes.removeAll);
  const [error, setError] = useState<string | null>(null);

  const loading = rawClasses === undefined;

  const classes: Set<Class> = new Set(
    (rawClasses ?? []).map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
    }))
  );

  const addClass = async (newClass: Class) => {
    try {
      await addMutation({ name: newClass.name, description: newClass.description });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add class');
    }
  };

  const deleteClass = async (classId: string) => {
    try {
      const doc = rawClasses?.find((c) => c._id.toString() === classId);
      if (!doc) return;
      await removeMutation({ id: doc._id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class');
    }
  };

  const deleteAllClasses = async () => {
    try {
      await removeAllMutation({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete all classes');
    }
  };

  // fetchClasses is a no-op — Convex is reactive and auto-updates
  const fetchClasses = async () => {};

  return { classes, loading, error, fetchClasses, addClass, deleteAllClasses, deleteClass };
};

// ─── useStudyGuidesLocal ──────────────────────────────────────────────────────

export const useStudyGuidesLocal = (classId: string) => {
  const rawGuides = useQuery(api.studyGuides.list, classId ? { classId } : 'skip');
  const addMutation = useMutation(api.studyGuides.add);
  const renameMutation = useMutation(api.studyGuides.rename);
  const removeMutation = useMutation(api.studyGuides.remove);
  const [error, setError] = useState<string | null>(null);

  const loading = rawGuides === undefined;

  const studyGuides: StudyGuide[] = (rawGuides ?? []).map((doc) => ({
    id: doc._id.toString(),
    title: doc.title,
    text: doc.text,
    audioFile: doc.audioFile ?? undefined,
    lastModified: doc.lastModified,
  }));

  const addStudyGuide = async (newGuide: StudyGuide) => {
    try {
      await addMutation({
        classId,
        title: newGuide.title,
        text: newGuide.text,
        audioFile: newGuide.audioFile ?? null,
        lastModified: newGuide.lastModified,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add study guide');
    }
  };

  const renameStudyGuide = async (guideId: string, title: string) => {
    try {
      const doc = rawGuides?.find((g) => g._id.toString() === guideId);
      if (!doc) return;
      await renameMutation({ id: doc._id, title });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename study guide');
    }
  };

  const deleteStudyGuide = async (guideId: string) => {
    try {
      const doc = rawGuides?.find((g) => g._id.toString() === guideId);
      if (!doc) return;
      await removeMutation({ id: doc._id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete study guide');
    }
  };

  return { studyGuides, loading, error, addStudyGuide, renameStudyGuide, deleteStudyGuide };
};

// ─── useQuizzesLocal ──────────────────────────────────────────────────────────

export const useQuizzesLocal = (classId: string) => {
  const rawQuizzes = useQuery(api.quizzes.list, classId ? { classId } : 'skip');
  const addMutation = useMutation(api.quizzes.add);
  const renameMutation = useMutation(api.quizzes.rename);
  const removeMutation = useMutation(api.quizzes.remove);
  const [error, setError] = useState<string | null>(null);

  const loading = rawQuizzes === undefined;

  const quizzes: SavedQuiz[] = (rawQuizzes ?? []).map((doc) => ({
    id: doc._id.toString(),
    title: doc.title,
    questions: doc.questions.map((q: any): QuizQuestion => ({
      question: q.question,
      options: q.options,
      // Normalize old format (answer: string) → new format (correctAnswers: string[])
      correctAnswers: q.correctAnswers ?? (q.answer ? [q.answer] : []),
      type: q.type ?? 'single',
      selectCount: q.selectCount ?? 1,
    })),
    lastModified: doc.lastModified,
  }));

  const addQuiz = async (quiz: Omit<SavedQuiz, 'id'>): Promise<string | null> => {
    try {
      const id = await addMutation({
        classId,
        title: quiz.title,
        questions: quiz.questions,
        lastModified: quiz.lastModified,
      });
      return id.toString();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quiz');
      return null;
    }
  };

  const renameQuiz = async (quizId: string, title: string) => {
    try {
      const doc = rawQuizzes?.find((q) => q._id.toString() === quizId);
      if (!doc) return;
      await renameMutation({ id: doc._id, title });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename quiz');
    }
  };

  const deleteQuiz = async (quizId: string) => {
    try {
      const doc = rawQuizzes?.find((q) => q._id.toString() === quizId);
      if (!doc) return;
      await removeMutation({ id: doc._id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete quiz');
    }
  };

  return { quizzes, loading, error, addQuiz, renameQuiz, deleteQuiz };
};

// ─── useFlashcardSetsLocal ────────────────────────────────────────────────────

export const useFlashcardSetsLocal = (classId: string) => {
  const rawSets = useQuery(api.flashcardSets.list, classId ? { classId } : 'skip');
  const addMutation = useMutation(api.flashcardSets.add);
  const updateMutation = useMutation(api.flashcardSets.update);
  const renameMutation = useMutation(api.flashcardSets.rename);
  const removeMutation = useMutation(api.flashcardSets.remove);
  const clearMutation = useMutation(api.flashcardSets.clear);
  const [error, setError] = useState<string | null>(null);

  const loading = rawSets === undefined;

  const flashcardSets: FlashcardSet[] = (rawSets ?? []).map((doc) => ({
    id: doc._id.toString(),
    title: doc.title,
    sourceText: doc.sourceText,
    cards: doc.cards,
    lastModified: doc.lastModified,
  }));

  const addFlashcardSet = async (newSet: FlashcardSet) => {
    try {
      await addMutation({
        classId,
        title: newSet.title,
        sourceText: newSet.sourceText,
        cards: newSet.cards,
        lastModified: newSet.lastModified,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add flashcard set');
    }
  };

  const updateFlashcardSet = async (updatedSet: FlashcardSet) => {
    try {
      const doc = rawSets?.find((s) => s._id.toString() === updatedSet.id);
      if (!doc) return;
      await updateMutation({
        id: doc._id,
        title: updatedSet.title,
        sourceText: updatedSet.sourceText,
        cards: updatedSet.cards,
        lastModified: updatedSet.lastModified,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update flashcard set');
    }
  };

  const renameFlashcardSet = async (setId: string, title: string) => {
    try {
      const doc = rawSets?.find((s) => s._id.toString() === setId);
      if (!doc) return;
      await renameMutation({ id: doc._id, title });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename flashcard set');
    }
  };

  const deleteFlashcardSet = async (setId: string) => {
    try {
      const doc = rawSets?.find((s) => s._id.toString() === setId);
      if (!doc) return;
      await removeMutation({ id: doc._id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete flashcard set');
    }
  };

  const clearFlashcardSets = async () => {
    try {
      await clearMutation({ classId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear flashcard sets');
    }
  };

  return {
    flashcardSets,
    loading,
    error,
    addFlashcardSet,
    updateFlashcardSet,
    renameFlashcardSet,
    deleteFlashcardSet,
    clearFlashcardSets,
  };
};

// ─── useQuizAttemptsLocal ─────────────────────────────────────────────────────

export interface QuizAttempt {
  id: string;
  quizId: string;
  classId: string;
  score: number;
  total: number;
  wrongCount: number;
  timeSeconds: number;
  takenAt: string;
}

export const useQuizAttemptsLocal = (quizId: string) => {
  const rawAttempts = useQuery(
    api.quizAttempts.listByQuiz,
    quizId ? { quizId } : 'skip'
  );
  const addMutation = useMutation(api.quizAttempts.add);
  const [error, setError] = useState<string | null>(null);

  const loading = rawAttempts === undefined;

  const attempts: QuizAttempt[] = (rawAttempts ?? []).map((doc) => ({
    id: doc._id.toString(),
    quizId: doc.quizId,
    classId: doc.classId,
    score: doc.score,
    total: doc.total,
    wrongCount: doc.wrongCount,
    timeSeconds: doc.timeSeconds,
    takenAt: doc.takenAt,
  }));

  const bestScore = attempts.length > 0
    ? Math.max(...attempts.map((a) => a.score))
    : null;

  const addAttempt = async (attempt: Omit<QuizAttempt, 'id'>) => {
    try {
      await addMutation(attempt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attempt');
    }
  };

  return { attempts, bestScore, loading, error, addAttempt };
};

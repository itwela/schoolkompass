import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

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

interface Quiz {
  id: string;
  question: string;
  answer: string;
}

interface Quizzes {
  id: string;
  title: string;
  quizContent: Quiz[];
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

  const deleteStudyGuide = async (guideId: string) => {
    try {
      const doc = rawGuides?.find((g) => g._id.toString() === guideId);
      if (!doc) return;
      await removeMutation({ id: doc._id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete study guide');
    }
  };

  return { studyGuides, loading, error, addStudyGuide, deleteStudyGuide };
};

// ─── useQuizzesLocal ──────────────────────────────────────────────────────────

export const useQuizzesLocal = (classId: string) => {
  const rawQuizzes = useQuery(api.quizzes.list, classId ? { classId } : 'skip');
  const addMutation = useMutation(api.quizzes.add);
  const removeMutation = useMutation(api.quizzes.remove);
  const [error, setError] = useState<string | null>(null);

  const loading = rawQuizzes === undefined;

  const quizzes: Quizzes[] = (rawQuizzes ?? []).map((doc) => ({
    id: doc._id.toString(),
    title: doc.title,
    quizContent: doc.quizContent,
    lastModified: doc.lastModified,
  }));

  const addQuiz = async (newQuiz: Quizzes) => {
    try {
      await addMutation({
        classId,
        title: newQuiz.title,
        quizContent: newQuiz.quizContent,
        lastModified: newQuiz.lastModified,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add quiz');
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

  return { quizzes, loading, error, addQuiz, deleteQuiz };
};

// ─── useFlashcardSetsLocal ────────────────────────────────────────────────────

export const useFlashcardSetsLocal = (classId: string) => {
  const rawSets = useQuery(api.flashcardSets.list, classId ? { classId } : 'skip');
  const addMutation = useMutation(api.flashcardSets.add);
  const updateMutation = useMutation(api.flashcardSets.update);
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
    deleteFlashcardSet,
    clearFlashcardSets,
  };
};

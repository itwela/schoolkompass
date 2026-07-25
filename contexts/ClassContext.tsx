import { useClassesLocal } from '@/hooks/useDataFetch';
import type { QuizQuestion } from '@/hooks/useDataFetch';
import { router } from 'expo-router';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Class = {
  id: string;
  name: string;
  description: string;
};

interface WhisperTimestamp {
  start: number;
  end: number;
  text: string;
  makeNoteOfThis?: boolean;
}

type StudyGuide = {
  id: string;
  title: string;
  text: string;
  timestamps?: WhisperTimestamp[] | any;
  audioFile: any;
  lastModified: string;
};

export type SavedQuizToLoad = {
  id: string;
  title: string;
  questions: QuizQuestion[];
};

type ClassContextType = {
  classes: Class[];
  classesLoading: boolean;
  classesError: any;
  fetchClasses: () => Promise<void>;
  addClass: (newClass: Class) => Promise<void>;
  deleteClass: (classId: string) => Promise<void>;
  deleteAllClasses: () => Promise<void>;

  selectedClassId: string | null;
  setSelectedClassId: (id: string | null) => void;

  studyGuides: StudyGuide[];
  setStudyGuides: (guides: StudyGuide[]) => void;
  currentStudyGuide: StudyGuide | null;
  setCurrentStudyGuide: (guide: StudyGuide | null) => void;
  currentClassName: string | null;
  setCurrentClassName: (name: string | null) => void;
  currentFlashcardSetId: string | null;
  setCurrentFlashcardSetId: (id: string | null) => void;

  savedQuizToLoad: SavedQuizToLoad | null;
  setSavedQuizToLoad: (quiz: SavedQuizToLoad | null) => void;

  markedSegments: any;
  setMarkedSegments: (segments: any) => void;
};

const ClassContext = createContext<ClassContextType | undefined>(undefined);

export function ClassProvider({ children }: { children: ReactNode }) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [studyGuides, setStudyGuides] = useState<StudyGuide[]>([]);
  const [currentStudyGuide, setCurrentStudyGuide] = useState<StudyGuide | null>(null);
  const [currentClassName, setCurrentClassName] = useState<string | null>(null);
  const [currentFlashcardSetId, setCurrentFlashcardSetId] = useState<string | null>(null);
  const [savedQuizToLoad, setSavedQuizToLoad] = useState<SavedQuizToLoad | null>(null);
  const { classes = [] as Class[], loading: classesLoading, error: classesError, fetchClasses, addClass, deleteClass, deleteAllClasses } = useClassesLocal()
  const classArray = Array.isArray(classes) ? classes : Array.from(classes as Set<Class>);
  const [markedSegments, setMarkedSegments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selectedClassId !== null) {
      router.push('/(tabs)/(class)/study')
    }
  }, [selectedClassId])

  return (
    <ClassContext.Provider
      value={{
        classes: classArray,
        classesLoading,
        classesError,
        fetchClasses,
        addClass,
        deleteClass,
        deleteAllClasses,
        selectedClassId,
        setSelectedClassId,
        studyGuides,
        setStudyGuides,
        currentStudyGuide,
        setCurrentStudyGuide,
        currentClassName,
        setCurrentClassName,
        currentFlashcardSetId,
        setCurrentFlashcardSetId,
        savedQuizToLoad,
        setSavedQuizToLoad,
        markedSegments,
        setMarkedSegments,
      }}>
      {children}
    </ClassContext.Provider>
  );
}

export function useClass() {
  const context = useContext(ClassContext);
  if (context === undefined) {
    throw new Error('useClass must be used within a ClassProvider');
  }
  return context;
}

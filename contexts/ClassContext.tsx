import { useClassesLocal } from '@/hooks/useDataFetch';
import { router } from 'expo-router';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Class = {
  id: string;
  name: string;
  description: string;
  // Add other class properties as needed
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
  text: string; // markdown content
  timestamps?: WhisperTimestamp[] | any;
  audioFile: any;
  lastModified: string;
};

interface Quiz {
  id: string;
  question: string;
  answer: string;
}
interface Quizzes {
  id: string;
  title: string;
  quizContent: Quiz[];
}

type ClassContextType = {
  classes: Class[];  // Changed from any[] to Class[]
  classesLoading: boolean;
  classesError: any;

  selectedClassId: string | null;
  setSelectedClassId: (id: string | null) => void;

  studyGuides: StudyGuide[];
  setStudyGuides: (guides: StudyGuide[]) => void;
  currentStudyGuide: StudyGuide | null;
  setCurrentStudyGuide: (guide: StudyGuide | null) => void;
  currentQuiz: Quizzes | null;
  setCurrentQuiz: (quiz: Quizzes | null) => void;
  currentClassName: string | null;
  setCurrentClassName: (name: string | null) => void;

  markedSegments: any;
  setMarkedSegments: (segments: any) => void;
};

export const mockStudyGuides = {
  '1': [
    { id: '1', title: 'Limits and Continuity', text: '# Limits and Continuity\n\n## Introduction\n- Basic concept of limits\n- Continuity of functions\n- Applications in calculus\n\n## Key Topics\n1. Epsilon-delta definition\n2. One-sided limits\n3. Infinite limits\n\n## Practice Problems\n* Find the limit as x approaches 2\n* Determine continuity at x = 0', audioFile: 'limits_lecture.mp3', timestamps: ['0:00', '15:30', '32:45'], lastModified: '2024-01-15' },
    { id: '2', title: 'Derivatives', text: '# Derivatives\n\n## Fundamental Rules\n1. Power Rule\n2. Product Rule\n3. Quotient Rule\n4. Chain Rule\n\n## Applications\n* Rate of change\n* Optimization\n* Related rates', audioFile: 'derivatives_lecture.mp3', timestamps: ['0:00', '20:15', '45:30'], lastModified: '2024-01-20' },
    { id: '3', title: 'Integration', text: '# Integration Techniques\n\n## Basic Methods\n1. Substitution\n2. Integration by Parts\n3. Partial Fractions\n\n## Applications\n* Area calculations\n* Volume calculations\n* Arc length', audioFile: 'integration_lecture.mp3', timestamps: ['0:00', '25:00', '50:00'], lastModified: '2024-01-25' },
  ],
  '2': [
    { id: '1', title: 'Newton\'s Laws', text: 'Comprehensive overview of Newton\'s three laws of motion. Includes force diagrams, friction, and practical applications in everyday scenarios.', audioFile: 'newton_laws_lecture.mp3', lastModified: '2024-01-10' },
    { id: '2', title: 'Energy and Work', text: 'Exploration of work, kinetic energy, potential energy, and conservation of energy. Includes problem-solving strategies and real-world examples.', audioFile: 'energy_work_lecture.mp3', lastModified: '2024-01-18' },
  ],
  '3': [
    { id: '1', title: 'Arrays and Lists', text: 'Introduction to array data structures and list implementations. Covers sorting algorithms, searching techniques, and time complexity analysis.', audioFile: 'arrays_lists_lecture.mp3', lastModified: '2024-01-12' },
    { id: '2', title: 'Trees and Graphs', text: 'Advanced data structures including binary trees, AVL trees, and graph representations. Discussion of traversal algorithms and common applications.', audioFile: 'trees_graphs_lecture.mp3', lastModified: '2024-01-22' },
  ],
};

const ClassContext = createContext<ClassContextType | undefined>(undefined);

export function ClassProvider({ children }: { children: ReactNode }) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [studyGuides, setStudyGuides] = useState<StudyGuide[]>([]);
  const [currentStudyGuide, setCurrentStudyGuide] = useState<StudyGuide | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<Quizzes | null>(null);
  const [currentClassName, setCurrentClassName] = useState<string | null>(null);
  const { classes = [] as Class[], loading: classesLoading, error: classesError } = useClassesLocal()
  const classArray = Array.isArray(classes) ? classes : Array.from(classes as Set<Class>);
  const [markedSegments, setMarkedSegments] = useState<Set<string>>(new Set());

  useEffect(() => {

    if (selectedClassId !== null) {
        setStudyGuides(mockStudyGuides[selectedClassId as keyof typeof mockStudyGuides])
        router.push('/(tabs)/(class)/study')
    }

  }, [selectedClassId])


  return (
    <ClassContext.Provider
      value={{
        classes: classArray,
        classesLoading,
        classesError,
        selectedClassId,
        setSelectedClassId,
        studyGuides,
        setStudyGuides,
        currentStudyGuide,
        setCurrentStudyGuide,
        currentQuiz,
        setCurrentQuiz,
        currentClassName,
        setCurrentClassName,
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
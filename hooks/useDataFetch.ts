import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

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

interface Quiz {
  id: string;
  question: string;
  answer: string;
}

interface StudyGuide {
  id: string;
  title: string;
  text: string;
  audioFile?: string;
  timestamps?: WhisperTimestamp[];
  lastModified: string;
}
interface Quizzes {
  id: string;
  title: string;
  quizContent: Quiz[];
  lastModified: string;
}

export const useClassesLocal = () => {
  const [classes, setClasses] = useState<Set<Class>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = async () => {
    try {
      const storedClasses = await AsyncStorage.getItem('classes');
      let classesToSet: Class[];
      if (storedClasses) {
        classesToSet = JSON.parse(storedClasses);
        if (classesToSet.length === 0) {
          classesToSet = [
            { id: '0', name: 'Add Your Classes!', description: 'Press the blue button above to get started.' },
          ];
          await AsyncStorage.setItem('classes', JSON.stringify(classesToSet));
        }
      } else {
        classesToSet = [
          { id: '0', name: 'Add Your Classes!', description: 'Press the blue button above to get started.' },
        ];
        await AsyncStorage.setItem('classes', JSON.stringify(classesToSet));
      }
      setClasses(new Set(classesToSet));
      console.log("set classes...", classesToSet)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const addClass = async (newClass: Class) => {
    try {
      const updatedClassesSet = new Set(classes);
      // Only add if a class with the same ID doesn't exist
      if (!Array.from(classes).some(cls => cls.id === newClass.id)) {
        updatedClassesSet.add(newClass);
        const classesArray = Array.from(updatedClassesSet);
        await AsyncStorage.setItem('classes', JSON.stringify(classesArray));
        setClasses(updatedClassesSet);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add class');
    }
  };

  const deleteAllClasses = async () => {
    try {
      await AsyncStorage.removeItem('classes');
      await AsyncStorage.removeItem('studyGuides');
      setClasses(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete all classes');
    }
  };

  const deleteClass = async (classId: string) => {
    try {
      const updatedClassesSet = new Set(
        Array.from(classes).filter(cls => cls.id !== classId)
      );
      const classesArray = Array.from(updatedClassesSet);
      await AsyncStorage.setItem('classes', JSON.stringify(classesArray));
      
      // Delete associated study guides
      const studyGuides = await AsyncStorage.getItem('studyGuides');
      if (studyGuides) {
        const guidesObj = JSON.parse(studyGuides);
        delete guidesObj[classId];
        await AsyncStorage.setItem('studyGuides', JSON.stringify(guidesObj));
      }
      
      setClasses(updatedClassesSet);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class');
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  return { classes, loading, error, fetchClasses, addClass, deleteAllClasses, deleteClass };
};

export const useStudyGuidesLocal = (classId: string) => {
  const [studyGuides, setStudyGuides] = useState<StudyGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudyGuides = async () => {
    try {
      const storedGuides = await AsyncStorage.getItem('studyGuides');
      let guidesToSet;
      if (storedGuides) {
        const guidesObj = JSON.parse(storedGuides);
        guidesToSet = guidesObj[classId] || [];
        if (guidesToSet.length === 0 && studyGuides[classId as keyof typeof studyGuides]) {
          guidesToSet = studyGuides[classId as keyof typeof studyGuides];
          const updatedGuidesObj = { ...guidesObj, [classId]: guidesToSet };
          await AsyncStorage.setItem('studyGuides', JSON.stringify(updatedGuidesObj));
        }
      } else {
        guidesToSet = studyGuides[classId as keyof typeof studyGuides] || [];
        await AsyncStorage.setItem('studyGuides', JSON.stringify({ [classId]: guidesToSet }));
      }
      setStudyGuides(guidesToSet);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch study guides');
    } finally {
      setLoading(false);
    }
  };

  const addStudyGuide = async (newGuide: StudyGuide) => {
    try {
      const storedGuides = await AsyncStorage.getItem('studyGuides');
      const guidesObj = storedGuides ? JSON.parse(storedGuides) : {};
      const classGuides = guidesObj[classId] || [];
      guidesObj[classId] = [...classGuides, newGuide];
      await AsyncStorage.setItem('studyGuides', JSON.stringify(guidesObj));
      setStudyGuides(guidesObj[classId]);

      console.log("guidesObj", guidesObj[classId])
      console.log('success')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add study guide');
    }
  };

  const deleteStudyGuide = async (guideId: string) => {
    try {
      const storedGuides = await AsyncStorage.getItem('studyGuides');
      if (storedGuides) {
        const guidesObj = JSON.parse(storedGuides);
        guidesObj[classId] = guidesObj[classId].filter(
          (guide: StudyGuide) => guide.id !== guideId
        );
        await AsyncStorage.setItem('studyGuides', JSON.stringify(guidesObj));
        setStudyGuides(guidesObj[classId]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete study guide');
    }
  };

  useEffect(() => {
    fetchStudyGuides();
  }, [classId]);

  return { studyGuides, loading, error, addStudyGuide, deleteStudyGuide };
};

export const useQuizzesLocal = (classId: string) => {
  const [quizzes, setQuizzes] = useState<Quizzes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizzes = async () => {
    try {
      const storedQuizzes = await AsyncStorage.getItem('quizzes');
      let quizzesToSet;
      if (storedQuizzes) {
        const quizzesObj = JSON.parse(storedQuizzes);
        quizzesToSet = quizzesObj[classId] || [];
        if (quizzesToSet.length === 0 && quizzes[classId as keyof typeof quizzes]) {
          quizzesToSet = quizzes[classId as keyof typeof quizzes];
          const updatedQuizzesObj = { ...quizzesObj, [classId]: quizzesToSet };
          await AsyncStorage.setItem('quizzes', JSON.stringify(updatedQuizzesObj));
        }
      } else {
        quizzesToSet = quizzes[classId as keyof typeof quizzes] || [];
        await AsyncStorage.setItem('quizzes', JSON.stringify({ [classId]: quizzesToSet }));
      }
      setQuizzes(quizzesToSet);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  };

  const addQuiz = async (newQuiz: StudyGuide) => {
    try {
      const storedQuizzes = await AsyncStorage.getItem('quizzes');
      const quizObj = storedQuizzes ? JSON.parse(storedQuizzes) : {};
      const quizGuides = quizObj[classId] || [];
      quizObj[classId] = [...quizGuides, newQuiz];
      await AsyncStorage.setItem('quizzes', JSON.stringify(quizObj));
      setQuizzes(quizObj[classId]);

      console.log("quizObj", quizObj[classId])
      console.log('success')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add quiz');
    }
  };

  const deleteQuiz = async (quizId: string) => {
    try {
      const storedQuizzes = await AsyncStorage.getItem('quizzes');
      if (storedQuizzes) {
        const quizObj = JSON.parse(storedQuizzes);
        quizObj[classId] = quizObj[classId].filter(
          (guide: StudyGuide) => guide.id !== quizObj
        );
        await AsyncStorage.setItem('quizzes', JSON.stringify(quizObj));
        setQuizzes(quizObj[classId]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete quiz');
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [classId]);

  return { quizzes, loading, error, addQuiz, deleteQuiz };
};
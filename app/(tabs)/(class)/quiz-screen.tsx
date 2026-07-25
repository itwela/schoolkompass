// app/(tabs)/(class)/quiz-screen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useClass } from '@/contexts/ClassContext';
import { useTheme } from '@/contexts/ThemeContext';
import { openRouterChat } from '@/constants/clients/openrouterClient';
import { useQuizzesLocal, useQuizAttemptsLocal } from '@/hooks/useDataFetch';
import type { QuizQuestion } from '@/hooks/useDataFetch';

const QUIZ_MODEL = 'google/gemini-2.0-flash-lite-001';

type QuizState = 'loading' | 'question' | 'score';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function generateQuestions(
  sourceText: string,
  mode: 'guide' | 'text'
): Promise<{ title: string | null; questions: QuizQuestion[] }> {
  const isText = mode === 'text';
  const raw = await openRouterChat({
    model: QUIZ_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a quiz generator. Return a raw JSON object — no markdown, no explanation.

Format:
{
  "title": ${isText ? '"3–6 word descriptive title based on the material"' : 'null'},
  "questions": [
    {
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswers": ["A. ..."],
      "type": "single",
      "selectCount": 1
    }
  ]
}

Rules:
- "type" is "single" if one answer correct, "multi" if more than one
- "selectCount" equals the length of "correctAnswers"
- "correctAnswers" values must match option strings exactly
- For multi questions include "(Select N)" in the question text
- Always provide exactly 4 options labeled A, B, C, D
${isText
  ? '- Generate ONE question per distinct concept or item — if the material has 13 items, generate 13 questions. Do NOT cap at 10.'
  : '- Generate exactly 10 questions covering the key concepts.'}`,
      },
      {
        role: 'user',
        content: `Generate questions from this material:\n\n${sourceText}`,
      },
    ],
    temperature: 0.4,
    maxTokens: isText ? 8000 : 4000,
  });

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in response');
  const parsed = JSON.parse(match[0]);
  return { title: parsed.title ?? null, questions: parsed.questions as QuizQuestion[] };
}

export default function QuizScreen() {
  const { theme } = useTheme();
  const C = Colors[theme];
  const { currentStudyGuide, savedQuizToLoad, setSavedQuizToLoad, selectedClassId } = useClass();
  const { addQuiz } = useQuizzesLocal(selectedClassId ?? '');
  const accentColor = C.accentGreen;

  const isTextMode = !savedQuizToLoad && (currentStudyGuide?.id.startsWith('text-') ?? false);

  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [resolvedTitle, setResolvedTitle] = useState(savedQuizToLoad?.title ?? currentStudyGuide?.title ?? '');
  const [currentQuizId, setCurrentQuizId] = useState<string>(savedQuizToLoad?.id ?? '');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number>(0);
  const scoreRevealAnim = useRef(new Animated.Value(0)).current;

  const { attempts, bestScore, addAttempt } = useQuizAttemptsLocal(currentQuizId);

  useEffect(() => {
    if (savedQuizToLoad) {
      setQuestions(savedQuizToLoad.questions);
      setQuizState('question');
      startTimeRef.current = Date.now();
      return;
    }
    if (!currentStudyGuide) return;
    const mode = isTextMode ? 'text' : 'guide';
    generateQuestions(currentStudyGuide.text, mode)
      .then(async ({ title, questions: qs }) => {
        setQuestions(qs);
        setQuizState('question');
        startTimeRef.current = Date.now();
        const finalTitle = title ?? currentStudyGuide.title;
        setResolvedTitle(finalTitle);
        const savedId = await addQuiz({
          title: finalTitle,
          questions: qs,
          lastModified: new Date().toISOString(),
        });
        if (savedId) setCurrentQuizId(savedId);
      })
      .catch((e) => {
        setError(e.message ?? 'Failed to generate quiz');
        setQuizState('question');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save attempt when quiz finishes
  useEffect(() => {
    if (quizState !== 'score' || !currentQuizId) return;
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setElapsedSeconds(elapsed);
    const finalScore = results.filter(Boolean).length;
    addAttempt({
      quizId: currentQuizId,
      classId: selectedClassId ?? '',
      score: finalScore,
      total: questions.length,
      wrongCount: questions.length - finalScore,
      timeSeconds: elapsed,
      takenAt: new Date().toISOString(),
    });
  }, [quizState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Score-reveal animation
  useEffect(() => {
    if (quizState === 'score') {
      scoreRevealAnim.setValue(0);
      Animated.spring(scoreRevealAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
    }
  }, [quizState]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentQuestion = questions[currentIndex];

  const handleSelect = (option: string) => {
    if (revealed) return;
    if (currentQuestion.type === 'single') {
      setSelectedOptions([option]);
      const correct = currentQuestion.correctAnswers.includes(option);
      setResults((prev) => [...prev, correct]);
      setRevealed(true);
    } else {
      setSelectedOptions((prev) =>
        prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
      );
    }
  };

  const handleSubmitMulti = () => {
    if (revealed) return;
    const correct =
      selectedOptions.length === currentQuestion.correctAnswers.length &&
      currentQuestion.correctAnswers.every((a) => selectedOptions.includes(a));
    setResults((prev) => [...prev, correct]);
    setRevealed(true);
  };

  const handleNext = () => {
    if (!revealed) return;
    setSelectedOptions([]);
    setRevealed(false);
    if (currentIndex + 1 >= questions.length) {
      setQuizState('score');
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedOptions([]);
    setRevealed(false);
    setResults([]);
    startTimeRef.current = Date.now();
    setQuizState('question');
  };

  const handleBack = () => {
    setSavedQuizToLoad(null);
    router.back();
  };

  const score = results.filter(Boolean).length;
  const canSubmitMulti =
    currentQuestion?.type === 'multi' &&
    selectedOptions.length === currentQuestion.selectCount;

  // Score screen derived values
  const isNewBest = quizState === 'score' && (bestScore === null || score > bestScore);
  // bestScore from hook reflects previous attempts (before this one is saved), so compare correctly
  const displayBest = isNewBest ? score : (bestScore ?? score);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <Pressable onPress={handleBack} hitSlop={12}>
          <Text style={[styles.backArrow, { color: accentColor }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>
          Quiz — {resolvedTitle}
        </Text>
      </View>

      {/* Loading */}
      {quizState === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={[styles.loadingText, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>
            GENERATING QUESTIONS...
          </Text>
        </View>
      )}

      {/* Error */}
      {quizState === 'question' && error && (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: C.error }]}>{error}</Text>
          <Pressable onPress={() => router.back()} style={[styles.btn, { backgroundColor: accentColor, marginTop: 20 }]}>
            <Text style={[styles.btnText, { color: C.buttonText }]}>Go Back</Text>
          </Pressable>
        </View>
      )}

      {/* Question */}
      {quizState === 'question' && !error && questions.length > 0 && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Progress */}
          <View style={styles.progressRow}>
            <Text style={[styles.progressText, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>
              {currentIndex + 1} / {questions.length}
            </Text>
            <View style={styles.progressBarWrap}>
              <ProgressBar progress={(currentIndex + 1) / questions.length} accentColor={accentColor} />
            </View>
          </View>

          {/* Multi-select hint */}
          {currentQuestion.type === 'multi' && (
            <View style={[styles.multiHintRow, { backgroundColor: accentColor + '18', borderColor: accentColor + '40' }]}>
              <Text style={[styles.multiHintText, { color: accentColor, fontFamily: 'SpaceMono' }]}>
                SELECT {currentQuestion.selectCount} · {selectedOptions.length}/{currentQuestion.selectCount} CHOSEN
              </Text>
            </View>
          )}

          {/* Question text */}
          <Text style={[styles.questionText, { color: C.text }]}>
            {currentQuestion.question}
          </Text>

          {/* Options */}
          <View style={styles.options}>
            {currentQuestion.options.map((option) => {
              const isSelected = selectedOptions.includes(option);
              const isCorrect = currentQuestion.correctAnswers.includes(option);
              const showCorrect = revealed && isCorrect;
              const showWrong = revealed && isSelected && !isCorrect;
              const borderColor = showCorrect ? C.success : showWrong ? C.error : isSelected ? accentColor : C.border;
              const textColor = showCorrect ? C.success : showWrong ? C.error : isSelected ? accentColor : C.text;
              const bgColor = showCorrect ? `${C.success}18` : showWrong ? `${C.error}18` : isSelected ? accentColor + '18' : C.surface;

              return (
                <Pressable
                  key={option}
                  onPress={() => handleSelect(option)}
                  style={[styles.optionCard, { backgroundColor: bgColor, borderColor }]}
                >
                  {currentQuestion.type === 'multi' && !revealed && (
                    <View style={[styles.checkbox, { borderColor: isSelected ? accentColor : C.border, backgroundColor: isSelected ? accentColor : 'transparent' }]}>
                      {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
                    </View>
                  )}
                  <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
                  {showCorrect && <Text style={styles.optionBadge}>✓</Text>}
                  {showWrong && <Text style={styles.optionBadge}>✗</Text>}
                </Pressable>
              );
            })}
          </View>

          {/* Submit button for multi (before reveal) */}
          {currentQuestion.type === 'multi' && !revealed && (
            <Pressable
              onPress={handleSubmitMulti}
              disabled={!canSubmitMulti}
              style={[styles.btn, { backgroundColor: accentColor, opacity: canSubmitMulti ? 1 : 0.35, marginTop: 8 }]}
            >
              <Text style={[styles.btnText, { color: C.buttonText }]}>
                Submit ({selectedOptions.length}/{currentQuestion.selectCount} selected)
              </Text>
            </Pressable>
          )}

          {/* Next button (after reveal) */}
          {revealed && (
            <Pressable
              onPress={handleNext}
              style={[styles.btn, { backgroundColor: accentColor, marginTop: 8 }]}
            >
              <Text style={[styles.btnText, { color: C.buttonText }]}>
                {currentIndex + 1 === questions.length ? 'Finish' : 'Next'}
              </Text>
            </Pressable>
          )}

          {currentQuestion.type === 'single' && !revealed && (
            <Pressable
              disabled
              style={[styles.btn, { backgroundColor: accentColor, opacity: 0.35, marginTop: 8 }]}
            >
              <Text style={[styles.btnText, { color: C.buttonText }]}>Next</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Score screen */}
      {quizState === 'score' && (
        <ScrollView contentContainerStyle={styles.scoreContainer}>
          {/* Score */}
          <Animated.View
            style={{
              opacity: scoreRevealAnim,
              transform: [{ scale: scoreRevealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
            }}
          >
            <Text style={[styles.scoreBig, { color: accentColor }]}>
              {score} / {questions.length}
            </Text>
            <Text style={[styles.scoreLabel, { color: C.text, fontFamily: 'JetBrainsMono_400Regular' }]}>
              {score === questions.length
                ? 'PERFECT ⚡'
                : score >= questions.length * 0.7
                ? 'NICE WORK'
                : 'KEEP STUDYING'}
            </Text>
          </Animated.View>

          {/* Stats row */}
          <View style={[styles.statsRow, { borderColor: C.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.text }]}>{formatTime(elapsedSeconds)}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>TIME</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: C.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.error }]}>{questions.length - score}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>WRONG</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: C.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: isNewBest ? accentColor : C.text }]}>
                {displayBest}/{questions.length}
              </Text>
              <Text style={[styles.statLabel, { color: isNewBest ? accentColor : C.textMuted, fontFamily: 'SpaceMono' }]}>
                {isNewBest ? 'NEW BEST' : 'BEST'}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: C.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.text }]}>{attempts.length + 1}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>ATTEMPTS</Text>
            </View>
          </View>

          {/* Breakdown */}
          <View style={styles.breakdown}>
            {questions.map((q, i) => (
              <View key={i} style={[styles.breakdownRow, { borderBottomColor: C.border }]}>
                <Text style={{ fontSize: 14, marginRight: 8 }}>{results[i] ? '✅' : '❌'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.breakdownQ, { color: C.text }]} numberOfLines={2}>
                    {q.question}
                  </Text>
                  {q.type === 'multi' && (
                    <Text style={[styles.breakdownMeta, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>
                      MULTI · SELECT {q.selectCount}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          <Pressable onPress={handleRetry} style={[styles.btn, { backgroundColor: accentColor, marginTop: 16 }]}>
            <Text style={[styles.btnText, { color: C.buttonText }]}>Try Again</Text>
          </Pressable>
          <Pressable onPress={handleBack} style={[styles.btn, { backgroundColor: C.fadedGrey, marginTop: 8, marginBottom: 32 }]}>
            <Text style={[styles.btnText, { color: C.text }]}>Back to Class</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  backArrow: { fontSize: 28, lineHeight: 32 },
  headerTitle: { fontSize: 16, fontWeight: '500', flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 16, fontSize: 11, letterSpacing: 1 },
  errorText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  progressText: { fontSize: 10, letterSpacing: 0.5, minWidth: 40 },
  progressBarWrap: { flex: 1 },
  multiHintRow: { borderWidth: 1, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12, marginBottom: 14, alignSelf: 'flex-start' },
  multiHintText: { fontSize: 9, letterSpacing: 1 },
  questionText: { fontSize: 20, lineHeight: 30, fontWeight: '500', marginBottom: 24 },
  options: { gap: 10, marginBottom: 8 },
  optionCard: { borderWidth: 1, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionText: { fontSize: 15, lineHeight: 22, flex: 1 },
  optionBadge: { fontSize: 16 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkboxTick: { fontSize: 12, color: '#fff', fontWeight: '700' },
  btn: { borderRadius: 12, padding: 16, alignItems: 'center', width: '100%', marginTop: 8 },
  btnText: { fontSize: 16, fontWeight: '600' },
  // Score screen
  scoreContainer: { padding: 24, alignItems: 'center' },
  scoreBig: { fontSize: 56, fontWeight: '700', letterSpacing: -2, marginTop: 16 },
  scoreLabel: { fontSize: 12, letterSpacing: 1.5, marginTop: 8, marginBottom: 20 },
  statsRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, width: '100%', marginBottom: 20, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 8, letterSpacing: 0.8, marginTop: 3 },
  statDivider: { width: 1 },
  breakdown: { width: '100%' },
  breakdownRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1 },
  breakdownQ: { fontSize: 13, lineHeight: 18 },
  breakdownMeta: { fontSize: 9, letterSpacing: 0.5, marginTop: 3 },
});

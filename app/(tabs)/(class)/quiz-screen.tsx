// app/(tabs)/(class)/quiz-screen.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useClass } from '@/contexts/ClassContext';
import { useTheme } from '@/contexts/ThemeContext';
import { openRouterChat } from '@/constants/clients/openrouterClient';

const QUIZ_MODEL = 'arcee-ai/trinity-large-preview:free';

type QuizQuestion = {
  question: string;
  options: [string, string, string, string];
  answer: string;
};

type QuizState = 'loading' | 'question' | 'score';

function extractJson(raw: string): QuizQuestion[] {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array found in response');
  return JSON.parse(match[0]);
}

async function generateQuestions(guideText: string): Promise<QuizQuestion[]> {
  const raw = await openRouterChat({
    model: QUIZ_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a quiz generator. Given study guide text, return exactly 10 multiple-choice questions as a raw JSON array. No markdown, no explanation — only the JSON array. Format: [{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A. ..."}]',
      },
      {
        role: 'user',
        content: `Generate 10 multiple-choice questions from this study guide:\n\n${guideText}`,
      },
    ],
    temperature: 0.4,
    maxTokens: 4000,
  });
  return extractJson(raw);
}

export default function QuizScreen() {
  const { theme } = useTheme();
  const C = Colors[theme];
  const { currentStudyGuide } = useClass();
  const accentColor = C.accentGreen;

  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentStudyGuide) return;
    generateQuestions(currentStudyGuide.text)
      .then((qs) => {
        setQuestions(qs);
        setQuizState('question');
      })
      .catch((e) => {
        setError(e.message ?? 'Failed to generate quiz');
        setQuizState('question');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — run once on mount

  const handleNext = () => {
    if (!selected) return;
    const correct = selected === questions[currentIndex].answer;
    const nextResults = [...results, correct];
    setResults(nextResults);
    setSelected(null);

    if (currentIndex + 1 >= questions.length) {
      setQuizState('score');
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelected(null);
    setResults([]);
    setQuestions([]);
    setQuizState('loading');
    setError(null);
    if (currentStudyGuide) {
      let cancelled = false;
      generateQuestions(currentStudyGuide.text)
        .then((qs) => { if (!cancelled) { setQuestions(qs); setQuizState('question'); } })
        .catch((e) => { if (!cancelled) { setError(e.message ?? 'Failed'); setQuizState('question'); } });
      return () => { cancelled = true; };
    }
  };

  const score = results.filter(Boolean).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backArrow, { color: accentColor }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>
          Quiz — {currentStudyGuide?.title ?? ''}
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
          <Text style={[styles.errorText, { color: '#ff4444' }]}>{error}</Text>
          <Pressable onPress={handleRetry} style={[styles.btn, { backgroundColor: accentColor, marginTop: 20 }]}>
            <Text style={[styles.btnText, { color: C.buttonText }]}>Try Again</Text>
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
            <View style={[styles.progressBar, { backgroundColor: C.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: accentColor, width: `${((currentIndex + 1) / questions.length) * 100}%` },
                ]}
              />
            </View>
          </View>

          {/* Question text */}
          <Text style={[styles.questionText, { color: C.text }]}>
            {questions[currentIndex].question}
          </Text>

          {/* Options */}
          <View style={styles.options}>
            {questions[currentIndex].options.map((option) => {
              const isSelected = selected === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setSelected(option)}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: C.surface,
                      borderColor: isSelected ? accentColor : C.border,
                    },
                  ]}
                >
                  <Text style={[styles.optionText, { color: isSelected ? accentColor : C.text }]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Next button */}
          <Pressable
            onPress={handleNext}
            style={[
              styles.btn,
              { backgroundColor: accentColor, opacity: selected ? 1 : 0.35, marginTop: 8 },
            ]}
            disabled={!selected}
          >
            <Text style={[styles.btnText, { color: C.buttonText }]}>
              {currentIndex + 1 === questions.length ? 'Finish' : 'Next'}
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Score screen */}
      {quizState === 'score' && (
        <View style={styles.centered}>
          <Text style={[styles.scoreBig, { color: accentColor }]}>
            {score} / {questions.length}
          </Text>
          <Text style={[styles.scoreLabel, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>
            {score === questions.length
              ? 'PERFECT ⚡'
              : score >= questions.length * 0.7
              ? 'NICE WORK'
              : 'KEEP STUDYING'}
          </Text>

          {/* Breakdown */}
          <ScrollView style={styles.breakdown} showsVerticalScrollIndicator={false}>
            {questions.map((q, i) => (
              <View key={i} style={[styles.breakdownRow, { borderBottomColor: C.border }]}>
                <Text style={{ fontSize: 14, marginRight: 8 }}>{results[i] ? '✅' : '❌'}</Text>
                <Text style={[styles.breakdownQ, { color: C.textMuted }]} numberOfLines={2}>
                  {q.question}
                </Text>
              </View>
            ))}
          </ScrollView>

          <Pressable onPress={handleRetry} style={[styles.btn, { backgroundColor: accentColor, marginTop: 16 }]}>
            <Text style={[styles.btnText, { color: C.buttonText }]}>Try Again</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={[styles.btn, { backgroundColor: C.fadedGrey, marginTop: 8 }]}>
            <Text style={[styles.btnText, { color: C.textMuted }]}>Back to Class</Text>
          </Pressable>
        </View>
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
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  progressText: { fontSize: 10, letterSpacing: 0.5, minWidth: 40 },
  progressBar: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  questionText: { fontSize: 20, lineHeight: 30, fontWeight: '500', marginBottom: 24 },
  options: { gap: 10, marginBottom: 16 },
  optionCard: { borderWidth: 1, borderRadius: 12, padding: 16 },
  optionText: { fontSize: 15, lineHeight: 22 },
  btn: { borderRadius: 12, padding: 16, alignItems: 'center', width: '100%' },
  btnText: { fontSize: 16, fontWeight: '600' },
  scoreBig: { fontSize: 56, fontWeight: '700', letterSpacing: -2 },
  scoreLabel: { fontSize: 12, letterSpacing: 1.5, marginTop: 8, marginBottom: 24 },
  breakdown: { width: '100%', maxHeight: 280, marginBottom: 8 },
  breakdownRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1 },
  breakdownQ: { flex: 1, fontSize: 13, lineHeight: 18 },
});

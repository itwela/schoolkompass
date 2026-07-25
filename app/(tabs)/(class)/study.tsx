// app/(tabs)/(class)/study.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import SkeletonCard from '@/components/SkeletonCard';
import { useClass } from '@/contexts/ClassContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useStudyGuidesLocal, useFlashcardSetsLocal, useQuizzesLocal } from '@/hooks/useDataFetch';
import { useWeakSpots } from '@/hooks/useWeakSpots';
import { openRouterChat } from '@/constants/clients/openrouterClient';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';

type Tab = 'guides' | 'flashcards' | 'quiz';

// ─── Flashcard flip card ──────────────────────────────────────────────────────

type Flashcard = {
  id: string;
  question: string;
  answers: string[];
  explanation: string;
  starred: boolean;
  hidden: boolean;
};

type FlashcardSet = {
  id: string;
  title?: string;
  sourceText: string;
  cards: Flashcard[];
  lastModified: string;
};

function FlipCard({
  card,
  accentColor,
  onToggleStar,
  onHide,
  onEdit,
}: {
  card: Flashcard;
  accentColor: string;
  onToggleStar: () => void;
  onHide: () => void;
  onEdit: () => void;
}) {
  const { theme } = useTheme();
  const C = Colors[theme];
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    return () => { flipAnim.stopAnimation(); };
  }, []);

  const flip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(flipAnim, {
      toValue: flipped ? 0 : 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  };

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  return (
    <View style={styles.flipCardContainer}>
      <Pressable onPress={flip} style={StyleSheet.absoluteFill}>
        {/* Front */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flipCard,
            {
              backgroundColor: C.surface,
              borderColor: card.starred ? accentColor : C.border,
              borderWidth: card.starred ? 2 : 1,
            },
            { backfaceVisibility: 'hidden', transform: [{ rotateY: frontRotate }] },
          ]}
        >
          <Text style={[styles.flipCardHint, { color: C.textMuted, fontFamily: 'JetBrainsMono_400Regular' }]}>QUESTION</Text>
          <Text style={[styles.flipCardText, { color: accentColor, fontFamily: 'HankenGrotesk_400Regular' }]}>{card.question}</Text>
        </Animated.View>

        {/* Back */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flipCard,
            styles.flipCardBack,
            {
              backgroundColor: C.surface,
              borderColor: card.starred ? accentColor : C.border,
              borderWidth: card.starred ? 2 : 1,
            },
            { backfaceVisibility: 'hidden', transform: [{ rotateY: backRotate }] },
          ]}
        >
          <Text style={[styles.flipCardHint, { color: C.textMuted, fontFamily: 'JetBrainsMono_400Regular' }]}>ANSWER</Text>
          <Text style={[styles.flipCardText, { color: C.text, fontFamily: 'HankenGrotesk_400Regular' }]}>{card.answers[0]}</Text>
          {card.explanation ? (
            <Text style={[styles.flipCardExplanation, { color: C.text }]}>{card.explanation}</Text>
          ) : null}
        </Animated.View>
      </Pressable>

      {/* Actions rendered once, outside the flip pressable */}
      <View style={styles.flipCardActions}>
        <View style={styles.flipCardTopActions}>
          <Pressable onPress={onEdit} hitSlop={12}>
            <Text style={[styles.flipCardActionIcon, { color: C.textMuted }]}>✎</Text>
          </Pressable>
          <Pressable onPress={onHide} hitSlop={12}>
            <Text style={[styles.flipCardActionIcon, { color: C.textMuted }]}>✕</Text>
          </Pressable>
        </View>
        <Pressable onPress={onToggleStar} hitSlop={12}>
          <Text style={[styles.flipCardActionIcon, { color: card.starred ? accentColor : C.textMuted }]}>
            {card.starred ? '★' : '☆'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function StudyScreen() {
  const { theme } = useTheme();
  const C = Colors[theme];
  const {
    selectedClassId,
    currentClassName,
    setCurrentStudyGuide,
    setSelectedClassId,
    setSavedQuizToLoad,
  } = useClass();

  const classId = selectedClassId ?? '';
  const accentColor = C.accentGreen;

  const { studyGuides, loading: guidesLoading, addStudyGuide, renameStudyGuide } = useStudyGuidesLocal(classId);
  const { flashcardSets, loading: flashcardsLoading, updateFlashcardSet, addFlashcardSet, deleteFlashcardSet, renameFlashcardSet } = useFlashcardSetsLocal(classId);
  const { quizzes, loading: quizzesLoading, deleteQuiz, renameQuiz } = useQuizzesLocal(classId);
  const { weakSpots } = useWeakSpots(classId);

  // ── Star / hide cards ──────────────────────────────────────────────────────

  const toggleStar = async (setId: string, cardId: string) => {
    const set = flashcardSets.find((s) => s.id === setId);
    if (!set) return;
    await updateFlashcardSet({
      ...set,
      cards: set.cards.map((c) => c.id === cardId ? { ...c, starred: !c.starred } : c),
    });
  };

  // ── Confirm sheet (destructive actions) ────────────────────────────────────

  type ConfirmAction =
    | { type: 'hide-card'; setId: string; cardId: string }
    | { type: 'delete-set'; setId: string; title: string }
    | { type: 'delete-quiz'; quizId: string; title: string };

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const confirmSlideAnim = useRef(new Animated.Value(0)).current;

  const showConfirm = (action: ConfirmAction) => {
    setConfirmAction(action);
    confirmSlideAnim.stopAnimation();
    Animated.spring(confirmSlideAnim, { toValue: 1, tension: 65, friction: 11, useNativeDriver: true }).start();
  };

  const hideConfirm = () => {
    confirmSlideAnim.stopAnimation();
    Animated.spring(confirmSlideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start(() => {
      setConfirmAction(null);
    });
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'hide-card') {
      const set = flashcardSets.find((s) => s.id === confirmAction.setId);
      if (set) {
        await updateFlashcardSet({
          ...set,
          cards: set.cards.map((c) => c.id === confirmAction.cardId ? { ...c, hidden: true } : c),
        });
      }
    } else if (confirmAction.type === 'delete-set') {
      await deleteFlashcardSet(confirmAction.setId);
    } else if (confirmAction.type === 'delete-quiz') {
      await deleteQuiz(confirmAction.quizId);
    }
    hideConfirm();
  };

  const hideCard = (setId: string, cardId: string) => showConfirm({ type: 'hide-card', setId, cardId });

  // ── Rename sheet ───────────────────────────────────────────────────────────

  type RenameTarget =
    | { type: 'guide'; id: string; currentTitle: string }
    | { type: 'flashcard-set'; id: string; currentTitle: string }
    | { type: 'quiz'; id: string; currentTitle: string };

  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameSubmitting, setRenameSubmitting] = useState(false);
  const renameSlideAnim = useRef(new Animated.Value(0)).current;

  const showRename = (target: RenameTarget) => {
    setRenameTarget(target);
    setRenameTitle(target.currentTitle);
    renameSlideAnim.stopAnimation();
    Animated.spring(renameSlideAnim, { toValue: 1, tension: 65, friction: 11, useNativeDriver: true }).start();
  };

  const hideRename = () => {
    renameSlideAnim.stopAnimation();
    Animated.spring(renameSlideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start(() => {
      setRenameTarget(null);
      setRenameTitle('');
    });
  };

  const handleRename = async () => {
    if (!renameTarget || !renameTitle.trim() || renameSubmitting) return;
    setRenameSubmitting(true);
    try {
      if (renameTarget.type === 'guide') {
        await renameStudyGuide(renameTarget.id, renameTitle.trim());
      } else if (renameTarget.type === 'flashcard-set') {
        await renameFlashcardSet(renameTarget.id, renameTitle.trim());
      } else {
        await renameQuiz(renameTarget.id, renameTitle.trim());
      }
      hideRename();
    } finally {
      setRenameSubmitting(false);
    }
  };

  // ── Edit card ──────────────────────────────────────────────────────────────

  type EditTarget = { setId: string; cardId: string; question: string; answer: string };
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const editSlideAnim = useRef(new Animated.Value(0)).current;

  const showEdit = (target: EditTarget) => {
    setEditTarget(target);
    setEditQuestion(target.question);
    setEditAnswer(target.answer);
    editSlideAnim.stopAnimation();
    Animated.spring(editSlideAnim, { toValue: 1, tension: 65, friction: 11, useNativeDriver: true }).start();
  };

  const hideEdit = () => {
    editSlideAnim.stopAnimation();
    Animated.spring(editSlideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start(() => {
      setEditTarget(null);
      setEditQuestion('');
      setEditAnswer('');
    });
  };

  const handleEditSave = async () => {
    if (!editTarget || !editQuestion.trim() || !editAnswer.trim() || editSubmitting) return;
    setEditSubmitting(true);
    try {
      const set = flashcardSets.find((s) => s.id === editTarget.setId);
      if (!set) return;
      await updateFlashcardSet({
        ...set,
        cards: set.cards.map((c) =>
          c.id === editTarget.cardId
            ? { ...c, question: editQuestion.trim(), answers: [editAnswer.trim()] }
            : c
        ),
        lastModified: new Date().toISOString(),
      });
      hideEdit();
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Tabs ───────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<Tab>('guides');
  const [expandedSetIds, setExpandedSetIds] = useState<Set<string>>(new Set());

  // ── Flashcard generation ───────────────────────────────────────────────────

  const [addFlashcardsVisible, setAddFlashcardsVisible] = useState(false);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [flashcardError, setFlashcardError] = useState<string | null>(null);
  const [generateLog, setGenerateLog] = useState<string[]>([]);
  const [flashcardSourceText, setFlashcardSourceText] = useState('');
  const [flashcardSetTitle, setFlashcardSetTitle] = useState('');

  const showAddFlashcards = () => {
    setFlashcardError(null);
    setGenerateLog([]);
    setAddFlashcardsVisible(true);
  };

  const hideAddFlashcards = () => {
    setAddFlashcardsVisible(false);
    setFlashcardError(null);
    setFlashcardSourceText('');
    setFlashcardSetTitle('');
  };

  const generateFlashcards = async () => {
    if (generatingFlashcards || !flashcardSourceText.trim()) return;
    setGeneratingFlashcards(true);
    setFlashcardError(null);
    setGenerateLog(['Calling AI...']);
    try {
      const raw = await openRouterChat({
        model: 'google/gemini-2.0-flash-lite-001',
        messages: [
          {
            role: 'system',
            content:
              'You are a flashcard generator. Return exactly 15 flashcards as a raw JSON array. No markdown, no explanation — only the JSON array.\n\nIMPORTANT RULES:\n- Each card tests ONE concept with ONE clear answer. Never write "Select 2" or "which TWO" style questions.\n- If a concept has multiple parts (e.g. "Name 3 types of X"), combine them into a single answer string like "Type A, Type B, Type C".\n- answers is always an array with exactly one string.\n\nFormat: [{"question": "...", "answers": ["the full answer here"], "explanation": "Brief explanation."}]',
          },
          {
            role: 'user',
            content: `Generate 15 flashcards from this material:\n\n${flashcardSourceText.trim()}`,
          },
        ],
        temperature: 0.3,
        maxTokens: 4000,
      });
      setGenerateLog((l) => [...l, `Got response (${raw.length} chars)`, 'Parsing JSON...']);
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Could not parse flashcards from response');
      const parsed = JSON.parse(match[0]);
      setGenerateLog((l) => [...l, `Parsed ${parsed.length} cards`, 'Saving to Convex...']);
      await addFlashcardSet({
        id: Date.now().toString(),
        title: flashcardSetTitle.trim() || 'Flashcard Set',
        sourceText: flashcardSourceText.trim(),
        cards: parsed.map((c: any, i: number) => ({
          id: `${Date.now()}-${i}`,
          question: c.question,
          answers: Array.isArray(c.answers) ? c.answers : [c.answers],
          explanation: c.explanation ?? '',
          starred: false,
          hidden: false,
        })),
        lastModified: new Date().toISOString(),
      });
      hideAddFlashcards();
    } catch (e: any) {
      setFlashcardError(e?.message ?? 'Something went wrong. Try again.');
      setGeneratingFlashcards(false);
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  // ── Add guide ──────────────────────────────────────────────────────────────

  const [addGuideVisible, setAddGuideVisible] = useState(false);
  const [newGuideTitle, setNewGuideTitle] = useState('');
  const [newGuideContent, setNewGuideContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showAddGuide = () => {
    setAddGuideVisible(true);
  };

  const hideAddGuide = () => {
    setAddGuideVisible(false);
    setNewGuideTitle('');
    setNewGuideContent('');
  };

  const handleAddGuide = async () => {
    if (submitting || !newGuideTitle.trim() || !newGuideContent.trim()) return;
    setSubmitting(true);
    try {
      await addStudyGuide({
        id: Date.now().toString(),
        title: newGuideTitle.trim(),
        text: newGuideContent.trim(),
        audioFile: null,
        lastModified: new Date().toISOString(),
      });
      hideAddGuide();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────────────

  const handleBack = () => {
    if (activeTab !== 'guides') {
      setActiveTab('guides');
    } else {
      setSelectedClassId(null);
      router.back();
    }
  };

  const openGuide = (guide: any) => {
    setCurrentStudyGuide(guide);
    router.push('/(tabs)/(class)/reader');
  };

  // ── Quiz ───────────────────────────────────────────────────────────────────

  const [newQuizSource, setNewQuizSource] = useState<'guide' | 'text'>('guide');
  const [quizText, setQuizText] = useState('');

  const startQuizFromGuide = (guide: any) => {
    setSavedQuizToLoad(null);
    setCurrentStudyGuide(guide);
    router.push('/(tabs)/(class)/quiz-screen');
  };

  const startQuizFromText = () => {
    if (!quizText.trim()) return;
    setSavedQuizToLoad(null);
    setCurrentStudyGuide({
      id: `text-${Date.now()}`,
      title: 'Custom Quiz',
      text: quizText.trim(),
      audioFile: null,
      lastModified: new Date().toISOString(),
    });
    router.push('/(tabs)/(class)/quiz-screen');
  };

  const openSavedQuiz = (quiz: { id: string; title: string; questions: any[] }) => {
    setSavedQuizToLoad({ id: quiz.id, title: quiz.title, questions: quiz.questions });
    router.push('/(tabs)/(class)/quiz-screen');
  };

  const estimateReadTime = (text: string) => {
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} hitSlop={12}>
            <Text style={[styles.backArrow, { color: accentColor }]}>‹</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>
            {currentClassName ?? 'Class'}
          </Text>
        </View>

        {/* Weak Spots */}
        {weakSpots.length > 0 && (
          <View style={[weakSpotStyles.container, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[weakSpotStyles.heading, { color: C.textMuted, fontFamily: 'JetBrainsMono_400Regular' }]}>
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

        {/* Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: C.border }]}>
          {(['guides', 'flashcards', 'quiz'] as Tab[]).map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab ? accentColor : C.textMuted, fontFamily: 'SpaceMono' },
                ]}
              >
                {tab.toUpperCase()}
              </Text>
              {activeTab === tab && (
                <View style={[styles.tabUnderline, { backgroundColor: accentColor }]} />
              )}
            </Pressable>
          ))}
        </View>

        {/* Tab Content */}
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>

          {/* ── Guides Tab ── */}
          {activeTab === 'guides' && (
            <View>
              {guidesLoading ? (
                <>
                  <SkeletonCard height={72} />
                  <SkeletonCard height={72} />
                </>
              ) : studyGuides.length === 0 ? (
                <Pressable
                  onPress={showAddGuide}
                  style={[styles.emptyCard, { borderColor: accentColor }]}
                >
                  <Text style={[styles.emptyPlus, { color: accentColor }]}>+</Text>
                  <Text style={[styles.emptyLabel, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>ADD GUIDE</Text>
                </Pressable>
              ) : (
                <>
                  {studyGuides.map((guide) => (
                    <Pressable
                      key={guide.id}
                      onPress={() => openGuide(guide)}
                      style={[styles.guideCard, { backgroundColor: C.surface, borderColor: C.border }]}
                    >
                      <View style={styles.guideCardInner}>
                        <Text style={[styles.guideTitle, { color: C.text }]} numberOfLines={1}>
                          {guide.title}
                        </Text>
                        <Text style={[styles.guideMeta, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>
                          {estimateReadTime(guide.text)} min read
                        </Text>
                      </View>
                      <View style={styles.guideActions}>
                        <Pressable
                          onPress={() => showRename({ type: 'guide', id: guide.id, currentTitle: guide.title })}
                          hitSlop={10}
                        >
                          <Text style={[styles.guideActionIcon, { color: C.textMuted }]}>✎</Text>
                        </Pressable>
                        <Text style={[styles.guideArrow, { color: accentColor }]}>›</Text>
                      </View>
                    </Pressable>
                  ))}
                  <Pressable onPress={showAddGuide} style={[styles.addRowBtn, { borderColor: C.border }]}>
                    <Text style={[styles.addRowBtnText, { color: C.textMuted }]}>+ Add Guide</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}

          {/* ── Flashcards Tab ── */}
          {activeTab === 'flashcards' && (
            <View>
              {flashcardsLoading ? (
                <SkeletonCard height={180} />
              ) : flashcardSets.length === 0 ? (
                <Pressable
                  onPress={showAddFlashcards}
                  style={[styles.emptyCard, { borderColor: accentColor }]}
                >
                  <Text style={[styles.emptyPlus, { color: accentColor }]}>+</Text>
                  <Text style={[styles.emptyLabel, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>GENERATE FLASHCARDS</Text>
                </Pressable>
              ) : (
                <>
                  {flashcardSets.map((set) => {
                    const isExpanded = expandedSetIds.has(set.id);
                    const visibleCards = set.cards.filter((c) => !c.hidden);
                    return (
                      <View key={set.id} style={styles.flashcardSetBlock}>
                        <Pressable
                          onPress={() => {
                            setExpandedSetIds((prev) => {
                              const next = new Set(prev);
                              next.has(set.id) ? next.delete(set.id) : next.add(set.id);
                              return next;
                            });
                          }}
                          style={[styles.setTitleRow, { borderColor: isExpanded ? accentColor : C.border }]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.setTitleText, { color: C.text }]}>
                              {set.title || 'Flashcard Set'}
                            </Text>
                            <Text style={[styles.setTitleMeta, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>
                              {visibleCards.length} CARDS
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            <Pressable
                              onPress={() => showRename({ type: 'flashcard-set', id: set.id, currentTitle: set.title || 'Flashcard Set' })}
                              hitSlop={10}
                            >
                              <Text style={[styles.guideActionIcon, { color: C.textMuted }]}>✎</Text>
                            </Pressable>
                            <Text style={[styles.setTitleChevron, { color: isExpanded ? accentColor : C.textMuted }]}>
                              {isExpanded ? '˄' : '˅'}
                            </Text>
                            <Pressable
                              onPress={() => showConfirm({ type: 'delete-set', setId: set.id, title: set.title || 'Flashcard Set' })}
                              hitSlop={10}
                            >
                              <Text style={{ color: '#e05c5c', fontSize: 13 }}>✕</Text>
                            </Pressable>
                          </View>
                        </Pressable>
                        {isExpanded && visibleCards.map((card) => (
                          <FlipCard
                            key={card.id}
                            card={card}
                            accentColor={accentColor}
                            onToggleStar={() => toggleStar(set.id, card.id)}
                            onHide={() => hideCard(set.id, card.id)}
                            onEdit={() => showEdit({ setId: set.id, cardId: card.id, question: card.question, answer: card.answers[0] ?? '' })}
                          />
                        ))}
                      </View>
                    );
                  })}
                  <Pressable onPress={showAddFlashcards} style={[styles.addRowBtn, { borderColor: C.border }]}>
                    <Text style={[styles.addRowBtnText, { color: C.textMuted }]}>+ Generate Flashcards</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}

          {/* ── Quiz Tab ── */}
          {activeTab === 'quiz' && (
            <View>

              {/* Saved quizzes */}
              <Text style={[styles.quizSectionLabel, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>SAVED QUIZZES</Text>
              {quizzesLoading ? (
                <SkeletonCard height={60} />
              ) : quizzes.length === 0 ? (
                <View style={[styles.quizEmptyRow, { borderColor: C.border }]}>
                  <Text style={[styles.quizEmptyText, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>
                    NO SAVED QUIZZES YET
                  </Text>
                </View>
              ) : (
                quizzes.map((quiz) => (
                  <View key={quiz.id} style={[styles.savedQuizCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                    <Pressable style={styles.savedQuizMain} onPress={() => openSavedQuiz(quiz)}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.guideTitle, { color: C.text }]} numberOfLines={1}>{quiz.title}</Text>
                        <Text style={[styles.guideMeta, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>
                          {quiz.questions.length} QUESTIONS · {formatDate(quiz.lastModified)}
                        </Text>
                      </View>
                      <Text style={[styles.guideArrow, { color: accentColor }]}>›</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => showRename({ type: 'quiz', id: quiz.id, currentTitle: quiz.title })}
                      hitSlop={10}
                      style={styles.savedQuizAction}
                    >
                      <Text style={[styles.guideActionIcon, { color: C.textMuted }]}>✎</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => showConfirm({ type: 'delete-quiz', quizId: quiz.id, title: quiz.title })}
                      hitSlop={10}
                      style={styles.savedQuizAction}
                    >
                      <Text style={{ color: '#e05c5c', fontSize: 13 }}>✕</Text>
                    </Pressable>
                  </View>
                ))
              )}

              {/* New quiz section */}
              <Text style={[styles.quizSectionLabel, { color: C.textMuted, fontFamily: 'SpaceMono', marginTop: 24 }]}>NEW QUIZ</Text>

              {/* Source toggle */}
              <View style={[styles.quizSourceRow, { backgroundColor: C.surface, borderColor: C.border }]}>
                {(['guide', 'text'] as const).map((src) => (
                  <Pressable
                    key={src}
                    onPress={() => setNewQuizSource(src)}
                    style={[
                      styles.quizSourceBtn,
                      newQuizSource === src && { backgroundColor: accentColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quizSourceBtnText,
                        { color: newQuizSource === src ? C.buttonText : C.textMuted, fontFamily: 'SpaceMono' },
                      ]}
                    >
                      {src === 'guide' ? 'FROM GUIDE' : 'FROM TEXT'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Guide picker */}
              {newQuizSource === 'guide' && (
                guidesLoading ? (
                  <SkeletonCard height={72} />
                ) : studyGuides.length === 0 ? (
                  <View style={[styles.emptyCard, { borderColor: accentColor }]}>
                    <Text style={[styles.emptyLabel, { color: C.text, fontFamily: 'SpaceMono' }]}>
                      ADD A GUIDE FIRST
                    </Text>
                  </View>
                ) : (
                  studyGuides.map((guide) => (
                    <Pressable
                      key={guide.id}
                      onPress={() => startQuizFromGuide(guide)}
                      style={[styles.guideCard, { backgroundColor: C.surface, borderColor: accentColor + '40' }]}
                    >
                      <View style={styles.guideCardInner}>
                        <Text style={[styles.guideTitle, { color: C.text }]} numberOfLines={1}>
                          {guide.title}
                        </Text>
                        <Text style={[styles.guideMeta, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>
                          ⚡ QUIZ ME
                        </Text>
                      </View>
                      <Text style={[styles.guideArrow, { color: accentColor }]}>›</Text>
                    </Pressable>
                  ))
                )
              )}

              {/* Text input */}
              {newQuizSource === 'text' && (
                <View>
                  <TextInput
                    style={[styles.quizTextInput, { backgroundColor: C.surface, color: C.text, borderColor: C.border }]}
                    value={quizText}
                    onChangeText={setQuizText}
                    placeholder="Paste or type study material here..."
                    placeholderTextColor={C.textMuted}
                    multiline
                    textAlignVertical="top"
                  />
                  <Pressable
                    onPress={startQuizFromText}
                    style={[styles.submitBtn, { backgroundColor: accentColor, opacity: quizText.trim() ? 1 : 0.4 }]}
                  >
                    <Text style={[styles.submitBtnText, { color: C.buttonText }]}>Generate 10-Question Quiz</Text>
                  </Pressable>
                </View>
              )}

            </View>
          )}

        </ScrollView>
      </View>

      {/* Add Guide Sheet */}
      <Sheet visible={addGuideVisible} onClose={hideAddGuide}>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: C.text }]}>Add Study Guide</Text>
          <Pressable onPress={hideAddGuide}>
            <Text style={[styles.sheetClose, { color: C.textMuted }]}>×</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled">
          <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>TITLE</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
            value={newGuideTitle}
            onChangeText={setNewGuideTitle}
            placeholder="Chapter 1 — Threats & Attacks"
            placeholderTextColor={C.textMuted}
            autoFocus
          />
          <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: 'SpaceMono', marginTop: 14 }]}>CONTENT</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
            value={newGuideContent}
            onChangeText={setNewGuideContent}
            placeholder="Paste your study guide text or markdown here..."
            placeholderTextColor={C.textMuted}
            multiline
          />
          <View style={{ marginTop: 16, marginBottom: 8 }}>
            <Button
              label="Add Guide"
              onPress={handleAddGuide}
              disabled={submitting || !newGuideTitle.trim() || !newGuideContent.trim()}
              accentColor={accentColor}
            />
          </View>
        </ScrollView>
      </Sheet>

      {/* Rename Modal */}
      <Modal transparent visible={!!renameTarget} animationType="none" onRequestClose={hideRename}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={styles.overlay} onPress={hideRename}>
            <Animated.View
              style={[
                styles.sheet,
                { backgroundColor: C.surface },
                { transform: [{ translateY: renameSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }] },
              ]}
            >
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: C.text }]}>
                  Rename {renameTarget?.type === 'guide' ? 'Guide' : renameTarget?.type === 'quiz' ? 'Quiz' : 'Flashcard Set'}
                </Text>
                <Pressable onPress={hideRename}>
                  <Text style={[styles.sheetClose, { color: C.textMuted }]}>×</Text>
                </Pressable>
              </View>
              <View style={styles.sheetBody}>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                  value={renameTitle}
                  onChangeText={setRenameTitle}
                  autoFocus
                  selectTextOnFocus
                />
                <Pressable
                  onPress={handleRename}
                  style={[styles.submitBtn, { backgroundColor: accentColor, opacity: renameTitle.trim() ? 1 : 0.4 }]}
                >
                  <Text style={[styles.submitBtnText, { color: C.buttonText }]}>
                    {renameSubmitting ? 'Saving...' : 'Save'}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Destructive Action Confirm Sheet */}
      <Modal transparent visible={!!confirmAction} animationType="none" onRequestClose={hideConfirm}>
        <Pressable style={styles.overlay} onPress={hideConfirm}>
          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: C.surface },
              { transform: [{ translateY: confirmSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) }] },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.text }]}>
                {confirmAction?.type === 'delete-set' ? 'Delete Set'
                  : confirmAction?.type === 'delete-quiz' ? 'Delete Quiz'
                  : 'Hide Card'}
              </Text>
              <Pressable onPress={hideConfirm}>
                <Text style={[styles.sheetClose, { color: C.textMuted }]}>×</Text>
              </Pressable>
            </View>
            <View style={styles.sheetBody}>
              <Text style={[{ color: C.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 20 }]}>
                {confirmAction?.type === 'delete-set'
                  ? `Delete "${confirmAction.title}"? All ${flashcardSets.find(s => s.id === confirmAction.setId)?.cards.length ?? 0} cards will be permanently removed.`
                  : confirmAction?.type === 'delete-quiz'
                  ? `Delete "${confirmAction.title}"? You'll need to regenerate it to take it again.`
                  : 'Hide this card? It won\'t show up in your deck anymore.'}
              </Text>
              <Pressable onPress={handleConfirm} style={[styles.submitBtn, { backgroundColor: '#e05c5c' }]}>
                <Text style={[styles.submitBtnText, { color: '#fff' }]}>
                  {confirmAction?.type === 'delete-set' ? 'Yes, Delete Set'
                    : confirmAction?.type === 'delete-quiz' ? 'Yes, Delete Quiz'
                    : 'Yes, Hide Card'}
                </Text>
              </Pressable>
              <Pressable onPress={hideConfirm} style={[styles.submitBtn, { backgroundColor: C.border, marginTop: 8 }]}>
                <Text style={[styles.submitBtnText, { color: C.textMuted }]}>Cancel</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Edit Flashcard Modal */}
      <Modal transparent visible={!!editTarget} animationType="none" onRequestClose={hideEdit}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={styles.overlay} onPress={hideEdit}>
            <Animated.View
              style={[
                styles.sheet,
                { backgroundColor: C.surface },
                { transform: [{ translateY: editSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) }] },
              ]}
            >
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: C.text }]}>Edit Card</Text>
                <Pressable onPress={hideEdit}>
                  <Text style={[styles.sheetClose, { color: C.textMuted }]}>×</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled">
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>QUESTION</Text>
                <TextInput
                  style={[styles.input, styles.textAreaSmall, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                  value={editQuestion}
                  onChangeText={setEditQuestion}
                  multiline
                  autoFocus
                />
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: 'SpaceMono', marginTop: 14 }]}>ANSWER</Text>
                <TextInput
                  style={[styles.input, styles.textAreaSmall, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                  value={editAnswer}
                  onChangeText={setEditAnswer}
                  multiline
                />
                <Pressable
                  onPress={handleEditSave}
                  style={[styles.submitBtn, { backgroundColor: accentColor, opacity: editQuestion.trim() && editAnswer.trim() ? 1 : 0.4 }]}
                >
                  <Text style={[styles.submitBtnText, { color: C.buttonText }]}>
                    {editSubmitting ? 'Saving...' : 'Save Changes'}
                  </Text>
                </Pressable>
              </ScrollView>
            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Generate Flashcards Sheet */}
      <Sheet visible={addFlashcardsVisible} onClose={generatingFlashcards ? () => {} : hideAddFlashcards}>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: C.text }]}>Generate Flashcards</Text>
          {!generatingFlashcards && (
            <Pressable onPress={hideAddFlashcards}>
              <Text style={[styles.sheetClose, { color: C.textMuted }]}>×</Text>
            </Pressable>
          )}
        </View>

        <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled">
          {generatingFlashcards ? (
            <View style={styles.generatingState}>
              <Text style={[styles.generatingText, { color: C.textMuted, fontFamily: 'SpaceMono', marginBottom: 16 }]}>
                GENERATING FLASHCARDS...
              </Text>
              {generateLog.map((line, i) => (
                <Text key={i} style={[styles.generatingText, { color: i === generateLog.length - 1 ? accentColor : C.textMuted, fontFamily: 'SpaceMono', marginBottom: 4 }]}>
                  {i === generateLog.length - 1 ? '› ' : '✓ '}{line}
                </Text>
              ))}
            </View>
          ) : (
            <>
              {flashcardError && (
                <Text style={[styles.errorText, { color: '#e05c5c', marginBottom: 14 }]}>{flashcardError}</Text>
              )}
              <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>TITLE (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                value={flashcardSetTitle}
                onChangeText={setFlashcardSetTitle}
                placeholder="e.g. Chapter 3 — Cloud Security"
                placeholderTextColor={C.textMuted}
              />
              <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: 'SpaceMono', marginTop: 14 }]}>PASTE YOUR MATERIAL</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                value={flashcardSourceText}
                onChangeText={setFlashcardSourceText}
                placeholder="Paste notes, a study guide, or any text here..."
                placeholderTextColor={C.textMuted}
                multiline
                autoFocus
              />
              <View style={{ marginTop: 16, marginBottom: 8 }}>
                <Button
                  label="Generate 15 Flashcards"
                  onPress={generateFlashcards}
                  disabled={generatingFlashcards || !flashcardSourceText.trim()}
                  accentColor={accentColor}
                />
              </View>
            </>
          )}
        </ScrollView>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  backArrow: { fontSize: 28, lineHeight: 32 },
  headerTitle: { fontSize: 18, fontWeight: '600', flex: 1 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 20 },
  tabItem: { marginRight: 24, paddingBottom: 10, position: 'relative' },
  tabLabel: { fontSize: 10, letterSpacing: 1 },
  tabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, borderRadius: 1 },
  tabContent: { flex: 1, padding: 20 },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  guideCardInner: { flex: 1, gap: 3 },
  guideTitle: { fontSize: 14, fontWeight: '500' },
  guideMeta: { fontSize: 9, letterSpacing: 0.5 },
  guideArrow: { fontSize: 20, lineHeight: 24 },
  guideActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  guideActionIcon: { fontSize: 16 },
  addRowBtn: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  addRowBtnText: { fontSize: 13 },
  emptyCard: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, height: 90, alignItems: 'center', justifyContent: 'center', gap: 4 },
  emptyPlus: { fontSize: 22 },
  emptyLabel: { fontSize: 10, letterSpacing: 1 },
  // Quiz tab
  quizSectionLabel: { fontSize: 9, letterSpacing: 1.5, marginBottom: 10 },
  quizEmptyRow: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 4 },
  quizEmptyText: { fontSize: 9, letterSpacing: 1 },
  savedQuizCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  savedQuizMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14 },
  savedQuizAction: { padding: 14 },
  quizSourceRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 14 },
  quizSourceBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  quizSourceBtnText: { fontSize: 9, letterSpacing: 1 },
  quizTextInput: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, height: 140, marginBottom: 4 },
  // Flashcards
  flashcardSetBlock: { marginBottom: 12 },
  setTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 10 },
  setTitleText: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  setTitleMeta: { fontSize: 9, letterSpacing: 1 },
  setTitleChevron: { fontSize: 18 },
  generatingState: { alignItems: 'center', paddingVertical: 40 },
  generatingText: { fontSize: 11, letterSpacing: 1 },
  errorText: { fontSize: 13, marginBottom: 14, lineHeight: 20 },
  flipCardContainer: { marginBottom: 12, height: 160 },
  flipCard: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  flipCardBack: { position: 'absolute', top: 0, left: 0 },
  flipCardHint: { fontSize: 9, letterSpacing: 1, marginBottom: 10 },
  flipCardText: { fontSize: 16, lineHeight: 24, flex: 1 },
  flipCardExplanation: { fontSize: 12, marginTop: 10, lineHeight: 18 },
  flipCardActions: { position: 'absolute', top: 14, bottom: 14, right: 16, flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' },
  flipCardTopActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flipCardActionIcon: { fontSize: 18 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
  sheetTitle: { fontSize: 22, fontWeight: '600' },
  sheetClose: { fontSize: 32, marginTop: -4 },
  sheetBody: { paddingHorizontal: 24 },
  inputLabel: { fontSize: 9, letterSpacing: 1, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15 },
  textArea: { height: 130, textAlignVertical: 'top' },
  textAreaSmall: { height: 80, textAlignVertical: 'top' },
  submitBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16, marginBottom: 8 },
  submitBtnText: { fontSize: 16, fontWeight: '600' },
});

const weakSpotStyles = StyleSheet.create({
  container: { borderRadius: 12, borderWidth: 1, padding: 12, marginHorizontal: 20, marginBottom: 12, gap: 8 },
  heading: { fontSize: 10, letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, flex: 1, marginRight: 8 },
  detail: { fontSize: 12 },
});

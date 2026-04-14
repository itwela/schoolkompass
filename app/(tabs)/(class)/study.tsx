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
import { useStudyGuidesLocal, useFlashcardSetsLocal } from '@/hooks/useDataFetch';
import { openRouterChat } from '@/constants/clients/openrouterClient';

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
}: {
  card: Flashcard;
  accentColor: string;
  onToggleStar: () => void;
  onHide: () => void;
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
      {/* Flip gesture covers the whole card */}
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
          <Text style={[styles.flipCardHint, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>QUESTION</Text>
          <Text style={[styles.flipCardText, { color: accentColor }]}>{card.question}</Text>
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
          <Text style={[styles.flipCardHint, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>ANSWER</Text>
          <Text style={[styles.flipCardText, { color: C.text }]}>{card.answers[0]}</Text>
          {card.explanation ? (
            <Text style={[styles.flipCardExplanation, { color: C.text }]}>{card.explanation}</Text>
          ) : null}
        </Animated.View>
      </Pressable>

      {/* Actions rendered once, outside the flip pressable */}
      <View style={styles.flipCardActions}>
        <Pressable onPress={onHide} hitSlop={12}>
          <Text style={[styles.flipCardActionIcon, { color: C.textMuted }]}>✕</Text>
        </Pressable>
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
  } = useClass();

  const classId = selectedClassId ?? '';
  const accentColor = C.accentGreen;

  const { studyGuides, loading: guidesLoading, addStudyGuide } = useStudyGuidesLocal(classId);
  const { flashcardSets, loading: flashcardsLoading, updateFlashcardSet, addFlashcardSet, deleteFlashcardSet } = useFlashcardSetsLocal(classId);

  const toggleStar = async (setId: string, cardId: string) => {
    const set = flashcardSets.find((s) => s.id === setId);
    if (!set) return;
    await updateFlashcardSet({
      ...set,
      cards: set.cards.map((c) => c.id === cardId ? { ...c, starred: !c.starred } : c),
    });
  };

  type ConfirmAction =
    | { type: 'hide-card'; setId: string; cardId: string }
    | { type: 'delete-set'; setId: string; title: string };

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
    }
    hideConfirm();
  };

  const hideCard = (setId: string, cardId: string) => showConfirm({ type: 'hide-card', setId, cardId });

  const [activeTab, setActiveTab] = useState<Tab>('guides');
  const [expandedSetIds, setExpandedSetIds] = useState<Set<string>>(new Set());
  const [addFlashcardsVisible, setAddFlashcardsVisible] = useState(false);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [flashcardError, setFlashcardError] = useState<string | null>(null);
  const [generateLog, setGenerateLog] = useState<string[]>([]);
  const [flashcardSourceText, setFlashcardSourceText] = useState('');
  const [flashcardSetTitle, setFlashcardSetTitle] = useState('');
  const flashcardSlideAnim = useRef(new Animated.Value(0)).current;
  const [addGuideVisible, setAddGuideVisible] = useState(false);
  const [newGuideTitle, setNewGuideTitle] = useState('');
  const [newGuideContent, setNewGuideContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const showAddGuide = () => {
    slideAnim.stopAnimation();
    setAddGuideVisible(true);
    Animated.spring(slideAnim, { toValue: 1, tension: 65, friction: 11, useNativeDriver: true }).start();
  };

  const hideAddGuide = () => {
    slideAnim.stopAnimation();
    Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start(() => {
      setAddGuideVisible(false);
      setNewGuideTitle('');
      setNewGuideContent('');
    });
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

  const showAddFlashcards = () => {
    flashcardSlideAnim.stopAnimation();
    setFlashcardError(null);
    setGenerateLog([]);
    setAddFlashcardsVisible(true);
    Animated.spring(flashcardSlideAnim, { toValue: 1, tension: 65, friction: 11, useNativeDriver: true }).start();
  };

  const hideAddFlashcards = () => {
    flashcardSlideAnim.stopAnimation();
    Animated.spring(flashcardSlideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start(() => {
      setAddFlashcardsVisible(false);
      setFlashcardError(null);
      setFlashcardSourceText('');
      setFlashcardSetTitle('');
    });
  };

  const generateFlashcards = async () => {
    if (generatingFlashcards || !flashcardSourceText.trim()) return;
    setGeneratingFlashcards(true);
    setFlashcardError(null);
    setGenerateLog(['Calling AI...']);
    try {
      const raw = await openRouterChat({
        model: 'openai/gpt-oss-20b:free',
        messages: [
          {
            role: 'system',
            content:
              'You are a flashcard generator. Given study material, return exactly 15 flashcards as a raw JSON array. No markdown, no explanation — only the JSON array. Format: [{"question": "...", "answers": ["correct answer here"], "explanation": "Brief explanation."}]',
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

  const startQuiz = (guide: any) => {
    setCurrentStudyGuide(guide);
    router.push('/(tabs)/(class)/quiz-screen');
  };

  const sheetStyle = {
    transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }],
  };

  const estimateReadTime = (text: string) => {
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
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
                      <Text style={[styles.guideArrow, { color: accentColor }]}>›</Text>
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
                              onPress={() => showConfirm({ type: 'delete-set', setId: set.id, title: set.title || 'Flashcard Set' })}
                              hitSlop={10}
                            >
                              <Text style={{ color: '#e05c5c', fontSize: 18 }}>✕</Text>
                            </Pressable>
                            <Text style={[styles.setTitleChevron, { color: isExpanded ? accentColor : C.textMuted }]}>
                              {isExpanded ? '˄' : '˅'}
                            </Text>
                          </View>
                        </Pressable>
                        {isExpanded && visibleCards.map((card) => (
                          <FlipCard
                            key={card.id}
                            card={card}
                            accentColor={accentColor}
                            onToggleStar={() => toggleStar(set.id, card.id)}
                            onHide={() => hideCard(set.id, card.id)}
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
              {guidesLoading ? (
                <SkeletonCard height={72} />
              ) : studyGuides.length === 0 ? (
                <View style={[styles.emptyCard, { borderColor: accentColor }]}>
                  <Text style={[styles.emptyLabel, { color: C.text, fontFamily: 'SpaceMono' }]}>
                    ADD A GUIDE FIRST
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.quizHint, { color: C.textMuted }]}>
                    Pick a guide to generate a 10-question quiz.
                  </Text>
                  {studyGuides.map((guide) => (
                    <Pressable
                      key={guide.id}
                      onPress={() => startQuiz(guide)}
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
                  ))}
                </>
              )}
            </View>
          )}

        </ScrollView>
      </View>

      {/* Add Guide Modal */}
      <Modal transparent visible={addGuideVisible} animationType="none" onRequestClose={hideAddGuide}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={styles.overlay} onPress={hideAddGuide}>
            <Animated.View style={[styles.sheet, { backgroundColor: C.surface }, sheetStyle]}>
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
                <Pressable
                  onPress={handleAddGuide}
                  style={[styles.submitBtn, { backgroundColor: accentColor, opacity: newGuideTitle.trim() && newGuideContent.trim() ? 1 : 0.4 }]}
                >
                  <Text style={[styles.submitBtnText, { color: C.buttonText }]}>Add Guide</Text>
                </Pressable>
              </ScrollView>
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
                {confirmAction?.type === 'delete-set' ? 'Delete Set' : 'Hide Card'}
              </Text>
              <Pressable onPress={hideConfirm}>
                <Text style={[styles.sheetClose, { color: C.textMuted }]}>×</Text>
              </Pressable>
            </View>
            <View style={styles.sheetBody}>
              <Text style={[{ color: C.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 20 }]}>
                {confirmAction?.type === 'delete-set'
                  ? `Delete "${confirmAction.title}"? All ${flashcardSets.find(s => s.id === confirmAction.setId)?.cards.length ?? 0} cards will be permanently removed.`
                  : 'Hide this card? It won\'t show up in your deck anymore.'}
              </Text>
              <Pressable onPress={handleConfirm} style={[styles.submitBtn, { backgroundColor: '#e05c5c' }]}>
                <Text style={[styles.submitBtnText, { color: '#fff' }]}>
                  {confirmAction?.type === 'delete-set' ? 'Yes, Delete Set' : 'Yes, Hide Card'}
                </Text>
              </Pressable>
              <Pressable onPress={hideConfirm} style={[styles.submitBtn, { backgroundColor: C.border, marginTop: 8 }]}>
                <Text style={[styles.submitBtnText, { color: C.textMuted }]}>Cancel</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Generate Flashcards Modal */}
      <Modal transparent visible={addFlashcardsVisible} animationType="none" onRequestClose={hideAddFlashcards}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={styles.overlay} onPress={generatingFlashcards ? undefined : hideAddFlashcards}>
            <Animated.View
              style={[
                styles.sheet,
                { backgroundColor: C.surface },
                { transform: [{ translateY: flashcardSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }] },
              ]}
            >
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
                    <Pressable
                      onPress={generateFlashcards}
                      style={[styles.submitBtn, { backgroundColor: accentColor, opacity: flashcardSourceText.trim() ? 1 : 0.4 }]}
                    >
                      <Text style={[styles.submitBtnText, { color: C.buttonText }]}>Generate 15 Flashcards</Text>
                    </Pressable>
                  </>
                )}
              </ScrollView>
            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
  addRowBtn: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  addRowBtnText: { fontSize: 13 },
  emptyCard: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, height: 90, alignItems: 'center', justifyContent: 'center', gap: 4 },
  emptyPlus: { fontSize: 22 },
  emptyLabel: { fontSize: 10, letterSpacing: 1 },
  quizHint: { fontSize: 13, marginBottom: 14, lineHeight: 20 },
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
  flipCardActions: { position: 'absolute', top: 14, bottom: 14, right: 16, flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' },
  flipCardActionIcon: { fontSize: 18 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
  sheetTitle: { fontSize: 22, fontWeight: '600' },
  sheetClose: { fontSize: 32, marginTop: -4 },
  sheetBody: { paddingHorizontal: 24 },
  inputLabel: { fontSize: 9, letterSpacing: 1, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15 },
  textArea: { height: 220, textAlignVertical: 'top' },
  submitBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16, marginBottom: 8 },
  submitBtnText: { fontSize: 16, fontWeight: '600' },
});

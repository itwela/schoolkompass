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
}: {
  card: Flashcard;
  accentColor: string;
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
    <Pressable onPress={flip} style={styles.flipCardContainer}>
      {/* Front */}
      <Animated.View
        style={[
          styles.flipCard,
          { backgroundColor: C.surface, borderColor: accentColor },
          { backfaceVisibility: 'hidden', transform: [{ rotateY: frontRotate }] },
        ]}
      >
        <Text style={[styles.flipCardHint, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>QUESTION</Text>
        <Text style={[styles.flipCardText, { color: C.text }]}>{card.question}</Text>
      </Animated.View>

      {/* Back */}
      <Animated.View
        style={[
          styles.flipCard,
          styles.flipCardBack,
          { backgroundColor: C.surface, borderColor: accentColor },
          { backfaceVisibility: 'hidden', transform: [{ rotateY: backRotate }] },
        ]}
      >
        <Text style={[styles.flipCardHint, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>ANSWER</Text>
        <Text style={[styles.flipCardText, { color: C.text }]}>{card.answers[0]}</Text>
        {card.explanation ? (
          <Text style={[styles.flipCardExplanation, { color: C.textMuted }]}>{card.explanation}</Text>
        ) : null}
      </Animated.View>
    </Pressable>
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
  } = useClass();

  const classId = selectedClassId ?? '';
  const accentColor = C.accentGreen;

  const { studyGuides, loading: guidesLoading, addStudyGuide } = useStudyGuidesLocal(classId);
  const { flashcardSets, loading: flashcardsLoading } = useFlashcardSetsLocal(classId);

  const [activeTab, setActiveTab] = useState<Tab>('guides');
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
          <Pressable onPress={() => router.back()} hitSlop={12}>
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
                <View style={[styles.emptyCard, { borderColor: C.border }]}>
                  <Text style={[styles.emptyLabel, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>
                    NO FLASHCARD SETS YET
                  </Text>
                </View>
              ) : (
                flashcardSets.map((set) => (
                  <View key={set.id} style={styles.flashcardSetBlock}>
                    {set.title && (
                      <Text style={[styles.setTitle, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>
                        {set.title.toUpperCase()}
                      </Text>
                    )}
                    {set.cards.filter((c) => !c.hidden).map((card) => (
                      <FlipCard key={card.id} card={card} accentColor={accentColor} />
                    ))}
                  </View>
                ))
              )}
            </View>
          )}

          {/* ── Quiz Tab ── */}
          {activeTab === 'quiz' && (
            <View>
              {guidesLoading ? (
                <SkeletonCard height={72} />
              ) : studyGuides.length === 0 ? (
                <View style={[styles.emptyCard, { borderColor: C.border }]}>
                  <Text style={[styles.emptyLabel, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>
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
  flashcardSetBlock: { marginBottom: 20 },
  setTitle: { fontSize: 9, letterSpacing: 1, marginBottom: 10 },
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
  flipCardText: { fontSize: 16, lineHeight: 24 },
  flipCardExplanation: { fontSize: 12, marginTop: 10, lineHeight: 18 },
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

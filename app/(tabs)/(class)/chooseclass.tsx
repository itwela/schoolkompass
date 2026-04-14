// app/(tabs)/(class)/chooseclass.tsx
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
import { Colors } from '@/constants/Colors';
import ClassCard from '@/components/ClassCard';
import SectionLabel from '@/components/SectionLabel';
import SkeletonCard from '@/components/SkeletonCard';
import { useClass } from '@/contexts/ClassContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useStudyGuidesLocal, useFlashcardSetsLocal, useQuizzesLocal } from '@/hooks/useDataFetch';

// Per-class wrapper so we can call hooks for each class
function ClassCardWrapper({
  classItem,
  index,
  onPress,
  onDelete,
}: {
  classItem: { id: string; name: string; description: string };
  index: number;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { theme } = useTheme();
  const C = Colors[theme];
  const accentColor = index % 2 === 0 ? C.accentGreen : C.accentGold;
  const { studyGuides } = useStudyGuidesLocal(classItem.id);
  const { flashcardSets } = useFlashcardSetsLocal(classItem.id);
  const { quizzes } = useQuizzesLocal(classItem.id);

  return (
    <ClassCard
      name={classItem.name}
      description={classItem.description}
      accentColor={accentColor}
      guideCount={studyGuides.length}
      hasGuides={studyGuides.length > 0}
      hasFlashcards={flashcardSets.length > 0}
      hasQuiz={quizzes.length > 0}
      onPress={onPress}
      onDelete={onDelete}
    />
  );
}

export default function ChooseClassScreen() {
  const { theme, toggleTheme } = useTheme();
  const C = Colors[theme];
  const {
    classes,
    classesLoading,
    setSelectedClassId,
    setCurrentStudyGuide,
    setCurrentClassName,
    fetchClasses,
    addClass,
    deleteClass,
  } = useClass();
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const deleteSlideAnim = useRef(new Animated.Value(0)).current;

  const realClasses = classes.filter((c) => c.id !== '0');

  useEffect(() => {
    setSelectedClassId(null);
    setCurrentStudyGuide(null);
    fetchClasses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentional mount-only fetch

  const showModal = () => {
    slideAnim.stopAnimation();
    setModalVisible(true);
    Animated.spring(slideAnim, { toValue: 1, tension: 65, friction: 11, useNativeDriver: true }).start();
  };

  const hideModal = () => {
    slideAnim.stopAnimation();
    Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start(() => {
      setModalVisible(false);
      setNewClassName('');
      setNewClassDescription('');
    });
  };

  const handleAddClass = async () => {
    if (submitting || !newClassName.trim() || !newClassDescription.trim()) return;
    setSubmitting(true);
    try {
      await addClass({
        id: Date.now().toString(),
        name: newClassName.trim(),
        description: newClassDescription.trim(),
      });
      hideModal();
    } finally {
      setSubmitting(false);
    }
  };

  const showDeleteModal = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteModalVisible(true);
    deleteSlideAnim.stopAnimation();
    Animated.spring(deleteSlideAnim, { toValue: 1, tension: 65, friction: 11, useNativeDriver: true }).start();
  };

  const hideDeleteModal = () => {
    deleteSlideAnim.stopAnimation();
    Animated.spring(deleteSlideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start(() => {
      setDeleteModalVisible(false);
      setDeleteTarget(null);
    });
  };

  const handleDelete = async () => {
    if (submitting || !deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteClass(deleteTarget.id);
      hideDeleteModal();
    } finally {
      setSubmitting(false);
    }
  };

  const makeSheetStyle = (anim: Animated.Value) => ({
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [600, 0],
        }),
      },
    ],
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <SectionLabel>My Classes</SectionLabel>
          <View style={styles.headerActions}>
            <Pressable
              onPress={toggleTheme}
              style={[styles.iconBtn, { borderColor: C.border }]}
            >
              <Text style={{ fontSize: 14 }}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
            </Pressable>
            <Pressable
              onPress={showModal}
              style={[styles.addBtn, { backgroundColor: C.accentGreen }]}
            >
              <Text style={[styles.addBtnText, { color: C.buttonText }]}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* List */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {classesLoading ? (
            <>
              <SkeletonCard height={90} />
              <SkeletonCard height={90} />
              <SkeletonCard height={90} />
            </>
          ) : realClasses.length === 0 ? (
            <Pressable
              onPress={showModal}
              style={[styles.emptyCard, { borderColor: C.accentGreen }]}
            >
              <Text style={[styles.emptyPlus, { color: C.accentGreen }]}>+</Text>
              <Text style={[styles.emptyLabel, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>
                ADD CLASS
              </Text>
            </Pressable>
          ) : (
            realClasses.map((cls, index) => (
              <ClassCardWrapper
                key={cls.id}
                classItem={cls}
                index={index}
                onPress={() => {
                  setSelectedClassId(cls.id);
                  setCurrentClassName(cls.name);
                }}
                onDelete={() => showDeleteModal(cls.id, cls.name)}
              />
            ))
          )}
        </ScrollView>
      </View>

      {/* Add Class Modal */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="none"
        onRequestClose={hideModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable style={styles.overlay} onPress={hideModal}>
            <Animated.View
              style={[styles.sheet, { backgroundColor: C.surface }, makeSheetStyle(slideAnim)]}
            >
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: C.text }]}>Add New Class</Text>
                <Pressable onPress={hideModal}>
                  <Text style={[styles.sheetClose, { color: C.textMuted }]}>×</Text>
                </Pressable>
              </View>
              <View style={styles.sheetBody}>
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>
                  CLASS NAME
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                  value={newClassName}
                  onChangeText={setNewClassName}
                  placeholder="e.g. Network Security — D315"
                  placeholderTextColor={C.textMuted}
                  autoFocus
                />
                <Text
                  style={[
                    styles.inputLabel,
                    { color: C.textMuted, fontFamily: 'SpaceMono', marginTop: 12 },
                  ]}
                >
                  DESCRIPTION
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    { backgroundColor: C.bg, color: C.text, borderColor: C.border },
                  ]}
                  value={newClassDescription}
                  onChangeText={setNewClassDescription}
                  placeholder="Course code, term, notes..."
                  placeholderTextColor={C.textMuted}
                  multiline
                  numberOfLines={3}
                />
                <Pressable
                  onPress={handleAddClass}
                  style={[
                    styles.submitBtn,
                    {
                      backgroundColor: C.accentGreen,
                      opacity: newClassName.trim() && newClassDescription.trim() ? 1 : 0.4,
                    },
                  ]}
                >
                  <Text style={[styles.submitBtnText, { color: C.buttonText }]}>Add Class</Text>
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        transparent
        visible={deleteModalVisible}
        animationType="none"
        onRequestClose={hideDeleteModal}
      >
        <Pressable style={styles.overlay} onPress={hideDeleteModal}>
          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: C.surface },
              makeSheetStyle(deleteSlideAnim),
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.text }]}>Delete Class</Text>
              <Pressable onPress={hideDeleteModal}>
                <Text style={[styles.sheetClose, { color: C.textMuted }]}>×</Text>
              </Pressable>
            </View>
            <View style={styles.sheetBody}>
              <Text style={[styles.deleteWarning, { color: C.textMuted }]}>
                Delete "{deleteTarget?.name}"? All study guides and data will be removed.
              </Text>
              <Pressable
                onPress={handleDelete}
                style={[styles.submitBtn, { backgroundColor: '#ff4444' }]}
              >
                <Text style={[styles.submitBtnText, { color: '#fff' }]}>Yes, Delete</Text>
              </Pressable>
              <Pressable
                onPress={hideDeleteModal}
                style={[styles.submitBtn, { backgroundColor: C.fadedGrey, marginTop: 8 }]}
              >
                <Text style={[styles.submitBtnText, { color: C.textMuted }]}>Cancel</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 22, fontWeight: '300', lineHeight: 26 },
  list: { flex: 1 },
  emptyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyPlus: { fontSize: 22 },
  emptyLabel: { fontSize: 10, letterSpacing: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  sheetTitle: { fontSize: 22, fontWeight: '600' },
  sheetClose: { fontSize: 32, marginTop: -4 },
  sheetBody: { paddingHorizontal: 24, gap: 4 },
  inputLabel: { fontSize: 9, letterSpacing: 1, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  submitBtnText: { fontSize: 16, fontWeight: '600' },
  deleteWarning: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
});

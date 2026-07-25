// components/ClassCard.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/Colors';
import { Pill } from '@/components/ui/Pill';

type ClassCardProps = {
  name: string;
  description: string;
  /** Must be a 6-digit hex color string (e.g. '#90d060') */
  accentColor: string;
  guideCount: number;
  hasGuides: boolean;
  hasFlashcards: boolean;
  hasQuiz: boolean;
  onPress: () => void;
  onDelete: () => void;
};

export default function ClassCard({
  name,
  description,
  accentColor,
  guideCount,
  hasGuides,
  hasFlashcards,
  hasQuiz,
  onPress,
  onDelete,
}: ClassCardProps) {
  const { theme } = useTheme();
  const C = Colors[theme];

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.titleBlock}>
            <Text
              style={[styles.name, { color: C.text, fontFamily: 'InstrumentSerif_400Regular' }]}
              numberOfLines={1}
            >
              {name}
            </Text>
            <Text
              style={[styles.description, { color: C.textMuted, fontFamily: 'HankenGrotesk_400Regular' }]}
              numberOfLines={1}
            >
              {description}
            </Text>
          </View>
          {guideCount > 0 && (
            <View style={[styles.chip, { borderColor: accentColor }]}>
              <Text style={[styles.chipText, { color: accentColor, fontFamily: 'JetBrainsMono_400Regular' }]}>
                {guideCount} {guideCount === 1 ? 'guide' : 'guides'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.badges}>
            <Pill label="GUIDES" active={hasGuides} accentColor={accentColor} />
            <Pill label="FLASHCARDS" active={hasFlashcards} accentColor={accentColor} />
            <Pill label="QUIZ" active={hasQuiz} accentColor={accentColor} />
          </View>
          <Pressable
            onPress={onDelete}
            hitSlop={12}
            style={styles.trash}
            accessibilityLabel="Delete class"
            accessibilityRole="button"
          >
            <Text style={{ fontSize: 16 }}>🗑️</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleBlock: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 20,
  },
  description: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  trash: {
    padding: 4,
  },
});

// components/ClassCard.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/Colors';

type ClassCardProps = {
  name: string;
  description: string;
  accentColor: string;
  guideCount: number;
  hasFlashcards: boolean;
  onPress: () => void;
  onDelete: () => void;
};

export default function ClassCard({
  name,
  description,
  accentColor,
  guideCount,
  hasFlashcards,
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
            <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.description, { color: C.textMuted, fontFamily: 'SpaceMono' }]} numberOfLines={1}>
              {description}
            </Text>
          </View>
          {guideCount > 0 && (
            <View style={[styles.chip, { borderColor: accentColor }]}>
              <Text style={[styles.chipText, { color: accentColor, fontFamily: 'SpaceMono' }]}>
                {guideCount} {guideCount === 1 ? 'guide' : 'guides'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: C.fadedGrey }]}>
              <Text style={[styles.badgeText, { color: C.textMuted }]}>GUIDES</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: hasFlashcards ? `${accentColor}18` : C.fadedGrey }]}>
              <Text style={[styles.badgeText, { color: hasFlashcards ? accentColor : C.textMuted }]}>
                FLASHCARDS
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: C.fadedGrey }]}>
              <Text style={[styles.badgeText, { color: C.textMuted }]}>QUIZ</Text>
            </View>
          </View>
          <Pressable onPress={onDelete} hitSlop={12} style={styles.trash}>
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
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 10,
    letterSpacing: 0.5,
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
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 8,
    letterSpacing: 0.5,
    fontFamily: 'SpaceMono',
  },
  trash: {
    padding: 4,
  },
});

// app/(tabs)/(class)/reader.tsx
import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { Colors } from '@/constants/Colors';
import PillPlayer from '@/components/PillPlayer';
import { useClass } from '@/contexts/ClassContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function ReaderScreen() {
  const { theme } = useTheme();
  const C = Colors[theme];
  const { currentStudyGuide } = useClass();

  const accentColor = C.accentGreen;

  if (!currentStudyGuide) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <Text style={{ color: C.textMuted, textAlign: 'center', marginTop: 40 }}>No guide selected.</Text>
      </SafeAreaView>
    );
  }

  const markdownStyles = {
    body: { color: C.text, fontSize: 17, lineHeight: 28 },
    heading1: { color: accentColor, fontSize: 22, fontWeight: '700' as const, marginTop: 24, marginBottom: 8 },
    heading2: { color: accentColor, fontSize: 19, fontWeight: '600' as const, marginTop: 20, marginBottom: 6 },
    heading3: { color: accentColor, fontSize: 16, fontWeight: '600' as const, marginTop: 16, marginBottom: 4 },
    strong: { color: C.text, fontWeight: '700' as const },
    em: { color: C.text, fontStyle: 'italic' as const },
    code_inline: {
      backgroundColor: C.surface,
      color: accentColor,
      fontFamily: 'SpaceMono',
      fontSize: 14,
      paddingHorizontal: 4,
      borderRadius: 3,
    },
    fence: {
      backgroundColor: C.surface,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
    },
    code_block: {
      backgroundColor: C.surface,
      color: accentColor,
      fontFamily: 'SpaceMono',
      fontSize: 13,
      padding: 12,
      borderRadius: 8,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: accentColor,
      paddingLeft: 12,
      marginVertical: 8,
    },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    list_item: { color: C.text, fontSize: 17, lineHeight: 28 },
    hr: { backgroundColor: C.border, height: 1, marginVertical: 16 },
    link: { color: accentColor },
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backArrow, { color: accentColor }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>
          {currentStudyGuide.title}
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Markdown style={markdownStyles}>{currentStudyGuide.text}</Markdown>
        {/* Bottom padding to clear the pill player */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating pill player */}
      <PillPlayer text={currentStudyGuide.text} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backArrow: { fontSize: 28, lineHeight: 32 },
  headerTitle: { fontSize: 16, fontWeight: '500', flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
});

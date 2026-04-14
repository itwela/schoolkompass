# School Kompass UI Redesign + Feature Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all screens with a dark-terminal aesthetic and build the missing Study Guides, Reader, and Quiz features.

**Architecture:** AsyncStorage-backed data layer already exists and is untouched. New screens (reader, quiz-screen) navigate via ClassContext shared state — same pattern as existing study screen. A custom ThemeContext replaces the system color scheme hook so users can toggle dark/light manually.

**Tech Stack:** React Native, Expo Router, AsyncStorage, expo-speech (new), react-native-markdown-display (existing), OpenRouter (existing)

---

## File Map

**Create:**
- `contexts/ThemeContext.tsx` — manual dark/light toggle, persisted to AsyncStorage
- `components/ClassCard.tsx` — home screen class card with left accent bar
- `components/SectionLabel.tsx` — small uppercase section label
- `components/SkeletonCard.tsx` — animated loading placeholder
- `components/PillPlayer.tsx` — floating audio player using expo-speech
- `app/(tabs)/(class)/reader.tsx` — study guide reader screen
- `app/(tabs)/(class)/quiz-screen.tsx` — AI-generated quiz screen

**Modify:**
- `constants/Colors.ts` — new dark-terminal + pearl-white token set
- `app/_layout.tsx` — wrap with ThemeProvider
- `hooks/useThemeColor.ts` — read from ThemeContext instead of system
- `app/(tabs)/(class)/_layout.tsx` — register reader and quiz-screen routes
- `app/(tabs)/(class)/chooseclass.tsx` — full rewrite with new design
- `app/(tabs)/(class)/study.tsx` — full rewrite with tabbed UI

---

## Task 1: Install expo-speech

**Files:**
- Run install command

- [ ] **Step 1: Install expo-speech**

```bash
cd /Users/itwelaibomu/Documents/Projects/Kompasshub/schoolkompass
npx expo install expo-speech
```

Expected output: package added to package.json, no errors.

- [ ] **Step 2: Verify it's in package.json**

```bash
grep expo-speech package.json
```

Expected: `"expo-speech": "~<version>"`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install expo-speech"
```

---

## Task 2: Design System

**Files:**
- Modify: `constants/Colors.ts`
- Create: `contexts/ThemeContext.tsx`
- Modify: `hooks/useThemeColor.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Replace constants/Colors.ts**

Replace the entire file with:

```typescript
// constants/Colors.ts

export const Colors = {
  dark: {
    bg: '#0a0f0a',
    surface: '#121a12',
    border: 'rgba(144,208,96,0.15)',
    accentGreen: '#90d060',
    accentGold: '#e8aa40',
    text: '#f0ead8',
    textMuted: 'rgba(240,234,216,0.4)',
    // legacy keys used by existing hooks/components
    background: '#0a0f0a',
    tint: '#90d060',
    teal: '#90d060',
    fadedGrey: 'rgba(144,208,96,0.08)',
    highlight: 'rgba(144,208,96,0.2)',
    buttonText: '#0a0f0a',
    icon: '#f0ead8',
    tabIconDefault: 'rgba(240,234,216,0.4)',
    tabIconSelected: '#90d060',
    audioControlTextInactive: 'rgba(240,234,216,0.4)',
    audioControlTextActive: '#0a0f0a',
  },
  light: {
    bg: '#f8f5f0',
    surface: '#ffffff',
    border: 'rgba(0,0,0,0.08)',
    accentGreen: '#5eaa64',
    accentGold: '#d46b1a',
    text: '#1a1a1a',
    textMuted: 'rgba(0,0,0,0.4)',
    // legacy keys
    background: '#f8f5f0',
    tint: '#5eaa64',
    teal: '#5eaa64',
    fadedGrey: 'rgba(0,0,0,0.06)',
    highlight: 'rgba(94,170,100,0.15)',
    buttonText: '#ffffff',
    icon: '#1a1a1a',
    tabIconDefault: 'rgba(0,0,0,0.4)',
    tabIconSelected: '#5eaa64',
    audioControlTextInactive: 'rgba(0,0,0,0.4)',
    audioControlTextActive: '#ffffff',
  },
};
```

- [ ] **Step 2: Create contexts/ThemeContext.tsx**

```typescript
// contexts/ThemeContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem('theme').then((saved) => {
      if (saved === 'dark' || saved === 'light') setTheme(saved);
    });
  }, []);

  const toggleTheme = async () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    await AsyncStorage.setItem('theme', next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

- [ ] **Step 3: Update hooks/useThemeColor.ts**

Replace the entire file with:

```typescript
// hooks/useThemeColor.ts
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const { theme } = useTheme();
  const colorFromProps = props[theme];
  if (colorFromProps) return colorFromProps;
  return Colors[theme][colorName];
}
```

- [ ] **Step 4: Update app/_layout.tsx to wrap with ThemeProvider**

Replace the entire file with:

```typescript
// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { ClassProvider } from '@/contexts/ClassContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { theme } = useTheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <NavThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
      <ClassProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade', animationDuration: 250 }} />
          <Stack.Screen name="+not-found" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      </ClassProvider>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add constants/Colors.ts contexts/ThemeContext.tsx hooks/useThemeColor.ts app/_layout.tsx
git commit -m "feat: add design system tokens and theme toggle context"
```

---

## Task 3: Shared Components

**Files:**
- Create: `components/ClassCard.tsx`
- Create: `components/SectionLabel.tsx`
- Create: `components/SkeletonCard.tsx`

- [ ] **Step 1: Create components/SectionLabel.tsx**

```typescript
// components/SectionLabel.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/Colors';

export default function SectionLabel({ children }: { children: string }) {
  const { theme } = useTheme();
  const C = Colors[theme];
  return (
    <Text style={[styles.label, { color: C.textMuted }]}>
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: 'SpaceMono',
    marginBottom: 8,
  },
});
```

- [ ] **Step 2: Create components/SkeletonCard.tsx**

```typescript
// components/SkeletonCard.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/Colors';

export default function SkeletonCard({ height = 80 }: { height?: number }) {
  const { theme } = useTheme();
  const C = Colors[theme];
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        { height, backgroundColor: C.surface, borderColor: C.border, opacity },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
});
```

- [ ] **Step 3: Create components/ClassCard.tsx**

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add components/ClassCard.tsx components/SectionLabel.tsx components/SkeletonCard.tsx
git commit -m "feat: add ClassCard, SectionLabel, SkeletonCard components"
```

---

## Task 4: PillPlayer Component

**Files:**
- Create: `components/PillPlayer.tsx`

- [ ] **Step 1: Create components/PillPlayer.tsx**

```typescript
// components/PillPlayer.tsx
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';

type PlayerState = 'idle' | 'playing';
type SpeedOption = 1 | 1.5 | 2;

const SPEEDS: SpeedOption[] = [1, 1.5, 2];

export default function PillPlayer({ text }: { text: string }) {
  const { theme } = useTheme();
  const C = Colors[theme];
  const insets = useSafeAreaInsets();
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [speed, setSpeed] = useState<SpeedOption>(1);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();

    return () => {
      Speech.stop();
    };
  }, []);

  const cycleSpeed = () => {
    const currentIndex = SPEEDS.indexOf(speed);
    const next = SPEEDS[(currentIndex + 1) % SPEEDS.length];
    setSpeed(next);
    // If currently playing, restart with new speed
    if (playerState === 'playing') {
      Speech.stop();
      Speech.speak(text, {
        rate: next,
        onDone: () => setPlayerState('idle'),
        onStopped: () => setPlayerState('idle'),
      });
    }
  };

  const handlePlayStop = () => {
    if (playerState === 'playing') {
      Speech.stop();
      setPlayerState('idle');
    } else {
      Speech.speak(text, {
        rate: speed,
        onDone: () => setPlayerState('idle'),
        onStopped: () => setPlayerState('idle'),
      });
      setPlayerState('playing');
    }
  };

  return (
    // Full-width absolute wrapper centers the pill reliably
    <View style={[styles.container, { bottom: insets.bottom + 14 }]}>
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: C.surface,
            borderColor: C.accentGreen,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Speed toggle */}
        <Pressable onPress={cycleSpeed} style={styles.speedBtn}>
          <Text style={[styles.speedText, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>
            {speed}x
          </Text>
        </Pressable>

        {/* Play / Stop */}
        <Pressable
          onPress={handlePlayStop}
          style={[styles.playBtn, { backgroundColor: C.accentGreen }]}
        >
          <Text style={[styles.playIcon, { color: C.buttonText }]}>
            {playerState === 'playing' ? '■' : '▶'}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 40,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  speedBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  speedText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 14,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/PillPlayer.tsx
git commit -m "feat: add PillPlayer component with expo-speech"
```

---

## Task 5: Home Screen Rewrite

**Files:**
- Modify: `app/(tabs)/(class)/chooseclass.tsx`

- [ ] **Step 1: Replace app/(tabs)/(class)/chooseclass.tsx**

Replace the entire file with:

```typescript
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
import { useStudyGuidesLocal, useFlashcardSetsLocal } from '@/hooks/useDataFetch';

// We can't call hooks conditionally so we make a helper component per class
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

  return (
    <ClassCard
      name={classItem.name}
      description={classItem.description}
      accentColor={accentColor}
      guideCount={studyGuides.length}
      hasFlashcards={flashcardSets.length > 0}
      onPress={onPress}
      onDelete={onDelete}
    />
  );
}

export default function ChooseClassScreen() {
  const { theme, toggleTheme } = useTheme();
  const C = Colors[theme];
  const { classes, classesLoading, setSelectedClassId, setCurrentStudyGuide, setCurrentClassName, fetchClasses, addClass, deleteClass } = useClass();
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const deleteSlideAnim = useRef(new Animated.Value(0)).current;

  const realClasses = classes.filter((c) => c.id !== '0');

  useEffect(() => {
    setSelectedClassId(null);
    setCurrentStudyGuide(null);
    fetchClasses();
  }, []);

  const showModal = () => {
    setModalVisible(true);
    Animated.spring(slideAnim, { toValue: 1, tension: 65, friction: 11, useNativeDriver: true }).start();
  };

  const hideModal = () => {
    Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start(() => {
      setModalVisible(false);
      setNewClassName('');
      setNewClassDescription('');
    });
  };

  const handleAddClass = async () => {
    if (!newClassName.trim() || !newClassDescription.trim()) return;
    await addClass({ id: Date.now().toString(), name: newClassName.trim(), description: newClassDescription.trim() });
    hideModal();
  };

  const showDeleteModal = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    Animated.spring(deleteSlideAnim, { toValue: 1, tension: 65, friction: 11, useNativeDriver: true }).start();
  };

  const hideDeleteModal = () => {
    Animated.spring(deleteSlideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start(() => setDeleteTarget(null));
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteClass(deleteTarget.id);
      hideDeleteModal();
    }
  };

  const sheetStyle = (anim: Animated.Value) => ({
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }],
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <SectionLabel>My Classes</SectionLabel>
          <View style={styles.headerActions}>
            <Pressable onPress={toggleTheme} style={[styles.iconBtn, { borderColor: C.border }]}>
              <Text style={{ fontSize: 14 }}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
            </Pressable>
            <Pressable onPress={showModal} style={[styles.addBtn, { backgroundColor: C.accentGreen }]}>
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
              style={[styles.emptyCard, { borderColor: C.accentGreen, backgroundColor: C.surface }]}
            >
              <Text style={[styles.emptyPlus, { color: C.accentGreen }]}>+</Text>
              <Text style={[styles.emptyLabel, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>ADD CLASS</Text>
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
      <Modal transparent visible={modalVisible} animationType="none" onRequestClose={hideModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={styles.overlay} onPress={hideModal}>
            <Animated.View style={[styles.sheet, { backgroundColor: C.surface }, sheetStyle(slideAnim)]}>
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: C.text }]}>Add New Class</Text>
                <Pressable onPress={hideModal}>
                  <Text style={[styles.sheetClose, { color: C.textMuted }]}>×</Text>
                </Pressable>
              </View>
              <View style={styles.sheetBody}>
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: 'SpaceMono' }]}>CLASS NAME</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                  value={newClassName}
                  onChangeText={setNewClassName}
                  placeholder="e.g. Network Security — D315"
                  placeholderTextColor={C.textMuted}
                  autoFocus
                />
                <Text style={[styles.inputLabel, { color: C.textMuted, fontFamily: 'SpaceMono', marginTop: 12 }]}>DESCRIPTION</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                  value={newClassDescription}
                  onChangeText={setNewClassDescription}
                  placeholder="Course code, term, notes..."
                  placeholderTextColor={C.textMuted}
                  multiline
                  numberOfLines={3}
                />
                <Pressable
                  onPress={handleAddClass}
                  style={[styles.submitBtn, { backgroundColor: C.accentGreen, opacity: newClassName.trim() && newClassDescription.trim() ? 1 : 0.4 }]}
                >
                  <Text style={[styles.submitBtnText, { color: C.buttonText }]}>Add Class</Text>
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal transparent visible={!!deleteTarget} animationType="none" onRequestClose={hideDeleteModal}>
        <Pressable style={styles.overlay} onPress={hideDeleteModal}>
          <Animated.View style={[styles.sheet, { backgroundColor: C.surface }, sheetStyle(deleteSlideAnim)]}>
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
              <Pressable onPress={handleDelete} style={[styles.submitBtn, { backgroundColor: '#ff4444' }]}>
                <Text style={[styles.submitBtnText, { color: '#fff' }]}>Yes, Delete</Text>
              </Pressable>
              <Pressable onPress={hideDeleteModal} style={[styles.submitBtn, { backgroundColor: C.fadedGrey, marginTop: 8 }]}>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 8 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 22, fontWeight: '300', lineHeight: 26 },
  list: { flex: 1 },
  emptyCard: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, height: 90, alignItems: 'center', justifyContent: 'center', gap: 4 },
  emptyPlus: { fontSize: 22 },
  emptyLabel: { fontSize: 10, letterSpacing: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
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
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/\(class\)/chooseclass.tsx
git commit -m "feat: redesign home screen with ClassCard and theme toggle"
```

---

## Task 6: Register New Routes

**Files:**
- Modify: `app/(tabs)/(class)/_layout.tsx`

- [ ] **Step 1: Update _layout.tsx to register reader and quiz-screen**

Replace the entire file with:

```typescript
// app/(tabs)/(class)/_layout.tsx
import { Stack } from 'expo-router';

export default function ClassLayout() {
  return (
    <Stack screenOptions={{ gestureEnabled: false, headerShown: false }}>
      <Stack.Screen name="chooseclass" />
      <Stack.Screen name="study" />
      <Stack.Screen name="read-listen" />
      <Stack.Screen name="reader" />
      <Stack.Screen name="quiz-screen" />
    </Stack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/\(class\)/_layout.tsx
git commit -m "feat: register reader and quiz-screen routes"
```

---

## Task 7: Class Detail Screen (Tabbed)

**Files:**
- Modify: `app/(tabs)/(class)/study.tsx`

This is a full rewrite. The file keeps the flashcard logic (FlashcardCard component) but strips all the old layout, replacing it with the tabbed design. The existing `useStudyGuidesLocal`, `useFlashcardSetsLocal`, and `useQuizzesLocal` hooks are used as-is.

- [ ] **Step 1: Replace app/(tabs)/(class)/study.tsx**

Replace the entire file with:

```typescript
// app/(tabs)/(class)/study.tsx
import React, { useRef, useState } from 'react';
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
import Markdown from 'react-native-markdown-display';
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
  const accentIndex = 0; // single class screen — use green by default, callers can pass index if needed
  const accentColor = C.accentGreen;

  const { studyGuides, loading: guidesLoading, addStudyGuide, deleteStudyGuide } = useStudyGuidesLocal(classId);
  const { flashcardSets, loading: flashcardsLoading } = useFlashcardSetsLocal(classId);

  const [activeTab, setActiveTab] = useState<Tab>('guides');
  const [addGuideVisible, setAddGuideVisible] = useState(false);
  const [newGuideTitle, setNewGuideTitle] = useState('');
  const [newGuideContent, setNewGuideContent] = useState('');
  const slideAnim = useRef(new Animated.Value(0)).current;

  const showAddGuide = () => {
    setAddGuideVisible(true);
    Animated.spring(slideAnim, { toValue: 1, tension: 65, friction: 11, useNativeDriver: true }).start();
  };

  const hideAddGuide = () => {
    Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start(() => {
      setAddGuideVisible(false);
      setNewGuideTitle('');
      setNewGuideContent('');
    });
  };

  const handleAddGuide = async () => {
    if (!newGuideTitle.trim() || !newGuideContent.trim()) return;
    const wordCount = newGuideContent.trim().split(/\s+/).length;
    const readMinutes = Math.max(1, Math.round(wordCount / 200));
    await addStudyGuide({
      id: Date.now().toString(),
      title: newGuideTitle.trim(),
      text: newGuideContent.trim(),
      audioFile: null,
      lastModified: new Date().toISOString(),
    });
    hideAddGuide();
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
              {studyGuides.length === 0 ? (
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
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/\(class\)/study.tsx
git commit -m "feat: redesign class detail screen with tabs (guides, flashcards, quiz)"
```

---

## Task 8: Reader Screen

**Files:**
- Create: `app/(tabs)/(class)/reader.tsx`

- [ ] **Step 1: Create app/(tabs)/(class)/reader.tsx**

```typescript
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
  const { currentStudyGuide, selectedClassId } = useClass();

  // Derive accent from class position — default to green
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
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/\(class\)/reader.tsx
git commit -m "feat: add reader screen with markdown display and pill player"
```

---

## Task 9: Quiz Screen

**Files:**
- Create: `app/(tabs)/(class)/quiz-screen.tsx`

- [ ] **Step 1: Create app/(tabs)/(class)/quiz-screen.tsx**

```typescript
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
  answer: string; // one of the option strings
};

type QuizState = 'loading' | 'question' | 'score';

function extractJson(raw: string): QuizQuestion[] {
  // Find the first [...] block in the response
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
  }, []);

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
    setQuizState('loading');
    setError(null);
    if (currentStudyGuide) {
      generateQuestions(currentStudyGuide.text)
        .then((qs) => { setQuestions(qs); setQuizState('question'); })
        .catch((e) => { setError(e.message ?? 'Failed'); setQuizState('question'); });
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
                  { backgroundColor: accentColor, width: `${((currentIndex) / questions.length) * 100}%` },
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
  breakdown: { width: '100%', maxHeight: 240 },
  breakdownRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1 },
  breakdownQ: { flex: 1, fontSize: 13, lineHeight: 18 },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/\(class\)/quiz-screen.tsx
git commit -m "feat: add quiz screen with AI question generation"
```

---

## Final Verification

- [ ] **Run the app**

```bash
cd /Users/itwelaibomu/Documents/Projects/Kompasshub/schoolkompass
npx expo start
```

- [ ] **Smoke test checklist**
  - [ ] Home screen loads with dark background and no white flash
  - [ ] Theme toggle switches dark ↔ light and persists after restart
  - [ ] Add a class — card appears with left accent bar, correct badges
  - [ ] Tap class — navigates to study screen with tabs
  - [ ] Add a study guide — appears in Guides tab with read time
  - [ ] Tap a guide — reader opens with markdown rendered, pill player at bottom
  - [ ] Tap play on pill player — speech starts; tap again to stop
  - [ ] Tap speed toggle — cycles 1x → 1.5x → 2x
  - [ ] Go to Quiz tab — tap a guide → quiz screen loads with spinner, then questions appear
  - [ ] Answer all 10 questions — score screen shows with breakdown
  - [ ] Flashcards tab — existing cards flip correctly with new styling

- [ ] **Final commit**

```bash
git add -A
git commit -m "chore: post-verification cleanup"
```

# Redesign Pass 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take School Kompass from "flat and static" to "crafted" — real typographic identity, proper error/success color tokens, a small shared UI kit that ends per-screen style duplication, and motion/feedback across all 5 screens — without touching the already-good green/gold nature palette in `constants/Colors.ts`.

**Architecture:** Add three Google Fonts loaded via `expo-font` (matching the existing `SpaceMono` loading pattern in `app/_layout.tsx`), add `error`/`success` tokens to the existing `Colors` object, extract a small `components/ui/` kit (`Button`, `Card`, `Pill`, `ProgressBar`, `Sheet`) that codifies patterns already duplicated ad hoc across screens, then apply all of it screen-by-screen.

**Tech Stack:** `expo-font` (already installed), new: `@expo-google-fonts/instrument-serif`, `@expo-google-fonts/hanken-grotesk`, `@expo-google-fonts/jetbrains-mono`.

## Global Constraints

- This repo has **zero existing automated tests** for React Native screens/components (confirmed: no `*.test.*` files, no `@testing-library/react-native`). Every task in this plan is UI work with no meaningful pure logic to isolate, so **every task uses a manual verification checklist** run against the real app (`skool`) instead of an automated test — consistent with this codebase's existing convention.
- Do **not** touch `constants/Colors.ts`'s existing green/gold/bg/surface values — only add new `error`/`success` keys alongside them.
- Do **not** touch the TrackPlayer sleep-timer warnings in `read-listen.tsx` — confirmed benign upstream package bug in a prior session, explicitly out of scope.
- Follow the existing theming pattern exactly: `const { theme } = useTheme()` from `@/contexts/ThemeContext`, then `const C = Colors[theme]` — do not introduce `useColorScheme` or any other theming mechanism.
- Existing `fontFamily: 'SpaceMono'` usages for uppercase labels/metadata (course codes, badge text, stat labels) are replaced with `'JetBrainsMono_400Regular'` — same visual role (technical/monospace accent), upgraded font.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `constants/Colors.ts` | Modify | Add `error`/`success` tokens (light + dark) |
| `constants/theme.ts` | Delete | Confirmed dead code — not imported anywhere, superseded by `Colors.ts` |
| `app/_layout.tsx` | Modify | Load the 3 new font families alongside existing `SpaceMono` |
| `components/ui/Button.tsx` | New | Shared button with built-in press feedback (scale-down) |
| `components/ui/Card.tsx` | New | Shared card surface with press feedback |
| `components/ui/Pill.tsx` | New | Small pill/badge, used for stat chips and content-type badges |
| `components/ui/ProgressBar.tsx` | New | Shared progress bar (quiz progress today, reusable elsewhere) |
| `components/ui/Sheet.tsx` | New | Codifies the existing ad-hoc slide-up spring animation into one component |
| `components/ClassCard.tsx` | Modify | Real hierarchy: display-font name, new `Pill` for stat chips |
| `app/(tabs)/(class)/study.tsx` | Modify | Migrate Add Flashcards/Add Guide sheets to `Sheet`/`Button`; flashcard flip polish |
| `app/(tabs)/(class)/quiz-screen.tsx` | Modify | Replace inline hex with `error`/`success` tokens; score-reveal animation |
| `app/(tabs)/(class)/reader.tsx` | Modify | Apply new display/body fonts + line-height to `markdownStyles` |
| `app/(tabs)/(class)/read-listen.tsx` | Modify | Font/spacing polish pass on `PillPlayer` and surrounding layout only |

---

### Task 1: Color tokens + dead code cleanup

**Files:**
- Modify: `constants/Colors.ts`
- Delete: `constants/theme.ts`

**Interfaces:**
- Produces: `Colors.dark.error`, `Colors.dark.success`, `Colors.light.error`, `Colors.light.success` (each a hex string). Consumed by Task 6 (`quiz-screen.tsx`) and available to any future screen.

- [ ] **Step 1: Add the tokens**

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
    error: '#e05c5c',
    success: '#4caf50',
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
    error: '#c94c4c',
    success: '#3d8b42',
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

Note: `error`/`success` values in `dark` reuse the exact hex the current codebase already uses ad hoc (`'#e05c5c'` wrong, `'#4caf50'` correct, from `quiz-screen.tsx`) — this is a rename/centralization, not a visual change, for dark mode. Light mode gets slightly deeper, less neon versions of the same hues for adequate contrast against the cream background.

- [ ] **Step 2: Delete the dead file**

```bash
rm constants/theme.ts
grep -rn "constants/theme" app/ components/ hooks/ contexts/ constants/ 2>/dev/null
```
Expected: the `grep` returns nothing (confirms no import references it before deleting — if it does return a match, stop and investigate before deleting).

- [ ] **Step 3: Manual verification**

```bash
npx tsc --noEmit
```
Expected: no new errors (confirms nothing was importing `theme.ts`).

- [ ] **Step 4: Commit**

```bash
git add constants/Colors.ts
git rm constants/theme.ts
git commit -m "feat: add error/success color tokens, remove dead theme.ts"
```

---

### Task 2: Load custom fonts

**Files:**
- Modify: `app/_layout.tsx`

**Interfaces:**
- Produces: fonts available app-wide by family name — `'InstrumentSerif_400Regular'` (display), `'HankenGrotesk_400Regular'` / `'HankenGrotesk_600SemiBold'` (body), `'JetBrainsMono_400Regular'` (monospace accent). Consumed by every subsequent task in this plan.

- [ ] **Step 1: Install the font packages**

```bash
npx expo install @expo-google-fonts/instrument-serif @expo-google-fonts/hanken-grotesk @expo-google-fonts/jetbrains-mono
```

- [ ] **Step 2: Load them alongside the existing `SpaceMono` font**

```typescript
// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { HankenGrotesk_400Regular, HankenGrotesk_600SemiBold } from '@expo-google-fonts/hanken-grotesk';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

import { ClassProvider } from '@/contexts/ClassContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

SplashScreen.preventAutoHideAsync();

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

function AppContent() {
  const { theme } = useTheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    InstrumentSerif_400Regular,
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    JetBrainsMono_400Regular,
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
    <ConvexProvider client={convex}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ConvexProvider>
  );
}
```

- [ ] **Step 3: Manual verification**

```bash
skool
```
Expected: app launches with no red-screen font-loading errors. Temporarily set any `<Text>` in `chooseclass.tsx` to `style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 24 }}` and confirm it visibly renders in the serif font, then revert the temporary change (real usage comes in later tasks).

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx package.json package-lock.json
git commit -m "feat: load Instrument Serif, Hanken Grotesk, and JetBrains Mono fonts"
```

---

### Task 3: Shared `components/ui/` kit

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Pill.tsx`
- Create: `components/ui/ProgressBar.tsx`
- Create: `components/ui/Sheet.tsx`

**Interfaces:**
- Produces: `<Button label={string} onPress={() => void} variant?: "solid" | "muted", accentColor?: string, disabled?: boolean />`
- Produces: `<Card>{children}</Card>` — `Pressable` wrapper with press-scale feedback, `C.surface`/`C.border` styling baked in.
- Produces: `<Pill label={string} active?: boolean, accentColor?: string />`
- Produces: `<ProgressBar progress={number /* 0-1 */} accentColor?: string />`
- Produces: `<Sheet visible={boolean} onClose={() => void}>{children}</Sheet>` — codifies the `tension: 65, friction: 11` spring already used ad hoc in `study.tsx`.
- Consumed by Tasks 4-6.

- [ ] **Step 1: `components/ui/Button.tsx`**

```tsx
// components/ui/Button.tsx
import { useRef } from "react";
import { Animated, Pressable, Text, StyleSheet, GestureResponderEvent } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Colors } from "@/constants/Colors";

type ButtonProps = {
  label: string;
  onPress: (e: GestureResponderEvent) => void;
  variant?: "solid" | "muted";
  accentColor?: string;
  disabled?: boolean;
};

export function Button({ label, onPress, variant = "solid", accentColor, disabled }: ButtonProps) {
  const { theme } = useTheme();
  const C = Colors[theme];
  const scale = useRef(new Animated.Value(1)).current;
  const resolvedAccent = accentColor ?? C.accentGreen;

  const pressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  const backgroundColor = variant === "solid" ? resolvedAccent : C.fadedGrey;
  const textColor = variant === "solid" ? C.buttonText : C.text;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        style={[styles.btn, { backgroundColor, opacity: disabled ? 0.4 : 1 }]}
      >
        <Text style={[styles.label, { color: textColor, fontFamily: "HankenGrotesk_600SemiBold" }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  label: { fontSize: 15 },
});
```

- [ ] **Step 2: `components/ui/Card.tsx`**

```tsx
// components/ui/Card.tsx
import { useRef, ReactNode } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Colors } from "@/constants/Colors";

type CardProps = { children: ReactNode; onPress?: () => void };

export function Card({ children, onPress }: CardProps) {
  const { theme } = useTheme();
  const C = Colors[theme];
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => onPress && Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () => onPress && Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
});
```

- [ ] **Step 3: `components/ui/Pill.tsx`**

```tsx
// components/ui/Pill.tsx
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Colors } from "@/constants/Colors";

type PillProps = { label: string; active?: boolean; accentColor?: string };

export function Pill({ label, active, accentColor }: PillProps) {
  const { theme } = useTheme();
  const C = Colors[theme];
  const resolvedAccent = accentColor ?? C.accentGreen;
  const backgroundColor = active ? `${resolvedAccent}18` : C.fadedGrey;
  const color = active ? resolvedAccent : C.textMuted;

  return (
    <View style={[styles.pill, { backgroundColor }]}>
      <Text style={[styles.label, { color, fontFamily: "JetBrainsMono_400Regular" }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  label: { fontSize: 9, letterSpacing: 0.5 },
});
```

- [ ] **Step 4: `components/ui/ProgressBar.tsx`**

```tsx
// components/ui/ProgressBar.tsx
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Colors } from "@/constants/Colors";

type ProgressBarProps = { progress: number; accentColor?: string };

export function ProgressBar({ progress, accentColor }: ProgressBarProps) {
  const { theme } = useTheme();
  const C = Colors[theme];
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={[styles.track, { backgroundColor: C.border }]}>
      <View style={[styles.fill, { backgroundColor: accentColor ?? C.accentGreen, width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
});
```

- [ ] **Step 5: `components/ui/Sheet.tsx`**

```tsx
// components/ui/Sheet.tsx
import { useEffect, useRef, ReactNode } from "react";
import { Animated, Modal, Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Colors } from "@/constants/Colors";

type SheetProps = { visible: boolean; onClose: () => void; children: ReactNode };

/** Codifies the tension:65/friction:11 spring already used ad hoc across study.tsx's sheets. */
export function Sheet({ visible, onClose, children }: SheetProps) {
  const { theme } = useTheme();
  const C = Colors[theme];
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slideAnim.stopAnimation();
    Animated.spring(slideAnim, { toValue: visible ? 1 : 0, tension: 65, friction: 11, useNativeDriver: true }).start();
  }, [visible]);

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[styles.sheet, { backgroundColor: C.surface, transform: [{ translateY }] }]}
          onStartShouldSetResponder={() => true}
        >
          {children}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" },
});
```

- [ ] **Step 6: Manual verification**

Temporarily render `<Button label="Test" onPress={() => {}} />`, `<Pill label="TEST" active />`, `<ProgressBar progress={0.6} />` in any screen and confirm they render with correct theming and press feedback (button visibly scales down on press-in). Verify `Sheet` by wrapping it around any placeholder content with a toggled `visible` boolean and confirming it slides up/down smoothly.

- [ ] **Step 7: Commit**

```bash
git add components/ui/Button.tsx components/ui/Card.tsx components/ui/Pill.tsx components/ui/ProgressBar.tsx components/ui/Sheet.tsx
git commit -m "feat: add shared UI kit (Button, Card, Pill, ProgressBar, Sheet)"
```

---

### Task 4: Redesign `ClassCard`

**Files:**
- Modify: `components/ClassCard.tsx`

**Interfaces:**
- Consumes: `Pill` (Task 3).

- [ ] **Step 1: Apply display font to the class name, swap badges/description to `Pill` + `JetBrainsMono_400Regular`**

```tsx
// components/ClassCard.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/Colors';
import { Pill } from '@/components/ui/Pill';

type ClassCardProps = {
  name: string;
  description: string;
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
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.titleBlock}>
            <Text style={[styles.name, { color: C.text, fontFamily: 'InstrumentSerif_400Regular' }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.description, { color: C.textMuted, fontFamily: 'HankenGrotesk_400Regular' }]} numberOfLines={1}>
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
  card: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  accentBar: { width: 4 },
  body: { flex: 1, padding: 14, gap: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  titleBlock: { flex: 1, gap: 3 },
  name: { fontSize: 20 },
  description: { fontSize: 12, letterSpacing: 0.2 },
  chip: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 9, letterSpacing: 0.5 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badges: { flexDirection: 'row', gap: 4 },
  trash: { padding: 4 },
});
```

- [ ] **Step 2: Manual verification**

```bash
skool
```
Expected: on the class list screen, class names render in the serif display font at a visibly larger size, descriptions are readable body text, and the three content-type badges render via `Pill` with identical active/inactive coloring to before (accent-tinted when active, muted when not).

- [ ] **Step 3: Commit**

```bash
git add components/ClassCard.tsx
git commit -m "feat: redesign ClassCard with display typography and shared Pill component"
```

---

### Task 5: Migrate `study.tsx` sheets + flashcard polish

**Files:**
- Modify: `app/(tabs)/(class)/study.tsx`

**Interfaces:**
- Consumes: `Sheet`, `Button` (Task 3).

- [ ] **Step 1: Replace the Add Flashcards sheet's `Animated.View` + manual spring wiring with `<Sheet>`**

Locate the existing `addFlashcardsVisible` / `flashcardSlideAnim` / `showAddFlashcards` / `hideAddFlashcards` block (around line 316-333 per the current file) and the corresponding JSX that renders the animated sheet. Replace the manual `Animated.View` wrapper with:

```tsx
<Sheet visible={addFlashcardsVisible} onClose={hideAddFlashcards}>
  {/* existing sheet content: title input, source text input, generate button, error/log display */}
</Sheet>
```

Remove the now-unused `flashcardSlideAnim` ref and its `Animated.spring(...)` calls in `showAddFlashcards`/`hideAddFlashcards` — `Sheet` owns that animation internally now; `showAddFlashcards`/`hideAddFlashcards` become simple `setAddFlashcardsVisible(true/false)` calls (plus their existing state-reset side effects like clearing `flashcardError`/`generateLog`).

- [ ] **Step 2: Repeat for the Add Guide sheet**

Same transformation for `addGuideVisible`/`slideAnim`/`showAddGuide`/`hideAddGuide`.

- [ ] **Step 3: Replace the sheets' submit buttons with `<Button>`**

Wherever the Add Flashcards / Add Guide sheets render their primary submit action (e.g. a `TouchableOpacity` with `styles.submitBtn`), replace with:

```tsx
<Button label="Generate" onPress={generateFlashcards} disabled={generatingFlashcards || !flashcardSourceText.trim()} accentColor={accentColor} />
```

(matching signature/variable names to whatever the existing submit handler and disabled-condition are for that specific sheet).

- [ ] **Step 4: Apply body font to flashcard question/answer text**

In the flashcard flip-card rendering (front/back faces), add `fontFamily: 'HankenGrotesk_400Regular'` to the question and answer `<Text>` styles.

- [ ] **Step 5: Manual verification**

```bash
skool
```
Expected: Add Flashcards and Add Guide sheets slide up/down identically to before (same spring feel), their submit buttons show press-scale feedback, flashcard text renders in the new body font, and generating/saving still works end-to-end (paste text → generate → new set appears).

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/(class)/study.tsx"
git commit -m "feat: migrate study.tsx sheets to shared Sheet/Button components, apply body font"
```

---

### Task 6: Redesign `quiz-screen.tsx`

**Files:**
- Modify: `app/(tabs)/(class)/quiz-screen.tsx`

**Interfaces:**
- Consumes: `Colors.dark/light.error`, `Colors.dark/light.success` (Task 1), `ProgressBar` (Task 3).

- [ ] **Step 1: Replace inline hex with theme tokens**

```typescript
// was: const borderColor = showCorrect ? '#4caf50' : showWrong ? '#e05c5c' : isSelected ? accentColor : C.border;
const borderColor = showCorrect ? C.success : showWrong ? C.error : isSelected ? accentColor : C.border;
const textColor = showCorrect ? C.success : showWrong ? C.error : isSelected ? accentColor : C.text;
const bgColor = showCorrect ? `${C.success}18` : showWrong ? `${C.error}18` : isSelected ? accentColor + '18' : C.surface;
```

```typescript
// was: <Text style={[styles.errorText, { color: '#ff4444' }]}>{error}</Text>
<Text style={[styles.errorText, { color: C.error }]}>{error}</Text>
```

```typescript
// was: <Text style={[styles.statValue, { color: '#e05c5c' }]}>{questions.length - score}</Text>
<Text style={[styles.statValue, { color: C.error }]}>{questions.length - score}</Text>
```

- [ ] **Step 2: Swap the manual progress-bar `View` for `ProgressBar`**

```tsx
// was:
// <View style={[styles.progressBar, { backgroundColor: C.border }]}>
//   <View style={[styles.progressFill, { backgroundColor: accentColor, width: `${((currentIndex + 1) / questions.length) * 100}%` }]} />
// </View>
<ProgressBar progress={(currentIndex + 1) / questions.length} accentColor={accentColor} />
```

- [ ] **Step 3: Add a score-reveal animation**

At the top of the component, add an animated value that drives the score screen's entrance:

```typescript
const scoreRevealAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  if (quizState === 'score') {
    scoreRevealAnim.setValue(0);
    Animated.spring(scoreRevealAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
  }
}, [quizState]);
```

Wrap the score screen's top section in the animation:

```tsx
{quizState === 'score' && (
  <ScrollView contentContainerStyle={styles.scoreContainer}>
    <Animated.View
      style={{
        opacity: scoreRevealAnim,
        transform: [{ scale: scoreRevealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
      }}
    >
      <Text style={[styles.scoreBig, { color: accentColor }]}>
        {score} / {questions.length}
      </Text>
      <Text style={[styles.scoreLabel, { color: C.text, fontFamily: 'SpaceMono' }]}>
        {score === questions.length ? 'PERFECT ⚡' : score >= questions.length * 0.7 ? 'NICE WORK' : 'KEEP STUDYING'}
      </Text>
    </Animated.View>

    {/* stats row, breakdown — unchanged */}
  </ScrollView>
)}
```

Add `import { Animated } from 'react-native';` and `import { useEffect, useRef } from 'react';` to the top of the file if not already present (this file already imports from `react-native` and `react` — merge into the existing import statements rather than adding duplicates).

- [ ] **Step 4: Manual verification**

```bash
skool
```
Expected: taking a quiz shows correct/incorrect answer highlighting in the same red/green hues as before (values are identical, just centralized), the progress bar at the top renders identically via the new component, and finishing a quiz shows the score number/label scaling and fading in rather than appearing instantly.

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/(class)/quiz-screen.tsx"
git commit -m "feat: use error/success color tokens and add score-reveal animation to quiz screen"
```

---

### Task 7: Redesign `reader.tsx` typography

**Files:**
- Modify: `app/(tabs)/(class)/reader.tsx`

**Interfaces:**
- None new — applies fonts loaded in Task 2 to the existing `react-native-markdown-display` style object.

- [ ] **Step 1: Update `markdownStyles`**

Find the existing `markdownStyles` object passed to `<Markdown style={markdownStyles}>{currentStudyGuide.text}</Markdown>` and update body/heading typography:

```typescript
const markdownStyles = {
  body: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 17, lineHeight: 28.9, color: C.text },
  heading1: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 28, color: accentColor, marginTop: 16, marginBottom: 8 },
  heading2: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 22, color: accentColor, marginTop: 14, marginBottom: 6 },
  heading3: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 19, color: accentColor, marginTop: 12, marginBottom: 4 },
  code_inline: { fontFamily: 'JetBrainsMono_400Regular', backgroundColor: C.surface, color: accentColor, paddingHorizontal: 4, borderRadius: 3 },
  code_block: { fontFamily: 'JetBrainsMono_400Regular', backgroundColor: C.surface, color: accentColor, padding: 12, borderRadius: 8 },
  fence: { fontFamily: 'JetBrainsMono_400Regular', backgroundColor: C.surface, color: accentColor, padding: 12, borderRadius: 8 },
  strong: { color: C.text, fontFamily: 'HankenGrotesk_600SemiBold' },
  image: { borderRadius: 8, marginVertical: 8 },
};
```

(1.7 line-height ratio on 17px body per the original April spec — 17 × 1.7 = 28.9.) `image` style rounds corners on any diagram embedded via the document-ingestion plan's markdown image syntax — this reader screen needs no additional changes to display those; `react-native-markdown-display` renders `![alt](url)` automatically.

- [ ] **Step 2: Manual verification**

```bash
skool
```
Expected: opening a study guide shows headings in the serif display font (accent-colored), body text in the new sans body font at a visibly more generous line-height, and any inline code/SQL snippet rendered in the new monospace font with a subtle background. If a guide was generated via the document-ingestion plan with an embedded diagram, confirm the image renders with rounded corners inline.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/(class)/reader.tsx"
git commit -m "feat: apply new typography to guide reader markdown styles"
```

---

### Task 8: Polish `read-listen.tsx`

**Files:**
- Modify: `app/(tabs)/(class)/read-listen.tsx`

**Interfaces:**
- None new — typography/spacing polish only, matching Task 7's font choices.

- [ ] **Step 1: Apply the same `markdownStyles` typography treatment as Task 7 (this screen renders its own copy of the guide text alongside the PillPlayer, per the April spec's Screen 3 design)**

Match the same field-by-field font updates as Task 7's Step 1 wherever this screen defines its own text styling for the guide content being read aloud.

- [ ] **Step 2: Apply `JetBrainsMono_400Regular` to the PillPlayer's speed toggle label**

In `components/PillPlayer.tsx`, find the speed-toggle `<Text>` (`1x` / `1.5x` / `2x`) and add `fontFamily: 'JetBrainsMono_400Regular'`.

- [ ] **Step 3: Manual verification**

```bash
skool
```
Expected: the read-along screen's text matches the Reader screen's new typography, and the speed toggle pill renders in the monospace font. Confirm playback, pause, and speed-cycling still work exactly as before (the `TrackPlayerModule` sleep-timer warnings in the console are expected and out of scope — confirmed benign in a prior debugging session).

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/(class)/read-listen.tsx" components/PillPlayer.tsx
git commit -m "feat: apply typography polish to read-listen screen and PillPlayer"
```

---

## Self-Review

**Spec coverage:** Typography (Instrument Serif / Hanken Grotesk / JetBrains Mono) applied across all 5 screens (Tasks 4, 5, 6 implicitly via shared components, 7, 8) ✓. Error/success tokens replacing inline hex (Task 1, applied in Task 6) ✓. Shared UI kit reducing per-screen duplication (Task 3, consumed by Tasks 4-6) ✓. Motion: press feedback via `Button`/`Card` (Task 3), codified sheet spring (Task 3, applied Task 5), score-reveal animation (Task 6) ✓. All 5 screens covered in one pass (Tasks 4-8) ✓. Dead `theme.ts` removed (Task 1) ✓. Existing green/gold palette untouched (Global Constraints, Task 1 only adds new keys) ✓.

**Placeholder scan:** No TBD/TODO. Task 5's sheet-migration steps reference "existing sheet content" generically because the exact JSX inside each sheet (title inputs, per-field labels) is business content unrelated to the redesign itself — the animation/button *wrapper* changes are fully specified in code; only the untouched inner form fields are left as-is by description, which is correct (they're not being modified).

**Type consistency:** `Colors.dark.error`/`.success` (Task 1) match usage in Task 6. `Button`/`Card`/`Pill`/`ProgressBar`/`Sheet` prop names in Task 3 match every call site in Tasks 4-6.

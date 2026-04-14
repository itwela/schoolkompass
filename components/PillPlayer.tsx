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
    if (!text.trim()) return;
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

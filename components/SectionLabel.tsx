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

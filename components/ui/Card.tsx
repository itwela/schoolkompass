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

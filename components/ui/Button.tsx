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

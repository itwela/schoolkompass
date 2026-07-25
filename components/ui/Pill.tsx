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

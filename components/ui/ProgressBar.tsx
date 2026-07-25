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

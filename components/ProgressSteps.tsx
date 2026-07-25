// components/ProgressSteps.tsx
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";

type ProgressStepsProps = {
  steps: string[];
  currentStep: string | null;
};

export function ProgressSteps({ steps, currentStep }: ProgressStepsProps) {
  const { theme } = useTheme();
  const C = Colors[theme];
  const currentIndex = currentStep ? steps.indexOf(currentStep) : -1;

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isDone = currentIndex > index || currentIndex === -1;
        const isActive = index === currentIndex;
        const color = isActive ? C.accentGreen : isDone ? C.text : C.textMuted;
        return (
          <View key={step} style={styles.row}>
            <Text style={[styles.marker, { color }]}>
              {isDone && currentIndex !== -1 ? "✓" : isActive ? "●" : "○"}
            </Text>
            <Text style={[styles.label, { color }]}>{step}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  marker: { fontSize: 14, width: 16, textAlign: "center" },
  label: { fontSize: 13, fontFamily: "HankenGrotesk_400Regular" },
});

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

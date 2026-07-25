// components/ui/Sheet.tsx
import { useEffect, useRef, useState, ReactNode } from "react";
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Colors } from "@/constants/Colors";

type SheetProps = { visible: boolean; onClose: () => void; children: ReactNode };

/** Codifies the tension:65/friction:11 spring already used ad hoc across study.tsx's sheets. */
export function Sheet({ visible, onClose, children }: SheetProps) {
  const { theme } = useTheme();
  const C = Colors[theme];
  const slideAnim = useRef(new Animated.Value(0)).current;
  // Keeps the Modal mounted until the closing spring's callback fires — RN's Modal
  // unmounts itself the instant `visible` goes false, which would otherwise cut the
  // close animation off before it can play.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    slideAnim.stopAnimation();
    if (visible) {
      setMounted(true);
      Animated.spring(slideAnim, { toValue: 1, tension: 65, friction: 11, useNativeDriver: true }).start();
    } else {
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start(({ finished }) => {
        // If this close was interrupted (e.g. a reopen mid-animation stopped it early),
        // `finished` is false — don't unmount out from under the new opening spring.
        if (finished) setMounted(false);
      });
    }
  }, [visible]);

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Animated.View
            style={[styles.sheet, { backgroundColor: C.surface, transform: [{ translateY }] }]}
            onStartShouldSetResponder={() => true}
          >
            {children}
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" },
});

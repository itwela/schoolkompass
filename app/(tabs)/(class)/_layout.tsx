// app/(tabs)/(class)/_layout.tsx
import { Stack } from 'expo-router';

export default function ClassLayout() {
  return (
    <Stack screenOptions={{ gestureEnabled: false, headerShown: false }}>
      <Stack.Screen name="chooseclass" />
      <Stack.Screen name="study" />
      <Stack.Screen name="reader" />
      <Stack.Screen name="quiz-screen" />
    </Stack>
  );
}

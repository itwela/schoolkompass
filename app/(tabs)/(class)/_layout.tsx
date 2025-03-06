import { Stack } from 'expo-router';

export default function ClassLayout() {
  return (
    <Stack
    screenOptions={{
      gestureEnabled: false,
    }}>
      <Stack.Screen name="chooseclass" options={{ headerShown: false }} />
      <Stack.Screen name="study" options={{ headerShown: false }} />
      <Stack.Screen name="read-listen" options={{ headerShown: false }} />
    </Stack>
  );
}
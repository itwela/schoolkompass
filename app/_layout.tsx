// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { ClassProvider } from '@/contexts/ClassContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { theme } = useTheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <NavThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
      <ClassProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade', animationDuration: 250 }} />
          <Stack.Screen name="+not-found" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      </ClassProvider>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

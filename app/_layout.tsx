// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { HankenGrotesk_400Regular, HankenGrotesk_600SemiBold } from '@expo-google-fonts/hanken-grotesk';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

import { ClassProvider } from '@/contexts/ClassContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

SplashScreen.preventAutoHideAsync();

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

function AppContent() {
  const { theme } = useTheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    InstrumentSerif_400Regular,
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    JetBrainsMono_400Regular,
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
    <ConvexProvider client={convex}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ConvexProvider>
  );
}

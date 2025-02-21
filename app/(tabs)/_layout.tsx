import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useClass } from '@/contexts/ClassContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { currentStudyGuide } = useClass();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        // tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            bottom: 20,
            elevation: 0,
            borderRadius: 15,
            height: 70,
            display: currentStudyGuide ? 'none' : 'flex',
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            marginHorizontal: 20,
            width: '90%',
            alignSelf: 'center',
            left: '5%',
          },
          default: {
            position: 'absolute',
            bottom: 20,
            elevation: 8,
            borderRadius: 15,
            height: 70,
            display: currentStudyGuide ? 'none' : 'flex',
            marginHorizontal: 20,
            width: '90%',
            alignSelf: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            left: '5%',
          },
        }),
        tabBarInactiveTintColor: '#4A4A4A',
        tabBarActiveTintColor: '#4A4A4A',
      }}>
      <Tabs.Screen
        name="(class)"
        
        options={{
          title: 'Study',
          tabBarStyle: {
            paddingTop: 12,
          },
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="book.fill" color={"#007AFF"} />,
        }}
      />
    </Tabs>
  );
}

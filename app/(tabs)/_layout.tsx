import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import ProtectedRoute from '../ProtectedRoute';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <ProtectedRoute>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: {
            backgroundColor: Colors[colorScheme ?? 'light'].background,
          },
          tabBarShowLabel: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: () => <IconSymbol size={28} name="house.fill" color={Colors[colorScheme ?? 'light'].tint} />,
          }}
        />
        <Tabs.Screen
          name="expense"
          options={{
            title: 'Expenses',
            tabBarIcon: () => <IconSymbol size={28} name="creditcard.fill" color={Colors[colorScheme ?? 'light'].tint} />,
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan',
            tabBarIcon: () => <IconSymbol size={28} name="camera.fill" color={Colors[colorScheme ?? 'light'].tint} />,
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: () => <IconSymbol size={28} name="chart.bar.fill" color={Colors[colorScheme ?? 'light'].tint} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: () => <IconSymbol size={28} name="gear" color={Colors[colorScheme ?? 'light'].tint} />,
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}

import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import ProtectedRoute from '../ProtectedRoute';

export default function TabLayout() {
  const colorScheme = useAppColorScheme();

  return (
    <ProtectedRoute>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tabIconSelected,
          tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: {
            backgroundColor: Colors[colorScheme ?? 'light'].background,
            borderTopWidth: 1,
            borderTopColor: Colors[colorScheme ?? 'light'].tabBarBorder,
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          tabBarShowLabel: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <IconSymbol 
                size={28} 
                name="house.fill" 
                color={focused ? Colors[colorScheme ?? 'light'].tabIconSelected : Colors[colorScheme ?? 'light'].tabIconDefault} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="expense"
          options={{
            title: 'Expenses',
            tabBarIcon: ({ focused }) => (
              <IconSymbol 
                size={28} 
                name="creditcard.fill" 
                color={focused ? Colors[colorScheme ?? 'light'].tabIconSelected : Colors[colorScheme ?? 'light'].tabIconDefault} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan',
            tabBarIcon: ({ focused }) => (
              <IconSymbol 
                size={28} 
                name="camera.fill" 
                color={focused ? Colors[colorScheme ?? 'light'].tabIconSelected : Colors[colorScheme ?? 'light'].tabIconDefault} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ focused }) => (
              <IconSymbol 
                size={28} 
                name="chart.bar.fill" 
                color={focused ? Colors[colorScheme ?? 'light'].tabIconSelected : Colors[colorScheme ?? 'light'].tabIconDefault} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ focused }) => (
              <IconSymbol 
                size={28} 
                name="gear" 
                color={focused ? Colors[colorScheme ?? 'light'].tabIconSelected : Colors[colorScheme ?? 'light'].tabIconDefault} 
              />
            ),
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}

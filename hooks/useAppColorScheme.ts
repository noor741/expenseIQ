import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ColorScheme = 'light' | 'dark' | null;
type ThemeMode = 'light' | 'dark' | 'system';

// Global state to track theme changes
let themeChangeListeners: Set<() => void> = new Set();

export function notifyThemeChange() {
  themeChangeListeners.forEach(listener => listener());
}

export function useAppColorScheme(): ColorScheme {
  const systemColorScheme = useSystemColorScheme();
  const [appColorScheme, setAppColorScheme] = useState<ColorScheme>(systemColorScheme ?? 'light');

  const loadAppTheme = async () => {
    try {
      const themeMode = await AsyncStorage.getItem('themeMode');
      
      if (themeMode !== null) {
        const mode = themeMode as ThemeMode;
        
        if (mode === 'system') {
          setAppColorScheme(systemColorScheme ?? 'light');
        } else {
          setAppColorScheme(mode);
        }
      } else {
        // If no app setting, fall back to system
        setAppColorScheme(systemColorScheme ?? 'light');
      }
    } catch (error) {
      console.error('Error loading app theme:', error);
      setAppColorScheme(systemColorScheme ?? 'light');
    }
  };

  useEffect(() => {
    loadAppTheme();

    // Add listener for theme changes
    themeChangeListeners.add(loadAppTheme);
    
    return () => {
      themeChangeListeners.delete(loadAppTheme);
    };
  }, [systemColorScheme]);

  return appColorScheme;
}

// Hook to get the current theme mode setting
export function useThemeMode(): [ThemeMode, (mode: ThemeMode) => Promise<void>] {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const mode = await AsyncStorage.getItem('themeMode');
        setThemeModeState((mode as ThemeMode) || 'system');
      } catch (error) {
        console.error('Error loading theme mode:', error);
      }
    };

    loadThemeMode();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('themeMode', mode);
      setThemeModeState(mode);
      notifyThemeChange();
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  return [themeMode, setThemeMode];
}

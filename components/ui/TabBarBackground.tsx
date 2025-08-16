import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { View } from 'react-native';

// Tab bar background for web and Android with dark mode support
export default function TabBarBackground() {
  const colorScheme = useAppColorScheme();
  
  return (
    <View 
      style={{ 
        backgroundColor: Colors[colorScheme ?? 'light'].background,
        flex: 1,
      }} 
    />
  );
}

export function useBottomTabOverflow() {
  return 0;
}

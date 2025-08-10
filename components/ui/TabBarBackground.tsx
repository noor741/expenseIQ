import { View } from 'react-native';

// Simple tab bar background for web and Android
export default function TabBarBackground() {
  return <View style={{ backgroundColor: 'transparent' }} />;
}

export function useBottomTabOverflow() {
  return 0;
}

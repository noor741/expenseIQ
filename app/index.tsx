import { isAuthenticated } from '@/lib/supabase';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function InitialRoute() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const authenticated = await isAuthenticated();
        
        // Check if we're in an auth route
        const inAuthGroup = segments[0] === '(auth)';
        
        if (authenticated && inAuthGroup) {
          // User is authenticated but on auth screen, redirect to main app
          router.replace('/(tabs)');
        } else if (!authenticated && !inAuthGroup) {
          // User is not authenticated but not on auth screen, redirect to login
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // If there's an error, default to login
        router.replace('/(auth)/login');
      }
    };

    checkAuthAndRedirect();
  }, []);

  // Show loading screen while checking authentication
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

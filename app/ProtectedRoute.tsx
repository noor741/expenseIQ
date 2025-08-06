import { useAuth } from '@/context/AuthContext';
import { Slot, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) return null;
  return <Slot />;
}

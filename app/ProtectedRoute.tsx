import { useAuth } from '@/context/AuthContext';
import { Slot } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If no user, just return null and let the main app handle routing
  if (!user) {
    return null;
  }

  return children ? <>{children}</> : <Slot />;
}

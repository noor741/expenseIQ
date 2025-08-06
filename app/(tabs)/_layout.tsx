import React from 'react';

import { useColorScheme } from '@/hooks/useColorScheme';
import ProtectedRoute from '../ProtectedRoute';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <ProtectedRoute />
  );
}

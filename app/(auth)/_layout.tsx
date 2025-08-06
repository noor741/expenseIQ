import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="login" 
        options={{ 
          title: 'Login',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="forgot-password" 
        options={{ 
          title: 'Forgot Password',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="reset-password" 
        options={{ 
          title: 'Reset Password',
          headerShown: false 
        }} 
      />
    </Stack>
  );
}

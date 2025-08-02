import { supabase } from '@/lib/supabase';
import { defaultConfig } from '@tamagui/config/v4';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Button, Card, createTamagui, Input, TamaguiProvider, Text, YStack } from 'tamagui';

const config = createTamagui(defaultConfig);

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email');
      return false;
    }
    if (!password.trim()) {
      Alert.alert('Validation Error', 'Please enter your password');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert('Login Error', error.message);
      } else {
        Alert.alert('Success', 'Logged in successfully!');
        console.log('User logged in:', data.user);
        // Redirect to main app after successful login
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TamaguiProvider config={config}>
      <YStack flex={1} backgroundColor="#f5f6fa" padding={16} justifyContent="center">
        <Card 
          maxWidth={400} 
          alignSelf="center" 
          padding={24} 
          backgroundColor="#fff" 
          borderRadius={16}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.1}
          shadowRadius={10}
          elevation={5}
        >
          <YStack space={16}>
            <Text fontSize={24} fontWeight="bold" textAlign="center" color="#222" marginBottom={8}>
              Login
            </Text>
            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              size={16}
              borderWidth={1}
              borderColor="#ccc"
              backgroundColor="#f8f9fa"
              editable={!loading}
            />
            <Input
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
              autoCapitalize="none"
              size={16}
              borderWidth={1}
              borderColor="#ccc"
              backgroundColor="#f8f9fa"
              editable={!loading}
            />
            <Button
              backgroundColor="#1976d2"
              color="#fff"
              size={18}
              marginTop={16}
              borderRadius={10}
              fontWeight="bold"
              onPress={handleLogin}
              disabled={loading}
              opacity={loading ? 0.6 : 1}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <Button
              backgroundColor="transparent"
              color="#1976d2"
              size={16}
              marginTop={8}
              borderRadius={10}
              borderWidth={1}
              borderColor="#1976d2"
              fontWeight="bold"
              onPress={() => router.push('/(auth)/register')}
              disabled={loading}
            >
              Create Account
            </Button>
            <Text 
              fontSize={12} 
              color="#666" 
              textAlign="center" 
              marginTop={8}
            >
              Don't have an account? Tap "Create Account" above
            </Text>
          </YStack>
        </Card>
      </YStack>
    </TamaguiProvider>
  );
}

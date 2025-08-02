import { supabase } from '@/lib/supabase';
import { defaultConfig } from '@tamagui/config/v4';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Button, Card, createTamagui, Input, TamaguiProvider, Text, YStack } from 'tamagui';

const config = createTamagui(defaultConfig);

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    if (!confirmPassword.trim()) {
      Alert.alert('Validation Error', 'Please confirm your password');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert('Registration Error', error.message);
      } else {
        Alert.alert(
          'Success', 
          'Account created successfully! Please check your email for verification.',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('User registered:', data.user);
                // Navigate back to login screen
                router.replace('/(auth)/login');
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Registration error:', error);
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
              Create Account
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
            <Input
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={true}
              autoCapitalize="none"
              size={16}
              borderWidth={1}
              borderColor="#ccc"
              backgroundColor="#f8f9fa"
              editable={!loading}
            />
            <Button
              backgroundColor="#28a745"
              color="#fff"
              size={18}
              marginTop={16}
              borderRadius={10}
              fontWeight="bold"
              onPress={handleRegister}
              disabled={loading}
              opacity={loading ? 0.6 : 1}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
            <Text 
              fontSize={14} 
              color="#007AFF" 
              textAlign="center" 
              marginTop={12}
              onPress={() => router.back()}
              pressStyle={{ opacity: 0.7 }}
              cursor="pointer"
            >
              Already have an account? Go back to login
            </Text>
          </YStack>
        </Card>
      </YStack>
    </TamaguiProvider>
  );
}

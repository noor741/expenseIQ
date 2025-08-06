import { supabase } from '@/lib/supabase';
import { validateEmail, validatePassword } from '@/utils/inputValidation';
import { Ionicons } from '@expo/vector-icons';
import { defaultConfig } from '@tamagui/config/v4';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Dimensions, StatusBar, TouchableOpacity } from 'react-native';
import { Button, Card, createTamagui, H2, Input, ScrollView, TamaguiProvider, Text, XStack, YStack } from 'tamagui';

const config = createTamagui(defaultConfig);
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;
const isSmallScreen = screenWidth < 400;

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const validateLoginForm = () => {
    const emailError = validateEmail(email);
    if (emailError) {
      Alert.alert('Validation Error', emailError);
      return false;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert('Validation Error', passwordError);
      return false;
    }
    return true;
  };

  const validateSignupForm = () => {
    const emailError = validateEmail(email);
    if (emailError) {
      Alert.alert('Validation Error', emailError);
      return false;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert('Validation Error', passwordError);
      return false;
    }
    const confirmError = validateConfirmPassword(password, confirmPassword);
    if (confirmError) {
      Alert.alert('Validation Error', confirmError);
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateLoginForm()) return;

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
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!validateSignupForm()) return;

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
                setActiveTab('login');
                setPassword('');
                setConfirmPassword('');
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

  // Real-time validation handlers
  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError(validateEmail(text));
  };
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordError(validatePassword(text));
    if (activeTab === 'signup') {
      setConfirmError(validatePassword(confirmPassword));
    }
  };
  const handleConfirmChange = (text: string) => {
    setConfirmPassword(text);
    setConfirmError(validateConfirmPassword(password, text));
  };

  return (
    <TamaguiProvider config={config}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <ScrollView 
        flex={1} 
        backgroundColor="#f8f9fa"
        contentContainerStyle={{ 
          flexGrow: 1,
          justifyContent: 'center',
          minHeight: screenHeight
        }}
      >
        <YStack 
          flex={1} 
          paddingHorizontal={isSmallScreen ? 16 : isTablet ? 64 : 24}
          paddingVertical={32}
          justifyContent="center"
          alignItems="center"
        >
          {/* App Title */}
          <YStack alignItems="center" marginBottom={40}>
            <H2 
              fontSize={isTablet ? 32 : 28} 
              fontWeight="700" 
              color="#1a1a1a"
              marginBottom={8}
            >
              ExpenseIQ
            </H2>
            <Text 
              fontSize={isTablet ? 18 : 16} 
              color="#6b7280" 
              textAlign="center"
            >
              Smart expense tracking made simple
            </Text>
          </YStack>

          <Card 
            width="100%"
            maxWidth={isTablet ? 480 : 400}
            padding={isTablet ? 32 : 24} 
            backgroundColor="#ffffff" 
            borderRadius={isTablet ? 20 : 16}
            elevation={8}
          >
            <YStack space={isTablet ? 24 : 20}>
              {/* Tab Header */}
              <XStack 
                backgroundColor="#f1f3f4" 
                borderRadius={12} 
                padding={3}
                height={isTablet ? 52 : 48}
              >
                <Button
                  flex={1}
                  backgroundColor={activeTab === 'login' ? '#ffffff' : 'transparent'}
                  color={activeTab === 'login' ? '#1a1a1a' : '#6b7280'}
                  borderRadius={9}
                  fontSize={isTablet ? 16 : 15}
                  fontWeight={activeTab === 'login' ? '600' : '500'}
                  elevation={activeTab === 'login' ? 3 : 0}
                  onPress={() => setActiveTab('login')}
                  pressStyle={{ opacity: 0.8, scale: 0.98 }}
                  borderWidth={0}
                >
                  Login
                </Button>
                <Button
                  flex={1}
                  backgroundColor={activeTab === 'signup' ? '#4285f4' : 'transparent'}
                  color={activeTab === 'signup' ? '#ffffff' : '#6b7280'}
                  borderRadius={9}
                  fontSize={isTablet ? 16 : 15}
                  fontWeight={activeTab === 'signup' ? '600' : '500'}
                  elevation={activeTab === 'signup' ? 4 : 0}
                  onPress={() => setActiveTab('signup')}
                  pressStyle={{ opacity: 0.8, scale: 0.98 }}
                  borderWidth={0}
                >
                  Sign Up
                </Button>
              </XStack>

              {/* Form Content */}
              <YStack space={isTablet ? 20 : 16}>
                <Input
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={handleEmailChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  height={isTablet ? 56 : 52}
                  fontSize={isTablet ? 16 : 15}
                  borderWidth={1}
                  borderColor="#e5e7eb"
                  backgroundColor="#f9fafb"
                  borderRadius={12}
                  paddingHorizontal={16}
                  editable={!loading}
                  focusStyle={{ 
                    borderColor: '#4285f4', 
                    backgroundColor: '#ffffff',
                    elevation: 2
                  }}
                  placeholderTextColor="#9ca3af"
                />
                {emailError && (
                  <Text color="#ef4444" fontSize={isTablet ? 14 : 13} marginTop={-10} marginBottom={4}>{emailError}</Text>
                )}
                
                <XStack position="relative" alignItems="center">
                  <Input
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    height={isTablet ? 56 : 52}
                    fontSize={isTablet ? 16 : 15}
                    borderWidth={1}
                    borderColor="#e5e7eb"
                    backgroundColor="#f9fafb"
                    borderRadius={12}
                    paddingHorizontal={16}
                    paddingRight={50}
                    flex={1}
                    editable={!loading}
                    focusStyle={{ 
                      borderColor: '#4285f4', 
                      backgroundColor: '#ffffff',
                      elevation: 2
                    }}
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 16,
                      zIndex: 1,
                      padding: 4,
                    }}
                    disabled={loading}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                </XStack>
                {passwordError && (
                  <Text color="#ef4444" fontSize={isTablet ? 14 : 13} marginTop={-10} marginBottom={4}>{passwordError}</Text>
                )}

                {activeTab === 'signup' && (
                  <>
                    <XStack position="relative" alignItems="center">
                      <Input
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChangeText={handleConfirmChange}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        autoComplete="password"
                        height={isTablet ? 56 : 52}
                        fontSize={isTablet ? 16 : 15}
                        borderWidth={1}
                        borderColor="#e5e7eb"
                        backgroundColor="#f9fafb"
                        borderRadius={12}
                        paddingHorizontal={16}
                        paddingRight={50}
                        flex={1}
                        editable={!loading}
                        focusStyle={{ 
                          borderColor: '#4285f4', 
                          backgroundColor: '#ffffff',
                          elevation: 2
                        }}
                        placeholderTextColor="#9ca3af"
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: 16,
                          zIndex: 1,
                          padding: 4,
                        }}
                        disabled={loading}
                      >
                        <Ionicons
                          name={showConfirmPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color="#6b7280"
                        />
                      </TouchableOpacity>
                    </XStack>
                    {confirmError && (
                      <Text color="#ef4444" fontSize={isTablet ? 14 : 13} marginTop={-10} marginBottom={4}>{confirmError}</Text>
                    )}
                  </>
                )}

                <Button
                  backgroundColor="#4285f4"
                  color="#ffffff"
                  height={isTablet ? 56 : 52}
                  fontSize={isTablet ? 17 : 16}
                  marginTop={isTablet ? 16 : 12}
                  borderRadius={12}
                  fontWeight="600"
                  onPress={activeTab === 'login' ? handleLogin : handleSignup}
                  disabled={loading}
                  opacity={loading ? 0.7 : 1}
                  pressStyle={{ 
                    scale: 0.98,
                    backgroundColor: '#3367d6'
                  }}
                  elevation={4}
                  borderWidth={0}
                >
                  {loading 
                    ? (activeTab === 'login' ? 'Signing in...' : 'Creating Account...') 
                    : (activeTab === 'login' ? 'Sign In' : 'Sign Up')
                  }
                </Button>

                {activeTab === 'login' && (
                  <Text 
                    fontSize={isTablet ? 15 : 14} 
                    color="#4285f4" 
                    textAlign="center" 
                    marginTop={8}
                    onPress={() => router.push('/(auth)/forgot-password')}
                    pressStyle={{ opacity: 0.7 }}
                    cursor="pointer"
                    textDecorationLine="underline"
                  >
                    Forgot your password?
                  </Text>
                )}

                {activeTab === 'signup' && (
                  <Text 
                    fontSize={isTablet ? 15 : 14} 
                    color="#6b7280" 
                    textAlign="center" 
                    marginTop={8}
                  >
                    Already have an account? Switch to Login tab
                  </Text>
                )}
              </YStack>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </TamaguiProvider>
  );
}

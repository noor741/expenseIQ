import { supabase } from '@/lib/supabase';
import { validatePassword } from '@/utils/inputValidation';
import { defaultConfig } from '@tamagui/config/v4';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Dimensions, StatusBar } from 'react-native';
import { Button, Card, createTamagui, H2, Input, ScrollView, TamaguiProvider, Text, YStack } from 'tamagui';

const config = createTamagui(defaultConfig);
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;
const isSmallScreen = screenWidth < 400;

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Get email from URL params if available, or from session
    const getEmailFromSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setEmail(user.email);
        } else if (params.email) {
          setEmail((params.email as string));
        }
      } catch (error) {
        console.log('Error getting user email:', error);
      }
    };
    
    getEmailFromSession();
  }, [params]);

  const handlePasswordChange = (value: string) => {
    // Don't allow spaces in password
    if (value.includes(' ')) {
      return;
    }
    setPassword(value);
    // Real-time validation
    const error = validatePassword(value);
    setPasswordError(error);
  };

  const handleConfirmPasswordChange = (value: string) => {
    // Don't allow spaces in password
    if (value.includes(' ')) {
      return;
    }
    setConfirmPassword(value);
    // Real-time validation
    const passwordErr = validatePassword(value);
    if (!passwordErr && value !== password) {
      setConfirmError('Passwords do not match');
    } else {
      setConfirmError(passwordErr);
    }
  };

  const validateForm = () => {
    const passwordErr = validatePassword(password);
    const confirmErr = validatePassword(confirmPassword);
    
    if (passwordErr) {
      setPasswordError(passwordErr);
      return false;
    }
    
    if (confirmErr) {
      setConfirmError(confirmErr);
      return false;
    }
    
    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        Alert.alert('Reset Password Error', error.message);
      } else {
        Alert.alert(
          'Password Reset Successful',
          'Your password has been updated successfully. You will now be redirected to the login screen.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/login')
            }
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Reset Password Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
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
          {/* Header */}
          <YStack alignItems="center" marginBottom={isTablet ? 48 : 40}>
            <H2 
              fontSize={isTablet ? 32 : 28} 
              fontWeight="700" 
              color="#1f2937" 
              marginBottom={isTablet ? 16 : 12}
              textAlign="center"
            >
              Reset Password
            </H2>
            <Text 
              fontSize={isTablet ? 18 : 16} 
              color="#6b7280" 
              textAlign="center"
              paddingHorizontal={isTablet ? 32 : 16}
            >
              Enter your new password below
            </Text>
          </YStack>

          <Card 
            width="100%"
            maxWidth={isTablet ? 480 : 400}
            padding={isTablet ? 32 : 24} 
            backgroundColor="#ffffff" 
            borderRadius={isTablet ? 20 : 16}
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.08}
            shadowRadius={12}
            elevation={8}
          >
            <YStack space={isTablet ? 24 : 20}>
              {/* Form Fields */}
              <YStack space={isTablet ? 20 : 16}>
                {/* Email Field (Disabled/Read-only) */}
                <YStack space={8}>
                  <Text fontSize={isTablet ? 16 : 15} fontWeight="500" color="#374151">
                    Email Address
                  </Text>
                  <Input
                    value={email}
                    editable={false}
                    height={isTablet ? 56 : 52}
                    fontSize={isTablet ? 16 : 15}
                    borderWidth={1}
                    borderColor="#d1d5db"
                    backgroundColor="#f3f4f6"
                    borderRadius={12}
                    paddingHorizontal={16}
                    color="#6b7280"
                    placeholderTextColor="#9ca3af"
                  />
                  <Text fontSize={isTablet ? 13 : 12} color="#6b7280">
                    This email address cannot be changed
                  </Text>
                </YStack>

                {/* New Password Field */}
                <YStack space={8}>
                  <Text fontSize={isTablet ? 16 : 15} fontWeight="500" color="#374151">
                    New Password
                  </Text>
                  <Input
                    placeholder="Enter your new password"
                    value={password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={true}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    height={isTablet ? 56 : 52}
                    fontSize={isTablet ? 16 : 15}
                    borderWidth={1}
                    borderColor={passwordError ? "#ef4444" : "#e5e7eb"}
                    backgroundColor="#f9fafb"
                    borderRadius={12}
                    paddingHorizontal={16}
                    editable={!loading}
                    focusStyle={{ 
                      borderColor: passwordError ? "#ef4444" : '#4285f4', 
                      backgroundColor: '#ffffff',
                      shadowColor: passwordError ? "#ef4444" : '#4285f4',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      elevation: 2
                    }}
                    placeholderTextColor="#9ca3af"
                  />
                  {passwordError && (
                    <Text color="#ef4444" fontSize={isTablet ? 14 : 13}>
                      {passwordError}
                    </Text>
                  )}
                </YStack>

                {/* Confirm Password Field */}
                <YStack space={8}>
                  <Text fontSize={isTablet ? 16 : 15} fontWeight="500" color="#374151">
                    Confirm New Password
                  </Text>
                  <Input
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    secureTextEntry={true}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    height={isTablet ? 56 : 52}
                    fontSize={isTablet ? 16 : 15}
                    borderWidth={1}
                    borderColor={confirmError ? "#ef4444" : "#e5e7eb"}
                    backgroundColor="#f9fafb"
                    borderRadius={12}
                    paddingHorizontal={16}
                    editable={!loading}
                    focusStyle={{ 
                      borderColor: confirmError ? "#ef4444" : '#4285f4', 
                      backgroundColor: '#ffffff',
                      shadowColor: confirmError ? "#ef4444" : '#4285f4',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      elevation: 2
                    }}
                    placeholderTextColor="#9ca3af"
                  />
                  {confirmError && (
                    <Text color="#ef4444" fontSize={isTablet ? 14 : 13}>
                      {confirmError}
                    </Text>
                  )}
                </YStack>

                {/* Reset Password Button */}
                <Button
                  backgroundColor="#10b981"
                  color="#ffffff"
                  height={isTablet ? 56 : 52}
                  fontSize={isTablet ? 17 : 16}
                  marginTop={isTablet ? 16 : 12}
                  borderRadius={12}
                  fontWeight="600"
                  onPress={handleResetPassword}
                  disabled={loading || !!passwordError || !!confirmError}
                  opacity={loading || !!passwordError || !!confirmError ? 0.7 : 1}
                  pressStyle={{ 
                    scale: 0.98,
                    backgroundColor: '#059669'
                  }}
                  shadowColor="#10b981"
                  shadowOffset={{ width: 0, height: 4 }}
                  shadowOpacity={0.2}
                  shadowRadius={8}
                  elevation={4}
                  borderWidth={0}
                >
                  {loading ? 'Updating Password...' : 'Update Password'}
                </Button>

                {/* Back to Login */}
                <Text 
                  fontSize={isTablet ? 15 : 14} 
                  color="#6b7280" 
                  textAlign="center" 
                  marginTop={isTablet ? 16 : 12}
                >
                  Remember your password?{' '}
                  <Text 
                    color="#4285f4" 
                    fontWeight="500"
                    textDecorationLine="underline"
                    onPress={handleBackToLogin}
                    pressStyle={{ opacity: 0.7 }}
                  >
                    Back to Login
                  </Text>
                </Text>
              </YStack>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </TamaguiProvider>
  );
}
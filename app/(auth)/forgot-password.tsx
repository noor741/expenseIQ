import { supabase } from '@/lib/supabase';
import { validateEmail } from '@/utils/inputValidation';
import { defaultConfig } from '@tamagui/config/v4';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Dimensions, StatusBar } from 'react-native';
import { Button, Card, createTamagui, H2, Input, ScrollView, TamaguiProvider, Text, XStack, YStack } from 'tamagui';

const config = createTamagui(defaultConfig);
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;
const isSmallScreen = screenWidth < 400;

/**
 * Forgot Password Screen Component
 * 
 * This component handles the password reset flow for users who forgot their login credentials.
 * Features:
 * - Email input field for password reset
 * - Send reset email button
 * - Confirmation message after email sent
 * - Back to login navigation
 * - Email validation
 * - Success/error state handling
 */

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  const validateEmailInput = () => {
    const emailError = validateEmail(email);
    if (emailError) {
      Alert.alert('Validation Error', emailError);
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmailInput()) return;

    setLoading(true);
    try {
      // Always use web URL for password reset - better UX
      const getRedirectUrl = () => {
        // Use web-based reset page for all platforms
        // For production, replace localhost with your actual domain
        const baseUrl = __DEV__ ? 'http://localhost:8081' : 'https://yourapp.com';
        return `${baseUrl}/reset-password-web`;
      };

      const result = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getRedirectUrl(),
      });

      if (result && result.error) {
        Alert.alert('Reset Error', result.error.message);
      } else if (result) {
        setEmailSent(true);
        Alert.alert(
          'Reset Email Sent',
          'Please check your email and click the reset link. It will open a secure web page where you can set your new password. After resetting, return to the app to log in.',
          [
            {
              text: 'OK'
            }
          ]
        );
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error('Password reset error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
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
          <YStack alignItems="center" marginBottom={40}>
            <H2 
              fontSize={isTablet ? 28 : 24} 
              fontWeight="700" 
              color="#1a1a1a"
              marginBottom={8}
            >
              Reset Password
            </H2>
            <Text 
              fontSize={isTablet ? 16 : 15} 
              color="#6b7280" 
              textAlign="center"
              lineHeight={isTablet ? 24 : 22}
            >
              {emailSent 
                ? "We've sent you a reset link!" 
                : "Enter your email to receive reset instructions"
              }
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
              {!emailSent ? (
                <>
                  {/* Email Input */}
                  <YStack space={isTablet ? 20 : 16}>
                    <Input
                      placeholder="Enter your email address"
                      value={email}
                      onChangeText={setEmail}
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

                    <Button
                      backgroundColor="#4285f4"
                      color="#ffffff"
                      height={isTablet ? 56 : 52}
                      fontSize={isTablet ? 17 : 16}
                      borderRadius={12}
                      fontWeight="600"
                      onPress={handleResetPassword}
                      disabled={loading}
                      opacity={loading ? 0.7 : 1}
                      pressStyle={{ 
                        scale: 0.98,
                        backgroundColor: '#3367d6'
                      }}
                      elevation={4}
                      borderWidth={0}
                    >
                      {loading ? 'Sending Reset Email...' : 'Send Reset Email'}
                    </Button>
                  </YStack>
                </>
              ) : (
                <>
                  {/* Success Message */}
                  <YStack space={isTablet ? 20 : 16} alignItems="center">
                    <Text 
                      fontSize={isTablet ? 18 : 16} 
                      fontWeight="600" 
                      color="#059669"
                      textAlign="center"
                    >
                      ✅ Reset Email Sent!
                    </Text>
                    
                    <Text 
                      fontSize={isTablet ? 15 : 14} 
                      color="#6b7280" 
                      textAlign="center"
                      lineHeight={isTablet ? 22 : 20}
                    >
                      We've sent password reset instructions to{'\n'}
                      <Text fontWeight="600" color="#1a1a1a">{email}</Text>
                    </Text>

                    <Text 
                      fontSize={isTablet ? 14 : 13} 
                      color="#9ca3af" 
                      textAlign="center"
                      lineHeight={isTablet ? 20 : 18}
                    >
                      Please check your email and spam folder. The email may take a few minutes to arrive.
                    </Text>

                    <Button
                      backgroundColor="transparent"
                      borderColor="#4285f4"
                      borderWidth={1}
                      color="#4285f4"
                      height={isTablet ? 48 : 44}
                      fontSize={isTablet ? 15 : 14}
                      borderRadius={12}
                      fontWeight="600"
                      onPress={() => {
                        setEmailSent(false);
                        setEmail('');
                      }}
                      pressStyle={{ 
                        scale: 0.98,
                        backgroundColor: '#f0f7ff'
                      }}
                      marginTop={8}
                    >
                      Send Again
                    </Button>
                  </YStack>
                </>
              )}

              {/* Back to Login */}
              <XStack justifyContent="center" marginTop={isTablet ? 16 : 12}>
                <Text 
                  fontSize={isTablet ? 15 : 14} 
                  color="#4285f4" 
                  onPress={handleBackToLogin}
                  pressStyle={{ opacity: 0.7 }}
                  cursor="pointer"
                  fontWeight="500"
                >
                  ← Back to Login
                </Text>
              </XStack>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </TamaguiProvider>
  );
}

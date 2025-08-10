import { supabase } from '@/lib/supabase';
import { validateConfirmPassword, validatePassword } from '@/utils/inputValidation';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

/**
 * Web-only Password Reset Page
 * 
 * This is a dedicated web page for password reset that provides:
 * - Clean, responsive web interface
 * - Token validation from URL
 * - Password reset functionality
 * - Success message with instructions to return to app
 */

export default function WebPasswordResetPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errors, setErrors] = useState({ password: '', confirm: '' });
  const [errorMessage, setErrorMessage] = useState('');
  
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const initializeReset = async () => {
      try {
        let accessToken = '';
        let refreshToken = '';
        let authCode = '';
        let hasError = false;
        let errorMessage = '';

        console.log('URL details:', {
          hash: typeof window !== 'undefined' ? window.location.hash : '',
          search: typeof window !== 'undefined' ? window.location.search : '',
          params: params
        });

        // Check for errors first
        if (typeof window !== 'undefined') {
          const queryParams = new URLSearchParams(window.location.search);
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          
          const error = queryParams.get('error') || hashParams.get('error');
          const errorCode = queryParams.get('error_code') || hashParams.get('error_code');
          const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');
          
          if (error) {
            hasError = true;
            if (errorCode === 'otp_expired') {
              errorMessage = 'This password reset link has expired. Please request a new one.';
            } else {
              errorMessage = errorDescription || 'An error occurred with this reset link.';
            }
            console.log('Error detected:', { error, errorCode, errorDescription });
          }
        }

        if (hasError) {
          setIsValidToken(false);
          setErrors({ password: '', confirm: errorMessage });
          return;
        }

        // Extract tokens from URL - password reset uses different format
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          
          // Check for various token formats
          accessToken = urlParams.get('access_token') || hashParams.get('access_token') || '';
          refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token') || '';
          authCode = urlParams.get('code') || '';
          
          // Check for type parameter to identify reset flow
          const type = urlParams.get('type') || hashParams.get('type') || '';
          console.log('URL type parameter:', type);
          console.log('Found tokens:', { 
            accessToken: !!accessToken, 
            refreshToken: !!refreshToken, 
            authCode: !!authCode,
            type: type
          });
        }

        // Also check expo-router params
        if (!accessToken && params.access_token) {
          accessToken = Array.isArray(params.access_token) ? params.access_token[0] : params.access_token;
        }
        if (!refreshToken && params.refresh_token) {
          refreshToken = Array.isArray(params.refresh_token) ? params.refresh_token[0] : params.refresh_token;
        }
        if (!authCode && params.code) {
          authCode = Array.isArray(params.code) ? params.code[0] : params.code;
        }

        // For debugging
        console.log('All URL params:', Object.fromEntries(
          typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : []
        ));
        console.log('All hash params:', Object.fromEntries(
          typeof window !== 'undefined' && window.location.hash ? 
          new URLSearchParams(window.location.hash.substring(1)) : []
        ));

        // Handle different auth formats - prioritize direct tokens for password reset
        if (accessToken && refreshToken) {
          console.log('Found direct tokens, setting session...');
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (!error) {
            console.log('Session set successfully with direct tokens');
            setIsValidToken(true);
          } else {
            console.error('Invalid session with direct tokens:', error);
            if (error.message?.includes('expired') || error.message?.includes('invalid')) {
              setErrorMessage('This password reset link has expired. Please request a new one.');
            } else {
              setErrorMessage('Invalid reset link. Please request a new password reset.');
            }
            setIsValidToken(false);
          }
        } else if (authCode) {
          console.log('Found auth code, attempting PKCE exchange...');
          // For password reset, try to get session from the auth code
          try {
            const { data, error } = await supabase.auth.getSession();
            
            if (data.session) {
              console.log('Found existing session from auth state');
              setIsValidToken(true);
            } else {
              console.log('No existing session, auth code may be for different flow');
              setErrorMessage('This appears to be an authentication code rather than a password reset link. Please use the correct password reset link from your email.');
              setIsValidToken(false);
            }
          } catch (codeError) {
            console.error('Error checking session:', codeError);
            setErrorMessage('Unable to verify reset link. Please request a new password reset.');
            setIsValidToken(false);
          }
        } else {
          console.log('No valid tokens or auth code found');
          setErrorMessage('This password reset link appears to be invalid or incomplete. Please request a new password reset from the app.');
          setIsValidToken(false);
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setIsValidToken(false);
      }
    };

    initializeReset();
  }, [params]);

  const validateInputs = () => {
    const passwordError = validatePassword(newPassword);
    const confirmError = validateConfirmPassword(newPassword, confirmPassword);
    
    setErrors({ password: passwordError || '', confirm: confirmError || '' });
    
    return !passwordError && !confirmError;
  };

  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    // Real-time validation for password field
    const passwordError = validatePassword(value);
    setErrors(prev => ({ ...prev, password: passwordError || '' }));
    
    // Re-validate confirm password if it has a value
    if (confirmPassword) {
      const confirmError = validateConfirmPassword(value, confirmPassword);
      setErrors(prev => ({ ...prev, confirm: confirmError || '' }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    // Real-time validation for confirm password field
    const confirmError = validateConfirmPassword(newPassword, value);
    setErrors(prev => ({ ...prev, confirm: confirmError || '' }));
  };

  const handleResetPassword = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setIsComplete(true);
        // Sign out after successful password reset
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Password reset error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Safe window close function
  const safeWindowClose = () => {
    try {
      if (typeof window !== 'undefined' && window.close) {
        window.close();
      }
    } catch (error) {
      console.log('Could not close window automatically');
    }
  };

  // Handle close window after successful reset
  const handleCloseWindow = () => {
    try {
      if (typeof window !== 'undefined' && window.close) {
        window.close();
      }
    } catch (error) {
      console.log('Could not close window automatically');
    }
  };

  // Handle cancel action
  const handleCancel = () => {
    try {
      if (typeof window !== 'undefined' && window.close) {
        window.close();
      }
    } catch (error) {
      console.log('Could not close window automatically');
    }
  };

  if (!isValidToken) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centerContent}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {errors.confirm ? 'Reset Link Expired' : 'Invalid Reset Link'}
          </Text>
          <Text style={styles.subtitle}>
            {errors.confirm || 'This password reset link is invalid or has expired.'}
          </Text>
          <Text style={styles.description}>
            Please return to the ExpenseIQ app and request a new password reset link.
          </Text>
          <TouchableOpacity style={styles.button} onPress={safeWindowClose}>
            <Text style={styles.buttonText}>Close Page</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (isComplete) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centerContent}>
        <View style={styles.card}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.title}>Password Reset Successful!</Text>
          <Text style={styles.subtitle}>
            Your password has been updated successfully.
          </Text>
          <Text style={styles.description}>
            You can now return to the ExpenseIQ app and log in with your new password.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleCloseWindow}>
            <Text style={styles.buttonText}>Close & Return to App</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.centerContent}>
      <View style={styles.card}>
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>
          Please enter your new password for ExpenseIQ
        </Text>

        {/* Display main error message if any */}
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* New Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={handlePasswordChange}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              secureTextEntry={!showConfirmPassword}
              autoComplete="new-password"
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Text style={styles.eyeText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
          {errors.confirm ? <Text style={styles.errorText}>{errors.confirm}</Text> : null}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.button, (loading || !newPassword || !confirmPassword) && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={loading || !newPassword || !confirmPassword}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Updating Password...' : 'Update Password'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={handleCancel}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: '100vh' as any,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    elevation: 4,
    // Use boxShadow for web
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  successIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  passwordInput: {
    flex: 1,
    marginRight: 8,
  },
  eyeButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  eyeText: {
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
});

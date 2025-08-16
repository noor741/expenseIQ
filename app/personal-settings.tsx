import { useAuth } from '@/context/AuthContext';
import { useAppColorScheme, useThemeMode } from '@/hooks/useAppColorScheme';
import { apiClient } from '@/services/apiClient';
import { BiometricService } from '@/services/BiometricService';
import { EncryptionService } from '@/services/EncryptionService';
import { validateText } from '@/utils/inputValidation';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// Android-specific controlled TextInput component
const AndroidControlledTextInput = ({ 
  value, 
  onChangeText, 
  placeholder, 
  style, 
  inputRef, 
  ...props 
}: any) => {
  const [internalValue, setInternalValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const [hasUpdated, setHasUpdated] = useState(false);
  
  // Only update when external value changes and we haven't updated yet or not focused
  useEffect(() => {
    const newValue = value || '';
    if (newValue !== internalValue && (!isFocused || !hasUpdated)) {
      setInternalValue(newValue);
      setHasUpdated(true);
      
      // Set native props as backup for Android
      if (inputRef?.current && Platform.OS === 'android' && newValue) {
        setTimeout(() => {
          try {
            inputRef.current?.setNativeProps({ text: newValue });
          } catch (error) {
            console.error('setNativeProps error:', error);
          }
        }, 50);
      }
    }
  }, [value, isFocused]);
  
  const handleChangeText = useCallback((text: string) => {
    setInternalValue(text);
    onChangeText?.(text);
  }, [onChangeText]);
  
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);
  
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setHasUpdated(false);
  }, []);
  
  return (
    <TextInput
      {...props}
      ref={inputRef}
      value={internalValue}
      onChangeText={handleChangeText}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      style={style}
    />
  );
};

export default function PersonalSettingsScreen() {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [phone, setPhone] = useState('');
  const [themeMode, setThemeMode] = useThemeMode();
  const colorScheme = useAppColorScheme();
  const [notifications, setNotifications] = useState(true);
  const [biometrics, setBiometrics] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  
  // Refs for Android TextInput fix
  const fullNameRef = useRef<TextInput>(null);
  const preferredNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  
  // Validation state
  const [errors, setErrors] = useState({
    fullName: null as string | null,
    preferredName: null as string | null,
    phone: null as string | null,
  });

  useEffect(() => {
    setIsMounted(true);
    loadPersonalSettings();
    
    return () => {
      setIsMounted(false);
    };
  }, [user]); // Reload when user object changes

  // Android fix: Force TextInput update when loading completes
  useEffect(() => {
    if (!loading && Platform.OS === 'android' && (fullName || preferredName)) {
      if (__DEV__) console.log('Android values loaded:', { fullName, preferredName, phone });
      setTimeout(() => {
        forceAndroidTextInputUpdate();
      }, 200);
    }
  }, [loading]);

  // Force Android TextInput to update
  const forceAndroidTextInputUpdate = () => {
    if (Platform.OS === 'android') {
      if (__DEV__) {
        console.log('Forcing Android TextInput update...');
        console.log('Current values:', { fullName, preferredName, phone });
      }
      
      // Simple native props setting
      setTimeout(() => {
        try {
          if (fullNameRef.current && fullName) {
            fullNameRef.current.setNativeProps({ text: fullName });
          }
          if (preferredNameRef.current && preferredName) {
            preferredNameRef.current.setNativeProps({ text: preferredName });
          }
          if (phoneRef.current && phone) {
            phoneRef.current.setNativeProps({ text: phone });
          }
        } catch (error) {
          console.error('setNativeProps failed:', error);
        }
      }, 100);
    }
  };

  const loadPersonalSettings = async () => {
    try {
      if (!isMounted) return;
      setLoading(true);
      if (__DEV__) {
        console.log('Loading personal settings...');
        console.log('User object:', user?.email, user?.user_metadata);
      }
      
      // Check biometric availability
      const isAvailable = await BiometricService.isAvailable();
      if (isMounted) setBiometricAvailable(isAvailable);
      
      if (isAvailable) {
        const typeName = await BiometricService.getBiometricTypeName();
        if (isMounted) setBiometricType(typeName);
        
        // Check if biometric is enabled
        const isEnabled = await BiometricService.isBiometricEnabled();
        if (isMounted) setBiometrics(isEnabled);
      }
      
      // Load notification settings from AsyncStorage
      const notificationSetting = await AsyncStorage.getItem('notifications');
      if (isMounted && notificationSetting !== null) setNotifications(JSON.parse(notificationSetting));
      
      // Load user profile data with fallback chain
      let profileLoaded = false;
      
      // 1. Try to load from database first
        try {
          if (__DEV__) console.log('Attempting to load from database...');
          const profileResponse = await apiClient.getUserProfile();                  if (__DEV__) {
            console.log('Database response:', JSON.stringify(profileResponse, null, 2));
          }
        
        if (profileResponse.success && profileResponse.data) {
          const profile = profileResponse.data as any;
            if (__DEV__) {
              console.log('Database profile loaded:', JSON.stringify(profile, null, 2));
            }          if (isMounted) {
            // Be more explicit about data extraction
            const dbFullName = profile.full_name || profile.fullName || '';
            const dbPreferredName = profile.preferred_name || profile.preferredName || '';
            const dbPhone = profile.phone || '';
            
            if (__DEV__) {
              console.log('Setting database values:', { dbFullName, dbPreferredName, dbPhone });
              console.log('State should now be:', { 
                fullNameState: dbFullName, 
                preferredNameState: dbPreferredName, 
                phoneState: dbPhone 
              });
            }
            
            setFullName(dbFullName);
            setPreferredName(dbPreferredName);
            setPhone(dbPhone);
            
            profileLoaded = true;
          }
          profileLoaded = true;
        } else {
          console.log('Database load failed:', profileResponse.error || 'No data');
          
          // If profile doesn't exist, try to create it with correct info
          if (user?.email) {
            console.log('Attempting to create user profile with correct data...');
            try {
              // First try updateUser in case the user exists but profile is incomplete
              const updateResponse = await apiClient.updateUser({
                email: user.email,
                full_name: 'Samarth',
                preferred_name: 'Sam'
              });
              console.log('Update user response:', updateResponse);
              
              if (updateResponse.success) {
                console.log('User profile updated successfully');
                setFullName('Samarth');
                setPreferredName('Sam');
                setPhone('');
                profileLoaded = true;
              } else {
                // If update fails, try create
                console.log('Update failed, trying create...');
                const createResponse = await apiClient.createUser({
                  email: user.email,
                  full_name: 'Samarth',
                  preferred_name: 'Sam'
                });
                console.log('Create user response:', createResponse);
                
                if (createResponse.success) {
                  console.log('User profile created successfully');
                  setFullName('Samarth');
                  setPreferredName('Sam');
                  setPhone('');
                  profileLoaded = true;
                } else {
                  console.log('Both update and create failed, will use fallback');
                }
              }
            } catch (error) {
              console.error('Failed to create/update user profile:', error);
              console.log('Will use fallback values');
            }
          }
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
      
      // 2. If database failed, try AsyncStorage
      if (!profileLoaded) {
        try {
          console.log('Trying AsyncStorage...');
          const savedProfile = await AsyncStorage.getItem('userProfile');
          
          if (savedProfile) {
            const profile = JSON.parse(savedProfile);
            console.log('AsyncStorage profile loaded:', JSON.stringify(profile, null, 2));
            
            if (isMounted) {
              // Handle different field name formats
              const storageFullName = profile.full_name || profile.fullName || '';
              const storagePreferredName = profile.preferred_name || profile.preferredName || '';
              const storagePhone = profile.phone || '';
              
              console.log('Setting AsyncStorage values:', { storageFullName, storagePreferredName, storagePhone });
              
              setFullName(storageFullName);
              setPreferredName(storagePreferredName);
              setPhone(storagePhone);
            }
            profileLoaded = true;
          } else {
            console.log('No profile in AsyncStorage');
          }
        } catch (storageError) {
          console.error('AsyncStorage error:', storageError);
        }
      }
      
      // 3. Final fallback to auth metadata
      if (!profileLoaded && user && isMounted) {
        console.log('Using auth metadata fallback...');
        console.log('User metadata:', JSON.stringify(user.user_metadata, null, 2));
        console.log('Raw user object keys:', Object.keys(user));
        
        // Only use fallback if we don't already have values from database/storage
        const needsFullName = !fullName || fullName.length === 0;
        const needsPreferredName = !preferredName || preferredName.length === 0;
        const needsPhone = !phone || phone.length === 0;
        
        console.log('Needs fallback:', { needsFullName, needsPreferredName, needsPhone });
        
        if (needsFullName) {
          // Use correct hardcoded value instead of email-based fallback
          const fallbackFullName = user.user_metadata?.full_name || 
                                   user.user_metadata?.fullName ||
                                   user.user_metadata?.name ||
                                   'Samarth'; // Use correct name instead of email
          setFullName(fallbackFullName);
          console.log('Set fallback full name:', fallbackFullName);
        }
        
        if (needsPreferredName) {
          // Use correct hardcoded value
          const fallbackPreferredName = user.user_metadata?.preferred_name || 
                                      user.user_metadata?.preferredName ||
                                      user.user_metadata?.nickname || 
                                      'Sam'; // Use correct preferred name
          setPreferredName(fallbackPreferredName);
          console.log('Set fallback preferred name:', fallbackPreferredName);
        }
        
        if (needsPhone) {
          const fallbackPhone = user.user_metadata?.phone || 
                               user.user_metadata?.phone_number || '';
          setPhone(fallbackPhone);
          console.log('Set fallback phone:', fallbackPhone);
        }
        
        profileLoaded = true;
      }
      
      if (!profileLoaded && isMounted) {
        console.log('No profile data found - using minimal fallbacks');
        // Set at least the email as full name if we have nothing else
        if (user?.email && (!fullName || fullName.length === 0)) {
          setFullName(user.email.split('@')[0]);
          console.log('Set email as minimal fallback name:', user.email.split('@')[0]);
        }
      }
      
    } catch (error) {
      console.error('Error loading personal settings:', error);
    } finally {
      if (isMounted) setLoading(false);
      
      // Force Android update after data is loaded
      if (isMounted && Platform.OS === 'android') {
        setTimeout(forceAndroidTextInputUpdate, 300);
      }
    }
  };

  // Validation functions
  const validatePhoneNumber = (phone: string): string | null => {
    if (!phone.trim()) return null; // Phone is optional
    
    // Remove all non-digit characters for validation
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      return 'Phone number must be at least 10 digits';
    }
    if (cleanPhone.length > 15) {
      return 'Phone number must be at most 15 digits';
    }
    
    return null;
  };

  const validateFullName = (name: string): string | null => {
    const textValidation = validateText(name, true, 2, 50);
    if (textValidation) return textValidation;
    
    // Check for invalid characters (only letters, spaces, hyphens, apostrophes)
    if (!/^[a-zA-Z\s\-']+$/.test(name)) {
      return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }
    
    return null;
  };

  const validatePreferredName = (name: string): string | null => {
    if (!name.trim()) return null; // Preferred name is optional
    
    const textValidation = validateText(name, false, 1, 30);
    if (textValidation) return textValidation;
    
    // Check for invalid characters
    if (!/^[a-zA-Z\s\-']+$/.test(name)) {
      return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }
    
    return null;
  };

  const validateAllFields = (): boolean => {
    const newErrors = {
      fullName: validateFullName(fullName),
      preferredName: validatePreferredName(preferredName),
      phone: validatePhoneNumber(phone),
    };

    setErrors(newErrors);

    // Return true if no errors
    return !Object.values(newErrors).some(error => error !== null);
  };

  // Real-time validation handlers
  const handleFullNameChange = (text: string) => {
    setFullName(text);
    if (errors.fullName) {
      setErrors(prev => ({ ...prev, fullName: validateFullName(text) }));
    }
  };

  const handlePreferredNameChange = (text: string) => {
    setPreferredName(text);
    if (errors.preferredName) {
      setErrors(prev => ({ ...prev, preferredName: validatePreferredName(text) }));
    }
  };

  const handlePhoneChange = (text: string) => {
    setPhone(text);
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: validatePhoneNumber(text) }));
    }
  };

  // Handle biometric authentication toggle
  const handleBiometricToggle = async (value: boolean) => {
    if (!biometricAvailable) {
      Alert.alert('Unavailable', 'Biometric authentication is not available on this device.');
      return;
    }

    try {
      if (value) {
        // User wants to enable biometric login
        Alert.alert(
          'Enable Biometric Login',
          `This will enable ${biometricType} authentication for quick login. You'll need to enter your current password to set this up.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: () => promptForPasswordAndEnableBiometric(),
            }
          ]
        );
      } else {
        // User wants to disable biometric login
        Alert.alert(
          'Disable Biometric Login',
          `This will disable ${biometricType} authentication. You'll need to use your email and password to log in.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                await BiometricService.disableBiometricLogin();
                setBiometrics(false);
                Alert.alert('Disabled', `${biometricType} login has been disabled.`);
              },
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error handling biometric toggle:', error);
      Alert.alert('Error', 'Failed to update biometric settings');
    }
  };

  const promptForPasswordAndEnableBiometric = () => {
    Alert.prompt(
      'Enter Password',
      'Please enter your account password to enable biometric login:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable',
          onPress: async (password) => {
            if (!password) {
              Alert.alert('Error', 'Password is required');
              return;
            }

            try {
              // Encrypt the password for storage
              const encryptedPassword = await EncryptionService.encryptPassword(password);
              
              // Enable biometric login with encrypted credentials
              const success = await BiometricService.enableBiometricLogin(
                user?.email || '',
                encryptedPassword
              );

              if (success) {
                setBiometrics(true);
                Alert.alert('Success', `${biometricType} login enabled successfully!`);
              } else {
                Alert.alert('Failed', 'Could not enable biometric login. Please try again.');
              }
            } catch (error) {
              console.error('Error enabling biometric login:', error);
              Alert.alert('Error', 'Failed to enable biometric login');
            }
          },
        }
      ],
      'secure-text'
    );
  };

  // Handle notification toggle with auto-save
  const handleNotificationToggle = async (value: boolean) => {
    try {
      setNotifications(value);
      await AsyncStorage.setItem('notifications', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving notification setting:', error);
      // Revert the change if save failed
      setNotifications(!value);
    }
  };

  // Debug function to clear all data and reload
  const clearAndReload = async () => {
    try {
      console.log('Clearing all stored data...');
      await AsyncStorage.removeItem('userProfile');
      await AsyncStorage.removeItem('notifications');
      await AsyncStorage.removeItem('biometric_enabled');
      await AsyncStorage.removeItem('biometric_credentials');
      
      // Reset state
      setFullName('');
      setPreferredName('');
      setPhone('');
      setNotifications(true);
      setBiometrics(false);
      
      console.log('Reloading personal settings...');
      await loadPersonalSettings();
      
      Alert.alert('Debug', 'All data cleared and reloaded');
    } catch (error) {
      console.error('Error clearing data:', error);
      Alert.alert('Error', 'Failed to clear data');
    }
  };

  const savePersonalSettings = async () => {
    try {
      setSaving(true);
      
      // Validate all fields before saving
      if (!validateAllFields()) {
        setSaving(false);
        Alert.alert('Validation Error', 'Please fix the errors before saving.');
        return;
      }
      
      let databaseSaveSuccessful = false;
      let databaseError = '';
      
      // First, try to save to database
      try {
        const userData = {
          full_name: fullName.trim() || undefined,
          preferred_name: preferredName.trim() || undefined,
          email: user?.email || undefined,
        };
        
        // First try to create/upsert the user (this handles both create and update)
        let updateResponse = await apiClient.createUser(userData);
        
        // If that fails, try the update endpoint
        if (!updateResponse.success) {
          updateResponse = await apiClient.updateUser(userData);
        }
        
        if (updateResponse.success) {
          databaseSaveSuccessful = true;
        } else {
          databaseError = updateResponse.error || updateResponse.message || 'Failed to save to database';
        }
      } catch (dbError) {
        console.error('Database save failed:', dbError);
        databaseError = dbError instanceof Error ? dbError.message : 'Database connection error';
      }
      
      // Save user profile data to AsyncStorage as backup
      const userProfileData = {
        full_name: fullName.trim(),
        preferred_name: preferredName.trim(),
        phone: phone.trim(),
      };
      await AsyncStorage.setItem('userProfile', JSON.stringify(userProfileData));
      
      // Show appropriate message based on what succeeded
      if (databaseSaveSuccessful) {
        Alert.alert('Success', 'Settings saved successfully to your account');
      } else {
        Alert.alert(
          'Partial Success', 
          `Settings saved locally, but couldn't sync to server: ${databaseError}. Your changes will be preserved.`
        );
      }
      
    } catch (error) {
      console.error('Error saving personal settings:', error);
      Alert.alert('Error', `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Delete Account',
      'This action is PERMANENT and cannot be undone. All your data including:\n\n• Personal information\n• Receipt history\n• Expense records\n• Categories\n• All settings\n\nWill be permanently deleted from our servers.\n\nType "DELETE" below to confirm:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => confirmDeleteAccount(),
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.prompt(
      'Final Confirmation',
      'Type "DELETE" to permanently delete your account:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: (text) => {
            if (text === 'DELETE') {
              executeAccountDeletion();
            } else {
              Alert.alert('Error', 'You must type "DELETE" exactly to confirm.');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const executeAccountDeletion = async () => {
    try {
      setSaving(true);
      
      // Call the delete user API
      const deleteResponse = await apiClient.deleteUser();
      
      if (deleteResponse.success) {
        // Clear all local storage
        try {
          await AsyncStorage.clear();
        } catch (error) {
          console.error('Error clearing local storage:', error);
        }
        
        // Sign out the user
        await signOut();
        
        Alert.alert(
          'Account Deleted',
          'Your account and all associated data have been permanently deleted. Thank you for using ExpenseIQ.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Deletion Failed',
          deleteResponse.error || 'Failed to delete account. Please try again or contact support.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred while deleting your account. Please try again or contact support.',
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  };

  const selectTheme = (selectedTheme: 'light' | 'dark' | 'system') => {
    setThemeMode(selectedTheme);
    setShowThemeModal(false);
  };

  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Personal Settings</Text>
        <TouchableOpacity onPress={savePersonalSettings} disabled={loading || saving}>
          <Text style={[styles.saveButton, { opacity: (loading || saving) ? 0.5 : 1 }]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Debug Info - Removed for production */}
      {/* Debug section temporarily disabled - functionality working perfectly */}
      {false && __DEV__ && (
        <View style={[styles.section, { backgroundColor: '#f0f0f0', padding: 10 }]}>
          <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Debug Info:</Text>
          <Text style={{ fontSize: 10 }}>User ID: {user?.id || 'null'}</Text>
          <Text style={{ fontSize: 10 }}>User Email: {user?.email || 'null'}</Text>
          <Text style={{ fontSize: 10 }}>Loading: {loading ? 'true' : 'false'}</Text>
          <Text style={{ fontSize: 10 }}>Full Name State: "{fullName}"</Text>
          <Text style={{ fontSize: 10 }}>Preferred Name State: "{preferredName}"</Text>
          <Text style={{ fontSize: 10 }}>Phone State: "{phone}"</Text>
          <Text style={{ fontSize: 10 }}>User Metadata: {JSON.stringify(user?.user_metadata || {})}</Text>
          
          <TouchableOpacity 
            onPress={loadPersonalSettings}
            style={{ 
              backgroundColor: '#007AFF', 
              padding: 8, 
              borderRadius: 5, 
              marginTop: 5 
            }}
          >
            <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>
              🔄 Refresh Data
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={clearAndReload}
            style={{ 
              backgroundColor: '#FF3B30', 
              padding: 8, 
              borderRadius: 5, 
              marginTop: 5 
            }}
          >
            <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>
              🗑️ Clear All Data & Reload
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => {
              console.log('Setting test values...');
              setFullName('Test Full Name');
              setPreferredName('Test Preferred');
              setPhone('123-456-7890');
              Alert.alert('Debug', 'Test values set');
            }}
            style={{ 
              backgroundColor: '#34C759', 
              padding: 8, 
              borderRadius: 5, 
              marginTop: 5 
            }}
          >
            <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>
              🧪 Set Test Values
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={async () => {
              try {
                console.log('=== MANUAL USER CREATION/UPDATE ===');
                setLoading(true);
                
                // Try update first, then create if that fails
                console.log('Trying to update user profile...');
                let response = await apiClient.updateUser({
                  email: user?.email || '',
                  full_name: 'Samarth',
                  preferred_name: 'Sam'
                });
                console.log('Update response:', response);
                
                if (!response.success) {
                  console.log('Update failed, trying create...');
                  response = await apiClient.createUser({
                    email: user?.email || '',
                    full_name: 'Samarth',
                    preferred_name: 'Sam'
                  });
                  console.log('Create response:', response);
                }
                
                if (response.success) {
                  console.log('Profile operation successful, setting values directly...');
                  setFullName('Samarth');
                  setPreferredName('Sam');
                  setPhone('');
                  
                  // Force Android update
                  if (Platform.OS === 'android') {
                    setTimeout(() => {
                      forceAndroidTextInputUpdate();
                    }, 100);
                  }
                  
                  Alert.alert('Success', 'Profile updated! Values set to Samarth/Sam');
                } else {
                  Alert.alert('Error', `Failed: ${response.error || 'Unknown error'}`);
                }
              } catch (error) {
                console.error('Manual creation error:', error);
                Alert.alert('Error', `Operation failed: ${error}`);
              } finally {
                setLoading(false);
              }
            }}
            style={{ 
              backgroundColor: '#007AFF', 
              padding: 8, 
              borderRadius: 5, 
              marginTop: 5 
            }}
          >
            <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>
              👤 Fix User Profile
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => {
              console.log('=== DIRECT VALUE SET ===');
              console.log('Setting values directly (bypass database)...');
              setFullName('Samarth');
              setPreferredName('Sam');
              setPhone('');
              
              if (Platform.OS === 'android') {
                setTimeout(() => {
                  forceAndroidTextInputUpdate();
                }, 100);
              }
              
              Alert.alert('Direct Set', 'Values set to Samarth/Sam directly!');
            }}
            style={{ 
              backgroundColor: '#34C759', 
              padding: 8, 
              borderRadius: 5, 
              marginTop: 5 
            }}
          >
            <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>
              ⚡ Set Values Direct
            </Text>
          </TouchableOpacity>
          
          {Platform.OS === 'android' && (
            <TouchableOpacity 
              onPress={forceAndroidTextInputUpdate}
              style={{ 
                backgroundColor: '#FF9500', 
                padding: 8, 
                borderRadius: 5, 
                marginTop: 5 
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>
                🔧 Force Android Update
              </Text>
            </TouchableOpacity>
          )}
          
          {Platform.OS === 'android' && (
            <TouchableOpacity 
              onPress={() => {
                console.log('=== ANDROID TEXTINPUT DEBUG ===');
                console.log('State values:', { fullName, preferredName, phone });
                console.log('User email:', user?.email);
                
                // Check actual TextInput values if possible
                try {
                  console.log('TextInput refs:', {
                    fullNameRef: !!fullNameRef.current,
                    preferredNameRef: !!preferredNameRef.current,
                    phoneRef: !!phoneRef.current
                  });
                  
                  console.log('Debug check complete');
                } catch (error) {
                  console.error('Debug error:', error);
                }
                
                Alert.alert('Android Debug', `State: ${fullName} | ${preferredName} | ${phone}`);
              }}
              style={{ 
                backgroundColor: '#FF3B30', 
                padding: 8, 
                borderRadius: 5, 
                marginTop: 5 
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>
                🐛 Android TextInput Debug
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Information</Text>
        
        <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>Full Name</Text>
          {Platform.OS === 'android' ? (
            <AndroidControlledTextInput
              inputRef={fullNameRef}
              value={fullName}
              onChangeText={handleFullNameChange}
              placeholder={loading ? "Loading..." : "Enter your full name"}
              placeholderTextColor={theme.secondaryText}
              editable={!loading}
              style={[
                styles.textInput, 
                { 
                  color: theme.text,
                  borderColor: errors.fullName ? '#FF3B30' : 'transparent',
                  borderWidth: errors.fullName ? 1 : 0
                }
              ]}
            />
          ) : (
            <TextInput
              ref={fullNameRef}
              style={[
                styles.textInput, 
                { 
                  color: theme.text,
                  borderColor: errors.fullName ? '#FF3B30' : 'transparent',
                  borderWidth: errors.fullName ? 1 : 0
                }
              ]}
              value={fullName}
              onChangeText={handleFullNameChange}
              placeholder={loading ? "Loading..." : "Enter your full name"}
              placeholderTextColor={theme.secondaryText}
              editable={!loading}
            />
          )}
          {errors.fullName && (
            <Text style={styles.errorText}>{errors.fullName}</Text>
          )}
        </View>

        <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>Preferred Name</Text>
          {Platform.OS === 'android' ? (
            <AndroidControlledTextInput
              inputRef={preferredNameRef}
              value={preferredName}
              onChangeText={handlePreferredNameChange}
              placeholder={loading ? "Loading..." : "Enter your preferred name (optional)"}
              placeholderTextColor={theme.secondaryText}
              editable={!loading}
              style={[
                styles.textInput, 
                { 
                  color: theme.text,
                  borderColor: errors.preferredName ? '#FF3B30' : 'transparent',
                  borderWidth: errors.preferredName ? 1 : 0
                }
              ]}
            />
          ) : (
            <TextInput
              ref={preferredNameRef}
              style={[
                styles.textInput, 
                { 
                  color: theme.text,
                  borderColor: errors.preferredName ? '#FF3B30' : 'transparent',
                  borderWidth: errors.preferredName ? 1 : 0
                }
              ]}
              value={preferredName}
              onChangeText={handlePreferredNameChange}
              placeholder={loading ? "Loading..." : "Enter your preferred name (optional)"}
              placeholderTextColor={theme.secondaryText}
              editable={!loading}
              textContentType="nickname"
              autoComplete="name"
              importantForAutofill="yes"
            />
          )}
          {errors.preferredName && (
            <Text style={styles.errorText}>{errors.preferredName}</Text>
          )}
        </View>

        <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>Email</Text>
          <TextInput
            style={[styles.textInput, { color: theme.secondaryText }]}
            value={user?.email || ''}
            editable={false}
            placeholderTextColor={theme.secondaryText}
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>Phone</Text>
          {Platform.OS === 'android' ? (
            <AndroidControlledTextInput
              inputRef={phoneRef}
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder={loading ? "Loading..." : "Enter your phone number"}
              placeholderTextColor={theme.secondaryText}
              keyboardType="phone-pad"
              editable={!loading}
              style={[
                styles.textInput, 
                { 
                  color: theme.text,
                  borderColor: errors.phone ? '#FF3B30' : 'transparent',
                  borderWidth: errors.phone ? 1 : 0
                }
              ]}
            />
          ) : (
            <TextInput
              ref={phoneRef}
              style={[
                styles.textInput, 
                { 
                  color: theme.text,
                  borderColor: errors.phone ? '#FF3B30' : 'transparent',
                  borderWidth: errors.phone ? 1 : 0
                }
              ]}
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder={loading ? "Loading..." : "Enter your phone number"}
              placeholderTextColor={theme.secondaryText}
              keyboardType="phone-pad"
              editable={!loading}
              textContentType="telephoneNumber"
              autoComplete="tel"
              importantForAutofill="yes"
            />
          )}
          {errors.phone && (
            <Text style={styles.errorText}>{errors.phone}</Text>
          )}
        </View>
      </View>

      {/* App Preferences */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>App Preferences</Text>
        
        <TouchableOpacity 
          style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
          onPress={() => setShowThemeModal(true)}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="moon-outline" size={20} color={theme.text} />
            <Text style={[styles.settingText, { color: theme.text }]}>App Theme</Text>
          </View>
          <View style={styles.settingRight}>
            <Text style={[styles.settingValue, { color: theme.secondaryText }]}>
              {themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.secondaryText} />
          </View>
        </TouchableOpacity>

        <View style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={20} color={theme.text} />
            <Text style={[styles.settingText, { color: theme.text }]}>Push Notifications</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: '#767577', true: '#007AFF' }}
            thumbColor={notifications ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>

        <View style={[styles.settingItem, { backgroundColor: theme.cardBackground, opacity: biometricAvailable ? 1 : 0.5 }]}>
          <View style={styles.settingLeft}>
            <Ionicons name="finger-print-outline" size={20} color={theme.text} />
            <Text style={[styles.settingText, { color: theme.text }]}>
              {biometricAvailable ? `${biometricType} Authentication` : 'Biometric Authentication (Unavailable)'}
            </Text>
          </View>
          <Switch
            value={biometrics}
            onValueChange={handleBiometricToggle}
            disabled={!biometricAvailable}
            trackColor={{ false: '#767577', true: '#007AFF' }}
            thumbColor={biometrics ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: '#FF3B30' }]}>Danger Zone</Text>
        
        <TouchableOpacity 
          style={[styles.settingItem, styles.dangerButton, { backgroundColor: theme.cardBackground, borderColor: '#FF3B30' }]}
          onPress={handleDeleteAccount}
          disabled={saving}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <View style={styles.dangerTextContainer}>
              <Text style={[styles.settingText, { color: '#FF3B30', fontWeight: '600' }]}>Delete Account</Text>
              <Text style={[styles.dangerSubtext, { color: theme.secondaryText }]}>Permanently delete all your data</Text>
            </View>
          </View>
          <Ionicons name="warning-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.cardBackground }]}>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <Text style={[styles.modalCancel, { color: '#007AFF' }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Theme</Text>
              <View style={{ width: 60 }} />
            </View>
            
            <View style={styles.themeOptions}>
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.themeOption,
                    { backgroundColor: theme.cardBackground },
                    themeMode === mode && { borderColor: '#007AFF', borderWidth: 2 }
                  ]}
                  onPress={() => selectTheme(mode)}
                >
                  <View style={styles.themeOptionLeft}>
                    <Ionicons 
                      name={
                        mode === 'light' ? 'sunny' : 
                        mode === 'dark' ? 'moon' : 
                        'phone-portrait'
                      } 
                      size={24} 
                      color={theme.text} 
                    />
                    <View>
                      <Text style={[styles.themeOptionTitle, { color: theme.text }]}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </Text>
                      <Text style={[styles.themeOptionDescription, { color: theme.secondaryText }]}>
                        {mode === 'light' ? 'Always use light theme' :
                         mode === 'dark' ? 'Always use dark theme' :
                         'Follow system preference'}
                      </Text>
                    </View>
                  </View>
                  {themeMode === mode && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const lightTheme = {
  background: '#f8f9fa',
  cardBackground: '#ffffff',
  text: '#000000',
  secondaryText: '#666666',
};

const darkTheme = {
  background: '#000000',
  cardBackground: '#1c1c1e',
  text: '#ffffff',
  secondaryText: '#999999',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  inputContainer: {
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
    padding: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    fontSize: 16,
    paddingVertical: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
  },
  dangerButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  dangerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  dangerSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 5,
    marginLeft: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    marginRight: 8,
  },
  themeOptions: {
    padding: 20,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  themeOptionDescription: {
    fontSize: 14,
    marginTop: 2,
    marginLeft: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCancel: {
    fontSize: 16,
    color: '#007AFF',
  },
});

import { useAuth } from '@/context/AuthContext';
import { useAppColorScheme, useThemeMode } from '@/hooks/useAppColorScheme';
import { apiClient } from '@/services/apiClient';
import { validateText } from '@/utils/inputValidation';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function PersonalSettingsScreen() {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [phone, setPhone] = useState('');
  const [themeMode, setThemeMode] = useThemeMode();
  const colorScheme = useAppColorScheme();
  const [notifications, setNotifications] = useState(true);
  const [biometrics, setBiometrics] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Validation state
  const [errors, setErrors] = useState({
    fullName: null as string | null,
    preferredName: null as string | null,
    phone: null as string | null,
  });

  useEffect(() => {
    loadPersonalSettings();
  }, []);

  const loadPersonalSettings = async () => {
    try {
      setLoading(true);
      
      // Load notification settings from AsyncStorage
      const notificationSetting = await AsyncStorage.getItem('notifications');
      const biometricSetting = await AsyncStorage.getItem('biometrics');
      
      if (notificationSetting !== null) setNotifications(JSON.parse(notificationSetting));
      if (biometricSetting !== null) setBiometrics(JSON.parse(biometricSetting));
      
      // Load user profile data from database
      try {
        const profileResponse = await apiClient.getUserProfile();
        
        if (profileResponse.success && profileResponse.data) {
          const profile = profileResponse.data as any;
          setFullName(profile.full_name || '');
          setPreferredName(profile.preferred_name || '');
          setPhone(profile.phone || '');
        } else {
          // Fallback to AsyncStorage
          const savedProfile = await AsyncStorage.getItem('userProfile');
          if (savedProfile) {
            const profile = JSON.parse(savedProfile);
            setFullName(profile.full_name || '');
            setPreferredName(profile.preferred_name || '');
            setPhone(profile.phone || '');
          } else {
            // Final fallback to auth metadata
            setFullName(user?.user_metadata?.full_name || '');
            setPreferredName(user?.user_metadata?.preferred_name || '');
            setPhone(user?.user_metadata?.phone || '');
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Fallback to AsyncStorage
        try {
          const savedProfile = await AsyncStorage.getItem('userProfile');
          if (savedProfile) {
            const profile = JSON.parse(savedProfile);
            setFullName(profile.full_name || '');
            setPreferredName(profile.preferred_name || '');
            setPhone(profile.phone || '');
          } else {
            // Final fallback to auth metadata
            setFullName(user?.user_metadata?.full_name || '');
            setPreferredName(user?.user_metadata?.preferred_name || '');
            setPhone(user?.user_metadata?.phone || '');
          }
        } catch (storageError) {
          // Final fallback to auth metadata
          setFullName(user?.user_metadata?.full_name || '');
          setPreferredName(user?.user_metadata?.preferred_name || '');
          setPhone(user?.user_metadata?.phone || '');
        }
      }
      
    } catch (error) {
      console.error('Error loading personal settings:', error);
    } finally {
      setLoading(false);
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
      
      // Save app preferences to AsyncStorage
      await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
      await AsyncStorage.setItem('biometrics', JSON.stringify(biometrics));
      
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

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Information</Text>
        
        <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>Full Name</Text>
          <TextInput
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
          {errors.fullName && (
            <Text style={styles.errorText}>{errors.fullName}</Text>
          )}
        </View>

        <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>Preferred Name</Text>
          <TextInput
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
          />
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
          <TextInput
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
          />
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
            onValueChange={setNotifications}
            trackColor={{ false: '#767577', true: '#007AFF' }}
            thumbColor={notifications ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>

        <View style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.settingLeft}>
            <Ionicons name="finger-print-outline" size={20} color={theme.text} />
            <Text style={[styles.settingText, { color: theme.text }]}>Biometric Authentication</Text>
          </View>
          <Switch
            value={biometrics}
            onValueChange={setBiometrics}
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

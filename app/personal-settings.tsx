import { useAuth } from '@/context/AuthContext';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { apiClient } from '@/services/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface UserProfile {
    full_name?: string;
    preferred_name?: string;
    phone_number?: string;
}

interface UserProfileResponse {
    full_name?: string;
    preferred_name?: string;
    phone_number?: string;
    email?: string;
    created_at?: string;
    updated_at?: string;
}

// Cache for user profile data
let profileCache: { data: UserProfile; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function PersonalSettingsScreen() {
    const { user, signOut } = useAuth();
    const colorScheme = useAppColorScheme();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    
    const [profile, setProfile] = useState<UserProfile>({
        full_name: '',
        preferred_name: '',
        phone_number: ''
    });

    const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

    useEffect(() => {
        // Check if we have cached data that's still valid
        if (profileCache && (Date.now() - profileCache.timestamp) < CACHE_DURATION) {
            setProfile(profileCache.data);
            setHasLoadedOnce(true);
        } else if (!hasLoadedOnce) {
            // Only load from API if we haven't loaded before or cache is expired
            loadUserProfile();
        }
    }, [hasLoadedOnce]);

    const loadUserProfile = async (forceRefresh = false) => {
        // If we're not forcing refresh and have valid cache, use it
        if (!forceRefresh && profileCache && (Date.now() - profileCache.timestamp) < CACHE_DURATION) {
            setProfile(profileCache.data);
            setHasLoadedOnce(true);
            return;
        }

        setIsLoading(true);
        try {
            console.log('📥 Loading user profile...');
            const response = await apiClient.getUserProfile();
            console.log('📋 User profile response:', response);
            
            if (response.success && response.data) {
                const profileData = response.data as UserProfileResponse;
                const newProfile = {
                    full_name: profileData.full_name || '',
                    preferred_name: profileData.preferred_name || '',
                    phone_number: profileData.phone_number || ''
                };
                
                // Update state
                setProfile(newProfile);
                
                // Cache the data
                profileCache = {
                    data: newProfile,
                    timestamp: Date.now()
                };
                
                setHasLoadedOnce(true);
            } else if (response.error && response.error.includes('not found')) {
                console.log('👤 User profile not found, will create on first save');
                // User profile doesn't exist yet, that's OK - it will be created on first save
                const emptyProfile = {
                    full_name: '',
                    preferred_name: '',
                    phone_number: ''
                };
                setProfile(emptyProfile);
                setHasLoadedOnce(true);
            } else {
                console.error('❌ Failed to load profile:', response.error);
                Alert.alert('Error', 'Failed to load profile information. Please try again.');
            }
        } catch (error) {
            console.error('💥 Error loading user profile:', error);
            Alert.alert('Error', 'Failed to load profile information. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (isSaving) return;

        setIsSaving(true);
        try {
            const profileToUpdate = {
                full_name: profile.full_name?.trim() || undefined,
                preferred_name: profile.preferred_name?.trim() || undefined,
                phone_number: profile.phone_number?.trim() || undefined
            };
            
            console.log('🔄 Updating user profile with data:', profileToUpdate);
            
            let response = await apiClient.updateUserProfile(profileToUpdate);
            
            // If update fails because user doesn't exist, try to create the user first
            if (!response.success && response.error && response.error.includes('not found')) {
                console.log('👤 User not found, creating user record first...');
                
                const createResponse = await apiClient.createUser({
                    full_name: profileToUpdate.full_name,
                    preferred_name: profileToUpdate.preferred_name,
                    email: user?.email
                });
                
                console.log('👤 Create user response:', createResponse);
                
                if (createResponse.success) {
                    // Now try the update again
                    response = await apiClient.updateUserProfile(profileToUpdate);
                    console.log('🔄 Second update attempt response:', response);
                } else {
                    console.error('❌ Failed to create user:', createResponse.error);
                    Alert.alert('Error', createResponse.error || 'Failed to create user profile. Please try again.');
                    return;
                }
            }
            
            console.log('✅ Final update user profile response:', response);

            if (response.success) {
                // Update cache with the saved data
                profileCache = {
                    data: {
                        full_name: profileToUpdate.full_name || '',
                        preferred_name: profileToUpdate.preferred_name || '',
                        phone_number: profileToUpdate.phone_number || ''
                    },
                    timestamp: Date.now()
                };
                
                Alert.alert('Success', 'Profile updated successfully!');
            } else {
                console.error('❌ Failed to update profile:', response.error);
                Alert.alert('Error', response.error || 'Failed to update profile. Please try again.');
            }
        } catch (error) {
            console.error('💥 Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This action cannot be undone. All your data including expenses, receipts, images, and profile information will be permanently deleted.\n\nAre you sure you want to delete your account?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Delete Account',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Final Confirmation',
                            'This will permanently delete all your data. This action cannot be undone.\n\nType "DELETE" to confirm:',
                            [
                                {
                                    text: 'Cancel',
                                    style: 'cancel'
                                },
                                {
                                    text: 'I understand, delete my account',
                                    style: 'destructive',
                                    onPress: confirmDeleteAccount
                                }
                            ]
                        );
                    }
                }
            ]
        );
    };

    const confirmDeleteAccount = async () => {
        if (isDeleting) return;

        setIsDeleting(true);
        try {
            const response = await apiClient.deleteUserAccount();
            
            if (response.success) {
                // Clear the cache when account is deleted
                profileCache = null;
                
                Alert.alert(
                    'Account Deleted',
                    'Your account and all associated data have been permanently deleted.',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                signOut();
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Error', response.error || 'Failed to delete account. Please try again or contact support.');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRefresh = () => {
        loadUserProfile(true); // Force refresh
    };

    const updateProfile = (field: keyof UserProfile, value: string) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
                <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Loading profile...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Personal Settings</Text>
                    <TouchableOpacity onPress={handleRefresh} disabled={isLoading}>
                        <Ionicons 
                            name="refresh" 
                            size={24} 
                            color={isLoading ? theme.secondaryText : theme.text} 
                        />
                    </TouchableOpacity>
                </View>

                {/* Profile Section */}
                <View style={[styles.profileSection, { backgroundColor: theme.cardBackground }]}>
                    <View style={styles.profileImageContainer}>
                        <Ionicons name="person" size={40} color={theme.secondaryText} />
                    </View>
                    <Text style={[styles.userEmail, { color: theme.secondaryText }]}>
                        {user?.email}
                    </Text>
                    <Text style={[styles.accountCreated, { color: theme.tertiaryText }]}>
                        Account created {new Date(user?.created_at || '').toLocaleDateString()}
                    </Text>
                </View>

                {/* Profile Information */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Profile Information</Text>
                    
                    {/* Full Name */}
                    <View style={[styles.inputGroup, { backgroundColor: theme.cardBackground }]}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>Full Name</Text>
                        <TextInput
                            style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
                            value={profile.full_name}
                            onChangeText={(text) => updateProfile('full_name', text)}
                            placeholder="Enter your full name"
                            placeholderTextColor={theme.placeholder}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Preferred Name */}
                    <View style={[styles.inputGroup, { backgroundColor: theme.cardBackground }]}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>Preferred Name</Text>
                        <TextInput
                            style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
                            value={profile.preferred_name}
                            onChangeText={(text) => updateProfile('preferred_name', text)}
                            placeholder="How would you like to be called?"
                            placeholderTextColor={theme.placeholder}
                            autoCapitalize="words"
                        />
                        <Text style={[styles.inputHint, { color: theme.tertiaryText }]}>
                            This name will be displayed throughout the app
                        </Text>
                    </View>

                    {/* Email (Read-only) */}
                    <View style={[styles.inputGroup, { backgroundColor: theme.cardBackground }]}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>Email Address</Text>
                        <TextInput
                            style={[styles.textInput, styles.readOnlyInput, { 
                                color: theme.secondaryText, 
                                borderColor: theme.border,
                                backgroundColor: theme.disabledBackground
                            }]}
                            value={user?.email}
                            editable={false}
                            placeholder="Email address"
                            placeholderTextColor={theme.placeholder}
                        />
                        <Text style={[styles.inputHint, { color: theme.tertiaryText }]}>
                            Email cannot be changed. Contact support if needed.
                        </Text>
                    </View>

                    {/* Phone Number */}
                    <View style={[styles.inputGroup, { backgroundColor: theme.cardBackground }]}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>Phone Number</Text>
                        <TextInput
                            style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
                            value={profile.phone_number}
                            onChangeText={(text) => updateProfile('phone_number', text)}
                            placeholder="Enter your phone number"
                            placeholderTextColor={theme.placeholder}
                            keyboardType="phone-pad"
                        />
                        <Text style={[styles.inputHint, { color: theme.tertiaryText }]}>
                            Optional - for account recovery purposes
                        </Text>
                    </View>
                </View>

                {/* Save Button */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: '#007AFF' }]}
                        onPress={handleSaveProfile}
                        disabled={isSaving}
                    >
                        <Text style={styles.saveButtonText}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Danger Zone */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: '#FF3B30' }]}>Danger Zone</Text>
                    
                    <View style={[styles.dangerZone, { 
                        backgroundColor: theme.cardBackground,
                        borderColor: '#FF3B30'
                    }]}>
                        <View style={styles.dangerContent}>
                            <Ionicons name="warning" size={24} color="#FF3B30" />
                            <View style={styles.dangerText}>
                                <Text style={[styles.dangerTitle, { color: theme.text }]}>
                                    Delete Account
                                </Text>
                                <Text style={[styles.dangerDescription, { color: theme.secondaryText }]}>
                                    Permanently delete your account and all associated data including expenses, receipts, and images. This action cannot be undone.
                                </Text>
                            </View>
                        </View>
                        
                        <TouchableOpacity
                            style={[styles.deleteButton, { 
                                backgroundColor: isDeleting ? '#FF6B6B' : '#FF3B30'
                            }]}
                            onPress={handleDeleteAccount}
                            disabled={isDeleting}
                        >
                            <Text style={styles.deleteButtonText}>
                                {isDeleting ? 'Deleting...' : 'Delete Account'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom Padding */}
                <View style={styles.bottomPadding} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const lightTheme = {
    background: '#f8f9fa',
    cardBackground: '#ffffff',
    text: '#000000',
    secondaryText: '#666666',
    tertiaryText: '#999999',
    border: '#e0e0e0',
    placeholder: '#999999',
    disabledBackground: '#f5f5f5'
};

const darkTheme = {
    background: '#000000',
    cardBackground: '#1c1c1e',
    text: '#ffffff',
    secondaryText: '#999999',
    tertiaryText: '#666666',
    border: '#333333',
    placeholder: '#666666',
    disabledBackground: '#2c2c2e'
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    loadingText: {
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 60,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    profileSection: {
        alignItems: 'center',
        padding: 24,
        marginHorizontal: 16,
        marginBottom: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    profileImageContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    userEmail: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    accountCreated: {
        fontSize: 12,
    },
    section: {
        marginHorizontal: 16,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    inputGroup: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 6,
    },
    readOnlyInput: {
        opacity: 0.7,
    },
    inputHint: {
        fontSize: 12,
    },
    saveButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    dangerZone: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 16,
    },
    dangerContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    dangerText: {
        flex: 1,
        marginLeft: 12,
    },
    dangerTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    dangerDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    deleteButton: {
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    bottomPadding: {
        height: 20,
    },
});

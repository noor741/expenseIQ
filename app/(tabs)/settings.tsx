import { useAuth } from '@/context/AuthContext';
import { useAppColorScheme, useThemeMode } from '@/hooks/useAppColorScheme';
import { apiClient } from '@/services/apiClient';
import { UserPreferencesService } from '@/services/UserPreferencesService';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

const CURRENCIES: Currency[] = [
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: '$' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: '$' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: '$' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
];

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [themeMode, setThemeMode] = useThemeMode();
  const colorScheme = useAppColorScheme();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(CURRENCIES[0]);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  // Refresh profile data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
    }, [])
  );

  const loadUserProfile = async () => {
    try {
      const profileResponse = await apiClient.getUserProfile();
      if (profileResponse.success && profileResponse.data) {
        setUserProfile(profileResponse.data);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadSettings = async () => {
    try {
      // First, migrate any legacy currency setting
      await UserPreferencesService.migrateLegacyCurrency();
      
      // Use UserPreferencesService instead of direct AsyncStorage
      const currency = await UserPreferencesService.getDefaultCurrency();
      
      const currencyObj = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
      setSelectedCurrency(currencyObj);
      
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const selectTheme = (selectedTheme: 'light' | 'dark' | 'system') => {
    setThemeMode(selectedTheme);
    setShowThemeModal(false);
  };

  const selectCurrency = async (currency: Currency) => {
    setSelectedCurrency(currency);
    setShowCurrencyModal(false);
    try {
      // Use UserPreferencesService instead of direct AsyncStorage
      await UserPreferencesService.setDefaultCurrency(currency.code);
    } catch (error) {
      console.error('Error saving currency setting:', error);
      Alert.alert('Error', 'Failed to save currency setting. Please try again.');
      // Revert the change on error
      const prevCurrency = CURRENCIES.find(c => c.code === selectedCurrency.code) || CURRENCIES[0];
      setSelectedCurrency(prevCurrency);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  const navigateToManageCategories = () => {
    router.push('/manage-categories');
  };

  const navigateToHelpSupport = () => {
    router.push('/help-support');
  };

  const navigateToFAQs = () => {
    router.push('/faqs');
  };

  const navigateToPersonalSettings = () => {
    router.push('/personal-settings');
  };

  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const renderCurrencyItem = ({ item }: { item: Currency }) => (
    <TouchableOpacity
      style={[styles.currencyItem, { backgroundColor: theme.cardBackground }]}
      onPress={() => selectCurrency(item)}
    >
      <View style={styles.currencyInfo}>
        <Text style={[styles.currencyCode, { color: theme.text }]}>{item.code}</Text>
        <Text style={[styles.currencyName, { color: theme.secondaryText }]}>{item.name}</Text>
      </View>
      <Text style={[styles.currencySymbol, { color: theme.text }]}>{item.symbol}</Text>
      {selectedCurrency.code === item.code && (
        <Ionicons name="checkmark" size={24} color="#007AFF" />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Profile Section */}
      <View style={[styles.profileSection, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.profileImageContainer}>
          <Ionicons name="person" size={40} color={theme.secondaryText} />
        </View>
        <Text style={[styles.userName, { color: theme.text }]}>
          {userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Loading...'}
        </Text>
        <Text style={[styles.userEmail, { color: theme.secondaryText }]}>
          {user?.email}
        </Text>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
        
        <TouchableOpacity 
          style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
          onPress={navigateToPersonalSettings}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="person-outline" size={20} color={theme.text} />
            <Text style={[styles.settingText, { color: theme.text }]}>Personal Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
        </TouchableOpacity>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferences</Text>
        
        {/* Currency */}
        <TouchableOpacity 
          style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
          onPress={() => setShowCurrencyModal(true)}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="cash-outline" size={20} color={theme.text} />
            <Text style={[styles.settingText, { color: theme.text }]}>Currency</Text>
          </View>
          <View style={styles.settingRight}>
            <Text style={[styles.settingValue, { color: theme.secondaryText }]}>
              {selectedCurrency.code} ({selectedCurrency.symbol})
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
          </View>
        </TouchableOpacity>

        {/* Theme Selection */}
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
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Categories</Text>
        
        <TouchableOpacity 
          style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
          onPress={navigateToManageCategories}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="grid-outline" size={20} color={theme.text} />
            <Text style={[styles.settingText, { color: theme.text }]}>Manage Categories</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
        </TouchableOpacity>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Support</Text>
        
        <TouchableOpacity 
          style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
          onPress={navigateToHelpSupport}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="help-circle-outline" size={20} color={theme.text} />
            <Text style={[styles.settingText, { color: theme.text }]}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
          onPress={navigateToFAQs}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.text} />
            <Text style={[styles.settingText, { color: theme.text }]}>FAQs</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.signOutButton, { backgroundColor: theme.cardBackground }]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Currency</Text>
            <View style={{ width: 50 }} />
          </View>
          
          <FlatList
            data={CURRENCIES}
            renderItem={renderCurrencyItem}
            keyExtractor={(item) => item.code}
            style={styles.currencyList}
          />
        </View>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="slide"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowThemeModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
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
  profileSection: {
    alignItems: 'center',
    padding: 30,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 2,
    minHeight: 56,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 14,
    marginRight: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: 16,
    color: '#FF3B30',
    marginLeft: 8,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
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
  currencyList: {
    flex: 1,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 2,
    borderRadius: 8,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '500',
  },
  currencyName: {
    fontSize: 14,
    marginTop: 2,
  },
  currencySymbol: {
    fontSize: 16,
    marginRight: 10,
    minWidth: 20,
    textAlign: 'center',
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
});
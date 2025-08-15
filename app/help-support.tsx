import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function HelpSupportScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadThemeSettings();
  }, []);

  const loadThemeSettings = async () => {
    try {
      const darkMode = await AsyncStorage.getItem('darkMode');
      if (darkMode !== null) {
        setIsDarkMode(JSON.parse(darkMode));
      }
    } catch (error) {
      console.error('Error loading theme settings:', error);
    }
  };

  const handleEmailSupport = () => {
    const email = 'support@expenseiq.com';
    const subject = 'ExpenseIQ Support Request';
    const body = 'Please describe your issue or question here...';
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert('Error', 'Unable to open email client. Please contact support@expenseiq.com');
    });
  };

  const handlePhoneSupport = () => {
    const phoneNumber = '+1-800-EXPENSE';
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Error', 'Unable to make phone call');
    });
  };

  const handleWebsite = () => {
    Linking.openURL('https://expenseiq.com/support').catch(() => {
      Alert.alert('Error', 'Unable to open website');
    });
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://expenseiq.com/privacy').catch(() => {
      Alert.alert('Error', 'Unable to open privacy policy');
    });
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://expenseiq.com/terms').catch(() => {
      Alert.alert('Error', 'Unable to open terms of service');
    });
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Contact Support */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact Support</Text>
        
        <TouchableOpacity 
          style={[styles.supportItem, { backgroundColor: theme.cardBackground }]}
          onPress={handleEmailSupport}
        >
          <View style={styles.supportLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#007AFF20' }]}>
              <Ionicons name="mail-outline" size={20} color="#007AFF" />
            </View>
            <View>
              <Text style={[styles.supportTitle, { color: theme.text }]}>Email Support</Text>
              <Text style={[styles.supportSubtitle, { color: theme.secondaryText }]}>
                Get help via email within 24 hours
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.supportItem, { backgroundColor: theme.cardBackground }]}
          onPress={handlePhoneSupport}
        >
          <View style={styles.supportLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#34C75920' }]}>
              <Ionicons name="call-outline" size={20} color="#34C759" />
            </View>
            <View>
              <Text style={[styles.supportTitle, { color: theme.text }]}>Phone Support</Text>
              <Text style={[styles.supportSubtitle, { color: theme.secondaryText }]}>
                Mon-Fri, 9 AM - 5 PM EST
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.supportItem, { backgroundColor: theme.cardBackground }]}
          onPress={handleWebsite}
        >
          <View style={styles.supportLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#FF952020' }]}>
              <Ionicons name="globe-outline" size={20} color="#FF9500" />
            </View>
            <View>
              <Text style={[styles.supportTitle, { color: theme.text }]}>Online Help Center</Text>
              <Text style={[styles.supportSubtitle, { color: theme.secondaryText }]}>
                Browse articles and tutorials
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={[styles.actionItem, { backgroundColor: theme.cardBackground }]}
          onPress={() => router.push('/faqs')}
        >
          <View style={styles.actionLeft}>
            <Ionicons name="help-circle-outline" size={20} color={theme.text} />
            <Text style={[styles.actionText, { color: theme.text }]}>Frequently Asked Questions</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionItem, { backgroundColor: theme.cardBackground }]}
          onPress={() => Alert.alert('Feature Request', 'Thank you for your feedback! Feature requests can be submitted through our email support.')}
        >
          <View style={styles.actionLeft}>
            <Ionicons name="bulb-outline" size={20} color={theme.text} />
            <Text style={[styles.actionText, { color: theme.text }]}>Request a Feature</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionItem, { backgroundColor: theme.cardBackground }]}
          onPress={() => Alert.alert('Bug Report', 'Found a bug? Please report it through our email support with details about the issue.')}
        >
          <View style={styles.actionLeft}>
            <Ionicons name="bug-outline" size={20} color={theme.text} />
            <Text style={[styles.actionText, { color: theme.text }]}>Report a Bug</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
        </TouchableOpacity>
      </View>

      {/* App Information */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>App Information</Text>
        
        <View style={[styles.infoItem, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.infoLabel, { color: theme.secondaryText }]}>Version</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>1.0.0</Text>
        </View>

        <View style={[styles.infoItem, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.infoLabel, { color: theme.secondaryText }]}>Build</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>2025.08.15</Text>
        </View>
      </View>

      {/* Legal */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Legal</Text>
        
        <TouchableOpacity 
          style={[styles.actionItem, { backgroundColor: theme.cardBackground }]}
          onPress={handlePrivacyPolicy}
        >
          <View style={styles.actionLeft}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.text} />
            <Text style={[styles.actionText, { color: theme.text }]}>Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionItem, { backgroundColor: theme.cardBackground }]}
          onPress={handleTermsOfService}
        >
          <View style={styles.actionLeft}>
            <Ionicons name="document-text-outline" size={20} color={theme.text} />
            <Text style={[styles.actionText, { color: theme.text }]}>Terms of Service</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.secondaryText} />
        </TouchableOpacity>
      </View>
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  supportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  supportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  supportSubtitle: {
    fontSize: 14,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
});

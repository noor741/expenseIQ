import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';

interface BiometricSettings {
  isEnabled: boolean;
  hasCredentials: boolean;
}

export class BiometricService {
  private static readonly BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
  private static readonly BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';

  /**
   * Check if the device supports biometric authentication
   */
  static async isAvailable(): Promise<boolean> {
    try {
      console.log('BiometricService: Checking biometric availability...');
      
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      console.log('BiometricService: Has hardware:', hasHardware);
      console.log('BiometricService: Is enrolled:', isEnrolled);
      
      const available = hasHardware && isEnrolled;
      console.log('BiometricService: Available:', available);
      
      return available;
    } catch (error) {
      console.error('BiometricService: Error checking availability:', error);
      return false;
    }
  }

  /**
   * Get available authentication types
   */
  static async getAvailableTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.error('Error getting authentication types:', error);
      return [];
    }
  }

  /**
   * Get biometric type name for display
   */
  static async getBiometricTypeName(): Promise<string> {
    const types = await this.getAvailableTypes();
    
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    } else {
      return 'Biometric';
    }
  }

  /**
   * Authenticate using biometrics
   */
  static async authenticate(reason: string = 'Authenticate to access your account'): Promise<boolean> {
    try {
      console.log('BiometricService: Starting authentication with reason:', reason);
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
        requireConfirmation: false,
      });

      console.log('BiometricService: Authentication result:', result);
      return result.success;
    } catch (error) {
      console.error('BiometricService: Authentication error:', error);
      return false;
    }
  }

  /**
   * Enable biometric login and store credentials
   */
  static async enableBiometricLogin(email: string, encryptedPassword: string): Promise<boolean> {
    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        Alert.alert(
          'Biometric Authentication Unavailable',
          'Your device does not support biometric authentication or no biometrics are enrolled.'
        );
        return false;
      }

      // Test biometric authentication first
      const authResult = await this.authenticate('Enable biometric login for ExpenseIQ');
      if (!authResult) {
        return false;
      }

      // Store credentials (encrypted)
      const credentials = {
        email,
        encryptedPassword,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(this.BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(credentials));
      await AsyncStorage.setItem(this.BIOMETRIC_ENABLED_KEY, 'true');

      return true;
    } catch (error) {
      console.error('Error enabling biometric login:', error);
      return false;
    }
  }

  /**
   * Disable biometric login
   */
  static async disableBiometricLogin(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.BIOMETRIC_CREDENTIALS_KEY);
      await AsyncStorage.setItem(this.BIOMETRIC_ENABLED_KEY, 'false');
    } catch (error) {
      console.error('Error disabling biometric login:', error);
    }
  }

  /**
   * Check if biometric login is enabled
   */
  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(this.BIOMETRIC_ENABLED_KEY);
      const hasCredentials = await AsyncStorage.getItem(this.BIOMETRIC_CREDENTIALS_KEY);
      return enabled === 'true' && hasCredentials !== null;
    } catch (error) {
      console.error('Error checking biometric status:', error);
      return false;
    }
  }

  /**
   * Get stored credentials after biometric authentication
   */
  static async getStoredCredentials(): Promise<{ email: string; encryptedPassword: string } | null> {
    try {
      const credentialsString = await AsyncStorage.getItem(this.BIOMETRIC_CREDENTIALS_KEY);
      if (!credentialsString) {
        return null;
      }

      const credentials = JSON.parse(credentialsString);
      return {
        email: credentials.email,
        encryptedPassword: credentials.encryptedPassword,
      };
    } catch (error) {
      console.error('Error getting stored credentials:', error);
      return null;
    }
  }

  /**
   * Perform biometric login
   */
  static async biometricLogin(): Promise<{ email: string; encryptedPassword: string } | null> {
    try {
      console.log('BiometricService: Starting biometric login...');
      
      const isEnabled = await this.isBiometricEnabled();
      console.log('BiometricService: Biometric enabled:', isEnabled);
      
      if (!isEnabled) {
        console.log('BiometricService: Biometric login not enabled');
        return null;
      }

      const biometricName = await this.getBiometricTypeName();
      console.log('BiometricService: Biometric type:', biometricName);
      
      const authResult = await this.authenticate(`Use ${biometricName} to sign in to ExpenseIQ`);
      console.log('BiometricService: Authentication result:', authResult);
      
      if (!authResult) {
        console.log('BiometricService: Authentication failed or cancelled');
        return null;
      }

      const credentials = await this.getStoredCredentials();
      console.log('BiometricService: Retrieved credentials:', credentials ? 'success' : 'failed');
      
      return credentials;
    } catch (error) {
      console.error('BiometricService: Error during biometric login:', error);
      return null;
    }
  }

  /**
   * Get biometric settings for display
   */
  static async getBiometricSettings(): Promise<BiometricSettings> {
    try {
      const isEnabled = await this.isBiometricEnabled();
      const hasCredentials = await AsyncStorage.getItem(this.BIOMETRIC_CREDENTIALS_KEY) !== null;
      
      return {
        isEnabled,
        hasCredentials,
      };
    } catch (error) {
      console.error('Error getting biometric settings:', error);
      return {
        isEnabled: false,
        hasCredentials: false,
      };
    }
  }
}

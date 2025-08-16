import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserPreferences {
  defaultCurrency: string;
  notifications: boolean;
}

/**
 * Service for managing user preferences locally using AsyncStorage
 * Simple, fast, and doesn't require database setup
 */
export class UserPreferencesService {
  private static readonly STORAGE_KEYS = {
    CURRENCY: 'user_default_currency',
    NOTIFICATIONS: 'user_notifications',
  };

  /**
   * Get user's default currency from local storage
   * Falls back to USD if not set
   */
  static async getDefaultCurrency(): Promise<string> {
    try {
      const localCurrency = await AsyncStorage.getItem(this.STORAGE_KEYS.CURRENCY);
      return localCurrency || 'USD';
    } catch (error) {
      console.error('Error getting default currency:', error);
      return 'USD'; // Safe fallback
    }
  }

  /**
   * Set user's default currency in local storage
   */
  static async setDefaultCurrency(currency: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.CURRENCY, currency);
    } catch (error) {
      console.error('Error setting default currency:', error);
      throw error;
    }
  }

  /**
   * Get all user preferences from local storage
   */
  static async getUserPreferences(): Promise<UserPreferences> {
    try {
      const currency = await this.getDefaultCurrency();
      const notifications = await AsyncStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS);
      
      return {
        defaultCurrency: currency,
        notifications: notifications ? JSON.parse(notifications) : true,
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return {
        defaultCurrency: 'USD',
        notifications: true,
      };
    }
  }

  /**
   * Update multiple preferences at once
   */
  static async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      if (preferences.defaultCurrency) {
        await this.setDefaultCurrency(preferences.defaultCurrency);
      }

      if (preferences.notifications !== undefined) {
        await AsyncStorage.setItem(
          this.STORAGE_KEYS.NOTIFICATIONS, 
          JSON.stringify(preferences.notifications)
        );
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Migrate old currency setting to new system
   */
  static async migrateLegacyCurrency(): Promise<void> {
    try {
      const oldCurrency = await AsyncStorage.getItem('defaultCurrency');
      if (oldCurrency && oldCurrency !== 'null') {
        await this.setDefaultCurrency(oldCurrency);
        await AsyncStorage.removeItem('defaultCurrency');
      }
    } catch (error) {
      console.error('Error migrating legacy currency:', error);
    }
  }
}

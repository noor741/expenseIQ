import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Simple encryption/decryption utility for storing sensitive data
 * Note: This is a basic implementation. For production apps, consider using
 * more robust encryption libraries like react-native-keychain
 */
export class EncryptionService {
  private static readonly ENCRYPTION_KEY = 'expenseiq_biometric_key';

  /**
   * Simple XOR encryption (basic obfuscation)
   * In production, use proper encryption libraries
   */
  private static xorEncrypt(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return btoa(result); // Base64 encode
  }

  /**
   * Simple XOR decryption
   */
  private static xorDecrypt(encryptedText: string, key: string): string {
    try {
      const decodedText = atob(encryptedText); // Base64 decode
      let result = '';
      for (let i = 0; i < decodedText.length; i++) {
        result += String.fromCharCode(
          decodedText.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return result;
    } catch (error) {
      console.error('Decryption error:', error);
      return '';
    }
  }

  /**
   * Encrypt password for storage
   */
  static async encryptPassword(password: string): Promise<string> {
    try {
      // Generate or retrieve a unique key for this device
      let deviceKey = await AsyncStorage.getItem(this.ENCRYPTION_KEY);
      if (!deviceKey) {
        deviceKey = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);
        await AsyncStorage.setItem(this.ENCRYPTION_KEY, deviceKey);
      }

      return this.xorEncrypt(password, deviceKey);
    } catch (error) {
      console.error('Encryption error:', error);
      return password; // Fallback to plain text (not recommended for production)
    }
  }

  /**
   * Decrypt password from storage
   */
  static async decryptPassword(encryptedPassword: string): Promise<string> {
    try {
      console.log('EncryptionService: Decrypting password...');
      
      const deviceKey = await AsyncStorage.getItem(this.ENCRYPTION_KEY);
      if (!deviceKey) {
        console.error('EncryptionService: No encryption key found');
        return '';
      }

      const decrypted = this.xorDecrypt(encryptedPassword, deviceKey);
      console.log('EncryptionService: Password decrypted successfully');
      
      return decrypted;
    } catch (error) {
      console.error('EncryptionService: Decryption error:', error);
      return '';
    }
  }

  /**
   * Clear encryption key (when user logs out or disables biometric)
   */
  static async clearEncryptionKey(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.ENCRYPTION_KEY);
    } catch (error) {
      console.error('Error clearing encryption key:', error);
    }
  }
}

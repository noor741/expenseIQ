
/**
 * User preferences utilities for backend functions
 * NOTE: Backend functions can't access AsyncStorage, so we pass currency from frontend
 */

/**
 * Get user's default currency - this should be passed from frontend
 * Falls back to USD if no currency is provided
 */
export async function getUserDefaultCurrency(userId: string, userCurrency?: string): Promise<string> {
  console.log(`📋 Getting default currency for user: ${userId}`);
  
  if (userCurrency) {
    console.log(`💰 Using provided currency: ${userCurrency}`);
    return userCurrency;
  }
  
  console.log(`⚠️ No currency provided, falling back to USD`);
  return 'USD';
}

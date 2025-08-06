import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import 'react-native-url-polyfill/auto'

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

// Validate that environment variables are loaded
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file and app.json configuration.'
  )
}

// Create a safe storage adapter that works across platforms
const createStorage = () => {
  // Check if we're in a browser environment
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Use localStorage for web
    return {
      getItem: (key: string) => {
        return Promise.resolve(localStorage.getItem(key))
      },
      setItem: (key: string, value: string) => {
        localStorage.setItem(key, value)
        return Promise.resolve()
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key)
        return Promise.resolve()
      },
    }
  } else if (Platform.OS === 'web') {
    // Server-side rendering fallback (no-op storage)
    return {
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    }
  } else {
    // Use AsyncStorage for React Native
    return AsyncStorage
  }
}

/**
 * Supabase Client Configuration
 * 
 * This creates a Supabase client with cross-platform storage for session persistence.
 * The client handles:
 * - User authentication (login, signup, logout)
 * - Database operations (CRUD)
 * - Real-time subscriptions
 * - File storage operations
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use platform-appropriate storage for session persistence
    storage: createStorage(),
    // Set to false to disable automatic token refresh
    autoRefreshToken: true,
    // Set to false to disable session persistence
    persistSession: true,
    // Detect session in URL (for OAuth flows and password recovery)
    detectSessionInUrl: true,
    // Configure flow type for better password reset handling
    flowType: 'pkce',
  },
})

/**
 * Database Types
 * 
 * TODO: Generate types from your Supabase schema using:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts
 * 
 * Then import and use them like:
 * export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {...})
 */

/**
 * Helper Functions
 */

// Get current user session
export const getCurrentUser = () => {
  return supabase.auth.getUser()
}

// Sign out user
export const signOut = () => {
  return supabase.auth.signOut()
}

// Check if user is authenticated
export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

import { defaultConfig } from '@tamagui/config/v4'
import React from 'react'
import { TamaguiProvider, Text, YStack, createTamagui } from 'tamagui'

const config = createTamagui(defaultConfig)

/**
 * Forgot Password Screen Component
 * 
 * This file handles the password reset flow for users who forgot their login credentials.
 * Features to implement:
 * - Email input field for password reset
 * - Send reset email button
 * - Confirmation message after email sent
 * - Resend email option with timer
 * - Back to login navigation
 * - Email validation
 * - Instructions for checking email and spam folder
 * - Success/error state handling
 */

export default function ForgotPasswordScreen() {
  return (
    <TamaguiProvider config={config}>
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text fontSize="$6" fontWeight="bold">Forgot Password</Text>
        <Text fontSize="$3" color="$gray11" textAlign="center" marginTop="$2">
          Password reset functionality coming soon...
        </Text>
      </YStack>
    </TamaguiProvider>
  )
}

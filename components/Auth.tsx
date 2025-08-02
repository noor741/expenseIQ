import { defaultConfig } from '@tamagui/config/v4'
import React, { useState } from 'react'
import { Alert } from 'react-native'
import { Button, Input, TamaguiProvider, Text, YStack, createTamagui } from 'tamagui'
import { supabase } from '../lib/supabase'

const config = createTamagui(defaultConfig)

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
    setLoading(false)
  }

  async function signUpWithEmail() {
    setLoading(true)
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
    if (!session) Alert.alert('Please check your inbox for email verification!')
    setLoading(false)
  }

  return (
    <TamaguiProvider config={config}>
      <YStack padding="$4" space="$4" maxWidth={400} alignSelf="center">
        <YStack space="$2">
          <Text color="$gray11" fontSize="$3">Email</Text>
          <Input
            placeholder="email@address.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            disabled={loading}
          />
        </YStack>

        <YStack space="$2">
          <Text color="$gray11" fontSize="$3">Password</Text>
          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            autoCapitalize="none"
            disabled={loading}
          />
        </YStack>

        <YStack space="$3" marginTop="$4">
          <Button
            disabled={loading}
            onPress={signInWithEmail}
            backgroundColor="$blue10"
            color="white"
            pressStyle={{ backgroundColor: '$blue11' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <Button
            disabled={loading}
            onPress={signUpWithEmail}
            backgroundColor="$green10"
            color="white"
            pressStyle={{ backgroundColor: '$green11' }}
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </Button>
        </YStack>
      </YStack>
    </TamaguiProvider>
  )
}
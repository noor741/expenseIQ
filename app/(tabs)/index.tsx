import ButtonUI from '@/components/ui/buttonUi';
import { signOut } from '@/lib/supabase';
import { defaultConfig } from '@tamagui/config/v4';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { Button, TamaguiProvider, View, YStack, createTamagui } from 'tamagui';

const config = createTamagui(defaultConfig)

export default function HomeScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        Alert.alert('Logout Error', error.message);
      } else {
        router.replace('/(auth)/login');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred during logout');
      console.error('Logout error:', error);
    }
  };

  return (
    <TamaguiProvider config={config}>
      <View height="100%" backgroundColor='white'>
        <YStack padding={20} space={16}>
          <ButtonUI buttonText="Hello" />
          <Button 
            backgroundColor="$red10" 
            color="white" 
            onPress={handleLogout}
          >
            Logout
          </Button>
        </YStack>
      </View>
    </TamaguiProvider>
  );
}

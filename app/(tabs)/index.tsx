import ButtonUI from '@/components/ui/buttonUi';
import { signOut } from '@/lib/supabase';
import { defaultConfig } from '@tamagui/config/v4';
import { TamaguiProvider, View, YStack, createTamagui } from 'tamagui';

const config = createTamagui(defaultConfig)

export default function HomeScreen() {
  // 

  

  return (
    <TamaguiProvider config={config}>
      <View height="100%" backgroundColor='white'>
        <YStack padding={20} space={16}>
          <ButtonUI buttonText="Hello" />
          
        </YStack>
      </View>
    </TamaguiProvider>
  );
}

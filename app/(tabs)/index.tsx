import ButtonUI from '@/components/expenseUI/button';
import { defaultConfig } from '@tamagui/config/v4';
import { TamaguiProvider, View, createTamagui } from 'tamagui';

const config = createTamagui(defaultConfig)

export default function HomeScreen() {
  return (
    <TamaguiProvider config={config}>
      <View height="100%" backgroundColor='white'>
        <ButtonUI buttonText="Hello" />
      </View>
    </TamaguiProvider>
  );
}

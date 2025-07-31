import { defaultConfig } from '@tamagui/config/v4';
import { Button, TamaguiProvider, View, createTamagui } from 'tamagui';

const config = createTamagui(defaultConfig)

export default function HomeScreen() {
  return (
    <TamaguiProvider config={config}>
      <View height="100%" backgroundColor='white'>
        <Button margin={100} backgroundColor='blue'>Hello World</Button>
      </View>

    </TamaguiProvider>
  );
}

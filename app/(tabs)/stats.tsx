import { TamaguiProvider, View, createTamagui } from "@tamagui/core";

import ButtonUI from "@/components/ui/buttonUi";
import { defaultConfig } from "@tamagui/config/v4";

const config = createTamagui(defaultConfig)

export default function ExpenseScreen() {
  return (
    <TamaguiProvider config={config}>
      <View height="100%" backgroundColor='white'>
        <ButtonUI buttonText="Stats Screen" />
      </View>
    </TamaguiProvider>
  );
}
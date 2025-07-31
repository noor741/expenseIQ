import { TamaguiProvider, View, createTamagui} from "@tamagui/core";

import { defaultConfig } from "@tamagui/config/v4";
import ButtonUI from "@/components/expenseUI/button";

const config = createTamagui(defaultConfig)

export default function ExpenseScreen() {
  return (
    <TamaguiProvider config={config}>
      <View height="100%" backgroundColor='white'>
        <ButtonUI buttonText="Scan" />
      </View>
    </TamaguiProvider>
  );
}
import { TamaguiProvider, View, createTamagui } from "@tamagui/core";

import ButtonUI from "@/components/expenseUI/button";
import { defaultConfig } from "@tamagui/config/v4";

const config = createTamagui(defaultConfig)

export default function SettingScreen() {
    return (
        <TamaguiProvider config={config}>
            <View height="100%" backgroundColor='white'>
                <ButtonUI buttonText="Settings" />
            </View>
        </TamaguiProvider>
    );
}
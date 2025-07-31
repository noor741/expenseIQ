import { Button, TamaguiProvider, Theme } from "tamagui";

export default function ButtonUI({ buttonText }: { buttonText: string }) {
    return (
        <TamaguiProvider>
            <Theme name="dark" >
                    <Button margin='20%'>
                        {buttonText}
                    </Button>
            </Theme>
        </TamaguiProvider>
    );
}

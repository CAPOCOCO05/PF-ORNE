import { AuthProvider } from "../src/context/AuthContext";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout(){ // root layout para proveer el contexto de autenticacion a toda la app
    return(
        // el menu lateral (Drawer) necesita el contenedor de gestos en la raiz
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                </Stack>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}

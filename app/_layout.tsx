import { AuthProvider } from "../src/context/AuthContext";
import { Stack } from "expo-router";

export default function RootLayout(){ // root layout para proveer el contexto de autenticacion a toda la app
    return(
        <AuthProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
            </Stack>
        </AuthProvider>
    );
}
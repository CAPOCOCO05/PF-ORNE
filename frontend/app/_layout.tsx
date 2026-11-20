import BannerConexion from "../src/components/BannerConexion";
import { AuthProvider } from "../src/context/AuthContext";
import { DialogoProvider } from "../src/context/DialogoContext";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout(){ // root layout para proveer el contexto de autenticacion a toda la app
    return(
        // contenedor de gestos en la raiz (lo usan las pantallas con gestos de navegacion)
        <GestureHandlerRootView style={{ flex: 1 }}>
            {/* dialogos propios (F07 M1); arriba del Stack para que sigan visibles al navegar */}
            <DialogoProvider>
                <AuthProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" />
                    </Stack>
                    {/* aviso flotante de "Sin conexión a internet" en todas las pantallas (F10 A8) */}
                    <BannerConexion />
                </AuthProvider>
            </DialogoProvider>
        </GestureHandlerRootView>
    );
}

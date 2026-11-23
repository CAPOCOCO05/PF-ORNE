import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme/colors";

// encabezado de las secciones: el logo ORNE; la navegacion vive en la barra inferior y el
// perfil es una pestaña (F08 N1). Sin sesion muestra "Iniciar sesión" (F09)
export default function Encabezado() {
    const {top} = useSafeAreaInsets();
    const {session} = useAuth();
    const router = useRouter();

    return (
        <View style={[styles.barra, {paddingTop: top + 8}]}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="ORNE" />
            {session ? null : (
                <Pressable onPress={() => router.push('/login')} hitSlop={8} accessibilityRole="button" style={styles.iniciar}>
                    <Text style={styles.textoIniciar}>Iniciar sesión</Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    barra: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 8,
        backgroundColor: COLORS.FONDO,
    },
    logo: {
        width: 90,
        height: 44,
    },
    iniciar: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.BOTON_PRINCIPAL,
    },
    textoIniciar: {
        color: COLORS.TITULO,
        fontSize: 14,
        fontWeight: '700',
    },
});

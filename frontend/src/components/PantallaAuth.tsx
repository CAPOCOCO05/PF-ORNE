import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../theme/colors";
import FondoOndas from "./FondoOndas";
import VistaTeclado from "./VistaTeclado";

interface PantallaAuthProps {
    children: React.ReactNode; // contenido de la tarjeta (campos y boton)
    pie: React.ReactNode;      // enlace debajo de la tarjeta ("¿No tienes cuenta? ...")
    mensajeError?: string | null; // error general (credenciales, conexion)
}

// estructura comun de login y registro (design/pantalla_login.png)
export default function PantallaAuth({children, pie, mensajeError}: PantallaAuthProps) {
    return (
        <SafeAreaView style={styles.pantalla}>
            <FondoOndas />
            <VistaTeclado>
                <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
                    <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="ORNE" />

                    <View style={styles.tarjetaContenedor}>
                        <Image source={require('../../assets/icono_pastel.png')} style={styles.iconoPastel} resizeMode="contain" />
                        <View style={styles.tarjeta}>
                            {mensajeError ? (
                                <Text style={styles.error} accessibilityRole="alert">{mensajeError}</Text>
                            ) : null}
                            {children}
                        </View>
                    </View>

                    <View style={styles.pie}>{pie}</View>
                </ScrollView>
            </VistaTeclado>
        </SafeAreaView>
    );
}

const ALTO_ICONO = 80;

const styles = StyleSheet.create({
    pantalla: {
        flex: 1,
        backgroundColor: COLORS.BLANCO,
    },
    contenido: {
        flexGrow: 1,
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: 24,
        paddingBottom: 160, // deja ver las ondas del pie
    },
    logo: {
        width: 180,
        height: 90,
        marginBottom: 8,
    },
    tarjetaContenedor: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    iconoPastel: {
        width: ALTO_ICONO * 0.73,
        height: ALTO_ICONO,
        marginBottom: -ALTO_ICONO / 2, // asoma por encima de la tarjeta
        zIndex: 1,
    },
    tarjeta: {
        width: '100%',
        backgroundColor: COLORS.FONDO,
        borderRadius: 28,
        paddingHorizontal: 24,
        paddingTop: ALTO_ICONO / 2 + 16,
        paddingBottom: 20,
    },
    error: {
        color: COLORS.ERROR,
        textAlign: 'center',
        marginBottom: 12,
    },
    pie: {
        marginTop: 20,
        alignItems: 'center',
    },
});

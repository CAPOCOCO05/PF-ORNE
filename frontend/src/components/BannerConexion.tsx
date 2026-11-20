import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import { useNetworkState } from "expo-network";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../theme/colors";
import { estaSinConexion } from "../utils/conexion";

export const TEXTO_SIN_CONEXION = 'Sin conexión a internet';
export const TEXTO_CONEXION_RESTABLECIDA = 'Conexión restablecida';
export const DURACION_RESTABLECIDA_MS = 2500;

type Aviso = 'sinConexion' | 'restablecida' | null;

// F10 A8: aviso flotante en toda la app en cuanto se pierde el internet (p. ej. modo
// avion), sin esperar a que falle una accion; al volver la conexion lo confirma un momento.
// No bloquea toques: las pantallas siguen mostrando su propio error con "Reintentar"
export default function BannerConexion() {
    const sinConexion = estaSinConexion(useNetworkState());
    const aviso = useAvisoConexion(sinConexion);
    const {top} = useSafeAreaInsets();

    if (!aviso) return null;
    const restablecida = aviso === 'restablecida';
    return (
        <View pointerEvents="none" style={[styles.contenedor, {top: top + 8}]}>
            <View
                testID="banner-conexion"
                accessibilityRole="alert"
                style={[styles.banner, restablecida && styles.bannerRestablecida]}
            >
                <View style={[styles.punto, restablecida && styles.puntoRestablecida]} />
                <Text style={[styles.texto, restablecida && styles.textoRestablecida]}>
                    {restablecida ? TEXTO_CONEXION_RESTABLECIDA : TEXTO_SIN_CONEXION}
                </Text>
            </View>
        </View>
    );
}

// que aviso mostrar: sin conexion mientras dure; "restablecida" un momento al volver
function useAvisoConexion(sinConexion: boolean): Aviso {
    const [aviso, setAviso] = useState<Aviso>(null);
    const estuvoSinConexion = useRef(false);

    useEffect(() => {
        if (sinConexion) {
            estuvoSinConexion.current = true;
            setAviso('sinConexion');
            AccessibilityInfo.announceForAccessibility?.(TEXTO_SIN_CONEXION);
            return;
        }
        if (!estuvoSinConexion.current) return;
        estuvoSinConexion.current = false;
        setAviso('restablecida');
        const temporizador = setTimeout(() => setAviso(null), DURACION_RESTABLECIDA_MS);
        return () => clearTimeout(temporizador);
    }, [sinConexion]);

    return aviso;
}

const styles = StyleSheet.create({
    contenedor: {
        position: 'absolute',
        left: 16,
        right: 16,
        alignItems: 'center',
        zIndex: 1000,
        elevation: 1000,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: COLORS.TITULO,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: {width: 0, height: 2},
    },
    bannerRestablecida: {
        backgroundColor: COLORS.BOTON_SECUNDARIO,
    },
    punto: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.BOTON_SECUNDARIO,
    },
    puntoRestablecida: {
        backgroundColor: COLORS.TITULO,
    },
    texto: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.BLANCO,
    },
    textoRestablecida: {
        color: COLORS.TITULO,
    },
});

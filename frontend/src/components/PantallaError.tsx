import { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { ErrorBoundaryProps } from "expo-router";
import Boton from "./Boton";
import { COLORS } from "../theme/colors";

export const TITULO_ERROR_INESPERADO = 'Algo salió mal';
export const MENSAJE_ERROR_INESPERADO = 'Ocurrió un error inesperado. Tus pedidos guardados no se perdieron; inténtalo de nuevo.';

// ErrorBoundary de Expo Router: si una pantalla falla al dibujarse, en lugar de cerrarse la app o
// mostrar la pantalla roja se ve este aviso con "Reintentar", que vuelve a dibujar la pantalla
export default function PantallaError({error, retry}: ErrorBoundaryProps) {
    useEffect(() => {
        console.error('Error inesperado en una pantalla:', error);
    }, [error]);

    return (
        <View style={styles.contenedor} testID="pantalla-error">
            <Image source={require('../../assets/icono_pastel.png')} style={styles.icono} resizeMode="contain" />
            <Text style={styles.titulo} accessibilityRole="header">{TITULO_ERROR_INESPERADO}</Text>
            <Text style={styles.mensaje}>{MENSAJE_ERROR_INESPERADO}</Text>
            <Boton titulo="Reintentar" onPress={() => { void retry(); }} style={styles.boton} />
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: COLORS.FONDO,
    },
    icono: {
        width: 72,
        height: 72,
        marginBottom: 16,
    },
    titulo: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.TITULO,
        textAlign: 'center',
    },
    mensaje: {
        marginTop: 8,
        fontSize: 15,
        lineHeight: 21,
        color: COLORS.TEXTO,
        textAlign: 'center',
    },
    boton: {
        marginTop: 24,
        alignSelf: 'stretch',
    },
});

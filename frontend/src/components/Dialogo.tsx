import { useEffect } from "react";
import { AccessibilityInfo, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { OpcionesDialogo, RespuestaDialogo } from "../context/DialogoContext";
import { COLORS } from "../theme/colors";
import Boton from "./Boton";

interface DialogoProps {
    opciones: OpcionesDialogo | null; // null = cerrado
    onResponder: (respuesta: RespuestaDialogo) => void;
}

// tarjeta de confirmacion/aviso con la paleta de ORNE (F07 M1); se usa a traves de useDialogo()
export default function Dialogo({opciones, onResponder}: DialogoProps) {
    useEffect(() => {
        if (opciones) AccessibilityInfo.announceForAccessibility?.(opciones.titulo); // D5
    }, [opciones]);

    if (!opciones) return null;

    const {titulo, mensaje, tipo = 'confirmacion', textoConfirmar = 'Aceptar', textoCancelar = 'Cancelar', destructiva = false} = opciones;
    // los errores no se cierran tocando fuera, para que no se pasen por alto (D4)
    const cerrarFuera = tipo === 'error' ? undefined : () => onResponder('cerrar');

    return (
        <Modal testID="dialogo-modal" visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => onResponder('cerrar')}>
            <Pressable testID="dialogo-fondo" style={styles.fondo} onPress={cerrarFuera} accessible={false}>
                {/* la tarjeta absorbe el toque para que no llegue al fondo */}
                <View testID="dialogo" style={styles.tarjeta} accessibilityViewIsModal onStartShouldSetResponder={() => true}>
                    <Insignia alerta={tipo === 'error' || destructiva} />
                    <Text style={styles.titulo} accessibilityRole="header">{titulo}</Text>
                    {mensaje ? <Text style={styles.mensaje}>{mensaje}</Text> : null}
                    <View style={styles.botones}>
                        <Boton
                            testID="dialogo-confirmar"
                            titulo={textoConfirmar}
                            onPress={() => onResponder('confirmar')}
                            style={destructiva ? styles.destructiva : undefined}
                        />
                        {textoCancelar ? (
                            <Boton testID="dialogo-cancelar" titulo={textoCancelar} variante="secundario" onPress={() => onResponder('cancelar')} />
                        ) : null}
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}

function Insignia({alerta}: {alerta: boolean}) {
    if (alerta) {
        return (
            <View testID="dialogo-icono-alerta" style={[styles.insignia, styles.insigniaAlerta]}>
                <Text style={styles.exclamacion}>!</Text>
            </View>
        );
    }
    return (
        <View style={styles.insignia}>
            <Image source={require('../../assets/icono_pastel.png')} style={styles.pastel} resizeMode="contain" />
        </View>
    );
}

const styles = StyleSheet.create({
    fondo: {
        flex: 1,
        backgroundColor: 'rgba(26, 26, 26, 0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    tarjeta: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: COLORS.FONDO,
        borderRadius: 20,
        paddingHorizontal: 22,
        paddingTop: 22,
        paddingBottom: 20,
        alignItems: 'center',
    },
    insignia: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.BOTON_SECUNDARIO,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    insigniaAlerta: {
        backgroundColor: COLORS.BOTON_PRINCIPAL,
    },
    exclamacion: {
        color: COLORS.BLANCO,
        fontSize: 30,
        fontWeight: '800',
    },
    pastel: {
        width: 34,
        height: 34,
    },
    titulo: {
        fontSize: 19,
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
    botones: {
        alignSelf: 'stretch',
        gap: 10,
        marginTop: 20,
    },
    // destructiva: vino oscuro de la paleta, distinto del rojo del boton principal
    destructiva: {
        backgroundColor: COLORS.TITULO,
    },
});

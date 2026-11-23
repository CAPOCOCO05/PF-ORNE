import { useEffect } from "react";
import { AccessibilityInfo, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { OpcionesDialogo, RespuestaDialogo } from "../context/DialogoContext";
import { COLORS } from "../theme/colors";
import Boton from "./Boton";
import VistaTeclado from "./VistaTeclado";
import BannerConexion from "./BannerConexion";

interface DialogoProps {
    opciones: OpcionesDialogo | null; // null = cerrado
    onResponder: (respuesta: RespuestaDialogo) => void;
}

// tarjeta de confirmacion/aviso con la paleta de ORNE (F07 M1); se usa a traves de useDialogo()
export default function Dialogo({opciones, onResponder}: DialogoProps) {
    if (!opciones) return null;

    const {titulo, mensaje, tipo = 'confirmacion', textoConfirmar = 'Aceptar', textoCancelar = 'Cancelar', destructiva = false} = opciones;

    return (
        <MarcoDialogo
            titulo={titulo}
            mensaje={mensaje}
            alerta={tipo === 'error' || destructiva}
            // los errores no se cierran tocando fuera, para que no se pasen por alto (D4)
            cerrarAlTocarFuera={tipo !== 'error'}
            onCerrar={() => onResponder('cerrar')}
        >
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
        </MarcoDialogo>
    );
}

interface MarcoDialogoProps {
    titulo: string;
    mensaje?: string;
    alerta?: boolean;               // insignia "!" en lugar del pastel
    cerrarAlTocarFuera?: boolean;
    onCerrar: () => void;           // atras de Android (y tocar fuera, si se permite)
    testID?: string;                // prefijo: <testID>, <testID>-modal, <testID>-fondo
    children: React.ReactNode;      // contenido y botones
}

// modal, fondo, tarjeta, insignia y titulo comunes a todos los dialogos (F07 M1);
// tambien lo usan dialogos con contenido propio, como el motivo de no entrega (M2)
export function MarcoDialogo({titulo, mensaje, alerta = false, cerrarAlTocarFuera = true, onCerrar, testID = 'dialogo', children}: MarcoDialogoProps) {
    useEffect(() => {
        AccessibilityInfo.announceForAccessibility?.(titulo); // D5
    }, [titulo]);

    return (
        <Modal testID={`${testID}-modal`} visible transparent animationType="fade" statusBarTranslucent onRequestClose={onCerrar}>
            {/* F10 A4: el teclado no tapa campos dentro del dialogo (motivo de no entrega) */}
            <VistaTeclado>
            <Pressable testID={`${testID}-fondo`} style={styles.fondo} onPress={cerrarAlTocarFuera ? onCerrar : undefined} accessible={false}>
                {/* la tarjeta absorbe el toque para que no llegue al fondo */}
                <View testID={testID} style={styles.tarjeta} accessibilityViewIsModal onStartShouldSetResponder={() => true}>
                    <Insignia alerta={alerta} />
                    <Text style={styles.titulo} accessibilityRole="header">{titulo}</Text>
                    {mensaje ? <Text style={styles.mensaje}>{mensaje}</Text> : null}
                    {children}
                </View>
            </Pressable>
            </VistaTeclado>
            {/* el Modal abre su propia ventana y tapa el banner de la app: se repite aqui (F10 A8) */}
            <BannerConexion />
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
        color: COLORS.TITULO,
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
    // destructiva: rosa fuerte, distinto del rosa del boton principal; el texto sigue en cafe
    destructiva: {
        backgroundColor: COLORS.BOTON_DESTRUCTIVO,
    },
});

export const estilosDialogo = styles;

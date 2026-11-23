import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import PantallaPaso from "../../../../src/components/pedido/PantallaPaso";
import { usePedido } from "../../../../src/context/PedidoContext";
import { useElegirImagen } from "../../../../src/hooks/useElegirImagen";
import { RUTA_PASO, usePasoPedido } from "../../../../src/hooks/usePasoPedido";
import { urlReferencia } from "../../../../src/services/pedidosService";
import { COLORS } from "../../../../src/theme/colors";
import { ImagenLocal } from "../../../../src/types/pedido.types";
import { MAX_MENSAJE, contarCaracteres, limitarMensaje } from "../../../../src/utils/pedido";

// F01 paso 3: mensaje de decoracion e imagen de referencia, ambos opcionales (D8, D9)
export default function PasoDecoracion() {
    const router = useRouter();
    const {pedido, actualizar} = usePedido();
    const {guardando, siguiente} = usePasoPedido(3);
    const [errorImagen, setErrorImagen] = useState<string | null>(null);
    const vistaPrevia = useVistaPrevia(pedido.imagenLocal, pedido.imagenRuta);
    const elegirDeGaleria = useElegirImagen('Permite el acceso a tus fotos para adjuntar una imagen de referencia.');

    // permiso, formato y tamaño los revisa useElegirImagen (D9); cancelar no cambia nada
    const elegirImagen = async () => {
        const {imagen, error} = await elegirDeGaleria();
        if (!imagen && !error) return;
        setErrorImagen(error);
        if (imagen) actualizar({imagenLocal: imagen});
    };

    const quitarImagen = () => {
        actualizar({imagenLocal: null, imagenRuta: null});
        setErrorImagen(null);
    };


    return (
        <PantallaPaso
            paso={3}
            textoAtras="Atrás"
            onAtras={() => router.back()}
            onSiguiente={() => siguiente(() => router.push(RUTA_PASO[4]))}
            guardando={guardando}
        >
            <Text style={styles.etiqueta}>Descripción de la decoración</Text>
            <TextInput
                value={pedido.mensaje}
                onChangeText={(texto) => actualizar({mensaje: limitarMensaje(texto)})}
                placeholder="Ej. Feliz cumpleaños, Ana. Con flores rosas"
                placeholderTextColor={COLORS.TEXTO_SUAVE}
                multiline
                style={styles.mensaje}
                accessibilityLabel="Descripción de la decoración"
            />
            <Text style={styles.contador}>{contarCaracteres(pedido.mensaje)}/{MAX_MENSAJE}</Text>

            <Text style={styles.etiqueta}>Imagen de referencia para decoración</Text>
            {vistaPrevia ? (
                <View style={styles.vistaPrevia}>
                    <Image source={{uri: vistaPrevia}} style={styles.imagen} resizeMode="cover" accessibilityLabel="Imagen de referencia" />
                    <View style={styles.accionesImagen}>
                        <Pressable onPress={() => { void elegirImagen(); }} accessibilityRole="button">
                            <Text style={styles.enlace}>Cambiar</Text>
                        </Pressable>
                        <Pressable onPress={quitarImagen} accessibilityRole="button">
                            <Text style={styles.enlace}>Quitar</Text>
                        </Pressable>
                    </View>
                </View>
            ) : (
                <Pressable onPress={() => { void elegirImagen(); }} accessibilityRole="button" style={[styles.adjuntar, !!errorImagen && styles.adjuntarConError]}>
                    <Text style={styles.textoAdjuntar}>Adjuntar imagen</Text>
                </Pressable>
            )}
            {errorImagen ? <Text style={styles.error}>{errorImagen}</Text> : null}
        </PantallaPaso>
    );
}

// uri para mostrar: la imagen recien elegida o, si ya estaba guardada, una URL firmada (bucket privado)
function useVistaPrevia(imagenLocal: ImagenLocal | null, imagenRuta: string | null): string | null {
    const [urlFirmada, setUrlFirmada] = useState<string | null>(null);

    useEffect(() => {
        setUrlFirmada(null);
        if (imagenLocal || !imagenRuta) return;
        let cancelado = false;
        urlReferencia(imagenRuta).then(({url}) => {
            if (!cancelado) setUrlFirmada(url);
        });
        return () => { cancelado = true; };
    }, [imagenLocal, imagenRuta]);

    return imagenLocal?.uri ?? urlFirmada;
}

const styles = StyleSheet.create({
    etiqueta: {
        fontSize: 15,
        color: COLORS.TEXTO,
        marginBottom: 8,
    },
    mensaje: {
        minHeight: 96,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        textAlignVertical: 'top',
        color: COLORS.TEXTO,
        backgroundColor: COLORS.FONDO,
    },
    contador: {
        alignSelf: 'flex-end',
        marginTop: 4,
        marginBottom: 20,
        fontSize: 12,
        color: COLORS.TEXTO_SUAVE,
    },
    adjuntar: {
        minHeight: 44,
        borderRadius: 16,
        paddingHorizontal: 16,
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.FONDO,
        backgroundColor: COLORS.FONDO,
    },
    adjuntarConError: {
        borderColor: COLORS.ERROR,
    },
    textoAdjuntar: {
        fontSize: 15,
        color: COLORS.TEXTO_SUAVE,
    },
    vistaPrevia: {
        alignItems: 'center',
    },
    imagen: {
        width: '100%',
        aspectRatio: 4 / 3,
        borderRadius: 16,
        backgroundColor: COLORS.FONDO,
    },
    accionesImagen: {
        flexDirection: 'row',
        gap: 24,
        marginTop: 8,
    },
    enlace: {
        fontSize: 14,
        color: COLORS.TITULO,
        textDecorationLine: 'underline',
    },
    error: {
        marginTop: 6,
        fontSize: 13,
        color: COLORS.ERROR,
    },
});

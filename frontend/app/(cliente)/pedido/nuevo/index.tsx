import { useCallback, useState } from "react";
import { BackHandler, StyleSheet, Text } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import PantallaPaso from "../../../../src/components/pedido/PantallaPaso";
import SelectorOpciones from "../../../../src/components/pedido/SelectorOpciones";
import { usePedido } from "../../../../src/context/PedidoContext";
import { RUTA_PASO, usePasoPedido } from "../../../../src/hooks/usePasoPedido";
import { COLORS } from "../../../../src/theme/colors";
import { Niveles, Tamanio } from "../../../../src/types/pedido.types";
import { NIVELES, TAMANIOS, ajustarNiveles, nivelesPermitidos } from "../../../../src/utils/pedido";

// F01 paso 1: tamaño y niveles
export default function PasoTamanio() {
    const router = useRouter();
    const {pastel, borrador} = useLocalSearchParams<{pastel?: string; borrador?: string}>();
    const {pedido, iniciar, actualizar} = usePedido();
    const {errores, guardando, siguiente, salir} = usePasoPedido(1);
    const [avisoNiveles, setAvisoNiveles] = useState<string | null>(null);

    // al entrar al wizard: precargar el pastel o el borrador; al retomar, abrir el paso donde se quedo
    useFocusEffect(useCallback(() => {
        iniciar({pastelId: pastel, borradorId: borrador}).then((inicial) => {
            if (!inicial || !borrador) return;
            if (inicial.pasoActual >= 2) router.push(RUTA_PASO[2]);
            if (inicial.pasoActual >= 3) router.push(RUTA_PASO[3]);
        });
    }, [iniciar, pastel, borrador, router]));

    // atras de Android en el primer paso = salir del pedido (D3)
    useFocusEffect(useCallback(() => {
        const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
            salir();
            return true;
        });
        return () => suscripcion.remove();
    }, [salir]));

    const elegirTamanio = (tamanio: Tamanio) => {
        const {niveles, ajustado} = ajustarNiveles(tamanio, pedido.niveles);
        actualizar({tamanio, niveles});
        setAvisoNiveles(ajustado ? `Ajustamos los niveles a ${niveles}: es el máximo para ${tamanio} personas.` : null);
    };

    const elegirNiveles = (niveles: Niveles) => {
        actualizar({niveles});
        setAvisoNiveles(null);
    };

    const permitidos = nivelesPermitidos(pedido.tamanio);

    return (
        <PantallaPaso
            paso={1}
            textoAtras="Salir"
            onAtras={salir}
            onSiguiente={() => siguiente(() => router.push(RUTA_PASO[2]))}
            guardando={guardando}
        >
            <SelectorOpciones
                etiqueta="Tamaño (personas)"
                opciones={TAMANIOS.map((t) => ({valor: t, texto: t}))}
                seleccionada={pedido.tamanio}
                onSeleccionar={elegirTamanio}
                error={errores.tamanio}
            />
            <SelectorOpciones
                etiqueta="Número de niveles"
                opciones={NIVELES.map((n) => ({valor: n, texto: String(n), deshabilitada: !permitidos.includes(n)}))}
                seleccionada={pedido.niveles}
                onSeleccionar={elegirNiveles}
                error={errores.niveles}
            />
            {avisoNiveles ? <Text style={styles.aviso}>{avisoNiveles}</Text> : null}
        </PantallaPaso>
    );
}

const styles = StyleSheet.create({
    aviso: {
        marginTop: -8,
        marginBottom: 16,
        fontSize: 13,
        color: COLORS.TITULO,
    },
});

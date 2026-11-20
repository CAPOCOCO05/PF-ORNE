import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { usePedido } from "../../context/PedidoContext";
import { COLORS } from "../../theme/colors";
import { PasoPedido } from "../../types/pedido.types";
import Boton from "../Boton";
import VistaTeclado from "../VistaTeclado";
import IndicadorPasos from "./IndicadorPasos";
import PrecioPedido from "./PrecioPedido";

interface PantallaPasoProps {
    paso: PasoPedido;
    children: React.ReactNode;
    textoAtras: string;
    onAtras: () => void;
    textoSiguiente?: string;
    onSiguiente: () => void;
    guardando: boolean;
}

// estructura comun de los pasos (design/pantalla_registro_pedido.png): titulo, pasos,
// campos del paso, precio en tiempo real y botones Atrás / Siguiente
export default function PantallaPaso({paso, children, textoAtras, onAtras, textoSiguiente = 'Siguiente', onSiguiente, guardando}: PantallaPasoProps) {
    const router = useRouter();
    const {pedido, cargando, errorCarga, reintentarCarga} = usePedido();

    let contenido: React.ReactNode;
    if (cargando) {
        contenido = <ActivityIndicator testID="pedido-cargando" color={COLORS.BOTON_PRINCIPAL} style={styles.estado} />;
    } else if (errorCarga) {
        contenido = (
            <View style={styles.estado}>
                <Text style={styles.error}>{errorCarga}</Text>
                <Boton titulo="Reintentar" onPress={reintentarCarga} style={styles.botonEstado} />
                <Boton titulo="Volver al catálogo" variante="secundario" onPress={() => router.navigate('/home')} style={styles.botonEstado} />
            </View>
        );
    } else {
        contenido = (
            <>
                {children}
                <PrecioPedido pedido={pedido} />
                <View style={styles.botones}>
                    <Boton titulo={textoAtras} variante="secundario" onPress={onAtras} deshabilitado={guardando} style={styles.boton} />
                    <Boton titulo={textoSiguiente} onPress={onSiguiente} cargando={guardando} style={styles.boton} />
                </View>
            </>
        );
    }

    return (
        <VistaTeclado>
            <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
                <Text style={styles.titulo}>Registrar pedido</Text>
                <IndicadorPasos actual={paso} />
                {contenido}
            </ScrollView>
        </VistaTeclado>
    );
}

const styles = StyleSheet.create({
    fondo: {
        backgroundColor: COLORS.BLANCO,
    },
    contenido: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 32,
    },
    titulo: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        textAlign: 'center',
        color: COLORS.TITULO,
        marginBottom: 20,
    },
    botones: {
        flexDirection: 'row',
        gap: 12,
    },
    boton: {
        flex: 1,
    },
    estado: {
        marginTop: 32,
        alignItems: 'stretch',
    },
    error: {
        fontSize: 15,
        color: COLORS.ERROR,
        textAlign: 'center',
    },
    botonEstado: {
        marginTop: 12,
    },
});

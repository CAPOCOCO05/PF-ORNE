import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Boton from "../../src/components/Boton";
import TarjetaEntrega from "../../src/components/repartidor/TarjetaEntrega";
import { useEntregas } from "../../src/hooks/useEntregas";
import { COLORS } from "../../src/theme/colors";
import { EntregaResumen } from "../../src/types/pedido.types";

const MENSAJE_SIN_ENTREGAS = 'No tienes entregas asignadas';

// F06: pedidos en camino asignados al repartidor
export default function RepartidorEntregas() {
    const router = useRouter();
    const {entregas, cargando, error, recargar} = useEntregas();

    const ver = (entrega: EntregaResumen) => router.push(`/repartidor/entrega/${entrega.id}`);

    // lista vacia: cargando, error o sin entregas
    const vacio = cargando ? (
        <ActivityIndicator testID="entregas-cargando" color={COLORS.ACENTO} style={styles.estado} />
    ) : error ? (
        <View style={styles.estado}>
            <Text style={[styles.textoEstado, styles.textoError]}>{error}</Text>
            <Boton titulo="Reintentar" variante="secundario" onPress={recargar} style={styles.botonReintentar} />
        </View>
    ) : (
        <Text style={[styles.estado, styles.textoEstado]}>{MENSAJE_SIN_ENTREGAS}</Text>
    );

    return (
        <FlatList
            data={error ? [] : entregas}
            keyExtractor={(entrega) => entrega.id}
            renderItem={({item}) => <TarjetaEntrega entrega={item} onVer={ver} />}
            ListHeaderComponent={<Text style={styles.titulo}>Mis entregas</Text>}
            ListEmptyComponent={vacio}
            refreshControl={<RefreshControl refreshing={false} onRefresh={recargar} colors={[COLORS.ACENTO]} />}
            contentContainerStyle={styles.lista}
            style={styles.fondo}
        />
    );
}

const styles = StyleSheet.create({
    fondo: {
        backgroundColor: COLORS.BLANCO,
    },
    lista: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    titulo: {
        paddingTop: 24,
        paddingBottom: 16,
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        textAlign: 'center',
        color: COLORS.TITULO,
    },
    estado: {
        marginTop: 32,
        alignItems: 'stretch',
        paddingHorizontal: 16,
    },
    textoEstado: {
        fontSize: 15,
        color: COLORS.TEXTO_SUAVE,
        textAlign: 'center',
    },
    textoError: {
        color: COLORS.ERROR,
    },
    botonReintentar: {
        marginTop: 12,
    },
});

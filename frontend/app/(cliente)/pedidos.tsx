import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Boton from "../../src/components/Boton";
import TarjetaPedido from "../../src/components/TarjetaPedido";
import { useMisPedidos } from "../../src/hooks/useMisPedidos";
import { COLORS } from "../../src/theme/colors";
import { ResumenPedido } from "../../src/types/pedido.types";

// Mis pedidos: todos los pedidos del cliente, incluidos los borradores para retomarlos (F01, D2)
export default function Pedidos() {
    const router = useRouter();
    const {pedidos, cargando, error, eliminando, recargar, eliminar} = useMisPedidos();

    const continuar = (pedido: ResumenPedido) => router.push({pathname: '/pedido/nuevo', params: {borrador: pedido.id}});

    const confirmarEliminar = (pedido: ResumenPedido) => {
        Alert.alert('¿Eliminar borrador?', 'Se borrará el pedido y su imagen de referencia. No se puede deshacer.', [
            {text: 'Cancelar', style: 'cancel'},
            {text: 'Eliminar', style: 'destructive', onPress: async () => {
                const errorEliminar = await eliminar(pedido.id);
                if (errorEliminar) Alert.alert('No se pudo eliminar', errorEliminar);
            }},
        ]);
    };

    // la lista vacia muestra la carga, el error o la invitacion a pedir
    const vacio = cargando ? (
        <ActivityIndicator testID="pedidos-cargando" color={COLORS.BOTON_PRINCIPAL} style={styles.estado} />
    ) : error ? (
        <View style={styles.estado}>
            <Text style={[styles.textoEstado, styles.textoError]}>{error}</Text>
            <Boton titulo="Reintentar" variante="secundario" onPress={recargar} style={styles.botonEstado} />
        </View>
    ) : (
        <View style={styles.estado}>
            <Text style={styles.textoEstado}>Aún no tienes pedidos</Text>
            <Boton titulo="Ver catálogo" onPress={() => router.navigate('/home')} style={styles.botonEstado} />
        </View>
    );

    return (
        <FlatList
            data={pedidos}
            keyExtractor={(pedido) => pedido.id}
            renderItem={({item}) => (
                <TarjetaPedido
                    pedido={item}
                    eliminando={eliminando === item.id}
                    onContinuar={continuar}
                    onEliminar={confirmarEliminar}
                />
            )}
            ListHeaderComponent={<Text style={styles.titulo}>Mis pedidos</Text>}
            ListEmptyComponent={vacio}
            // con pedidos ya cargados, un error al recargar se avisa al final de la lista
            ListFooterComponent={pedidos.length > 0 && error ? <Text style={[styles.textoEstado, styles.textoError]}>{error}</Text> : null}
            refreshControl={<RefreshControl refreshing={cargando && pedidos.length > 0} onRefresh={recargar} colors={[COLORS.BOTON_PRINCIPAL]} />}
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
        paddingBottom: 20,
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
    botonEstado: {
        marginTop: 12,
    },
});

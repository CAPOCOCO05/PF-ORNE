import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Boton from "../../src/components/Boton";
import FiltrosEstado from "../../src/components/admin/FiltrosEstado";
import TarjetaPedidoAdmin from "../../src/components/admin/TarjetaPedidoAdmin";
import { usePedidosAdmin } from "../../src/hooks/usePedidosAdmin";
import { COLORS } from "../../src/theme/colors";
import { PedidoAdminResumen } from "../../src/types/pedido.types";

const MENSAJE_SIN_PEDIDOS = 'No hay pedidos en este estado';

// F04: lista de los pedidos de todos los clientes (sin borradores), filtrada por estado
export default function AdminPedidos() {
    const router = useRouter();
    const {
        filtro, cambiarPestania, marcarEstado, limpiarEstados, conteos,
        pedidos, cargando, error, cargarMas, reintentar, recargar,
    } = usePedidosAdmin();
    const primeraCarga = pedidos.length === 0;

    const ver = (pedido: PedidoAdminResumen) => router.push(`/admin/pedido/${pedido.id}`);

    const encabezado = (
        <View>
            <Text style={styles.titulo}>Pedidos</Text>
            <FiltrosEstado
                filtro={filtro}
                conteos={conteos}
                onPestania={cambiarPestania}
                onMarcarEstado={marcarEstado}
                onLimpiar={limpiarEstados}
            />
        </View>
    );

    // lista vacia: cargando la primera pagina, error o sin pedidos en el filtro
    const vacio = cargando ? (
        <ActivityIndicator testID="admin-cargando" color={COLORS.BOTON_PRINCIPAL} style={styles.estado} />
    ) : error ? (
        <AvisoError mensaje={error} onReintentar={reintentar} />
    ) : (
        <Text style={[styles.estado, styles.textoEstado]}>{MENSAJE_SIN_PEDIDOS}</Text>
    );

    // pie: cargando la siguiente pagina o error al pedirla
    const pie = primeraCarga ? undefined : cargando ? (
        <ActivityIndicator testID="admin-cargando-mas" color={COLORS.BOTON_PRINCIPAL} style={styles.pie} />
    ) : error ? (
        <AvisoError mensaje={error} onReintentar={reintentar} />
    ) : undefined;

    return (
        <FlatList
            data={pedidos}
            keyExtractor={(pedido) => pedido.id}
            renderItem={({item}) => <TarjetaPedidoAdmin pedido={item} onVer={ver} />}
            ListHeaderComponent={encabezado}
            ListEmptyComponent={vacio}
            ListFooterComponent={pie}
            onEndReached={cargarMas}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl refreshing={false} onRefresh={recargar} colors={[COLORS.BOTON_PRINCIPAL]} />}
            contentContainerStyle={styles.lista}
            style={styles.fondo}
        />
    );
}

function AvisoError({mensaje, onReintentar}: {mensaje: string; onReintentar: () => void}) {
    return (
        <View style={styles.estado}>
            <Text style={[styles.textoEstado, styles.textoError]}>{mensaje}</Text>
            <Boton titulo="Reintentar" variante="secundario" onPress={onReintentar} style={styles.botonReintentar} />
        </View>
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
    pie: {
        marginVertical: 16,
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

import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Boton from "../../src/components/Boton";
import TarjetaPastel from "../../src/components/TarjetaPastel";
import { useCatalogo } from "../../src/hooks/useCatalogo";
import { COLORS } from "../../src/theme/colors";
import { PastelCatalogo } from "../../src/types/pedido.types";

const MENSAJE_CATALOGO_VACIO = 'Aún no hay pasteles en el catálogo';

// F01: catalogo base paginado — pantalla de inicio del cliente (design/pantalla_principal_catalogo.png)
export default function Home() {
    const router = useRouter();
    const {pasteles, hayMas, cargando, error, cargarMas, reintentar, recargar} = useCatalogo();
    const primeraCarga = pasteles.length === 0;

    // "Pedir" precarga el wizard con la configuracion del pastel; "Crear pedido" lo abre vacio (D6)
    const pedir = (pastel: PastelCatalogo) => router.push({pathname: '/pedido/nuevo', params: {pastel: pastel.id}});
    const crearPedido = () => router.push('/pedido/nuevo');

    const encabezado = (
        <View style={styles.encabezado}>
            <Text style={styles.titulo}>Catálogo</Text>
            <Boton titulo="Crear pedido" onPress={crearPedido} style={styles.botonCrear} />
        </View>
    );

    // lista vacia: cargando la primera pagina, error o catalogo sin pasteles
    const vacio = cargando ? (
        <ActivityIndicator testID="catalogo-cargando" color={COLORS.BOTON_PRINCIPAL} style={styles.estado} />
    ) : error ? (
        <AvisoError mensaje={error} onReintentar={reintentar} />
    ) : (
        <Text style={[styles.estado, styles.textoEstado]}>{MENSAJE_CATALOGO_VACIO}</Text>
    );

    // pie: cargando la siguiente pagina o error al pedirla; al final de la lista no se pide nada mas
    const pie = primeraCarga ? null : cargando ? (
        <ActivityIndicator testID="catalogo-cargando-mas" color={COLORS.BOTON_PRINCIPAL} style={styles.pie} />
    ) : error ? (
        <AvisoError mensaje={error} onReintentar={reintentar} />
    ) : !hayMas ? (
        <Text style={[styles.pie, styles.textoEstado]}>No hay más pasteles</Text>
    ) : null;

    return (
        <FlatList
            data={pasteles}
            keyExtractor={(pastel) => pastel.id}
            renderItem={({item}) => <TarjetaPastel pastel={item} onPedir={pedir} />}
            numColumns={2}
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
    encabezado: {
        alignItems: 'center',
        paddingTop: 24,
        paddingBottom: 24,
    },
    titulo: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: COLORS.TITULO,
    },
    botonCrear: {
        marginTop: 16,
        alignSelf: 'stretch',
        marginHorizontal: 8,
    },
    estado: {
        marginTop: 32,
        alignItems: 'center',
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

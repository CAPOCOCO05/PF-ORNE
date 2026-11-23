import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import Boton from "../../src/components/Boton";
import TarjetaPastel from "../../src/components/TarjetaPastel";
import BarraFiltros from "../../src/components/catalogo/BarraFiltros";
import { FILTROS_VACIOS } from "../../src/constants/filtrosCatalogo";
import { useAuth } from "../../src/context/AuthContext";
import { useCatalogo } from "../../src/hooks/useCatalogo";
import { COLORS } from "../../src/theme/colors";
import { FiltrosCatalogo, PastelCatalogo } from "../../src/types/pedido.types";
import { hayFiltros, limpiarFiltros } from "../../src/utils/filtrosCatalogo";
import { PEDIDO_NUEVO } from "../../src/utils/rutas";

const MENSAJE_CATALOGO_VACIO = 'Aún no hay pasteles en el catálogo';
const MENSAJE_SIN_RESULTADOS = 'No hay pasteles con esos filtros';

// cuadricula de 2 columnas (design_2/12.png)
const MARGEN_LISTA = 20;
const ESPACIO_TARJETAS = 14;

// F01: catalogo base paginado — pantalla de inicio del cliente (design_2/12.png)
export default function Home() {
    const router = useRouter();
    // ancho fijo por columna: si el ultimo renglon tiene un solo pastel no se estira a todo el ancho
    const {width} = useWindowDimensions();
    const anchoTarjeta = (width - MARGEN_LISTA * 2 - ESPACIO_TARJETAS) / 2;
    const {session} = useAuth();
    // F07 M5 D4: la pantalla sigue montada al ir al wizard (Drawer), asi los filtros se
    // conservan; al cerrar sesion se desmonta la seccion y se reinician
    const [filtros, setFiltros] = useState<FiltrosCatalogo>(FILTROS_VACIOS);
    const {pasteles, hayMas, cargando, error, cargarMas, reintentar, recargar} = useCatalogo(filtros);
    const primeraCarga = pasteles.length === 0;

    // "Pedir" precarga el wizard con la configuracion del pastel; "Crear pedido" lo abre vacio (D6).
    // F09: sin sesion se va primero al registro, que al terminar abre el wizard con ese pedido
    const pedir = (pastel: PastelCatalogo) => session
        ? router.push({pathname: '/pedido/nuevo', params: {pastel: pastel.id}})
        : router.push({pathname: '/register', params: {pedir: pastel.id}});
    const crearPedido = () => session
        ? router.push('/pedido/nuevo')
        : router.push({pathname: '/register', params: {pedir: PEDIDO_NUEVO}});

    const encabezado = (
        <View style={styles.encabezado}>
            <Text style={styles.titulo}>Catálogo</Text>
            <Boton titulo="Crear pedido" onPress={crearPedido} style={styles.botonCrear} />
            <BarraFiltros filtros={filtros} onCambiar={setFiltros} />
        </View>
    );

    // lista vacia: cargando la primera pagina, error, sin resultados con filtros o catalogo sin pasteles
    const vacio = cargando ? (
        <ActivityIndicator testID="catalogo-cargando" color={COLORS.ACENTO} style={styles.estado} />
    ) : error ? (
        <AvisoError mensaje={error} onReintentar={reintentar} />
    ) : hayFiltros(filtros) ? (
        <View style={styles.estado}>
            <Text style={styles.textoEstado}>{MENSAJE_SIN_RESULTADOS}</Text>
            <Boton
                titulo="Limpiar filtros"
                variante="secundario"
                onPress={() => setFiltros(limpiarFiltros(filtros))}
                style={styles.botonReintentar}
            />
        </View>
    ) : (
        <Text style={[styles.estado, styles.textoEstado]}>{MENSAJE_CATALOGO_VACIO}</Text>
    );

    // pie: cargando la siguiente pagina o error al pedirla; al final de la lista no se pide nada mas
    const pie = primeraCarga ? undefined : cargando ? (
        <ActivityIndicator testID="catalogo-cargando-mas" color={COLORS.ACENTO} style={styles.pie} />
    ) : error ? (
        <AvisoError mensaje={error} onReintentar={reintentar} />
    ) : !hayMas ? (
        <Text style={[styles.pie, styles.textoEstado]}>No hay más pasteles</Text>
    ) : undefined;

    return (
        <FlatList
            data={pasteles}
            keyExtractor={(pastel) => pastel.id}
            renderItem={({item}) => <TarjetaPastel pastel={item} onPedir={pedir} style={{flex: 0, width: anchoTarjeta}} />}
            numColumns={2}
            columnWrapperStyle={styles.fila}
            ListHeaderComponent={encabezado}
            ListEmptyComponent={vacio}
            ListFooterComponent={pie}
            onEndReached={cargarMas}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl refreshing={false} onRefresh={recargar} colors={[COLORS.ACENTO]} />}
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
        paddingHorizontal: MARGEN_LISTA,
        paddingBottom: 24,
    },
    fila: {
        gap: ESPACIO_TARJETAS,
        marginBottom: ESPACIO_TARJETAS,
    },
    encabezado: {
        alignItems: 'center',
        paddingTop: 24,
        paddingBottom: 20,
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

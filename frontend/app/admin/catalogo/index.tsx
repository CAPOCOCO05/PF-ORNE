import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Boton from "../../../src/components/Boton";
import { formatearPrecio } from "../../../src/constants/precios";
import { useCatalogoAdmin } from "../../../src/hooks/useCatalogoAdmin";
import { ID_PASTEL_NUEVO } from "../../../src/hooks/usePastelAdmin";
import { COLORS } from "../../../src/theme/colors";
import { PastelAdmin } from "../../../src/types/pedido.types";

const MENSAJE_SIN_PASTELES = 'Aún no hay pasteles en el catálogo';

// F07 M4: todos los pasteles del catalogo (publicados y ocultos) para darlos de alta o editarlos
export default function AdminCatalogo() {
    const router = useRouter();
    const {pasteles, cargando, error, cargarMas, reintentar, recargar} = useCatalogoAdmin();
    const primeraCarga = pasteles.length === 0;

    const abrir = (id: string) => router.push(`/admin/catalogo/${id}`);

    const encabezado = (
        <View>
            <Text style={styles.titulo}>Catálogo</Text>
            <Boton titulo="Nuevo pastel" onPress={() => abrir(ID_PASTEL_NUEVO)} style={styles.nuevo} />
        </View>
    );

    const vacio = cargando ? (
        <ActivityIndicator testID="catalogo-admin-cargando" color={COLORS.ACENTO} style={styles.estado} />
    ) : error ? (
        <AvisoError mensaje={error} onReintentar={reintentar} />
    ) : (
        <Text style={[styles.estado, styles.textoEstado]}>{MENSAJE_SIN_PASTELES}</Text>
    );

    const pie = primeraCarga ? undefined : cargando ? (
        <ActivityIndicator testID="catalogo-admin-cargando-mas" color={COLORS.ACENTO} style={styles.pie} />
    ) : error ? (
        <AvisoError mensaje={error} onReintentar={reintentar} />
    ) : undefined;

    return (
        <FlatList
            data={pasteles}
            keyExtractor={(pastel) => pastel.id}
            renderItem={({item}) => <FilaPastel pastel={item} onAbrir={abrir} />}
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

function FilaPastel({pastel, onAbrir}: {pastel: PastelAdmin; onAbrir: (id: string) => void}) {
    return (
        <Pressable
            onPress={() => onAbrir(pastel.id)}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${pastel.nombre}`}
            style={({pressed}) => [styles.fila, pressed && styles.presionada]}
        >
            <View style={styles.miniatura}>
                {pastel.imagen_url ? (
                    <Image source={{uri: pastel.imagen_url}} style={styles.imagen} resizeMode="cover" />
                ) : (
                    <Image source={require('../../../assets/icono_pastel.png')} style={styles.placeholder} resizeMode="contain" />
                )}
            </View>
            <View style={styles.datos}>
                <Text style={styles.nombre} numberOfLines={2}>{pastel.nombre}</Text>
                <Text style={styles.precio}>{formatearPrecio(pastel.precio_base)}</Text>
            </View>
            <View style={[styles.etiqueta, pastel.activo ? styles.publicado : styles.oculto]}>
                <Text style={[styles.textoEtiqueta, pastel.activo ? styles.textoPublicado : styles.textoOculto]}>
                    {pastel.activo ? 'Publicado' : 'Oculto'}
                </Text>
            </View>
        </Pressable>
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
    nuevo: {
        marginBottom: 16,
    },
    fila: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        marginBottom: 10,
        borderRadius: 16,
        backgroundColor: COLORS.FONDO,
    },
    presionada: {
        opacity: 0.7,
    },
    miniatura: {
        width: 64,
        height: 64,
        borderRadius: 12,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.BLANCO,
    },
    imagen: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        width: '55%',
        height: '55%',
        opacity: 0.5,
    },
    datos: {
        flex: 1,
    },
    nombre: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.TITULO,
    },
    precio: {
        marginTop: 2,
        fontSize: 13,
        color: COLORS.TEXTO,
    },
    etiqueta: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    publicado: {
        backgroundColor: '#e0f2dc',
    },
    oculto: {
        backgroundColor: '#ebebeb',
    },
    textoEtiqueta: {
        fontSize: 12,
        fontWeight: '600',
    },
    textoPublicado: {
        color: '#2e6b2a',
    },
    textoOculto: {
        color: '#5f5f5f',
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

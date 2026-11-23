import { Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { formatearPrecio } from "../constants/precios";
import { COLORS } from "../theme/colors";
import { PastelCatalogo } from "../types/pedido.types";

// lo que muestra la tarjeta; la vista previa del admin (F07 M4) no tiene un pastel completo
type DatosTarjeta = Pick<PastelCatalogo, 'nombre' | 'descripcion' | 'imagen_url' | 'precio_base'>;

interface TarjetaPastelProps<P extends DatosTarjeta> {
    pastel: P;
    onPedir?: (pastel: P) => void;  // sin onPedir no se muestra el boton (vista previa)
    style?: StyleProp<ViewStyle>;   // p. ej. el ancho de la columna en el catalogo
}

// tarjeta del catalogo: card gris claro con la imagen en un cuadro blanco, precio, detalles
// y "Pedir" (design_2/12.png, "Pantalla principal: catálogo")
export default function TarjetaPastel<P extends DatosTarjeta>({pastel, onPedir, style}: TarjetaPastelProps<P>) {
    return (
        <View style={[styles.tarjeta, style]}>
            <View style={styles.marcoImagen}>
                {pastel.imagen_url ? (
                    <Image source={{uri: pastel.imagen_url}} style={styles.imagen} resizeMode="cover" accessibilityLabel={pastel.nombre} />
                ) : (
                    // sin imagen en el catalogo: se muestra el icono de pastel
                    <Image source={require('../../assets/icono_pastel.png')} style={styles.placeholder} resizeMode="contain" />
                )}
            </View>
            <Text style={styles.precio}>{formatearPrecio(pastel.precio_base)}</Text>
            <Text style={styles.nombre} numberOfLines={2}>{pastel.nombre}</Text>
            {pastel.descripcion ? (
                <Text style={styles.descripcion} numberOfLines={2}>{pastel.descripcion}</Text>
            ) : null}
            {/* empuja "Pedir" al pie: las tarjetas de una fila miden lo mismo */}
            <View style={styles.espacio} />
            {onPedir ? <Pressable
                onPress={() => onPedir(pastel)}
                accessibilityRole="button"
                accessibilityLabel={`Pedir ${pastel.nombre}`}
                hitSlop={8}
                style={({pressed}) => [styles.botonPedir, pressed && styles.presionado]}
            >
                <Text style={styles.textoPedir}>Pedir</Text>
            </Pressable> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    tarjeta: {
        flex: 1,
        alignItems: 'center',
        padding: 10,
        borderRadius: 16,
        backgroundColor: COLORS.FONDO,
    },
    marcoImagen: {
        width: '100%',
        aspectRatio: 1.15,
        borderRadius: 4,
        backgroundColor: COLORS.BLANCO,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    imagen: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        width: '45%',
        height: '45%',
        opacity: 0.5,
    },
    precio: {
        marginTop: 10,
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.TEXTO,
    },
    nombre: {
        marginTop: 2,
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.TITULO,
        textAlign: 'center',
    },
    descripcion: {
        marginTop: 2,
        fontSize: 12,
        color: COLORS.TEXTO,
        textAlign: 'center',
    },
    espacio: {
        flexGrow: 1,
        minHeight: 8,
    },
    // pastilla pequeña al pie de la tarjeta
    botonPedir: {
        width: '55%',
        minHeight: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.BOTON_SECUNDARIO,
    },
    presionado: {
        opacity: 0.7,
    },
    textoPedir: {
        fontSize: 12,
        color: COLORS.TITULO,
    },
});

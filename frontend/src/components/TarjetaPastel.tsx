import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { formatearPrecio } from "../constants/precios";
import { COLORS } from "../theme/colors";
import { PastelCatalogo } from "../types/pedido.types";

interface TarjetaPastelProps {
    pastel: PastelCatalogo;
    onPedir: (pastel: PastelCatalogo) => void;
}

// tarjeta del catalogo: imagen, precio, detalles y "Pedir" (design/pantalla_principal_catalogo.png)
export default function TarjetaPastel({pastel, onPedir}: TarjetaPastelProps) {
    return (
        <View style={styles.tarjeta}>
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
            <Pressable
                onPress={() => onPedir(pastel)}
                accessibilityRole="button"
                accessibilityLabel={`Pedir ${pastel.nombre}`}
                style={({pressed}) => [styles.botonPedir, pressed && styles.presionado]}
            >
                <Text style={styles.textoPedir}>Pedir</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    tarjeta: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 8,
        marginBottom: 24,
    },
    marcoImagen: {
        width: '100%',
        aspectRatio: 1.15,
        backgroundColor: COLORS.FONDO,
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
        marginTop: 8,
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
    botonPedir: {
        marginTop: 6,
        minWidth: 72,
        minHeight: 28,
        paddingHorizontal: 16,
        borderRadius: 10,
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

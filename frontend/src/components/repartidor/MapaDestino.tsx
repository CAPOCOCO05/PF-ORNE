import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { COLORS } from "../../theme/colors";
import { Coordenadas } from "../../types/pedido.types";

const ZOOM = {latitudeDelta: 0.01, longitudeDelta: 0.01};

// mapa de solo lectura con el pin de la entrega (F06)
export default function MapaDestino({ubicacion}: {ubicacion: Coordenadas}) {
    const coordenada = {latitude: ubicacion.latitud, longitude: ubicacion.longitud};
    return (
        <View style={styles.contenedor}>
            <MapView style={styles.mapa} initialRegion={{...coordenada, ...ZOOM}} testID="mapa-destino">
                <Marker coordinate={coordenada} pinColor={COLORS.BOTON_PRINCIPAL} />
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: {
        height: 240,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: COLORS.FONDO,
        marginBottom: 12,
    },
    mapa: {
        flex: 1,
    },
});

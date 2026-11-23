import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Circle, LatLng, MapPressEvent, Marker, MarkerDragStartEndEvent } from "react-native-maps";
import { RADIO_ENTREGA_KM, SUCURSAL } from "../../constants/sucursal";
import { COLORS } from "../../theme/colors";
import { Coordenadas } from "../../types/pedido.types";

interface MapaEntregaProps {
    centro: Coordenadas;              // a donde se mueve la camara (ubicacion inicial o busqueda)
    ubicacion: Coordenadas | null;    // pin fijado por el usuario
    onFijar: (ubicacion: Coordenadas) => void;
}

const ZOOM = {latitudeDelta: 0.02, longitudeDelta: 0.02};

const aLatLng = ({latitud, longitud}: Coordenadas): LatLng => ({latitude: latitud, longitude: longitud});
const aCoordenadas = ({latitude, longitude}: LatLng): Coordenadas => ({latitud: latitude, longitud: longitude});

// mapa del paso de entrega (F02 D5): el pin se fija tocando el mapa o arrastrandolo.
// El circulo muestra la zona de entrega gratis alrededor de la sucursal
export default function MapaEntrega({centro, ubicacion, onFijar}: MapaEntregaProps) {
    const mapa = useRef<MapView>(null);

    useEffect(() => {
        mapa.current?.animateToRegion({...aLatLng(centro), ...ZOOM}, 400);
    }, [centro]);

    return (
        <View style={styles.contenedor}>
            <MapView
                ref={mapa}
                style={styles.mapa}
                initialRegion={{...aLatLng(ubicacion ?? centro), ...ZOOM}}
                onPress={(e: MapPressEvent) => onFijar(aCoordenadas(e.nativeEvent.coordinate))}
                testID="mapa-entrega"
            >
                <Circle
                    center={aLatLng(SUCURSAL.coordenadas)}
                    radius={RADIO_ENTREGA_KM * 1000}
                    strokeColor={COLORS.ACENTO}
                    fillColor="rgba(247, 175, 191, 0.18)"
                />
                {ubicacion ? (
                    <Marker
                        coordinate={aLatLng(ubicacion)}
                        draggable
                        onDragEnd={(e: MarkerDragStartEndEvent) => onFijar(aCoordenadas(e.nativeEvent.coordinate))}
                        pinColor={COLORS.ACENTO}
                    />
                ) : null}
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
    },
    mapa: {
        flex: 1,
    },
});

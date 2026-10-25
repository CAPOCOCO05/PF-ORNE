import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SUCURSAL } from "../../constants/sucursal";
import { buscarDireccion, direccionDesdeCoordenadas, DireccionGeocodificada, ubicacionInicial } from "../../services/ubicacionService";
import { COLORS } from "../../theme/colors";
import { Coordenadas, DatosEntrega } from "../../types/pedido.types";
import { CampoEntrega, dentroDeZona, MAX_CAMPO_DIRECCION, MAX_REFERENCIA, MENSAJES_ENTREGA } from "../../utils/entrega";
import Boton from "../Boton";
import Input from "../Input";
import MapaEntrega from "./MapaEntrega";

const MAX_NUMERO = 20; // igual que el check de numero_exterior / numero_interior (migracion 008)

interface FormularioDomicilioProps {
    entrega: DatosEntrega;
    errores: Partial<Record<CampoEntrega, string>>;
    onCambiar: (cambios: Partial<DatosEntrega>) => void;
}

// solo se autocompletan los campos que el geocodificador si trajo
function camposConValor(direccion: DireccionGeocodificada): Partial<DireccionGeocodificada> {
    return Object.fromEntries(Object.entries(direccion).filter(([, valor]) => valor.trim() !== ''));
}

// entrega a domicilio (F02 flujo 2-3): mapa con pin, busqueda por texto y campos de direccion
export default function FormularioDomicilio({entrega, errores, onCambiar}: FormularioDomicilioProps) {
    const [centro, setCentro] = useState<Coordenadas>(entrega.ubicacion ?? SUCURSAL.coordenadas);
    const [busqueda, setBusqueda] = useState('');
    const [buscando, setBuscando] = useState(false);
    const [aviso, setAviso] = useState<string | null>(null);
    const ultimoPin = useRef(0); // descarta direcciones de un pin que ya se movio

    const fijar = async (ubicacion: Coordenadas) => {
        const miPin = ++ultimoPin.current;
        onCambiar({ubicacion});
        setAviso(dentroDeZona(ubicacion) ? null : MENSAJES_ENTREGA.FUERA_DE_ZONA);
        const {direccion, error} = await direccionDesdeCoordenadas(ubicacion);
        if (miPin !== ultimoPin.current) return;
        if (direccion) onCambiar(camposConValor(direccion));
        else if (error && dentroDeZona(ubicacion)) setAviso(error);
    };

    // region inicial: el usuario si da permiso (y ahi se pone el pin); si no, la sucursal (D5)
    useEffect(() => {
        if (entrega.ubicacion) return;
        let cancelado = false;
        ubicacionInicial().then(({coordenadas, esDelUsuario}) => {
            if (cancelado) return;
            setCentro(coordenadas);
            if (esDelUsuario) fijar(coordenadas);
        });
        return () => { cancelado = true; };
        // solo al montar: si despues cambia la ubicacion es porque el usuario fijo el pin
    }, []);

    const buscar = async () => {
        setBuscando(true);
        const {ubicacion, error} = await buscarDireccion(busqueda);
        setBuscando(false);
        if (!ubicacion) {
            setAviso(error);
            return;
        }
        setCentro(ubicacion);
        await fijar(ubicacion);
    };

    const errorMapa = errores.ubicacion ?? null;

    return (
        <View>
            <View style={styles.busqueda}>
                <View style={styles.flex}>
                    <Input etiqueta="Buscar dirección" value={busqueda} onChangeText={setBusqueda}
                        placeholder="Ej. Av. Reforma 100" returnKeyType="search" onSubmitEditing={buscar} />
                </View>
                <Boton titulo="Buscar" variante="secundario" onPress={buscar} cargando={buscando} style={styles.botonBuscar} />
            </View>

            <Text style={styles.ayuda}>Toca el mapa o arrastra el pin para fijar tu ubicación.</Text>
            <MapaEntrega centro={centro} ubicacion={entrega.ubicacion} onFijar={fijar} />
            {errorMapa ? <Text style={styles.error}>{errorMapa}</Text> : null}
            {aviso && aviso !== errorMapa ? <Text style={styles.aviso}>{aviso}</Text> : null}

            <View style={styles.campos}>
                <Input etiqueta="Calle" value={entrega.calle} onChangeText={(calle) => onCambiar({calle})}
                    maxLength={MAX_CAMPO_DIRECCION} error={errores.calle} />
                <View style={styles.fila}>
                    <View style={styles.flex}>
                        <Input etiqueta="Núm. exterior" value={entrega.numeroExterior}
                            onChangeText={(numeroExterior) => onCambiar({numeroExterior})}
                            maxLength={MAX_NUMERO} error={errores.numeroExterior} />
                    </View>
                    <View style={styles.flex}>
                        <Input etiqueta="Núm. interior" value={entrega.numeroInterior} placeholder="Opcional"
                            onChangeText={(numeroInterior) => onCambiar({numeroInterior})} maxLength={MAX_NUMERO} />
                    </View>
                </View>
                <Input etiqueta="Colonia" value={entrega.colonia} onChangeText={(colonia) => onCambiar({colonia})}
                    maxLength={MAX_CAMPO_DIRECCION} error={errores.colonia} />
                <Input etiqueta="Referencias" value={entrega.referencia} placeholder="Opcional: casa azul, portón negro"
                    onChangeText={(referencia) => onCambiar({referencia})} maxLength={MAX_REFERENCIA} multiline />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    busqueda: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    botonBuscar: {
        marginTop: 22, // alinea con el campo, debajo de su etiqueta
        paddingHorizontal: 16,
    },
    ayuda: {
        fontSize: 13,
        color: COLORS.TEXTO_SUAVE,
        marginBottom: 8,
    },
    error: {
        marginTop: 6,
        fontSize: 13,
        color: COLORS.ERROR,
    },
    aviso: {
        marginTop: 6,
        fontSize: 13,
        color: COLORS.TITULO,
    },
    campos: {
        marginTop: 16,
    },
    fila: {
        flexDirection: 'row',
        gap: 12,
    },
});

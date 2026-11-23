import { useState } from "react";
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Boton from "../../../src/components/Boton";
import DialogoNoEntregado from "../../../src/components/repartidor/DialogoNoEntregado";
import MapaDestino from "../../../src/components/repartidor/MapaDestino";
import { textoBloque } from "../../../src/constants/horarios";
import { useDialogo } from "../../../src/context/DialogoContext";
import { useEntrega } from "../../../src/hooks/useEntrega";
import { MENSAJES_REPARTIDOR, ResultadoEntrega } from "../../../src/services/repartidorService";
import { COLORS } from "../../../src/theme/colors";
import { EntregaRepartidor } from "../../../src/types/pedido.types";
import { armarDireccion } from "../../../src/utils/entrega";
import { formatearFechaEntrega } from "../../../src/utils/fechas";
import { urlComoLlegar } from "../../../src/utils/mapas";

const MENSAJE_SIN_MAPAS = 'No se pudo abrir la app de mapas';

// F06: ubicacion de la entrega, "Cómo llegar" y "Marcar como entregado"; F07 M2: "No se pudo entregar"
export default function RepartidorDetalleEntrega() {
    const router = useRouter();
    const {id} = useLocalSearchParams<{id?: string}>();
    const {entrega, cargando, error, actualizando, reintentar, entregar, noEntregar} = useEntrega(id);
    const {confirmar: confirmarDialogo, avisar} = useDialogo();
    const [pidiendoMotivo, setPidiendoMotivo] = useState(false);
    const volver = () => router.navigate('/repartidor');

    // mismo manejo para entregado y no entregado: si falla se queda en el detalle para reintentar
    const ejecutar = async (cambiar: () => Promise<{resultado: ResultadoEntrega; error: string | null}>) => {
        const cambio = await cambiar();
        if (cambio.resultado === 'error') {
            await avisar({tipo: 'error', titulo: 'No se pudo actualizar', mensaje: cambio.error ?? MENSAJES_REPARTIDOR.ACTUALIZAR});
            return;
        }
        if (cambio.resultado === 'desactualizado') await avisar({titulo: 'Aviso', mensaje: MENSAJES_REPARTIDOR.YA_NO_DISPONIBLE});
        volver();
    };

    const confirmar = async () => {
        const entregado = await confirmarDialogo({
            titulo: `¿Marcar el pedido ${entrega?.folio ?? ''} como entregado?`,
            textoConfirmar: 'Marcar como entregado',
            textoCancelar: 'Volver',
        });
        if (entregado) await ejecutar(entregar);
    };

    const registrarNoEntrega = async (motivo: string) => {
        setPidiendoMotivo(false);
        await ejecutar(() => noEntregar(motivo));
    };

    let contenido: React.ReactNode;
    if (cargando && !entrega) {
        contenido = <ActivityIndicator testID="entrega-cargando" color={COLORS.ACENTO} style={styles.estado} />;
    } else if (error || !entrega) {
        contenido = (
            <View style={styles.estado}>
                <Text style={styles.error}>{error}</Text>
                <Boton titulo="Reintentar" variante="secundario" onPress={reintentar} style={styles.boton} />
            </View>
        );
    } else {
        contenido = (
            <>
                <Detalle entrega={entrega} />
                {entrega.estado === 'en_camino' ? (
                    <>
                        <Boton titulo="Marcar como entregado" onPress={confirmar} cargando={actualizando} style={styles.boton} />
                        <Boton
                            titulo="No se pudo entregar"
                            variante="secundario"
                            onPress={() => setPidiendoMotivo(true)}
                            deshabilitado={actualizando}
                            style={styles.boton}
                        />
                    </>
                ) : (
                    <Text style={styles.suave}>{MENSAJES_REPARTIDOR.YA_NO_DISPONIBLE}</Text>
                )}
            </>
        );
    }

    return (
        <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido}>
            <Text style={styles.titulo}>{entrega?.folio ? `Entrega ${entrega.folio}` : 'Entrega'}</Text>
            {contenido}
            <Boton titulo="Volver a mis entregas" variante="secundario" onPress={volver} style={styles.boton} />
            {pidiendoMotivo && entrega ? (
                <DialogoNoEntregado folio={entrega.folio} onConfirmar={registrarNoEntrega} onCancelar={() => setPidiendoMotivo(false)} />
            ) : null}
        </ScrollView>
    );
}

function Detalle({entrega}: {entrega: EntregaRepartidor}) {
    const {avisar} = useDialogo();
    const abrirMapas = async (url: string) => {
        try {
            await Linking.openURL(url);
        } catch (e) {
            console.warn('abrirMapas:', e);
            await avisar({tipo: 'error', titulo: 'Aviso', mensaje: MENSAJE_SIN_MAPAS});
        }
    };
    const {entrega: datos} = entrega;
    const direccion = armarDireccion(datos);
    const url = urlComoLlegar(datos.ubicacion, direccion, Platform.OS);

    return (
        <>
            {datos.ubicacion ? <MapaDestino ubicacion={datos.ubicacion} /> : null}
            {url ? <Boton titulo="Cómo llegar" variante="secundario" onPress={() => abrirMapas(url)} style={styles.comoLlegar} /> : null}

            <Seccion titulo="Dirección">
                <Text style={styles.texto}>{direccion || 'Sin dirección'}</Text>
                {datos.referencia ? <Dato etiqueta="Referencias" valor={datos.referencia} /> : null}
            </Seccion>

            <Seccion titulo="Cliente">
                <Dato etiqueta="Nombre" valor={entrega.cliente} />
                <Dato etiqueta="Teléfono" valor={datos.telefono || '—'} />
            </Seccion>

            <Seccion titulo="Entrega">
                <Dato etiqueta="Fecha" valor={datos.fechaEntrega ? formatearFechaEntrega(datos.fechaEntrega) : '—'} />
                <Dato etiqueta="Horario" valor={textoBloque(datos.horaEntrega) || '—'} />
            </Seccion>

            <Seccion titulo="Pastel">
                <Dato etiqueta="Tamaño" valor={entrega.tamanio ? `${entrega.tamanio} personas` : '—'} />
                <Dato etiqueta="Niveles" valor={entrega.niveles ? String(entrega.niveles) : '—'} />
            </Seccion>
        </>
    );
}

function Seccion({titulo, children}: {titulo: string; children: React.ReactNode}) {
    return (
        <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>{titulo}</Text>
            {children}
        </View>
    );
}

function Dato({etiqueta, valor}: {etiqueta: string; valor: string}) {
    return (
        <Text style={styles.texto}>
            <Text style={styles.etiqueta}>{etiqueta}: </Text>{valor}
        </Text>
    );
}

const styles = StyleSheet.create({
    fondo: {
        backgroundColor: COLORS.BLANCO,
    },
    contenido: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 32,
    },
    titulo: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        textAlign: 'center',
        color: COLORS.TITULO,
        marginBottom: 16,
    },
    estado: {
        marginTop: 32,
        alignItems: 'stretch',
    },
    error: {
        fontSize: 15,
        color: COLORS.ERROR,
        textAlign: 'center',
    },
    boton: {
        marginTop: 12,
    },
    comoLlegar: {
        marginBottom: 12,
    },
    seccion: {
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        backgroundColor: COLORS.FONDO,
    },
    tituloSeccion: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.TITULO,
        marginBottom: 6,
    },
    texto: {
        fontSize: 14,
        color: COLORS.TEXTO,
        marginTop: 2,
    },
    etiqueta: {
        fontWeight: '700',
    },
    suave: {
        fontSize: 13,
        color: COLORS.TEXTO_SUAVE,
        textAlign: 'center',
        marginTop: 12,
    },
});

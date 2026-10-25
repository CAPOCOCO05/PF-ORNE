import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { AccionEstado } from "../../constants/estadosPedido";
import { useRepartidores } from "../../hooks/useRepartidores";
import { MENSAJES_ADMIN, ResultadoCambio } from "../../services/adminService";
import { COLORS } from "../../theme/colors";
import { PedidoAdmin } from "../../types/pedido.types";
import { accionesDisponibles, preguntaAccion } from "../../utils/estados";
import Boton from "../Boton";
import SelectorOpciones from "../pedido/SelectorOpciones";

interface AccionesPedidoProps {
    pedido: PedidoAdmin;
    actualizando: boolean;
    onAplicar: (accion: AccionEstado, repartidorId?: string) => Promise<{resultado: ResultadoCambio; error: string | null}>;
}

// botones para avanzar al siguiente estado permitido o cancelar (F04 D2, D6, D7)
export default function AccionesPedido({pedido, actualizando, onAplicar}: AccionesPedidoProps) {
    const acciones = accionesDisponibles(pedido.estado, pedido.entrega.tipoEntrega);
    const enviaAReparto = acciones.some((a) => a.requiereRepartidor);
    const [repartidorId, setRepartidorId] = useState<string | null>(null);
    const repartidores = useRepartidores(enviaAReparto);

    if (acciones.length === 0) return null;

    const ejecutar = async (accion: AccionEstado) => {
        const cambio = await onAplicar(accion, accion.requiereRepartidor ? repartidorId ?? undefined : undefined);
        if (cambio.resultado === 'error') Alert.alert('No se pudo actualizar', cambio.error ?? MENSAJES_ADMIN.ACTUALIZAR);
        if (cambio.resultado === 'desactualizado') Alert.alert('Aviso', MENSAJES_ADMIN.ACTUALIZADO);
    };

    // toda accion pide confirmacion
    const confirmar = (accion: AccionEstado) => {
        const repartidor = repartidores.repartidores.find((r) => r.id === repartidorId);
        const detalle = accion.requiereRepartidor && repartidor ? `Repartidor: ${repartidor.nombre}` : undefined;
        Alert.alert(preguntaAccion(accion, pedido.folio), detalle, [
            {text: 'Volver', style: 'cancel'},
            {text: accion.titulo, style: accion.destructiva ? 'destructive' : 'default', onPress: () => { ejecutar(accion); }},
        ]);
    };

    return (
        <View style={styles.seccion}>
            <Text style={styles.titulo}>Acciones</Text>
            {enviaAReparto ? (
                <SelectorRepartidor
                    {...repartidores}
                    seleccionado={repartidorId}
                    onSeleccionar={setRepartidorId}
                />
            ) : null}
            {acciones.map((accion) => (
                <Boton
                    key={accion.destino}
                    titulo={accion.titulo}
                    variante={accion.destructiva ? 'secundario' : 'principal'}
                    onPress={() => confirmar(accion)}
                    cargando={actualizando}
                    deshabilitado={accion.requiereRepartidor && !repartidorId}
                    style={styles.boton}
                />
            ))}
        </View>
    );
}

interface SelectorRepartidorProps extends ReturnType<typeof useRepartidores> {
    seleccionado: string | null;
    onSeleccionar: (id: string) => void;
}

function SelectorRepartidor({repartidores, cargando, error, reintentar, seleccionado, onSeleccionar}: SelectorRepartidorProps) {
    if (cargando) return <ActivityIndicator testID="repartidores-cargando" color={COLORS.BOTON_PRINCIPAL} style={styles.estado} />;
    if (error) {
        return (
            <View style={styles.estado}>
                <Text style={styles.error}>{error}</Text>
                <Boton titulo="Reintentar" variante="secundario" onPress={reintentar} style={styles.boton} />
            </View>
        );
    }
    if (repartidores.length === 0) return <Text style={[styles.estado, styles.error]}>{MENSAJES_ADMIN.SIN_REPARTIDORES}</Text>;
    return (
        <SelectorOpciones
            etiqueta="Repartidor"
            opciones={repartidores.map((r) => ({valor: r.id, texto: r.nombre}))}
            seleccionada={seleccionado}
            onSeleccionar={onSeleccionar}
        />
    );
}

const styles = StyleSheet.create({
    seccion: {
        marginTop: 8,
    },
    titulo: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.TITULO,
        marginBottom: 12,
    },
    boton: {
        marginBottom: 12,
    },
    estado: {
        marginBottom: 16,
    },
    error: {
        fontSize: 14,
        color: COLORS.ERROR,
        textAlign: 'center',
    },
});

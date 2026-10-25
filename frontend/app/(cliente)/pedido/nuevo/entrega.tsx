import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Input from "../../../../src/components/Input";
import Calendario from "../../../../src/components/pedido/Calendario";
import FormularioDomicilio from "../../../../src/components/pedido/FormularioDomicilio";
import PantallaPaso from "../../../../src/components/pedido/PantallaPaso";
import SelectorOpciones from "../../../../src/components/pedido/SelectorOpciones";
import { BLOQUES_HORARIO } from "../../../../src/constants/horarios";
import { SUCURSAL } from "../../../../src/constants/sucursal";
import { usePedido } from "../../../../src/context/PedidoContext";
import { RUTA_PASO, usePasoPedido } from "../../../../src/hooks/usePasoPedido";
import { COLORS } from "../../../../src/theme/colors";
import { TipoEntrega } from "../../../../src/types/pedido.types";
import { hoyLocal, mensajeAnticipacion, validarEntrega } from "../../../../src/utils/entrega";

const TIPOS_ENTREGA: {valor: TipoEntrega; texto: string}[] = [
    {valor: 'domicilio', texto: 'Domicilio'},
    {valor: 'recoleccion', texto: 'Sucursal'},
];

// F02 paso 4: domicilio (mapa + direccion) o recoleccion en sucursal, telefono, fecha y horario
export default function PasoEntrega() {
    const router = useRouter();
    const {pedido, actualizarEntrega} = usePedido();
    const {intentoAvanzar, guardando, siguiente} = usePasoPedido(4);
    const {entrega} = pedido;
    const hoy = useMemo(() => hoyLocal(), []);

    const faltantes = validarEntrega(entrega, pedido.niveles, hoy);
    // como en F01, los errores se marcan hasta presionar "Siguiente" (D4)
    const errores = intentoAvanzar ? faltantes : {};

    const terminar = () => siguiente(() => router.push(RUTA_PASO[5]), faltantes);

    return (
        <PantallaPaso paso={4} textoAtras="Atrás" onAtras={() => router.back()} onSiguiente={terminar} guardando={guardando}>
            <SelectorOpciones
                etiqueta="Tipo de entrega"
                opciones={TIPOS_ENTREGA}
                seleccionada={entrega.tipoEntrega}
                onSeleccionar={(tipoEntrega) => actualizarEntrega({tipoEntrega})}
                error={errores.tipoEntrega}
            />

            {entrega.tipoEntrega === 'domicilio' ? (
                <FormularioDomicilio entrega={entrega} errores={errores} onCambiar={actualizarEntrega} />
            ) : null}
            {entrega.tipoEntrega === 'recoleccion' ? <TarjetaSucursal /> : null}

            <View style={styles.seccion}>
                <Input
                    etiqueta="Teléfono de contacto"
                    value={entrega.telefono}
                    onChangeText={(telefono) => actualizarEntrega({telefono})}
                    keyboardType="phone-pad"
                    placeholder="10 dígitos"
                    maxLength={12}
                    error={errores.telefono}
                />
            </View>

            <Text style={styles.etiqueta}>Fecha de entrega</Text>
            <Text style={styles.ayuda}>{mensajeAnticipacion(pedido.niveles)}. No entregamos en domingo.</Text>
            <Calendario
                seleccionada={entrega.fechaEntrega}
                niveles={pedido.niveles}
                hoy={hoy}
                onSeleccionar={(fechaEntrega) => actualizarEntrega({fechaEntrega})}
                error={errores.fechaEntrega}
            />
            {errores.fechaEntrega ? <Text style={styles.error}>{errores.fechaEntrega}</Text> : null}

            <View style={styles.seccion}>
                <SelectorOpciones
                    etiqueta="Horario"
                    opciones={BLOQUES_HORARIO.map(({inicio, texto}) => ({valor: inicio, texto}))}
                    seleccionada={entrega.horaEntrega}
                    onSeleccionar={(horaEntrega) => actualizarEntrega({horaEntrega})}
                    error={errores.horaEntrega}
                />
            </View>
        </PantallaPaso>
    );
}

// recoleccion: direccion fija, sin mapa (F02 flujo 4, D6)
function TarjetaSucursal() {
    return (
        <View style={styles.sucursal}>
            <Text style={styles.sucursalNombre}>{SUCURSAL.nombre}</Text>
            <Text style={styles.sucursalTexto}>{SUCURSAL.direccion}</Text>
            <Text style={styles.sucursalTexto}>{SUCURSAL.horario}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    seccion: {
        marginTop: 20,
    },
    etiqueta: {
        fontSize: 15,
        color: COLORS.TEXTO,
        marginBottom: 4,
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
    sucursal: {
        borderRadius: 16,
        padding: 16,
        backgroundColor: COLORS.BOTON_SECUNDARIO,
    },
    sucursalNombre: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.TITULO,
        marginBottom: 4,
    },
    sucursalTexto: {
        fontSize: 14,
        color: COLORS.TEXTO,
    },
});

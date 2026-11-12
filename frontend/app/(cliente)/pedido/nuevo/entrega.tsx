import { useMemo, useState } from "react";
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
import { useAuth } from "../../../../src/context/AuthContext";
import { useDialogo } from "../../../../src/context/DialogoContext";
import { RUTA_PASO, usePasoPedido } from "../../../../src/hooks/usePasoPedido";
import { COLORS } from "../../../../src/theme/colors";
import { TipoEntrega } from "../../../../src/types/pedido.types";
import { hoyLocal, mensajeAnticipacion, validarEntrega } from "../../../../src/utils/entrega";
import { MAX_NOMBRE, normalizarNombre, validarNombreCompleto } from "../../../../src/utils/validaciones";

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

    const {pideNombre, nombre, setNombre, errorNombre, guardarNombre} = useNombreQuienRecibe(entrega.tipoEntrega === 'domicilio');

    const faltantes = {...validarEntrega(entrega, pedido.niveles, hoy), ...(errorNombre ? {nombre: errorNombre} : {})};
    // como en F01, los errores se marcan hasta presionar "Siguiente" (D4)
    const errores = intentoAvanzar ? faltantes : {};

    // primero se guarda el borrador; despues, si hacia falta, el nombre en el perfil (F07 M6)
    const terminar = () => siguiente(async () => {
        if (await guardarNombre()) router.push(RUTA_PASO[5]);
    }, faltantes);

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
                {pideNombre ? (
                    <Input
                        etiqueta="Nombre completo de quien recibe"
                        value={nombre}
                        onChangeText={setNombre}
                        placeholder="Nombre y apellidos"
                        ayuda="Lo usará el repartidor para entregarte tu pedido"
                        maxLength={MAX_NOMBRE}
                        autoCapitalize="words"
                        autoComplete="name"
                        textContentType="name"
                        error={errores.nombre}
                    />
                ) : null}
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

// F07 M6: cuentas antiguas con nombre incompleto lo completan al pedir a domicilio
// (en sucursal no aplica, D3). Al avanzar se guarda en el perfil
function useNombreQuienRecibe(esDomicilio: boolean) {
    const {perfil, actualizarNombre} = useAuth();
    const {avisar} = useDialogo();
    const [nombre, setNombre] = useState(perfil?.nombre ?? '');
    const pideNombre = esDomicilio && !!perfil && validarNombreCompleto(perfil.nombre) !== undefined;
    const errorNombre = pideNombre ? validarNombreCompleto(nombre) : undefined;

    // true si se puede seguir: no hacia falta o se guardo; si falla avisa y se queda en el paso
    const guardarNombre = async (): Promise<boolean> => {
        if (!pideNombre) return true;
        const {error} = await actualizarNombre(normalizarNombre(nombre));
        if (!error) return true;
        await avisar({tipo: 'error', titulo: 'No se pudo guardar tu nombre', mensaje: error});
        return false;
    };

    return {pideNombre, nombre, setNombre, errorNombre, guardarNombre};
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

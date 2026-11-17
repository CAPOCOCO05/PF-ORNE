import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import Boton from "../../../src/components/Boton";
import Input from "../../../src/components/Input";
import FormularioDomicilio from "../../../src/components/pedido/FormularioDomicilio";
import { useDialogo } from "../../../src/context/DialogoContext";
import { useDatosCliente } from "../../../src/hooks/useDatosCliente";
import { COLORS } from "../../../src/theme/colors";
import { DatosEntrega } from "../../../src/types/pedido.types";
import {
    datosDesdeFormulario, FormularioDatosCliente, formularioDesdeDatos, hayCambios, validarDatosCliente,
} from "../../../src/utils/datosCliente";
import { ENTREGA_VACIA } from "../../../src/utils/entrega";
import { MAX_NOMBRE } from "../../../src/utils/validaciones";
import RequiereCuenta from "../../../src/components/RequiereCuenta";

// F07 M7: editar nombre, telefono y direccion guardada (no aparece en el menu)
// F09: sin sesion se invita a crear cuenta en lugar de consultar datos
export default function EditarPerfilProtegida() {
    return (
        <RequiereCuenta mensaje="Crea tu cuenta para guardar tus datos y tu dirección de entrega.">
            <EditarPerfil />
        </RequiereCuenta>
    );
}

function EditarPerfil() {
    const router = useRouter();
    const {confirmar, avisar} = useDialogo();
    const {nombre, datos, cargando, error, recargar, guardar} = useDatosCliente();
    const [original, setOriginal] = useState<FormularioDatosCliente | null>(null);
    const [formulario, setFormulario] = useState<FormularioDatosCliente | null>(null);
    const [intentoGuardar, setIntentoGuardar] = useState(false);
    const [guardando, setGuardando] = useState(false);

    // cada vez que se abre se parte de lo guardado (el Drawer no desmonta la pantalla)
    useFocusEffect(useCallback(() => {
        setFormulario(null);
        setIntentoGuardar(false);
    }, []));
    useEffect(() => {
        if (formulario || cargando || !datos) return;
        const inicial = formularioDesdeDatos(nombre, datos);
        setOriginal(inicial);
        setFormulario(inicial);
    }, [formulario, cargando, datos, nombre]);

    const volver = useCallback(() => router.navigate('/perfil'), [router]);

    // con cambios sin guardar se pregunta antes de salir (dialogo de M1)
    const salir = useCallback(async () => {
        if (original && formulario && hayCambios(original, formulario)) {
            const salirSinGuardar = await confirmar({
                titulo: '¿Salir sin guardar?', mensaje: 'Se perderán los cambios que hiciste.', textoConfirmar: 'Salir', destructiva: true,
            });
            if (!salirSinGuardar) return;
        }
        volver();
    }, [original, formulario, confirmar, volver]);

    useFocusEffect(useCallback(() => {
        const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
            salir();
            return true;
        });
        return () => suscripcion.remove();
    }, [salir]));

    if (!formulario) {
        return <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />;
    }

    const faltantes = validarDatosCliente(formulario);
    // formato de nombre y telefono al momento; los obligatorios de la direccion al intentar guardar
    const errores = intentoGuardar ? faltantes : {nombre: faltantes.nombre, telefono: faltantes.telefono};

    const cambiar = (cambios: Partial<FormularioDatosCliente>) => setFormulario((f) => f && {...f, ...cambios});
    const cambiarDireccion = (cambios: Partial<DatosEntrega>) =>
        setFormulario((f) => f && {...f, direccion: {...f.direccion, ...cambios}});

    const guardarCambios = async () => {
        setIntentoGuardar(true);
        if (Object.keys(faltantes).length > 0) return;
        setGuardando(true);
        const errorGuardar = await guardar(formulario.nombre, datosDesdeFormulario(formulario));
        setGuardando(false);
        if (errorGuardar) {
            await avisar({tipo: 'error', titulo: 'No se pudieron guardar tus datos', mensaje: errorGuardar});
            return;
        }
        volver();
    };

    return (
        <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
            <Text style={styles.titulo}>Editar datos</Text>

            <Input
                etiqueta="Nombre completo"
                value={formulario.nombre}
                onChangeText={(valor) => cambiar({nombre: valor})}
                placeholder="Nombre y apellidos"
                ayuda="Lo usará el repartidor para entregarte tu pedido"
                maxLength={MAX_NOMBRE}
                autoCapitalize="words"
                error={errores.nombre}
            />
            <Input
                etiqueta="Teléfono"
                value={formulario.telefono}
                onChangeText={(telefono) => cambiar({telefono})}
                keyboardType="phone-pad"
                placeholder="10 dígitos"
                maxLength={12}
                error={errores.telefono}
            />

            <Text style={styles.subtitulo}>Dirección de entrega</Text>
            {formulario.conDireccion ? (
                <>
                    <FormularioDomicilio entrega={formulario.direccion} errores={errores} onCambiar={cambiarDireccion} />
                    <Pressable
                        onPress={() => cambiar({conDireccion: false, direccion: ENTREGA_VACIA})}
                        accessibilityRole="button"
                        hitSlop={8}
                        style={styles.quitar}
                    >
                        <Text style={styles.textoQuitar}>Quitar dirección</Text>
                    </Pressable>
                </>
            ) : (
                <View>
                    <Text style={styles.vacio}>Aún no tienes una dirección guardada</Text>
                    <Boton titulo="Agregar dirección" variante="secundario" onPress={() => cambiar({conDireccion: true})} />
                </View>
            )}

            <Boton titulo="Guardar cambios" onPress={guardarCambios} cargando={guardando} style={styles.boton} />
            <Boton titulo="Cancelar" variante="secundario" onPress={salir} deshabilitado={guardando} style={styles.botonCancelar} />
        </ScrollView>
    );
}

function EstadoCarga({cargando, error, onReintentar}: {cargando: boolean; error: string | null; onReintentar: () => void}) {
    return (
        <View style={[styles.fondo, styles.estado]}>
            {cargando || !error ? (
                <ActivityIndicator testID="editar-cargando" color={COLORS.BOTON_PRINCIPAL} />
            ) : (
                <>
                    <Text style={styles.error}>{error}</Text>
                    <Boton titulo="Reintentar" variante="secundario" onPress={onReintentar} style={styles.botonCancelar} />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    fondo: {
        flex: 1,
        backgroundColor: COLORS.BLANCO,
    },
    contenido: {
        padding: 24,
        paddingBottom: 40,
    },
    titulo: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.TITULO,
        textAlign: 'center',
        marginBottom: 20,
    },
    subtitulo: {
        fontSize: 15,
        fontWeight: '700',
        textTransform: 'uppercase',
        color: COLORS.TITULO,
        marginTop: 16,
        marginBottom: 12,
    },
    vacio: {
        fontSize: 14,
        color: COLORS.TEXTO_SUAVE,
        marginBottom: 12,
    },
    quitar: {
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    textoQuitar: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.BOTON_PRINCIPAL,
        textDecorationLine: 'underline',
    },
    boton: {
        marginTop: 28,
    },
    botonCancelar: {
        marginTop: 12,
    },
    estado: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    error: {
        fontSize: 15,
        color: COLORS.ERROR,
        textAlign: 'center',
    },
});

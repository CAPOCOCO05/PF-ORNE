import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import Boton from "../../../src/components/Boton";
import Input from "../../../src/components/Input";
import TarjetaPastel from "../../../src/components/TarjetaPastel";
import SelectorOpciones from "../../../src/components/pedido/SelectorOpciones";
import SelectorSabor from "../../../src/components/pedido/SelectorSabor";
import { SABORES_PAN, SABORES_RELLENO } from "../../../src/constants/catalogoSabores";
import { calcularPrecio, esPrecioEstimado, formatearPrecio } from "../../../src/constants/precios";
import { useDialogo } from "../../../src/context/DialogoContext";
import { useElegirImagen } from "../../../src/hooks/useElegirImagen";
import { usePastelAdmin } from "../../../src/hooks/usePastelAdmin";
import { COLORS } from "../../../src/theme/colors";
import { FormularioPastel, Niveles, Tamanio } from "../../../src/types/pedido.types";
import { MAX_DESCRIPCION_PASTEL, MAX_NOMBRE_PASTEL } from "../../../src/utils/catalogo";
import { ajustarNiveles, NIVELES, nivelesPermitidos, TAMANIOS } from "../../../src/utils/pedido";

const RUTA_CATALOGO = '/admin/catalogo';

// F07 M4: alta (id = 'nuevo') y edicion de un pastel del catalogo, con vista previa
export default function AdminPastel() {
    const router = useRouter();
    const {id} = useLocalSearchParams<{id?: string}>();
    const pastel = usePastelAdmin(id);
    const {formulario, actualizar, errores} = pastel;
    const {confirmar, mostrar} = useDialogo();
    const elegirImagen = useElegirImagen('Permite el acceso a tus fotos para agregar la imagen del pastel.');
    const [errorImagen, setErrorImagen] = useState<string | null>(null);
    const [avisoNiveles, setAvisoNiveles] = useState<string | null>(null);

    useFocusEffect(useCallback(() => {
        setErrorImagen(null);
        setAvisoNiveles(null);
    }, [id]));

    const volver = () => router.navigate(RUTA_CATALOGO);

    const cambiarImagen = async () => {
        const {imagen, error} = await elegirImagen();
        if (error) setErrorImagen(error);
        if (imagen) {
            setErrorImagen(null);
            actualizar({imagenLocal: imagen});
        }
    };

    const elegirTamanio = (tamanio: Tamanio) => {
        const {niveles, ajustado} = ajustarNiveles(tamanio, formulario.niveles);
        actualizar({tamanio, niveles});
        setAvisoNiveles(ajustado ? `Ajustamos los niveles a ${niveles}: es el máximo para ${tamanio} personas.` : null);
    };

    const elegirNiveles = (niveles: Niveles) => {
        actualizar({niveles});
        setAvisoNiveles(null);
    };

    // confirmacion (M1) y guardado; si falla la red o la imagen, se ofrece reintentar
    // sin perder lo capturado (M4, casos de error)
    const enviar = async () => {
        if (!pastel.validar()) return;
        if (!await confirmar(textosConfirmacion(pastel.esNuevo, formulario.activo))) return;
        for (;;) {
            const resultado = await pastel.guardar();
            if (resultado.errorNombre) return;
            if (!resultado.error) {
                volver();
                return;
            }
            const respuesta = await mostrar({
                tipo: 'error', titulo: 'No se pudo guardar', mensaje: resultado.error, textoConfirmar: 'Reintentar',
            });
            if (respuesta !== 'confirmar') return;
        }
    };

    if (pastel.cargando || pastel.error) {
        return (
            <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido}>
                <Text style={styles.titulo}>Editar pastel</Text>
                {pastel.cargando ? (
                    <ActivityIndicator testID="pastel-cargando" color={COLORS.BOTON_PRINCIPAL} style={styles.estado} />
                ) : (
                    <View style={styles.estado}>
                        <Text style={styles.error}>{pastel.error}</Text>
                        <Boton titulo="Reintentar" variante="secundario" onPress={pastel.reintentar} style={styles.boton} />
                    </View>
                )}
                <Boton titulo="Volver al catálogo" variante="secundario" onPress={volver} style={styles.boton} />
            </ScrollView>
        );
    }

    const permitidos = nivelesPermitidos(formulario.tamanio);
    const imagenMostrada = formulario.imagenLocal?.uri ?? formulario.imagenUrl;

    return (
        <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
            <Text style={styles.titulo}>{pastel.esNuevo ? 'Nuevo pastel' : 'Editar pastel'}</Text>

            <Input
                etiqueta="Nombre"
                value={formulario.nombre}
                onChangeText={(nombre) => actualizar({nombre})}
                maxLength={MAX_NOMBRE_PASTEL}
                placeholder="Ej. Chocolate con cajeta"
                error={errores.nombre}
                contador={{actual: formulario.nombre.length, maximo: MAX_NOMBRE_PASTEL}}
            />
            <Input
                etiqueta="Descripción (opcional)"
                value={formulario.descripcion}
                onChangeText={(descripcion) => actualizar({descripcion})}
                maxLength={MAX_DESCRIPCION_PASTEL}
                multiline
                placeholder="Ej. Pan de chocolate relleno de cajeta"
                error={errores.descripcion}
                contador={{actual: formulario.descripcion.length, maximo: MAX_DESCRIPCION_PASTEL}}
            />

            <Text style={styles.etiqueta}>Imagen (opcional)</Text>
            <View style={styles.filaImagen}>
                <View style={styles.miniatura}>
                    {imagenMostrada ? (
                        <Image source={{uri: imagenMostrada}} style={styles.imagen} resizeMode="cover" accessibilityLabel="Imagen del pastel" />
                    ) : (
                        <Image source={require('../../../assets/icono_pastel.png')} style={styles.placeholder} resizeMode="contain" />
                    )}
                </View>
                <Pressable onPress={() => { void cambiarImagen(); }} accessibilityRole="button" hitSlop={8}>
                    <Text style={styles.enlace}>{imagenMostrada ? 'Cambiar imagen' : 'Elegir imagen'}</Text>
                </Pressable>
            </View>
            {errorImagen ? <Text style={styles.error}>{errorImagen}</Text> : null}

            <SelectorOpciones
                etiqueta="Tamaño (personas)"
                opciones={TAMANIOS.map((t) => ({valor: t, texto: t}))}
                seleccionada={formulario.tamanio}
                onSeleccionar={elegirTamanio}
                error={errores.tamanio}
            />
            <SelectorOpciones
                etiqueta="Número de niveles"
                opciones={NIVELES.map((n) => ({valor: n, texto: String(n), deshabilitada: !permitidos.includes(n)}))}
                seleccionada={formulario.niveles}
                onSeleccionar={elegirNiveles}
                error={errores.niveles}
            />
            {avisoNiveles ? <Text style={styles.aviso}>{avisoNiveles}</Text> : null}
            <SelectorSabor
                etiqueta="Sabor de pan"
                sabores={SABORES_PAN}
                seleccionado={formulario.tipoPan}
                onSeleccionar={(tipoPan) => actualizar({tipoPan})}
                error={errores.tipoPan}
            />
            <SelectorSabor
                etiqueta="Sabor de relleno"
                sabores={SABORES_RELLENO}
                seleccionado={formulario.relleno}
                onSeleccionar={(relleno) => actualizar({relleno})}
                error={errores.relleno}
            />

            <View style={styles.filaPublicado}>
                <View style={styles.textosPublicado}>
                    <Text style={styles.etiquetaPublicado}>Publicado</Text>
                    <Text style={styles.suave}>
                        {formulario.activo ? 'Los clientes lo ven en el catálogo' : 'Oculto: los clientes no lo ven'}
                    </Text>
                </View>
                <Switch
                    value={formulario.activo}
                    onValueChange={(activo) => actualizar({activo})}
                    accessibilityLabel="Publicado"
                    trackColor={{false: COLORS.FONDO, true: COLORS.BOTON_SECUNDARIO}}
                    thumbColor={formulario.activo ? COLORS.BOTON_PRINCIPAL : COLORS.TEXTO_SUAVE}
                />
            </View>

            <VistaPrevia formulario={formulario} imagen={imagenMostrada} />

            <Boton
                titulo={textoGuardar(pastel.esNuevo, formulario.activo)}
                onPress={enviar}
                cargando={pastel.guardando}
                style={styles.boton}
            />
            <Boton titulo="Cancelar" variante="secundario" onPress={volver} deshabilitado={pastel.guardando} style={styles.boton} />
        </ScrollView>
    );
}

// como lo vera el cliente; el precio es el que calculara la base (012) y el wizard
function VistaPrevia({formulario, imagen}: {formulario: FormularioPastel; imagen: string | null}) {
    const precio = calcularPrecio(formulario);
    return (
        <View style={styles.vistaPrevia}>
            <Text style={styles.etiqueta}>Vista previa</Text>
            <View style={styles.tarjeta}>
                <TarjetaPastel
                    pastel={{
                        nombre: formulario.nombre.trim() || 'Nombre del pastel',
                        descripcion: formulario.descripcion.trim() || null,
                        imagen_url: imagen,
                        precio_base: precio ?? 0,
                    }}
                />
            </View>
            <Text style={styles.precio}>
                {precio === null ? 'Elige el tamaño para calcular el precio' : `Precio: ${formatearPrecio(precio)}`}
            </Text>
            {precio !== null && esPrecioEstimado(formulario.niveles) ? (
                <Text style={styles.suave}>Precio estimado, sujeto a confirmación</Text>
            ) : null}
        </View>
    );
}

function textoGuardar(esNuevo: boolean, activo: boolean): string {
    if (!esNuevo) return 'Guardar cambios';
    return activo ? 'Publicar' : 'Guardar pastel';
}

function textosConfirmacion(esNuevo: boolean, activo: boolean) {
    const mensaje = activo ? 'Aparecerá en el catálogo de los clientes.' : 'Quedará oculto para los clientes.';
    if (!esNuevo) return {titulo: '¿Guardar los cambios?', mensaje, textoConfirmar: 'Sí, guardar'};
    return activo
        ? {titulo: '¿Publicar este pastel?', mensaje, textoConfirmar: 'Sí, publicar'}
        : {titulo: '¿Guardar este pastel?', mensaje, textoConfirmar: 'Sí, guardar'};
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
        marginBottom: 16,
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        textAlign: 'center',
        color: COLORS.TITULO,
    },
    etiqueta: {
        fontSize: 15,
        color: COLORS.TEXTO,
        marginBottom: 8,
    },
    filaImagen: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 8,
    },
    miniatura: {
        width: 88,
        height: 88,
        borderRadius: 16,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.FONDO,
    },
    imagen: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        width: '50%',
        height: '50%',
        opacity: 0.5,
    },
    enlace: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.BOTON_PRINCIPAL,
        textDecorationLine: 'underline',
    },
    aviso: {
        marginTop: -8,
        marginBottom: 16,
        fontSize: 13,
        color: COLORS.TITULO,
    },
    filaPublicado: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        marginBottom: 20,
        borderRadius: 16,
        backgroundColor: COLORS.FONDO,
    },
    textosPublicado: {
        flex: 1,
    },
    etiquetaPublicado: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.TITULO,
    },
    vistaPrevia: {
        alignItems: 'center',
        marginBottom: 8,
    },
    tarjeta: {
        width: '55%',
        flexDirection: 'row',
    },
    precio: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.TITULO,
    },
    suave: {
        fontSize: 13,
        color: COLORS.TEXTO_SUAVE,
    },
    estado: {
        marginTop: 32,
        alignItems: 'stretch',
    },
    error: {
        marginBottom: 12,
        fontSize: 14,
        color: COLORS.ERROR,
        textAlign: 'center',
    },
    boton: {
        marginTop: 12,
    },
});

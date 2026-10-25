import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { nombrePan, nombreRelleno } from "../../constants/catalogoSabores";
import { textoBloque } from "../../constants/horarios";
import { SUCURSAL } from "../../constants/sucursal";
import { urlReferencia } from "../../services/pedidosService";
import { COLORS } from "../../theme/colors";
import { DatosEntrega, PasoPedido, PedidoEnCurso } from "../../types/pedido.types";
import { armarDireccion } from "../../utils/entrega";
import { formatearFechaEntrega } from "../../utils/fechas";

export type DatosResumen = Pick<PedidoEnCurso, 'tamanio' | 'niveles' | 'tipoPan' | 'relleno' | 'mensaje' | 'imagenRuta' | 'entrega'>;

interface ResumenPedidoProps {
    pedido: DatosResumen;
    onEditar?: (paso: PasoPedido) => void; // solo en el paso 5: regresa al paso de la seccion (D4)
}

// resumen de todo lo capturado en F01 y F02; lo usan el pago, la confirmacion y el detalle (F03)
export default function ResumenPedido({pedido, onEditar}: ResumenPedidoProps) {
    const imagen = useUrlReferencia(pedido.imagenRuta);
    const {entrega} = pedido;

    return (
        <View>
            <Seccion titulo="Pastel" paso={1} onEditar={onEditar}>
                <Dato etiqueta="Tamaño" valor={pedido.tamanio ? `${pedido.tamanio} personas` : '—'} />
                <Dato etiqueta="Niveles" valor={pedido.niveles ? String(pedido.niveles) : '—'} />
            </Seccion>
            <Seccion titulo="Sabor" paso={2} onEditar={onEditar}>
                <Dato etiqueta="Pan" valor={nombrePan(pedido.tipoPan) || '—'} />
                <Dato etiqueta="Relleno" valor={nombreRelleno(pedido.relleno) || '—'} />
            </Seccion>
            <Seccion titulo="Decoración" paso={3} onEditar={onEditar}>
                <Text style={styles.texto}>{pedido.mensaje.trim() || 'Sin descripción'}</Text>
                {imagen ? <Image source={{uri: imagen}} style={styles.imagen} accessibilityLabel="Imagen de referencia" /> : null}
                {!pedido.imagenRuta ? <Text style={styles.suave}>Sin imagen de referencia</Text> : null}
            </Seccion>
            <Seccion titulo="Entrega" paso={4} onEditar={onEditar}>
                <LugarEntrega entrega={entrega} />
                <Dato etiqueta="Fecha" valor={entrega.fechaEntrega ? formatearFechaEntrega(entrega.fechaEntrega) : '—'} />
                <Dato etiqueta="Horario" valor={textoBloque(entrega.horaEntrega) || '—'} />
                <Dato etiqueta="Teléfono" valor={entrega.telefono || '—'} />
            </Seccion>
        </View>
    );
}

function LugarEntrega({entrega}: {entrega: DatosEntrega}) {
    if (entrega.tipoEntrega === 'recoleccion') {
        return <Dato etiqueta="Recoger en" valor={`${SUCURSAL.nombre}, ${SUCURSAL.direccion}`} />;
    }
    if (entrega.tipoEntrega !== 'domicilio') return <Dato etiqueta="Tipo" valor="—" />;
    return (
        <>
            <Dato etiqueta="Domicilio" valor={armarDireccion(entrega)} />
            {entrega.referencia.trim() ? <Dato etiqueta="Referencias" valor={entrega.referencia.trim()} /> : null}
        </>
    );
}

interface SeccionProps {
    titulo: string;
    paso: PasoPedido;
    onEditar?: (paso: PasoPedido) => void;
    children: React.ReactNode;
}

function Seccion({titulo, paso, onEditar, children}: SeccionProps) {
    return (
        <View style={styles.seccion}>
            <View style={styles.encabezado}>
                <Text style={styles.titulo}>{titulo}</Text>
                {onEditar ? (
                    <Pressable onPress={() => onEditar(paso)} accessibilityRole="button" accessibilityLabel={`Editar ${titulo}`} hitSlop={8}>
                        <Text style={styles.editar}>Editar</Text>
                    </Pressable>
                ) : null}
            </View>
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

// el bucket es privado: la miniatura se muestra con una URL firmada
function useUrlReferencia(ruta: string | null): string | null {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        setUrl(null);
        if (!ruta) return;
        let cancelado = false;
        urlReferencia(ruta).then((resultado) => {
            if (!cancelado) setUrl(resultado.url);
        });
        return () => { cancelado = true; };
    }, [ruta]);
    return url;
}

const styles = StyleSheet.create({
    seccion: {
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        backgroundColor: COLORS.FONDO,
    },
    encabezado: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    titulo: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.TITULO,
    },
    editar: {
        fontSize: 14,
        color: COLORS.BOTON_PRINCIPAL,
        textDecorationLine: 'underline',
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
        marginTop: 4,
    },
    imagen: {
        width: 96,
        height: 96,
        borderRadius: 12,
        marginTop: 8,
        backgroundColor: COLORS.BLANCO,
    },
});

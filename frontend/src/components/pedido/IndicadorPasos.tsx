import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../theme/colors";
import { PasoPedido } from "../../types/pedido.types";

const PASOS: {paso: PasoPedido; titulo: string}[] = [
    {paso: 1, titulo: 'Pastel'},
    {paso: 2, titulo: 'Sabor'},
    {paso: 3, titulo: 'Decoración'},
    {paso: 4, titulo: 'Entrega'},
    {paso: 5, titulo: 'Pago'},
];

// stepper solo visual: se retrocede con "Atrás", un paso a la vez (D3)
export default function IndicadorPasos({actual}: {actual: PasoPedido}) {
    return (
        <View style={styles.fila} accessibilityLabel={`Paso ${actual} de ${PASOS.length}`}>
            {PASOS.map(({paso, titulo}, i) => {
                const hecho = paso <= actual;
                return (
                    <View key={paso} style={styles.paso}>
                        {i > 0 ? <View style={[styles.linea, hecho && styles.lineaHecha]} /> : null}
                        <View style={styles.columna}>
                            <View style={[styles.circulo, hecho && styles.circuloHecho]}>
                                <Text style={[styles.numero, hecho && styles.numeroHecho]}>{paso}</Text>
                            </View>
                            <Text style={[styles.titulo, paso === actual && styles.tituloActual]} numberOfLines={1} adjustsFontSizeToFit>{titulo}</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const TAMANO_CIRCULO = 28;

const styles = StyleSheet.create({
    fila: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 24,
    },
    paso: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    columna: {
        alignItems: 'center',
        width: 56,
    },
    linea: {
        width: 6,
        height: 2,
        marginTop: TAMANO_CIRCULO / 2,
        backgroundColor: COLORS.FONDO,
    },
    lineaHecha: {
        backgroundColor: COLORS.BOTON_PRINCIPAL,
    },
    circulo: {
        width: TAMANO_CIRCULO,
        height: TAMANO_CIRCULO,
        borderRadius: TAMANO_CIRCULO / 2,
        borderWidth: 1.5,
        borderColor: COLORS.TITULO,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.BLANCO,
    },
    circuloHecho: {
        borderColor: COLORS.ACENTO,
        backgroundColor: COLORS.BOTON_PRINCIPAL,
    },
    numero: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.TITULO,
    },
    numeroHecho: {
        color: COLORS.TITULO,
    },
    titulo: {
        marginTop: 4,
        fontSize: 11,
        color: COLORS.TEXTO_SUAVE,
    },
    tituloActual: {
        color: COLORS.TITULO,
        fontWeight: '700',
    },
});

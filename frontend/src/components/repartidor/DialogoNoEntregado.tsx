import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { MAX_MOTIVO_NO_ENTREGA, MOTIVO_OTRO, MOTIVOS_NO_ENTREGA } from "../../constants/estadosPedido";
import { motivoNoEntrega } from "../../utils/estados";
import Boton from "../Boton";
import { estilosDialogo, MarcoDialogo } from "../Dialogo";
import Input from "../Input";
import SelectorOpciones, { Opcion } from "../pedido/SelectorOpciones";

const OPCIONES: Opcion<string>[] = [...MOTIVOS_NO_ENTREGA, MOTIVO_OTRO].map((motivo) => ({valor: motivo, texto: motivo}));

interface DialogoNoEntregadoProps {
    folio: string | null;
    onConfirmar: (motivo: string) => void;
    onCancelar: () => void;
}

// "No se pudo entregar": el repartidor elige el motivo, obligatorio (F07 M2)
export default function DialogoNoEntregado({folio, onConfirmar, onCancelar}: DialogoNoEntregadoProps) {
    const [opcion, setOpcion] = useState<string | null>(null);
    const [otro, setOtro] = useState('');
    const [intento, setIntento] = useState(false);

    const {motivo, error} = motivoNoEntrega(opcion, otro);
    // el error se muestra al intentar confirmar o, en "Otro", en cuanto se escribe algo (F05)
    const errorVisible = intento || (opcion === MOTIVO_OTRO && otro.length > 0) ? error : null;
    const errorOpcion = errorVisible && opcion !== MOTIVO_OTRO ? errorVisible : undefined;
    const errorOtro = errorVisible && opcion === MOTIVO_OTRO ? errorVisible : null;

    const confirmar = () => {
        setIntento(true);
        if (motivo) onConfirmar(motivo);
    };

    return (
        <MarcoDialogo
            testID="dialogo-no-entregado"
            titulo={`¿Por qué no se pudo entregar${folio ? ` el pedido ${folio}` : ''}?`}
            mensaje="El pedido saldrá de tus entregas y la pastelería decidirá si se reprograma."
            alerta
            onCerrar={onCancelar}
        >
            <View style={styles.contenido}>
                <SelectorOpciones etiqueta="Motivo" opciones={OPCIONES} seleccionada={opcion} onSeleccionar={setOpcion} error={errorOpcion} />
                {opcion === MOTIVO_OTRO ? (
                    <Input
                        etiqueta="Describe el motivo"
                        placeholder="Ej. calle cerrada por obras"
                        value={otro}
                        onChangeText={setOtro}
                        maxLength={MAX_MOTIVO_NO_ENTREGA}
                        multiline
                        error={errorOtro}
                        contador={{actual: otro.length, maximo: MAX_MOTIVO_NO_ENTREGA}}
                    />
                ) : null}
            </View>
            <View style={estilosDialogo.botones}>
                <Boton testID="no-entregado-confirmar" titulo="Marcar como no entregado" onPress={confirmar} style={estilosDialogo.destructiva} />
                <Boton testID="no-entregado-cancelar" titulo="Volver" variante="secundario" onPress={onCancelar} />
            </View>
        </MarcoDialogo>
    );
}

const styles = StyleSheet.create({
    contenido: {
        alignSelf: 'stretch',
        marginTop: 16,
    },
});

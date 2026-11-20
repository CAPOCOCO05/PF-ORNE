import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import PanelFiltros from "./PanelFiltros";
import FiltrosAplicados from "./FiltrosAplicados";
import { FiltrosCatalogo } from "../../types/pedido.types";
import { contarFiltros } from "../../utils/filtrosCatalogo";
import { COLORS } from "../../theme/colors";

interface BarraFiltrosProps {
    filtros: FiltrosCatalogo;
    onCambiar: (filtros: FiltrosCatalogo) => void;
}

// F07 M5: barra compacta con el desplegable "Filtrar" que se abre debajo, sin cubrir
// el catalogo; los filtros aplicados se ven como chips con "×".
// Sin "Ordenar" (F10 A3): el catalogo se muestra siempre por nombre
export default function BarraFiltros({filtros, onCambiar}: BarraFiltrosProps) {
    const [abierto, setAbierto] = useState(false);
    const aplicar = (nuevos: FiltrosCatalogo) => {
        setAbierto(false);
        onCambiar(nuevos);
    };
    const total = contarFiltros(filtros);

    return (
        <View style={styles.contenedor}>
            <View  style={styles.barra}>
                <BotonDesplegable
                    texto={total > 0 ? `Filtrar (${total})` : 'Filtrar'}
                    abierto={abierto}
                    activo={total > 0}
                    onPress={() => setAbierto((actual) => !actual)}
                />
            </View>
            {abierto && <PanelFiltros filtros={filtros} onAplicar={aplicar} />}
            <FiltrosAplicados filtros={filtros} onCambiar={onCambiar} />
        </View>
    );
}

interface BotonDesplegableProps {
    texto: string;
    abierto: boolean;
    activo: boolean;     // con filtros u orden distinto al de por defecto: se resalta
    onPress: () => void;
}

function BotonDesplegable({texto, abierto, activo, onPress}: BotonDesplegableProps) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={texto}
            accessibilityState={{expanded: abierto}}
            style={[styles.desplegable, (activo || abierto) && styles.desplegableActivo]}
        >
            <Text style={[styles.textoDesplegable, activo && styles.textoActivo]} numberOfLines={1}>{texto}</Text>
            <Text style={styles.flecha}>{abierto ? '▴' : '▾'}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    contenedor: {
        alignSelf: 'stretch',
        marginHorizontal: 8,
        marginTop: 12,
    },
    barra: {
        flexDirection: 'row', 
        gap: 8, 
    },
    desplegable: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 38,
        paddingHorizontal: 12,
        borderRadius: 19,
        borderWidth: 1.5,
        borderColor: COLORS.FONDO,
        backgroundColor: COLORS.FONDO,
    },
    desplegableActivo: {
        borderColor: COLORS.BOTON_PRINCIPAL,
    },
    textoDesplegable: {
        flexShrink: 1,
        fontSize: 13,
        color: COLORS.TEXTO,
    },
    textoActivo: {
        color: COLORS.TITULO,
        fontWeight: '700',
    },
    flecha: {
        marginLeft: 6,
        fontSize: 13,
        color: COLORS.TITULO,
    },
});

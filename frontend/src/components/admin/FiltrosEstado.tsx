import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CHIPS_ACTIVOS, ConteoEstados, EstadoActivo, FiltroAdmin, PESTANIAS_ADMIN, PestaniaAdmin } from "../../constants/estadosPedido";
import { COLORS } from "../../theme/colors";

interface FiltrosEstadoProps {
    filtro: FiltroAdmin;
    conteos: ConteoEstados | null;     // null: no se pudieron cargar, los chips van sin numero
    onPestania: (pestania: PestaniaAdmin) => void;
    onMarcarEstado: (estado: EstadoActivo) => void;
    onLimpiar: () => void;
}

// arriba de la lista del admin (F04 D3, F07 M3): pestañas Activos · Entregados ·
// Cancelados y, dentro de Activos, chips de seleccion multiple con contador
export default function FiltrosEstado({filtro, conteos, onPestania, onMarcarEstado, onLimpiar}: FiltrosEstadoProps) {
    return (
        <View style={styles.contenedor}>
            <Pestanias seleccionada={filtro.pestania} onSeleccionar={onPestania} />
            {filtro.pestania === 'activos' && (
                <ChipsActivos marcados={filtro.estados} conteos={conteos} onMarcar={onMarcarEstado} onLimpiar={onLimpiar} />
            )}
        </View>
    );
}

function Pestanias({seleccionada, onSeleccionar}: {seleccionada: PestaniaAdmin; onSeleccionar: (p: PestaniaAdmin) => void}) {
    return (
        <View style={styles.pestanias} accessibilityRole="tablist">
            {PESTANIAS_ADMIN.map(({valor, texto}) => {
                const elegida = valor === seleccionada;
                return (
                    <Pressable
                        key={valor}
                        onPress={() => onSeleccionar(valor)}
                        accessibilityRole="tab"
                        accessibilityState={{selected: elegida}}
                        style={[styles.pestania, elegida && styles.pestaniaElegida]}
                    >
                        <Text style={[styles.textoPestania, elegida && styles.textoPestaniaElegida]}>{texto}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

interface ChipsActivosProps {
    marcados: EstadoActivo[];
    conteos: ConteoEstados | null;
    onMarcar: (estado: EstadoActivo) => void;
    onLimpiar: () => void;
}

// sin chips marcados se ven todos los activos (M3); los de contador 0 van atenuados
function ChipsActivos({marcados, conteos, onMarcar, onLimpiar}: ChipsActivosProps) {
    return (
        <View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fila}
                accessibilityLabel="Filtrar activos por estado"
            >
                {CHIPS_ACTIVOS.map(({valor, texto}) => {
                    const marcado = marcados.includes(valor);
                    const total = conteos?.[valor];
                    const etiqueta = total === undefined ? texto : `${texto} (${total})`;
                    return (
                        <Pressable
                            key={valor}
                            onPress={() => onMarcar(valor)}
                            accessibilityRole="checkbox"
                            accessibilityState={{checked: marcado}}
                            style={[styles.chip, marcado && styles.chipMarcado, total === 0 && !marcado && styles.chipVacio]}
                        >
                            <Text style={[styles.texto, marcado && styles.textoMarcado]}>{etiqueta}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
            {marcados.length > 0 && (
                <Pressable onPress={onLimpiar} accessibilityRole="button" hitSlop={8} style={styles.limpiar}>
                    <Text style={styles.textoLimpiar}>Limpiar</Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: {
        paddingBottom: 16,
        gap: 12,
    },
    pestanias: {
        flexDirection: 'row',
        borderRadius: 20,
        backgroundColor: COLORS.FONDO,
        padding: 4,
    },
    pestania: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 16,
    },
    pestaniaElegida: {
        backgroundColor: COLORS.BOTON_PRINCIPAL,
    },
    textoPestania: {
        fontSize: 14,
        color: COLORS.TEXTO,
    },
    textoPestaniaElegida: {
        color: COLORS.BLANCO,
        fontWeight: '700',
    },
    fila: {
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: COLORS.FONDO,
        backgroundColor: COLORS.FONDO,
    },
    chipMarcado: {
        borderColor: COLORS.BOTON_PRINCIPAL,
        backgroundColor: COLORS.BOTON_SECUNDARIO,
    },
    chipVacio: {
        opacity: 0.5,
    },
    texto: {
        fontSize: 14,
        color: COLORS.TEXTO,
    },
    textoMarcado: {
        color: COLORS.TITULO,
        fontWeight: '700',
    },
    limpiar: {
        alignSelf: 'flex-end',
        marginTop: 8,
    },
    textoLimpiar: {
        fontSize: 14,
        color: COLORS.BOTON_PRINCIPAL,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});

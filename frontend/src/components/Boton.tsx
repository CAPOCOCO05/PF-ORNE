import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { COLORS } from "../theme/colors";

interface BotonProps {
    titulo: string;
    onPress: () => void;
    variante?: 'principal' | 'secundario';
    cargando?: boolean; // muestra spinner y bloquea toques repetidos (F00)
    deshabilitado?: boolean;
    style?: StyleProp<ViewStyle>;
}

export default function Boton({titulo, onPress, variante = 'principal', cargando = false, deshabilitado = false, style}: BotonProps) {
    const esPrincipal = variante === 'principal';
    const colorTexto = esPrincipal ? COLORS.BLANCO : COLORS.TITULO;
    const bloqueado = cargando || deshabilitado;

    return (
        <Pressable
            onPress={onPress}
            disabled={bloqueado}
            accessibilityRole="button"
            accessibilityState={{disabled: bloqueado, busy: cargando}}
            style={({pressed}) => [
                styles.base,
                esPrincipal ? styles.principal : styles.secundario,
                (pressed || deshabilitado) && styles.atenuado,
                style,
            ]}
        >
            {cargando
                ? <ActivityIndicator testID="boton-cargando" color={colorTexto} />
                : <Text style={[styles.texto, {color: colorTexto}]}>{titulo}</Text>}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        minHeight: 44,
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    principal: {
        backgroundColor: COLORS.BOTON_PRINCIPAL,
    },
    secundario: {
        backgroundColor: COLORS.BOTON_SECUNDARIO,
    },
    atenuado: {
        opacity: 0.7,
    },
    texto: {
        fontSize: 16,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
});

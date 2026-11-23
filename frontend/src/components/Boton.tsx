import { useRef } from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { COLORS } from "../theme/colors";

export const ESPERA_ENTRE_TOQUES_MS = 600;

interface BotonProps {
    titulo: string;
    onPress: () => void;
    variante?: 'principal' | 'secundario';
    cargando?: boolean; // muestra spinner y bloquea toques repetidos (F00)
    deshabilitado?: boolean;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

export default function Boton({titulo, onPress, variante = 'principal', cargando = false, deshabilitado = false, style, testID}: BotonProps) {
    const esPrincipal = variante === 'principal';
    // el texto va en cafe sobre los dos rosas de la paleta (blanco no se lee sobre el rosa)
    const colorTexto = COLORS.TITULO;
    const bloqueado = cargando || deshabilitado;
    const ultimoToque = useRef<{momento: number; accion: () => void} | null>(null);

    // F10 A5: dos toques seguidos antes de que llegue `cargando` (el estado tarda un
    // render) no disparan la accion dos veces (p. ej. guardar o confirmar el pedido).
    // Solo se ignora si la pantalla no ha cambiado desde el toque anterior (misma
    // `onPress`): un dialogo nuevo o un formulario editado vuelven a responder
    const presionar = () => {
        const ahora = Date.now();
        const anterior = ultimoToque.current;
        if (anterior && anterior.accion === onPress && ahora - anterior.momento < ESPERA_ENTRE_TOQUES_MS) return;
        ultimoToque.current = {momento: ahora, accion: onPress};
        onPress();
    };

    return (
        <Pressable
            testID={testID}
            // se descarta la promesa de un handler async: el boton no espera su resultado
            // (p. ej. una accion que queda esperando la respuesta de un dialogo, F07 M1)
            onPress={presionar}
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

import { ComponentRef, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface VistaTecladoProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    // iOS lo resuelve el ScrollView (ver ScrollTeclado): aqui solo se ajusta en Android
    soloAndroid?: boolean;
}

// F10 A4: sube el contenido para que el teclado no tape el campo que se esta escribiendo.
// - "padding" tambien en Android: con edge-to-edge (Expo SDK 58) Android ya no
//   reacomoda la pantalla solo al abrir el teclado
// - KeyboardAvoidingView calcula con su posicion relativa al padre; se mide la posicion
//   real en pantalla (encabezado, area segura) y se pasa como offset
export default function VistaTeclado({children, style, soloAndroid = false}: VistaTecladoProps) {
    const activo = !soloAndroid || Platform.OS === 'android';
    const contenedor = useRef<ComponentRef<typeof View>>(null);
    const [offset, setOffset] = useState(0);
    const medir = () => contenedor.current?.measureInWindow((_x: number, y: number) => setOffset(Math.max(y, 0)));

    return (
        <View ref={contenedor} style={[styles.flex, style]} onLayout={medir} collapsable={false}>
            <KeyboardAvoidingView testID="vista-teclado" style={styles.flex} behavior="padding" keyboardVerticalOffset={offset} enabled={activo}>
                {children}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

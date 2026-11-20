import { ScrollView, ScrollViewProps } from "react-native";
import VistaTeclado from "./VistaTeclado";

// F10 A4: formulario con scroll en el que el teclado no tapa el campo seleccionado.
// - iOS: el ScrollView nativo deja espacio al teclado y se desplaza hasta el campo
//   enfocado (automaticallyAdjustKeyboardInsets); KeyboardAvoidingView se apaga para
//   no sumar el espacio dos veces
// - Android: VistaTeclado encoge la pantalla y el ScrollView lleva el campo a la vista
export default function ScrollTeclado({children, ...props}: ScrollViewProps) {
    return (
        <VistaTeclado soloAndroid>
            <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets {...props}>
                {children}
            </ScrollView>
        </VistaTeclado>
    );
}

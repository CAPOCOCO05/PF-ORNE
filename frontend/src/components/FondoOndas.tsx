import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { COLORS } from "../theme/colors";

// figuras decorativas del pie de pantalla (design/pantalla_login.png)
// trazos en un lienzo de 300x170 que se estira al ancho de la pantalla

// fondo claro: monticulo pequeño a la izquierda y uno grande a la derecha
const ONDA_CLARA =
    'M0,170 L0,36 C0,4 40,0 53,28 C63,52 70,86 96,92 ' +
    'C126,99 150,80 170,50 C196,10 256,-8 300,10 L300,170 Z';

// figura oscura: columna redondeada a la izquierda, "gota" blanca que la separa
// y la ola principal que cruza hasta el borde derecho
const ONDA_OSCURA =
    'M0,170 L0,80 C0,57 30,55 31,80 L33,150 C34,167 47,167 48,150 ' +
    'L50,104 C58,82 110,78 150,78 C198,78 220,64 252,70 ' +
    'C278,76 293,92 300,98 L300,170 Z';

export default function FondoOndas() {
    return (
        <View style={styles.contenedor} testID="fondo-ondas">
            <Svg width="100%" height="100%" viewBox="0 0 300 170" preserveAspectRatio="none">
                <Path d={ONDA_CLARA} fill={COLORS.DECORACION_CLARA} />
                <Path d={ONDA_OSCURA} fill={COLORS.DECORACION} />
            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 230,
        pointerEvents: 'none',
    },
});

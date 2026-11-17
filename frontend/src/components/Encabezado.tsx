import { Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../theme/colors";

// encabezado de las secciones con sesion: solo el logo ORNE; la navegacion vive en
// la barra inferior y el perfil es una pestaña (F08 N1, ver 01-navigation.md)
export default function Encabezado() {
    const {top} = useSafeAreaInsets();

    return (
        <View style={[styles.barra, {paddingTop: top + 8}]}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="ORNE" />
        </View>
    );
}

const styles = StyleSheet.create({
    barra: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 8,
        backgroundColor: COLORS.FONDO,
    },
    logo: {
        width: 90,
        height: 44,
    },
});

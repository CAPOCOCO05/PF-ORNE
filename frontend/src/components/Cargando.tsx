import { ActivityIndicator, StyleSheet, View } from "react-native";
import { COLORS } from "../theme/colors";

// spinner a pantalla completa mientras se conoce la sesion o el perfil
export default function Cargando() {
    return (
        <View style={styles.container}>
            <ActivityIndicator testID="cargando" color={COLORS.ACENTO} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.BLANCO,
    },
});

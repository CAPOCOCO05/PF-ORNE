import { Image, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../theme/colors";
import { IconoMenu, IconoPerfil } from "./Iconos";

interface EncabezadoProps {
    onAbrirMenu: () => void;
    onAbrirPerfil: () => void;
}

// encabezado de las secciones con sesion: menu · logo ORNE · perfil (ver 01-navigation.md)
export default function Encabezado({onAbrirMenu, onAbrirPerfil}: EncabezadoProps) {
    const {top} = useSafeAreaInsets();

    return (
        <View style={[styles.barra, {paddingTop: top + 8}]}>
            <Pressable onPress={onAbrirMenu} hitSlop={8} accessibilityRole="button" accessibilityLabel="Abrir menú">
                <IconoMenu />
            </Pressable>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="ORNE" />
            <View style={styles.espacio} />
            <Pressable onPress={onAbrirPerfil} hitSlop={8} accessibilityRole="button" accessibilityLabel="Perfil">
                <IconoPerfil />
            </Pressable>
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
        marginLeft: 12,
    },
    espacio: {
        flex: 1,
    },
});

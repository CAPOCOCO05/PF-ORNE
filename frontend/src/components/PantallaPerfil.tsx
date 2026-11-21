import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { Rol } from "../types/auth.types";
import { COLORS } from "../theme/colors";
import Boton from "./Boton";
import { IconoPerfil } from "./Iconos";

const NOMBRE_ROL: Record<Rol, string> = {
    cliente: 'Cliente',
    admin: 'Administrador',
    repartidor: 'Repartidor',
};

// datos de la cuenta y cerrar sesion; la usan las tres secciones (ver 01-navigation.md)
export default function PantallaPerfil() {
    const {user, perfil, signOut} = useAuth();
    const router = useRouter();

    return (
        <View style={styles.container}>
            <IconoPerfil tamano={88} />
            <Text style={styles.nombre}>{perfil?.nombre}</Text>
            <Text style={styles.dato}>{user?.email}</Text>
            {perfil ? <Text style={styles.rol}>{NOMBRE_ROL[perfil.rol]}</Text> : null}
            <Boton titulo="Cerrar sesión" onPress={signOut} style={styles.boton} />
            <Text accessibilityRole="link" onPress={() => router.push('/aviso-privacidad')} style={styles.enlace}>
                Aviso de privacidad
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 24,
        paddingTop: 48,
        backgroundColor: COLORS.BLANCO,
    },
    nombre: {
        marginTop: 16,
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.TITULO,
    },
    dato: {
        marginTop: 4,
        fontSize: 16,
        color: COLORS.TEXTO_SUAVE,
    },
    rol: {
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: COLORS.BOTON_SECUNDARIO,
        color: COLORS.TITULO,
        fontSize: 14,
    },
    boton: {
        marginTop: 32,
        alignSelf: 'stretch',
    },
    enlace: {
        marginTop: 10,
        fontSize: 15,
        color: COLORS.TITULO,
        textAlign: 'center',
        textDecorationLine: 'underline',
    },
});

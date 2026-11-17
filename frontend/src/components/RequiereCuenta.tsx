import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme/colors";
import Boton from "./Boton";
import Cargando from "./Cargando";
import { IconoPerfil } from "./Iconos";

interface RequiereCuentaProps {
    mensaje: string;            // que gana el visitante al crear su cuenta en esta pantalla
    children: React.ReactNode;  // la pantalla real; no se monta sin sesion (no consulta datos)
}

// F09: pantallas del cliente que necesitan cuenta (pedidos, perfil, wizard). Un visitante
// ve una invitacion a iniciar sesion o registrarse en lugar del contenido
export default function RequiereCuenta({mensaje, children}: RequiereCuentaProps) {
    const {session, loading} = useAuth();
    const router = useRouter();

    if (loading) return <Cargando />;
    if (session) return <>{children}</>;

    return (
        <View style={styles.contenedor}>
            <IconoPerfil tamano={72} />
            <Text style={styles.titulo} accessibilityRole="header">Inicia sesión o crea tu cuenta</Text>
            <Text style={styles.mensaje}>{mensaje}</Text>
            <Boton titulo="Crear cuenta" onPress={() => router.push('/register')} style={styles.boton} />
            <Boton titulo="Iniciar sesión" variante="secundario" onPress={() => router.push('/login')} style={styles.boton} />
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: COLORS.BLANCO,
    },
    titulo: {
        marginTop: 16,
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.TITULO,
        textAlign: 'center',
    },
    mensaje: {
        marginTop: 8,
        fontSize: 15,
        color: COLORS.TEXTO_SUAVE,
        textAlign: 'center',
    },
    boton: {
        marginTop: 16,
        alignSelf: 'stretch',
    },
});

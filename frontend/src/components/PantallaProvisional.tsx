import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme/colors";
import Boton from "./Boton";

interface PantallaProvisionalProps {
    titulo: string;
}

// pantalla de inicio temporal de cada rol hasta implementar su feature
// (el cierre de sesion pasara al menu lateral en F01)
export default function PantallaProvisional({titulo}: PantallaProvisionalProps) {
    const {perfil, signOut} = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>{titulo}</Text>
            <Text style={styles.texto}>Hola, {perfil?.nombre}. Esta sección estará disponible pronto.</Text>
            <Boton titulo="Cerrar sesión" onPress={signOut} style={styles.boton} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: COLORS.FONDO,
    },
    titulo: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.TITULO,
        marginBottom: 8,
    },
    texto: {
        fontSize: 16,
        color: COLORS.TEXTO_SUAVE,
        textAlign: 'center',
    },
    boton: {
        marginTop: 24,
    },
});

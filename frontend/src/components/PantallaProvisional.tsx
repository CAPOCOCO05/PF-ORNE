import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme/colors";

interface PantallaProvisionalProps {
    titulo: string;
}

// pantalla temporal de una seccion hasta implementar su feature
// (cerrar sesion esta en el menu lateral y en el perfil)
export default function PantallaProvisional({titulo}: PantallaProvisionalProps) {
    const {perfil} = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>{titulo}</Text>
            <Text style={styles.texto}>Hola, {perfil?.nombre}. Esta sección estará disponible pronto.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: COLORS.BLANCO,
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
});

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AVISO_PRIVACIDAD, FECHA_AVISO } from "../src/constants/avisoPrivacidad";
import { COLORS } from "../src/theme/colors";

// F08 N2: fuera de las secciones de rol para abrirse con o sin sesion (login, registro, perfil)
export default function AvisoPrivacidad() {
    const router = useRouter();
    // si se abrio con un enlace directo no hay a donde regresar: index decide segun la sesion
    const regresar = () => (router.canGoBack() ? router.back() : router.replace('/'));

    return (
        <SafeAreaView style={styles.pantalla}>
            <View style={styles.barra}>
                <Pressable onPress={regresar} hitSlop={8} accessibilityRole="button">
                    <Text style={styles.atras}>‹ Atrás</Text>
                </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.contenido}>
                <Text style={styles.titulo} accessibilityRole="header">Aviso de privacidad</Text>
                <Text style={styles.fecha}>Última actualización: {FECHA_AVISO}</Text>
                {AVISO_PRIVACIDAD.map(({titulo, parrafos}) => (
                    <View key={titulo} style={styles.seccion}>
                        <Text style={styles.tituloSeccion}>{titulo}</Text>
                        {parrafos.map((p) => <Text key={p} style={styles.parrafo}>{p}</Text>)}
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pantalla: {
        flex: 1,
        backgroundColor: COLORS.BLANCO,
    },
    barra: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.FONDO,
    },
    atras: {
        fontSize: 16,
        color: COLORS.TITULO,
    },
    contenido: {
        padding: 24,
        paddingBottom: 40,
    },
    titulo: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.TITULO,
    },
    fecha: {
        marginTop: 4,
        fontSize: 13,
        color: COLORS.TEXTO_SUAVE,
    },
    seccion: {
        marginTop: 20,
    },
    tituloSeccion: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.TITULO,
        marginBottom: 6,
    },
    parrafo: {
        fontSize: 15,
        lineHeight: 22,
        color: COLORS.TEXTO,
        marginBottom: 6,
    },
});

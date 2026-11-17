import { View, StyleSheet, Text } from "react-native";
import { ERROR_SIN_PERFIL, useAuth } from "../src/context/AuthContext";
import { Redirect } from "expo-router";
import Boton from "../src/components/Boton";
import Cargando from "../src/components/Cargando";
import { COLORS } from "../src/theme/colors";
import { rutaPorRol } from "../src/utils/rutas";


// redireccion inicial segun sesion y rol (ver specs/01-navigation.md)
export default function Index(){
    const {session, perfil, loading, authError, reintentarPerfil, signOut} = useAuth();

    if(loading){
        return <Cargando />;
    }
    if(!session){
        // F09: sin sesion se explora el catalogo; la cuenta se pide al hacer un pedido
        return <Redirect href="/home" />;
    }
    if(perfil){
        return <Redirect href={rutaPorRol(perfil.rol)} />;
    }
    // sesion sin perfil: el contexto ya esta cerrando la sesion → luego cae en /login
    if(authError === ERROR_SIN_PERFIL){
        return <Cargando />;
    }
    // no se pudo leer el perfil (p. ej. sin conexion)
    return (
        <View style={styles.container}>
            <Text style={styles.error}>{authError}</Text>
            <Boton titulo="Reintentar" onPress={reintentarPerfil} style={styles.boton} />
            <Boton titulo="Cerrar sesión" variante="secundario" onPress={signOut} style={styles.boton} />
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
    error: {
        fontSize: 16,
        color: COLORS.ERROR,
        textAlign: 'center',
        marginBottom: 8,
    },
    boton: {
        marginTop: 12,
        alignSelf: 'stretch',
    },
})

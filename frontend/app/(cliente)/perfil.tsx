import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import Boton from "../../src/components/Boton";
import { IconoPerfil } from "../../src/components/Iconos";
import MapaDestino from "../../src/components/repartidor/MapaDestino";
import { useAuth } from "../../src/context/AuthContext";
import { useDatosCliente } from "../../src/hooks/useDatosCliente";
import { COLORS } from "../../src/theme/colors";
import { DireccionGuardada } from "../../src/types/pedido.types";
import { textoDireccion } from "../../src/utils/datosCliente";
import RequiereCuenta from "../../src/components/RequiereCuenta";

const MENSAJE_SIN_DIRECCION = 'Aún no tienes una dirección guardada';

// F07 M7: perfil del cliente con sus datos de contacto (admin y repartidor siguen con PantallaPerfil)
// F09: sin sesion se invita a crear cuenta en lugar de consultar datos
export default function PerfilProtegida() {
    return (
        <RequiereCuenta mensaje="Crea tu cuenta para guardar tus datos y tu dirección de entrega.">
            <Perfil />
        </RequiereCuenta>
    );
}

function Perfil() {
    const router = useRouter();
    const {signOut} = useAuth();
    const {nombre, correo, datos, cargando, error, recargar} = useDatosCliente();

    return (
        <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido}>
            <View style={styles.cabecera}>
                <IconoPerfil tamano={72} />
                <Text style={styles.nombre}>{nombre}</Text>
            </View>

            {datos ? (
                <>
                    <Seccion titulo="Datos personales">
                        <Dato etiqueta="Nombre completo" valor={nombre} />
                        <Dato etiqueta="Correo" valor={correo} />
                        <Dato etiqueta="Teléfono" valor={datos.telefono || 'Sin teléfono'} />
                    </Seccion>
                    <Seccion titulo="Dirección de entrega">
                        {datos.direccion ? <Direccion direccion={datos.direccion} /> : (
                            <Text style={styles.vacio}>{MENSAJE_SIN_DIRECCION}</Text>
                        )}
                    </Seccion>
                    <Boton titulo="Editar datos" onPress={() => router.push('/perfil/editar')} style={styles.boton} />
                </>
            ) : cargando ? (
                <ActivityIndicator testID="perfil-cargando" color={COLORS.BOTON_PRINCIPAL} style={styles.estado} />
            ) : error ? (
                <View style={styles.estado}>
                    <Text style={styles.error}>{error}</Text>
                    <Boton titulo="Reintentar" variante="secundario" onPress={recargar} style={styles.boton} />
                </View>
            ) : null}

            <Boton titulo="Cerrar sesión" variante="secundario" onPress={signOut} style={styles.boton} />
            <Link href="/aviso-privacidad" style={styles.olvide}>Aviso de privacidad</Link>
        </ScrollView>
    );
}

function Seccion({titulo, children}: {titulo: string; children: React.ReactNode}) {
    return (
        <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>{titulo}</Text>
            {children}
        </View>
    );
}

function Dato({etiqueta, valor}: {etiqueta: string; valor: string}) {
    return (
        <View style={styles.dato}>
            <Text style={styles.etiqueta}>{etiqueta}</Text>
            <Text style={styles.valor}>{valor}</Text>
        </View>
    );
}

// mapa pequeño de solo lectura con el pin (mismo componente que usa el repartidor)
function Direccion({direccion}: {direccion: DireccionGuardada}) {
    return (
        <View>
            <Text style={styles.valor}>{textoDireccion(direccion)}</Text>
            {direccion.referencia ? <Text style={styles.referencia}>{direccion.referencia}</Text> : null}
            <View style={styles.mapa}>
                <MapaDestino ubicacion={direccion.ubicacion} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    fondo: {
        backgroundColor: COLORS.BLANCO,
    },
    contenido: {
        padding: 24,
        paddingBottom: 40,
    },
    cabecera: {
        alignItems: 'center',
        marginBottom: 8,
    },
    nombre: {
        marginTop: 12,
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.TITULO,
        textAlign: 'center',
    },
    seccion: {
        marginTop: 20,
        padding: 16,
        borderRadius: 16,
        backgroundColor: COLORS.FONDO,
    },
    tituloSeccion: {
        fontSize: 15,
        fontWeight: '700',
        textTransform: 'uppercase',
        color: COLORS.TITULO,
        marginBottom: 12,
    },
    dato: {
        marginBottom: 10,
    },
    etiqueta: {
        fontSize: 12,
        color: COLORS.TEXTO_SUAVE,
    },
    valor: {
        fontSize: 15,
        color: COLORS.TEXTO,
    },
    referencia: {
        marginTop: 4,
        fontSize: 13,
        color: COLORS.TEXTO_SUAVE,
    },
    mapa: {
        marginTop: 12,
    },
    vacio: {
        fontSize: 14,
        color: COLORS.TEXTO_SUAVE,
    },
    estado: {
        marginTop: 32,
        alignItems: 'center',
    },
    error: {
        fontSize: 15,
        color: COLORS.ERROR,
        textAlign: 'center',
    },
    boton: {
        marginTop: 20,
        alignSelf: 'stretch',
    },
    olvide: {
        marginTop: 10,
        fontSize: 15,
        color: COLORS.TITULO,
        textAlign: 'center',
        textDecorationLine: 'underline',
    },
});

import { Pressable, StyleSheet, Text } from 'react-native'
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useDialogo } from '../../src/context/DialogoContext';
import { useState } from 'react';
import Boton from '../../src/components/Boton';
import Input from '../../src/components/Input';
import PantallaAuth from '../../src/components/PantallaAuth';
import { COLORS } from '../../src/theme/colors';
import { rutaTrasAutenticar } from '../../src/utils/rutas';
import { DatosLogin, MAX_CONTRASENA, MAX_CORREO, tieneErrores, validarLogin } from '../../src/utils/validaciones';

export default function Login() {
    const {signIn, authError} = useAuth();
    const router = useRouter();
    const {avisar} = useDialogo();
    // F09: pedido que el visitante quiso hacer desde el catalogo (id del pastel o 'nuevo')
    const {pedir} = useLocalSearchParams<{pedir?: string}>();
    const paramsPedido = pedir ? {pedir} : undefined;
    const [datos, setDatos] = useState<DatosLogin>({correo: '', contrasena: ''});
    const [tocados, setTocados] = useState<Partial<Record<keyof DatosLogin, boolean>>>({});
    const [intentoEnvio, setIntentoEnvio] = useState(false);
    const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const errores = validarLogin(datos);
    // el error de un campo se muestra al salir de el o al presionar el boton (F00)
    const errorDe = (campo: keyof DatosLogin) => (tocados[campo] || intentoEnvio) ? errores[campo] : undefined;

    const cambiar = (campo: keyof DatosLogin) => (valor: string) => {
        setDatos((d) => ({...d, [campo]: valor}));
        setErrorEnvio(null);
    };
    const tocar = (campo: keyof DatosLogin) => () => setTocados((t) => ({...t, [campo]: true}));

    const handleLogin = async () => {
        setIntentoEnvio(true);
        if (tieneErrores(errores)) return;

        setLoading(true);
        const {error} = await signIn({email: datos.correo.trim(), password: datos.contrasena});
        setLoading(false);
        if (error) {
            setErrorEnvio(error);
            return;
        }
        // F09: si venia de "Pedir" sigue con su pedido; si no, index decide segun el rol
        if (pedir) router.dismissTo(rutaTrasAutenticar(pedir));
        else router.replace('/');
    }

    const pie = (
        <>
            <Text style={styles.textoPie}>
                ¿No tienes cuenta?{' '}
                <Link href={{pathname: '/register', params: paramsPedido}} replace style={styles.enlace}>Regístrate</Link>
            </Text>
            <Link href="/home" dismissTo style={styles.verCatalogo}>Ver catálogo sin cuenta</Link>
        </>
    );

    return (
        <PantallaAuth pie={pie} mensajeError={errorEnvio ?? authError}>
            <Input
                etiqueta="Correo"
                placeholder="ejemplo@gmail.com"
                value={datos.correo}
                onChangeText={cambiar('correo')}
                onBlur={tocar('correo')}
                error={errorDe('correo')}
                keyboardType="email-address"
                maxLength={MAX_CORREO}
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
            />
            <Input
                etiqueta="Contraseña"
                placeholder="Ingresa tu contraseña"
                value={datos.contrasena}
                onChangeText={cambiar('contrasena')}
                onBlur={tocar('contrasena')}
                error={errorDe('contrasena')}
                secureTextEntry
                maxLength={MAX_CONTRASENA}
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                onSubmitEditing={handleLogin}
            />
            <Boton titulo="Iniciar sesión" onPress={handleLogin} cargando={loading} style={styles.boton} />
            {/* F08 N2: el aviso se puede leer sin sesion */}
            <Link href="/aviso-privacidad" style={styles.olvide}>Aviso de privacidad</Link>
        </PantallaAuth>
    )
}

const styles = StyleSheet.create({
    boton: {
        marginTop: 12,
    },
    olvide: {
        marginTop: 8,
        fontSize: 12,
        color: COLORS.TITULO,
        textAlign: 'center',
        textDecorationLine: 'underline',
    },
    verCatalogo: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.TITULO,
        textDecorationLine: 'underline',
    },
    textoPie: {
        fontSize: 16,
        color: COLORS.TITULO,
    },
    enlace: {
        textDecorationLine: 'underline',
    },
})

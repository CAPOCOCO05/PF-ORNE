import { Pressable, StyleSheet, Text } from 'react-native'
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useDialogo } from '../../src/context/DialogoContext';
import { useState } from 'react';
import Boton from '../../src/components/Boton';
import Input from '../../src/components/Input';
import PantallaAuth from '../../src/components/PantallaAuth';
import { COLORS } from '../../src/theme/colors';
import { DatosLogin, tieneErrores, validarLogin } from '../../src/utils/validaciones';

export default function Login() {
    const {signIn, authError} = useAuth();
    const router = useRouter();
    const {avisar} = useDialogo();
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
        router.replace('/'); // index decide la seccion segun el rol
    }

    const pie = (
        <Text style={styles.textoPie}>
            ¿No tienes cuenta?{' '}
            <Link href="/register" style={styles.enlace}>Regístrate</Link>
        </Text>
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
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                onSubmitEditing={handleLogin}
            />
            <Boton titulo="Iniciar sesión" onPress={handleLogin} cargando={loading} style={styles.boton} />
            <Pressable onPress={() => { void avisar({titulo: 'Próximamente', mensaje: 'La recuperación de contraseña estará disponible pronto.'}); }}>
                <Text style={styles.olvide}>Olvidé mi contraseña</Text>
            </Pressable>
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
    textoPie: {
        fontSize: 16,
        color: COLORS.TITULO,
    },
    enlace: {
        textDecorationLine: 'underline',
    },
})

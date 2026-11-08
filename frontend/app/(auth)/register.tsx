import { StyleSheet, Text } from 'react-native'
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useDialogo } from '../../src/context/DialogoContext';
import { useState } from 'react';
import Boton from '../../src/components/Boton';
import Input from '../../src/components/Input';
import PantallaAuth from '../../src/components/PantallaAuth';
import { COLORS } from '../../src/theme/colors';
import { DatosRegistro, tieneErrores, validarRegistro } from '../../src/utils/validaciones';

const DATOS_VACIOS: DatosRegistro = {nombre: '', correo: '', contrasena: '', confirmar: ''};

export default function Register() {
    const {signUp} = useAuth();
    const router = useRouter();
    const {avisar} = useDialogo();
    const [datos, setDatos] = useState<DatosRegistro>(DATOS_VACIOS);
    const [tocados, setTocados] = useState<Partial<Record<keyof DatosRegistro, boolean>>>({});
    const [intentoEnvio, setIntentoEnvio] = useState(false);
    const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const errores = validarRegistro(datos);
    // el error de un campo se muestra al salir de el o al presionar el boton (F00)
    const errorDe = (campo: keyof DatosRegistro) => (tocados[campo] || intentoEnvio) ? errores[campo] : undefined;

    const cambiar = (campo: keyof DatosRegistro) => (valor: string) => {
        setDatos((d) => ({...d, [campo]: valor}));
        setErrorEnvio(null);
    };
    const tocar = (campo: keyof DatosRegistro) => () => setTocados((t) => ({...t, [campo]: true}));

    const handleRegister = async () => {
        setIntentoEnvio(true);
        if (tieneErrores(errores)) return;

        setLoading(true);
        const {error, requiereConfirmacion} = await signUp({
            nombre: datos.nombre.trim(),
            email: datos.correo.trim(),
            password: datos.contrasena,
        });
        setLoading(false);
        if (error) {
            setErrorEnvio(error);
            return;
        }
        if (requiereConfirmacion) {
            // solo si se activa "Confirm email" en Supabase (hoy esta desactivado)
            // el dialogo vive arriba del Stack: sigue visible despues de navegar al login
            void avisar({titulo: 'Revisa tu correo', mensaje: 'Te enviamos un correo para confirmar tu cuenta.'});
            router.replace('/login');
            return;
        }
        router.replace('/'); // index decide la seccion segun el rol (cliente)
    }

    const pie = (
        <Text style={styles.textoPie}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" replace style={styles.enlace}>Inicia sesión</Link>
        </Text>
    );

    return (
        <PantallaAuth pie={pie} mensajeError={errorEnvio}>
            <Input
                etiqueta="Nombre"
                placeholder="Tu nombre"
                value={datos.nombre}
                onChangeText={cambiar('nombre')}
                onBlur={tocar('nombre')}
                error={errorDe('nombre')}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
            />
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
                placeholder="Mínimo 6 caracteres"
                value={datos.contrasena}
                onChangeText={cambiar('contrasena')}
                onBlur={tocar('contrasena')}
                error={errorDe('contrasena')}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
            />
            <Input
                etiqueta="Confirmar contraseña"
                placeholder="Repite tu contraseña"
                value={datos.confirmar}
                onChangeText={cambiar('confirmar')}
                onBlur={tocar('confirmar')}
                error={errorDe('confirmar')}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                onSubmitEditing={handleRegister}
            />
            <Boton titulo="Registrarme" onPress={handleRegister} cargando={loading} style={styles.boton} />
        </PantallaAuth>
    )
}

const styles = StyleSheet.create({
    boton: {
        marginTop: 12,
    },
    textoPie: {
        fontSize: 16,
        color: COLORS.TITULO,
    },
    enlace: {
        textDecorationLine: 'underline',
    },
})

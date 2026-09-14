import { View, Text, Alert, StyleSheet } from 'react-native'
import { useAuth } from '../../src/context/AuthContext';
import { useState } from 'react';

export default function Login() {
    const {singIn} = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if(!email || !password) {
            Alert.alert('Error', 'Por favor ingrese su correo y contraseña');
            return;
        }

        setLoading(true);
        const {error} = await singIn({email, password});
        setLoading(false);
        if(error) {
            Alert.alert('Error al iniciar sesion', error);
        }
    }
       

    return (
        <View>
            <Text>Login</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    
})
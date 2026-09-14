import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "../src/context/AuthContext";
import { Redirect } from "expo-router";


export default function Index(){
    const {session, loading} = useAuth();

    if(loading){
        return (
            <View style={styles.container}>
                <ActivityIndicator />
            </View>
        );
    }
    return session ? <Redirect href="/home" /> : <Redirect href="/login" />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
})
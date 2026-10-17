import { Stack } from "expo-router";
import GuardiaRol from "../../src/components/GuardiaRol";

// seccion del rol repartidor (el menu lateral se agrega en F01)
export default function Layout() {
    return (
        <GuardiaRol rol="repartidor">
            <Stack screenOptions={{ headerShown: false }} />
        </GuardiaRol>
    );
}

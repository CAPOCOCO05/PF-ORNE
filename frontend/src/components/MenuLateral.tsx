import { Drawer, DrawerContentComponentProps, DrawerContentScrollView, DrawerItem, DrawerItemList } from "expo-router/drawer";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme/colors";
import Encabezado from "./Encabezado";

export interface OpcionMenu {
    ruta: string;   // nombre del archivo de la ruta dentro de la seccion (ej. 'home')
    titulo: string;
}

interface MenuLateralProps {
    opciones: OpcionMenu[];  // aparecen en el menu, en este orden
    ocultas?: string[];      // rutas de la seccion que no aparecen en el menu (wizard, detalles)
    rutaPerfil: string;      // ruta que abre el icono de perfil del encabezado
}

// menu lateral (Drawer) de cada rol con "Cerrar sesión" al final (ver 01-navigation.md)
export default function MenuLateral({opciones, ocultas = [], rutaPerfil}: MenuLateralProps) {
    const {signOut} = useAuth();

    const contenido = (props: DrawerContentComponentProps) => (
        <DrawerContentScrollView {...props}>
            <DrawerItemList {...props} />
            <DrawerItem label="Cerrar sesión" labelStyle={{color: COLORS.TITULO}} onPress={signOut} />
        </DrawerContentScrollView>
    );

    return (
        <Drawer
            drawerContent={contenido}
            screenOptions={({navigation}) => ({
                header: () => (
                    <Encabezado
                        onAbrirMenu={() => navigation.openDrawer()}
                        onAbrirPerfil={() => navigation.navigate(rutaPerfil)}
                    />
                ),
                drawerActiveTintColor: COLORS.BOTON_PRINCIPAL,
                drawerActiveBackgroundColor: COLORS.BOTON_SECUNDARIO,
                drawerInactiveTintColor: COLORS.TITULO,
                sceneStyle: {backgroundColor: COLORS.BLANCO},
            })}
        >
            {opciones.map(({ruta, titulo}) => (
                <Drawer.Screen key={ruta} name={ruta} options={{title: titulo, drawerLabel: titulo}} />
            ))}
            {ocultas.map((ruta) => (
                // popToTopOnBlur: al salir, su navegacion interna vuelve a la primera pantalla
                <Drawer.Screen key={ruta} name={ruta} options={{drawerItemStyle: {display: 'none'}, popToTopOnBlur: true}} />
            ))}
        </Drawer>
    );
}

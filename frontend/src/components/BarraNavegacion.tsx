import { ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Tabs } from "expo-router/tabs";
import type { BottomTabBarProps } from "expo-router/tabs";
import { COLORS } from "../theme/colors";
import Encabezado from "./Encabezado";
import { IconoProps } from "./Iconos";

export interface OpcionNavegacion {
    ruta: string;                     // nombre del archivo de la ruta dentro de la seccion (ej. 'home')
    titulo: string;
    Icono: ComponentType<IconoProps>;
}

interface BarraNavegacionProps {
    opciones: OpcionNavegacion[];       // pestañas, en este orden
    ocultas?: Record<string, string>;   // ruta sin pestaña (wizard, detalles) → pestaña que se resalta en ella
}

// pestaña resaltada: la propia, o la que corresponde a una ruta oculta (F08 N1, D5)
export function pestaniaActiva(rutaEnfocada: string, ocultas: Record<string, string>): string {
    return ocultas[rutaEnfocada] ?? rutaEnfocada;
}

// barra inferior de cada rol; siempre visible, tambien en el wizard y los detalles (F08 N1)
export default function BarraNavegacion({opciones, ocultas = {}}: BarraNavegacionProps) {
    return (
        <Tabs
            tabBar={(props) => <Barra {...props} opciones={opciones} ocultas={ocultas} />}
            screenOptions={{
                header: () => <Encabezado />,
                sceneStyle: {backgroundColor: COLORS.BLANCO},
            }}
        >
            {opciones.map(({ruta, titulo}) => (
                <Tabs.Screen key={ruta} name={ruta} options={{title: titulo}} />
            ))}
            {Object.keys(ocultas).map((ruta) => (
                // sin `href: null`: en expo-router 58 eso marca la ruta como `hidden` y al
                // navegar a ella redirige a la primera pestaña (el wizard no abria). No sale
                // en la barra porque `Barra` solo dibuja las `opciones`.
                // popToTopOnBlur: al cambiar de pestaña, su navegacion interna vuelve a la primera pantalla
                <Tabs.Screen key={ruta} name={ruta} options={{popToTopOnBlur: true}} />
            ))}
        </Tabs>
    );
}

type BarraProps = BottomTabBarProps & Required<BarraNavegacionProps>;

function Barra({state, emitter, navigateToTab, insets, opciones, ocultas}: BarraProps) {
    const enfocada = state.routes[state.index]?.name ?? '';
    const activa = pestaniaActiva(enfocada, ocultas);

    const presionar = (ruta: string) => {
        const destino = state.routes.find((r) => r.name === ruta);
        if (!destino) return;
        const evento = emitter.emit({type: 'tabPress', target: destino.key, canPreventDefault: true});
        // desde una ruta oculta, tocar su pestaña resaltada regresa a la pantalla principal
        if (enfocada !== ruta && !evento.defaultPrevented) navigateToTab(destino.key);
    };

    return (
        <View style={[styles.barra, {paddingBottom: Math.max(insets.bottom, 8)}]} accessibilityRole="tablist">
            {opciones.map(({ruta, titulo, Icono}) => {
                const seleccionada = ruta === activa;
                const color = seleccionada ? COLORS.ACENTO : COLORS.TITULO;
                return (
                    <Pressable
                        key={ruta}
                        onPress={() => presionar(ruta)}
                        accessibilityRole="tab"
                        accessibilityLabel={titulo}
                        accessibilityState={{selected: seleccionada}}
                        style={[styles.pestania, !seleccionada && styles.inactiva]}
                    >
                        <Icono color={color} />
                        <Text style={[styles.etiqueta, {color}, seleccionada && styles.etiquetaActiva]}>{titulo}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    barra: {
        flexDirection: 'row',
        backgroundColor: COLORS.FONDO,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.BOTON_SECUNDARIO,
        paddingTop: 8,
    },
    pestania: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    inactiva: {
        opacity: 0.6,
    },
    etiqueta: {
        fontSize: 12,
    },
    etiquetaActiva: {
        fontWeight: '700',
    },
});

import { Text } from "react-native";
import { act, fireEvent, renderRouter, screen } from "expo-router/testing-library";
import { router } from "expo-router";
import BarraNavegacion from "../../src/components/BarraNavegacion";
import { IconoCatalogo, IconoPedidos } from "../../src/components/Iconos";

// F08 N1 con el router real: las rutas sin pestaña (wizard, detalles) deben poder abrirse.
// Regresion: con `href: null` expo-router 58 redirigia a la primera pestaña y el wizard no abria.

function Layout() {
    return (
        <BarraNavegacion
            opciones={[
                {ruta: "home", titulo: "Catálogo", Icono: IconoCatalogo},
                {ruta: "pedidos", titulo: "Mis pedidos", Icono: IconoPedidos},
            ]}
            ocultas={{"pedido/nuevo": "home", "pedido/[id]": "pedidos"}}
        />
    );
}

const pantalla = (texto: string) => () => <Text>{texto}</Text>;

async function montar(initialUrl = "/home") {
    await renderRouter({
        "_layout": Layout,
        "home": pantalla("Pantalla catálogo"),
        "pedidos": pantalla("Pantalla mis pedidos"),
        "pedido/nuevo/_layout": {default: () => {
            const { Stack } = jest.requireActual("expo-router");
            return <Stack screenOptions={{headerShown: false}} />;
        }},
        "pedido/nuevo/index": pantalla("Paso 1"),
        "pedido/[id]": pantalla("Detalle del pedido"),
    }, {initialUrl});
}

describe("BarraNavegacion con el router (F08 N1)", () => {
    it("abre el wizard desde el catálogo y deja la barra visible", async () => {
        await montar();

        await act(() => router.push("/pedido/nuevo"));

        expect(screen).toHavePathname("/pedido/nuevo");
        expect(screen.getByText("Paso 1")).toBeTruthy();
        expect(screen.getByRole("tab", {name: "Catálogo", selected: true})).toBeTruthy();
    });

    it("abre un detalle y resalta Mis pedidos; la pestaña regresa a la lista", async () => {
        await montar("/pedidos");

        await act(() => router.push("/pedido/abc"));
        expect(screen.getByText("Detalle del pedido")).toBeTruthy();
        expect(screen.getByRole("tab", {name: "Mis pedidos", selected: true})).toBeTruthy();

        await fireEvent.press(screen.getByRole("tab", {name: "Mis pedidos"}));
        expect(screen).toHavePathname("/pedidos");
    });

    it("cambia de pestaña", async () => {
        await montar();

        await fireEvent.press(screen.getByRole("tab", {name: "Mis pedidos"}));

        expect(screen.getByText("Pantalla mis pedidos")).toBeTruthy();
    });
});

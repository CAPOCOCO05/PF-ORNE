import { Text } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { DialogoProvider, RespuestaDialogo, useDialogo } from "../DialogoContext";

// expone las funciones del contexto a la prueba
let dialogo: ReturnType<typeof useDialogo>;
function Consumidor() {
    dialogo = useDialogo();
    return <Text>pantalla</Text>;
}

async function montar() {
    await render(<DialogoProvider><Consumidor /></DialogoProvider>);
}

describe("DialogoContext", () => {
    it("confirmar muestra titulo, mensaje y botones; 'confirmar' resuelve true", async () => {
        await montar();
        let respuesta: boolean | undefined;

        await act(async () => { dialogo.confirmar({titulo: "¿Eliminar?", mensaje: "No se puede deshacer", textoConfirmar: "Sí, eliminar"}).then((r) => { respuesta = r; }); });

        expect(screen.getByText("¿Eliminar?")).toBeTruthy();
        expect(screen.getByText("No se puede deshacer")).toBeTruthy();
        expect(screen.getByText("Sí, eliminar")).toBeTruthy();
        expect(screen.getByText("Cancelar")).toBeTruthy();

        await fireEvent.press(screen.getByTestId("dialogo-confirmar"));

        expect(respuesta).toBe(true);
        expect(screen.queryByTestId("dialogo")).toBeNull();
    });

    it("'Cancelar' resuelve false", async () => {
        await montar();
        let respuesta: boolean | undefined;

        await act(async () => { dialogo.confirmar({titulo: "¿Salir?"}).then((r) => { respuesta = r; }); });
        await fireEvent.press(screen.getByTestId("dialogo-cancelar"));

        expect(respuesta).toBe(false);
    });

    it("mostrar distingue cancelar de cerrar (atras de Android)", async () => {
        await montar();
        let respuesta: RespuestaDialogo | undefined;

        await act(async () => { dialogo.mostrar({titulo: "Error", tipo: "error"}).then((r) => { respuesta = r; }); });
        await act(async () => { screen.getByTestId("dialogo-modal").props.onRequestClose(); });

        expect(respuesta).toBe("cerrar");
    });

    it("tocar fuera cierra un dialogo normal pero no uno de error", async () => {
        await montar();
        let normal: RespuestaDialogo | undefined;

        await act(async () => { dialogo.mostrar({titulo: "Aviso"}).then((r) => { normal = r; }); });
        await fireEvent.press(screen.getByTestId("dialogo-fondo"));
        expect(normal).toBe("cerrar");

        await act(async () => { dialogo.mostrar({titulo: "Falló", tipo: "error"}); });
        expect(screen.getByTestId("dialogo-fondo").props.onPress).toBeUndefined();
        expect(screen.getByText("Falló")).toBeTruthy();
    });

    it("avisar muestra un solo boton", async () => {
        await montar();
        let cerrado = false;

        await act(async () => { dialogo.avisar({titulo: "Listo", textoBoton: "Entendido"}).then(() => { cerrado = true; }); });

        expect(screen.queryByTestId("dialogo-cancelar")).toBeNull();
        await fireEvent.press(screen.getByText("Entendido"));
        expect(cerrado).toBe(true);
    });

    it("los dialogos destructivos y de error llevan el icono de alerta", async () => {
        await montar();

        await act(async () => { dialogo.confirmar({titulo: "¿Cancelar pedido?", destructiva: true}); });

        expect(screen.getByTestId("dialogo-icono-alerta")).toBeTruthy();
    });

    it("encola: el segundo se muestra al cerrar el primero", async () => {
        await montar();
        const respuestas: string[] = [];

        await act(async () => {
            dialogo.avisar({titulo: "Primero"}).then(() => { respuestas.push("primero"); });
            dialogo.avisar({titulo: "Segundo"}).then(() => { respuestas.push("segundo"); });
        });
        expect(screen.getByText("Primero")).toBeTruthy();
        expect(screen.queryByText("Segundo")).toBeNull();

        await fireEvent.press(screen.getByTestId("dialogo-confirmar"));

        expect(respuestas).toEqual(["primero"]);
        expect(screen.getByText("Segundo")).toBeTruthy();

        await fireEvent.press(screen.getByTestId("dialogo-confirmar"));
        expect(respuestas).toEqual(["primero", "segundo"]);
        expect(screen.queryByTestId("dialogo")).toBeNull();
    });

    it("useDialogo fuera del provider avisa con un error claro", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});
        await expect(render(<Consumidor />)).rejects.toThrow("DialogoProvider");
    });
});

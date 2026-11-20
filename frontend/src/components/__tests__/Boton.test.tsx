import { fireEvent, render, screen } from "@testing-library/react-native";
import Boton, { ESPERA_ENTRE_TOQUES_MS } from "../Boton";

describe("Boton", () => {
    it("muestra el titulo y llama a onPress", async () => {
        const onPress = jest.fn();
        await render(<Boton titulo="Iniciar sesión" onPress={onPress} />);

        await fireEvent.press(screen.getByText("Iniciar sesión"));

        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("dos toques seguidos solo disparan la accion una vez (F10 A5)", async () => {
        const onPress = jest.fn();
        await render(<Boton titulo="Guardar" onPress={onPress} />);

        await fireEvent.press(screen.getByText("Guardar"));
        await fireEvent.press(screen.getByText("Guardar"));

        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("despues de la espera vuelve a responder", async () => {
        const onPress = jest.fn();
        const ahora = jest.spyOn(Date, "now").mockReturnValue(10_000);
        await render(<Boton titulo="Guardar" onPress={onPress} />);

        await fireEvent.press(screen.getByText("Guardar"));
        ahora.mockReturnValue(10_000 + ESPERA_ENTRE_TOQUES_MS);
        await fireEvent.press(screen.getByText("Guardar"));

        expect(onPress).toHaveBeenCalledTimes(2);
        ahora.mockRestore();
    });

    it("cargando: muestra spinner y no responde al toque", async () => {
        const onPress = jest.fn();
        await render(<Boton titulo="Iniciar sesión" onPress={onPress} cargando />);

        expect(screen.getByTestId("boton-cargando")).toBeTruthy();
        expect(screen.queryByText("Iniciar sesión")).toBeNull();

        await fireEvent.press(screen.getByRole("button"));
        expect(onPress).not.toHaveBeenCalled();
    });

    it("deshabilitado: no responde al toque", async () => {
        const onPress = jest.fn();
        await render(<Boton titulo="Pedir" variante="secundario" onPress={onPress} deshabilitado />);

        await fireEvent.press(screen.getByText("Pedir"));

        expect(onPress).not.toHaveBeenCalled();
    });
});
